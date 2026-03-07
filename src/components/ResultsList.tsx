'use client';

import { useState } from 'react';
import { ScoredModel, UseCase, Benchmarks } from '@/lib/types';

type ChartType = 'score' | 'speed' | 'vram' | 'quant' | 'benchmark' | null;

interface ExpandedChartData {
  type: ChartType;
  benchKey?: keyof Benchmarks;
}

interface ResultsListProps {
  results: ScoredModel[];
  gpuName: string | null;
  vramMb: number;
  useCase: UseCase;
}

// Benchmarks per use case
const USE_CASE_BENCHMARKS: Record<UseCase, (keyof Benchmarks)[]> = {
  chat: ['ifeval', 'mmlu_pro', 'bbh'],
  coding: ['bigcodebench', 'math', 'bbh', 'ifeval'],
  reasoning: ['math', 'gpqa', 'bbh', 'musr'],
  creative: ['ifeval', 'mmlu_pro', 'bbh'],
  vision: ['ifeval', 'mmlu_pro', 'bbh'],
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
}: ResultsListProps) {
  const [selectedModel, setSelectedModel] = useState<number>(0);
  const [expandedChart, setExpandedChart] = useState<ExpandedChartData>({ type: null });
  const vramGb = Math.round(vramMb / 1024);
  const gpuLabel = gpuName || `${vramGb}GB VRAM`;
  const topModels = results.slice(0, 10);

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

  // Get max values for scaling
  const maxSpeed = Math.max(...topModels.map(r => r.performance.tokensPerSecond ?? 0), 1);
  const maxScore = Math.max(...topModels.map(r => r.score), 1);

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
      </div>

      {/* Main Dashboard Grid - Full Width */}
      <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-4">

        {/* Left: Ranking Table */}
        <div className="lg:col-span-1 rounded-xl border border-gray-700 bg-gray-800/80 p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Top 10 Models</h3>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
            {topModels.map((result, i) => (
              <button
                key={result.model.id}
                onClick={() => setSelectedModel(i)}
                className={`w-full text-left rounded-md px-2 py-1.5 transition-all ${
                  selectedModel === i
                    ? 'bg-gray-700 border border-gray-600'
                    : 'bg-gray-800/50 border border-transparent hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${MODEL_COLORS[i]} text-white`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">
                      {result.model.name}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {result.quant.level} &middot; {(result.quant.vram_mb / 1024).toFixed(1)}GB
                    </div>
                  </div>
                  <div className="text-sm font-bold text-white">{result.score}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Charts & Details */}
        <div className="lg:col-span-3 xl:col-span-4 space-y-4">

          {/* Comparison Bars */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Score */}
            <button
              onClick={() => setExpandedChart({ type: 'score' })}
              className="rounded-xl border border-gray-700 bg-gray-800/80 p-3 text-left hover:border-gray-500 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-400">Score</span>
                <span className="text-[10px] text-gray-600">Click to expand</span>
              </div>
              <div className="space-y-0.5">
                {topModels.map((r, i) => (
                  <div key={`s-${r.model.id}`} className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${MODEL_COLORS[i]}`} />
                    <div className="flex-1 h-2.5 bg-gray-900 rounded overflow-hidden">
                      <div
                        className={`h-full ${MODEL_COLORS[i]} ${selectedModel === i ? 'opacity-100' : 'opacity-50'}`}
                        style={{ width: `${(r.score / maxScore) * 100}%` }}
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

          {/* Benchmark Comparison Charts */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Benchmark Comparison
              <span className="ml-2 text-xs font-normal text-gray-500">
                ({useCase})
              </span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {USE_CASE_BENCHMARKS[useCase].map((benchKey) => {
                const benchName = BENCHMARK_NAMES[benchKey];
                const maxVal = Math.max(
                  ...topModels.map((r) => r.model.benchmarks[benchKey] ?? 0),
                  1
                );
                return (
                  <button
                    key={benchKey}
                    onClick={() => setExpandedChart({ type: 'benchmark', benchKey })}
                    className="space-y-1 text-left hover:bg-gray-700/30 p-2 -m-2 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs font-medium text-gray-400 mb-1">
                      <span>{benchName}</span>
                      <span className="text-[10px] text-gray-600">Expand</span>
                    </div>
                    {topModels.map((r, i) => {
                      const val = r.model.benchmarks[benchKey];
                      const width = val !== null && val !== undefined ? (val / maxVal) * 100 : 0;
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
                onClick={() => navigator.clipboard.writeText(`ollama run ${selected.quant.ollama_tag}`)}
                className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-800 hover:bg-gray-700"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* More models link */}
      {results.length > 10 && (
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
                  barWidth = (r.score / maxScore) * 100;
                } else if (expandedChart.type === 'speed') {
                  value = r.performance.tokensPerSecond;
                  displayValue = value ? `${value}` : '—';
                  barWidth = value ? (value / maxSpeed) * 100 : 0;
                } else if (expandedChart.type === 'vram') {
                  value = r.memory.vramPercent;
                  displayValue = `${value}%`;
                  barWidth = Math.min(value, 100);
                  barColor = value > 90 ? 'bg-red-500' : value > 75 ? 'bg-yellow-500' : MODEL_COLORS[i];
                } else if (expandedChart.type === 'quant') {
                  value = r.quant.quality * 100;
                  displayValue = r.quant.level;
                  barWidth = value;
                } else if (expandedChart.type === 'benchmark' && expandedChart.benchKey) {
                  const benchVal = r.model.benchmarks[expandedChart.benchKey];
                  const maxBench = Math.max(...topModels.map((m) => m.model.benchmarks[expandedChart.benchKey!] ?? 0), 1);
                  value = benchVal ?? null;
                  displayValue = value !== null ? value.toFixed(1) : '—';
                  barWidth = value !== null ? (value / maxBench) * 100 : 0;
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
    </div>
  );
}
