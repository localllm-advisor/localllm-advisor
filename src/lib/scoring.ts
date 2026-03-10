import { Benchmarks, UseCase, UseCaseWeights, BenchmarkWeight } from './types';

// Benchmark weights per use case
// Sources:
// - Open LLM Leaderboard: ifeval, mmlu_pro, bbh, math, gpqa, musr
// - EvalPlus: humaneval, mbpp
// - BigCodeBench: bigcodebench
// TODO: Add AlpacaEval from AlpacaEval leaderboard
// TODO: Add MMMU, MMBench from vision leaderboards
const useCaseWeightMap: Record<UseCase, UseCaseWeights> = {
  chat: {
    benchmarks: [
      { key: 'ifeval', weight: 0.40 },      // Instruction following
      { key: 'mmlu_pro', weight: 0.35 },    // Knowledge
      { key: 'bbh', weight: 0.25 },         // Reasoning
    ],
    wQuality: 0.45,
    wSpeed: 0.30,
    wQuant: 0.25,
  },
  coding: {
    benchmarks: [
      { key: 'bigcodebench', weight: 0.30 },// Complex coding tasks
      { key: 'humaneval', weight: 0.25 },   // Code generation (EvalPlus)
      { key: 'math', weight: 0.25 },        // Logical reasoning (proxy for coding)
      { key: 'ifeval', weight: 0.20 },      // Instruction following
    ],
    wQuality: 0.55,
    wSpeed: 0.25,
    wQuant: 0.20,
  },
  reasoning: {
    benchmarks: [
      { key: 'math', weight: 0.30 },        // Mathematical reasoning
      { key: 'gpqa', weight: 0.30 },        // Graduate-level Q&A
      { key: 'bbh', weight: 0.25 },         // Big-Bench Hard
      { key: 'musr', weight: 0.15 },        // Multi-step reasoning
    ],
    wQuality: 0.55,
    wSpeed: 0.20,
    wQuant: 0.25,
  },
  creative: {
    // Proxy benchmarks until AlpacaEval available
    benchmarks: [
      { key: 'ifeval', weight: 0.45 },      // Instruction following (key for creative)
      { key: 'mmlu_pro', weight: 0.30 },    // Knowledge breadth
      { key: 'bbh', weight: 0.25 },         // Reasoning for coherent outputs
    ],
    wQuality: 0.40,
    wSpeed: 0.30,
    wQuant: 0.30,
  },
  vision: {
    // Proxy benchmarks until MMMU/MMBench available
    // Vision models should be filtered by capability, not benchmark
    benchmarks: [
      { key: 'ifeval', weight: 0.40 },      // Instruction following
      { key: 'mmlu_pro', weight: 0.35 },    // Knowledge
      { key: 'bbh', weight: 0.25 },         // Reasoning
    ],
    wQuality: 0.50,
    wSpeed: 0.25,
    wQuant: 0.25,
  },
  roleplay: {
    // Roleplay prioritizes creative instruction-following and knowledge
    benchmarks: [
      { key: 'ifeval', weight: 0.50 },      // Instruction following (key for roleplay)
      { key: 'mmlu_pro', weight: 0.25 },    // Knowledge for character consistency
      { key: 'bbh', weight: 0.25 },         // Reasoning for coherent responses
    ],
    wQuality: 0.35,
    wSpeed: 0.35,                           // Speed matters for interactive RP
    wQuant: 0.30,
  },
  embedding: {
    // Embedding models focus on quality over speed
    benchmarks: [
      { key: 'mmlu_pro', weight: 0.50 },    // Knowledge representation
      { key: 'bbh', weight: 0.30 },         // Reasoning/understanding
      { key: 'ifeval', weight: 0.20 },      // General capability
    ],
    wQuality: 0.70,
    wSpeed: 0.10,                           // Speed less important for embeddings
    wQuant: 0.20,
  },
};

export function getUseCaseWeights(useCase: UseCase): UseCaseWeights {
  return useCaseWeightMap[useCase];
}

function computeBenchmarkScore(
  benchmarks: Benchmarks,
  benchmarkWeights: BenchmarkWeight[]
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const { key, weight } of benchmarkWeights) {
    const value = benchmarks[key];
    if (value !== null && value !== undefined) {
      weightedSum += value * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) return 0;

  // Renormalize: scale by 1/totalWeight so missing benchmarks don't penalize
  return weightedSum / totalWeight;
}

export function computeScore(
  benchmarks: Benchmarks,
  useCase: UseCase,
  quantQuality: number,
  speedScore: number
): number {
  const weights = useCaseWeightMap[useCase];
  const benchScore = computeBenchmarkScore(benchmarks, weights.benchmarks);

  // benchScore is 0-100, quantQuality is 0-1 (map to 0-100), speedScore is 0-100
  const qualityComponent = benchScore * weights.wQuality;
  const speedComponent = speedScore * weights.wSpeed;
  const quantComponent = (quantQuality * 100) * weights.wQuant;

  return Math.round(qualityComponent + speedComponent + quantComponent);
}
