'use client';

import { ScoredModel } from '@/lib/types';
import { getCloudProviderUrl } from '@/lib/affiliateLinks';
import { getActiveParamsB } from '@/lib/vram';

// ─── Thresholds ──────────────────────────────────────────────────────────────
// Show the cloud-fallback card when the selected model is:
//   • slower than SPEED_THRESHOLD tok/s on the user's GPU  (below conversational)
//   • OR using more than VRAM_THRESHOLD % of available VRAM (almost no headroom)

export const CLOUD_SPEED_THRESHOLD = 8;   // tok/s
export const CLOUD_VRAM_THRESHOLD  = 85;  // %

// ─── Instance catalogue ───────────────────────────────────────────────────────
// Representative cloud instances. Prices are typical spot/on-demand rates
// (2024) and intentionally conservative — actual prices vary.
//
// bandwidth_gbps is HBM / GDDR peak bandwidth from official spec sheets.
// We use the same physics formula as the rest of the app:
//   tok/s ≈ bandwidth_gbps / model_weight_size_GB

interface CloudInstance {
  name: string;
  provider: 'RunPod' | 'Vast.ai';
  providerKey: string;    // key passed to getCloudProviderUrl()
  bandwidth_gbps: number;
  vram_gb: number;
  price_per_hr: number;
}

const CLOUD_INSTANCES: CloudInstance[] = [
  // cheap option — great for models ≤ 22 GB
  { name: 'RTX 4090',   provider: 'Vast.ai', providerKey: 'vast.ai', bandwidth_gbps: 1008, vram_gb: 24,  price_per_hr: 0.49 },
  // mid-range — covers models up to ~44 GB
  { name: 'L40S',       provider: 'Vast.ai', providerKey: 'vast.ai', bandwidth_gbps: 864,  vram_gb: 48,  price_per_hr: 0.99 },
  // high-end — covers all consumer models at full quality
  { name: 'A100 80GB',  provider: 'RunPod',  providerKey: 'runpod',  bandwidth_gbps: 2000, vram_gb: 80,  price_per_hr: 1.89 },
  // fastest available
  { name: 'H100 80GB',  provider: 'RunPod',  providerKey: 'runpod',  bandwidth_gbps: 3350, vram_gb: 80,  price_per_hr: 3.49 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function shouldShowCloudFallback(scored: ScoredModel): boolean {
  const tps = scored.performance.tokensPerSecond;
  return (tps !== null && tps < CLOUD_SPEED_THRESHOLD) ||
         scored.memory.vramPercent > CLOUD_VRAM_THRESHOLD;
}

function estimateTps(inst: CloudInstance, scored: ScoredModel): number {
  // For MoE models, decode reads only the active expert weights per token
  const activeParamsB = getActiveParamsB(scored.model);
  const activeSizeGb = (activeParamsB * scored.quant.bpw) / 8;
  if (activeSizeGb <= 0) return 0;
  return Math.round(inst.bandwidth_gbps / activeSizeGb);
}

// ─── Component ───────────────────────────────────────────────────────────────

interface CloudFallbackCardProps {
  scored: ScoredModel;
}

export default function CloudFallbackCard({ scored }: CloudFallbackCardProps) {
  const modelSizeGb = (scored.model.params_b * scored.quant.bpw) / 8;

  // Only consider instances with enough VRAM (with 10 % safety margin)
  const fitting = CLOUD_INSTANCES.filter(c => c.vram_gb >= modelSizeGb * 1.1);
  if (fitting.length === 0) return null;

  // Show cheapest + fastest (deduplicated)
  const cheapest = fitting.reduce((a, b) => a.price_per_hr <= b.price_per_hr ? a : b);
  const fastest  = fitting.reduce((a, b) => a.bandwidth_gbps >= b.bandwidth_gbps ? a : b);
  const suggestions = cheapest.name === fastest.name ? [cheapest] : [cheapest, fastest];

  // Build the reason string
  const tps = scored.performance.tokensPerSecond;
  const vramPct = scored.memory.vramPercent;
  const reason =
    tps !== null && tps < CLOUD_SPEED_THRESHOLD
      ? `${tps} tok/s on your GPU — below conversational speed`
      : `${Math.round(vramPct)}% of your VRAM — very little headroom`;

  return (
    <div className="mt-3 rounded-lg border border-sky-500/20 bg-sky-950/20 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <svg
            className="w-3.5 h-3.5 text-sky-400 shrink-0"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
          <span className="text-xs font-semibold text-sky-400">Run on cloud</span>
        </div>
        {/* Transparent affiliate disclosure */}
        <span className="text-[10px] text-gray-600 italic">affiliate</span>
      </div>

      {/* Reason */}
      <p className="text-[11px] text-gray-500 mb-2">{reason}</p>

      {/* Instance cards */}
      <div className={`grid gap-2 ${suggestions.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {suggestions.map(inst => {
          const estTps = estimateTps(inst, scored);
          const href   = getCloudProviderUrl(inst.providerKey);

          return (
            <a
              key={inst.name}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-0.5 rounded-md bg-gray-800 hover:bg-gray-700/80 border border-gray-700 hover:border-sky-500/30 px-3 py-2 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white">{inst.name}</span>
                <span className="text-[10px] text-gray-500">{inst.provider}</span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-sm font-bold text-green-400">~{estTps} tok/s</span>
                <span className="text-xs text-gray-400">~${inst.price_per_hr.toFixed(2)}/hr</span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}