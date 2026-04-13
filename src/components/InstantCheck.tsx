'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { GPU, Model, UseCase, ScoredModel } from '@/lib/types';
import { recommend } from '@/lib/engine';
import { detectHardwareAsync, matchGpuFromRenderer, parseGpuRenderer } from '@/lib/detectHardware';
import Link from 'next/link';

/* ── Use-case config ─────────────────────────────────────────────── */
const USE_CASES: { id: UseCase; label: string; icon: string; color: string }[] = [
  { id: 'chat',      label: 'Chat',      icon: '💬', color: 'blue' },
  { id: 'coding',    label: 'Coding',    icon: '💻', color: 'green' },
  { id: 'reasoning', label: 'Reasoning', icon: '🧠', color: 'purple' },
  { id: 'creative',  label: 'Creative',  icon: '✨', color: 'pink' },
  { id: 'roleplay',  label: 'Roleplay',  icon: '🎭', color: 'orange' },
  { id: 'vision',    label: 'Vision',    icon: '👁️', color: 'cyan' },
];

/* ── GPU ranking helper ──────────────────────────────────────────── */
function computeGpuRank(selectedGpu: GPU, allGpus: GPU[]): { rank: number; total: number } {
  // Rank by effective LLM throughput proxy: bandwidth * vram weighting
  const scored = allGpus
    .filter(g => g.vram_mb > 0 && g.bandwidth_gbps > 0)
    .map(g => ({
      name: g.name,
      // Bandwidth is king for LLM inference, VRAM is the gate
      score: g.bandwidth_gbps * Math.log2(1 + g.vram_mb / 1024),
    }))
    .sort((a, b) => b.score - a.score);

  const rank = scored.findIndex(s => s.name === selectedGpu.name) + 1;
  return { rank: rank || scored.length, total: scored.length };
}

/* ── Share text builder ──────────────────────────────────────────── */
function buildShareText(
  gpu: GPU,
  results: Map<UseCase, ScoredModel>,
  rank: { rank: number; total: number },
): string {
  const lines: string[] = [
    `🖥️ ${gpu.name} (${gpu.vram_mb / 1024}GB) — Local AI Capability Report`,
    `📊 Ranks #${rank.rank} of ${rank.total} GPUs for local LLM inference`,
    '',
  ];

  for (const uc of USE_CASES) {
    const r = results.get(uc.id);
    if (!r) continue;
    const speed = r.performance.tokensPerSecond
      ? `${Math.round(r.performance.tokensPerSecond)} tok/s`
      : '—';
    lines.push(`${uc.icon} ${uc.label}: ${r.model.name} (${r.quant.level}) @ ${speed}`);
  }

  lines.push('', '🔗 Check yours → https://www.localllm-advisor.com');
  return lines.join('\n');
}

/* ── Main component ──────────────────────────────────────────────── */
export default function InstantCheck() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  /* Data */
  const [gpus, setGpus] = useState<GPU[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  /* GPU selection */
  const [selectedGpu, setSelectedGpu] = useState<GPU | null>(null);
  const [detectedLabel, setDetectedLabel] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* Results */
  const [useCaseResults, setUseCaseResults] = useState<Map<UseCase, ScoredModel> | null>(null);
  const [copied, setCopied] = useState(false);

  /* ── Load data ──────────────────────────────────────────────── */
  useEffect(() => {
    async function load() {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const [gRes, mRes] = await Promise.all([
          fetch(`${basePath}/data/gpus.json`),
          fetch(`${basePath}/data/models.json`),
        ]);
        if (!gRes.ok || !mRes.ok) throw new Error('Failed to load');
        const [gData, mData] = await Promise.all([gRes.json(), mRes.json()]);
        setGpus(gData);
        setModels(mData);
      } catch {
        /* silent — results just won't show */
      } finally {
        setDataLoading(false);
      }
    }
    load();
  }, []);

  /* ── Auto-detect GPU once data is ready ─────────────────────── */
  useEffect(() => {
    if (dataLoading || gpus.length === 0) return;
    let cancelled = false;

    (async () => {
      setDetecting(true);
      try {
        const hw = await detectHardwareAsync();
        if (cancelled) return;
        if (hw.gpuRenderer) {
          const matched = matchGpuFromRenderer(hw.gpuRenderer, gpus);
          if (matched) {
            setSelectedGpu(matched);
            setDetectedLabel(parseGpuRenderer(hw.gpuRenderer));
          }
        }
      } catch {
        /* detection failed — user picks manually */
      } finally {
        if (!cancelled) setDetecting(false);
      }
    })();

    return () => { cancelled = true; };
  }, [dataLoading, gpus]);

  /* ── Run recommendations across all use cases ───────────────── */
  const runAllUseCases = useCallback(
    (gpu: GPU) => {
      if (models.length === 0) return;
      const map = new Map<UseCase, ScoredModel>();

      for (const uc of USE_CASES) {
        const results = recommend(models, {
          vram_mb: gpu.vram_mb,
          useCase: uc.id,
          contextLength: 8192,
          bandwidth_gbps: gpu.bandwidth_gbps,
          fp16_tflops: gpu.fp16_tflops,
          tensor_cores: gpu.tensor_cores,
          ram_gb: 32, // reasonable default
        });
        if (results.length > 0) {
          map.set(uc.id, results[0]);
        }
      }
      setUseCaseResults(map);
    },
    [models],
  );

  useEffect(() => {
    if (selectedGpu) runAllUseCases(selectedGpu);
  }, [selectedGpu, runAllUseCases]);

  /* ── GPU ranking ────────────────────────────────────────────── */
  const gpuRank = useMemo(
    () => (selectedGpu ? computeGpuRank(selectedGpu, gpus) : null),
    [selectedGpu, gpus],
  );

  /* ── Dropdown helpers ───────────────────────────────────────── */
  const filteredGpus = useMemo(() => {
    if (!searchQuery) return gpus;
    const q = searchQuery.toLowerCase();
    return gpus.filter(g => g.name.toLowerCase().includes(q));
  }, [gpus, searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  /* ── Copy share text ────────────────────────────────────────── */
  const handleCopy = useCallback(() => {
    if (!selectedGpu || !useCaseResults || !gpuRank) return;
    const text = buildShareText(selectedGpu, useCaseResults, gpuRank);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [selectedGpu, useCaseResults, gpuRank]);

  /* ── Render ─────────────────────────────────────────────────── */
  const hasResults = useCaseResults && useCaseResults.size > 0;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* ── Radiant card wrapper ─────────────────────────────────── */}
      <div
        className={`relative rounded-3xl overflow-hidden ${
          isDark
            ? 'bg-gray-900/80 border border-white/10'
            : 'bg-white/80 border border-gray-200'
        } backdrop-blur-xl shadow-2xl`}
      >
        {/* Animated gradient border glow */}
        <div
          className="absolute -inset-[1px] rounded-3xl pointer-events-none"
          style={{
            background: 'conic-gradient(from 0deg, #3b82f6, #8b5cf6, #ec4899, #f59e0b, #3b82f6)',
            opacity: isDark ? 0.3 : 0.15,
            filter: 'blur(8px)',
            animation: 'spin 8s linear infinite',
          }}
        />

        {/* Card inner */}
        <div className="relative rounded-3xl overflow-hidden"
          style={{ background: isDark ? 'rgba(17,24,39,0.95)' : 'rgba(255,255,255,0.97)' }}
        >
          <div className="px-5 py-6 sm:px-8 sm:py-7">
            {/* ── Header ─────────────────────────────────────────── */}
            <div className="text-center mb-4">
              <h2 className={`text-xl sm:text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                What can your PC run?
              </h2>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Instant results · No signup · 100% private
              </p>
            </div>

            {/* ── GPU selector ────────────────────────────────────── */}
            <div className="mb-4" ref={dropdownRef}>
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                    isDark
                      ? 'bg-gray-800 hover:bg-gray-750 border border-gray-700 text-white'
                      : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-900'
                  } ${dropdownOpen ? (isDark ? 'ring-2 ring-blue-500/50' : 'ring-2 ring-blue-400/50') : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl flex-shrink-0">🎮</span>
                    <div className="min-w-0">
                      {detecting ? (
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Detecting your GPU…
                        </span>
                      ) : selectedGpu ? (
                        <>
                          <div className="font-semibold truncate">{selectedGpu.name}</div>
                          <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {selectedGpu.vram_mb / 1024}GB {selectedGpu.memory_type} · {selectedGpu.bandwidth_gbps} GB/s
                            {detectedLabel && (
                              <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                              }`}>
                                Auto-detected
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                          Select your GPU…
                        </span>
                      )}
                    </div>
                  </div>
                  <svg className={`w-5 h-5 flex-shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className={`absolute z-50 mt-2 w-full rounded-xl shadow-2xl border overflow-hidden ${
                    isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    {/* Search */}
                    <div className="p-3 border-b border-gray-700/50">
                      <input
                        type="text"
                        placeholder="Search GPUs…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                        className={`w-full px-3 py-2 rounded-lg text-sm outline-none ${
                          isDark
                            ? 'bg-gray-900 text-white placeholder-gray-500 border border-gray-600 focus:border-blue-500'
                            : 'bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-200 focus:border-blue-400'
                        }`}
                      />
                    </div>
                    {/* List */}
                    <div className="max-h-64 overflow-y-auto">
                      {filteredGpus.slice(0, 50).map(gpu => (
                        <button
                          key={gpu.name}
                          onClick={() => {
                            setSelectedGpu(gpu);
                            setDetectedLabel(null);
                            setDropdownOpen(false);
                            setSearchQuery('');
                          }}
                          className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                            isDark
                              ? 'hover:bg-gray-700/50 text-gray-200'
                              : 'hover:bg-gray-50 text-gray-800'
                          } ${selectedGpu?.name === gpu.name ? (isDark ? 'bg-blue-500/10' : 'bg-blue-50') : ''}`}
                        >
                          <div>
                            <div className="font-medium text-sm">{gpu.name}</div>
                            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              {gpu.vram_mb / 1024}GB · {gpu.bandwidth_gbps} GB/s
                            </div>
                          </div>
                          {selectedGpu?.name === gpu.name && (
                            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      ))}
                      {filteredGpus.length === 0 && (
                        <div className={`px-4 py-6 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          No GPUs found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── GPU Ranking badge ────────────────────────────────── */}
            {gpuRank && selectedGpu && (
              <div className={`flex justify-center mb-3 transition-all duration-500 ${hasResults ? 'opacity-100' : 'opacity-0'}`}>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                  gpuRank.rank <= 10
                    ? isDark ? 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                    : gpuRank.rank <= 30
                    ? isDark ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' : 'bg-blue-50 text-blue-700 border border-blue-200'
                    : isDark ? 'bg-gray-500/15 text-gray-300 border border-gray-500/30' : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}>
                  {gpuRank.rank <= 10 ? '🏆' : gpuRank.rank <= 30 ? '🔥' : '📊'}
                  <span>
                    Your GPU ranks <strong>#{gpuRank.rank}</strong> of {gpuRank.total} for Local AI
                  </span>
                </div>
              </div>
            )}

            {/* ── Results grid ─────────────────────────────────────── */}
            {dataLoading ? (
              <div className="text-center py-5">
                <div className={`inline-block w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${isDark ? 'border-blue-400' : 'border-blue-500'}`} />
              </div>
            ) : !selectedGpu ? (
              <div className={`text-center py-7 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Select your GPU to see what you can run
              </div>
            ) : hasResults ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {USE_CASES.map(uc => {
                  const result = useCaseResults.get(uc.id);
                  if (!result) return null;

                  const speed = result.performance.tokensPerSecond;
                  const speedLabel = speed ? `${Math.round(speed)} tok/s` : '—';
                  const isGpuFull = result.inferenceMode === 'gpu_full';
                  const vramPct = result.memory.vramPercent;

                  // Speed quality indicator
                  const speedTier =
                    speed && speed >= 30 ? 'fast' :
                    speed && speed >= 15 ? 'good' :
                    speed && speed >= 5 ? 'ok' : 'slow';

                  const speedColors = {
                    fast: isDark ? 'text-green-400' : 'text-green-600',
                    good: isDark ? 'text-blue-400' : 'text-blue-600',
                    ok: isDark ? 'text-yellow-400' : 'text-yellow-600',
                    slow: isDark ? 'text-red-400' : 'text-red-500',
                  };

                  return (
                    <div
                      key={uc.id}
                      className={`group relative rounded-xl p-3 transition-all duration-200 cursor-default ${
                        isDark
                          ? 'bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600'
                          : 'bg-gray-50/80 hover:bg-white border border-gray-200/80 hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      {/* Use case label */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-sm">{uc.icon}</span>
                        <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {uc.label}
                        </span>
                      </div>

                      {/* Model name */}
                      <div className={`font-bold text-sm leading-tight mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {result.model.name}
                      </div>

                      {/* Quant + params */}
                      <div className={`text-xs mb-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {result.model.params_b}B · {result.quant.level}
                      </div>

                      {/* Speed */}
                      <div className={`text-base font-bold ${speedColors[speedTier]}`}>
                        {speedLabel}
                      </div>

                      {/* VRAM bar */}
                      <div className="mt-1.5">
                        <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              vramPct > 90
                                ? 'bg-red-500'
                                : vramPct > 70
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(vramPct, 100)}%` }}
                          />
                        </div>
                        <div className={`flex justify-between mt-0.5 text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                          <span>{isGpuFull ? 'Fits in VRAM' : result.inferenceMode === 'gpu_offload' ? 'Partial offload' : 'CPU only'}</span>
                          <span>{Math.round(vramPct)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* ── Action row ──────────────────────────────────────── */}
            {hasResults && selectedGpu && (
              <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
                {/* Copy share text */}
                <button
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    copied
                      ? isDark ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-green-100 text-green-700 border border-green-200'
                      : isDark ? 'bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-500 hover:text-white' : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-400 hover:text-gray-900 shadow-sm'
                  }`}
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Share My Setup
                    </>
                  )}
                </button>

                {/* Deep dive link */}
                <Link
                  href="/search/model"
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-500/30`}
                >
                  Full Results & Filters
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>

                {/* Upgrade hardware link */}
                <Link
                  href="/search/hardware"
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isDark
                      ? 'bg-gray-800 text-orange-300 border border-orange-500/30 hover:border-orange-400/60 hover:text-orange-200'
                      : 'bg-white text-orange-700 border border-orange-200 hover:border-orange-400 hover:text-orange-800 shadow-sm'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Upgrade Hardware
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
