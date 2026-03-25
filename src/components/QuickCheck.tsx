'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { recommend } from '@/lib/engine';
import type { GPU, Model, ScoredModel, RecommendationInput } from '@/lib/types';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Use-case buckets for the result card                              */
/* ------------------------------------------------------------------ */
type Bucket = { label: string; emoji: string; capabilities: string[] };

const BUCKETS: Bucket[] = [
  { label: 'Chat & Assistant', emoji: '💬', capabilities: ['chat'] },
  { label: 'Coding',           emoji: '👨‍💻', capabilities: ['coding'] },
  { label: 'Reasoning',        emoji: '🧠', capabilities: ['reasoning'] },
  { label: 'Creative Writing',  emoji: '✍️', capabilities: ['creative'] },
  { label: 'Vision & Images',   emoji: '👁️', capabilities: ['vision'] },
];

/* ------------------------------------------------------------------ */
/*  RAM presets                                                       */
/* ------------------------------------------------------------------ */
const RAM_OPTIONS = [8, 16, 32, 64, 128];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function QuickCheck() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  /* ── data ───────────────────────────────────────────────── */
  const [gpus, setGpus] = useState<GPU[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [allGpusSorted, setAllGpusSorted] = useState<GPU[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/data/gpus.json').then(r => r.json()),
      fetch('/data/models.json').then(r => r.json()),
    ]).then(([g, m]) => {
      setGpus(g);
      setModels(m);
      // Sort consumer GPUs by VRAM desc for the dropdown, exclude server GPUs
      const consumer = (g as GPU[]).filter(
        gpu => gpu.availability !== 'discontinued' || gpu.vram_mb <= 49152
      ).sort((a, b) => {
        // Popular consumer GPUs first
        const vendorOrder = (v: string) => v === 'nvidia' ? 0 : v === 'amd' ? 1 : v === 'apple' ? 2 : 3;
        if (vendorOrder(a.vendor) !== vendorOrder(b.vendor)) return vendorOrder(a.vendor) - vendorOrder(b.vendor);
        return b.vram_mb - a.vram_mb;
      });
      setAllGpusSorted(consumer);
    });
  }, []);

  /* ── user selections ────────────────────────────────────── */
  const [selectedGpu, setSelectedGpu] = useState<GPU | null>(null);
  const [ramGb, setRamGb] = useState(16);
  const [gpuSearch, setGpuSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── GPU search / filtering ─────────────────────────────── */
  const filteredGpus = useMemo(() => {
    if (!gpuSearch.trim()) return allGpusSorted.slice(0, 15);
    const q = gpuSearch.toLowerCase();
    return allGpusSorted
      .filter(g => g.name.toLowerCase().includes(q) || g.aliases?.some(a => a.toLowerCase().includes(q)))
      .slice(0, 15);
  }, [gpuSearch, allGpusSorted]);

  /* ── recommendation engine ──────────────────────────────── */
  const results = useMemo<ScoredModel[]>(() => {
    if (!selectedGpu || models.length === 0) return [];

    const input: RecommendationInput = {
      useCase: 'chat', // start generic
      contextLength: 8192,
      vram_mb: selectedGpu.vram_mb,
      bandwidth_gbps: selectedGpu.bandwidth_gbps,
      fp16_tflops: selectedGpu.fp16_tflops,
      tensor_cores: selectedGpu.tensor_cores ?? selectedGpu.cuda_cores,
      ram_gb: ramGb,
      pcie_gen: selectedGpu.pcie_gen,
      pcie_lanes: selectedGpu.pcie_lanes,
      gpu_tdp_watts: selectedGpu.tdp_watts,
    };

    // Get results for generic 'chat' — this captures most models
    const scored = recommend(models, input);
    // Keep only models that fit in GPU VRAM fully (gpu_full mode) for the quick card
    return scored
      .filter(s => s.inferenceMode === 'gpu_full' || s.inferenceMode === 'gpu_offload')
      .slice(0, 30);
  }, [selectedGpu, ramGb, models]);

  /* ── bucket the results by capability ───────────────────── */
  const bucketedResults = useMemo(() => {
    const buckets: { bucket: Bucket; models: ScoredModel[] }[] = [];
    for (const bucket of BUCKETS) {
      const matching = results.filter(r =>
        r.inferenceMode === 'gpu_full' &&
        bucket.capabilities.some(c => r.model.capabilities.includes(c))
      );
      if (matching.length > 0) {
        // Pick top 3 per bucket, prefer different families
        const seen = new Set<string>();
        const top: ScoredModel[] = [];
        for (const m of matching) {
          if (top.length >= 3) break;
          if (!seen.has(m.model.family)) {
            top.push(m);
            seen.add(m.model.family);
          }
        }
        if (top.length < 3) {
          for (const m of matching) {
            if (top.length >= 3) break;
            if (!top.includes(m)) top.push(m);
          }
        }
        buckets.push({ bucket, models: top });
      }
    }
    return buckets;
  }, [results]);

  /* ── GPU leaderboard rank ───────────────────────────────── */
  const gpuRank = useMemo(() => {
    if (!selectedGpu || allGpusSorted.length === 0) return null;
    // Rank by effective LLM score = vram * bandwidth (higher = better for LLM)
    const ranked = [...allGpusSorted]
      .filter(g => g.vram_mb > 0 && g.bandwidth_gbps > 0)
      .sort((a, b) => (b.vram_mb * b.bandwidth_gbps) - (a.vram_mb * a.bandwidth_gbps));
    const idx = ranked.findIndex(g => g.name === selectedGpu.name);
    if (idx === -1) return null;
    return { rank: idx + 1, total: ranked.length };
  }, [selectedGpu, allGpusSorted]);

  /* ── shareable card ref (for screenshot) ────────────────── */
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    // Build a share URL with GPU name encoded
    if (!selectedGpu) return;
    const url = `${window.location.origin}/search?gpu=${encodeURIComponent(selectedGpu.name)}&ram=${ramGb}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `My ${selectedGpu.name} can run ${results.filter(r => r.inferenceMode === 'gpu_full').length}+ local AI models!`,
          text: `Check what AI models your GPU can run locally`,
          url,
        });
        return;
      } catch { /* fallback to clipboard */ }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [selectedGpu, ramGb, results]);

  /* ── total models that fit in GPU ───────────────────────── */
  const totalFit = results.filter(r => r.inferenceMode === 'gpu_full').length;
  const totalWithOffload = results.length;

  const vramGb = selectedGpu ? (selectedGpu.vram_mb / 1024).toFixed(0) : '0';

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */
  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* ── Input Card ── */}
      <div className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
        isDark
          ? 'border-blue-500/30 bg-gradient-to-br from-gray-900/80 via-blue-950/30 to-purple-950/20 backdrop-blur-sm'
          : 'border-blue-200 bg-gradient-to-br from-white via-blue-50/50 to-purple-50/30'
      }`}>
        {/* Glow */}
        <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
          isDark ? 'bg-blue-500/10' : 'bg-blue-300/20'
        }`} />
        <div className={`absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
          isDark ? 'bg-purple-500/10' : 'bg-purple-300/20'
        }`} />

        <div className="relative p-6 sm:p-8">
          {/* Title */}
          <div className="text-center mb-6">
            <h2 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              What can your GPU run?
            </h2>
            <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Select your GPU and RAM — instant results
            </p>
          </div>

          {/* Dropdowns row */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* GPU Dropdown */}
            <div className="flex-1 relative" ref={dropdownRef}>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Your GPU
              </label>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                  isDark
                    ? 'bg-gray-800/60 border-gray-700 text-white hover:border-blue-500/50 focus:border-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 hover:border-blue-400 focus:border-blue-500'
                } ${dropdownOpen ? (isDark ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-blue-500 ring-1 ring-blue-500/20') : ''}`}
              >
                {selectedGpu ? (
                  <span className="flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      selectedGpu.vendor === 'nvidia' ? 'bg-green-400' :
                      selectedGpu.vendor === 'amd' ? 'bg-red-400' :
                      selectedGpu.vendor === 'apple' ? 'bg-gray-400' : 'bg-blue-400'
                    }`} />
                    {selectedGpu.name}
                    <span className={`ml-auto text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {vramGb} GB
                    </span>
                  </span>
                ) : (
                  <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Select your GPU...</span>
                )}
              </button>

              {dropdownOpen && (
                <div className={`absolute z-50 mt-1 w-full rounded-xl border shadow-2xl overflow-hidden ${
                  isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <div className="p-2">
                    <input
                      type="text"
                      placeholder="Search GPUs..."
                      value={gpuSearch}
                      onChange={e => setGpuSearch(e.target.value)}
                      autoFocus
                      className={`w-full px-3 py-2 rounded-lg text-sm outline-none ${
                        isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-gray-100 text-gray-900 placeholder-gray-400'
                      }`}
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {filteredGpus.map(gpu => (
                      <button
                        key={gpu.name}
                        onClick={() => {
                          setSelectedGpu(gpu);
                          setDropdownOpen(false);
                          setGpuSearch('');
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                          isDark
                            ? 'hover:bg-blue-500/20 text-gray-200'
                            : 'hover:bg-blue-50 text-gray-700'
                        } ${selectedGpu?.name === gpu.name ? (isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600') : ''}`}
                      >
                        <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                          gpu.vendor === 'nvidia' ? 'bg-green-400' :
                          gpu.vendor === 'amd' ? 'bg-red-400' :
                          gpu.vendor === 'apple' ? 'bg-gray-400' : 'bg-blue-400'
                        }`} />
                        <span className="truncate">{gpu.name}</span>
                        <span className={`ml-auto text-xs flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {(gpu.vram_mb / 1024).toFixed(0)} GB
                        </span>
                      </button>
                    ))}
                    {filteredGpus.length === 0 && (
                      <div className={`px-4 py-3 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        No GPUs found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RAM Selector */}
            <div className="sm:w-40">
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                System RAM
              </label>
              <div className="flex gap-1">
                {RAM_OPTIONS.map(gb => (
                  <button
                    key={gb}
                    onClick={() => setRamGb(gb)}
                    className={`flex-1 py-3 rounded-lg text-xs font-medium transition-all ${
                      ramGb === gb
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : isDark
                          ? 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60 border border-gray-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                    }`}
                  >
                    {gb}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Result Card (shareable) ── */}
      {selectedGpu && results.length > 0 && (
        <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500" ref={cardRef}>
          <div className={`relative overflow-hidden rounded-2xl border-2 ${
            isDark
              ? 'border-emerald-500/30 bg-gradient-to-br from-gray-900 via-emerald-950/20 to-blue-950/20'
              : 'border-emerald-200 bg-gradient-to-br from-white via-emerald-50/30 to-blue-50/20'
          }`}>
            {/* Decorative corner glow */}
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none ${
              isDark ? 'bg-emerald-500/8' : 'bg-emerald-300/15'
            }`} />

            <div className="relative p-6 sm:p-8">
              {/* Header with GPU name + stats */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                      selectedGpu.vendor === 'nvidia' ? 'bg-green-400' :
                      selectedGpu.vendor === 'amd' ? 'bg-red-400' :
                      selectedGpu.vendor === 'apple' ? 'bg-gray-400' : 'bg-blue-400'
                    }`} />
                    <h3 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {selectedGpu.name}
                    </h3>
                  </div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {vramGb} GB VRAM · {ramGb} GB RAM
                  </p>
                </div>

                {/* Big stat */}
                <div className="text-center sm:text-right">
                  <div className={`text-4xl sm:text-5xl font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {totalFit}
                  </div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    models fit in VRAM
                    {totalWithOffload > totalFit && (
                      <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                        {' '}(+{totalWithOffload - totalFit} with offload)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Model buckets */}
              <div className="space-y-4">
                {bucketedResults.map(({ bucket, models: topModels }) => (
                  <div key={bucket.label}>
                    <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                      isDark ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {bucket.emoji} {bucket.label}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {topModels.map(sm => (
                        <div
                          key={`${sm.model.id}-${sm.quant.level}`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            isDark
                              ? 'bg-gray-800/80 border border-gray-700/50 text-gray-200'
                              : 'bg-white border border-gray-200 text-gray-700'
                          }`}
                        >
                          <span className="font-medium">{sm.model.name}</span>
                          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {sm.quant.level}
                          </span>
                          {sm.performance.tokensPerSecond && (
                            <span className={`text-xs font-mono ${isDark ? 'text-emerald-400/70' : 'text-emerald-600/70'}`}>
                              ~{Math.round(sm.performance.tokensPerSecond)}t/s
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* GPU Leaderboard Rank */}
              {gpuRank && (
                <div className={`mt-6 flex items-center gap-3 px-4 py-3 rounded-xl ${
                  isDark ? 'bg-gray-800/50 border border-gray-700/50' : 'bg-gray-50 border border-gray-200'
                }`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                    gpuRank.rank <= 10
                      ? 'bg-amber-500/20 text-amber-400'
                      : gpuRank.rank <= 30
                        ? 'bg-blue-500/20 text-blue-400'
                        : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                  }`}>
                    #{gpuRank.rank}
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                      Your GPU ranks <strong>#{gpuRank.rank}</strong> out of {gpuRank.total} for local AI
                    </div>
                    <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Based on VRAM × bandwidth (what matters most for LLM inference)
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/search?gpu=${encodeURIComponent(selectedGpu.name)}&ram=${ramGb}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/20 hover:shadow-xl hover:-translate-y-0.5"
                >
                  See full results
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <button
                  onClick={handleShare}
                  className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
                    isDark
                      ? 'bg-gray-800 border border-gray-700 text-gray-200 hover:bg-gray-700 hover:border-gray-600'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                  }`}
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Link copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Share result
                    </>
                  )}
                </button>
              </div>

              {/* Watermark */}
              <div className={`mt-4 text-center text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>
                localllm-advisor.com
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state — no GPU selected yet */}
      {!selectedGpu && (
        <div className={`mt-6 text-center py-8 rounded-2xl border-2 border-dashed ${
          isDark ? 'border-gray-700/50 text-gray-600' : 'border-gray-200 text-gray-400'
        }`}>
          <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          <p className="text-sm">Pick your GPU to see what you can run</p>
        </div>
      )}

      {/* Selected GPU but no results */}
      {selectedGpu && results.length === 0 && models.length > 0 && (
        <div className={`mt-6 text-center py-8 rounded-2xl border-2 border-dashed ${
          isDark ? 'border-orange-500/30 text-orange-400/70' : 'border-orange-200 text-orange-500'
        }`}>
          <p className="text-sm font-medium">No models fit with {vramGb} GB VRAM + {ramGb} GB RAM</p>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Try selecting more system RAM or check the{' '}
            <Link href="/search" className="underline">full search</Link> for CPU offloading options
          </p>
        </div>
      )}
    </div>
  );
}
