'use client';

import { ScoredModel, UseCase, Benchmarks } from '@/lib/types';

interface BenchmarkChartProps {
  results: ScoredModel[];
  useCase: UseCase;
}

// Benchmark metadata
const BENCHMARK_INFO: Record<keyof Benchmarks, { name: string; description: string }> = {
  humaneval: { name: 'HumanEval', description: 'Python code generation' },
  mmlu_pro: { name: 'MMLU-PRO', description: 'Multi-task language understanding' },
  math: { name: 'MATH', description: 'Mathematical reasoning' },
  ifeval: { name: 'IFEval', description: 'Instruction following' },
  bbh: { name: 'BBH', description: 'Big-Bench Hard reasoning' },
  mmmu: { name: 'MMMU', description: 'Multimodal understanding' },
  gpqa: { name: 'GPQA', description: 'Graduate-level Q&A' },
  musr: { name: 'MUSR', description: 'Multi-step reasoning' },
  mbpp: { name: 'MBPP', description: 'Basic Python programming' },
  bigcodebench: { name: 'BigCodeBench', description: 'Complex coding tasks' },
  alpacaeval: { name: 'AlpacaEval', description: 'Open-ended generation' },
  mmbench: { name: 'MMBench', description: 'Multimodal benchmark' },
};

// Benchmarks relevant to each use case (in order of importance)
// Data sources:
// - Open LLM Leaderboard: ifeval, mmlu_pro, bbh, math, gpqa, musr
// - EvalPlus: humaneval, mbpp
// - BigCodeBench: bigcodebench
const USE_CASE_BENCHMARKS: Record<UseCase, (keyof Benchmarks)[]> = {
  chat: ['ifeval', 'mmlu_pro', 'bbh'],
  coding: ['humaneval', 'mbpp', 'bigcodebench', 'math'],
  reasoning: ['math', 'gpqa', 'bbh', 'musr'],
  creative: ['ifeval', 'mmlu_pro', 'bbh'],
  vision: ['ifeval', 'mmlu_pro', 'bbh'],  // Placeholder until MMMU/MMBench available
};

// Colors for each model (up to 10)
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

export default function BenchmarkChart({ results, useCase }: BenchmarkChartProps) {
  const benchmarks = USE_CASE_BENCHMARKS[useCase];
  const topModels = results.slice(0, 5); // Show top 5 models

  // Find max value for scaling
  const maxValue = Math.max(
    ...topModels.flatMap((r) =>
      benchmarks.map((b) => r.model.benchmarks[b] ?? 0)
    ),
    1
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Benchmark Comparison</h3>
        <span className="text-xs text-gray-400">
          Showing benchmarks relevant to {useCase}
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {topModels.map((result, i) => (
          <div key={result.model.id} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${MODEL_COLORS[i]}`} />
            <span className="text-xs text-gray-300">
              {result.model.name} ({result.model.params_b}B)
            </span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="space-y-4">
        {benchmarks.map((benchKey) => {
          const info = BENCHMARK_INFO[benchKey];
          return (
            <div key={benchKey} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-200">
                    {info.name}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">
                    {info.description}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                {topModels.map((result, i) => {
                  const value = result.model.benchmarks[benchKey];
                  const width = value !== null ? (value / maxValue) * 100 : 0;
                  // Create short label: "Qwen 2.5 7B" -> "Qwen 2.5 7B", truncate if too long
                  const shortName = `${result.model.name} ${result.quant.level}`;
                  return (
                    <div key={result.model.id} className="flex items-center gap-2">
                      <div className="w-28 text-xs text-gray-400 truncate" title={shortName}>
                        {result.model.name.replace(/\s+\d+(\.\d+)?B$/i, '')} {result.model.params_b}B
                      </div>
                      <div className="flex-1 h-5 bg-gray-800 rounded overflow-hidden">
                        {value !== null ? (
                          <div
                            className={`h-full ${MODEL_COLORS[i]} transition-all duration-500`}
                            style={{ width: `${width}%` }}
                          />
                        ) : (
                          <div className="h-full flex items-center px-2">
                            <span className="text-xs text-gray-600">N/A</span>
                          </div>
                        )}
                      </div>
                      <div className="w-12 text-xs text-gray-300 text-right">
                        {value !== null ? value.toFixed(1) : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Score breakdown */}
      <div className="border-t border-gray-700 pt-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Overall Score Breakdown</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {topModels.map((result, i) => (
            <div
              key={result.model.id}
              className="bg-gray-800/50 rounded-lg p-3 border border-gray-700"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded ${MODEL_COLORS[i]}`} />
                <span className="text-sm font-medium text-white truncate">
                  {result.model.name}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-gray-500">Score</div>
                  <div className="text-white font-semibold">{result.score}</div>
                </div>
                <div>
                  <div className="text-gray-500">Speed</div>
                  <div className="text-white">
                    {result.performance.tokensPerSecond ?? '—'} t/s
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Quant</div>
                  <div className="text-white">{result.quant.level}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
