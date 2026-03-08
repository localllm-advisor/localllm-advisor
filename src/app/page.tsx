'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ThemeToggle, useTheme } from '@/components/ThemeProvider';
import { UseCase, AdvancedFilters } from '@/lib/types';
import { useRecommendation } from '@/hooks/useRecommendation';
import HardwareConfig, { HardwareSpecs } from '@/components/HardwareConfig';
import UseCasePicker from '@/components/UseCasePicker';
import AdvancedOptions, { DEFAULT_FILTERS } from '@/components/AdvancedOptions';
import ResultsList from '@/components/ResultsList';
import HardwareFinder from '@/components/HardwareFinder';
import { trackEvent } from '@/components/Analytics';

type AppMode = 'find-models' | 'build-hardware';

export default function Home() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { gpus, cpus, models, results, isLoading, error, runRecommendation, clearResults } =
    useRecommendation();

  const [mode, setMode] = useState<AppMode>('find-models');
  const [specs, setSpecsRaw] = useState<HardwareSpecs>({
    vram_mb: null,
    ram_gb: 16,
  });
  const [useCase, setUseCaseRaw] = useState<UseCase>('chat');
  const [filters, setFiltersRaw] = useState<AdvancedFilters>(DEFAULT_FILTERS);
  const [buildForModelId, setBuildForModelId] = useState<string | undefined>();
  const [showHero, setShowHero] = useState(true);
  const resultsRef = useRef<HTMLDivElement>(null);
  const toolRef = useRef<HTMLDivElement>(null);

  const scrollToTool = () => {
    setShowHero(false);
    // Wait for transition to complete, then scroll to top
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);
  };

  // Wrap setters to clear results when inputs change
  const setSpecs = (newSpecs: HardwareSpecs) => {
    setSpecsRaw(newSpecs);
    clearResults();
  };
  const setUseCase = (newUseCase: UseCase) => {
    setUseCaseRaw(newUseCase);
    clearResults();
  };
  const setFilters = (newFilters: AdvancedFilters) => {
    setFiltersRaw(newFilters);
    clearResults();
  };

  // Handle "Build for this model" from results
  const handleBuildForModel = (modelId: string) => {
    setBuildForModelId(modelId);
    setMode('build-hardware');
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Check if we can run a search
  const isCpuOnlyMode = specs.inference_mode === 'cpu_only';
  const canSearch = specs.vram_mb || isCpuOnlyMode;

  function handleSubmit() {
    if (!canSearch) return;

    // Track recommendation event
    const label = isCpuOnlyMode
      ? 'CPU Only'
      : (specs.gpu_name || `${Math.round((specs.vram_mb || 0) / 1024)}GB`);
    trackEvent('find_models', 'recommendation', label, specs.vram_mb || 0);

    runRecommendation({
      vram_mb: specs.vram_mb || 0, // 0 for CPU-only
      useCase,
      contextLength: filters.contextLength,
      // GPU specs
      bandwidth_gbps: specs.bandwidth_gbps,
      fp16_tflops: specs.fp16_tflops,
      tensor_cores: specs.tensor_cores,
      pcie_gen: specs.pcie_gen,
      pcie_lanes: specs.pcie_lanes,
      // Multi-GPU
      gpu_count: specs.gpu_count,
      nvlink: specs.nvlink,
      // CPU specs
      cpu_cores: specs.cpu_cores,
      cpu_threads: specs.cpu_threads,
      base_clock_ghz: specs.base_clock_ghz,
      boost_clock_ghz: specs.boost_clock_ghz,
      l3_cache_mb: specs.l3_cache_mb,
      avx2: specs.avx2,
      avx512: specs.avx512,
      amx: specs.amx,
      // System RAM
      ram_gb: specs.ram_gb,
      ram_speed_mhz: specs.ram_speed_mhz,
      ram_channels: specs.ram_channels,
      // Storage
      storage_type: specs.storage_type,
      storage_speed_gbps: specs.storage_speed_gbps,
      // Mode
      mode: specs.inference_mode,
    }, filters);

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-400">Loading data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className={`border-b backdrop-blur-sm sticky top-0 z-10 ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'}`}>
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              LocalLLM Advisor
            </h1>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {mode === 'find-models'
                ? 'Find the best local LLM for your hardware'
                : 'Find hardware to run your desired model'
              }
            </p>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex gap-6 text-sm">
              <Link href="/benchmarks" className={`flex items-center gap-1 transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Benchmarks
              </Link>
              <Link href="/methodology" className={`transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                Methodology
              </Link>
              <Link href="/faq" className={`transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                FAQ
              </Link>
              <Link href="/about" className={`transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                About
              </Link>
              <a
                href="https://github.com/localllm-advisor/localllm-advisor"
                target="_blank"
                rel="noopener noreferrer"
                className={`transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                GitHub
              </a>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        className={`relative overflow-hidden border-b transition-all duration-700 ease-in-out ${isDark ? 'border-gray-800' : 'border-gray-200'} ${showHero ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden border-none'}`}
      >
        {/* Background gradient */}
          <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10' : 'bg-gradient-to-br from-blue-100/50 via-transparent to-purple-100/50'}`} />

          <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-20">
            {/* Main headline */}
            <div className="text-center mb-12">
              <h2 className={`text-4xl sm:text-5xl font-bold mb-4 tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Find the Perfect LLM
                <span className={`block ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  for Your Hardware
                </span>
              </h2>
              <p className={`text-lg sm:text-xl max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Stop guessing. Get instant recommendations based on your actual GPU, RAM, and use case.
                Ready-to-run Ollama commands included.
              </p>
            </div>

            {/* Stats */}
            <div className="flex justify-center gap-8 sm:gap-16 mb-12">
              <div className="text-center">
                <div className={`text-3xl sm:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{models.length}</div>
                <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>LLM Models</div>
              </div>
              <div className="text-center">
                <div className={`text-3xl sm:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{gpus.length}</div>
                <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>GPUs Supported</div>
              </div>
              <div className="text-center">
                <div className={`text-3xl sm:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>5</div>
                <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Use Cases</div>
              </div>
            </div>

            {/* Feature highlights */}
            <div className="grid sm:grid-cols-3 gap-6 mb-12">
              <div className={`flex items-start gap-3 p-4 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Auto-Detect Hardware</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Automatically identifies your GPU via WebGL</p>
                </div>
              </div>

              <div className={`flex items-start gap-3 p-4 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Performance Estimates</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Real tok/s speeds based on your specs</p>
                </div>
              </div>

              <div className={`flex items-start gap-3 p-4 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Copy & Run</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>One-click Ollama commands ready to paste</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center">
              <button
                onClick={scrollToTool}
                className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
              >
                Start Now
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
              <p className={`mt-3 text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Free, no signup required</p>
            </div>
          </div>
        </section>

      {/* Mode Tabs */}
      <div ref={toolRef} className="mx-auto max-w-3xl px-4 pt-6">
        <div className="flex rounded-xl bg-gray-800 p-1">
          <button
            onClick={() => {
              setMode('find-models');
              setBuildForModelId(undefined);
            }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
              mode === 'find-models'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Find Models
            <span className="hidden sm:inline text-xs opacity-75">I have hardware</span>
          </button>
          <button
            onClick={() => {
              setMode('build-hardware');
              setBuildForModelId(undefined);
            }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
              mode === 'build-hardware'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            Build for Model
            <span className="hidden sm:inline text-xs opacity-75">I need hardware</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {mode === 'find-models' ? (
          <section className="space-y-6">
            <HardwareConfig
              gpus={gpus}
              cpus={cpus}
              specs={specs}
              onChange={setSpecs}
            />

            <UseCasePicker selected={useCase} onChange={setUseCase} />

            <AdvancedOptions filters={filters} onChange={setFilters} />

            {/* CTA */}
            <button
              onClick={handleSubmit}
              disabled={!canSearch}
              className="w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-blue-600"
            >
              {isCpuOnlyMode ? 'Find CPU Models' : 'Find My Models'}
            </button>
          </section>
        ) : (
          <section className="space-y-6">
            <HardwareFinder models={models} gpus={gpus} initialModelId={buildForModelId} />
          </section>
        )}
      </main>

      {/* Results - Full Width (only for Find Models mode) */}
      {mode === 'find-models' && results && canSearch && (
        <section ref={resultsRef} className="mx-auto max-w-7xl px-4 py-6">
          <ResultsList
            results={results}
            gpuName={isCpuOnlyMode ? 'CPU Only' : (specs.gpu_name ?? null)}
            vramMb={specs.vram_mb || 0}
            useCase={useCase}
            onBuildForModel={handleBuildForModel}
          />
        </section>
      )}

      {/* Footer */}
      <footer className="mx-auto max-w-7xl px-4 border-t border-gray-800 pt-6 pb-8 text-center text-xs text-gray-500">
        <div className="flex justify-center gap-6 mb-4">
          <Link href="/benchmarks" className="hover:text-gray-300 transition-colors">Benchmarks</Link>
          <Link href="/methodology" className="hover:text-gray-300 transition-colors">Methodology</Link>
          <Link href="/faq" className="hover:text-gray-300 transition-colors">FAQ</Link>
          <Link href="/about" className="hover:text-gray-300 transition-colors">About</Link>
          <a
            href="https://github.com/localllm-advisor/localllm-advisor"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-300 transition-colors"
          >
            GitHub
          </a>
        </div>
        <p>
          LocalLLM Advisor — Find the best local LLM for your hardware.
        </p>
        <p className="mt-1">
          Data updated manually. Not affiliated with Ollama or any model provider.
        </p>
      </footer>
    </div>
  );
}
