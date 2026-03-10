'use client';

import { useState, useMemo, useRef } from 'react';
import { ScoredModel, UseCase, Benchmarks } from '@/lib/types';
import RadarChart from './RadarChart';
import ModelDetailModal from './ModelDetailModal';

// Export utilities
function exportToJSON(results: ScoredModel[], gpuName: string | null, vramMb: number, useCase: UseCase) {
  const data = {
    exported: new Date().toISOString(),
    hardware: {
      gpu: gpuName || 'Unknown',
      vram_gb: Math.round(vramMb / 1024),
    },
    useCase,
    results: results.map(r => ({
      rank: results.indexOf(r) + 1,
      model: r.model.name,
      family: r.model.family,
      params_b: r.model.params_b,
      quantization: r.quant.level,
      score: r.score,
      inference_mode: r.inferenceMode,
      vram_gb: +(r.quant.vram_mb / 1024).toFixed(1),
      vram_percent: r.memory.vramPercent,
      tokens_per_sec: r.performance.tokensPerSecond,
      ollama_command: `ollama run ${r.quant.ollama_tag}`,
      benchmarks: r.model.benchmarks,
    })),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `llm-recommendations-${useCase}-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportToCSV(results: ScoredModel[], gpuName: string | null, vramMb: number, useCase: UseCase) {
  const headers = [
    'Rank', 'Model', 'Family', 'Params (B)', 'Quantization', 'Score',
    'Inference Mode', 'VRAM (GB)', 'VRAM %', 'Tokens/sec', 'Ollama Command',
    'MMLU-PRO', 'MATH', 'IFEval', 'BBH', 'HumanEval', 'BigCodeBench'
  ];

  const rows = results.map((r, i) => [
    i + 1,
    r.model.name,
    r.model.family,
    r.model.params_b,
    r.quant.level,
    r.score,
    r.inferenceMode,
    (r.quant.vram_mb / 1024).toFixed(1),
    r.memory.vramPercent,
    r.performance.tokensPerSecond ?? '',
    `ollama run ${r.quant.ollama_tag}`,
    r.model.benchmarks.mmlu_pro ?? '',
    r.model.benchmarks.math ?? '',
    r.model.benchmarks.ifeval ?? '',
    r.model.benchmarks.bbh ?? '',
    r.model.benchmarks.humaneval ?? '',
    r.model.benchmarks.bigcodebench ?? '',
  ]);

  const csvContent = [
    `# LocalLLM Advisor Export - ${new Date().toISOString()}`,
    `# Hardware: ${gpuName || 'Unknown'} (${Math.round(vramMb / 1024)}GB VRAM)`,
    `# Use Case: ${useCase}`,
    '',
    headers.join(','),
    ...rows.map(row => row.map(cell =>
      typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
    ).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `llm-recommendations-${useCase}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type ChartType = 'score' | 'speed' | 'vram' | 'quant' | 'benchmark' | null;

interface ExpandedChartData {
  type: ChartType;
  benchKey?: keyof Benchmarks;
}

type ViewMode = 'dashboard' | 'compare';

interface ResultsListProps {
  results: ScoredModel[];
  gpuName: string | null;
  vramMb: number;
  useCase: UseCase;
  onBuildForModel?: (modelId: string) => void;
}

// Benchmarks per use case
const USE_CASE_BENCHMARKS: Record<UseCase, (keyof Benchmarks)[]> = {
  chat: ['ifeval', 'mmlu_pro', 'bbh'],
  coding: ['bigcodebench', 'humaneval', 'math', 'ifeval'],
  reasoning: ['math', 'gpqa', 'bbh', 'musr'],
  creative: ['ifeval', 'mmlu_pro', 'bbh'],
  vision: ['ifeval', 'mmlu_pro', 'bbh'],
  roleplay: ['ifeval', 'mmlu_pro', 'bbh'],
  embedding: ['mmlu_pro', 'bbh', 'ifeval'],
};

const BENCHMARK_NAMES: Record<keyof Benchmarks, string> = {
  humaneval: 'HumanEval',
  mmlu_pro: 'MMLU-PRO',
  math: 'MATH',
  ifeval: 'IFEval',
  bbh: 'BBH',
  mmmu: 'MMMU',
  gpqa: 'GPQA',
  musr: 'MUSR',
  mbpp: 'MBPP',
  bigcodebench: 'BigCodeBench',
  alpacaeval: 'AlpacaEval',
  mmbench: 'MMBench',
};

// Use case labels
const USE_CASE_LABELS: Record<UseCase, string> = {
  chat: 'Chat',
  coding: 'Coding',
  reasoning: 'Reasoning',
  creative: 'Creative Writing',
  vision: 'Vision',
  roleplay: 'Roleplay',
  embedding: 'Embedding',
};

// Speed experience descriptions
function getSpeedDescription(toksPerSec: number): string {
  if (toksPerSec >= 60) return 'Instant responses';
  if (toksPerSec >= 40) return 'Very fast, feels instant';
  if (toksPerSec >= 25) return 'Fast and fluid';
  if (toksPerSec >= 15) return 'Comfortable for chat';
  if (toksPerSec >= 8) return 'Usable but noticeable delay';
  if (toksPerSec >= 4) return 'Slow, requires patience';
  return 'Very slow';
}

// Compute smart recommendations
interface Recommendation {
  model: ScoredModel;
  index: number;
  badge: string;
  badgeColor: string;
  reason: string;
}

function computeRecommendations(
  results: ScoredModel[],
  useCase: UseCase
): Recommendation[] {
  if (results.length === 0) return [];

  const recommendations: Recommendation[] = [];
  const top10 = results.slice(0, 10);

  // Find fastest model
  const fastest = top10.reduce((best, curr, idx) => {
    const currSpeed = curr.performance.tokensPerSecond ?? 0;
    const bestSpeed = best.model.performance.tokensPerSecond ?? 0;
    return currSpeed > bestSpeed ? { model: curr, index: idx } : best;
  }, { model: top10[0], index: 0 });

  // Find most capable (highest score among larger models)
  const mostCapable = top10.reduce((best, curr, idx) => {
    // Prefer higher score, but also consider model size as a tie-breaker
    if (curr.score > best.model.score) return { model: curr, index: idx };
    if (curr.score === best.model.score && curr.model.params_b > best.model.model.params_b) {
      return { model: curr, index: idx };
    }
    return best;
  }, { model: top10[0], index: 0 });

  // Find best value (good score with lower VRAM, faster speed)
  const bestValue = top10.reduce((best, curr, idx) => {
    const currSpeed = curr.performance.tokensPerSecond ?? 0;
    const bestSpeed = best.model.performance.tokensPerSecond ?? 0;
    // Value = score * speed_factor / vram_usage
    const currValue = (curr.score * Math.sqrt(currSpeed)) / (curr.memory.vramPercent || 1);
    const bestValue = (best.model.score * Math.sqrt(bestSpeed)) / (best.model.memory.vramPercent || 1);
    return currValue > bestValue ? { model: curr, index: idx } : best;
  }, { model: top10[0], index: 0 });

  // Our Pick: Best overall considering everything
  // Weighted combination of score, speed, and efficiency
  const ourPick = top10.reduce((best, curr, idx) => {
    const currSpeed = curr.performance.tokensPerSecond ?? 0;
    const bestSpeed = best.model.performance.tokensPerSecond ?? 0;

    // Normalize factors (rough estimates)
    const currScoreN = curr.score / 100;
    const bestScoreN = best.model.score / 100;
    const currSpeedN = Math.min(currSpeed / 50, 1); // Cap at 50 tok/s
    const bestSpeedN = Math.min(bestSpeed / 50, 1);
    const currVramN = 1 - (curr.memory.vramPercent / 100);
    const bestVramN = 1 - (best.model.memory.vramPercent / 100);

    // Weighted score: 50% quality, 30% speed, 20% VRAM headroom
    const currTotal = currScoreN * 0.5 + currSpeedN * 0.3 + currVramN * 0.2;
    const bestTotal = bestScoreN * 0.5 + bestSpeedN * 0.3 + bestVramN * 0.2;

    return currTotal > bestTotal ? { model: curr, index: idx } : best;
  }, { model: top10[0], index: 0 });

  // Build recommendations list (avoid duplicates)
  const usedIndices = new Set<number>();

  // Always add Our Pick first
  recommendations.push({
    ...ourPick,
    badge: 'Our Pick',
    badgeColor: 'bg-gradient-to-r from-yellow-500 to-orange-500',
    reason: `Best overall for ${USE_CASE_LABELS[useCase].toLowerCase()} on your hardware`,
  });
  usedIndices.add(ourPick.index);

  // Add Fastest if different
  if (!usedIndices.has(fastest.index)) {
    const speed = fastest.model.performance.tokensPerSecond ?? 0;
    recommendations.push({
      ...fastest,
      badge: 'Fastest',
      badgeColor: 'bg-green-500',
      reason: `${speed} tok/s — ${getSpeedDescription(speed).toLowerCase()}`,
    });
    usedIndices.add(fastest.index);
  }

  // Add Most Capable if different
  if (!usedIndices.has(mostCapable.index)) {
    recommendations.push({
      ...mostCapable,
      badge: 'Most Capable',
      badgeColor: 'bg-purple-500',
      reason: `Highest benchmark scores (${mostCapable.model.model.params_b}B parameters)`,
    });
    usedIndices.add(mostCapable.index);
  }

  // Add Best Value if different
  if (!usedIndices.has(bestValue.index)) {
    const speed = bestValue.model.performance.tokensPerSecond ?? 0;
    const vram = (bestValue.model.quant.vram_mb / 1024).toFixed(1);
    recommendations.push({
      ...bestValue,
      badge: 'Best Value',
      badgeColor: 'bg-blue-500',
      reason: `Great balance: ${speed} tok/s, only ${vram}GB VRAM`,
    });
  }

  return recommendations;
}

// Colors for models (10)
const MODEL_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-yellow-500',
  'bg-red-500',
  'bg-indigo-500',
  'bg-teal-500',
];

export default function ResultsList({
  results,
  gpuName,
  vramMb,
  useCase,
  onBuildForModel,
}: ResultsListProps) {
  const [selectedModel, setSelectedModel] = useState<number>(0);
  const [expandedChart, setExpandedChart] = useState<ExpandedChartData>({ type: null });
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [compareSet, setCompareSet] = useState<Set<number>>(new Set());
  const [detailModel, setDetailModel] = useState<ScoredModel | null>(null);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const vramGb = Math.round(vramMb / 1024);
  const gpuLabel = gpuName || `${vramGb}GB VRAM`;
  const topModels = results.slice(0, 10);

  const toggleCompare = (index: number) => {
    const newSet = new Set(compareSet);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else if (newSet.size < 4) {
      newSet.add(index);
    }
    setCompareSet(newSet);
  };

  const compareModels = Array.from(compareSet).map(i => topModels[i]);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-8 text-center">
        <p className="text-lg text-gray-300">No compatible models found.</p>
        <p className="mt-2 text-sm text-gray-500">
          Try lowering the context length or selecting a different use case.
        </p>
      </div>
    );
  }

  const selected = topModels[selectedModel];

  // Get max speed for scaling
  const maxSpeed = Math.max(...topModels.map(r => r.performance.tokensPerSecond ?? 0), 1);

  // Compute recommendations
  const recommendations = computeRecommendations(results, useCase);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-lg bg-gray-800/50 border border-gray-700 px-4 py-2">
        <p className="text-sm text-gray-300">
          <span className="font-semibold text-white">{results.length}</span> models for{' '}
          <span className="font-semibold text-white">{gpuLabel}</span>
          {' '}&middot;{' '}
          <span className="font-semibold text-blue-400 capitalize">{useCase}</span>
        </p>
        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3 py-1.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-30">
                <button
                  onClick={() => {
                    exportToJSON(results, gpuName, vramMb, useCase);
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 rounded-t-lg"
                >
                  JSON
                </button>
                <button
                  onClick={() => {
                    exportToCSV(results, gpuName, vramMb, useCase);
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 rounded-b-lg"
                >
                  CSV
                </button>
              </div>
            )}
          </div>
          {viewMode === 'compare' && (
            <button
              onClick={() => setViewMode('dashboard')}
              className="px-3 py-1.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Results
            </button>
          )}
        </div>
      </div>

      {/* Recommendations Panel */}
      {viewMode === 'dashboard' && recommendations.length > 0 && (
        <div className="rounded-xl border border-gray-700 bg-gradient-to-br from-gray-800/90 to-gray-900/90 p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Our Recommendations
          </h3>

          {/* Our Pick - Featured Card */}
          {recommendations[0] && (
            <OurPickCard
              rec={recommendations[0]}
              isSelected={selectedModel === recommendations[0].index}
              onSelect={() => setSelectedModel(recommendations[0].index)}
              onViewDetails={() => setDetailModel(recommendations[0].model)}
              useCase={useCase}
            />
          )}

          {/* Other recommendations - smaller cards */}
          {recommendations.length > 1 && (
            <div className="grid gap-3 md:grid-cols-3 mt-4">
              {recommendations.slice(1).map((rec) => {
                const speed = rec.model.performance.tokensPerSecond ?? 0;
                const vram = (rec.model.quant.vram_mb / 1024).toFixed(1);
                return (
                  <button
                    key={`rec-${rec.index}`}
                    onClick={() => setSelectedModel(rec.index)}
                    className={`text-left rounded-lg border p-3 transition-all ${
                      selectedModel === rec.index
                        ? 'border-yellow-500/50 bg-yellow-500/10'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${rec.badgeColor}`}>
                        {rec.badge}
                      </span>
                      <span className="text-lg font-bold text-white">{rec.model.score}</span>
                    </div>
                    <h4 className="font-medium text-white text-sm mb-1 truncate">
                      {rec.model.model.name}
                    </h4>
                    <p className="text-xs text-gray-400 mb-2">{rec.reason}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{rec.model.quant.level}</span>
                      <span>{vram}GB</span>
                      {speed > 0 && <span className="text-green-400">{speed} tok/s</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-gray-700/50">
            {/* Compare recommendations button */}
            {recommendations.length >= 2 && (
              <button
                onClick={() => {
                  const indices = recommendations.slice(0, 4).map(r => r.index);
                  setCompareSet(new Set(indices));
                  setViewMode('compare');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Compare Top {Math.min(recommendations.length, 4)}
              </button>
            )}

            {/* Build hardware button */}
            {selected && onBuildForModel && (
              <button
                onClick={() => onBuildForModel(selected.model.id)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                Build Hardware for {selected.model.name}
              </button>
            )}
          </div>

          {/* Quick insights as tags */}
          {selected && (
            <div className="mt-4 pt-3 border-t border-gray-700/50 flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500">Selected:</span>
              <span className="text-xs font-medium text-white">{selected.model.name}</span>

              {/* Speed tag */}
              {selected.performance.tokensPerSecond && (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  selected.performance.tokensPerSecond >= 40
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : selected.performance.tokensPerSecond >= 20
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : selected.performance.tokensPerSecond >= 10
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                }`}>
                  {selected.performance.tokensPerSecond >= 40 ? '⚡ Instant'
                    : selected.performance.tokensPerSecond >= 20 ? '🚀 Fast'
                    : selected.performance.tokensPerSecond >= 10 ? '✓ Usable'
                    : '🐢 Slow'}
                </span>
              )}

              {/* VRAM tag */}
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                selected.memory.vramPercent > 90
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : selected.memory.vramPercent > 75
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
              }`}>
                {selected.memory.vramPercent}% VRAM
              </span>

              {/* Quality tag based on score */}
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                selected.score >= 80
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : selected.score >= 60
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
              }`}>
                {selected.score >= 80 ? '★ Top tier' : selected.score >= 60 ? '● Good' : '○ Basic'}
              </span>

              {/* Warning tag if needed */}
              {selected.memory.vramPercent > 85 && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                  ⚠ Tight fit
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-gray-800/50 border border-gray-700 px-4 py-2">
        {topModels.map((r, i) => (
          <button
            key={`leg-${r.model.id}`}
            onClick={() => setSelectedModel(i)}
            className={`flex items-center gap-1.5 text-xs transition-opacity ${selectedModel === i ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
          >
            <span className={`w-3 h-3 rounded ${MODEL_COLORS[i]}`} />
            <span className="text-gray-300">{r.model.name}</span>
            <span className="text-gray-500">{r.quant.level}</span>
          </button>
        ))}
      </div>

      {/* Main Dashboard Grid - Full Width */}
      {viewMode === 'dashboard' && (
      <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-4">

        {/* Left: Ranking Table */}
        <div className="lg:col-span-1 rounded-xl border border-gray-700 bg-gray-800/80 p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Top 10 Models</h3>
          <div className="space-y-1.5">
            {topModels.map((result, i) => (
              <div
                key={result.model.id}
                className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-all ${
                  selectedModel === i
                    ? 'bg-gray-700 border border-gray-600'
                    : 'bg-gray-800/50 border border-transparent hover:bg-gray-700/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={compareSet.has(i)}
                  onChange={() => toggleCompare(i)}
                  className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                />
                <button
                  onClick={() => setSelectedModel(i)}
                  onDoubleClick={() => setDetailModel(result)}
                  className="flex-1 flex items-center gap-2 text-left min-w-0"
                >
                  <span className={`w-5 h-5 shrink-0 rounded flex items-center justify-center text-[10px] font-bold ${MODEL_COLORS[i]} text-white`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="text-xs font-medium text-white truncate">
                      {result.model.name}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">
                      {result.quant.level} &middot; {(result.quant.vram_mb / 1024).toFixed(1)}GB
                    </div>
                  </div>
                  <div className="text-sm font-bold text-white shrink-0 w-8 text-right">{result.score}</div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDetailModel(result); }}
                  className="p-1 rounded hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
                  title="View details"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Compare button - right below model list */}
          <div className="mt-3 pt-3 border-t border-gray-700">
            {compareSet.size >= 2 ? (
              <button
                onClick={() => setViewMode('compare')}
                className="w-full px-3 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Compare {compareSet.size} Models
              </button>
            ) : (
              <p className="text-xs text-gray-500 text-center">
                Select 2-4 models to compare
              </p>
            )}
          </div>
        </div>

        {/* Right: Charts & Details */}
        <div className="lg:col-span-3 xl:col-span-4 space-y-4">

          {/* Comparison Bars */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Score - absolute scale 0-100 */}
            <button
              onClick={() => setExpandedChart({ type: 'score' })}
              className="rounded-xl border border-gray-700 bg-gray-800/80 p-3 text-left hover:border-gray-500 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-400">Score</span>
                <span className="text-[10px] text-gray-600">/100</span>
              </div>
              <div className="space-y-0.5">
                {topModels.map((r, i) => (
                  <div key={`s-${r.model.id}`} className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${MODEL_COLORS[i]}`} />
                    <div className="flex-1 h-2.5 bg-gray-900 rounded overflow-hidden">
                      <div
                        className={`h-full ${MODEL_COLORS[i]} ${selectedModel === i ? 'opacity-100' : 'opacity-50'}`}
                        style={{ width: `${r.score}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 w-6 text-right">{r.score}</span>
                  </div>
                ))}
              </div>
            </button>

            {/* Speed */}
            <button
              onClick={() => setExpandedChart({ type: 'speed' })}
              className="rounded-xl border border-gray-700 bg-gray-800/80 p-3 text-left hover:border-gray-500 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-400">Speed (tok/s)</span>
                <span className="text-[10px] text-gray-600">Click to expand</span>
              </div>
              <div className="space-y-0.5">
                {topModels.map((r, i) => {
                  const speed = r.performance.tokensPerSecond ?? 0;
                  return (
                    <div key={`sp-${r.model.id}`} className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${MODEL_COLORS[i]}`} />
                      <div className="flex-1 h-2.5 bg-gray-900 rounded overflow-hidden">
                        <div
                          className={`h-full ${MODEL_COLORS[i]} ${selectedModel === i ? 'opacity-100' : 'opacity-50'}`}
                          style={{ width: `${(speed / maxSpeed) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 w-6 text-right">{speed || '—'}</span>
                    </div>
                  );
                })}
              </div>
            </button>

            {/* VRAM */}
            <button
              onClick={() => setExpandedChart({ type: 'vram' })}
              className="rounded-xl border border-gray-700 bg-gray-800/80 p-3 text-left hover:border-gray-500 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-400">VRAM Usage</span>
                <span className="text-[10px] text-gray-600">Click to expand</span>
              </div>
              <div className="space-y-0.5">
                {topModels.map((r, i) => {
                  const pct = r.memory.vramPercent;
                  const color = pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-yellow-500' : MODEL_COLORS[i];
                  return (
                    <div key={`v-${r.model.id}`} className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${MODEL_COLORS[i]}`} />
                      <div className="flex-1 h-2.5 bg-gray-900 rounded overflow-hidden">
                        <div
                          className={`h-full ${color} ${selectedModel === i ? 'opacity-100' : 'opacity-50'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 w-7 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </button>

            {/* Quant Quality */}
            <button
              onClick={() => setExpandedChart({ type: 'quant' })}
              className="rounded-xl border border-gray-700 bg-gray-800/80 p-3 text-left hover:border-gray-500 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-400">Quant Quality</span>
                <span className="text-[10px] text-gray-600">Click to expand</span>
              </div>
              <div className="space-y-0.5">
                {topModels.map((r, i) => (
                  <div key={`q-${r.model.id}`} className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${MODEL_COLORS[i]}`} />
                    <div className="flex-1 h-2.5 bg-gray-900 rounded overflow-hidden">
                      <div
                        className={`h-full ${MODEL_COLORS[i]} ${selectedModel === i ? 'opacity-100' : 'opacity-50'}`}
                        style={{ width: `${r.quant.quality * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 w-10 text-right">{r.quant.level}</span>
                  </div>
                ))}
              </div>
            </button>
          </div>

          {/* Benchmark Comparison Charts - absolute scale 0-100 */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Benchmark Comparison
              <span className="ml-2 text-xs font-normal text-gray-500">
                ({useCase}) — scale 0-100
              </span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {USE_CASE_BENCHMARKS[useCase]
                .filter((benchKey) => topModels.some(r => r.model.benchmarks[benchKey] !== null && r.model.benchmarks[benchKey] !== undefined))
                .map((benchKey) => {
                const benchName = BENCHMARK_NAMES[benchKey];
                return (
                  <button
                    key={benchKey}
                    onClick={() => setExpandedChart({ type: 'benchmark', benchKey })}
                    className="space-y-1 text-left hover:bg-gray-700/30 p-2 -m-2 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs font-medium text-gray-400 mb-1">
                      <span>{benchName}</span>
                      <span className="text-[10px] text-gray-600">/100</span>
                    </div>
                    {topModels.map((r, i) => {
                      const val = r.model.benchmarks[benchKey];
                      // Absolute scale: value is already 0-100
                      const width = val !== null && val !== undefined ? val : 0;
                      return (
                        <div key={`b-${benchKey}-${r.model.id}`} className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${MODEL_COLORS[i]}`} />
                          <div className="flex-1 h-2.5 bg-gray-900 rounded overflow-hidden">
                            {val !== null && val !== undefined ? (
                              <div
                                className={`h-full ${MODEL_COLORS[i]} ${selectedModel === i ? 'opacity-100' : 'opacity-50'}`}
                                style={{ width: `${width}%` }}
                              />
                            ) : (
                              <div className="h-full flex items-center px-1">
                                <span className="text-[8px] text-gray-600">N/A</span>
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 w-8 text-right">
                            {val !== null && val !== undefined ? val.toFixed(1) : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Model Details */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${MODEL_COLORS[selectedModel]} text-white`}>
                    {selectedModel + 1}
                  </span>
                  <h3 className="text-lg font-semibold text-white">{selected.model.name}</h3>
                  <span className="text-sm text-gray-400">{selected.model.params_b}B</span>
                  {selected.inferenceMode !== 'gpu_full' && (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      selected.inferenceMode === 'gpu_offload' ? 'bg-yellow-500/20 text-yellow-400' :
                      selected.inferenceMode === 'cpu_only' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {selected.inferenceMode === 'gpu_offload' && 'GPU+RAM'}
                      {selected.inferenceMode === 'cpu_only' && 'CPU only'}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm text-gray-400">
                  {selected.quant.level} &middot; {(selected.quant.vram_mb / 1024).toFixed(1)}GB VRAM
                  {selected.performance.tokensPerSecond && ` \u00b7 ~${selected.performance.tokensPerSecond} tok/s`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{selected.score}</div>
                <div className="text-xs text-gray-500">score</div>
              </div>
            </div>

            {/* Warnings */}
            {selected.warnings.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.warnings.map((w, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                    {w}
                  </span>
                ))}
              </div>
            )}

            {/* Command */}
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-900 border border-gray-700 px-3 py-2">
              <code className="flex-1 text-sm text-green-400 font-mono">
                $ ollama run {selected.quant.ollama_tag}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`ollama run ${selected.quant.ollama_tag}`);
                  setCopiedTag(selected.quant.ollama_tag);
                  setTimeout(() => setCopiedTag(null), 2000);
                }}
                className={`text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                  copiedTag === selected.quant.ollama_tag
                    ? 'bg-green-600 text-white'
                    : 'text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700'
                }`}
              >
                {copiedTag === selected.quant.ollama_tag ? (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  'Copy'
                )}
              </button>
            </div>

            {/* Build for this model link */}
            {onBuildForModel && (
              <button
                onClick={() => onBuildForModel(selected.model.id)}
                className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg border border-orange-600/50 bg-orange-600/10 px-4 py-2.5 text-sm font-medium text-orange-400 hover:bg-orange-600/20 hover:border-orange-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                Build hardware for {selected.model.name}
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Comparison View */}
      {viewMode === 'compare' && compareModels.length >= 2 && (
        <div className="space-y-4">
          {/* Radar Chart */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-4">
            <h3 className="text-lg font-semibold text-white mb-4 text-center">Visual Comparison</h3>
            <ComparisonRadar
              models={compareModels}
              useCase={useCase}
              colors={Array.from(compareSet).map(i => MODEL_COLORS[i])}
            />
          </div>

          {/* Comparison Table */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-4 overflow-x-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Detailed Comparison</h3>
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-3 text-gray-400 font-medium">Spec</th>
                {compareModels.map((r, i) => (
                  <th key={r.model.id} className="text-center py-2 px-3 min-w-[140px]">
                    <div className="flex items-center justify-center gap-2">
                      <span className={`w-4 h-4 rounded ${MODEL_COLORS[Array.from(compareSet)[i]]} flex-shrink-0`} />
                      <span className="text-white font-medium truncate">{r.model.name}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{r.quant.level}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {/* Basic Info */}
              <tr>
                <td className="py-2 px-3 text-gray-400">Parameters</td>
                {compareModels.map(r => (
                  <td key={`param-${r.model.id}`} className="py-2 px-3 text-center text-white">
                    {r.model.params_b}B
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 px-3 text-gray-400">Architecture</td>
                {compareModels.map(r => (
                  <td key={`arch-${r.model.id}`} className="py-2 px-3 text-center text-white capitalize">
                    {r.model.architecture}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 px-3 text-gray-400">Context</td>
                {compareModels.map(r => (
                  <td key={`ctx-${r.model.id}`} className="py-2 px-3 text-center text-white">
                    {(r.model.context_length / 1024).toFixed(0)}K
                  </td>
                ))}
              </tr>

              {/* Score */}
              <tr className="bg-gray-900/30">
                <td className="py-2 px-3 text-gray-400 font-medium">Score</td>
                {compareModels.map(r => {
                  const isMax = r.score === Math.max(...compareModels.map(m => m.score));
                  return (
                    <td key={`score-${r.model.id}`} className={`py-2 px-3 text-center font-bold ${isMax ? 'text-green-400' : 'text-white'}`}>
                      {r.score}
                    </td>
                  );
                })}
              </tr>

              {/* Performance */}
              <tr>
                <td className="py-2 px-3 text-gray-400">Speed</td>
                {compareModels.map(r => {
                  const speed = r.performance.tokensPerSecond;
                  const isMax = speed === Math.max(...compareModels.map(m => m.performance.tokensPerSecond ?? 0));
                  return (
                    <td key={`speed-${r.model.id}`} className={`py-2 px-3 text-center ${isMax ? 'text-green-400' : 'text-white'}`}>
                      {speed ? `${speed} tok/s` : '—'}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="py-2 px-3 text-gray-400">Prefill</td>
                {compareModels.map(r => (
                  <td key={`prefill-${r.model.id}`} className="py-2 px-3 text-center text-white">
                    {r.performance.prefillTokensPerSecond ? `${r.performance.prefillTokensPerSecond} tok/s` : '—'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 px-3 text-gray-400">TTFT</td>
                {compareModels.map(r => (
                  <td key={`ttft-${r.model.id}`} className="py-2 px-3 text-center text-white">
                    {r.performance.timeToFirstToken ? `${r.performance.timeToFirstToken}ms` : '—'}
                  </td>
                ))}
              </tr>

              {/* Memory */}
              <tr className="bg-gray-900/30">
                <td className="py-2 px-3 text-gray-400 font-medium">VRAM</td>
                {compareModels.map(r => {
                  const isMin = r.memory.vramPercent === Math.min(...compareModels.map(m => m.memory.vramPercent));
                  return (
                    <td key={`vram-${r.model.id}`} className={`py-2 px-3 text-center ${isMin ? 'text-green-400' : 'text-white'}`}>
                      {(r.quant.vram_mb / 1024).toFixed(1)}GB ({r.memory.vramPercent}%)
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="py-2 px-3 text-gray-400">Inference Mode</td>
                {compareModels.map(r => (
                  <td key={`mode-${r.model.id}`} className="py-2 px-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      r.inferenceMode === 'gpu_full' ? 'bg-green-500/20 text-green-400' :
                      r.inferenceMode === 'gpu_offload' ? 'bg-yellow-500/20 text-yellow-400' :
                      r.inferenceMode === 'cpu_only' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {r.inferenceMode === 'gpu_full' && 'Full GPU'}
                      {r.inferenceMode === 'gpu_offload' && 'GPU+RAM'}
                      {r.inferenceMode === 'cpu_only' && 'CPU only'}
                      {r.inferenceMode === 'not_possible' && 'N/A'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Quant */}
              <tr>
                <td className="py-2 px-3 text-gray-400">Quantization</td>
                {compareModels.map(r => (
                  <td key={`quant-${r.model.id}`} className="py-2 px-3 text-center text-white">
                    {r.quant.level} ({(r.quant.quality * 100).toFixed(0)}%)
                  </td>
                ))}
              </tr>

              {/* Benchmarks header */}
              <tr className="bg-gray-900/50">
                <td colSpan={compareModels.length + 1} className="py-2 px-3 text-gray-300 font-medium">
                  Benchmarks
                </td>
              </tr>

              {/* Benchmarks */}
              {USE_CASE_BENCHMARKS[useCase]
                .filter(benchKey => compareModels.some(r => r.model.benchmarks[benchKey] !== null && r.model.benchmarks[benchKey] !== undefined))
                .map(benchKey => {
                const values = compareModels.map(r => r.model.benchmarks[benchKey]);
                const maxVal = Math.max(...values.filter((v): v is number => v !== null));
                return (
                  <tr key={`bench-${benchKey}`}>
                    <td className="py-2 px-3 text-gray-400">{BENCHMARK_NAMES[benchKey]}</td>
                    {compareModels.map((r, i) => {
                      const val = values[i];
                      const isMax = val === maxVal && val !== null;
                      return (
                        <td key={`${benchKey}-${r.model.id}`} className={`py-2 px-3 text-center ${isMax ? 'text-green-400 font-medium' : 'text-white'}`}>
                          {val !== null ? val.toFixed(1) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Commands */}
              <tr className="bg-gray-900/30">
                <td className="py-2 px-3 text-gray-400 font-medium">Ollama Command</td>
                {compareModels.map(r => (
                  <td key={`cmd-${r.model.id}`} className="py-2 px-3 text-center">
                    <code className="text-xs text-green-400 bg-gray-900 px-2 py-1 rounded">
                      {r.quant.ollama_tag}
                    </code>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* More models link */}
      {viewMode === 'dashboard' && results.length > 10 && (
        <div className="text-center text-sm text-gray-500">
          +{results.length - 10} more models available
        </div>
      )}

      {/* Expanded Chart Modal */}
      {expandedChart.type && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedChart({ type: null })}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-xl p-4 max-w-xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white">
                {expandedChart.type === 'score' && 'Score'}
                {expandedChart.type === 'speed' && 'Speed (tok/s)'}
                {expandedChart.type === 'vram' && 'VRAM Usage'}
                {expandedChart.type === 'quant' && 'Quant Quality'}
                {expandedChart.type === 'benchmark' && expandedChart.benchKey && BENCHMARK_NAMES[expandedChart.benchKey]}
              </h2>
              <button
                onClick={() => setExpandedChart({ type: null })}
                className="text-gray-400 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-1.5">
              {topModels.map((r, i) => {
                let value: number | null = null;
                let displayValue = '';
                let barWidth = 0;
                let barColor = MODEL_COLORS[i];

                if (expandedChart.type === 'score') {
                  value = r.score;
                  displayValue = `${r.score}`;
                  barWidth = r.score; // Absolute scale 0-100
                } else if (expandedChart.type === 'speed') {
                  value = r.performance.tokensPerSecond;
                  displayValue = value ? `${value}` : '—';
                  // Speed uses relative scale (no clear max)
                  barWidth = value ? (value / maxSpeed) * 100 : 0;
                } else if (expandedChart.type === 'vram') {
                  value = r.memory.vramPercent;
                  displayValue = `${value}%`;
                  barWidth = Math.min(value, 100); // Already absolute 0-100
                  barColor = value > 90 ? 'bg-red-500' : value > 75 ? 'bg-yellow-500' : MODEL_COLORS[i];
                } else if (expandedChart.type === 'quant') {
                  value = r.quant.quality * 100;
                  displayValue = r.quant.level;
                  barWidth = value; // Already 0-100
                } else if (expandedChart.type === 'benchmark' && expandedChart.benchKey) {
                  const benchVal = r.model.benchmarks[expandedChart.benchKey];
                  value = benchVal ?? null;
                  displayValue = value !== null ? value.toFixed(1) : '—';
                  barWidth = value !== null ? value : 0; // Absolute scale 0-100
                }

                return (
                  <div
                    key={`exp-${r.model.id}`}
                    className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer hover:bg-gray-800/50 ${selectedModel === i ? 'bg-gray-800' : ''}`}
                    onClick={() => setSelectedModel(i)}
                  >
                    <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${MODEL_COLORS[i]} text-white shrink-0`}>
                      {i + 1}
                    </span>
                    <div className="w-28 shrink-0 text-xs text-white truncate">{r.model.name}</div>
                    <div className="flex-1 h-4 bg-gray-800 rounded overflow-hidden">
                      {value !== null ? (
                        <div
                          className={`h-full ${barColor}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      ) : (
                        <span className="text-[10px] text-gray-600 px-1">N/A</span>
                      )}
                    </div>
                    <div className="w-12 text-right text-xs text-gray-300">
                      {displayValue}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Model Detail Modal */}
      {detailModel && (
        <ModelDetailModal
          model={detailModel}
          onClose={() => setDetailModel(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Comparison Radar Chart
// ============================================================================

function ComparisonRadar({
  models,
  useCase,
  colors,
}: {
  models: ScoredModel[];
  useCase: UseCase;
  colors: string[];
}) {
  const radarData = useMemo(() => {
    // Get max values for normalization
    // Speed still needs relative scale (no clear max)
    const maxSpeed = Math.max(...models.map(m => m.performance.tokensPerSecond ?? 0), 1);

    // Get relevant benchmarks for use case - only those with data
    const benchmarks = USE_CASE_BENCHMARKS[useCase]
      .filter(benchKey => models.some(m => m.model.benchmarks[benchKey] !== null && m.model.benchmarks[benchKey] !== undefined))
      .slice(0, 4); // Max 4 benchmarks

    // Build data points - using absolute scales where applicable
    const data = [
      {
        label: 'Score',
        values: models.map(m => m.score), // Absolute 0-100
      },
      {
        label: 'Speed',
        values: models.map(m => ((m.performance.tokensPerSecond ?? 0) / maxSpeed) * 100), // Relative (no clear max)
      },
      {
        label: 'VRAM Eff.',
        values: models.map(m => Math.max(0, 100 - m.memory.vramPercent)), // Absolute 0-100
      },
      ...benchmarks.map(benchKey => ({
        label: BENCHMARK_NAMES[benchKey],
        values: models.map(m => {
          const val = m.model.benchmarks[benchKey];
          return val !== null && val !== undefined ? val : 0; // Absolute 0-100
        }),
      })),
    ];

    return data;
  }, [models, useCase]);

  return (
    <RadarChart
      data={radarData}
      modelNames={models.map(m => m.model.name)}
      colors={colors}
      size={320}
    />
  );
}

// ============================================================================
// Our Pick Featured Card
// ============================================================================

function OurPickCard({
  rec,
  isSelected,
  onSelect,
  onViewDetails,
  useCase,
}: {
  rec: Recommendation;
  isSelected: boolean;
  onSelect: () => void;
  onViewDetails: () => void;
  useCase: UseCase;
}) {
  const [copied, setCopied] = useState(false);
  const model = rec.model;
  const speed = model.performance.tokensPerSecond ?? 0;
  const vram = (model.quant.vram_mb / 1024).toFixed(1);
  const benchmarks = USE_CASE_BENCHMARKS[useCase]
    .filter(benchKey => model.model.benchmarks[benchKey] !== null && model.model.benchmarks[benchKey] !== undefined)
    .slice(0, 4);

  // Generate links
  const ollamaBase = model.model.ollama_base.split(':')[0]; // Remove tag if present
  const ollamaLink = `https://ollama.com/library/${ollamaBase}`;
  const hfLink = `https://huggingface.co/models?search=${encodeURIComponent(model.model.name)}`;

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border p-4 cursor-pointer transition-all ${
        isSelected
          ? 'border-yellow-500 bg-yellow-500/10'
          : 'border-yellow-500/30 our-pick-gradient from-yellow-900/20 to-orange-900/20 hover:border-yellow-500/50'
      }`}
    >
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: Main Info */}
        <div className="flex-1">
          <div className="flex items-start gap-3 mb-3">
            <span className={`px-3 py-1 rounded-lg text-sm font-semibold text-white ${rec.badgeColor}`}>
              ⭐ {rec.badge}
            </span>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-white">{model.model.name}</h4>
              <p className="text-sm text-gray-400">{rec.reason}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{model.score}</div>
              <div className="text-xs text-gray-500">score</div>
            </div>
          </div>

          {/* Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div className="bg-gray-800/50 rounded-lg px-3 py-2">
              <div className="text-[10px] text-gray-500 uppercase">Params</div>
              <div className="text-sm font-medium text-white">{model.model.params_b}B</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg px-3 py-2">
              <div className="text-[10px] text-gray-500 uppercase">Context</div>
              <div className="text-sm font-medium text-white">{(model.model.context_length / 1024).toFixed(0)}K</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg px-3 py-2">
              <div className="text-[10px] text-gray-500 uppercase">VRAM</div>
              <div className="text-sm font-medium text-white">{vram}GB</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg px-3 py-2">
              <div className="text-[10px] text-gray-500 uppercase">Speed</div>
              <div className="text-sm font-medium text-green-400">{speed} tok/s</div>
            </div>
          </div>

          {/* Ollama Command */}
          <div className="flex items-center gap-2 rounded-lg bg-gray-900 border border-gray-700 px-3 py-2">
            <code className="flex-1 text-sm text-green-400 font-mono truncate">
              ollama run {model.quant.ollama_tag}
            </code>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(`ollama run ${model.quant.ollama_tag}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className={`text-xs px-2 py-1 rounded shrink-0 flex items-center gap-1 transition-colors ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700'
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                'Copy'
              )}
            </button>
          </div>

          {/* View Details Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
            className="mt-3 w-full px-4 py-2 text-sm font-medium bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            View Full Details
          </button>
        </div>

        {/* Right: Benchmarks & Links */}
        <div className="lg:w-64 space-y-3">
          {/* Key Benchmarks */}
          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="text-[10px] text-gray-500 uppercase mb-2">Key Benchmarks</div>
            <div className="space-y-1.5">
              {benchmarks.map(benchKey => {
                const val = model.model.benchmarks[benchKey];
                return (
                  <div key={benchKey} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-20 truncate">{BENCHMARK_NAMES[benchKey]}</span>
                    <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${val ?? 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-white w-8 text-right">
                      {val !== null && val !== undefined ? val.toFixed(0) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Links */}
          <div className="flex gap-2">
            <a
              href={ollamaLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              Ollama
            </a>
            <a
              href={hfLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              HuggingFace
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
