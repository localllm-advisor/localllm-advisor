#!/usr/bin/env node
/**
 * Static JSON API generator.
 *
 * Pre-builds a versioned, public, read-only JSON API at /api/v1/* so that
 * third-party tools (Ollama wrappers, hardware dashboards, LLM clients)
 * can consume our compatibility / recommendation data without scraping.
 *
 * Output tree (under public/api/v1/):
 *
 *   index.json              — registry of every endpoint, version, counts
 *   models.json             — lightweight model directory (no quants)
 *   gpus.json               — lightweight GPU directory
 *   tier-list.json          — same data the /tier-list page renders
 *   gpu/<slug>.json         — per-GPU: VRAM/bandwidth, top-N models that fit
 *   gpu/<slug>/<usecase>.json — per-(GPU, use case) ranked recommendations
 *   model/<slug>.json       — per-model: quants + which popular GPUs fit
 *
 * The selection logic mirrors the logic the SEO pages use (seoUtils.ts /
 * tier-list/page.tsx). It is *intentionally simple and stable* — the API
 * shape is a public contract.
 *
 * Why generate at build time:
 *   - The site is a static export (output: 'export') so we have no runtime.
 *   - Pre-built JSON ships from the CDN with cache headers.
 *   - LLM caching of the spec is easier when the URLs and shapes are stable.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MODELS_PATH = path.join(ROOT, 'public/data/models.json');
const GPUS_PATH   = path.join(ROOT, 'public/data/gpus.json');
const OUT_ROOT    = path.join(ROOT, 'public/api/v1');

const API_VERSION = 'v1';
const SCHEMA_VERSION = '1.0.0';
const GENERATED_AT = new Date().toISOString();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-\.]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(rel, obj) {
  const abs = path.join(OUT_ROOT, rel);
  ensureDir(path.dirname(abs));
  fs.writeFileSync(abs, JSON.stringify(obj, null, 2));
}

// Use cases mirror the engine. Per use case, we pick the benchmark channels
// users actually care about — same lists as scoring.ts / ResultsList.tsx.
const USE_CASE_BENCHMARKS = {
  chat:      ['ifeval', 'mmlu_pro', 'bbh'],
  coding:    ['bigcodebench', 'humaneval', 'math', 'ifeval'],
  reasoning: ['math', 'gpqa', 'bbh', 'musr'],
  creative:  ['ifeval', 'mmlu_pro', 'bbh'],
};

function qualityProxy(model, channels) {
  const b = model.benchmarks || {};
  let total = 0, weight = 0;
  // Equal weight inside the use case; completeness penalty via sqrt(weight)
  // so a model with only one filled channel doesn't beat a model with all four.
  const w = 1 / channels.length;
  for (const k of channels) {
    const v = b[k];
    if (typeof v === 'number') { total += v * w; weight += w; }
  }
  if (weight > 0) return Math.round((total / weight) * Math.sqrt(weight));
  // Fallback: monotone in params, capped, so we never return undefined
  return Math.min(35, (model.params_b || 0) * 1.0);
}

function bestFit(model, gpu) {
  const budget = gpu.vram_mb * 0.85;
  const fits = (model.quantizations || []).filter(q => q.vram_mb <= budget);
  if (!fits.length) return null;
  // Prefer highest-bpw fitting quant for best quality.
  fits.sort((a, b) => b.bpw - a.bpw);
  const q = fits[0];
  // Bandwidth-bound estimate (matches engine's first-order tps formula).
  const modelGb = q.vram_mb / 1024;
  const tps = modelGb > 0 ? Math.round((gpu.bandwidth_gbps / modelGb) * 0.85) : 0;
  return {
    quant: q.level,
    bpw: q.bpw,
    vram_mb: q.vram_mb,
    vram_pct: Math.round((q.vram_mb / gpu.vram_mb) * 1000) / 10,
    estimated_tps: tps,
  };
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

const allModels = JSON.parse(fs.readFileSync(MODELS_PATH, 'utf-8'));
const allGpus   = JSON.parse(fs.readFileSync(GPUS_PATH,   'utf-8'));

console.log(`Loaded ${allModels.length} models, ${allGpus.length} GPUs.`);

// ---------------------------------------------------------------------------
// Filter to "API-eligible" — keep the API focused on canonical/runnable
// models so consumers don't have to dedupe synthetic forks themselves.
// ---------------------------------------------------------------------------

const eligibleModels = allModels.filter(m =>
  m.id &&
  m.name &&
  Array.isArray(m.quantizations) &&
  m.quantizations.length > 0 &&
  // Drop obvious synthetic / fork artefacts that already polluted the dataset
  !/-speculator-eagle3$/.test(m.id) &&
  !/-dflash(-b16)?$/.test(m.id) &&
  !/-heretic(-v\d+)?$/.test(m.id) &&
  !/-reproduce$/.test(m.id)
);

const eligibleGpus = allGpus.filter(g =>
  g.name &&
  typeof g.vram_mb === 'number' &&
  typeof g.bandwidth_gbps === 'number' &&
  g.vram_mb >= 4 * 1024 // exclude obviously-untargetable (≤4 GB) entries
);

// Same popular set used by OG image gen / sitemap / generateStaticParams so
// the API ships JSON for the pages we already pre-render. Pulled from the
// single source of truth at src/data/curated.json via scripts/_curated.js.
const CURATED = require('./_curated');
const popularGpus = eligibleGpus.filter(g => CURATED.curated.popularGpuNames.includes(g.name));

// ---------------------------------------------------------------------------
// Reset output directory
// ---------------------------------------------------------------------------

if (fs.existsSync(OUT_ROOT)) {
  fs.rmSync(OUT_ROOT, { recursive: true });
}
ensureDir(OUT_ROOT);

// ---------------------------------------------------------------------------
// /api/v1/models.json — directory of models
// ---------------------------------------------------------------------------

const modelsIndex = eligibleModels.map(m => ({
  id: m.id,
  slug: toSlug(m.name),
  name: m.name,
  family: m.family,
  params_b: m.params_b,
  architecture: m.architecture || 'dense',
  context_length: m.context_length || null,
  capabilities: m.capabilities || [],
  benchmarks: m.benchmarks || {},
  smallest_vram_mb: Math.min(...m.quantizations.map(q => q.vram_mb)),
  largest_vram_mb: Math.max(...m.quantizations.map(q => q.vram_mb)),
  quant_count: m.quantizations.length,
}));
writeJson('models.json', {
  schema: 'localllm.advisor.models@' + SCHEMA_VERSION,
  generated_at: GENERATED_AT,
  count: modelsIndex.length,
  models: modelsIndex,
});

// ---------------------------------------------------------------------------
// /api/v1/gpus.json — directory of GPUs
// ---------------------------------------------------------------------------

const gpusIndex = eligibleGpus.map(g => ({
  slug: toSlug(g.name),
  name: g.name,
  vendor: g.vendor || null,
  vram_mb: g.vram_mb,
  vram_gb: Math.round(g.vram_mb / 1024 * 10) / 10,
  bandwidth_gbps: g.bandwidth_gbps,
  tdp_watts: g.tdp_watts || null,
  price_usd: g.price_usd || null,
  memory_type: g.memory_type || null,
  architecture: g.architecture || null,
}));
writeJson('gpus.json', {
  schema: 'localllm.advisor.gpus@' + SCHEMA_VERSION,
  generated_at: GENERATED_AT,
  count: gpusIndex.length,
  gpus: gpusIndex,
});

// ---------------------------------------------------------------------------
// /api/v1/gpu/<slug>.json — per-GPU page (top recommendations, all use cases)
// /api/v1/gpu/<slug>/<usecase>.json — narrow recommendations
// ---------------------------------------------------------------------------

const TOP_N = 25;

for (const gpu of popularGpus) {
  const slug = toSlug(gpu.name);

  // Score every model under every use case once; reuse the per-channel
  // benchmark composite as the ranking signal. Cheap, stable, defensible.
  const perUseCase = {};
  for (const useCase of Object.keys(USE_CASE_BENCHMARKS)) {
    const channels = USE_CASE_BENCHMARKS[useCase];
    const scored = [];
    for (const m of eligibleModels) {
      const fit = bestFit(m, gpu);
      if (!fit) continue;
      // Only include models with at least one capability matching the use
      // case (e.g. coding models for coding). If capabilities are unset
      // (older entries), keep them so we don't accidentally hide good models.
      const caps = m.capabilities || [];
      if (useCase === 'coding' && caps.length && !caps.includes('coding')) continue;
      if (useCase === 'reasoning' && caps.length && !caps.includes('reasoning') && !caps.includes('chat')) continue;

      const q = qualityProxy(m, channels);
      scored.push({
        id: m.id,
        slug: toSlug(m.name),
        name: m.name,
        family: m.family,
        params_b: m.params_b,
        architecture: m.architecture || 'dense',
        quality_score: q,
        ...fit,
      });
    }
    scored.sort((a, b) => b.quality_score - a.quality_score || b.estimated_tps - a.estimated_tps);
    perUseCase[useCase] = scored.slice(0, TOP_N);

    // Per-(gpu, use case) endpoint — useful for narrow integrations.
    writeJson(`gpu/${slug}/${useCase}.json`, {
      schema: 'localllm.advisor.gpu_recommendations@' + SCHEMA_VERSION,
      generated_at: GENERATED_AT,
      gpu: {
        slug, name: gpu.name, vendor: gpu.vendor,
        vram_mb: gpu.vram_mb, bandwidth_gbps: gpu.bandwidth_gbps,
        tdp_watts: gpu.tdp_watts || null, price_usd: gpu.price_usd || null,
      },
      use_case: useCase,
      benchmark_channels: channels,
      count: perUseCase[useCase].length,
      recommendations: perUseCase[useCase],
    });
  }

  writeJson(`gpu/${slug}.json`, {
    schema: 'localllm.advisor.gpu_summary@' + SCHEMA_VERSION,
    generated_at: GENERATED_AT,
    gpu: {
      slug, name: gpu.name, vendor: gpu.vendor,
      vram_mb: gpu.vram_mb, bandwidth_gbps: gpu.bandwidth_gbps,
      memory_type: gpu.memory_type || null, architecture: gpu.architecture || null,
      tdp_watts: gpu.tdp_watts || null, price_usd: gpu.price_usd || null,
    },
    by_use_case: perUseCase,
  });
}

// ---------------------------------------------------------------------------
// /api/v1/model/<slug>.json — per-model: which popular GPUs can run it
// ---------------------------------------------------------------------------

for (const m of eligibleModels) {
  const slug = toSlug(m.name);
  const fits = [];
  for (const g of popularGpus) {
    const f = bestFit(m, g);
    if (f) {
      fits.push({
        gpu_slug: toSlug(g.name),
        gpu_name: g.name,
        ...f,
      });
    }
  }
  fits.sort((a, b) => b.estimated_tps - a.estimated_tps);

  writeJson(`model/${slug}.json`, {
    schema: 'localllm.advisor.model_compat@' + SCHEMA_VERSION,
    generated_at: GENERATED_AT,
    model: {
      id: m.id,
      slug,
      name: m.name,
      family: m.family,
      params_b: m.params_b,
      architecture: m.architecture || 'dense',
      capabilities: m.capabilities || [],
      context_length: m.context_length || null,
      benchmarks: m.benchmarks || {},
      quantizations: m.quantizations,
    },
    runnable_on: fits,
  });
}

// ---------------------------------------------------------------------------
// /api/v1/tier-list.json — same data /tier-list renders, but consumable
// ---------------------------------------------------------------------------

const TIERS = [
  { tier: 'S', vram_mb: 8 * 1024,  label: '8 GB' },
  { tier: 'A', vram_mb: 12 * 1024, label: '12 GB' },
  { tier: 'B', vram_mb: 16 * 1024, label: '16 GB' },
  { tier: 'C', vram_mb: 24 * 1024, label: '24 GB' },
  { tier: 'D', vram_mb: 48 * 1024, label: '48 GB+' },
];

// tierListAllowIds is the same set the /tier-list page renders. Single source
// of truth: src/data/curated.json.
const TIER_LIST_ALLOW = new Set(CURATED.curated.tierListAllowIds);

const tierBuckets = { S: [], A: [], B: [], C: [], D: [] };
for (const m of eligibleModels) {
  if (!TIER_LIST_ALLOW.has(m.id)) continue;
  let assigned = null;
  for (const t of TIERS) {
    const fits = (m.quantizations || []).filter(q => q.vram_mb <= t.vram_mb * 0.85);
    if (fits.length) {
      fits.sort((a, b) => b.bpw - a.bpw);
      const f = fits[0];
      tierBuckets[t.tier].push({
        id: m.id, slug: toSlug(m.name), name: m.name,
        family: m.family, params_b: m.params_b,
        best_quant: f.level, vram_mb: f.vram_mb,
        quality_score: qualityProxy(m, USE_CASE_BENCHMARKS.chat),
        capabilities: m.capabilities || [],
      });
      assigned = t.tier;
      break;
    }
  }
  if (!assigned) {
    tierBuckets.D.push({
      id: m.id, slug: toSlug(m.name), name: m.name,
      family: m.family, params_b: m.params_b,
      best_quant: 'Q4_K_M+', vram_mb: m.quantizations[0]?.vram_mb || 0,
      quality_score: qualityProxy(m, USE_CASE_BENCHMARKS.chat),
      capabilities: m.capabilities || [],
    });
  }
}
for (const k of Object.keys(tierBuckets)) {
  tierBuckets[k].sort((a, b) => b.quality_score - a.quality_score);
}
writeJson('tier-list.json', {
  schema: 'localllm.advisor.tier_list@' + SCHEMA_VERSION,
  generated_at: GENERATED_AT,
  tiers: TIERS,
  buckets: tierBuckets,
});

// ---------------------------------------------------------------------------
// /api/v1/index.json — top-level registry / contract
// ---------------------------------------------------------------------------

const endpoints = [
  { path: 'models.json',                desc: 'Lightweight directory of all models in our DB.' },
  { path: 'gpus.json',                  desc: 'Lightweight directory of all GPUs in our DB.' },
  { path: 'tier-list.json',             desc: 'Curated tier-list (S/A/B/C/D) of canonical models by VRAM ceiling.' },
  { path: 'gpu/{slug}.json',            desc: 'Per-GPU summary: top recommendations across every use case.' },
  { path: 'gpu/{slug}/{useCase}.json',  desc: 'Per-(GPU, use-case) ranked recommendations. Use cases: chat, coding, reasoning, creative.' },
  { path: 'model/{slug}.json',          desc: 'Per-model compatibility: full quantization table + which popular GPUs can run it.' },
];

writeJson('index.json', {
  schema: 'localllm.advisor.index@' + SCHEMA_VERSION,
  api_version: API_VERSION,
  generated_at: GENERATED_AT,
  base_url: 'https://localllm-advisor.com/api/v1/',
  documentation_url: 'https://localllm-advisor.com/api',
  license: 'CC BY 4.0 (please credit / link back)',
  rate_limit: 'static-served, no rate limit',
  counts: {
    models: modelsIndex.length,
    gpus: gpusIndex.length,
    popular_gpus: popularGpus.length,
  },
  endpoints,
});

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------

const fileCount = (function walk(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) n += walk(path.join(dir, e.name));
    else n += 1;
  }
  return n;
})(OUT_ROOT);

console.log(`API generated:`);
console.log(`  ${fileCount} JSON files in public/api/v1/`);
console.log(`  ${gpusIndex.length} GPUs, ${modelsIndex.length} models indexed`);
console.log(`  ${popularGpus.length} popular GPUs with full per-use-case rankings`);
