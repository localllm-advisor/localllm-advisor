#!/usr/bin/env node
/**
 * Generate per-page Open Graph images for SEO/viral pages.
 *
 * Output: SVG files at 1200×630 — the OG-card aspect ratio. SVG is preferred
 * here because:
 *   1. It's the "source of truth" — sharp text rendering on any DPR.
 *   2. Modern social platforms (Twitter/X, Discord, Slack, LinkedIn,
 *      Telegram, Reddit) all support SVG OG images.
 *   3. Static export → committable to /public/og without binary bloat.
 *
 * If a downstream platform demands PNG, a follow-up step can convert
 * each SVG with @resvg/resvg-js or Inkscape:
 *
 *     for f in public/og/*.svg; do
 *       resvg --width 1200 "$f" "${f%.svg}.png"
 *     done
 *
 * Pages covered (mirrors generateStaticParams of each route):
 *   /                                 -> og-home.svg            (default)
 *   /gpu/[gpuSlug]                    -> gpu--<slug>.svg        (per-GPU SEO)
 *   /gpu/[gpuSlug]/[modelSlug]        -> gpu-model--<a>--<b>.svg
 *   /compare/[a]/[b]                  -> compare--<a>--<b>.svg
 *   /tier-list                        -> tier-list.svg
 */

const fs   = require('fs');
const path = require('path');

const ROOT       = path.resolve(__dirname, '..');
const OUT_DIR    = path.join(ROOT, 'public', 'og');
const MODELS     = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/models.json'), 'utf8'));
const GPUS       = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/gpus.json'),   'utf8'));

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ---------- helpers ----------
function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-\.]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
const escape = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Truncate strings to fit a given character budget (rough — fine for OG cards).
function clip(s, max) {
  if (!s) return '';
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

// Vendor-aware accent colour. Falls back to a neutral cyan.
function vendorAccent(vendor) {
  switch ((vendor || '').toLowerCase()) {
    case 'nvidia': return '#76b900';
    case 'amd':    return '#ed1c24';
    case 'apple':  return '#a1a1a6';
    case 'intel':  return '#0071c5';
    default:       return '#22d3ee';
  }
}

// ---------- SVG builders ----------
// All cards share a common chrome: dark gradient background, brand mark,
// a vendor-accented underline, and a subtle dotted grid for texture.
function svgFrame(innerNodes, accent = '#22d3ee') {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0"   stop-color="#0b1220"/>
      <stop offset="0.5" stop-color="#0f172a"/>
      <stop offset="1"   stop-color="#1e293b"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.15" r="0.65">
      <stop offset="0"   stop-color="${accent}" stop-opacity="0.28"/>
      <stop offset="0.6" stop-color="${accent}" stop-opacity="0.05"/>
      <stop offset="1"   stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="#1f2a44" fill-opacity="0.55"/>
    </pattern>
    <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="6"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#dots)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <!-- brand row -->
  <g font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif">
    <text x="60" y="80" font-size="28" font-weight="700" fill="#e2e8f0" letter-spacing="0.5">
      LocalLLM Advisor
    </text>
    <text x="60" y="108" font-size="18" font-weight="500" fill="#64748b">
      localllm-advisor.com
    </text>
    <line x1="60" y1="135" x2="220" y2="135" stroke="${accent}" stroke-width="3"/>
  </g>
  ${innerNodes}
</svg>`;
}

// ---------- card variants ----------
function homeCard() {
  const inner = `
  <g font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" fill="#f8fafc">
    <text x="60"  y="240" font-size="78" font-weight="800">Find the best LLM</text>
    <text x="60"  y="320" font-size="78" font-weight="800">for <tspan fill="#22d3ee">your hardware</tspan>.</text>
    <text x="60"  y="400" font-size="32" font-weight="500" fill="#cbd5e1">
      Pick a GPU. Get ranked recommendations with tok/s, VRAM
    </text>
    <text x="60"  y="445" font-size="32" font-weight="500" fill="#cbd5e1">
      estimates, and ready-to-run Ollama commands.
    </text>
    <g transform="translate(60, 510)">
      <rect width="270" height="60" rx="14" fill="#22d3ee"/>
      <text x="135" y="40" font-size="24" font-weight="700" fill="#0b1220" text-anchor="middle">Try it free →</text>
    </g>
    <text x="360" y="548" font-size="22" fill="#94a3b8">Free · No signup · Privacy-first</text>
  </g>`;
  return svgFrame(inner);
}

function gpuCard(gpu, top) {
  const accent = vendorAccent(gpu.vendor);
  const vramGb = (gpu.vram_mb / 1024).toFixed(0);
  const bw = Math.round(gpu.bandwidth_gbps);
  const topName = clip(top?.name || 'Many models fit', 38);
  const topTps = top?.tps ? `${top.tps} tok/s` : '';
  const topQuant = top?.quant || '';
  const inner = `
  <g font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" fill="#f8fafc">
    <text x="60"  y="220" font-size="34" font-weight="600" fill="#94a3b8">Best LLMs for</text>
    <text x="60"  y="288" font-size="68" font-weight="800">${escape(clip(gpu.name, 36))}</text>
    <g transform="translate(60, 326)">
      <rect width="170" height="44" rx="10" fill="${accent}" fill-opacity="0.18" stroke="${accent}" stroke-width="1.5"/>
      <text x="85" y="30" font-size="22" font-weight="700" fill="${accent}" text-anchor="middle">${vramGb} GB VRAM</text>
    </g>
    <g transform="translate(248, 326)">
      <rect width="220" height="44" rx="10" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
      <text x="110" y="30" font-size="22" font-weight="700" fill="#e2e8f0" text-anchor="middle">${bw} GB/s</text>
    </g>
    <text x="60"  y="430" font-size="26" font-weight="500" fill="#94a3b8">Top recommendation</text>
    <text x="60"  y="478" font-size="44" font-weight="700" fill="#f1f5f9">${escape(topName)}</text>
    <text x="60"  y="520" font-size="26" font-weight="500" fill="#cbd5e1">
      ${escape(topQuant)}${topQuant && topTps ? ' · ' : ''}<tspan fill="${accent}" font-weight="700">${escape(topTps)}</tspan>
    </text>
    <text x="60"  y="582" font-size="20" fill="#64748b">Pre-computed · physics-based estimates · ±40% bands</text>
  </g>`;
  return svgFrame(inner, accent);
}

function gpuModelCard(gpu, model, fit) {
  const accent = vendorAccent(gpu.vendor);
  const ok = fit?.canRun;
  const verdictTone = ok ? '#22c55e' : '#f87171';
  const verdictText = ok ? 'Yes — it runs' : "Doesn't fit";
  const tps  = fit?.estimatedTps ? `${fit.estimatedTps} tok/s` : '';
  const quant = fit?.bestQuant || '';
  const usage = fit?.vramUsagePercent != null ? `${fit.vramUsagePercent}% VRAM` : '';
  const inner = `
  <g font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" fill="#f8fafc">
    <text x="60"  y="220" font-size="34" font-weight="600" fill="#94a3b8">Can ${escape(clip(gpu.name, 18))} run</text>
    <text x="60"  y="288" font-size="68" font-weight="800">${escape(clip(model.name, 30))}?</text>
    <g transform="translate(60, 332)">
      <rect width="280" height="56" rx="14" fill="${verdictTone}" fill-opacity="0.18" stroke="${verdictTone}" stroke-width="2"/>
      <text x="140" y="38" font-size="26" font-weight="800" fill="${verdictTone}" text-anchor="middle">${verdictText}</text>
    </g>
    ${quant ? `<text x="60"  y="438" font-size="28" font-weight="500" fill="#cbd5e1">Best quant: <tspan fill="#f1f5f9" font-weight="700">${escape(quant)}</tspan></text>` : ''}
    ${tps   ? `<text x="60"  y="478" font-size="28" font-weight="500" fill="#cbd5e1">Speed: <tspan fill="${accent}" font-weight="700">${escape(tps)}</tspan></text>` : ''}
    ${usage ? `<text x="60"  y="518" font-size="28" font-weight="500" fill="#cbd5e1">VRAM use: <tspan fill="#f1f5f9" font-weight="700">${escape(usage)}</tspan></text>` : ''}
    <text x="60"  y="582" font-size="20" fill="#64748b">Estimated with physics-based bandwidth/compute model</text>
  </g>`;
  return svgFrame(inner, accent);
}

function compareCard(a, b) {
  const accentA = vendorAccent(a.vendor);
  const accentB = vendorAccent(b.vendor);
  const inner = `
  <g font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" fill="#f8fafc">
    <text x="60"  y="220" font-size="34" font-weight="600" fill="#94a3b8">Which runs LLMs faster?</text>
    <g>
      <text x="60"  y="328" font-size="58" font-weight="800" fill="${accentA}">${escape(clip(a.name, 22))}</text>
      <text x="60"  y="382" font-size="28" font-weight="500" fill="#cbd5e1">${(a.vram_mb/1024).toFixed(0)} GB · ${Math.round(a.bandwidth_gbps)} GB/s</text>
    </g>
    <text x="60"  y="438" font-size="32" font-weight="700" fill="#64748b">vs</text>
    <g>
      <text x="60"  y="498" font-size="58" font-weight="800" fill="${accentB}">${escape(clip(b.name, 22))}</text>
      <text x="60"  y="552" font-size="28" font-weight="500" fill="#cbd5e1">${(b.vram_mb/1024).toFixed(0)} GB · ${Math.round(b.bandwidth_gbps)} GB/s</text>
    </g>
    <text x="60"  y="600" font-size="20" fill="#64748b">Side-by-side LLM performance, fit, and price</text>
  </g>`;
  return svgFrame(inner, '#22d3ee');
}

function tierListCard() {
  const inner = `
  <g font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" fill="#f8fafc">
    <text x="60"  y="240" font-size="78" font-weight="800">Local LLM Tier List</text>
    <text x="60"  y="312" font-size="44" font-weight="700" fill="#22d3ee">2026 Edition</text>
    <text x="60"  y="392" font-size="30" font-weight="500" fill="#cbd5e1">
      Best models you can actually run, ranked by hardware tier.
    </text>
    <g font-size="60" font-weight="800" font-family="system-ui">
      <text x="60"  y="520" fill="#f87171">S</text>
      <text x="160" y="520" fill="#fb923c">A</text>
      <text x="260" y="520" fill="#fbbf24">B</text>
      <text x="360" y="520" fill="#34d399">C</text>
      <text x="460" y="520" fill="#60a5fa">D</text>
    </g>
    <text x="60"  y="582" font-size="20" fill="#64748b">Updated continuously · Built from Open LLM Leaderboard v2 + community benchmarks</text>
  </g>`;
  return svgFrame(inner, '#22d3ee');
}

// ---------- recommend a top model for a GPU ----------
// Lightweight version of the engine's logic — we don't need the full ranking
// here, just "what's a representative top pick to put on the social card".
function pickTopForGpu(gpu) {
  const vramMb = gpu.vram_mb;
  // Look for a high-quality model whose Q4/Q5 fits comfortably.
  const candidates = MODELS
    .filter((m) => Array.isArray(m.quantizations) && m.quantizations.length)
    .filter((m) => (m.capabilities || []).includes('chat'))
    .filter((m) => {
      const q4 = m.quantizations.find((q) => q.level === 'Q4_K_M' || q.bpw < 5);
      return q4 && q4.vram_mb <= vramMb * 0.85;
    });
  // Score by params (bigger = better, all else equal) but penalise truly massive
  // models that barely fit. Add a quality coefficient (use mmlu_pro if present).
  candidates.sort((a, b) => {
    const qa = a.benchmarks && a.benchmarks.mmlu_pro ? a.benchmarks.mmlu_pro : a.params_b * 1.5;
    const qb = b.benchmarks && b.benchmarks.mmlu_pro ? b.benchmarks.mmlu_pro : b.params_b * 1.5;
    return qb - qa;
  });
  const top = candidates[0];
  if (!top) return null;
  const q = top.quantizations.find((q) => q.level === 'Q4_K_M') || top.quantizations[0];
  // Rough tok/s: bandwidth / model size in GB at chosen bpw.
  const sizeGb = ((top.active_params_b || top.params_b) * q.bpw) / 8;
  const tps = sizeGb > 0 ? Math.round((gpu.bandwidth_gbps * 0.6) / sizeGb) : 0;
  return { name: top.name, quant: q.level, tps };
}

// Lightweight compatibility (matches checkCompatibility in seoUtils.ts)
function checkCompat(gpu, model) {
  const vramMb = gpu.vram_mb;
  const allQuants = (model.quantizations || []).map((q) => ({
    level: q.level, vram_mb: q.vram_mb, fits: q.vram_mb <= vramMb * 0.95, quality: q.quality,
  })).sort((a, b) => b.quality - a.quality);
  const fitting = allQuants.filter((q) => q.fits);
  const best = fitting[0] || null;
  const bestVram = best ? best.vram_mb : (allQuants[allQuants.length - 1]?.vram_mb || 0);
  const sizeGb = bestVram / 1024;
  const tps = sizeGb > 0 ? Math.round((gpu.bandwidth_gbps / sizeGb) * 0.85) : 0;
  return {
    canRun: !!best,
    bestQuant: best?.level || null,
    estimatedTps: tps,
    vramUsagePercent: best ? Math.round((best.vram_mb / vramMb) * 100) : 0,
  };
}

// ---------- popular sets (single source of truth: src/data/curated.json) ----
// We pull the union of (popular ∪ tier-eligible) so OG images are emitted
// for every (gpu, model) page that's actually pre-rendered. This means a new
// model added to tierListAllowIds gets an OG card on its very next build.
const CURATED = require('./_curated');
const popularGpus   = CURATED.popularGpus;
const popularModels = MODELS.filter((m) =>
  CURATED.curated.popularModelIds.includes(m.id) ||
  CURATED.curated.tierListAllowIds.includes(m.id)
);
void GPUS;

// ---------- write files ----------
function write(name, svg) {
  fs.writeFileSync(path.join(OUT_DIR, name), svg);
}

// 1. Home / brand card
write('og-home.svg', homeCard());

// 2. Per-GPU
let gpuCount = 0;
for (const gpu of popularGpus) {
  const top = pickTopForGpu(gpu);
  write(`gpu--${toSlug(gpu.name)}.svg`, gpuCard(gpu, top));
  gpuCount++;
}

// 3. Per-(GPU, model)
let pairCount = 0;
for (const gpu of popularGpus) {
  for (const model of popularModels) {
    const fit = checkCompat(gpu, model);
    write(`gpu-model--${toSlug(gpu.name)}--${toSlug(model.name)}.svg`, gpuModelCard(gpu, model, fit));
    pairCount++;
  }
}

// 4. Per-comparison (top 12 GPUs cross-paired)
const compareSet = popularGpus.slice(0, 12);
let cmpCount = 0;
for (let i = 0; i < compareSet.length; i++) {
  for (let j = i + 1; j < compareSet.length; j++) {
    const a = compareSet[i], b = compareSet[j];
    write(`compare--${toSlug(a.name)}--${toSlug(b.name)}.svg`, compareCard(a, b));
    cmpCount++;
  }
}

// 5. Tier list
write('tier-list.svg', tierListCard());

console.log(`OG images written to ${path.relative(ROOT, OUT_DIR)}/`);
console.log(`  home:        1`);
console.log(`  per-GPU:     ${gpuCount}`);
console.log(`  per-(G,M):   ${pairCount}`);
console.log(`  per-compare: ${cmpCount}`);
console.log(`  tier list:   1`);
console.log(`  total:       ${1 + gpuCount + pairCount + cmpCount + 1}`);
