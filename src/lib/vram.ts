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
    // When a model is marked MoE but active_params_b is missing, estimate
    // active params. Modern MoE models span 3%–28% active (DeepSeek V3: 5.4%,
    // Qwen3 30B-A3B: 10%, Mixtral 8x7B: 28%). We use 15% as the central
    // estimate — biased slightly conservative so speed isn't over-predicted.
    return model.params_b * 0.15;
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
 * The theoretical KV cache formula is:
 *   KV_bytes_per_token = 2 (K+V) × n_layers × n_kv_heads × head_dim × bytes_per_element
 *
 * Since we don't have per-model architecture details (n_layers, n_kv_heads,
 * head_dim), we use an empirical power-law fit calibrated against real models:
 *
 *   KV_MB_per_1K_tokens ≈ 128 × (params_B / 7)^0.4
 *
 * This matches measured values well across common model sizes:
 *   7B  (32 layers,  8 KV heads, 128 head_dim): 128 MB/1K  (formula: 128)
 *   13B (40 layers,  8 KV heads, 128 head_dim): 160 MB/1K  (formula: 168)
 *   70B (80 layers,  8 KV heads, 128 head_dim): 320 MB/1K  (formula: 321)
 *
 * The 0.4 exponent reflects that layer count grows slower than parameter count
 * (larger models widen hidden dimensions, not just add layers), while GQA keeps
 * n_kv_heads fixed (typically 8) regardless of model size.
 *
 * The pre-computed vram_mb in model data already includes baseline KV cache
 * overhead for a short context window (~4K tokens), so we only charge for
 * additional context beyond baseContext.
 *
 * With quantized KV cache (Q8_0 or Q4_0, common in llama.cpp), actual usage
 * can be 2–4× lower. We use FP16 estimates as the conservative default.
 */
export function estimateKvCacheMb(
  paramsB: number,
  contextLength: number,
  baseContext: number = 4096
): number {
  if (contextLength <= baseContext) return 0;

  // ~128 MB per 1K context tokens for a 7B GQA model at FP16
  // Power-law scaling (exponent 0.4) fits measured KV cache sizes across
  // model families better than sqrt (0.5), especially for 70B+ models
  const mbPer1kCtx = 128 * Math.pow(paramsB / 7, 0.4);
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

  // 15% headroom — leaves room for activations, CUDA workspace, display
  // compositor, and framework overhead. The previous 10% was tight enough
  // to OOM on 8k+ contexts for models reported as "fitting".
  const maxVram = availableVramMb * 0.85;

  let modelInVram = modelVramMb;
  let ramOffload = 0;

  if (totalNeeded > maxVram) {
    // Need to offload some layers to RAM
    const excess = totalNeeded - maxVram;
    ramOffload = Math.min(excess, modelVramMb); // Can't offload more than model size
    modelInVram = Math.max(0, modelVramMb - ramOffload);
  }

  const totalVram = Math.round(modelInVram + kvCache);
  const vramPercent = availableVramMb > 0
    ? Math.round((totalVram / availableVramMb) * 100)
    : 0;

  // RAM usage: offloaded layers + system overhead
  const ramOverhead = 500; // MB for runtime overhead
  const totalRamUsed = Math.round(ramOffload + ramOverhead);

  return {
    modelVram: Math.round(modelInVram),
    kvCacheVram: kvCache,
    totalVram,
    vramPercent: Math.min(vramPercent, 100),
    ramOffload: Math.round(ramOffload),
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
  // 15% headroom to match calculateMemoryBreakdown
  const maxVram = availableVramMb * 0.85;

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
  const maxVram = availableVramMb * 0.85;

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

  // Apply a realistic efficiency factor — CPU inference sees ~45% of peak
  // theoretical bandwidth in llama.cpp due to quantization overhead, kernel
  // launch overhead, and NUMA effects.
  toksPerSec *= 0.45;

  // Cap at reasonable maximums based on measured community benchmarks:
  //   7B Q4 on Ryzen 9 7950X3D + DDR5-6000:  ~10-14 tok/s
  //   13B Q4 on same:                        ~4-6 tok/s
  //   70B Q4 on same:                        ~1-2 tok/s
  // An absolute ceiling of 25 tok/s is realistic for modern DDR5 + AVX-512
  // on small (<4B) models; AMX can push this slightly higher.
  const cpuCeiling = amx ? 35 : 25;
  return Math.min(Math.max(Math.round(toksPerSec), 1), cpuCeiling);
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
  const isMoE = activeParamsB !== undefined && activeParamsB < paramsB;

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

  // Realistic memory-bandwidth utilization for autoregressive decode in
  // llama.cpp / vLLM / Ollama. Tuned kernels reach ~65% of theoretical on
  // CUDA, ~55% on Metal. We use 0.60 as a reasonable default.
  const bwEfficiency = 0.60;
  const effectiveBandwidth = bandwidthGbps * bwEfficiency;

  // For decode, the bottleneck is reading the active weights from memory.
  // MoE models only read active expert weights per token, not the full model —
  // but attention still reads the full KV cache regardless of MoE, and expert
  // routing destroys cache locality. We model this with (a) a routing-overhead
  // penalty and (b) a cap on the MoE speedup relative to the dense-equivalent
  // speed so we don't predict implausibly high throughput.
  const activeSizeGb = (effectiveParamsB * bpw) / 8;
  if (activeSizeGb <= 0) return null;

  let toksPerSec = effectiveBandwidth / activeSizeGb;

  if (isMoE) {
    // Routing + gating + all-to-all expert dispatch costs ~20% of each step.
    toksPerSec *= 0.80;
    // Cap MoE speed at ~2.5× the dense-equivalent speed. Attention compute,
    // KV-cache reads, and scheduler overhead prevent unbounded scaling even
    // if active/total is very small (e.g. DeepSeek V3 at 5.4% active would
    // naively predict ~18× dense speed, which nobody measures in practice).
    const denseSizeGb = (paramsB * bpw) / 8;
    const denseToksPerSec = effectiveBandwidth / denseSizeGb;
    const moeCap = denseToksPerSec * 2.5;
    if (toksPerSec > moeCap) toksPerSec = moeCap;
  }

  // Offload model: bottleneck-aware serial pipeline.
  // In llama.cpp/ollama offload, CPU-resident layers read their weights from
  // system RAM *and* execute matmul on the CPU. That's CPU-compute-bound for
  // dense layers and even worse for MoE (expert weights are split across RAM).
  if (inferenceMode === 'gpu_offload' && gpuLayers !== 'all') {
    const estimatedLayers = Math.max(8, Math.round(32 * (paramsB / 7)));
    const gpuFraction = Math.min(1, Math.max(0, (gpuLayers as number) / estimatedLayers));
    const cpuFraction = 1 - gpuFraction;

    // GPU part: processed at GPU's effective memory bandwidth
    const gpuPartGb = activeSizeGb * gpuFraction;
    const gpuTimePerToken = gpuPartGb / effectiveBandwidth;

    // CPU part: bottlenecked by a combination of RAM bandwidth AND CPU
    // compute. Empirically llama.cpp on DDR5 + AVX-512 achieves roughly
    // 25-30% of theoretical RAM bandwidth for quantized matmul, because
    // dequant + matmul is not purely bandwidth-bound.
    const ramBw = cpuSpecs?.ramBandwidthGbps || 50;
    const cpuEffectiveBw = ramBw * 0.30;
    const cpuPartGb = activeSizeGb * cpuFraction;
    const cpuTimePerToken = cpuPartGb / cpuEffectiveBw;

    // PCIe synchronization overhead: activation transfers between GPU and
    // CPU layer groups, per layer boundary crossing.
    const pcieBw = calculatePcieBandwidth(pcieGen, pcieLanes);
    const pcieLatencyMs = pcieBw > 20 ? 0.08 : 0.15;
    // Number of boundary crossings ≈ 2 per token if there's exactly one
    // split; real-world llama.cpp splits cleanly so this is a good default.
    const syncOverheadSec = (pcieLatencyMs * 2) / 1000;

    // Additional MoE penalty in offload: cross-NUMA expert fetches are very
    // painful. Add 50% time overhead on top when the model is MoE.
    const moeOffloadPenalty = isMoE ? 1.5 : 1.0;
    const totalTimePerToken = (gpuTimePerToken + cpuTimePerToken + syncOverheadSec) * moeOffloadPenalty;

    toksPerSec = 1 / totalTimePerToken;
  }

  return Math.round(toksPerSec);
}

/**
 * Estimate prefill speed (prompt processing) in tokens per second.
 * Prefill is compute-bound (matmul over the full prompt), so peak TFLOPS
 * is the relevant ceiling, tempered by realistic utilization.
 *
 * Single-user, small-batch prefill in llama.cpp / vLLM / TGI / Ollama
 * does NOT reach the textbook "70% of tensor-core peak". Community
 * measurements on 4090 / 5090 / 3090 show:
 *   - llama.cpp CUDA: 20-30% of advertised fp16 TFLOPS for 7B-70B dense
 *   - vLLM batched:   35-45% with large batch, but single-user is ~25-30%
 *   - Metal (MLX):    15-25% of advertised GPU TFLOPS
 *   - CPU SIMD:       5-12% of theoretical AVX2/AVX-512 peak
 *
 * We use 25% for tensor-core GPUs and 12% for non-tensor / integrated
 * GPUs — this lines up with observed TTFT numbers in real llama.cpp logs.
 */
export function estimatePrefillTokensPerSecond(
  paramsB: number,
  fp16Tflops?: number,
  tensorCores?: number
): number | null {
  if (!fp16Tflops) return null;

  // ~2 FLOPs per parameter per token for forward pass
  const flopsPerToken = paramsB * 2 * 1e9; // in FLOPs
  const tflopsAvailable = fp16Tflops * 1e12; // convert to FLOPs

  // Realistic single-user utilization
  const utilization = tensorCores ? 0.25 : 0.12;

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
 * Observed real-world variance from community benchmarks (r/LocalLLaMA,
 * llama.cpp perplexity threads, LocalScore, Puget):
 *  - Same model, same GPU, different runtimes (llama.cpp vs vLLM vs TGI vs
 *    MLC vs ExLlamaV2) routinely differ by 1.5–2×.
 *  - Quant method (Q4_K_M vs Q4_0 vs AWQ vs GPTQ) adds another ~20% spread.
 *  - Driver version, CUDA version, and batch-size choices add ~10-15% each.
 *  - Offload splits are highly sensitive to the exact CPU/PCIe/RAM config.
 *
 * We therefore widen the bands significantly so the reported range actually
 * contains the user's likely measured value:
 *  - gpu_full:    ±40%  (best-case regime; still wide because of runtime mix)
 *  - gpu_offload: ±60%  (layer-split is highly config-dependent)
 *  - cpu_only:    ±80%  (SIMD path, NUMA, runtime all compound)
 */
export function performanceRange(
  estimate: number | null,
  mode: InferenceMode = 'gpu_full'
): PerformanceRange | null {
  if (estimate === null || estimate <= 0) return null;

  const band =
    mode === 'gpu_full'    ? 0.40 :
    mode === 'gpu_offload' ? 0.60 :
    mode === 'cpu_only'    ? 0.80 : 0.50;

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
    mode === 'gpu_full'    ? 0.40 :
    mode === 'gpu_offload' ? 0.60 :
    mode === 'cpu_only'    ? 0.80 : 0.50;

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
 *
 * Anchor points (chosen from real user expectations on r/LocalLLaMA):
 *   ≥120 tok/s → 100  (blazing; 3B dense on a 4090, small MoE on 5090)
 *    ~40 tok/s → ~80  (very comfortable chat / code streaming)
 *    ~20 tok/s → ~65  (usable interactive; faster than most readers)
 *    ~10 tok/s → ~50  (acceptable for long-form generation)
 *     ~5 tok/s → ~35  (slow — only tolerable for batch/offline)
 *     ~2 tok/s → ~15  (painful)
 *     ≤1 tok/s → 5    (unusable interactively)
 *
 * We use a log scale with the ceiling raised to 120 so fast inference
 * actually differentiates top picks, instead of every small model
 * bunching at 100.
 */
export function speedScore(tokensPerSecond: number | null): number {
  if (tokensPerSecond === null) return 50;

  if (tokensPerSecond >= 120) return 100;
  if (tokensPerSecond <= 1) return 5;

  const logMin = Math.log(1);
  const logMax = Math.log(120);
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
