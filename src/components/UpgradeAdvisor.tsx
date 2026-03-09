'use client';

import { useMemo } from 'react';
import { ScoredModel, GPU, UseCase, Model } from '@/lib/types';
import { useTheme } from './ThemeProvider';

interface UpgradeAdvisorProps {
  results: ScoredModel[];
  currentGpu: GPU | null;
  currentVramMb: number;
  allGpus: GPU[];
  allModels: Model[];
  useCase: UseCase;
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

// Tier thresholds for setup scoring
const TIER_THRESHOLDS = {
  diamond: { minScore: 85, minSpeed: 50, label: 'Diamond', emoji: '💎', color: 'text-cyan-400' },
  gold: { minScore: 70, minSpeed: 30, label: 'Gold', emoji: '🥇', color: 'text-yellow-400' },
  silver: { minScore: 55, minSpeed: 15, label: 'Silver', emoji: '🥈', color: 'text-gray-300' },
  bronze: { minScore: 40, minSpeed: 8, label: 'Bronze', emoji: '🥉', color: 'text-orange-400' },
  starter: { minScore: 0, minSpeed: 0, label: 'Starter', emoji: '🌱', color: 'text-green-400' },
};

export default function UpgradeAdvisor({
  results,
  currentGpu,
  currentVramMb,
  allGpus,
  allModels,
  useCase,
}: UpgradeAdvisorProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Calculate setup score and tier
  const setupAnalysis = useMemo(() => {
    if (results.length === 0) return null;

    const bestModel = results[0]; // Assuming sorted by score
    const avgScore = results.slice(0, 5).reduce((sum, r) => sum + r.score, 0) / Math.min(5, results.length);
    const avgSpeed = results.slice(0, 5).reduce((sum, r) => sum + (r.performance.tokensPerSecond || 0), 0) / Math.min(5, results.length);

    // Count models by inference mode
    const gpuFullCount = results.filter(r => r.inferenceMode === 'gpu_full').length;
    const offloadCount = results.filter(r => r.inferenceMode === 'gpu_offload').length;
    const cpuOnlyCount = results.filter(r => r.inferenceMode === 'cpu_only').length;

    // Determine tier
    let tier = TIER_THRESHOLDS.starter;
    for (const [, t] of Object.entries(TIER_THRESHOLDS)) {
      if (avgScore >= t.minScore && avgSpeed >= t.minSpeed) {
        tier = t;
        break;
      }
    }

    // Calculate percentile (simplified: based on VRAM position in GPU list)
    const sortedGpus = [...allGpus].sort((a, b) => b.vram_mb - a.vram_mb);
    const vramRank = sortedGpus.findIndex(g => g.vram_mb <= currentVramMb) + 1;
    const percentile = Math.round((1 - vramRank / sortedGpus.length) * 100);

    return {
      bestModel,
      avgScore: Math.round(avgScore),
      avgSpeed: Math.round(avgSpeed),
      tier,
      percentile,
      gpuFullCount,
      offloadCount,
      cpuOnlyCount,
      totalModels: results.length,
    };
  }, [results, currentVramMb, allGpus]);

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
    const budget = upgrades.find(u => u.priceDiff <= 500);
    const midRange = upgrades.find(u => u.priceDiff > 500 && u.priceDiff <= 1200);
    const premium = upgrades.find(u => u.priceDiff > 1200);

    return [budget, midRange, premium].filter(Boolean) as GpuUpgrade[];
  }, [currentGpu, currentVramMb, allGpus, allModels]);

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
              Your Setup Score
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Performance ranking for {useCase} tasks
            </p>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${setupAnalysis.tier.color}`}>
              {setupAnalysis.tier.emoji} {setupAnalysis.tier.label}
            </div>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Top {100 - setupAnalysis.percentile}% of setups
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox
            label="Avg Score"
            value={setupAnalysis.avgScore}
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
            label="GPU Full"
            value={setupAnalysis.gpuFullCount}
            suffix=" models"
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
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center gap-4 text-sm">
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
              />
            ))}
          </div>
        </div>
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
  isDark
}: {
  upgrade: GpuUpgrade;
  badge: string;
  badgeColor: string;
  isDark: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${
      isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <span className={`px-2 py-0.5 rounded text-xs text-white ${badgeColor}`}>
          {badge}
        </span>
        <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          +${upgrade.priceDiff.toLocaleString()}
        </span>
      </div>

      <h4 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {upgrade.gpu.name}
      </h4>

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

      <div className={`mt-3 pt-3 border-t text-xs ${isDark ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
        ${Math.round(upgrade.valueScore)} per model unlocked
      </div>
    </div>
  );
}

function ModelSuggestion({ model, isDark }: { model: ScoredModel; isDark: boolean }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${
      isDark ? 'bg-gray-800/50' : 'bg-white border border-gray-200'
    }`}>
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
            {model.quant.level} • {model.performance.tokensPerSecond} tok/s
          </div>
        </div>
      </div>
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
    </div>
  );
}
