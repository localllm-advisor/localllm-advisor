/**
 * Estimate additional VRAM needed for KV cache at a given context length.
 * Formula: layers * 2 * heads * head_dim * ctx_len * bytes_per_param
 * Simplified: roughly 0.5 MB per 1K context for a 7B model, scaling with params.
 */
export function estimateKvCacheVram(
  paramsB: number,
  contextLength: number,
  baseContext: number
): number {
  if (contextLength <= baseContext) return 0;

  // Approximate KV cache overhead per 1K extra context tokens
  // Scales roughly with sqrt(params) for typical architectures
  const mbPer1kCtx = 0.5 * Math.sqrt(paramsB / 7);
  const extraCtxK = (contextLength - baseContext) / 1024;

  return Math.round(mbPer1kCtx * extraCtxK);
}

/**
 * Estimate total VRAM including KV cache adjustment.
 */
export function estimateTotalVram(
  baseVramMb: number,
  paramsB: number,
  contextLength: number
): number {
  // Base context for the stored vram_mb values is 4096
  const kvExtra = estimateKvCacheVram(paramsB, contextLength, 4096);
  return baseVramMb + kvExtra;
}

/**
 * Estimate tokens/second based on model size and GPU bandwidth.
 * Rough formula: bandwidth_gbps / (params_b * bpw / 8) * 1000
 * This gives approximate decode speed for autoregressive generation.
 */
export function estimateTokensPerSecond(
  paramsB: number,
  bpw: number,
  bandwidthGbps: number | undefined
): number | null {
  if (!bandwidthGbps || bandwidthGbps <= 0) return null;

  const modelSizeGB = (paramsB * bpw) / 8;
  if (modelSizeGB <= 0) return null;

  // tokens/s ≈ bandwidth / model_size (memory-bound regime)
  const toksPerSec = bandwidthGbps / modelSizeGB;

  return Math.round(toksPerSec);
}

/**
 * Compute speed score (0-100) from estimated tok/s.
 * 60+ tok/s = 100 (great), 1 tok/s = ~5 (unusable), log scale in between
 */
export function speedScore(tokensPerSecond: number | null): number {
  if (tokensPerSecond === null) return 50; // default middle score if unknown

  if (tokensPerSecond >= 60) return 100;
  if (tokensPerSecond <= 1) return 5;

  // Log scale: map 1-60 tok/s to 5-100
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
