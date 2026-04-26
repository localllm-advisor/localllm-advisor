'use client';

import { useMemo, useState } from 'react';

/**
 * Cost-savings widget — the "screenshot bait" for the results page.
 *
 * Compares the cost of running a chosen open-weights model locally (mostly
 * GPU electricity + amortised hardware) vs. the equivalent volume on a
 * commercial API (ChatGPT Plus, Claude Pro, OpenAI API metered).
 *
 * The model is intentionally simple, *defensible*, and built so the savings
 * number isn't fabricated:
 *
 *   localCostPerMonth = (gpuTdpW / 1000) * usageHoursPerDay * 30 * kwhPrice
 *                       + amortised hardware cost
 *   apiCostPerMonth_metered = tokensPerDay * 30 * (input/output blended rate)
 *   apiCostPerMonth_subscription = $20–25 for Plus/Pro tiers
 *
 * We default to a *conservative* tokensPerDay (50 K — about an hour of
 * heavy ChatGPT use) so the headline number doesn't feel inflated.
 *
 * All knobs are user-tweakable. The widget exposes "share as text" + "copy
 * URL" so people can paste their savings into Reddit / Twitter.
 */

interface Props {
  modelName: string;
  /** Power draw of the GPU during inference, watts. */
  gpuTdpW?: number;
  /** Total hardware cost amortised over expected lifetime (months). */
  hardwareCostUsd?: number;
  hardwareLifetimeMonths?: number;
  /** Optional model-specific input/output token cost (per 1M) of a comparable API. */
  apiInputUsdPerM?: number;   // e.g. GPT-4o ~ 2.5
  apiOutputUsdPerM?: number;  // e.g. GPT-4o ~ 10
  /** Compact (single-line) presentation for tight UIs. */
  compact?: boolean;
}

export default function CostSavingsBadge({
  modelName,
  gpuTdpW = 250,
  hardwareCostUsd = 0,
  hardwareLifetimeMonths = 36,
  apiInputUsdPerM = 2.5,
  apiOutputUsdPerM = 10,
  compact = false,
}: Props) {
  // User knobs
  const [tokensPerDay, setTokensPerDay] = useState(50_000);    // input+output combined
  const [usageHoursPerDay, setUsageHoursPerDay] = useState(2); // hours of active inference
  const [kwhPrice, setKwhPrice] = useState(0.16);              // US average ~$0.16/kWh
  const [comparison, setComparison] = useState<'plus' | 'metered'>('plus');

  const numbers = useMemo(() => {
    const days = 30;

    // --- LOCAL COST ---
    const energyKwhPerMonth = (gpuTdpW / 1000) * usageHoursPerDay * days;
    const electricityPerMonth = energyKwhPerMonth * kwhPrice;
    const hardwareAmortPerMonth = hardwareCostUsd > 0
      ? hardwareCostUsd / Math.max(1, hardwareLifetimeMonths)
      : 0;
    const localPerMonth = electricityPerMonth + hardwareAmortPerMonth;

    // --- API / SUBSCRIPTION COST ---
    let apiPerMonth: number;
    let apiLabel: string;
    if (comparison === 'plus') {
      // ChatGPT Plus / Claude Pro flat pricing (closest to "I use it heavily")
      apiPerMonth = 20;
      apiLabel = 'ChatGPT Plus / Claude Pro';
    } else {
      // Metered API: assume 50/50 input vs output split for simplicity
      const inputMTok = (tokensPerDay * 0.5 * days) / 1_000_000;
      const outputMTok = (tokensPerDay * 0.5 * days) / 1_000_000;
      apiPerMonth = inputMTok * apiInputUsdPerM + outputMTok * apiOutputUsdPerM;
      apiLabel = 'GPT-4o-class API';
    }

    const savedPerMonth = Math.max(0, apiPerMonth - localPerMonth);
    const savedPerYear = savedPerMonth * 12;

    return {
      localPerMonth, apiPerMonth, apiLabel,
      savedPerMonth, savedPerYear,
      energyKwhPerMonth, electricityPerMonth, hardwareAmortPerMonth,
    };
  }, [
    tokensPerDay, usageHoursPerDay, kwhPrice, comparison,
    gpuTdpW, hardwareCostUsd, hardwareLifetimeMonths,
    apiInputUsdPerM, apiOutputUsdPerM,
  ]);

  const fmt = (n: number) => `$${n.toFixed(n >= 100 ? 0 : 2)}`;

  const shareText = `Running ${modelName} locally instead of ${numbers.apiLabel} would save me ~${fmt(numbers.savedPerYear)}/year.\n\nlocalllm-advisor.com`;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-500 text-sm font-semibold">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l1.5 4.5h4.5l-3.6 2.6 1.4 4.5L8 9.8l-3.8 2.8 1.4-4.5L2 5.5h4.5z"/></svg>
        Save {fmt(numbers.savedPerYear)}/yr vs {numbers.apiLabel}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 my-4">
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-bold text-emerald-500">
            You&apos;d save ~{fmt(numbers.savedPerYear)} / year
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Running <strong>{modelName}</strong> locally vs paying for{' '}
            <strong>{numbers.apiLabel}</strong>.
          </p>
        </div>
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => setComparison('plus')}
            className={`px-2.5 py-1 rounded-md border ${comparison === 'plus' ? 'bg-emerald-500 text-white border-emerald-500' : 'border-gray-300 dark:border-gray-700'}`}
          >
            Plus / Pro
          </button>
          <button
            onClick={() => setComparison('metered')}
            className={`px-2.5 py-1 rounded-md border ${comparison === 'metered' ? 'bg-emerald-500 text-white border-emerald-500' : 'border-gray-300 dark:border-gray-700'}`}
          >
            Metered API
          </button>
        </div>
      </header>

      <div className="grid sm:grid-cols-3 gap-3 mt-4 text-sm">
        <Stat label="API / sub. cost" value={`${fmt(numbers.apiPerMonth)} / mo`} />
        <Stat label="Local cost"      value={`${fmt(numbers.localPerMonth)} / mo`} />
        <Stat label="Net savings"     value={`${fmt(numbers.savedPerMonth)} / mo`} highlight />
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          Tweak assumptions
        </summary>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <Slider
            label="Hours of active inference / day"
            value={usageHoursPerDay}
            min={0.25} max={12} step={0.25}
            onChange={setUsageHoursPerDay}
            display={`${usageHoursPerDay} h`}
          />
          {comparison === 'metered' && (
            <Slider
              label="Tokens / day (input + output)"
              value={tokensPerDay}
              min={5_000} max={2_000_000} step={5_000}
              onChange={setTokensPerDay}
              display={`${(tokensPerDay / 1000).toFixed(0)}K`}
            />
          )}
          <Slider
            label="Electricity ($/kWh)"
            value={kwhPrice}
            min={0.05} max={0.50} step={0.01}
            onChange={setKwhPrice}
            display={`$${kwhPrice.toFixed(2)}`}
          />
          <div className="text-xs text-gray-500 self-end">
            Assumes {gpuTdpW}W GPU TDP. Hardware amortisation:&nbsp;
            {hardwareCostUsd > 0 ? `${fmt(numbers.hardwareAmortPerMonth)}/mo` : 'not included'}
          </div>
        </div>
      </details>

      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(shareText);
          } catch { /* ignore — user can long-press select */ }
        }}
        className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600"
        aria-label="Copy savings as shareable text"
      >
        Copy as tweet / Reddit
      </button>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? 'bg-emerald-500/10 border border-emerald-500/40' : 'bg-gray-100 dark:bg-gray-800/50'}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-lg font-bold ${highlight ? 'text-emerald-500' : ''}`}>{value}</div>
    </div>
  );
}

function Slider({
  label, value, min, max, step, onChange, display,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; display: string;
}) {
  return (
    <label className="block">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">{label}</span>
        <span className="font-mono">{display}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full mt-1 accent-emerald-500"
      />
    </label>
  );
}
