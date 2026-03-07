'use client';

import { useState } from 'react';
import { ScoredModel, UseCase } from '@/lib/types';

interface ResultsListProps {
  results: ScoredModel[];
  gpuName: string | null;
  vramMb: number;
  useCase: UseCase;
}

// Colors for models
const MODEL_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
];

export default function ResultsList({
  results,
  gpuName,
  vramMb,
  useCase,
}: ResultsListProps) {
  const [selectedModel, setSelectedModel] = useState<number>(0);
  const vramGb = Math.round(vramMb / 1024);
  const gpuLabel = gpuName || `${vramGb}GB VRAM`;
  const topModels = results.slice(0, 5);

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

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left: Ranking Table */}
        <div className="lg:col-span-1 rounded-xl border border-gray-700 bg-gray-800/80 p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Top 5 Models</h3>
          <div className="space-y-2">
            {topModels.map((result, i) => (
              <button
                key={result.model.id}
                onClick={() => setSelectedModel(i)}
                className={`w-full text-left rounded-lg p-2 transition-all ${
                  selectedModel === i
                    ? 'bg-gray-700 border border-gray-600'
                    : 'bg-gray-800/50 border border-transparent hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${MODEL_COLORS[i]} text-white`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {result.model.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {result.quant.level} &middot; {(result.quant.vram_mb / 1024).toFixed(1)}GB
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">{result.score}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Charts & Details */}
        <div className="lg:col-span-2 space-y-4">

          {/* Comparison Bars */}
          <div className="grid grid-cols-2 gap-4">
            {/* Score */}
            <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-400">Score</span>
              </div>
              <div className="space-y-1.5">
                {topModels.map((r, i) => (
                  <div key={`s-${r.model.id}`} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded ${MODEL_COLORS[i]}`} />
                    <div className="flex-1 h-4 bg-gray-900 rounded overflow-hidden">
                      <div
                        className={`h-full ${MODEL_COLORS[i]} ${selectedModel === i ? 'opacity-100' : 'opacity-60'}`}
                        style={{ width: `${(r.score / maxScore) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-300 w-8 text-right">{r.score}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Speed */}
            <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-400">Speed (tok/s)</span>
              </div>
              <div className="space-y-1.5">
                {topModels.map((r, i) => {
                  const speed = r.performance.tokensPerSecond ?? 0;
                  return (
                    <div key={`sp-${r.model.id}`} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded ${MODEL_COLORS[i]}`} />
                      <div className="flex-1 h-4 bg-gray-900 rounded overflow-hidden">
                        <div
                          className={`h-full ${MODEL_COLORS[i]} ${selectedModel === i ? 'opacity-100' : 'opacity-60'}`}
                          style={{ width: `${(speed / maxSpeed) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-300 w-8 text-right">{speed || '—'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* VRAM */}
            <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-400">VRAM Usage</span>
              </div>
              <div className="space-y-1.5">
                {topModels.map((r, i) => {
                  const pct = r.memory.vramPercent;
                  const color = pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-yellow-500' : MODEL_COLORS[i];
                  return (
                    <div key={`v-${r.model.id}`} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded ${MODEL_COLORS[i]}`} />
                      <div className="flex-1 h-4 bg-gray-900 rounded overflow-hidden">
                        <div
                          className={`h-full ${color} ${selectedModel === i ? 'opacity-100' : 'opacity-60'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-300 w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quant Quality */}
            <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-400">Quant Quality</span>
              </div>
              <div className="space-y-1.5">
                {topModels.map((r, i) => (
                  <div key={`q-${r.model.id}`} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded ${MODEL_COLORS[i]}`} />
                    <div className="flex-1 h-4 bg-gray-900 rounded overflow-hidden">
                      <div
                        className={`h-full ${MODEL_COLORS[i]} ${selectedModel === i ? 'opacity-100' : 'opacity-60'}`}
                        style={{ width: `${r.quant.quality * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-300 w-12 text-right">{r.quant.level}</span>
                  </div>
                ))}
              </div>
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
      {results.length > 5 && (
        <div className="text-center text-sm text-gray-500">
          +{results.length - 5} more models available
        </div>
      )}
    </div>
  );
}
