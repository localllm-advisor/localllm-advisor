'use client';

import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';
import Navbar from '@/components/Navbar';
import SiteFooter from '@/components/SiteFooter';
import CostSavingsBadge from '@/components/CostSavingsBadge';
import { useState, useEffect } from 'react';

interface QuantResult {
  level: string;
  vram_mb: number;
  fits: boolean;
  quality: number;
}

interface CompatData {
  gpu: { name: string; vram_mb: number; bandwidth_gbps: number; price_usd?: number; vendor: string; tdp_watts?: number };
  model: { name: string; params_b: number; family: string; context_length: number; capabilities: string[]; architecture: string };
  canRun: boolean;
  bestQuant: string | null;
  allQuants: QuantResult[];
  vramUsagePercent: number;
  estimatedTps: number;
  verdict: string;
  tips: string[];
}

function fromSlug(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-\.]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export default function GpuModelClient({ gpuSlug, modelSlug }: { gpuSlug: string; modelSlug: string }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [data, setData] = useState<CompatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const basePath = process.env.NODE_ENV === 'production' ? '/localllm-advisor' : '';
        const [modelsRes, gpusRes] = await Promise.all([
          fetch(`${basePath}/data/models.json`),
          fetch(`${basePath}/data/gpus.json`),
        ]);
        const models = await modelsRes.json();
        const gpus = await gpusRes.json();

        if (cancelled) return;

        // Find matching GPU and model by slug
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const gpu = gpus.find((g: any) => toSlug(g.name) === gpuSlug);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const model = models.find((m: any) => toSlug(m.name) === modelSlug || m.id === modelSlug);

        if (!gpu || !model) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        // Calculate compatibility
        const vramMb = gpu.vram_mb;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allQuants = (model.quantizations || []).map((q: any) => ({
          level: q.level,
          vram_mb: q.vram_mb,
          fits: q.vram_mb <= vramMb * 0.95,
          quality: q.quality,
        })).sort((a: QuantResult, b: QuantResult) => b.quality - a.quality);

        const fittingQuants = allQuants.filter((q: QuantResult) => q.fits);
        const bestQuant = fittingQuants.length > 0 ? fittingQuants[0] : null;

        const bestVram = bestQuant ? bestQuant.vram_mb : (allQuants[allQuants.length - 1]?.vram_mb || 0);
        const modelSizeGb = bestVram / 1024;
        const estimatedTps = modelSizeGb > 0 ? Math.round((gpu.bandwidth_gbps / modelSizeGb) * 0.85) : 0;
        const vramUsagePercent = bestQuant ? Math.round((bestQuant.vram_mb / vramMb) * 100) : 0;

        const tips: string[] = [];
        let verdict = '';

        if (!bestQuant) {
          const smallest = allQuants[allQuants.length - 1];
          verdict = `The ${gpu.name} does not have enough VRAM to run ${model.name}. The smallest quantization (${smallest?.level || 'N/A'}) requires ${Math.round((smallest?.vram_mb || 0) / 1024)}GB, but the ${gpu.name} only has ${Math.round(vramMb / 1024)}GB.`;
          tips.push(`Consider a GPU with at least ${Math.ceil((smallest?.vram_mb || 0) / 1024)}GB VRAM.`);
          tips.push('You could try CPU-only inference with llama.cpp, but it will be much slower.');
          if (model.params_b > 13) tips.push(`Look at smaller models in the ${model.family} family.`);
        } else if (vramUsagePercent > 90) {
          verdict = `The ${gpu.name} can technically run ${model.name} at ${bestQuant.level}, but it will be tight (${vramUsagePercent}% VRAM usage). Expect around ${estimatedTps} tokens/sec.`;
          tips.push('Close other GPU-intensive applications to free VRAM.');
          tips.push('Use a lower quantization for more headroom.');
        } else if (vramUsagePercent > 70) {
          verdict = `The ${gpu.name} runs ${model.name} well at ${bestQuant.level} (${vramUsagePercent}% VRAM). Expected speed: ~${estimatedTps} tokens/sec.`;
          tips.push(`You can comfortably use ${bestQuant.level} quantization for good quality.`);
        } else {
          verdict = `The ${gpu.name} handles ${model.name} easily at ${bestQuant.level} (only ${vramUsagePercent}% VRAM). Expected speed: ~${estimatedTps} tokens/sec.`;
          tips.push('Plenty of VRAM headroom — you can use the highest quality quantization.');
        }

        setData({
          gpu,
          model,
          canRun: !!bestQuant,
          bestQuant: bestQuant?.level || null,
          allQuants,
          vramUsagePercent,
          estimatedTps,
          verdict,
          tips,
        });
        setLoading(false);
      } catch {
        setNotFound(true);
        setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [gpuSlug, modelSlug]);

  const gpuDisplay = fromSlug(gpuSlug);
  const modelDisplay = fromSlug(modelSlug);
  const pageTitle = `Can ${gpuDisplay} Run ${modelDisplay}?`;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className={isDark ? 'text-gray-400' : 'text-gray-600'}>Loading compatibility data...</div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              GPU or Model Not Found
            </h1>
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
              We couldn&apos;t find that GPU/model combination.
            </p>
            <Link href="/search" className="text-blue-500 hover:text-blue-400 underline">
              Try our model search instead
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8 space-y-8">
        {/* Breadcrumb */}
        <nav className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/search" className="hover:underline">Search</Link>
          <span className="mx-2">/</span>
          <span className={isDark ? 'text-white' : 'text-gray-900'}>{data.gpu.name} + {data.model.name}</span>
        </nav>

        {/* Title */}
        <div>
          <h1 className={`text-3xl sm:text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {pageTitle}
          </h1>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {data.model.name} ({data.model.params_b}B parameters) on {data.gpu.name} ({Math.round(data.gpu.vram_mb / 1024)}GB VRAM)
          </p>
        </div>

        {/* Verdict Card */}
        <div className={`rounded-xl p-6 border-2 ${
          data.canRun
            ? (isDark ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-300')
            : (isDark ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-300')
        }`}>
          <div className="flex items-start gap-4">
            <div className="text-4xl">
              {data.canRun ? '\u2705' : '\u274C'}
            </div>
            <div>
              <h2 className={`text-xl font-bold mb-2 ${
                data.canRun
                  ? (isDark ? 'text-green-400' : 'text-green-700')
                  : (isDark ? 'text-red-400' : 'text-red-700')
              }`}>
                {data.canRun ? 'Yes!' : 'Not Enough VRAM'}
              </h2>
              <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                {data.verdict}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {data.canRun && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Best Quant', value: data.bestQuant || '-' },
              { label: 'VRAM Usage', value: `${data.vramUsagePercent}%` },
              { label: 'Est. Speed', value: `~${data.estimatedTps} tok/s` },
              { label: 'Quant Options', value: `${data.allQuants.filter(q => q.fits).length} of ${data.allQuants.length}` },
            ].map((stat) => (
              <div key={stat.label} className={`rounded-lg p-4 text-center ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stat.value}</div>
                <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Cost Savings Badge — viral hook */}
        {data.canRun && (
          <CostSavingsBadge
            modelName={data.model.name}
            gpuTdpW={data.gpu.tdp_watts ?? 250}
            hardwareCostUsd={data.gpu.price_usd ?? 0}
          />
        )}

        {/* Quantization Table */}
        <div>
          <h3 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            All Quantization Options
          </h3>
          <div className={`rounded-lg overflow-hidden border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <table className="w-full text-sm">
              <thead className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-4 py-3 text-left ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Quantization</th>
                  <th className={`px-4 py-3 text-right ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>VRAM Required</th>
                  <th className={`px-4 py-3 text-right ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Quality</th>
                  <th className={`px-4 py-3 text-center ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Fits?</th>
                </tr>
              </thead>
              <tbody>
                {data.allQuants.map((q) => (
                  <tr key={q.level} className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} ${
                    q.fits
                      ? (q.level === data.bestQuant ? (isDark ? 'bg-green-900/20' : 'bg-green-50') : '')
                      : (isDark ? 'bg-red-900/10 text-gray-500' : 'bg-red-50/50 text-gray-400')
                  }`}>
                    <td className={`px-4 py-2.5 font-mono ${q.level === data.bestQuant ? 'font-bold' : ''}`}>
                      {q.level}
                      {q.level === data.bestQuant && (
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-green-700 text-green-200' : 'bg-green-200 text-green-800'}`}>
                          best
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">{(q.vram_mb / 1024).toFixed(1)} GB</td>
                    <td className="px-4 py-2.5 text-right">{Math.round(q.quality * 100)}%</td>
                    <td className="px-4 py-2.5 text-center">{q.fits ? '\u2705' : '\u274C'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tips */}
        {data.tips.length > 0 && (
          <div className={`rounded-xl p-6 ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-blue-50 border border-blue-200'}`}>
            <h3 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Tips
            </h3>
            <ul className="space-y-2">
              {data.tips.map((tip, i) => (
                <li key={i} className={`flex items-start gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className="mt-1 text-blue-500">&bull;</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Hardware Specs */}
        <div className="grid sm:grid-cols-2 gap-6">
          <div className={`rounded-xl p-6 ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
            <h3 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {data.gpu.name}
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className={isDark ? 'text-gray-400' : 'text-gray-600'}>VRAM</dt>
                <dd className={isDark ? 'text-white' : 'text-gray-900'}>{Math.round(data.gpu.vram_mb / 1024)} GB</dd>
              </div>
              <div className="flex justify-between">
                <dt className={isDark ? 'text-gray-400' : 'text-gray-600'}>Bandwidth</dt>
                <dd className={isDark ? 'text-white' : 'text-gray-900'}>{data.gpu.bandwidth_gbps} GB/s</dd>
              </div>
              {data.gpu.price_usd && (
                <div className="flex justify-between">
                  <dt className={isDark ? 'text-gray-400' : 'text-gray-600'}>Price</dt>
                  <dd className={isDark ? 'text-white' : 'text-gray-900'}>${data.gpu.price_usd}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className={`rounded-xl p-6 ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
            <h3 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {data.model.name}
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className={isDark ? 'text-gray-400' : 'text-gray-600'}>Parameters</dt>
                <dd className={isDark ? 'text-white' : 'text-gray-900'}>{data.model.params_b}B</dd>
              </div>
              <div className="flex justify-between">
                <dt className={isDark ? 'text-gray-400' : 'text-gray-600'}>Architecture</dt>
                <dd className={isDark ? 'text-white' : 'text-gray-900'}>{data.model.architecture}</dd>
              </div>
              <div className="flex justify-between">
                <dt className={isDark ? 'text-gray-400' : 'text-gray-600'}>Context</dt>
                <dd className={isDark ? 'text-white' : 'text-gray-900'}>{(data.model.context_length / 1024).toFixed(0)}K tokens</dd>
              </div>
              <div className="flex justify-between">
                <dt className={isDark ? 'text-gray-400' : 'text-gray-600'}>Capabilities</dt>
                <dd className={isDark ? 'text-white' : 'text-gray-900'}>{data.model.capabilities.join(', ')}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <Link
            href="/search/model"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all"
          >
            Find More Models for Your GPU
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

      </main>

      <SiteFooter />
    </div>
  );
}
