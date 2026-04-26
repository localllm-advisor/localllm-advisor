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
// ----------------------------------------------------------------------------
// The curated allowlists previously lived here as hardcoded arrays. They've
// been moved to src/data/curated.json and the helpers in src/lib/curated.ts,
// which is the single source of truth for "what's popular" across the entire
// site (seoUtils, tier-list, compare, sitemap, og-images, api-json).
//
// We re-export the curated helpers here so existing call sites
// (`import { getPopularGpus } from '@/lib/seoUtils'`) keep working without
// touching every consumer.
// ============================================================================
export { getPopularGpus, getPopularModels } from './curated';
