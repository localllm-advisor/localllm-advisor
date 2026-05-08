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

// ─── Recommendation logic ────────────────────────────────────────────────────
//
// Priority order:
//   1. Capability win  — one GPU can run models the other simply can't fit
//   2. Speed win       — both run the same models, but one is ≥20% faster on most
//   3. Value win       — performance is essentially equal, one is significantly cheaper
//   4. Marginal        — tiny spec edge, both are equivalent in practice
//
// "Wins" in the per-row table are only counted when one GPU clearly beats the
// other: can run a model the other can't, OR is ≥20% faster on it.
// "Ties" are rows where both can run at comparable speed (<20% diff).
//
type RecommendReason = 'capability' | 'speed' | 'value' | 'marginal';

interface Recommendation {
  winner: 'A' | 'B' | null;
  reason: RecommendReason | null;
  // Breakdown used in the "short answer" prose
  runWinsA: number;
  runWinsB: number;
  speedWinsA: number;
  speedWinsB: number;
  ties: number;
  neitherRuns: number;
  priceDiff: number;
  priceGapPct: number;
}

function buildRecommendation(
  gpuA: SEOGPU,
  gpuB: SEOGPU,
  rows: CompareRow[],
): Recommendation {
  let runWinsA = 0, runWinsB = 0, speedWinsA = 0, speedWinsB = 0;
  let ties = 0, neitherRuns = 0;

  for (const r of rows) {
    const canA = r.a.canRun, canB = r.b.canRun;
    if (!canA && !canB) { neitherRuns++; continue; }
    if (canA && !canB)  { runWinsA++;   continue; }
    if (!canA && canB)  { runWinsB++;   continue; }
    // Both can run — check speed
    const ratio = r.a.estimatedTps / Math.max(1, r.b.estimatedTps);
    if (ratio >= 1.2)   { speedWinsA++; continue; }
    if (ratio <= 1 / 1.2) { speedWinsB++; continue; }
    ties++;
  }

  const winsA = runWinsA + speedWinsA;
  const winsB = runWinsB + speedWinsB;
  const comparable = rows.length - neitherRuns;

  // Price info
  const priceA = gpuA.price_usd ?? 0;
  const priceB = gpuB.price_usd ?? 0;
  const hasPrices = priceA > 0 && priceB > 0;
  const priceDiff = Math.abs(priceA - priceB);
  const cheaperSide: 'A' | 'B' | null =
    hasPrices ? (priceA < priceB ? 'A' : priceB < priceA ? 'B' : null) : null;
  const priceGapPct = hasPrices && cheaperSide
    ? priceDiff / Math.min(priceA, priceB)
    : 0;

  // ── 1. Capability win ─────────────────────────────────────────────────────
  if (runWinsA - runWinsB >= 3) {
    return { winner: 'A', reason: 'capability', runWinsA, runWinsB, speedWinsA, speedWinsB, ties, neitherRuns, priceDiff, priceGapPct };
  }
  if (runWinsB - runWinsA >= 3) {
    return { winner: 'B', reason: 'capability', runWinsA, runWinsB, speedWinsA, speedWinsB, ties, neitherRuns, priceDiff, priceGapPct };
  }

  // ── 2. Speed win ──────────────────────────────────────────────────────────
  if (speedWinsA - speedWinsB >= 3) {
    return { winner: 'A', reason: 'speed', runWinsA, runWinsB, speedWinsA, speedWinsB, ties, neitherRuns, priceDiff, priceGapPct };
  }
  if (speedWinsB - speedWinsA >= 3) {
    return { winner: 'B', reason: 'speed', runWinsA, runWinsB, speedWinsA, speedWinsB, ties, neitherRuns, priceDiff, priceGapPct };
  }

  // ── 3. Value win — equal perf, meaningful price gap ───────────────────────
  // "Equal performance" = ≥75% of comparable models are ties AND wins differ by ≤2
  const perfEquivalent =
    comparable > 0 &&
    (comparable === 0 || ties / comparable >= 0.75) &&
    Math.abs(winsA - winsB) <= 2;

  if (perfEquivalent && cheaperSide && priceGapPct >= 0.15) {
    return { winner: cheaperSide, reason: 'value', runWinsA, runWinsB, speedWinsA, speedWinsB, ties, neitherRuns, priceDiff, priceGapPct };
  }

  // ── 4. Marginal — tiny spec edge ──────────────────────────────────────────
  if (winsA !== winsB) {
    return { winner: winsA > winsB ? 'A' : 'B', reason: 'marginal', runWinsA, runWinsB, speedWinsA, speedWinsB, ties, neitherRuns, priceDiff, priceGapPct };
  }
  // Absolute last resort: raw bandwidth × VRAM
  const scoreA = gpuA.bandwidth_gbps * (gpuA.vram_mb / 1024);
  const scoreB = gpuB.bandwidth_gbps * (gpuB.vram_mb / 1024);
  const marginalWinner = scoreA === scoreB ? null : (scoreA > scoreB ? 'A' : 'B');
  return { winner: marginalWinner, reason: marginalWinner ? 'marginal' : null, runWinsA, runWinsB, speedWinsA, speedWinsB, ties, neitherRuns, priceDiff, priceGapPct };
}

// ─── Row-level winner (for the table column) ─────────────────────────────────
function rowWinner(r: CompareRow): 'A' | 'B' | null {
  if (r.a.canRun && !r.b.canRun) return 'A';
  if (r.b.canRun && !r.a.canRun) return 'B';
  if (!r.a.canRun && !r.b.canRun) return null;
  const ratio = r.a.estimatedTps / Math.max(1, r.b.estimatedTps);
  if (ratio >= 1.2)       return 'A';
  if (ratio <= 1 / 1.2)  return 'B';
  return null;
}

// Speed delta label shown in tie cells: "+8% A", "+3% B", "equal"
function speedDeltaLabel(r: CompareRow): string {
  if (!r.a.canRun || !r.b.canRun) return '';
  const faster = r.a.estimatedTps - r.b.estimatedTps;
  const base   = Math.max(1, Math.min(r.a.estimatedTps, r.b.estimatedTps));
  const pct    = Math.round(Math.abs(faster) / base * 100);
  if (pct < 2) return 'equal';
  return faster > 0 ? `A +${pct}%` : `B +${pct}%`;
}

// ─── Short-answer prose ───────────────────────────────────────────────────────
function buildProse(
  rec: Recommendation,
  gpuA: SEOGPU,
  gpuB: SEOGPU,
  totalRows: number,
): string {
  const nameA = gpuA.name;
  const nameB = gpuB.name;
  const { runWinsA, runWinsB, speedWinsA, speedWinsB, ties, neitherRuns, priceDiff, priceGapPct, reason, winner } = rec;
  const comparable = totalRows - neitherRuns;
  const winnerName  = winner === 'A' ? nameA : nameB;
  const loserName   = winner === 'A' ? nameB : nameA;
  const fmtPrice    = (n: number) => `$${n.toLocaleString()}`;

  if (reason === 'capability') {
    const extra = winner === 'A' ? runWinsA : runWinsB;
    const shared = ties + (winner === 'A' ? speedWinsA : speedWinsB) + (winner === 'B' ? speedWinsA : speedWinsB);
    return `${winnerName} can run ${extra} model${extra !== 1 ? 's' : ''} that ${loserName} can't fit in VRAM — mostly the larger models. For the ${shared} models both can handle, speeds are similar. If you want headroom for bigger models, ${winnerName} is the clear choice.`;
  }

  if (reason === 'speed') {
    const faster = winner === 'A' ? speedWinsA : speedWinsB;
    return `Both GPUs handle the same models, but ${winnerName} is more than 20% faster on ${faster} of them. For the remaining ${ties} models, speeds are within 20% — you won't notice the gap. ${winnerName} gives consistently better throughput.`;
  }

  if (reason === 'value') {
    const bwA = Math.round(gpuA.bandwidth_gbps), bwB = Math.round(gpuB.bandwidth_gbps);
    const bwDiff = Math.abs(bwA - bwB);
    const bwPct  = Math.round(bwDiff / Math.min(bwA, bwB) * 100);
    const priceLine = priceDiff > 0
      ? `${winnerName} costs ${fmtPrice(priceDiff)} less (${Math.round(priceGapPct * 100)}% cheaper)`
      : 'both are similarly priced';
    const perfLine = bwPct < 3
      ? 'identical real-world performance'
      : `a bandwidth difference of just ${bwPct}% — not enough to matter in practice`;
    return `Both GPUs run all ${comparable} models at nearly identical speeds (${ties} of ${comparable} models are a tie, ${Math.max(rec.runWinsA + rec.speedWinsA, rec.runWinsB + rec.speedWinsB)} model${Math.max(rec.runWinsA + rec.speedWinsA, rec.runWinsB + rec.speedWinsB) !== 1 ? 's' : ''} go to one side by a small margin). The specs show ${perfLine}. ${priceLine} — ${winnerName} is the better value.`;
  }

  // Marginal or null
  if (!winner) {
    return `These GPUs are essentially identical for running local LLMs — same VRAM, similar bandwidth, similar price. Either is a fine choice; pick whichever is available or cheaper at the time you buy.`;
  }
  const winWins = winner === 'A' ? rec.runWinsA + rec.speedWinsA : rec.runWinsB + rec.speedWinsB;
  return `Performance is nearly identical — ${ties} of ${comparable} models are a tie. ${winnerName} has a slight edge on ${winWins} model${winWins !== 1 ? 's' : ''} (under 20% speed difference). In practice, both GPUs deliver equivalent results; the difference won't be noticeable in everyday use.`;
}


export default function CompareClient({ gpuA, gpuB, rows }: Props) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const cardBase = isDark ? 'bg-gray-800/60 border-gray-700' : 'bg-white border-gray-200';
  const text     = isDark ? 'text-gray-100' : 'text-gray-900';
  const muted    = isDark ? 'text-gray-400' : 'text-gray-500';
  const accent   = isDark ? 'text-cyan-400'  : 'text-cyan-600';
  const tableBg  = isDark ? 'bg-gray-900/40' : 'bg-white';

  const rec   = buildRecommendation(gpuA, gpuB, rows);
  const prose = buildProse(rec, gpuA, gpuB, rows.length);
  const { winner, reason } = rec;

  // Badge label and colour per recommendation reason
  const badgeLabel: Record<RecommendReason, string> = {
    capability: 'Runs more models',
    speed:      'Faster',
    value:      'Better value',
    marginal:   'Slightly ahead',
  };
  const badgeColour: Record<RecommendReason, string> = {
    capability: isDark ? 'text-cyan-400'   : 'text-cyan-600',
    speed:      isDark ? 'text-emerald-400': 'text-emerald-600',
    value:      isDark ? 'text-amber-400'  : 'text-amber-600',
    marginal:   isDark ? 'text-gray-400'   : 'text-gray-500',
  };

  function gpuChip(side: 'A' | 'B') {
    const me   = side === 'A' ? gpuA : gpuB;
    const isWinner = winner === side;
    const ring = isWinner
      ? (reason === 'value'
          ? (isDark ? 'ring-2 ring-amber-500/40' : 'ring-2 ring-amber-300')
          : (isDark ? 'ring-2 ring-cyan-500/40'  : 'ring-2 ring-cyan-300'))
      : '';
    return (
      <div className={`rounded-2xl border p-6 ${cardBase} ${ring}`}>
        <div className="flex items-baseline justify-between mb-2">
          <span className={`inline-block px-2 py-0.5 text-xs font-mono rounded ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
            GPU {side}
          </span>
          {isWinner && reason && (
            <span className={`text-xs font-semibold ${badgeColour[reason]}`}>
              {badgeLabel[reason]}
            </span>
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
          {me.price_usd != null && me.price_usd > 0 && (
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

  function cellContent(compat: CompatResult) {
    if (!compat.canRun) return <span className={muted}>Too large</span>;
    return (
      <span className={`${accent} font-semibold`}>
        {compat.estimatedTps} tok/s · {compat.bestQuant}
      </span>
    );
  }

  // Winner column for each row
  function winnerCell(r: CompareRow) {
    const w = rowWinner(r);
    if (!r.a.canRun && !r.b.canRun) {
      return <span className={muted}>—</span>;
    }
    if (w === 'A') {
      return <span className={`font-semibold ${accent}`}>A {r.b.canRun ? '(faster)' : '(only)'}</span>;
    }
    if (w === 'B') {
      return <span className={`font-semibold ${accent}`}>B {r.a.canRun ? '(faster)' : '(only)'}</span>;
    }
    // Tie — show the speed delta so users understand why it's a tie
    const delta = speedDeltaLabel(r);
    return (
      <span className={`text-xs ${muted}`}>
        {delta === 'equal' ? 'equal' : <span>≈tie&nbsp;<span className="font-mono">{delta}</span></span>}
      </span>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-cyan-950/40' : 'bg-cyan-50/70'}`}>
      <Navbar />
      <BackButton />

      <PageHero
        title={`${gpuA.name} vs ${gpuB.name}`}
        subtitle="How these GPUs compare for running local LLMs — VRAM, bandwidth, price, and per-model fit across popular open-weights models."
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
          {gpuA.price_usd && gpuB.price_usd && (
            <span className={`px-3 py-1 rounded-full font-medium ${isDark ? 'bg-gray-800/60 text-gray-300 border border-gray-700' : 'bg-white/80 text-gray-700 border border-gray-200'}`}>
              ${gpuA.price_usd.toLocaleString()} vs ${gpuB.price_usd.toLocaleString()}
            </span>
          )}
        </div>
      </PageHero>

      <main className="flex-1 mx-auto max-w-5xl px-4 py-12 w-full">
        <Reveal>
          <section className="grid md:grid-cols-2 gap-4 mb-8">
            {gpuChip('A')}
            {gpuChip('B')}
          </section>
        </Reveal>

        {/* ── Short answer ──────────────────────────────────────────────── */}
        <Reveal delay={120}>
          <section className={`rounded-2xl border p-5 mb-6 ${cardBase}`}>
            <h2 className={`text-lg font-bold mb-2 ${text}`}>The short answer</h2>
            <p className={`${muted} leading-relaxed mb-4`}>{prose}</p>

            {/* Win / tie scorecard */}
            <div className={`flex flex-wrap gap-4 text-sm pt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              {/* Capability wins */}
              {(rec.runWinsA > 0 || rec.runWinsB > 0) && (
                <>
                  {rec.runWinsA > 0 && (
                    <div>
                      <span className={`font-semibold ${accent}`}>{rec.runWinsA}</span>
                      <span className={` ${muted}`}> model{rec.runWinsA !== 1 ? 's' : ''} A runs, B can&apos;t</span>
                    </div>
                  )}
                  {rec.runWinsB > 0 && (
                    <div>
                      <span className={`font-semibold ${accent}`}>{rec.runWinsB}</span>
                      <span className={` ${muted}`}> model{rec.runWinsB !== 1 ? 's' : ''} B runs, A can&apos;t</span>
                    </div>
                  )}
                </>
              )}
              {/* Speed wins */}
              {rec.speedWinsA > 0 && (
                <div>
                  <span className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{rec.speedWinsA}</span>
                  <span className={` ${muted}`}> model{rec.speedWinsA !== 1 ? 's' : ''} A is 20%+ faster</span>
                </div>
              )}
              {rec.speedWinsB > 0 && (
                <div>
                  <span className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{rec.speedWinsB}</span>
                  <span className={` ${muted}`}> model{rec.speedWinsB !== 1 ? 's' : ''} B is 20%+ faster</span>
                </div>
              )}
              {/* Ties */}
              <div>
                <span className={`font-semibold ${text}`}>{rec.ties}</span>
                <span className={` ${muted}`}> equal (both run, &lt;20% diff)</span>
              </div>
              {rec.neitherRuns > 0 && (
                <div>
                  <span className={`font-semibold ${muted}`}>{rec.neitherRuns}</span>
                  <span className={` ${muted}`}> too large for either</span>
                </div>
              )}
            </div>

            {/* Value callout when that's the deciding factor */}
            {reason === 'value' && winner && rec.priceDiff > 0 && (
              <div className={`mt-3 pt-3 border-t text-sm ${isDark ? 'border-gray-700 text-amber-300' : 'border-gray-100 text-amber-700'}`}>
                <span className="font-semibold">
                  {winner === 'A' ? gpuA.name : gpuB.name}
                </span>
                {' '}saves you{' '}
                <span className="font-semibold">
                  ${rec.priceDiff.toLocaleString()} ({Math.round(rec.priceGapPct * 100)}% cheaper)
                </span>
                {' '}for the same real-world performance.
              </div>
            )}
          </section>
        </Reveal>

        {/* ── Model-by-model table ──────────────────────────────────────── */}
        <Reveal delay={200}>
          <section className={`rounded-2xl border overflow-hidden ${cardBase}`}>
            <div className={`px-5 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-bold ${text}`}>Model-by-model fit</h2>
              <p className={`text-sm ${muted}`}>
                Click any row for the full breakdown.
                Tie% shown in the Winner column when both GPUs run the model within 20% of each other.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className={`w-full text-sm ${tableBg}`}>
                <thead className={isDark ? 'bg-gray-800/50' : 'bg-gray-100'}>
                  <tr className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                    <th className="text-left px-4 py-3 font-semibold">Model</th>
                    <th className="text-left px-4 py-3 font-semibold">{gpuA.name}</th>
                    <th className="text-left px-4 py-3 font-semibold">{gpuB.name}</th>
                    <th className="text-left px-4 py-3 font-semibold">Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.model.id}
                      className={`border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`}
                    >
                      <td className={`px-4 py-3 ${text}`}>
                        <div className="font-semibold">{r.model.name}</div>
                        <div className={`text-xs ${muted}`}>{r.model.params_b}B · {r.model.family}</div>
                      </td>
                      <td className="px-4 py-3">{cellContent(r.a)}</td>
                      <td className="px-4 py-3">{cellContent(r.b)}</td>
                      <td className="px-4 py-3">{winnerCell(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </Reveal>

        <section className="mt-8 text-center">
          <p className={muted}>
            Want a different pairing?{' '}
            <Link href="/compare" className={`ml-1 underline ${accent}`}>Browse all comparisons →</Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
