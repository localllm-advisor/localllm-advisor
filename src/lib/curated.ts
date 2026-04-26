/**
 * Single-source-of-truth helpers for the curated GPU/model selections.
 *
 * Read curated.json once, validate every reference resolves against the actual
 * dataset, and expose typed accessors that every page (compare, tier-list,
 * gpu/[a]/[b], scripts) calls into. This is the only file that gets to know
 * what "popular" means.
 *
 * Critically, `getSeoStaticParamsSuperset()` returns the union of every
 * (gpu, model) pair that any internal link could point to — that's what
 * /gpu/[gpuSlug]/[modelSlug]/page.tsx feeds into generateStaticParams, so
 * a tier-list "see on RTX 4060 →" link can never 404 in a static export.
 */
import curated from '@/data/curated.json';
import { getSEOGpus, getSEOModels, toSlug, type SEOGPU, type SEOModel } from './seoUtils';

export type TierKey = 'S' | 'A' | 'B' | 'C' | 'D';

interface CuratedShape {
  popularGpuNames: string[];
  popularModelIds: string[];
  tierListAllowIds: string[];
  tierGpuExamples: Record<TierKey, string>;
  compareEligibleGpuNames: string[];
  featuredComparePairs: [string, string][];
}

const C = curated as unknown as CuratedShape;

// ---------------------------------------------------------------------------
// Validation — runs once, fails the build loudly if curated.json references
// a GPU name or model id that no longer exists in gpus.json / models.json.
// This is the safety net that turns "silent broken links" into "build error".
// ---------------------------------------------------------------------------
let _validated = false;

function validateOnce(): void {
  if (_validated) return;
  _validated = true;

  const gpuNames = new Set(getSEOGpus().map((g) => g.name));
  const modelIds = new Set(getSEOModels().map((m) => m.id));

  const missingGpus: string[] = [];
  const missingModels: string[] = [];

  for (const n of C.popularGpuNames)         if (!gpuNames.has(n)) missingGpus.push(`popularGpuNames: ${n}`);
  for (const n of C.compareEligibleGpuNames) if (!gpuNames.has(n)) missingGpus.push(`compareEligibleGpuNames: ${n}`);
  for (const tier of Object.keys(C.tierGpuExamples) as TierKey[]) {
    const n = C.tierGpuExamples[tier];
    if (!gpuNames.has(n)) missingGpus.push(`tierGpuExamples.${tier}: ${n}`);
  }
  for (const [a, b] of C.featuredComparePairs) {
    if (!gpuNames.has(a)) missingGpus.push(`featuredComparePairs[].a: ${a}`);
    if (!gpuNames.has(b)) missingGpus.push(`featuredComparePairs[].b: ${b}`);
  }
  for (const id of C.popularModelIds)   if (!modelIds.has(id)) missingModels.push(`popularModelIds: ${id}`);
  for (const id of C.tierListAllowIds)  if (!modelIds.has(id)) missingModels.push(`tierListAllowIds: ${id}`);

  if (missingGpus.length || missingModels.length) {
    const lines = [
      'curated.json references entries that are not in the dataset.',
      'Either add them to public/data/{gpus,models}.json or remove them from curated.json.',
      '',
      ...missingGpus.map((s) => `  GPU not found  → ${s}`),
      ...missingModels.map((s) => `  Model not found→ ${s}`),
    ];
    throw new Error(lines.join('\n'));
  }
}

// ---------------------------------------------------------------------------
// Accessors — each one validates on first call.
// ---------------------------------------------------------------------------

export function getPopularGpuNames(): string[] {
  validateOnce();
  return C.popularGpuNames;
}

export function getPopularModelIds(): string[] {
  validateOnce();
  return C.popularModelIds;
}

export function getTierListAllowIds(): string[] {
  validateOnce();
  return C.tierListAllowIds;
}

export function getTierGpuExamples(): Record<TierKey, string> {
  validateOnce();
  return C.tierGpuExamples;
}

export function getCompareEligibleGpuNames(): string[] {
  validateOnce();
  return C.compareEligibleGpuNames;
}

export function getFeaturedComparePairs(): [string, string][] {
  validateOnce();
  return C.featuredComparePairs;
}

export function getPopularGpus(): SEOGPU[] {
  const set = new Set(getPopularGpuNames());
  return getSEOGpus().filter((g) => set.has(g.name));
}

export function getPopularModels(): SEOModel[] {
  const set = new Set(getPopularModelIds());
  return getSEOModels().filter((m) => set.has(m.id));
}

export function getTierListEligibleModels(): SEOModel[] {
  const set = new Set(getTierListAllowIds());
  return getSEOModels().filter((m) => set.has(m.id));
}

export function getCompareEligibleGpus(): SEOGPU[] {
  const set = new Set(getCompareEligibleGpuNames());
  return getSEOGpus().filter((g) => set.has(g.name));
}

// ---------------------------------------------------------------------------
// THE critical fix — every (gpu, model) pair any internal link might point
// to must be in this set, otherwise Next.js's static-export build will fail
// with "missing param … in generateStaticParams()".
//
// We take the UNION of:
//   1. popularGpus × popularModels   (existing /gpu/[a]/[b] coverage)
//   2. tierGpuExamples × tierAllowed (covers tier-list "see on <gpu>" links)
//   3. tierGpuExamples × popularModels (covers tier-list pages still showing
//      legacy models if the allow-list shrinks)
// ---------------------------------------------------------------------------
export function getSeoStaticParamsSuperset(): { gpuSlug: string; modelSlug: string }[] {
  validateOnce();

  // The GPU axis: popular ∪ tier examples ∪ compare-eligible
  // (the last so any compare-table "open in detail" link also resolves)
  const gpuNameSet = new Set<string>([
    ...getPopularGpuNames(),
    ...Object.values(getTierGpuExamples()),
    ...getCompareEligibleGpuNames(),
  ]);

  // The model axis: popular ∪ tier-list-allowed
  const modelIdSet = new Set<string>([
    ...getPopularModelIds(),
    ...getTierListAllowIds(),
  ]);

  const gpus   = getSEOGpus().filter((g) => gpuNameSet.has(g.name));
  const models = getSEOModels().filter((m) => modelIdSet.has(m.id));

  const out: { gpuSlug: string; modelSlug: string }[] = [];
  for (const g of gpus) {
    for (const m of models) {
      out.push({ gpuSlug: toSlug(g.name), modelSlug: toSlug(m.name) });
    }
  }
  return out;
}

// Compare static-params: both directions of each unordered pair, drawn from
// the compareEligibleGpus set. Same set used by /compare and /compare/[a]/[b].
export function getCompareStaticParams(): { a: string; b: string }[] {
  const popular = getCompareEligibleGpus();
  const out: { a: string; b: string }[] = [];
  for (let i = 0; i < popular.length; i++) {
    for (let j = i + 1; j < popular.length; j++) {
      out.push({ a: toSlug(popular[i].name), b: toSlug(popular[j].name) });
      out.push({ a: toSlug(popular[j].name), b: toSlug(popular[i].name) });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Peer-picker — given a GPU, choose the best "similar tier" peer from a pool.
//
// Why: the /compare index used to default every "pick any GPU" button to the
// first entry in the list (RTX 5090). Pressing the RTX 4060 Ti 16GB button
// would route to /compare/rtx-4060-ti-16gb-vs-rtx-5090 — a 7× price gap
// comparison that's not useful to anyone. We want each button to land on a
// peer that's genuinely close in tier.
//
// Distance is computed in log space so a 12GB→24GB step is treated the same
// as a 24GB→48GB step. The three signals are weighted:
//   • VRAM     — strongest discriminator for "can I run model X"
//   • Bandwidth— proxy for tok/s on a model both can fit
//   • Price    — the user-facing buying-decision axis
// We add a small price floor (+200) so a $0 hypothetical can't blow up the
// log, and we exclude the GPU itself from candidates.
// ---------------------------------------------------------------------------
function pairDistance(a: SEOGPU, b: SEOGPU): number {
  const vramRatio = Math.log2(b.vram_mb / a.vram_mb);
  const bwRatio   = Math.log2(b.bandwidth_gbps / a.bandwidth_gbps);
  const pa = (a.price_usd ?? 800) + 200;
  const pb = (b.price_usd ?? 800) + 200;
  const priceRatio = Math.log2(pb / pa);
  return vramRatio * vramRatio * 1.0
       + bwRatio   * bwRatio   * 0.6
       + priceRatio* priceRatio* 0.7;
}

export function pickPeerGpu(gpu: SEOGPU, candidates: SEOGPU[]): SEOGPU {
  let best: SEOGPU | null = null;
  let bestD = Infinity;
  for (const c of candidates) {
    if (c.name === gpu.name) continue;
    const d = pairDistance(gpu, c);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  // candidates always has at least 2 entries in practice (compareEligibleGpus
  // is hand-curated to ≥18), but fall back to the first non-self if needed.
  return best ?? candidates.find((c) => c.name !== gpu.name) ?? gpu;
}

// For each compare-eligible GPU, return its best peer's name. Callers use this
// to wire each "pick any GPU" button to a sensibly-priced default opponent.
export function getPeerByName(): Record<string, string> {
  const pool = getCompareEligibleGpus();
  const out: Record<string, string> = {};
  for (const g of pool) {
    out[g.name] = pickPeerGpu(g, pool).name;
  }
  return out;
}
