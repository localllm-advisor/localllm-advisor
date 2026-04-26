'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';
import Reveal from '@/components/Reveal';
import { useTheme } from '@/components/ThemeProvider';
import type { SEOGPU } from '@/lib/seoUtils';

interface Props {
  popular: SEOGPU[];
  featuredPairs: [string, string][];
  /**
   * Map of GPU.name → its best-tier peer's name. Computed server-side via
   * the composite-distance peer-picker in @/lib/curated so each "pick any
   * GPU" button lands on a similarly-priced opponent (e.g. RTX 4060 Ti 16GB
   * → RTX 4070, not → RTX 5090).
   */
  peerByName: Record<string, string>;
}

// Local copy — server-side `seoUtils.ts` imports `fs`, so we can't import
// `toSlug` from there into a client component. Keep this in sync.
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-\.]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Index page client wrapper. The actual GPU list comes from the parent
 * server component (so the JSON read happens at build time). This client
 * only handles theming + the PageHero / mesh-grid background.
 */
export default function CompareIndexClient({ popular, featuredPairs, peerByName }: Props) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const cardBase = isDark ? 'bg-gray-800/40 border-gray-700' : 'bg-white border-gray-200';
  const text     = isDark ? 'text-gray-100' : 'text-gray-900';
  const muted    = isDark ? 'text-gray-400' : 'text-gray-500';
  const accent   = isDark ? 'text-cyan-400' : 'text-cyan-600';
  const hoverRing = isDark ? 'hover:border-cyan-400/60' : 'hover:border-cyan-400';

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-cyan-950/40' : 'bg-cyan-50/70'}`}>
      <Navbar />
      <BackButton />

      <PageHero
        title="Compare GPUs for LLMs"
        subtitle="Side-by-side breakdowns: VRAM, bandwidth, model fit, and expected tok/s. Click a pairing to see the full report."
        accent="cyan"
      >
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`px-3 py-1 rounded-full font-medium ${isDark ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-cyan-100 text-cyan-700 border border-cyan-200'}`}>
            {featuredPairs.length} curated pairings
          </span>
          <span className={`px-3 py-1 rounded-full font-medium ${isDark ? 'bg-gray-800/60 text-gray-300 border border-gray-700' : 'bg-white/80 text-gray-700 border border-gray-200'}`}>
            {popular.length} GPUs to mix and match
          </span>
        </div>
      </PageHero>

      <main className="flex-1 mx-auto max-w-5xl px-4 py-12 w-full">
        <Reveal>
          <h2 className={`text-xl font-bold mb-3 ${text}`}>Most-searched pairings</h2>
          <ul className="grid sm:grid-cols-2 gap-3 mb-12">
            {featuredPairs.map(([a, b]) => (
              <li key={`${a}|${b}`} className={`rounded-xl border p-4 transition ${cardBase} ${hoverRing}`}>
                <Link href={`/compare/${toSlug(a)}/${toSlug(b)}`} className="block">
                  <span className={`font-semibold ${text}`}>{a}</span>
                  <span className={`mx-2 ${muted}`}>vs</span>
                  <span className={`font-semibold ${text}`}>{b}</span>
                  <span className={`block text-xs mt-1 ${accent}`}>View comparison →</span>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={120}>
          <h2 className={`text-xl font-bold mb-3 ${text}`}>Or pick any GPU…</h2>
          <ul className="grid sm:grid-cols-3 md:grid-cols-4 gap-2">
            {popular.map((g) => {
              // Default opponent for this button: the curated peer chosen by
              // the composite-distance picker (server-side). Fallback to the
              // first non-self GPU if the map somehow lacks an entry.
              const peerName =
                peerByName[g.name] ?? popular.find((p) => p.name !== g.name)?.name ?? g.name;
              return (
                <li key={g.name}>
                  <Link
                    href={`/compare/${toSlug(g.name)}/${toSlug(peerName)}`}
                    className={`block px-3 py-2 rounded-lg border text-sm transition ${cardBase} ${hoverRing} ${text}`}
                  >
                    <span className="block font-medium">{g.name}</span>
                    <span className={`block text-[11px] mt-0.5 ${muted}`}>vs {peerName}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </main>

      <SiteFooter />
    </div>
  );
}
