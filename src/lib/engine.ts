import { Model, RecommendationInput, ScoredModel, InferenceMode } from './types';
import { computeScore } from './scoring';
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
      warnings.push(`CPU-only inference (~${tokensPerSecond} tok/s)`);
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

export function recommend(
  models: Model[],
  input: RecommendationInput
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

  // Calculate effective VRAM for multi-GPU
  // NVLink allows near-linear scaling, without it there's overhead
  const nvlinkMultiplier = nvlink ? 0.95 : 0.85;
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

  // Calculate effective GPU bandwidth for multi-GPU
  // NVLink provides much higher inter-GPU bandwidth
  const effectiveBandwidth = bandwidth_gbps
    ? (gpu_count > 1
        ? bandwidth_gbps * (nvlink ? gpu_count * 0.9 : 1 + (gpu_count - 1) * 0.3)
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

  // 1. EVALUATE: check all (model, quant) combinations
  for (const model of models) {
    // Filter by capability
    if (useCase === 'vision' && !model.capabilities.includes('vision')) {
      continue;
    }

    for (const quant of model.quantizations) {
      // Determine how we can run this model
      const inferenceMode = determineInferenceMode(
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
      if (mode === 'cpu_only' && inferenceMode !== 'cpu_only') {
        continue;
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
      const tokensPerSecond = estimateDecodeTokensPerSecond(
        model.params_b,
        quant.bpw,
        effectiveBandwidth,
        inferenceMode,
        gpuLayers,
        pcie_gen,
        pcie_lanes,
        cpuSpecs
      );

      const prefillTokensPerSecond = estimatePrefillTokensPerSecond(
        model.params_b,
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
      const score = computeScore(
        model.benchmarks,
        useCase,
        quant.quality,
        spdScore
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

  // 4. RANK: sort by score descending
  scored.sort((a, b) => {
    // Prioritize runnable models
    if (a.inferenceMode === 'not_possible' && b.inferenceMode !== 'not_possible') {
      return 1;
    }
    if (b.inferenceMode === 'not_possible' && a.inferenceMode !== 'not_possible') {
      return -1;
    }
    return b.score - a.score;
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
