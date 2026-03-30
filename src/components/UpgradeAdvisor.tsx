'use client';

import { useMemo, useEffect, useState } from 'react';
import { ScoredModel, GPU, UseCase, Model, GpuPriceStats, GpuReviewStats as GpuReviewStatsType } from '@/lib/types';
import { useTheme } from './ThemeProvider';
import { getGpuBenchmarkStats, getGlobalBenchmarkStats, getMultipleGpuPriceStats, getGpuReviewStats } from '@/lib/supabase';
import PriceTrendBadge from './PriceTrendBadge';
import PriceAlertModal from './PriceAlertModal';
import { getRetailerLinks } from '@/lib/affiliateLinks';

// Score component explanations
const SCORE_EXPLANATIONS = {
  vram: {
    label: 'VRAM Capacity',
    description: 'How your GPU memory compares to others. More VRAM = bigger models.',
  },
  bandwidth: {
    label: 'Memory Bandwidth',
    description: 'How fast your GPU can read model weights. Higher = faster token generation.',
  },
  coverage: {
    label: 'Model Coverage',
    description: 'Percentage of all models you can run entirely on GPU (no CPU offload needed).',
  },
  quality: {
    label: 'Best Quality',
    description: 'The benchmark score of the best model you can run. Higher = smarter responses.',
  },
  speed: {
    label: 'Speed',
    description: 'Average generation speed in tokens/second. 30+ is conversational, 60+ is fast.',
  },
};

interface UpgradeAdvisorProps {
  results: ScoredModel[];
  currentGpu: GPU | null;
  currentVramMb: number;
  allGpus: GPU[];
  allModels: Model[];
  useCase: UseCase;
  onBuildForModel?: (modelId: string) => void;
}

interface GpuUpgrade {
  gpu: GPU;
  priceDiff: number;
  vramGain: number;
  bandwidthGain: number;
  newModelsUnlocked: number;
  speedMultiplier: number;
  valueScore: number; // Lower is better ($ per model unlocked)
}

interface CommunityStats {
  gpuAvgTps: number;
  gpuMaxTps: number;
  gpuBenchmarkCount: number;
  gpuModelsCovered: number;
  globalRank: number;
  totalGpus: number;
  percentile: number;
}

// Tier thresholds based on composite score (0-100)
const TIER_THRESHOLDS = [
  { minScore: 85, label: 'Diamond', emoji: '💎', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', borderColor: 'border-cyan-500/30' },
  { minScore: 70, label: 'Gold', emoji: '🥇', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-500/30' },
  { minScore: 55, label: 'Silver', emoji: '🥈', color: 'text-gray-300', bgColor: 'bg-gray-500/20', borderColor: 'border-gray-500/30' },
  { minScore: 40, label: 'Bronze', emoji: '🥉', color: 'text-orange-400', bgColor: 'bg-orange-500/20', borderColor: 'border-orange-500/30' },
  { minScore: 0, label: 'Starter', emoji: '🌱', color: 'text-green-400', bgColor: 'bg-green-500/20', borderColor: 'border-green-500/30' },
];

export default function UpgradeAdvisor({
  results,
  currentGpu,
  currentVramMb,
  allGpus,
  allModels,
  useCase,
  onBuildForModel,
}: UpgradeAdvisorProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Community benchmark stats
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // GPU price stats
  const [priceStats, setPriceStats] = useState<Map<string, GpuPriceStats>>(new Map());
  const [alertModalGpu, setAlertModalGpu] = useState<GPU | null>(null);

  // GPU review stats
  const [reviewStats, setReviewStats] = useState<Map<string, GpuReviewStatsType>>(new Map());

  // Fetch community benchmark data
  useEffect(() => {
    async function fetchCommunityStats() {
      if (!currentGpu) {
        setLoadingStats(false);
        return;
      }

      try {
        const [gpuStats, globalStats] = await Promise.all([
          getGpuBenchmarkStats(currentGpu.name),
          getGlobalBenchmarkStats(),
        ]);

        // Find rank among all GPUs with benchmarks
        const rank = globalStats.allGpuStats.findIndex(g => g.gpuName === currentGpu.name) + 1;
        const percentile = rank > 0
          ? Math.round((1 - rank / globalStats.allGpuStats.length) * 100)
          : null;

        setCommunityStats({
          gpuAvgTps: gpuStats.avgTps,
          gpuMaxTps: gpuStats.maxTps,
          gpuBenchmarkCount: gpuStats.benchmarkCount,
          gpuModelsCovered: gpuStats.modelsCovered,
          globalRank: rank,
          totalGpus: globalStats.allGpuStats.length,
          percentile: percentile ?? 50, // Default to 50 if no data
        });
      } catch (error) {
        console.error('Error fetching community stats:', error);
      } finally {
        setLoadingStats(false);
      }
    }

    fetchCommunityStats();
  }, [currentGpu]);

  // Calculate setup score and tier
  const setupAnalysis = useMemo(() => {
    if (results.length === 0) return null;

    const bestModel = results[0];
    const avgScore = results.slice(0, 5).reduce((sum, r) => sum + r.score, 0) / Math.min(5, results.length);
    const avgSpeed = results.slice(0, 5).reduce((sum, r) => sum + (r.performance.tokensPerSecond || 0), 0) / Math.min(5, results.length);

    // Count models by inference mode
    const gpuFullCount = results.filter(r => r.inferenceMode === 'gpu_full').length;
    const offloadCount = results.filter(r => r.inferenceMode === 'gpu_offload').length;
    const cpuOnlyCount = results.filter(r => r.inferenceMode === 'cpu_only').length;

    // === COMPOSITE SCORE CALCULATION ===
    // 1. VRAM Score (25%): Position in GPU VRAM ranking
    const sortedByVram = [...allGpus].filter(g => g.vram_mb > 0).sort((a, b) => b.vram_mb - a.vram_mb);
    const vramRank = sortedByVram.findIndex(g => g.vram_mb <= currentVramMb) + 1;
    const vramScore = Math.round((1 - vramRank / sortedByVram.length) * 100);

    // 2. Bandwidth Score (20%): Position in GPU bandwidth ranking
    const sortedByBw = [...allGpus].filter(g => g.bandwidth_gbps > 0).sort((a, b) => b.bandwidth_gbps - a.bandwidth_gbps);
    const currentBw = currentGpu?.bandwidth_gbps || 0;
    const bwRank = sortedByBw.findIndex(g => g.bandwidth_gbps <= currentBw) + 1;
    const bandwidthScore = Math.round((1 - bwRank / sortedByBw.length) * 100);

    // 3. Model Coverage Score (25%): % of models runnable at GPU Full
    const totalModelsWithQ4 = allModels.filter(m => m.quantizations.some(q => q.level === 'Q4_K_M')).length;
    const modelCoverageScore = Math.round((gpuFullCount / totalModelsWithQ4) * 100);

    // 4. Quality Score (15%): Best achievable model score
    const qualityScore = bestModel.score;

    // 5. Speed Score (15%): Normalized speed (60+ tok/s = 100, logarithmic scale)
    const speedScore = Math.min(100, Math.round(Math.log2(avgSpeed + 1) / Math.log2(61) * 100));

    // Composite score with weights
    const compositeScore = Math.round(
      vramScore * 0.25 +
      bandwidthScore * 0.20 +
      modelCoverageScore * 0.25 +
      qualityScore * 0.15 +
      speedScore * 0.15
    );

    // Adjust with community data if available
    const finalScore = communityStats && communityStats.gpuBenchmarkCount > 0
      ? Math.round(compositeScore * 0.7 + communityStats.percentile * 0.3)
      : compositeScore;

    // Determine tier based on final score
    const tier = TIER_THRESHOLDS.find(t => finalScore >= t.minScore) || TIER_THRESHOLDS[TIER_THRESHOLDS.length - 1];

    return {
      bestModel,
      avgScore: Math.round(avgScore),
      avgSpeed: Math.round(avgSpeed),
      compositeScore: finalScore,
      tier,
      // Breakdown
      vramScore,
      bandwidthScore,
      modelCoverageScore,
      qualityScore,
      speedScore,
      // Counts
      gpuFullCount,
      offloadCount,
      cpuOnlyCount,
      totalModels: results.length,
      totalModelsWithQ4,
    };
  }, [results, currentVramMb, currentGpu, allGpus, allModels, communityStats]);

  // Calculate GPU upgrade suggestions
  const gpuUpgrades = useMemo(() => {
    if (!currentGpu) return [];

    const currentPrice = currentGpu.price_usd || 0;
    const currentBandwidth = currentGpu.bandwidth_gbps;

    // Filter GPUs that are upgrades
    const upgrades: GpuUpgrade[] = allGpus
      .filter(gpu =>
        gpu.vram_mb > currentVramMb &&
        gpu.price_usd &&
        gpu.price_usd > currentPrice &&
        gpu.availability !== 'discontinued'
      )
      .map(gpu => {
        const priceDiff = (gpu.price_usd || 0) - currentPrice;
        const vramGain = gpu.vram_mb - currentVramMb;
        const bandwidthGain = gpu.bandwidth_gbps - currentBandwidth;

        // Estimate new models unlocked (models that need more VRAM than current)
        const currentMaxModels = allModels.filter(m => {
          const q4 = m.quantizations.find(q => q.level === 'Q4_K_M');
          return q4 && q4.vram_mb <= currentVramMb * 0.9;
        }).length;

        const newMaxModels = allModels.filter(m => {
          const q4 = m.quantizations.find(q => q.level === 'Q4_K_M');
          return q4 && q4.vram_mb <= gpu.vram_mb * 0.9;
        }).length;

        const newModelsUnlocked = newMaxModels - currentMaxModels;
        const speedMultiplier = gpu.bandwidth_gbps / currentBandwidth;
        const valueScore = newModelsUnlocked > 0 ? priceDiff / newModelsUnlocked : Infinity;

        return {
          gpu,
          priceDiff,
          vramGain,
          bandwidthGain,
          newModelsUnlocked,
          speedMultiplier,
          valueScore,
        };
      })
      .filter(u => u.newModelsUnlocked > 0 || u.speedMultiplier > 1.3)
      .sort((a, b) => a.valueScore - b.valueScore);

    // Return best value, mid-range, and premium options
    // Cap premium at 10x the cheapest upgrade price so users see realistic tiers
    const budget = upgrades.find(u => u.priceDiff <= 500);
    const budgetPriceDiff = budget?.priceDiff ?? 500;
    const maxPriceDiff = Math.max(budgetPriceDiff * 10, 5000);
    const midRange = upgrades.find(u => u.priceDiff > 500 && u.priceDiff <= 1200 && u.priceDiff <= maxPriceDiff);
    const premium = upgrades.find(u => u.priceDiff > 1200 && u.priceDiff <= maxPriceDiff);

    return [budget, midRange, premium].filter(Boolean) as GpuUpgrade[];
  }, [currentGpu, currentVramMb, allGpus, allModels]);

  // Fetch price and review stats for upgrade GPUs
  useEffect(() => {
    async function fetchStats() {
      if (gpuUpgrades.length === 0) return;

      const gpuNames = gpuUpgrades.map(u => u.gpu.name);
      const [prices, reviews] = await Promise.all([
        getMultipleGpuPriceStats(gpuNames),
        getGpuReviewStats(gpuNames),
      ]);
      setPriceStats(prices);
      setReviewStats(reviews);
    }

    fetchStats();
  }, [gpuUpgrades]);

  // Find model upgrade suggestions (better models that could fit)
  const modelUpgrades = useMemo(() => {
    if (results.length === 0) return [];

    const currentBest = results[0];

    // Find models with higher scores that user isn't running at best quant
    return results
      .slice(1, 10) // Look at top 10
      .filter(r => {
        // Only suggest if it's a different model family or significantly better
        const isDifferentFamily = r.model.family !== currentBest.model.family;
        const isSignificantlyBetter = r.score >= currentBest.score - 5;
        const hasBetterBenchmarks = Object.entries(r.model.benchmarks).some(([key, val]) => {
          const currentVal = currentBest.model.benchmarks[key as keyof typeof currentBest.model.benchmarks];
          return val && currentVal && val > currentVal + 5;
        });

        return isDifferentFamily && isSignificantlyBetter && hasBetterBenchmarks;
      })
      .slice(0, 3);
  }, [results]);

  if (!setupAnalysis) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Setup Score Card */}
      <div className={`rounded-2xl border p-6 ${
        isDark
          ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-gray-700'
          : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
      }`}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Your Hardware Rating
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              How your setup compares for {useCase} tasks
            </p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center gap-3 px-4 py-3 rounded-xl ${setupAnalysis.tier.bgColor} border ${setupAnalysis.tier.borderColor}`}>
              <span className="text-4xl">{setupAnalysis.tier.emoji}</span>
              <div>
                <div className={`text-2xl font-bold ${setupAnalysis.tier.color}`}>
                  {setupAnalysis.tier.label}
                </div>
              </div>
              <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {setupAnalysis.compositeScore}
                <span className={`text-sm font-normal ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <ScoreBreakdown
          scores={{
            vram: setupAnalysis.vramScore,
            bandwidth: setupAnalysis.bandwidthScore,
            coverage: setupAnalysis.modelCoverageScore,
            quality: setupAnalysis.qualityScore,
            speed: setupAnalysis.speedScore,
          }}
          isDark={isDark}
        />

        {/* Community Comparison */}
        {!loadingStats && communityStats && communityStats.gpuBenchmarkCount > 0 && (
          <div className={`mb-6 p-4 rounded-xl ${isDark ? 'bg-blue-900/20 border border-blue-800/50' : 'bg-blue-50 border border-blue-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-400">📊</span>
              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Community Benchmarks
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Your GPU Rank</div>
                <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  #{communityStats.globalRank} of {communityStats.totalGpus}
                </div>
              </div>
              <div>
                <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Community Avg</div>
                <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {communityStats.gpuAvgTps} tok/s
                </div>
              </div>
              <div>
                <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Community Max</div>
                <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {communityStats.gpuMaxTps} tok/s
                </div>
              </div>
              <div>
                <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Benchmarks</div>
                <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {communityStats.gpuBenchmarkCount} submissions
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className={`text-xs uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          What You Can Run
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox
            label="Best Model Quality"
            value={setupAnalysis.bestModel.score}
            suffix="/100"
            isDark={isDark}
          />
          <StatBox
            label="Avg Speed"
            value={setupAnalysis.avgSpeed}
            suffix=" tok/s"
            isDark={isDark}
          />
          <StatBox
            label="GPU Full Models"
            value={setupAnalysis.gpuFullCount}
            suffix={` / ${setupAnalysis.totalModelsWithQ4}`}
            isDark={isDark}
            highlight
          />
          <StatBox
            label="Total Runnable"
            value={setupAnalysis.totalModels}
            suffix=" models"
            isDark={isDark}
          />
        </div>

        {/* Inference Mode Breakdown */}
        <div className={`mt-4 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Inference modes:</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{setupAnalysis.gpuFullCount} GPU Full</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{setupAnalysis.offloadCount} Offload</span>
            </span>
            {setupAnalysis.cpuOnlyCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{setupAnalysis.cpuOnlyCount} CPU</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hardware Upgrade Suggestions */}
      {gpuUpgrades.length > 0 && (
        <div className={`rounded-2xl border p-6 ${
          isDark
            ? 'bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-800/50'
            : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'
        }`}>
          <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            🚀 Upgrade Your Hardware
          </h3>
          <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            GPU upgrades to unlock more models and speed
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            {gpuUpgrades.map((upgrade, idx) => (
              <UpgradeCard
                key={upgrade.gpu.name}
                upgrade={upgrade}
                badge={idx === 0 ? 'Best Value' : idx === 1 ? 'Balanced' : 'Premium'}
                badgeColor={idx === 0 ? 'bg-green-600' : idx === 1 ? 'bg-blue-600' : 'bg-purple-600'}
                isDark={isDark}
                priceStats={priceStats.get(upgrade.gpu.name)}
                reviewStats={reviewStats.get(upgrade.gpu.name)}
                onSetAlert={() => setAlertModalGpu(upgrade.gpu)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Price Alert Modal */}
      {alertModalGpu && (
        <PriceAlertModal
          gpuName={alertModalGpu.name}
          currentPrice={alertModalGpu.price_usd}
          onClose={() => setAlertModalGpu(null)}
        />
      )}

      {/* Model Alternatives */}
      {modelUpgrades.length > 0 && (
        <div className={`rounded-2xl border p-6 ${
          isDark
            ? 'bg-gradient-to-br from-green-900/20 to-teal-900/20 border-green-800/50'
            : 'bg-gradient-to-br from-green-50 to-teal-50 border-green-200'
        }`}>
          <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            💡 Alternative Models to Try
          </h3>
          <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Other top models that fit your hardware
          </p>

          <div className="space-y-3">
            {modelUpgrades.map((model) => (
              <ModelSuggestion
                key={model.model.id}
                model={model}
                isDark={isDark}
                onClick={() => onBuildForModel?.(model.model.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  suffix,
  isDark,
  highlight
}: {
  label: string;
  value: number;
  suffix: string;
  isDark: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl p-3 ${
      highlight
        ? 'bg-green-500/20 border border-green-500/30'
        : isDark ? 'bg-gray-800/50' : 'bg-white border border-gray-200'
    }`}>
      <div className={`text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {label}
      </div>
      <div className={`text-xl font-bold ${highlight ? 'text-green-400' : isDark ? 'text-white' : 'text-gray-900'}`}>
        {value}
        <span className="text-sm font-normal opacity-60">{suffix}</span>
      </div>
    </div>
  );
}

function UpgradeCard({
  upgrade,
  badge,
  badgeColor,
  isDark,
  priceStats,
  reviewStats,
  onSetAlert,
}: {
  upgrade: GpuUpgrade;
  badge: string;
  badgeColor: string;
  isDark: boolean;
  priceStats?: GpuPriceStats;
  reviewStats?: GpuReviewStatsType;
  onSetAlert?: () => void;
}) {
  const retailers = getRetailerLinks(upgrade.gpu.name, upgrade.gpu).map(r => ({
    name: r.name,
    href: r.href,
  }));

  // Calculate percent change if we have price data
  const percentChange = priceStats?.current_price_usd && priceStats?.price_7d_ago
    ? ((priceStats.current_price_usd - priceStats.price_7d_ago) / priceStats.price_7d_ago) * 100
    : undefined;

  return (
    <div className={`rounded-xl border p-4 transition-all duration-300 hover:-translate-y-0.5 ${
      isDark ? 'bg-gray-800/50 border-gray-700 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5' : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100/50'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <span className={`px-2 py-0.5 rounded text-xs text-white ${badgeColor}`}>
          {badge}
        </span>
        <div className="text-right">
          <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            +${upgrade.priceDiff.toLocaleString()}
          </span>
          {priceStats && (
            <div className="mt-1">
              <PriceTrendBadge trend={priceStats.trend} percentChange={percentChange} />
            </div>
          )}
        </div>
      </div>

      <p className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{upgrade.gpu.name}</p>

      {/* Review stats */}
      {reviewStats && reviewStats.review_count > 0 && (
        <div className={`mb-2 flex items-center gap-1 text-sm ${isDark ? 'text-yellow-400/80' : 'text-yellow-500'}`}>
          <span>{'★'.repeat(Math.round(reviewStats.avg_rating))}</span>
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            {reviewStats.avg_rating.toFixed(1)} ({reviewStats.review_count} reviews)
          </span>
        </div>
      )}

      {/* Price stats if available */}
      {priceStats?.current_price_usd && (
        <div className={`mb-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Current: <span className={isDark ? 'text-white' : 'text-gray-900'}>${priceStats.current_price_usd.toLocaleString()}</span>
          {priceStats.min_30d && priceStats.min_30d < priceStats.current_price_usd && (
            <span className="text-green-400 ml-2">
              (30d low: ${priceStats.min_30d.toLocaleString()})
            </span>
          )}
        </div>
      )}

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>VRAM</span>
          <span className="text-green-400">+{(upgrade.vramGain / 1024).toFixed(0)} GB</span>
        </div>
        <div className="flex justify-between">
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Speed</span>
          <span className="text-blue-400">{upgrade.speedMultiplier.toFixed(1)}x faster</span>
        </div>
        <div className="flex justify-between">
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>New models</span>
          <span className="text-purple-400">+{upgrade.newModelsUnlocked} unlocked</span>
        </div>
      </div>

      <div className={`mt-3 pt-3 border-t flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          ${Math.round(upgrade.valueScore)} per model unlocked
        </span>
        {onSetAlert && (
          <button
            onClick={onSetAlert}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
              isDark
                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="Set price alert"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Alert
          </button>
        )}
      </div>

      {/* Retailer links */}
      <div className={`mt-2 pt-2 border-t flex flex-wrap gap-1.5 ${isDark ? 'border-gray-700/50' : 'border-gray-100'}`}>
        {retailers.map(r => (
          <a
            key={r.name}
            href={r.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
              isDark
                ? 'text-gray-500 hover:text-blue-400 hover:bg-blue-900/20'
                : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            {r.name}
          </a>
        ))}
      </div>
    </div>
  );
}

function ModelSuggestion({
  model,
  isDark,
  onClick
}: {
  model: ScoredModel;
  isDark: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
        isDark
          ? 'bg-gray-800/50 hover:bg-gray-700/50'
          : 'bg-white border border-gray-200 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
          isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'
        }`}>
          {model.score}
        </div>
        <div>
          <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {model.model.name}
          </div>
          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {model.quant.level} • {model.performance.tokensPerSecondRange
              ? `${model.performance.tokensPerSecondRange.low}–${model.performance.tokensPerSecondRange.high}`
              : model.performance.tokensPerSecond ?? '—'} tok/s
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {(model.memory.totalVram / 1024).toFixed(1)} GB
          </div>
          <div className={`text-xs ${
            model.inferenceMode === 'gpu_full' ? 'text-green-400' : 'text-yellow-400'
          }`}>
            {model.inferenceMode === 'gpu_full' ? 'GPU Full' : 'Offload'}
          </div>
        </div>
        <svg className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

function ScoreBreakdown({
  scores,
  isDark
}: {
  scores: { vram: number; bandwidth: number; coverage: number; quality: number; speed: number };
  isDark: boolean;
}) {
  const [showExplanations, setShowExplanations] = useState(false);

  const scoreItems = [
    { key: 'vram', value: scores.vram, color: 'bg-blue-500' },
    { key: 'bandwidth', value: scores.bandwidth, color: 'bg-purple-500' },
    { key: 'coverage', value: scores.coverage, color: 'bg-green-500' },
    { key: 'quality', value: scores.quality, color: 'bg-yellow-500' },
    { key: 'speed', value: scores.speed, color: 'bg-orange-500' },
  ] as const;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className={`text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Score Breakdown
        </div>
        <button
          onClick={() => setShowExplanations(!showExplanations)}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
            showExplanations
              ? 'bg-blue-500/20 text-blue-400'
              : isDark
                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {showExplanations ? 'Hide info' : 'What do these mean?'}
        </button>
      </div>

      {/* Explanations panel */}
      {showExplanations && (
        <div className={`mb-4 p-4 rounded-xl text-sm space-y-3 ${
          isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-gray-50 border border-gray-200'
        }`}>
          {Object.entries(SCORE_EXPLANATIONS).map(([key, info]) => (
            <div key={key} className="flex gap-3">
              <div className={`w-3 h-3 mt-1 rounded-full ${
                key === 'vram' ? 'bg-blue-500' :
                key === 'bandwidth' ? 'bg-purple-500' :
                key === 'coverage' ? 'bg-green-500' :
                key === 'quality' ? 'bg-yellow-500' : 'bg-orange-500'
              }`} />
              <div>
                <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {info.label}
                </div>
                <div className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                  {info.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Score bars */}
      <div className="space-y-2">
        {scoreItems.map(({ key, value, color }) => (
          <div key={key} className="flex items-center gap-3">
            <div className={`w-32 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {SCORE_EXPLANATIONS[key].label}
            </div>
            <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div
                className={`h-full ${color} transition-all duration-500`}
                style={{ width: `${value}%` }}
              />
            </div>
            <div className={`w-10 text-right text-xs font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
