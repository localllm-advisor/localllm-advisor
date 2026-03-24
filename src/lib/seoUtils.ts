/**
 * Utilities for programmatic SEO pages.
 * Used by generateStaticParams and the page components.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Slug helpers
// ============================================================================

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-\.]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function fromSlug(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ============================================================================
// Lightweight types for static generation (no client-side imports)
// ============================================================================

export interface SEOModel {
  id: string;
  name: string;
  family: string;
  params_b: number;
  architecture: 'dense' | 'moe';
  capabilities: string[];
  context_length: number;
  quantizations: {
    level: string;
    bpw: number;
    vram_mb: number;
    quality: number;
  }[];
}

export interface SEOGPU {
  name: string;
  vendor: string;
  vram_mb: number;
  bandwidth_gbps: number;
  price_usd?: number;
}

// ============================================================================
// Data loading (server-side only, reads from public/data)
// ============================================================================

let _models: SEOModel[] | null = null;
let _gpus: SEOGPU[] | null = null;

export function getSEOModels(): SEOModel[] {
  if (!_models) {
    const raw = readFileSync(join(process.cwd(), 'public/data/models.json'), 'utf-8');
    _models = JSON.parse(raw);
  }
  return _models!;
}

export function getSEOGpus(): SEOGPU[] {
  if (!_gpus) {
    const raw = readFileSync(join(process.cwd(), 'public/data/gpus.json'), 'utf-8');
    _gpus = JSON.parse(raw);
  }
  return _gpus!;
}

// ============================================================================
// Compatibility calculation
// ============================================================================

export interface CompatResult {
  canRun: boolean;
  bestQuant: string | null;
  allQuants: {
    level: string;
    vram_mb: number;
    fits: boolean;
    quality: number;
  }[];
  vramUsagePercent: number;
  estimatedTps: number;
  verdict: string;
  tips: string[];
}

export function checkCompatibility(gpu: SEOGPU, model: SEOModel): CompatResult {
  const vramMb = gpu.vram_mb;

  const allQuants = model.quantizations.map(q => ({
    level: q.level,
    vram_mb: q.vram_mb,
    fits: q.vram_mb <= vramMb * 0.95, // leave 5% headroom
    quality: q.quality,
  })).sort((a, b) => b.quality - a.quality); // highest quality first

  const fittingQuants = allQuants.filter(q => q.fits);
  const bestQuant = fittingQuants.length > 0 ? fittingQuants[0] : null;

  // Estimate tokens/sec based on bandwidth and model size
  const bestVram = bestQuant ? bestQuant.vram_mb : (allQuants[allQuants.length - 1]?.vram_mb || 0);
  const modelSizeGb = bestVram / 1024;
  const estimatedTps = modelSizeGb > 0 ? Math.round((gpu.bandwidth_gbps / modelSizeGb) * 0.85) : 0;

  const vramUsagePercent = bestQuant ? Math.round((bestQuant.vram_mb / vramMb) * 100) : 0;

  const tips: string[] = [];
  let verdict = '';

  if (!bestQuant) {
    verdict = `The ${gpu.name} does not have enough VRAM to run ${model.name}. The smallest quantization (${allQuants[allQuants.length - 1]?.level || 'N/A'}) requires ${Math.round((allQuants[allQuants.length - 1]?.vram_mb || 0) / 1024)}GB, but the ${gpu.name} only has ${Math.round(vramMb / 1024)}GB.`;
    tips.push(`Consider a GPU with at least ${Math.ceil((allQuants[allQuants.length - 1]?.vram_mb || 0) / 1024)}GB VRAM.`);
    tips.push('You could try CPU-only inference with llama.cpp, but it will be much slower.');
    if (model.params_b > 13) {
      tips.push(`Look at smaller models in the ${model.family} family.`);
    }
  } else if (vramUsagePercent > 90) {
    verdict = `The ${gpu.name} can technically run ${model.name} at ${bestQuant.level}, but it will be tight (${vramUsagePercent}% VRAM usage). Expect around ${estimatedTps} tokens/sec.`;
    tips.push('Close other GPU-intensive applications to free VRAM.');
    tips.push('Use a lower quantization for more headroom.');
    if (model.context_length > 8192) {
      tips.push('Reduce context length to save VRAM.');
    }
  } else if (vramUsagePercent > 70) {
    verdict = `The ${gpu.name} runs ${model.name} well at ${bestQuant.level} (${vramUsagePercent}% VRAM). Expected speed: ~${estimatedTps} tokens/sec.`;
    tips.push(`You can comfortably use ${bestQuant.level} quantization for good quality.`);
    if (fittingQuants.length > 1) {
      tips.push(`Higher quality option: ${fittingQuants[0].level} quantization is also possible.`);
    }
  } else {
    verdict = `The ${gpu.name} handles ${model.name} easily at ${bestQuant.level} (only ${vramUsagePercent}% VRAM). Expected speed: ~${estimatedTps} tokens/sec.`;
    tips.push(`Plenty of VRAM headroom — you can use the highest quality quantization.`);
    if (model.context_length >= 32768) {
      tips.push('You have enough room for large context windows too.');
    }
  }

  return {
    canRun: !!bestQuant,
    bestQuant: bestQuant?.level || null,
    allQuants,
    vramUsagePercent,
    estimatedTps,
    verdict,
    tips,
  };
}

// ============================================================================
// Popular GPU/Model selection for static generation
// ============================================================================

/** Top consumer GPUs that people actually search for */
const POPULAR_GPU_NAMES = [
  'NVIDIA RTX 4090', 'NVIDIA RTX 4080 SUPER', 'NVIDIA RTX 4080',
  'NVIDIA RTX 4070 Ti SUPER', 'NVIDIA RTX 4070 Ti', 'NVIDIA RTX 4070 SUPER',
  'NVIDIA RTX 4070', 'NVIDIA RTX 4060 Ti 16GB', 'NVIDIA RTX 4060 Ti 8GB',
  'NVIDIA RTX 4060', 'NVIDIA RTX 3090', 'NVIDIA RTX 3090 Ti',
  'NVIDIA RTX 3080 Ti', 'NVIDIA RTX 3080 12GB', 'NVIDIA RTX 3080 10GB',
  'NVIDIA RTX 3070 Ti', 'NVIDIA RTX 3070', 'NVIDIA RTX 3060 12GB',
  'NVIDIA RTX 5090', 'NVIDIA RTX 5080', 'NVIDIA RTX 5070 Ti', 'NVIDIA RTX 5070',
  'AMD RX 7900 XTX', 'AMD RX 7900 XT', 'AMD RX 7800 XT', 'AMD RX 7600',
  'Apple M3 Max (48GB)', 'Apple M4 Max (64GB)', 'Apple M4 Max (128GB)',
  'Apple M2 Ultra (192GB)', 'Apple M4 Pro (24GB)',
];

/** Popular model IDs (must match actual IDs in models.json) */
const POPULAR_MODEL_IDS = [
  'llama-3.1-8b', 'llama-3.1-70b', 'llama-3.1-405b',
  'llama-3.3-70b', 'llama-4-maverick-400b',
  'mistral-7b-v0.1', 'mistral-small-24b-2501', 'mistral-large-123b',
  'mixtral-8x7b',
  'qwen2.5-7b', 'qwen2.5-14b', 'qwen2.5-32b', 'qwen2.5-72b',
  'qwen3-8b', 'qwen3-32b',
  'deepseek-r1-distill-llama-8b', 'deepseek-r1-distill-qwen-32b',
  'deepseek-r1-distill-llama-70b', 'deepseek-r1-684.5b',
  'deepseek-v3-685b',
  'phi-4-14b', 'gemma-9.2b', 'gemma-27.2b',
  'codellama-34b', 'codestral-22b',
  'command-35b', 'command-r-plus-104b',
];

export function getPopularGpus(): SEOGPU[] {
  const allGpus = getSEOGpus();
  const nameSet = new Set(POPULAR_GPU_NAMES);
  return allGpus.filter(g => nameSet.has(g.name));
}

export function getPopularModels(): SEOModel[] {
  const allModels = getSEOModels();
  const idSet = new Set(POPULAR_MODEL_IDS);
  return allModels.filter(m => idSet.has(m.id));
}
