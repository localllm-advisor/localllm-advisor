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
  const scored = allGpus
    .filter(g => g.vram_mb > 0 && g.bandwidth_gbps > 0)
    .map(g => ({
      name: g.name,
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
  const searchInputRef = useRef<HTMLInputElement>(null);
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
        /* silent */
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
        /* detection failed */
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
          ram_gb: 32,
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

  /* ── Filtered GPUs — real-time, case-insensitive, max 10 ────── */
  const filteredGpus = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return gpus.slice(0, 10);
    // Score each GPU: prefer name-start matches, then any match
    const matches = gpus
      .filter(g => g.name.toLowerCase().includes(q))
      .map(g => ({
        gpu: g,
        score: g.name.toLowerCase().startsWith(q) ? 0 : 1,
      }))
      .sort((a, b) => a.score - b.score)
      .map(x => x.gpu);
    return matches.slice(0, 10);
  }, [gpus, searchQuery]);

  /* ── Open dropdown and focus search ────────────────────────── */
  const openDropdown = useCallback(() => {
    setDropdownOpen(true);
    setSearchQuery('');
    // Give DOM time to render the input before focusing
    setTimeout(() => searchInputRef.current?.focus(), 30);
  }, []);

  /* ── Close dropdown on outside click ───────────────────────── */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearchQuery('');
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
    <div className="w-full max-w-2xl mx-auto">
      {/* ── Card ─────────────────────────────────────────────────── */}
      <div
        className={`rounded-2xl ${
          isDark
            ? 'bg-gray-900 border border-white/10'
            : 'bg-white border border-gray-200'
        } shadow-lg`}
      >
          <div className="px-4 py-5 sm:px-6 sm:py-6">

            {/* ── Header ─────────────────────────────────────────── */}
            <div className="text-center mb-3">
              <h2 className={`text-lg sm:text-xl font-bold mb-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                What can your PC run?
              </h2>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Instant results · No signup · 100% private
              </p>
            </div>

            {/* ── GPU selector (inline — card grows with dropdown) ── */}
            <div className="mb-3" ref={dropdownRef}>

              {/* Trigger button */}
              <button
                onClick={() => dropdownOpen ? setDropdownOpen(false) : openDropdown()}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-left transition-all duration-200 ${
                  isDark
                    ? 'bg-gray-800 hover:bg-gray-750 border border-gray-700 text-white'
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-900'
                } ${dropdownOpen ? (isDark ? 'ring-2 ring-blue-500/50 rounded-b-none border-b-transparent' : 'ring-2 ring-blue-400/50 rounded-b-none border-b-transparent') : ''}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg flex-shrink-0">🎮</span>
                  <div className="min-w-0">
                    {detecting ? (
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Detecting your GPU…
                      </span>
                    ) : selectedGpu ? (
                      <>
                        <div className="font-semibold text-sm truncate">{selectedGpu.name}</div>
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
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Select your GPU…
                      </span>
                    )}
                  </div>
                </div>
                <svg
                  className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Inline dropdown — flows in document, fixed height shows 5 items */}
              {dropdownOpen && (
                <div className={`rounded-b-xl border border-t-0 ${
                  isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  {/* Search input */}
                  <div className={`px-3 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search GPUs…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-lg text-sm outline-none ${
                        isDark
                          ? 'bg-gray-900 text-white placeholder-gray-500 border border-gray-600 focus:border-blue-500'
                          : 'bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-200 focus:border-blue-400'
                      }`}
                    />
                  </div>

                  {/* Results list — fixed height shows ~5 items, rest scrollable */}
                  <div className="overflow-y-auto" style={{ maxHeight: '220px' }}>
                    {filteredGpus.length > 0 ? (
                      filteredGpus.map(gpu => (
                        <button
                          key={gpu.name}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedGpu(gpu);
                            setDetectedLabel(null);
                            setDropdownOpen(false);
                            setSearchQuery('');
                          }}
                          className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors ${
                            isDark
                              ? 'hover:bg-gray-700/60 text-gray-200 border-b border-gray-700/40 last:border-0'
                              : 'hover:bg-gray-50 text-gray-800 border-b border-gray-100 last:border-0'
                          } ${selectedGpu?.name === gpu.name ? (isDark ? 'bg-blue-500/10' : 'bg-blue-50') : ''}`}
                        >
                          <div>
                            <div className="font-medium text-sm">{gpu.name}</div>
                            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              {gpu.vram_mb / 1024}GB · {gpu.bandwidth_gbps} GB/s
                            </div>
                          </div>
                          {selectedGpu?.name === gpu.name && (
                            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className={`px-4 py-5 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        No GPUs found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── GPU Ranking badge ────────────────────────────────── */}
            {gpuRank && selectedGpu && hasResults && (
              <div className="flex justify-center mb-3">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                  gpuRank.rank <= 10
                    ? isDark ? 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                    : gpuRank.rank <= 30
                    ? isDark ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' : 'bg-blue-50 text-blue-700 border border-blue-200'
                    : isDark ? 'bg-gray-500/15 text-gray-300 border border-gray-500/30' : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}>
                  {gpuRank.rank <= 10 ? '🏆' : gpuRank.rank <= 30 ? '🔥' : '📊'}
                  <span>
                    Ranks <strong>#{gpuRank.rank}</strong> of {gpuRank.total} for Local AI
                  </span>
                </div>
              </div>
            )}

            {/* ── Results grid ─────────────────────────────────────── */}
            {dataLoading ? (
              <div className="text-center py-4">
                <div className={`inline-block w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${isDark ? 'border-blue-400' : 'border-blue-500'}`} />
              </div>
            ) : !selectedGpu ? (
              <div className={`text-center py-5 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Select your GPU to see what you can run
              </div>
            ) : hasResults ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                {USE_CASES.map(uc => {
                  const result = useCaseResults.get(uc.id);
                  if (!result) return null;

                  const speed = result.performance.tokensPerSecond;
                  const speedLabel = speed ? `${Math.round(speed)} tok/s` : '—';
                  const isGpuFull = result.inferenceMode === 'gpu_full';
                  const vramPct = result.memory.vramPercent;

                  const speedTier =
                    speed && speed >= 30 ? 'fast' :
                    speed && speed >= 15 ? 'good' :
                    speed && speed >= 5  ? 'ok'   : 'slow';

                  const speedColors = {
                    fast: isDark ? 'text-green-400' : 'text-green-600',
                    good: isDark ? 'text-blue-400'  : 'text-blue-600',
                    ok:   isDark ? 'text-yellow-400': 'text-yellow-600',
                    slow: isDark ? 'text-red-400'   : 'text-red-500',
                  };

                  return (
                    <div
                      key={uc.id}
                      className={`group relative rounded-xl p-2.5 transition-all duration-200 cursor-default ${
                        isDark
                          ? 'bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600'
                          : 'bg-gray-50/80 hover:bg-white border border-gray-200/80 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1.5">
                        <span className="text-xs">{uc.icon}</span>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {uc.label}
                        </span>
                      </div>

                      <div className={`font-bold text-xs leading-tight mb-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {result.model.name}
                      </div>

                      <div className={`text-[10px] mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {result.model.params_b}B · {result.quant.level}
                      </div>

                      <div className={`text-sm font-bold ${speedColors[speedTier]}`}>
                        {speedLabel}
                      </div>

                      <div className="mt-1">
                        <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              vramPct > 90 ? 'bg-red-500' : vramPct > 70 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(vramPct, 100)}%` }}
                          />
                        </div>
                        <div className={`flex justify-between mt-0.5 text-[9px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
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
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2">
                <button
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                    copied
                      ? isDark ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-green-100 text-green-700 border border-green-200'
                      : isDark ? 'bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-500 hover:text-white' : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-400 hover:text-gray-900 shadow-sm'
                  }`}
                >
                  {copied ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Share My Setup
                    </>
                  )}
                </button>

                <Link
                  href="/search/model"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-500/30"
                >
                  Full Results & Filters
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>

                <Link
                  href="/search/hardware"
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                    isDark
                      ? 'bg-gray-800 text-orange-300 border border-orange-500/30 hover:border-orange-400/60 hover:text-orange-200'
                      : 'bg-white text-orange-700 border border-orange-200 hover:border-orange-400 hover:text-orange-800 shadow-sm'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Upgrade Hardware
                </Link>
              </div>
            )}

          </div>
      </div>
    </div>
  );
}
