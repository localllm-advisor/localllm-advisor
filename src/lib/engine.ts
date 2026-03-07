import { Model, RecommendationInput, ScoredModel } from './types';
import { computeScore } from './scoring';
import { estimateTotalVram, estimateTokensPerSecond, speedScore } from './vram';

export function recommend(
  models: Model[],
  input: RecommendationInput
): ScoredModel[] {
  const { vram_mb, useCase, contextLength, bandwidth_gbps } = input;
  const maxVram = vram_mb * 0.9; // 10% headroom

  // 1. FILTER: find compatible (model, quant) pairs
  const candidates = models.flatMap((model) => {
    // For vision use case, model must have 'vision' capability
    if (useCase === 'vision' && !model.capabilities.includes('vision')) {
      return [];
    }

    return model.quantizations
      .map((quant) => {
        const totalVram = estimateTotalVram(
          quant.vram_mb,
          model.params_b,
          contextLength
        );
        return { model, quant, totalVram };
      })
      .filter(({ totalVram }) => totalVram <= maxVram);
  });

  // 2. BEST QUANT: keep only the highest quality quant per model
  const bestPerModel = new Map<
    string,
    { model: Model; quant: (typeof candidates)[0]['quant']; totalVram: number }
  >();

  for (const candidate of candidates) {
    const existing = bestPerModel.get(candidate.model.id);
    if (!existing || candidate.quant.quality > existing.quant.quality) {
      bestPerModel.set(candidate.model.id, candidate);
    }
  }

  // 3. SCORE: compute weighted score based on use case
  const scored: ScoredModel[] = Array.from(bestPerModel.values()).map(
    ({ model, quant, totalVram }) => {
      const tokPerSec = estimateTokensPerSecond(
        model.params_b,
        quant.bpw,
        bandwidth_gbps
      );
      const spdScore = speedScore(tokPerSec);
      const score = computeScore(
        model.benchmarks,
        useCase,
        quant.quality,
        spdScore
      );
      const vramPercent = Math.round((totalVram / vram_mb) * 100);

      return {
        model,
        quant,
        score,
        vramPercent,
        tokensPerSecond: tokPerSec,
      };
    }
  );

  // 4. RANK: sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // 5. LIMIT: top 10
  return scored.slice(0, 10);
}
