/**
 * Single-source-of-truth helpers for the curated GPU/model selections.
 *
 * Read curated.json once, validate every reference resolves against the actual
 * dataset, and expose typed accessors that every page (compare,
 * gpu/[a]/[b], scripts) calls into. This is the only file that gets to know
 * what "popular" means.
 *
 * Critically, `getSeoStaticParamsSuperset()` returns the union of every
 * (gpu, model) pair that any internal link could point to — that's what
 * /gpu/[gpuSlug]/[modelSlug]/page.tsx feeds into generateStaticParams, so
 * a compare-table "open in detail" link can never 404 in a static export.
 */
import curated from '@/data/curated.json';
import { getSEOGpus, getSEOModels, toSlug, type SEOGPU, type SEOModel } from './seoUtils';

interface CuratedShape {
  popularGpuNames: string[];
  popularModelIds: string[];
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
  for (const [a, b] of C.featuredComparePairs) {
    if (!gpuNames.has(a)) missingGpus.push(`featuredComparePairs[].a: ${a}`);
    if (!gpuNames.has(b)) missingGpus.push(`featuredComparePairs[].b: ${b}`);
  }
  for (const id of C.popularModelIds) if (!modelIds.has(id)) missingModels.push(`popularModelIds: ${id}`);

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

export function getCompareEligibleGpus(): SEOGPU[] {
  const set = new Set(getCompareEligibleGpuNames());
  return getSEOGpus().filter((g) => set.has(g.name));
}

// ---------------------------------------------------------------------------
// Every (gpu, model) pair any internal link might point to must be in this
// set; otherwise Next.js's static-export build fails with
// "missing param … in generateStaticParams()".
//
// GPU axis:   popular ∪ compare-eligible
// Model axis: popular
// ---------------------------------------------------------------------------
export function getSeoStaticParamsSuperset(): { gpuSlug: string; modelSlug: string }[] {
  validateOnce();

  const gpuNameSet = new Set<string>([
    ...getPopularGpuNames(),
    ...getCompareEligibleGpuNames(),
  ]);

  const gpus   = getSEOGpus().filter((g) => gpuNameSet.has(g.name));
  const models = getPopularModels();

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
  const pool = getCompareEligibleGpus();
  const out: { a: string; b: string }[] = [];
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      out.push({ a: toSlug(pool[i].name), b: toSlug(pool[j].name) });
      out.push({ a: toSlug(pool[j].name), b: toSlug(pool[i].name) });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Peer-picker — given a GPU, choose the best "similar tier" peer from a pool.
// ---------------------------------------------------------------------------
function pairDistance(a: SEOGPU, b: SEOGPU): number {
  const vramRatio  = Math.log2(b.vram_mb / a.vram_mb);
  const bwRatio    = Math.log2(b.bandwidth_gbps / a.bandwidth_gbps);
  const pa = (a.price_usd ?? 800) + 200;
  const pb = (b.price_usd ?? 800) + 200;
  const priceRatio = Math.log2(pb / pa);
  return vramRatio * vramRatio * 1.0
       + bwRatio   * bwRatio   * 0.6
       + priceRatio * priceRatio * 0.7;
}

export function pickPeerGpu(gpu: SEOGPU, candidates: SEOGPU[]): SEOGPU {
  let best: SEOGPU | null = null;
  let bestD = Infinity;
  for (const c of candidates) {
    if (c.name === gpu.name) continue;
    const d = pairDistance(gpu, c);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best ?? candidates.find((c) => c.name !== gpu.name) ?? gpu;
}

export function getPeerByName(): Record<string, string> {
  const pool = getCompareEligibleGpus();
  const out: Record<string, string> = {};
  for (const g of pool) {
    out[g.name] = pickPeerGpu(g, pool).name;
  }
  return out;
}
