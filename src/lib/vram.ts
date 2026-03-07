import { InferenceMode, MemoryBreakdown, PerformanceEstimate } from './types';

/**
 * Estimate model size in MB at a given bits-per-weight
 */
export function estimateModelSizeMb(paramsB: number, bpw: number): number {
  return Math.round(paramsB * bpw / 8 * 1024);
}

/**
 * Estimate KV cache VRAM in MB for a given context length.
 * Formula approximation: ~0.5 MB per 1K context for 7B model, scales with sqrt(params)
 */
export function estimateKvCacheMb(
  paramsB: number,
  contextLength: number,
  baseContext: number = 4096
): number {
  if (contextLength <= baseContext) return 0;

  const mbPer1kCtx = 0.5 * Math.sqrt(paramsB / 7);
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
 * Estimate tokens per second for decode (autoregressive generation)
 * Based on memory bandwidth (memory-bound regime)
 */
export function estimateDecodeTokensPerSecond(
  paramsB: number,
  bpw: number,
  bandwidthGbps?: number,
  inferenceMode: InferenceMode = 'gpu_full',
  gpuLayers: number | 'all' = 'all'
): number | null {
  if (!bandwidthGbps || bandwidthGbps <= 0) return null;

  const modelSizeGb = (paramsB * bpw) / 8;
  if (modelSizeGb <= 0) return null;

  // Base: tok/s = bandwidth / model_size
  let toksPerSec = bandwidthGbps / modelSizeGb;

  // Apply penalties for offload modes
  if (inferenceMode === 'gpu_offload' && gpuLayers !== 'all') {
    // Offloading slows down based on % of layers on CPU
    const estimatedLayers = Math.round(32 * (paramsB / 7));
    const gpuRatio = (gpuLayers as number) / estimatedLayers;
    // PCIe transfer penalty: ~10-20x slower for CPU layers
    toksPerSec = toksPerSec * (gpuRatio + (1 - gpuRatio) * 0.1);
  } else if (inferenceMode === 'cpu_only') {
    // CPU is much slower, typically 1-5 tok/s depending on cores
    toksPerSec = Math.min(toksPerSec * 0.05, 5);
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
 * Calculate full performance estimate
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
  gpuLayers: number | 'all' = 'all'
): PerformanceEstimate {
  const tokensPerSecond = estimateDecodeTokensPerSecond(
    paramsB, bpw, bandwidthGbps, inferenceMode, gpuLayers
  );

  const prefillTokensPerSecond = estimatePrefillTokensPerSecond(
    paramsB, fp16Tflops, tensorCores
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
