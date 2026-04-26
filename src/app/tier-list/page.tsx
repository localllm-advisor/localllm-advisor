import type { Metadata } from 'next';
import { getSEOModels, getSEOGpus, toSlug } from '@/lib/seoUtils';
// getSEOModels is referenced indirectly via the helper functions but we keep
// it imported so the type-narrowing helpers below can use ReturnType<>.
import { getTierListEligibleModels, getTierGpuExamples } from '@/lib/curated';
import TierListClient from './TierListClient';

export const metadata: Metadata = {
  title: 'Local LLM Tier List 2026 — Best Models You Can Actually Run',
  description: 'The definitive local-LLM tier list: best open-weights models grouped by the hardware tier needed to run them at usable speed (≥15 tok/s).',
  alternates: { canonical: '/tier-list' },
  openGraph: {
    title: 'Local LLM Tier List 2026',
    description: 'Best open-weights models, grouped by the hardware tier you need to run them.',
    images: [{ url: '/og/tier-list.svg', width: 1200, height: 630, alt: 'Local LLM Tier List 2026' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Local LLM Tier List 2026',
    description: 'Best open-weights models, grouped by hardware tier.',
    images: ['/og/tier-list.svg'],
  },
};

export type TierKey = 'S' | 'A' | 'B' | 'C' | 'D';
export type TierEntry = {
  id: string;
  name: string;
  params_b: number;
  family: string;
  bestQuant: string;
  vramGb: number;
  qualityScore: number; // 0-100, sourced from MMLU-Pro fallback to estimate
  capabilities: string[];
};

/**
 * Tier definitions — each tier represents a "VRAM ceiling" of common
 * consumer hardware. We assign a model to a tier based on the *smallest*
 * Q4_K_M VRAM that lets it run with ≥15% headroom (matches the engine's
 * fitting heuristic).
 *
 *   S — fits in 8 GB    (RTX 3050 / 4060 / Steam Deck class)
 *   A — fits in 12 GB   (RTX 3060 12 GB / 4070 / 7600 XT)
 *   B — fits in 16 GB   (RTX 4060 Ti 16 GB / 4080 / 7900 GRE)
 *   C — fits in 24 GB   (RTX 3090 / 4090 / 7900 XTX)
 *   D — needs 48 GB+    (dual 24 GB, 5090, A6000, M-series Apple Silicon)
 */
const TIERS: { tier: TierKey; vramCeilingMb: number; label: string; sub: string }[] = [
  { tier: 'S', vramCeilingMb: 8 * 1024,  label: 'Tier S - 8 GB',  sub: 'Steam Deck / 3050 / 4060 / 4060 Ti 8 GB' },
  { tier: 'A', vramCeilingMb: 12 * 1024, label: 'Tier A - 12 GB', sub: '3060 12 GB / 4070 / 4070 SUPER / 7600 XT' },
  { tier: 'B', vramCeilingMb: 16 * 1024, label: 'Tier B - 16 GB', sub: '4060 Ti 16 GB / 4080 / 7900 GRE' },
  { tier: 'C', vramCeilingMb: 24 * 1024, label: 'Tier C - 24 GB', sub: '3090 / 4090 / 7900 XTX' },
  { tier: 'D', vramCeilingMb: 48 * 1024, label: 'Tier D - 48 GB+', sub: 'dual-24 GB / 5090 / A6000 / Apple Silicon 64+ GB' },
];

function bestFitInBudget(model: ReturnType<typeof getSEOModels>[number], budgetMb: number): { quant: string; vram: number } | null {
  // Prefer Q4_K_M class as the "default usable" quant; otherwise fall back to
  // any quant whose vram ≤ budget * 0.85 (matches engine headroom).
  const fits = (model.quantizations || []).filter((q) => q.vram_mb <= budgetMb * 0.85);
  if (!fits.length) return null;
  // Choose the highest-bpw fitting quant for best quality
  fits.sort((a, b) => b.bpw - a.bpw);
  return { quant: fits[0].level, vram: fits[0].vram_mb };
}

function qualityProxy(m: ReturnType<typeof getSEOModels>[number]): number {
  // benchmarks is an optional column in the dataset, not declared on the
  // SEOGPU/SEOModel types — use a narrowed structural type so we can read it
  // without resorting to `any`.
  const b: Record<string, number | undefined> =
    (m as { benchmarks?: Record<string, number | undefined> }).benchmarks ?? {};
  // Composite: weighted MMLU-Pro / BBH / IFEval / HumanEval — whichever are present.
  let total = 0, weight = 0;
  const channels: [string, number][] = [
    ['mmlu_pro', 0.35], ['bbh', 0.20], ['ifeval', 0.20],
    ['humaneval', 0.15], ['math', 0.10],
  ];
  for (const [k, w] of channels) {
    const v = b[k];
    if (v != null) { total += v * w; weight += w; }
  }
  if (weight > 0) return Math.round((total / weight) * (Math.sqrt(weight))); // completeness penalty matches scoring.ts
  // Fallback: monotone in params (as last resort)
  return Math.min(50, m.params_b * 1.2);
}

// The "what models are eligible for the tier list?" allowlist lives in
// src/data/curated.json and is exposed via getTierListEligibleModels(). When
// a new model is added to public/data/models.json, adding its id to that JSON
// file is the only change needed — the rest of the page (per-tier ranking,
// example-GPU links, JSON-LD ItemList) is derived automatically.

export default function TierListPage() {
  const allGpus = getSEOGpus();
  const eligible = getTierListEligibleModels();

  const tierBuckets: Record<TierKey, TierEntry[]> = { S: [], A: [], B: [], C: [], D: [] };

  for (const m of eligible) {
    // Find the *first* tier (lowest VRAM ceiling) where the model fits.
    let assigned: TierKey | null = null;
    for (const t of TIERS) {
      const fit = bestFitInBudget(m, t.vramCeilingMb);
      if (fit) {
        assigned = t.tier;
        tierBuckets[t.tier].push({
          id: m.id,
          name: m.name,
          params_b: m.params_b,
          family: m.family,
          bestQuant: fit.quant,
          vramGb: Math.round(fit.vram / 1024 * 10) / 10,
          qualityScore: qualityProxy(m),
          capabilities: m.capabilities || [],
        });
        break;
      }
    }
    if (!assigned) tierBuckets.D.push({
      id: m.id, name: m.name, params_b: m.params_b, family: m.family,
      bestQuant: 'Q4_K_M+', vramGb: Math.round((m.quantizations[0]?.vram_mb || 0) / 1024 * 10) / 10,
      qualityScore: qualityProxy(m), capabilities: m.capabilities || [],
    });
  }

  // Sort each bucket by quality score desc
  (Object.keys(tierBuckets) as TierKey[]).forEach((k) => {
    tierBuckets[k].sort((a, b) => b.qualityScore - a.qualityScore);
  });

  // Representative GPU choices per tier come from curated.json so they stay
  // in sync with what's pre-rendered by /gpu/[gpuSlug]/[modelSlug] (the
  // static-params superset includes all of these GPUs).
  const tierGpuExample = getTierGpuExamples();
  const exampleGpuSlug: Record<TierKey, string | null> = { S: null, A: null, B: null, C: null, D: null };
  for (const t of TIERS) {
    const g = allGpus.find((g) => g.name === tierGpuExample[t.tier]);
    if (g) exampleGpuSlug[t.tier] = toSlug(g.name);
  }

  // JSON-LD: emit one ItemList per tier so Google can surface a rich list
  // result for queries like "best local LLM under 24GB VRAM".
  const jsonLd = TIERS.map((t) => ({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${t.label} — ${t.sub}`,
    description: `Best open-weights LLMs that fit a ${t.label.split('—')[1]?.trim() || t.label} GPU at usable speed.`,
    itemListElement: tierBuckets[t.tier].slice(0, 10).map((m, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: m.name,
      description: `${m.params_b}B params, ${m.family}, ${m.bestQuant} ~${m.vramGb}GB`,
    })),
  })).filter((ld) => ld.itemListElement.length > 0);

  return (
    <>
      {jsonLd.map((obj, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }}
        />
      ))}
      <TierListClient
        tiers={TIERS}
        buckets={tierBuckets}
        exampleGpu={tierGpuExample}
        exampleGpuSlug={exampleGpuSlug}
      />
    </>
  );
}
