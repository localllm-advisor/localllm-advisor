import { Benchmarks, UseCase, UseCaseWeights, BenchmarkWeight } from './types';

const useCaseWeightMap: Record<UseCase, UseCaseWeights> = {
  chat: {
    benchmarks: [
      { key: 'ifeval', weight: 0.35 },
      { key: 'mmlu_pro', weight: 0.35 },
      { key: 'bbh', weight: 0.30 },
    ],
    wQuality: 0.45,
    wSpeed: 0.30,
    wQuant: 0.25,
  },
  coding: {
    benchmarks: [
      { key: 'humaneval', weight: 0.30 },
      { key: 'mbpp', weight: 0.25 },
      { key: 'bigcodebench', weight: 0.25 },
      { key: 'ifeval', weight: 0.20 },
    ],
    wQuality: 0.55,
    wSpeed: 0.25,
    wQuant: 0.20,
  },
  reasoning: {
    benchmarks: [
      { key: 'math', weight: 0.30 },
      { key: 'gpqa', weight: 0.30 },
      { key: 'bbh', weight: 0.25 },
      { key: 'musr', weight: 0.15 },
    ],
    wQuality: 0.55,
    wSpeed: 0.20,
    wQuant: 0.25,
  },
  creative: {
    benchmarks: [
      { key: 'ifeval', weight: 0.40 },
      { key: 'alpacaeval', weight: 0.35 },
      { key: 'mmlu_pro', weight: 0.25 },
    ],
    wQuality: 0.40,
    wSpeed: 0.30,
    wQuant: 0.30,
  },
  vision: {
    benchmarks: [
      { key: 'mmmu', weight: 0.40 },
      { key: 'mmbench', weight: 0.35 },
      { key: 'ifeval', weight: 0.25 },
    ],
    wQuality: 0.50,
    wSpeed: 0.25,
    wQuant: 0.25,
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
