import { Model, GPU } from './types';

export interface HardwareRecommendation {
  gpu: GPU;
  gpuCount: number;
  estimatedToksPerSec: number;
  vramUsagePercent: number;
  totalVramGb: number;
  totalPrice: number | null;
  notes?: string;
}

/**
 * Calculate model VRAM requirement at a given bits-per-weight
 */
function calculateModelVramGb(paramsB: number, bpw: number): number {
  // Base model size + ~10% overhead for KV cache and runtime
  return (paramsB * bpw / 8) * 1.1;
}

/**
 * Estimate tokens per second based on GPU bandwidth and model size
 */
function estimateTokensPerSecond(
  bandwidthGbps: number,
  modelSizeGb: number,
  gpuCount: number = 1
): number {
  // Multi-GPU scaling: not linear due to communication overhead
  const effectiveBandwidth = gpuCount > 1
    ? bandwidthGbps * gpuCount * 0.7 // 70% efficiency for multi-GPU
    : bandwidthGbps;

  // tokens/sec ≈ bandwidth / model_size
  // This is the memory-bound decode speed
  return effectiveBandwidth / modelSizeGb;
}

/**
 * Find hardware configurations that can run a given model
 */
export function findHardwareForModel(
  model: Model,
  gpus: GPU[],
  minTokensPerSec: number = 10,
  maxPriceEur: number | null = null,
  bpw: number = 4.5
): HardwareRecommendation[] {
  const modelVramGb = calculateModelVramGb(model.params_b, bpw);
  const recommendations: HardwareRecommendation[] = [];

  // Sort GPUs by value (bandwidth per euro) for better recommendations
  const sortedGpus = [...gpus].sort((a, b) => {
    const aValue = a.bandwidth_gbps / (a.price_eur || 10000);
    const bValue = b.bandwidth_gbps / (b.price_eur || 10000);
    return bValue - aValue;
  });

  for (const gpu of sortedGpus) {
    // Try single GPU
    const singleVramGb = gpu.vram_mb / 1024;

    if (singleVramGb >= modelVramGb) {
      const toksPerSec = estimateTokensPerSecond(gpu.bandwidth_gbps, modelVramGb, 1);

      if (toksPerSec >= minTokensPerSec) {
        const price = gpu.price_eur || null;

        if (maxPriceEur === null || (price && price <= maxPriceEur)) {
          recommendations.push({
            gpu,
            gpuCount: 1,
            estimatedToksPerSec: toksPerSec,
            vramUsagePercent: Math.round((modelVramGb / singleVramGb) * 100),
            totalVramGb: singleVramGb,
            totalPrice: price,
          });
        }
      }
    }

    // Try 2x GPU (only for high-end cards, makes sense)
    if (gpu.vram_mb >= 8192 && gpu.price_eur) { // Only for 8GB+ cards with price
      const dualVramGb = (gpu.vram_mb / 1024) * 2 * 0.95; // 5% overhead for multi-GPU

      if (dualVramGb >= modelVramGb) {
        const toksPerSec = estimateTokensPerSecond(gpu.bandwidth_gbps, modelVramGb, 2);

        if (toksPerSec >= minTokensPerSec) {
          const price = gpu.price_eur * 2;

          if (maxPriceEur === null || price <= maxPriceEur) {
            // Check if this is actually better than single GPU options
            recommendations.push({
              gpu,
              gpuCount: 2,
              estimatedToksPerSec: toksPerSec,
              vramUsagePercent: Math.round((modelVramGb / dualVramGb) * 100),
              totalVramGb: dualVramGb,
              totalPrice: price,
              notes: 'Requires 2 PCIe x8+ slots and NVLink for best performance',
            });
          }
        }
      }
    }
  }

  // Sort by value: speed per euro, then by speed
  recommendations.sort((a, b) => {
    // Prioritize single GPU solutions (simpler)
    if (a.gpuCount !== b.gpuCount) {
      return a.gpuCount - b.gpuCount;
    }

    // Then by speed
    if (Math.abs(a.estimatedToksPerSec - b.estimatedToksPerSec) > 5) {
      return b.estimatedToksPerSec - a.estimatedToksPerSec;
    }

    // Then by price
    const aPrice = a.totalPrice || 10000;
    const bPrice = b.totalPrice || 10000;
    return aPrice - bPrice;
  });

  // Deduplicate: keep best option per GPU
  const seen = new Set<string>();
  const deduped = recommendations.filter(rec => {
    const key = `${rec.gpu.name}-${rec.gpuCount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Return top 6 options
  return deduped.slice(0, 6);
}

/**
 * Find the cheapest hardware to run a model at minimum usable speed
 */
export function findCheapestHardware(
  model: Model,
  gpus: GPU[],
  bpw: number = 4.5
): HardwareRecommendation | null {
  const results = findHardwareForModel(model, gpus, 5, null, bpw);

  if (results.length === 0) return null;

  // Sort by price
  const withPrice = results.filter(r => r.totalPrice !== null);
  if (withPrice.length === 0) return results[0];

  withPrice.sort((a, b) => (a.totalPrice || 0) - (b.totalPrice || 0));
  return withPrice[0];
}

/**
 * Find the fastest hardware to run a model within budget
 */
export function findFastestHardware(
  model: Model,
  gpus: GPU[],
  maxPriceEur: number,
  bpw: number = 4.5
): HardwareRecommendation | null {
  const results = findHardwareForModel(model, gpus, 1, maxPriceEur, bpw);

  if (results.length === 0) return null;

  // Sort by speed
  results.sort((a, b) => b.estimatedToksPerSec - a.estimatedToksPerSec);
  return results[0];
}
