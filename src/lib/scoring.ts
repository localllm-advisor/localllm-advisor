import { Benchmarks, UseCase, UseCaseWeights, BenchmarkWeight } from './types';

// Benchmark weights per use case
// Sources:
// - Open LLM Leaderboard v2: ifeval, mmlu_pro, bbh, math, gpqa, musr
// - EvalPlus: humaneval, mbpp
// - BigCodeBench: bigcodebench
//
// Weight design principles:
// 1. Each use case uses 3-4 benchmarks that best predict real-world quality for that task
// 2. wQuality/wSpeed/wQuant balance trades off "how good" vs "how fast" vs "how lossless"
// 3. For interactive use cases (chat, creative) speed matters more
// 4. For precision tasks (coding, reasoning) quality dominates
// 5. Quant weight rewards higher-fidelity quantizations but never dominates
const useCaseWeightMap: Record<UseCase, UseCaseWeights> = {
  chat: {
    benchmarks: [
      { key: 'ifeval', weight: 0.35 },      // Instruction following — core chat skill
      { key: 'mmlu_pro', weight: 0.30 },    // Knowledge breadth
      { key: 'bbh', weight: 0.20 },         // Reasoning for coherent answers
      { key: 'gpqa', weight: 0.15 },        // Depth on hard questions
    ],
    wQuality: 0.45,
    wSpeed: 0.30,
    wQuant: 0.25,
  },
  coding: {
    benchmarks: [
      { key: 'humaneval', weight: 0.35 },   // Code generation (most direct signal)
      { key: 'bigcodebench', weight: 0.30 },// Complex real-world coding tasks
      { key: 'mbpp', weight: 0.15 },        // Basic programming problems
      { key: 'ifeval', weight: 0.15 },      // Instruction following (prompt adherence)
      { key: 'math', weight: 0.05 },        // Weakly correlated — de-emphasized
    ],
    wQuality: 0.55,
    wSpeed: 0.25,
    wQuant: 0.20,
  },
  reasoning: {
    benchmarks: [
      { key: 'math', weight: 0.25 },        // Mathematical reasoning
      { key: 'gpqa', weight: 0.22 },        // Graduate-level Q&A (hard reasoning)
      { key: 'bbh', weight: 0.22 },         // Big-Bench Hard (diverse reasoning)
      { key: 'musr', weight: 0.16 },        // Multi-step reasoning
      { key: 'ifeval', weight: 0.15 },      // Instruction following — critical for usable reasoning output
    ],
    wQuality: 0.60,
    wSpeed: 0.15,
    wQuant: 0.25,
  },
  creative: {
    benchmarks: [
      { key: 'ifeval', weight: 0.40 },      // Instruction following — key for creative control
      { key: 'mmlu_pro', weight: 0.30 },    // Knowledge breadth for rich content
      { key: 'bbh', weight: 0.30 },         // Reasoning for narrative coherence
    ],
    wQuality: 0.40,
    wSpeed: 0.35,                            // Speed matters for iterative creative work
    wQuant: 0.25,
  },
  vision: {
    // Vision models are filtered by capability tag; benchmarks score text quality
    benchmarks: [
      { key: 'ifeval', weight: 0.35 },      // Instruction following
      { key: 'mmlu_pro', weight: 0.30 },    // Knowledge (image understanding proxy)
      { key: 'bbh', weight: 0.20 },         // Reasoning
      { key: 'gpqa', weight: 0.15 },        // Hard question depth
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
  let sumAllWeights = 0;

  for (const { key, weight } of benchmarkWeights) {
    sumAllWeights += weight;
    const value = benchmarks[key];
    if (value !== null && value !== undefined) {
      weightedSum += value * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) return 0;

  // Renormalize so models aren't penalized linearly for missing benchmarks —
  // but apply a completeness discount to prevent cherry-picked single-benchmark
  // models (e.g. a 4B with only 'math' filled) from outranking fully-benchmarked
  // larger models. sqrt() is a gentle penalty: 100% coverage = 1.0, 50% = 0.71,
  // 25% = 0.5, 10% = 0.32.
  const completeness = sumAllWeights > 0 ? totalWeight / sumAllWeights : 1;
  const completenessFactor = Math.sqrt(completeness);

  return (weightedSum / totalWeight) * completenessFactor;
}

/**
 * Map a use case to a capability tag we look for on the model.
 * Returns null for use cases that every chat-capable model can serve.
 */
function useCaseCapability(useCase: UseCase): string | null {
  switch (useCase) {
    case 'coding':    return 'coding';
    case 'reasoning': return 'reasoning';
    case 'vision':    return 'vision';
    case 'embedding': return 'embedding';
    default:          return null; // chat / creative / roleplay — no gate
  }
}

/**
 * Adjust benchmark score based on declared model capabilities.
 * Models that *explicitly* advertise the requested capability get a small
 * boost; text-only models asked to do vision are penalized heavily; vision
 * models asked to code without a coding tag are mildly penalized.
 */
function capabilityMultiplier(useCase: UseCase, capabilities: string[]): number {
  const needed = useCaseCapability(useCase);
  if (!needed) return 1.0;

  const hasCap = capabilities.includes(needed);
  if (hasCap) return 1.08;

  // Embedding use case is strictly filtered elsewhere, so reaching here means
  // a non-embedding model slipped through — treat as ineligible.
  if (useCase === 'embedding') return 0;

  // Vision use case: hard requirement, handled upstream.
  if (useCase === 'vision') return 0;

  // Coding / reasoning without the explicit capability tag — small penalty.
  // (Benchmarks still drive most of the score, so strong generalists survive.)
  return 0.92;
}

export function computeScore(
  benchmarks: Benchmarks,
  useCase: UseCase,
  quantQuality: number,
  speedScore: number,
  capabilities: string[] = []
): number {
  const weights = useCaseWeightMap[useCase];
  const rawBench = computeBenchmarkScore(benchmarks, weights.benchmarks);
  const benchScore = rawBench * capabilityMultiplier(useCase, capabilities);

  // benchScore is 0-100, quantQuality is 0-1 (map to 0-100), speedScore is 0-100
  const qualityComponent = benchScore * weights.wQuality;
  const speedComponent = speedScore * weights.wSpeed;
  const quantComponent = (quantQuality * 100) * weights.wQuant;

  return Math.round(qualityComponent + speedComponent + quantComponent);
}
