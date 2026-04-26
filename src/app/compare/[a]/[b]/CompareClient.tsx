'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';
import Reveal from '@/components/Reveal';
import { useTheme } from '@/components/ThemeProvider';
import type { SEOGPU, CompatResult } from '@/lib/seoUtils';

type CompareRow = {
  model: { id: string; name: string; params_b: number; family: string };
  a: CompatResult;
  b: CompatResult;
};

interface Props {
  gpuA: SEOGPU;
  gpuB: SEOGPU;
  rows: CompareRow[];
}

/**
 * Fully presentational; all heavy lifting happened server-side in
 * generateStaticParams + checkCompatibility. We render two columns of
 * spec cards, then a side-by-side table of how both GPUs handle each
 * popular model. Every row links to the per-(GPU, model) deep-page.
 *
 * Page format mirrors /search/hardware and /methodology — PageHero with
 * cyan accent, mesh-grid background, body tinted in matching cyan.
 */
export default function CompareClient({ gpuA, gpuB, rows }: Props) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const cardBase = isDark ? 'bg-gray-800/60 border-gray-700' : 'bg-white border-gray-200';
  const text     = isDark ? 'text-gray-100' : 'text-gray-900';
  const muted    = isDark ? 'text-gray-400' : 'text-gray-500';
  const accent   = isDark ? 'text-cyan-400'  : 'text-cyan-600';
  const tableBg  = isDark ? 'bg-gray-900/40' : 'bg-white';

  // Quick top-line winner heuristic. We use bandwidth × VRAM as an LLM-fit
  // proxy, then defer to per-row outcomes for the body.
  const scoreA = gpuA.bandwidth_gbps * (gpuA.vram_mb / 1024);
  const scoreB = gpuB.bandwidth_gbps * (gpuB.vram_mb / 1024);
  const winner = scoreA === scoreB ? null : (scoreA > scoreB ? 'A' : 'B');

  // For each row, "wins" the column whose canRun is true and the other isn't,
  // or whose estimatedTps is materially higher (>20% faster).
  function rowWinner(r: CompareRow): 'A' | 'B' | null {
    if (r.a.canRun && !r.b.canRun) return 'A';
    if (r.b.canRun && !r.a.canRun) return 'B';
    if (!r.a.canRun && !r.b.canRun) return null;
    const ratio = r.a.estimatedTps / Math.max(1, r.b.estimatedTps);
    if (ratio >= 1.2) return 'A';
    if (ratio <= 0.83) return 'B';
    return null;
  }

  function gpuChip(gpu: SEOGPU, side: 'A' | 'B') {
    const me = side === 'A' ? gpuA : gpuB;
    const tag = side === 'A' ? 'A' : 'B';
    const ring = winner === side ? (isDark ? 'ring-2 ring-cyan-500/40' : 'ring-2 ring-cyan-300') : '';
    return (
      <div className={`rounded-2xl border p-6 ${cardBase} ${ring}`}>
        <div className="flex items-baseline justify-between mb-2">
          <span className={`inline-block px-2 py-0.5 text-xs font-mono rounded ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
            GPU {tag}
          </span>
          {winner === side && (
            <span className={`text-xs font-semibold ${accent}`}>Better LLM fit</span>
          )}
        </div>
        <h2 className={`text-2xl font-bold ${text}`}>{me.name}</h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className={muted}>VRAM</dt>
            <dd className={`text-xl font-semibold ${text}`}>{(me.vram_mb / 1024).toFixed(0)} GB</dd>
          </div>
          <div>
            <dt className={muted}>Bandwidth</dt>
            <dd className={`text-xl font-semibold ${text}`}>{Math.round(me.bandwidth_gbps)} GB/s</dd>
          </div>
          {me.price_usd != null && (
            <div>
              <dt className={muted}>Street price</dt>
              <dd className={`text-xl font-semibold ${text}`}>${me.price_usd.toLocaleString()}</dd>
            </div>
          )}
          <div>
            <dt className={muted}>Vendor</dt>
            <dd className={`text-xl font-semibold ${text} capitalize`}>{me.vendor}</dd>
          </div>
        </dl>
      </div>
    );
  }

  function tickCell(v: boolean, label?: string) {
    if (v) return <span className={`${accent} font-semibold`}>{label || 'Yes'}</span>;
    return <span className={muted}>No</span>;
  }

  // Tally winners per column for the summary line.
  let winsA = 0, winsB = 0, ties = 0;
  rows.forEach((r) => {
    const w = rowWinner(r);
    if (w === 'A') winsA++;
    else if (w === 'B') winsB++;
    else ties++;
  });

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-cyan-950/40' : 'bg-cyan-50/70'}`}>
      <Navbar />
      <BackButton />

      <PageHero
        title={`${gpuA.name} vs ${gpuB.name}`}
        subtitle="How these GPUs compare for running local LLMs — VRAM, bandwidth, and per-model fit across popular open-weights models."
        accent="cyan"
      >
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`px-3 py-1 rounded-full font-medium ${isDark ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-cyan-100 text-cyan-700 border border-cyan-200'}`}>
            {rows.length} models compared
          </span>
          <span className={`px-3 py-1 rounded-full font-medium ${isDark ? 'bg-gray-800/60 text-gray-300 border border-gray-700' : 'bg-white/80 text-gray-700 border border-gray-200'}`}>
            {(gpuA.vram_mb / 1024).toFixed(0)} GB vs {(gpuB.vram_mb / 1024).toFixed(0)} GB VRAM
          </span>
          <span className={`px-3 py-1 rounded-full font-medium ${isDark ? 'bg-gray-800/60 text-gray-300 border border-gray-700' : 'bg-white/80 text-gray-700 border border-gray-200'}`}>
            {Math.round(gpuA.bandwidth_gbps)} GB/s vs {Math.round(gpuB.bandwidth_gbps)} GB/s
          </span>
        </div>
      </PageHero>

      <main className="flex-1 mx-auto max-w-5xl px-4 py-12 w-full">
        <Reveal>
          <section className="grid md:grid-cols-2 gap-4 mb-8">
            {gpuChip(gpuA, 'A')}
            {gpuChip(gpuB, 'B')}
          </section>
        </Reveal>

        <Reveal delay={120}>
          <section className={`rounded-2xl border p-5 mb-6 ${cardBase}`}>
            <h2 className={`text-lg font-bold mb-2 ${text}`}>The short answer</h2>
            <p className={`${muted} leading-relaxed`}>
              Across the {rows.length} popular models we benchmark,&nbsp;
              <strong className={accent}>{gpuA.name}</strong> wins on {winsA},&nbsp;
              <strong className={accent}>{gpuB.name}</strong> wins on {winsB}, and {ties} are roughly equal.
              Wins are counted when one GPU can run a model the other can&apos;t, or when its estimated
              tok/s is at least 20% higher.
            </p>
          </section>
        </Reveal>

        <Reveal delay={200}>
          <section className={`rounded-2xl border overflow-hidden ${cardBase}`}>
            <div className={`px-5 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-bold ${text}`}>Model-by-model fit</h2>
              <p className={`text-sm ${muted}`}>Click any row for the full breakdown.</p>
            </div>
            <div className="overflow-x-auto">
              <table className={`w-full text-sm ${tableBg}`}>
                <thead className={isDark ? 'bg-gray-800/50' : 'bg-gray-100'}>
                  <tr className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                    <th className="text-left px-4 py-3 font-semibold">Model</th>
                    <th className="text-left px-4 py-3 font-semibold">{gpuA.name} (A)</th>
                    <th className="text-left px-4 py-3 font-semibold">{gpuB.name} (B)</th>
                    <th className="text-left px-4 py-3 font-semibold">Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const w = rowWinner(r);
                    return (
                      <tr
                        key={r.model.id}
                        className={`border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`}
                      >
                        <td className={`px-4 py-3 ${text}`}>
                          <div className="font-semibold">{r.model.name}</div>
                          <div className={`text-xs ${muted}`}>{r.model.params_b}B · {r.model.family}</div>
                        </td>
                        <td className="px-4 py-3">
                          {tickCell(r.a.canRun,
                            r.a.canRun ? `${r.a.estimatedTps} tok/s · ${r.a.bestQuant}` : 'Too big')}
                        </td>
                        <td className="px-4 py-3">
                          {tickCell(r.b.canRun,
                            r.b.canRun ? `${r.b.estimatedTps} tok/s · ${r.b.bestQuant}` : 'Too big')}
                        </td>
                        <td className="px-4 py-3">
                          {w === 'A' && <span className={`${accent} font-semibold`}>A</span>}
                          {w === 'B' && <span className={`${accent} font-semibold`}>B</span>}
                          {!w && <span className={muted}>tie</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </Reveal>

        <section className="mt-8 text-center">
          <p className={muted}>
            Want a different pairing?
            <Link href="/compare" className={`ml-2 underline ${accent}`}>Browse all comparisons →</Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
