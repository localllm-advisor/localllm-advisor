import { Model, GPU } from './types';

// ============================================================================
// Types
// ============================================================================

export interface VramRequirements {
  q4: number;   // GB needed at Q4_K_M
  q6: number;   // GB needed at Q6_K
  q8: number;   // GB needed at Q8_0
  fp16: number; // GB needed at FP16
}

export interface HardwareOption {
  gpu: GPU;
  gpuCount: number;
  totalVramGb: number;
  vramUsagePercent: number;
  estimatedToksPerSec: number;
  totalPrice: number | null;
  tier: 'budget' | 'recommended' | 'premium';
  notes?: string;
}

export interface CloudOption {
  provider: string;
  gpuType: string;
  gpuCount: number;
  vramGb: number;
  pricePerHour: number;
  estimatedToksPerSec: number;
  link: string;
}

export interface HardwareRecipe {
  model: Model;
  quantization: string;
  bpw: number;

  // Requirements
  vramRequired: number;        // GB needed for selected quant
  allVramRequirements: VramRequirements;

  // Feasibility (theoretical - ignoring filters)
  canRunSingleGpu: boolean;
  canRunDualGpu: boolean;
  canRunConsumer: boolean;     // Any consumer GPU setup works
  minGpusNeeded: number;       // Minimum GPUs needed (1, 2, 4, 8, or 0 if impossible)

  // Minimum hardware requirement (ignoring speed/budget filters)
  minimumViableOption: HardwareOption | null;  // Cheapest option that can physically run the model

  // Hardware options (filtered by speed/budget preferences)
  budgetOption: HardwareOption | null;      // Cheapest that meets criteria
  recommendedOption: HardwareOption | null; // Best value that meets criteria
  premiumOption: HardwareOption | null;     // Fastest that meets criteria
  allOptions: HardwareOption[];             // All options meeting criteria

  // All theoretical options (ignoring filters) - for "show all" view
  allTheoreticalOptions: HardwareOption[];

  // Cloud fallback
  cloudOptions: CloudOption[];

  // System requirements
  systemRequirements: {
    minRamGb: number;
    minPsuWatts: number;
    pcieSlotsNeeded: number;
    notes: string[];
  };
}

// ============================================================================
// Cloud Providers
// ============================================================================

import { cloudLink } from './cloudReferrals';

const CLOUD_GPUS = [
  { provider: 'RunPod', gpu: 'RTX 4090', vramGb: 24, bandwidthGbps: 1008, pricePerHour: 0.69, link: cloudLink('https://runpod.io', 'runpod') },
  { provider: 'RunPod', gpu: 'A100 80GB', vramGb: 80, bandwidthGbps: 2039, pricePerHour: 1.99, link: cloudLink('https://runpod.io', 'runpod') },
  { provider: 'RunPod', gpu: 'H100 80GB', vramGb: 80, bandwidthGbps: 3350, pricePerHour: 3.99, link: cloudLink('https://runpod.io', 'runpod') },
  { provider: 'Vast.ai', gpu: 'RTX 4090', vramGb: 24, bandwidthGbps: 1008, pricePerHour: 0.40, link: cloudLink('https://vast.ai', 'vastai') },
  { provider: 'Vast.ai', gpu: 'A100 80GB', vramGb: 80, bandwidthGbps: 2039, pricePerHour: 1.50, link: cloudLink('https://vast.ai', 'vastai') },
  { provider: 'Lambda', gpu: 'A100 80GB', vramGb: 80, bandwidthGbps: 2039, pricePerHour: 1.29, link: cloudLink('https://lambdalabs.com', 'lambda') },
  { provider: 'Lambda', gpu: 'H100 80GB', vramGb: 80, bandwidthGbps: 3350, pricePerHour: 2.49, link: cloudLink('https://lambdalabs.com', 'lambda') },
];

// ============================================================================
// Calculations
// ============================================================================

function calculateVramGb(paramsB: number, bpw: number): number {
  // Model size + ~15% overhead for KV cache and runtime
  return (paramsB * bpw / 8) * 1.15;
}

function calculateAllVramRequirements(paramsB: number): VramRequirements {
  return {
    q4: calculateVramGb(paramsB, 4.5),
    q6: calculateVramGb(paramsB, 6.5),
    q8: calculateVramGb(paramsB, 8.5),
    fp16: calculateVramGb(paramsB, 16),
  };
}

function estimateTokensPerSecond(
  bandwidthGbps: number,
  modelSizeGb: number,
  gpuCount: number = 1
): number {
  // Multi-GPU scaling with communication overhead
  const efficiency = gpuCount === 1 ? 1.0 : gpuCount === 2 ? 0.75 : gpuCount === 4 ? 0.6 : 0.5;
  const effectiveBandwidth = bandwidthGbps * gpuCount * efficiency;
  return effectiveBandwidth / modelSizeGb;
}

// ============================================================================
// Main Recipe Builder
// ============================================================================

export function buildHardwareRecipe(
  model: Model,
  gpus: GPU[],
  bpw: number = 4.5,
  minTokensPerSec: number = 10,
  maxPriceUsd: number | null = null
): HardwareRecipe {
  const vramRequired = calculateVramGb(model.params_b, bpw);
  const allVramRequirements = calculateAllVramRequirements(model.params_b);

  // Find all viable hardware options
  const allOptions: HardwareOption[] = [];

  // Filter to purchasable GPUs (not Apple Silicon)
  const purchasableGpus = gpus.filter(g => g.vendor !== 'apple' && g.price_usd);

  // Sort by VRAM descending to find what can run the model
  const sortedByVram = [...purchasableGpus].sort((a, b) => b.vram_mb - a.vram_mb);

  // Try different GPU counts: 1, 2, 4, 8
  for (const gpuCount of [1, 2, 4, 8]) {
    for (const gpu of sortedByVram) {
      const totalVramGb = (gpu.vram_mb / 1024) * gpuCount * (gpuCount > 1 ? 0.95 : 1);

      if (totalVramGb >= vramRequired) {
        const toksPerSec = estimateTokensPerSecond(gpu.bandwidth_gbps, vramRequired, gpuCount);
        const totalPrice = gpu.price_usd ? gpu.price_usd * gpuCount : null;

        // Determine tier based on speed
        let tier: 'budget' | 'recommended' | 'premium';
        if (toksPerSec >= 40) tier = 'premium';
        else if (toksPerSec >= 15) tier = 'recommended';
        else tier = 'budget';

        // Notes for multi-GPU
        let notes: string | undefined;
        if (gpuCount === 2) {
          notes = 'Requires motherboard with 2 x16 PCIe slots';
        } else if (gpuCount === 4) {
          notes = 'Requires HEDT platform (Threadripper/Xeon) with 4 PCIe slots';
        } else if (gpuCount === 8) {
          notes = 'Requires server chassis with 8 GPU support';
        }

        allOptions.push({
          gpu,
          gpuCount,
          totalVramGb,
          vramUsagePercent: Math.round((vramRequired / totalVramGb) * 100),
          estimatedToksPerSec: toksPerSec,
          totalPrice,
          tier,
          notes,
        });
      }
    }
  }

  // Deduplicate: keep best option per GPU+count combination
  const seen = new Set<string>();
  const dedupedOptions = allOptions.filter(opt => {
    const key = `${opt.gpu.name}-${opt.gpuCount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort all theoretical options: single GPU first, then by price
  const allTheoreticalOptions = [...dedupedOptions].sort((a, b) => {
    if (a.gpuCount !== b.gpuCount) return a.gpuCount - b.gpuCount;
    const aPrice = a.totalPrice || 999999;
    const bPrice = b.totalPrice || 999999;
    return aPrice - bPrice;
  });

  // Minimum viable option: cheapest that can physically run the model (ignoring speed)
  const theoreticalWithPrice = allTheoreticalOptions.filter(o => o.totalPrice !== null);
  const minimumViableOption = theoreticalWithPrice.length > 0
    ? theoreticalWithPrice.reduce((a, b) => (a.totalPrice! < b.totalPrice! ? a : b))
    : null;

  // Apply speed and budget filters for user preferences
  let filteredOptions = dedupedOptions.filter(opt => opt.estimatedToksPerSec >= minTokensPerSec);
  if (maxPriceUsd !== null) {
    filteredOptions = filteredOptions.filter(opt => opt.totalPrice !== null && opt.totalPrice <= maxPriceUsd);
  }

  // Sort filtered options: single GPU first, then by value (speed per dollar)
  filteredOptions.sort((a, b) => {
    if (a.gpuCount !== b.gpuCount) return a.gpuCount - b.gpuCount;
    const aValue = a.estimatedToksPerSec / (a.totalPrice || 10000);
    const bValue = b.estimatedToksPerSec / (b.totalPrice || 10000);
    return bValue - aValue;
  });

  // Budget: cheapest filtered option
  const withPrice = filteredOptions.filter(o => o.totalPrice !== null);
  const budgetOption = withPrice.length > 0
    ? withPrice.reduce((a, b) => (a.totalPrice! < b.totalPrice! ? a : b))
    : null;

  // Premium: fastest filtered option, but capped at 10x the budget price
  // so users don't see a $200 build next to a $10,000 build
  const budgetPrice = budgetOption?.totalPrice ?? Infinity;
  const maxPremiumPrice = budgetPrice * 10;
  const premiumCandidates = withPrice.filter(o => o.totalPrice! <= maxPremiumPrice);
  const premiumOption = premiumCandidates.length > 0
    ? premiumCandidates.reduce((a, b) => (a.estimatedToksPerSec > b.estimatedToksPerSec ? a : b))
    : budgetOption;

  // Recommended: best value (speed per dollar) with decent speed
  const goodOptions = withPrice.filter(o => o.estimatedToksPerSec >= minTokensPerSec && o.totalPrice! <= maxPremiumPrice);
  const recommendedOption = goodOptions.length > 0
    ? goodOptions.reduce((a, b) => {
        const aValue = a.estimatedToksPerSec / a.totalPrice!;
        const bValue = b.estimatedToksPerSec / b.totalPrice!;
        return aValue > bValue ? a : b;
      })
    : budgetOption;

  // Cloud options - try up to 16 GPUs for very large models
  const cloudOptions: CloudOption[] = [];
  for (const cloud of CLOUD_GPUS) {
    for (const count of [1, 2, 4, 8, 16]) {
      const totalVram = cloud.vramGb * count;
      if (totalVram >= vramRequired) {
        const toksPerSec = estimateTokensPerSecond(cloud.bandwidthGbps, vramRequired, count);
        cloudOptions.push({
          provider: cloud.provider,
          gpuType: cloud.gpu,
          gpuCount: count,
          vramGb: totalVram,
          pricePerHour: cloud.pricePerHour * count,
          estimatedToksPerSec: toksPerSec,
          link: cloud.link,
        });
        break; // Only add smallest working config per cloud GPU
      }
    }
  }

  // Sort cloud by price
  cloudOptions.sort((a, b) => a.pricePerHour - b.pricePerHour);

  // Determine feasibility (based on theoretical options, not filtered)
  const theoreticalSingleGpu = allTheoreticalOptions.filter(o => o.gpuCount === 1);
  const canRunSingleGpu = theoreticalSingleGpu.length > 0;
  const canRunDualGpu = allTheoreticalOptions.some(o => o.gpuCount <= 2);
  const canRunConsumer = allTheoreticalOptions.length > 0;

  let minGpusNeeded = 0;
  if (canRunSingleGpu) minGpusNeeded = 1;
  else if (allTheoreticalOptions.some(o => o.gpuCount === 2)) minGpusNeeded = 2;
  else if (allTheoreticalOptions.some(o => o.gpuCount === 4)) minGpusNeeded = 4;
  else if (allTheoreticalOptions.some(o => o.gpuCount === 8)) minGpusNeeded = 8;

  // System requirements
  const maxGpuTdp = premiumOption ? (premiumOption.gpu.tdp_watts || 300) : 300;
  const systemRequirements = {
    minRamGb: Math.max(32, Math.ceil(vramRequired * 0.5)), // At least half VRAM as system RAM
    minPsuWatts: minGpusNeeded > 0 ? 200 + (maxGpuTdp * minGpusNeeded) : 500,
    pcieSlotsNeeded: minGpusNeeded,
    notes: [] as string[],
  };

  if (minGpusNeeded >= 2) {
    systemRequirements.notes.push('Multi-GPU setup requires compatible motherboard');
  }
  if (minGpusNeeded >= 4) {
    systemRequirements.notes.push('4+ GPU setup requires HEDT or server platform');
  }
  if (vramRequired > 48) {
    systemRequirements.notes.push('Large model - consider NVMe storage for fast model loading');
  }

  // Get quant name
  const quantName = bpw <= 5 ? 'Q4_K_M' : bpw <= 7 ? 'Q6_K' : bpw <= 9 ? 'Q8_0' : 'FP16';

  return {
    model,
    quantization: quantName,
    bpw,
    vramRequired,
    allVramRequirements,
    canRunSingleGpu,
    canRunDualGpu,
    canRunConsumer,
    minGpusNeeded,
    minimumViableOption,
    budgetOption,
    recommendedOption,
    premiumOption,
    allOptions: filteredOptions.slice(0, 12),
    allTheoreticalOptions: allTheoreticalOptions.slice(0, 20),
    cloudOptions: cloudOptions.slice(0, 4),
    systemRequirements,
  };
}

// ============================================================================
// Legacy exports (for compatibility)
// ============================================================================

export interface HardwareRecommendation {
  gpu: GPU;
  gpuCount: number;
  estimatedToksPerSec: number;
  vramUsagePercent: number;
  totalVramGb: number;
  totalPrice: number | null;
  notes?: string;
}

export function findHardwareForModel(
  model: Model,
  gpus: GPU[],
  minTokensPerSec: number = 10,
  maxPriceUsd: number | null = null,
  bpw: number = 4.5
): HardwareRecommendation[] {
  const recipe = buildHardwareRecipe(model, gpus, bpw);

  let filtered = recipe.allOptions.filter(opt => opt.estimatedToksPerSec >= minTokensPerSec);

  if (maxPriceUsd !== null) {
    filtered = filtered.filter(opt => opt.totalPrice !== null && opt.totalPrice <= maxPriceUsd);
  }

  return filtered.map(opt => ({
    gpu: opt.gpu,
    gpuCount: opt.gpuCount,
    estimatedToksPerSec: opt.estimatedToksPerSec,
    vramUsagePercent: opt.vramUsagePercent,
    totalVramGb: opt.totalVramGb,
    totalPrice: opt.totalPrice,
    notes: opt.notes,
  }));
}
