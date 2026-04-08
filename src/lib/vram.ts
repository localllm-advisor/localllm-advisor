import { InferenceMode, MemoryBreakdown, PerformanceEstimate, PerformanceRange } from './types';

/**
 * Get the effective parameter count for performance calculations.
 *
 * MoE (Mixture-of-Experts) models load ALL parameters into VRAM but only
 * activate a fraction per token (e.g. DeepSeek R1 has 671B total but ~37B
 * active per token). Decode speed is proportional to the data read per token,
 * which for MoE is the active expert weights — NOT the total model weights.
 *
 * For dense models, active params === total params.
 *
 * If the model doesn't have active_params_b set but is marked as MoE,
 * we estimate active params as ~20% of total (typical for modern MoE models).
 */
export function getActiveParamsB(model: { params_b: number; architecture?: string; active_params_b?: number }): number {
  if (model.active_params_b) return model.active_params_b;
  if (model.architecture === 'moe') {
    // Typical MoE models activate ~20% of total params per token
    // (e.g., Mixtral 8x7B: 47B total, ~13B active ≈ 28%)
    // (e.g., DeepSeek V3: 685B total, ~37B active ≈ 5.4%)
    // Use 20% as a conservative middle ground
    return model.params_b * 0.20;
  }
  return model.params_b;
}

/**
 * Estimate model size in MB at a given bits-per-weight
 */
export function estimateModelSizeMb(paramsB: number, bpw: number): number {
  return Math.round(paramsB * bpw / 8 * 1024);
}

/**
 * Estimate KV cache VRAM in MB for a given context length.
 *
 * KV cache stores key/value tensors for every layer at every token position.
 * Formula: 2 (K+V) × n_layers × n_kv_heads × head_dim × bytes_per_element × n_tokens
 *
 * Since we don't have per-model architecture details, we use empirical scaling:
 *
 *   Modern GQA models (Llama 3, Qwen 2, Mistral, etc.):
 *     ~0.125 MB/token for 7B → ~125 MB per 1K tokens
 *     Scales roughly as sqrt(params_b / 7) due to wider layers in larger models
 *     but GQA keeps KV heads constant (typically 8), so scaling is sub-linear.
 *
 *   Older MHA models (Llama 1, GPT-J, etc.):
 *     ~0.5 MB/token for 7B → ~500 MB per 1K tokens
 *
 * We use GQA estimates since nearly all modern models use GQA/MQA.
 * The pre-computed vram_mb in model data already includes baseline KV cache
 * overhead for a short context window (~2-4K tokens), so we only charge for
 * additional context beyond baseContext.
 *
 * With quantized KV cache (Q8_0 or Q4_0, common in llama.cpp), actual usage
 * can be 2-4x lower. We use FP16 estimates as the conservative default.
 */
export function estimateKvCacheMb(
  paramsB: number,
  contextLength: number,
  baseContext: number = 4096
): number {
  if (contextLength <= baseContext) return 0;

  // ~125 MB per 1K context tokens for a 7B GQA model at FP16
  // Scales sub-linearly with model size due to GQA keeping n_kv_heads small
  const mbPer1kCtx = 125 * Math.sqrt(paramsB / 7);
  const extraCtxK = (contextLength - baseContext) / 1024;

  return Math.round(mbPer1kCtx * extraCtxK);
}

/**
 * Calculate memory breakdown for running a model
 */
export function calculateMemoryBreakdown(
  modelVramMb: number,
  paramsB: number,
  contextLength: number,
  availableVramMb: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  availableRamGb?: number
): MemoryBreakdown {
  const kvCache = estimateKvCacheMb(paramsB, contextLength);
  const totalNeeded = modelVramMb + kvCache;

  // Calculate how much fits in VRAM
  const maxVram = availableVramMb * 0.9; // 10% headroom

  let modelInVram = modelVramMb;
  let ramOffload = 0;

  if (totalNeeded > maxVram) {
    // Need to offload some layers to RAM
    const excess = totalNeeded - maxVram;
    ramOffload = Math.min(excess, modelVramMb); // Can't offload more than model size
    modelInVram = Math.max(0, modelVramMb - ramOffload);
  }

  const totalVram = modelInVram + kvCache;
  const vramPercent = Math.round((totalVram / availableVramMb) * 100);

  // RAM usage: offloaded layers + system overhead
  const ramOverhead = 500; // MB for runtime overhead
  const totalRamUsed = ramOffload + ramOverhead;

  return {
    modelVram: modelInVram,
    kvCacheVram: kvCache,
    totalVram,
    vramPercent: Math.min(vramPercent, 100),
    ramOffload,
    totalRamUsed,
  };
}

/**
 * Determine best inference mode based on hardware
 */
export function determineInferenceMode(
  modelVramMb: number,
  paramsB: number,
  contextLength: number,
  availableVramMb: number,
  availableRamGb?: number,
  hasCpu?: boolean
): InferenceMode {
  const kvCache = estimateKvCacheMb(paramsB, contextLength);
  const totalNeeded = modelVramMb + kvCache;
  const maxVram = availableVramMb * 0.9;

  // Full GPU - model fits entirely in VRAM
  if (totalNeeded <= maxVram) {
    return 'gpu_full';
  }

  // GPU offload - model partially fits, rest in RAM
  const availableRamMb = (availableRamGb || 0) * 1024;
  const excess = totalNeeded - maxVram;

  if (availableRamMb >= excess + 2048) { // Need 2GB headroom in RAM
    return 'gpu_offload';
  }

  // CPU only - check if we have enough RAM for the whole model
  const modelSizeMb = estimateModelSizeMb(paramsB, 4.5); // Assume Q4 for CPU
  if (hasCpu && availableRamMb >= modelSizeMb + kvCache + 4096) {
    return 'cpu_only';
  }

  return 'not_possible';
}

/**
 * Calculate number of GPU layers for offload mode
 * Returns 'all' if full GPU, or number of layers
 */
export function calculateGpuLayers(
  modelVramMb: number,
  paramsB: number,
  contextLength: number,
  availableVramMb: number
): number | 'all' {
  const kvCache = estimateKvCacheMb(paramsB, contextLength);
  const totalNeeded = modelVramMb + kvCache;
  const maxVram = availableVramMb * 0.9;

  if (totalNeeded <= maxVram) {
    return 'all';
  }

  // Estimate layers (typical LLM has ~32 layers per 7B params)
  const estimatedLayers = Math.round(32 * (paramsB / 7));
  const vramPerLayer = modelVramMb / estimatedLayers;

  // How many layers fit in remaining VRAM after KV cache
  const vramForLayers = maxVram - kvCache;
  const gpuLayers = Math.max(0, Math.floor(vramForLayers / vramPerLayer));

  return Math.min(gpuLayers, estimatedLayers);
}

/**
 * Calculate PCIe bandwidth in GB/s based on generation and lanes
 */
export function calculatePcieBandwidth(pcieGen?: number, pcieLanes?: number): number {
  if (!pcieGen || !pcieLanes) return 16; // Conservative default (~PCIe 3.0 x16 effective)

  // Theoretical bandwidth per lane per direction (GB/s)
  const bandwidthPerLane: Record<number, number> = {
    3: 0.985,  // PCIe 3.0: ~1 GB/s per lane
    4: 1.969,  // PCIe 4.0: ~2 GB/s per lane
    5: 3.938,  // PCIe 5.0: ~4 GB/s per lane
  };

  const perLane = bandwidthPerLane[pcieGen] || 1.969;
  // Effective bandwidth ~80% of theoretical due to encoding overhead
  return perLane * pcieLanes * 0.8;
}

/**
 * Calculate RAM bandwidth in GB/s based on speed and channels.
 *
 * Theoretical bandwidth = transferRate(MT/s) × 8 bytes × channels.
 * Real-world LLM inference achieves ~70-80% of theoretical due to:
 *   - Memory controller overhead and refresh cycles
 *   - Cache line alignment and partial reads
 *   - NUMA effects on multi-socket systems
 *   - Contention with OS and other processes
 *
 * We apply a 75% utilization factor for realistic estimates.
 */
export function calculateRamBandwidth(ramSpeedMhz?: number, ramChannels?: number): number {
  if (!ramSpeedMhz) return 38; // Default: DDR4-3200 dual-channel ~51 GB/s theoretical × 0.75 ≈ 38 GB/s

  const channels = ramChannels || 2;
  const theoreticalGbps = (ramSpeedMhz * 8 * channels) / 1000;
  // Apply 75% utilization factor for real-world LLM inference workloads
  return theoreticalGbps * 0.75;
}

/**
 * Estimate CPU inference speed based on specs
 */
export function estimateCpuTokensPerSecond(
  paramsB: number,
  cpuCores?: number,
  cpuThreads?: number,
  baseClockGhz?: number,
  boostClockGhz?: number,
  l3CacheMb?: number,
  avx2?: boolean,
  avx512?: boolean,
  amx?: boolean,
  ramBandwidthGbps?: number
): number {
  // Base: very rough estimate, CPU inference is RAM bandwidth bound
  const ramBw = ramBandwidthGbps || 50; // GB/s
  const modelSizeGb = (paramsB * 4.5) / 8; // Assume Q4 quantization

  // Base tok/s from RAM bandwidth
  let toksPerSec = ramBw / modelSizeGb;

  // CPU multipliers
  const threads = cpuThreads || cpuCores || 4;
  const clockGhz = boostClockGhz || baseClockGhz || 3.0;

  // Thread scaling (diminishing returns after 8 threads for inference)
  const threadMultiplier = Math.min(1 + Math.log2(threads / 4) * 0.3, 2.0);

  // Clock scaling
  const clockMultiplier = clockGhz / 3.5;

  // Instruction set multipliers
  let simdMultiplier = 1.0;
  if (amx) {
    simdMultiplier = 3.0; // AMX provides significant speedup for matrix ops
  } else if (avx512) {
    simdMultiplier = 2.0; // AVX-512 doubles throughput vs AVX2
  } else if (avx2) {
    simdMultiplier = 1.5; // AVX2 provides good speedup
  }

  // Cache bonus (larger L3 helps with KV cache)
  const cacheMultiplier = l3CacheMb ? Math.min(1 + (l3CacheMb - 16) / 64, 1.5) : 1.0;

  toksPerSec = toksPerSec * threadMultiplier * clockMultiplier * simdMultiplier * cacheMultiplier;

  // CPU is still much slower than GPU — cap at reasonable maximum
  // Modern DDR5 + AVX-512/AMX systems can reach 50-60 tok/s on small models
  return Math.min(Math.max(Math.round(toksPerSec), 1), 60);
}

/**
 * Estimate tokens per second for decode (autoregressive generation)
 * Based on memory bandwidth (memory-bound regime)
 *
 * For MoE models, pass activeParamsB to account for the fact that only
 * a fraction of weights are read per token. The full model must still
 * fit in VRAM, but decode speed is determined by active expert weights.
 */
export function estimateDecodeTokensPerSecond(
  paramsB: number,
  bpw: number,
  bandwidthGbps?: number,
  inferenceMode: InferenceMode = 'gpu_full',
  gpuLayers: number | 'all' = 'all',
  pcieGen?: number,
  pcieLanes?: number,
  cpuSpecs?: {
    cores?: number;
    threads?: number;
    baseClockGhz?: number;
    boostClockGhz?: number;
    l3CacheMb?: number;
    avx2?: boolean;
    avx512?: boolean;
    amx?: boolean;
    ramBandwidthGbps?: number;
  },
  activeParamsB?: number
): number | null {
  // For MoE models, use active params for performance estimation
  // (only a fraction of experts are read from memory per token)
  const effectiveParamsB = activeParamsB ?? paramsB;

  if (inferenceMode === 'cpu_only') {
    // Use CPU-specific estimation with effective (active) params
    return estimateCpuTokensPerSecond(
      effectiveParamsB,
      cpuSpecs?.cores,
      cpuSpecs?.threads,
      cpuSpecs?.baseClockGhz,
      cpuSpecs?.boostClockGhz,
      cpuSpecs?.l3CacheMb,
      cpuSpecs?.avx2,
      cpuSpecs?.avx512,
      cpuSpecs?.amx,
      cpuSpecs?.ramBandwidthGbps
    );
  }

  if (!bandwidthGbps || bandwidthGbps <= 0) return null;

  // For decode, the bottleneck is reading the active weights from memory.
  // MoE models only read active expert weights per token, not the full model.
  const activeSizeGb = (effectiveParamsB * bpw) / 8;
  if (activeSizeGb <= 0) return null;

  // Base: tok/s = bandwidth / active_model_size (memory-bandwidth-bound regime)
  let toksPerSec = bandwidthGbps / activeSizeGb;

  // Offload model: bottleneck-aware serial pipeline
  // In offload mode, each token is generated sequentially through ALL layers.
  // GPU layers read weights from VRAM, CPU layers read weights from RAM.
  // Total time per token = gpu_time + cpu_time + sync_overhead, NOT a weighted average.
  //
  // Key insight: PCIe is NOT the bottleneck for weight reads — CPU layers read
  // from system RAM directly. PCIe only carries the small activation vectors
  // (~8KB for 7B) between GPU and CPU layer groups, which is latency-dominated.
  //
  // For MoE: we still use active params here since each layer only reads the
  // active expert weights, regardless of whether the layer runs on GPU or CPU.
  if (inferenceMode === 'gpu_offload' && gpuLayers !== 'all') {
    const estimatedLayers = Math.round(32 * (paramsB / 7));
    const gpuFraction = (gpuLayers as number) / estimatedLayers;
    const cpuFraction = 1 - gpuFraction;

    // GPU part: processed at full GPU memory bandwidth
    const gpuPartGb = activeSizeGb * gpuFraction;
    const gpuTimePerToken = gpuPartGb / bandwidthGbps; // seconds

    // CPU part: bottlenecked by RAM bandwidth (weights are in system RAM)
    const ramBw = cpuSpecs?.ramBandwidthGbps || 50;
    const cpuPartGb = activeSizeGb * cpuFraction;
    const cpuTimePerToken = cpuPartGb / ramBw; // seconds

    // PCIe synchronization overhead: activation vector transfers between
    // GPU and CPU layer groups. Small data (~8-32KB) but adds latency.
    // ~0.1ms per boundary crossing, 2 crossings per token (GPU→CPU→GPU)
    const pcieBw = calculatePcieBandwidth(pcieGen, pcieLanes);
    const pcieLatencyMs = pcieBw > 20 ? 0.08 : 0.12; // faster PCIe = lower latency
    const syncOverheadSec = (pcieLatencyMs * 2) / 1000;

    const totalTimePerToken = gpuTimePerToken + cpuTimePerToken + syncOverheadSec;
    toksPerSec = 1 / totalTimePerToken;
  }

  return Math.round(toksPerSec);
}

/**
 * Estimate prefill speed (prompt processing) in tokens per second
 * Based on compute (TFLOPS) rather than bandwidth
 */
export function estimatePrefillTokensPerSecond(
  paramsB: number,
  fp16Tflops?: number,
  tensorCores?: number
): number | null {
  if (!fp16Tflops) return null;

  // Rough estimate: prefill is compute-bound
  // ~2 FLOPs per parameter per token for forward pass
  const flopsPerToken = paramsB * 2 * 1e9; // in FLOPs
  const tflopsAvailable = fp16Tflops * 1e12; // convert to FLOPs

  // Utilization factor (tensor cores are more efficient)
  const utilization = tensorCores ? 0.6 : 0.3;

  const tokensPerSec = (tflopsAvailable * utilization) / flopsPerToken;

  return Math.round(tokensPerSec);
}

/**
 * Estimate time to first token (latency) in milliseconds
 * Based on prefill speed for a typical prompt
 */
export function estimateTimeToFirstToken(
  prefillToksPerSec: number | null,
  promptTokens: number = 100
): number | null {
  if (!prefillToksPerSec || prefillToksPerSec <= 0) return null;

  const seconds = promptTokens / prefillToksPerSec;
  return Math.round(seconds * 1000);
}

/**
 * Estimate model loading time in seconds
 * Based on storage speed and model size
 */
export function estimateLoadTime(
  modelVramMb: number,
  storageSpeedGbps?: number
): number | null {
  if (!storageSpeedGbps) {
    // Default assumptions: NVMe ~3.5 GB/s, SSD ~0.5 GB/s
    storageSpeedGbps = 3.5;
  }

  const modelSizeGb = modelVramMb / 1024;
  const loadTimeSec = modelSizeGb / storageSpeedGbps;

  return Math.round(loadTimeSec);
}

/**
 * Build an uncertainty range around a point estimate.
 *
 * Uncertainty varies by inference mode:
 *  - gpu_full:    ±15%  (well-understood, bandwidth-limited regime)
 *  - gpu_offload: ±25%  (PCIe sync, driver variation, layer-split effects)
 *  - cpu_only:    ±30%  (highly variable across runtimes, SIMD paths, NUMA)
 */
export function performanceRange(
  estimate: number | null,
  mode: InferenceMode = 'gpu_full'
): PerformanceRange | null {
  if (estimate === null || estimate <= 0) return null;

  const band =
    mode === 'gpu_full'    ? 0.15 :
    mode === 'gpu_offload' ? 0.25 :
    mode === 'cpu_only'    ? 0.30 : 0.20;

  return {
    low:  Math.max(1, Math.round(estimate * (1 - band))),
    estimate: Math.round(estimate),
    high: Math.round(estimate * (1 + band)),
  };
}

/**
 * Build an inverted range for latency metrics (lower = better).
 * When the point estimate is X ms, the range is [X * (1-band), X * (1+band)].
 */
function latencyRange(
  estimate: number | null,
  mode: InferenceMode = 'gpu_full'
): PerformanceRange | null {
  if (estimate === null || estimate <= 0) return null;

  const band =
    mode === 'gpu_full'    ? 0.15 :
    mode === 'gpu_offload' ? 0.25 :
    mode === 'cpu_only'    ? 0.30 : 0.20;

  return {
    low:  Math.max(1, Math.round(estimate * (1 - band))),
    estimate: Math.round(estimate),
    high: Math.round(estimate * (1 + band)),
  };
}

/**
 * Calculate full performance estimate with uncertainty ranges
 */
export function calculatePerformanceEstimate(
  paramsB: number,
  bpw: number,
  bandwidthGbps?: number,
  fp16Tflops?: number,
  tensorCores?: number,
  modelVramMb?: number,
  storageSpeedGbps?: number,
  inferenceMode: InferenceMode = 'gpu_full',
  gpuLayers: number | 'all' = 'all',
  activeParamsB?: number
): PerformanceEstimate {
  const tokensPerSecond = estimateDecodeTokensPerSecond(
    paramsB, bpw, bandwidthGbps, inferenceMode, gpuLayers,
    undefined, undefined, undefined, activeParamsB
  );

  // Prefill is compute-bound; for MoE use active params
  const prefillTokensPerSecond = estimatePrefillTokensPerSecond(
    activeParamsB ?? paramsB, fp16Tflops, tensorCores
  );

  const timeToFirstToken = estimateTimeToFirstToken(prefillTokensPerSecond);

  const loadTimeSeconds = modelVramMb
    ? estimateLoadTime(modelVramMb, storageSpeedGbps)
    : null;

  return {
    tokensPerSecond,
    prefillTokensPerSecond,
    timeToFirstToken,
    loadTimeSeconds,
    tokensPerSecondRange: performanceRange(tokensPerSecond, inferenceMode),
    prefillRange: performanceRange(prefillTokensPerSecond, inferenceMode),
    ttftRange: latencyRange(timeToFirstToken, inferenceMode),
  };
}

/**
 * Compute speed score (0-100) from estimated tok/s.
 * 60+ tok/s = 100 (great), 1 tok/s = ~5 (unusable), log scale in between
 */
export function speedScore(tokensPerSecond: number | null): number {
  if (tokensPerSecond === null) return 50;

  if (tokensPerSecond >= 60) return 100;
  if (tokensPerSecond <= 1) return 5;

  const logMin = Math.log(1);
  const logMax = Math.log(60);
  const logVal = Math.log(tokensPerSecond);

  return Math.round(5 + (95 * (logVal - logMin)) / (logMax - logMin));
}

/**
 * Get VRAM bar color category.
 */
export function getVramColor(percent: number): 'green' | 'yellow' | 'red' {
  if (percent < 75) return 'green';
  if (percent <= 90) return 'yellow';
  return 'red';
}

// Legacy exports for backwards compatibility
export function estimateTotalVram(
  baseVramMb: number,
  paramsB: number,
  contextLength: number
): number {
  return baseVramMb + estimateKvCacheMb(paramsB, contextLength, 4096);
}

export function estimateTokensPerSecond(
  paramsB: number,
  bpw: number,
  bandwidthGbps: number | undefined
): number | null {
  return estimateDecodeTokensPerSecond(paramsB, bpw, bandwidthGbps);
}
