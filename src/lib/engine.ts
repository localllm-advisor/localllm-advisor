import { Model, RecommendationInput, ScoredModel, InferenceMode, AdvancedFilters, ModelSizeRange } from './types';
import { useCaseComputeScore } from './scoring';
import {
  calculateMemoryBreakdown,
  calculateGpuLayers,
  determineInferenceMode,
  calculatePerformanceEstimate,
  speedScore,
  calculateRamBandwidth,
  estimateDecodeTokensPerSecond,
  estimatePrefillTokensPerSecond,
  estimateTimeToFirstToken,
  estimateLoadTime,
  performanceRange,
  getActiveParamsB,
} from './vram';

/**
 * Generate warnings based on configuration
 */
function generateWarnings(
  inferenceMode: InferenceMode,
  vramPercent: number,
  tokensPerSecond: number | null,
  paramsB: number,
  ramOffloadMb: number
): string[] {
  const warnings: string[] = [];

  if (inferenceMode === 'not_possible') {
    warnings.push('Not enough VRAM or RAM to run this model');
    return warnings;
  }

  if (inferenceMode === 'gpu_offload') {
    const offloadGb = (ramOffloadMb / 1024).toFixed(1);
    warnings.push(`Partial offload: ${offloadGb}GB to RAM (slower)`);
  }

  if (inferenceMode === 'cpu_only') {
    if (tokensPerSecond !== null && tokensPerSecond > 0) {
      warnings.push(`CPU-only inference (~${Math.round(tokensPerSecond * 0.7)}–${Math.round(tokensPerSecond * 1.3)} tok/s)`);
    } else {
      warnings.push('CPU-only inference (slower than GPU)');
    }
  }

  if (vramPercent > 95) {
    warnings.push('Very tight VRAM fit - may cause issues');
  } else if (vramPercent > 85) {
    warnings.push('Limited headroom for longer contexts');
  }

  if (tokensPerSecond !== null && tokensPerSecond < 10) {
    warnings.push('Slow generation speed (<10 tok/s)');
  }

  if (paramsB >= 70) {
    warnings.push('Large model - first load may take time');
  }

  return warnings;
}

/**
 * Get size range for a model's parameter count
 */
function getModelSizeRange(paramsB: number): ModelSizeRange {
  if (paramsB <= 7) return 'small';
  if (paramsB <= 13) return 'medium';
  if (paramsB <= 34) return 'large';
  return 'xlarge';
}

/**
 * Check if a quantization level matches the filter
 */
function matchesQuantFilter(quantLevel: string, filters: AdvancedFilters): boolean {
  // Map quant level to filter options
  if (quantLevel.includes('Q4') || quantLevel.includes('q4')) {
    return filters.quantLevels.includes('Q4_K_M');
  }
  if (quantLevel.includes('Q6') || quantLevel.includes('q6')) {
    return filters.quantLevels.includes('Q6_K');
  }
  if (quantLevel.includes('Q8') || quantLevel.includes('q8')) {
    return filters.quantLevels.includes('Q8_0');
  }
  if (quantLevel.includes('FP16') || quantLevel.includes('fp16') || quantLevel.includes('F16')) {
    return filters.quantLevels.includes('FP16');
  }
  // Default: include if any filter is selected
  return filters.quantLevels.length > 0;
}

/**
 * Get coding benchmark score (average of humaneval and bigcodebench)
 */
function getCodingScore(benchmarks: Model['benchmarks']): number | null {
  const scores = [benchmarks.humaneval, benchmarks.bigcodebench].filter(s => s !== null) as number[];
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export function recommend(
  models: Model[],
  input: RecommendationInput,
  filters?: AdvancedFilters
): ScoredModel[] {
  const {
    vram_mb,
    useCase,
    contextLength,
    bandwidth_gbps,
    fp16_tflops,
    tensor_cores,
    ram_gb,
    // CPU specs
    cpu_cores,
    cpu_threads,
    base_clock_ghz,
    boost_clock_ghz,
    l3_cache_mb,
    avx2,
    avx512,
    amx,
    // Multi-GPU
    gpu_count = 1,
    nvlink,
    // PCIe
    pcie_gen,
    pcie_lanes,
    // RAM
    ram_speed_mhz,
    ram_channels,
    // Storage
    storage_type,
    storage_speed_gbps,
    // Mode
    mode = 'auto',
  } = input;

  // Calculate effective VRAM for multi-GPU.
  // Under llama.cpp layer-split or vLLM tensor-parallel, summed VRAM is roughly
  // additive; the non-NVLink penalty reflects inter-GPU fragmentation for
  // shapes that don't divide evenly across cards.
  const nvlinkMultiplier = nvlink ? 0.98 : 0.90;
  const effectiveVram = gpu_count > 1
    ? Math.round(vram_mb * gpu_count * nvlinkMultiplier)
    : vram_mb;

  const hasCpu = (cpu_cores || 0) > 0;

  // Calculate RAM bandwidth from specs
  const ramBandwidthGbps = calculateRamBandwidth(ram_speed_mhz, ram_channels);

  // Build CPU specs object for calculations
  const cpuSpecs = hasCpu ? {
    cores: cpu_cores,
    threads: cpu_threads,
    baseClockGhz: base_clock_ghz,
    boostClockGhz: boost_clock_ghz,
    l3CacheMb: l3_cache_mb,
    avx2,
    avx512,
    amx,
    ramBandwidthGbps,
  } : undefined;

  // Effective GPU bandwidth for multi-GPU inference.
  // Tensor-parallel under NVLink roughly scales bandwidth with GPU count at
  // ~80% efficiency; layer-split without NVLink barely improves decode speed
  // (weights are still read serially per layer chunk) but does reduce the
  // amount each card must hold.
  const effectiveBandwidth = bandwidth_gbps
    ? (gpu_count > 1
        ? bandwidth_gbps * (nvlink ? 1 + (gpu_count - 1) * 0.75 : 1 + (gpu_count - 1) * 0.1)
        : bandwidth_gbps)
    : undefined;

  // Calculate storage speed based on type if not provided
  const effectiveStorageSpeed = storage_speed_gbps ?? (
    storage_type === 'nvme' ? 3.5 :
    storage_type === 'ssd' ? 0.5 :
    storage_type === 'hdd' ? 0.15 :
    3.5 // default to NVMe
  );

  const candidates: Array<{
    model: Model;
    quant: Model['quantizations'][0];
    inferenceMode: InferenceMode;
    gpuLayers: number | 'all';
    memory: ReturnType<typeof calculateMemoryBreakdown>;
    performance: ReturnType<typeof calculatePerformanceEstimate>;
  }> = [];

  // Deduplicate models by id so later Map-based dedup doesn't silently
  // overwrite one variant with another. When duplicates exist, prefer the
  // copy with the most benchmark data (better signal for ranking).
  const countBenchmarks = (m: Model) =>
    Object.values(m.benchmarks || {}).filter((v) => v !== null && v !== undefined).length;
  const dedupedModelsById = new Map<string, Model>();
  for (const m of models) {
    const prev = dedupedModelsById.get(m.id);
    if (!prev || countBenchmarks(m) > countBenchmarks(prev)) {
      dedupedModelsById.set(m.id, m);
    }
  }
  const dedupedModels = Array.from(dedupedModelsById.values());

  // 1. EVALUATE: check all (model, quant) combinations
  for (const model of dedupedModels) {
    const caps = model.capabilities || [];

    // Vision use case: hard requirement on vision capability.
    if (useCase === 'vision' && !caps.includes('vision')) {
      continue;
    }
    // Non-vision use cases: skip vision-*only* models (no 'chat' tag), so
    // image-captioning-only models don't pollute coding/reasoning lists.
    if (useCase !== 'vision' && caps.includes('vision') && !caps.includes('chat') && !caps.includes('coding') && !caps.includes('reasoning')) {
      continue;
    }
    // Embedding use case should only show embedding models.
    if (useCase === 'embedding' && model.family !== 'embedding' && !caps.includes('embedding')) {
      continue;
    }
    // Exclude embedding models from non-embedding use cases — they don't do
    // generative chat/coding/reasoning.
    if (useCase !== 'embedding' && (model.family === 'embedding' || (caps.length === 1 && caps[0] === 'embedding'))) {
      continue;
    }

    // Apply advanced filters if provided
    if (filters) {
      // Filter by model size
      const sizeRange = getModelSizeRange(model.params_b);
      if (!filters.sizeRanges.includes(sizeRange)) {
        continue;
      }

      // Filter by benchmark minimums
      if (filters.minMmlu !== null && (model.benchmarks.mmlu_pro === null || model.benchmarks.mmlu_pro < filters.minMmlu)) {
        continue;
      }
      if (filters.minMath !== null && (model.benchmarks.math === null || model.benchmarks.math < filters.minMath)) {
        continue;
      }
      if (filters.minCoding !== null) {
        const codingScore = getCodingScore(model.benchmarks);
        if (codingScore === null || codingScore < filters.minCoding) {
          continue;
        }
      }

      // Filter by model family
      if (filters.families && filters.families.length > 0) {
        if (!filters.families.includes(model.family as typeof filters.families[number])) {
          continue;
        }
      }

      // Filter by architecture
      if (filters.architectures && filters.architectures.length > 0) {
        if (!filters.architectures.includes(model.architecture)) {
          continue;
        }
      }
    }

    for (const quant of model.quantizations) {
      // Filter by quantization level
      if (filters && !matchesQuantFilter(quant.level, filters)) {
        continue;
      }

      // Determine inference mode
      let inferenceMode: InferenceMode;

      if (mode === 'cpu_only') {
        // Force CPU-only mode - check if model fits in RAM
        const modelSizeGb = quant.vram_mb / 1024; // Approximate RAM needed
        const ramNeeded = modelSizeGb + 4; // 4GB overhead
        if ((ram_gb || 16) >= ramNeeded) {
          inferenceMode = 'cpu_only';
        } else {
          continue; // Skip if model doesn't fit in RAM
        }
      } else {
        // Normal mode detection
        inferenceMode = determineInferenceMode(
          quant.vram_mb,
          model.params_b,
          contextLength,
          effectiveVram,
          ram_gb,
          hasCpu
        );

        // Skip if not possible and not forcing a mode
        if (inferenceMode === 'not_possible' && mode === 'auto') {
          continue;
        }

        // Apply mode filter
        if (mode === 'gpu_only' && inferenceMode !== 'gpu_full') {
          continue;
        }
      }

      // Apply show/hide filters
      if (filters) {
        if (!filters.showCpuOnly && inferenceMode === 'cpu_only') {
          continue;
        }
        if (!filters.showOffload && inferenceMode === 'gpu_offload') {
          continue;
        }
        if (filters.showOnlyFitsVram && inferenceMode !== 'gpu_full') {
          continue;
        }
      }

      const gpuLayers = calculateGpuLayers(
        quant.vram_mb,
        model.params_b,
        contextLength,
        effectiveVram
      );

      const memory = calculateMemoryBreakdown(
        quant.vram_mb,
        model.params_b,
        contextLength,
        effectiveVram,
        ram_gb
      );

      // Calculate performance with all specs
      // For MoE models, use active params for decode speed estimation
      // (only active expert weights are read from memory per token)
      const activeParamsB = getActiveParamsB(model);
      const tokensPerSecond = estimateDecodeTokensPerSecond(
        model.params_b,
        quant.bpw,
        effectiveBandwidth,
        inferenceMode,
        gpuLayers,
        pcie_gen,
        pcie_lanes,
        cpuSpecs,
        activeParamsB
      );

      // Apply minimum speed filter
      if (filters && filters.minSpeed !== null) {
        if (tokensPerSecond === null || tokensPerSecond < filters.minSpeed) {
          continue;
        }
      }

      // Prefill is compute-bound; for MoE, compute is proportional to active params
      const prefillTokensPerSecond = estimatePrefillTokensPerSecond(
        activeParamsB,
        fp16_tflops ? fp16_tflops * (gpu_count > 1 ? gpu_count * (nvlink ? 0.9 : 0.7) : 1) : undefined,
        tensor_cores
      );

      const timeToFirstToken = estimateTimeToFirstToken(prefillTokensPerSecond);
      const loadTimeSeconds = estimateLoadTime(quant.vram_mb, effectiveStorageSpeed);

      const performance = {
        tokensPerSecond,
        prefillTokensPerSecond,
        timeToFirstToken,
        loadTimeSeconds,
        tokensPerSecondRange: performanceRange(tokensPerSecond, inferenceMode),
        prefillRange: performanceRange(prefillTokensPerSecond, inferenceMode),
        ttftRange: performanceRange(timeToFirstToken, inferenceMode),
      };

      candidates.push({
        model,
        quant,
        inferenceMode,
        gpuLayers,
        memory,
        performance,
      });
    }
  }

  // 2. BEST QUANT: for each model, keep best runnable quant
  const bestPerModel = new Map<string, typeof candidates[0]>();

  for (const candidate of candidates) {
    const existing = bestPerModel.get(candidate.model.id);

    if (!existing) {
      bestPerModel.set(candidate.model.id, candidate);
      continue;
    }

    // Prefer: gpu_full > gpu_offload > cpu_only
    const modeOrder: Record<InferenceMode, number> = {
      gpu_full: 3,
      gpu_offload: 2,
      cpu_only: 1,
      not_possible: 0,
    };

    const existingModeScore = modeOrder[existing.inferenceMode];
    const candidateModeScore = modeOrder[candidate.inferenceMode];

    // If same mode, prefer higher quality quant
    if (candidateModeScore > existingModeScore) {
      bestPerModel.set(candidate.model.id, candidate);
    } else if (
      candidateModeScore === existingModeScore &&
      candidate.quant.quality > existing.quant.quality
    ) {
      bestPerModel.set(candidate.model.id, candidate);
    }
  }

  // 3. SCORE: compute weighted score
  const scored: ScoredModel[] = Array.from(bestPerModel.values()).map(
    (candidate) => {
      const { model, quant, inferenceMode, gpuLayers, memory, performance } =
        candidate;

      const spdScore = speedScore(performance.tokensPerSecond);
      const score = useCaseComputeScore(
        model.benchmarks,
        useCase,
        quant.quality,
        spdScore,
        model.capabilities || []
      );

      const warnings = generateWarnings(
        inferenceMode,
        memory.vramPercent,
        performance.tokensPerSecond,
        model.params_b,
        memory.ramOffload
      );

      return {
        model,
        quant,
        score,
        inferenceMode,
        gpuLayers,
        memory,
        performance,
        warnings,
      };
    }
  );

  // 4. RANK: sort based on filter preference
  const sortBy = filters?.sortBy || 'score';
  scored.sort((a, b) => {
    // Prioritize runnable models
    if (a.inferenceMode === 'not_possible' && b.inferenceMode !== 'not_possible') {
      return 1;
    }
    if (b.inferenceMode === 'not_possible' && a.inferenceMode !== 'not_possible') {
      return -1;
    }

    // Sort by selected criteria
    switch (sortBy) {
      case 'speed':
        // Higher speed first
        const aSpeed = a.performance.tokensPerSecond ?? 0;
        const bSpeed = b.performance.tokensPerSecond ?? 0;
        return bSpeed - aSpeed;

      case 'quality':
        // Higher benchmark scores first (use MMLU-PRO as proxy)
        const aQuality = a.model.benchmarks.mmlu_pro ?? 0;
        const bQuality = b.model.benchmarks.mmlu_pro ?? 0;
        return bQuality - aQuality;

      case 'vram':
        // Lower VRAM first
        return a.memory.totalVram - b.memory.totalVram;

      case 'params':
        // Smaller models first
        return a.model.params_b - b.model.params_b;

      case 'score':
      default:
        // Higher score first
        return b.score - a.score;
    }
  });

  // 5. LIMIT: top 10
  return scored.slice(0, 10);
}

/**
 * Legacy recommend function for backwards compatibility
 * Returns simplified ScoredModel format
 */
export function recommendLegacy(
  models: Model[],
  input: {
    vram_mb: number;
    useCase: RecommendationInput['useCase'];
    contextLength: number;
    bandwidth_gbps?: number;
  }
): Array<{
  model: Model;
  quant: Model['quantizations'][0];
  score: number;
  vramPercent: number;
  tokensPerSecond: number | null;
}> {
  const results = recommend(models, input);

  return results.map((r) => ({
    model: r.model,
    quant: r.quant,
    score: r.score,
    vramPercent: r.memory.vramPercent,
    tokensPerSecond: r.performance.tokensPerSecond,
  }));
}
