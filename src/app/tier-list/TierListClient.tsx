'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';
import Reveal from '@/components/Reveal';
import { useTheme } from '@/components/ThemeProvider';
import type { TierKey, TierEntry } from './page';

interface Props {
  tiers: { tier: TierKey; vramCeilingMb: number; label: string; sub: string }[];
  buckets: Record<TierKey, TierEntry[]>;
  exampleGpu: Record<TierKey, string>;
  exampleGpuSlug: Record<TierKey, string | null>;
}

const TIER_COLORS: Record<TierKey, { bg: string; text: string; border: string }> = {
  S: { bg: 'bg-rose-500/15',    text: 'text-rose-500',    border: 'border-rose-500/40' },
  A: { bg: 'bg-orange-500/15',  text: 'text-orange-500',  border: 'border-orange-500/40' },
  B: { bg: 'bg-amber-500/15',   text: 'text-amber-500',   border: 'border-amber-500/40' },
  C: { bg: 'bg-emerald-500/15', text: 'text-emerald-500', border: 'border-emerald-500/40' },
  D: { bg: 'bg-sky-500/15',     text: 'text-sky-500',     border: 'border-sky-500/40' },
};

export default function TierListClient({ tiers, buckets, exampleGpu, exampleGpuSlug }: Props) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Page-level tinted background mirrors the rose accent used by PageHero so
  // the hero blends into the body rather than sitting on a flat slab. Mirrors
  // the pattern used by /search/hardware (orange) and /methodology (green).
  const text  = isDark ? 'text-gray-100' : 'text-gray-900';
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const card  = isDark ? 'bg-gray-800/40 border-gray-700' : 'bg-white border-gray-200';

  // Total models across every tier — useful as a "trust" stat in the hero.
  const totalRanked = tiers.reduce((acc, t) => acc + buckets[t.tier].length, 0);

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-rose-950/40' : 'bg-rose-50/70'}`}>
      <Navbar />
      <BackButton />

      <PageHero
        title="Local LLM Tier List 2026"
        subtitle="The best open-weights models you can actually run, grouped by the VRAM tier of your hardware. Quality ranking inside each tier is driven by Open LLM Leaderboard v2 + community benchmarks."
        accent="rose"
      >
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`px-3 py-1 rounded-full font-medium ${isDark ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}>
            {totalRanked} models ranked
          </span>
          <span className={`px-3 py-1 rounded-full font-medium ${isDark ? 'bg-gray-800/60 text-gray-300 border border-gray-700' : 'bg-white/80 text-gray-700 border border-gray-200'}`}>
            5 hardware tiers — 8GB to 48GB+
          </span>
          <span className={`px-3 py-1 rounded-full font-medium ${isDark ? 'bg-gray-800/60 text-gray-300 border border-gray-700' : 'bg-white/80 text-gray-700 border border-gray-200'}`}>
            ≥15 tok/s threshold
          </span>
        </div>
      </PageHero>

      <main className="flex-1 mx-auto max-w-5xl px-4 py-12 w-full">
        {tiers.map((t, idx) => {
          const c = TIER_COLORS[t.tier];
          const bucket = buckets[t.tier];
          const slug = exampleGpuSlug[t.tier];
          return (
            <Reveal key={t.tier} delay={idx * 60}>
              <section className={`mb-6 rounded-2xl border ${card} overflow-hidden`}>
                <div className={`flex items-center gap-4 px-5 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} ${c.bg}`}>
                  <div className={`w-14 h-14 rounded-xl ${c.bg} ${c.border} border-2 flex items-center justify-center text-3xl font-extrabold ${c.text}`}>
                    {t.tier}
                  </div>
                  <div className="flex-1">
                    <h2 className={`text-xl font-bold ${text}`}>{t.label}</h2>
                    <p className={`text-sm ${muted}`}>{t.sub}</p>
                  </div>
                  {slug && buckets[t.tier][0] && (
                    <Link
                      href={`/gpu/${slug}/${slugify(buckets[t.tier][0].name)}`}
                      className={`hidden md:inline-block px-3 py-1.5 rounded-lg border text-sm ${c.border} ${c.text} hover:bg-opacity-30`}
                    >
                      See on {exampleGpu[t.tier]} →
                    </Link>
                  )}
                </div>
                {bucket.length === 0 ? (
                  <p className={`px-5 py-4 ${muted}`}>No models curated for this tier yet.</p>
                ) : (
                  <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                    {bucket.map((m, i) => (
                      <li key={m.id} className="px-5 py-3 flex items-baseline gap-4">
                        <span className={`w-6 text-right font-mono text-xs ${muted}`}>{i + 1}.</span>
                        <div className="flex-1">
                          <Link
                            href={slug ? `/gpu/${slug}/${slugify(m.name)}` : '/search/model'}
                            className={`font-semibold ${text} hover:text-rose-500`}
                          >
                            {m.name}
                          </Link>
                          <span className={`ml-2 text-xs ${muted}`}>
                            {m.params_b}B · {m.family} · {m.capabilities.join(', ')}
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-md ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                          {m.bestQuant} · {m.vramGb} GB
                        </span>
                        <span className={`text-sm font-bold ${c.text}`} title="Quality proxy (0-100, higher = better)">
                          {m.qualityScore}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </Reveal>
          );
        })}

        <Reveal delay={tiers.length * 60}>
          <section className={`rounded-2xl border ${card} p-5 mt-8`}>
            <h3 className={`text-lg font-bold ${text} mb-2`}>How tiers are assigned</h3>
            <p className={muted}>
              A model lands in the lowest tier whose VRAM ceiling fits its largest quant
              with 15% headroom. Quality is a weighted composite of MMLU-Pro, BBH,
              IFEval, HumanEval and MATH (mirrors the scoring used in{' '}
              <Link href="/methodology" className="underline text-rose-500">/methodology</Link>),
              with a completeness penalty so partially-benchmarked models can&apos;t cherry-pick a number.
            </p>
          </section>
        </Reveal>
      </main>
      <SiteFooter />
    </div>
  );
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-\.]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
