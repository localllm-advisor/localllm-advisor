'use client';

import { useState, useRef } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { UseCase, AdvancedFilters } from '@/lib/types';
import { useRecommendation } from '@/hooks/useRecommendation';
import HardwareConfig, { HardwareSpecs } from '@/components/HardwareConfig';
import UseCasePicker from '@/components/UseCasePicker';
import AdvancedOptions, { DEFAULT_FILTERS } from '@/components/AdvancedOptions';
import ResultsList from '@/components/ResultsList';
import UpgradeAdvisor from '@/components/UpgradeAdvisor';
import CollapsibleSection from '@/components/CollapsibleSection';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';
import { trackEvent } from '@/components/Analytics';

export default function ModelSearchPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { gpus, cpus, models, results, isLoading, error, runRecommendation, clearResults } =
    useRecommendation();

  const [specs, setSpecsRaw] = useState<HardwareSpecs>({
    vram_mb: null,
    ram_gb: 16,
  });
  const [useCase, setUseCaseRaw] = useState<UseCase>('chat');
  const [filters, setFiltersRaw] = useState<AdvancedFilters>(DEFAULT_FILTERS);
  const [showAllResults, setShowAllResults] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

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

  // Check if we can run a search
  const isCpuOnlyMode = specs.inference_mode === 'cpu_only';
  const canSearch = specs.vram_mb || isCpuOnlyMode;

  function handleSubmit() {
    if (!canSearch) return;

    // Track recommendation event
    const label = isCpuOnlyMode
      ? 'CPU Only'
      : (specs.gpu_name || `${Math.round((specs.vram_mb || 0) / 1024)}GB`);
    trackEvent('model_search', 'recommendation', label, specs.vram_mb || 0);

    runRecommendation({
      vram_mb: specs.vram_mb || 0,
      useCase,
      contextLength: filters.contextLength,
      bandwidth_gbps: specs.bandwidth_gbps,
      fp16_tflops: specs.fp16_tflops,
      tensor_cores: specs.tensor_cores,
      pcie_gen: specs.pcie_gen,
      pcie_lanes: specs.pcie_lanes,
      gpu_count: specs.gpu_count,
      nvlink: specs.nvlink,
      cpu_cores: specs.cpu_cores,
      cpu_threads: specs.cpu_threads,
      base_clock_ghz: specs.base_clock_ghz,
      boost_clock_ghz: specs.boost_clock_ghz,
      l3_cache_mb: specs.l3_cache_mb,
      avx2: specs.avx2,
      avx512: specs.avx512,
      amx: specs.amx,
      ram_gb: specs.ram_gb,
      ram_speed_mhz: specs.ram_speed_mhz,
      ram_channels: specs.ram_channels,
      storage_type: specs.storage_type,
      storage_speed_gbps: specs.storage_speed_gbps,
      mode: specs.inference_mode,
    }, filters);

    // Reset results view and scroll
    setShowAllResults(false);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  const selectedGpu = gpus.find(g => g.name === specs.gpu_name) || null;
  const displayResults = showAllResults ? results : results?.slice(0, 3);
  const hasMoreResults = results && results.length > 3;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className="mb-4">Loading data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className={isDark ? 'text-red-400' : 'text-red-600'}>
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-blue-950/40' : 'bg-blue-50/70'}`}>
      {/* Navigation */}
      <Navbar />
      <BackButton />

      <PageHero
        title="Find Models"
        subtitle="Discover the perfect local LLM for your hardware."
        accent="blue"
      />

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-8 space-y-5">

        {/* Hardware + Use Case — single card */}
        <section className={`rounded-2xl border transition-all ${
          isDark
            ? 'border-gray-700/60 bg-gray-800/40'
            : 'border-gray-200/80 bg-white/80'
        }`}>
          <div className="p-5 sm:p-6 space-y-6">
            {/* Hardware */}
            <div className="space-y-3">
              <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Hardware
              </h2>
              <HardwareConfig
                gpus={gpus}
                cpus={cpus}
                specs={specs}
                onChange={setSpecs}
              />
            </div>

            {/* Divider */}
            <div className={`border-t ${isDark ? 'border-gray-700/50' : 'border-gray-200/60'}`} />

            {/* Use Case */}
            <div className="space-y-3">
              <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Use Case
              </h2>
              <UseCasePicker selected={useCase} onChange={setUseCase} />
            </div>
          </div>
        </section>

        {/* Advanced Filters — lightweight collapsible */}
        <CollapsibleSection
          title="Advanced Filters"
          subtitle="context length, model families, capabilities"
          defaultOpen={false}
        >
          <div className={`rounded-2xl border p-5 sm:p-6 mt-3 ${
            isDark
              ? 'border-gray-700/60 bg-gray-800/40'
              : 'border-gray-200/80 bg-white/80'
          }`}>
            <AdvancedOptions filters={filters} onChange={setFilters} />
          </div>
        </CollapsibleSection>

        {/* Find Models Button */}
        <div className="flex justify-center pt-2">
          <button
            onClick={handleSubmit}
            disabled={!canSearch}
            className={`px-8 py-3 rounded-xl font-semibold transition-all sm:w-auto w-full ${
              canSearch
                ? `bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 cursor-pointer shadow-lg hover:shadow-xl`
                : `${isDark ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'} cursor-not-allowed`
            }`}
          >
            {isCpuOnlyMode ? 'Find CPU Models' : 'Find Models'}
          </button>
        </div>
      </main>

      {/* Results Section */}
      {results && canSearch && (
        <section ref={resultsRef} className="w-full bg-gradient-to-b from-transparent via-blue-500/5 to-transparent py-8">
          <div className="mx-auto max-w-7xl px-4 space-y-8">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Results
                <span className={`ml-2 text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  ({results.length} model{results.length !== 1 ? 's' : ''})
                </span>
              </h2>
              {hasMoreResults && !showAllResults && (
                <button
                  onClick={() => setShowAllResults(true)}
                  className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    isDark
                      ? 'text-blue-400 hover:text-blue-300 bg-blue-900/20 hover:bg-blue-900/40'
                      : 'text-blue-600 hover:text-blue-700 bg-blue-100/50 hover:bg-blue-100'
                  }`}
                >
                  Show all {results.length} results
                </button>
              )}
              {showAllResults && (
                <button
                  onClick={() => setShowAllResults(false)}
                  className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    isDark
                      ? 'text-gray-400 hover:text-gray-300 bg-gray-700/50 hover:bg-gray-700'
                      : 'text-gray-600 hover:text-gray-700 bg-gray-100/50 hover:bg-gray-100'
                  }`}
                >
                  Show top 3
                </button>
              )}
            </div>

            {/* Performance disclaimer */}
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Estimates are based on published benchmarks and memory-bandwidth modeling.
              Actual performance varies with drivers, thermal conditions, context length, and system load.
              See our <a href="/methodology" className={isDark ? 'text-blue-400 hover:underline' : 'text-blue-600 hover:underline'}>Methodology</a> for details.
            </p>

            {/* Results List */}
            <ResultsList
              results={displayResults || []}
              gpuName={isCpuOnlyMode ? 'CPU Only' : (specs.gpu_name ?? null)}
              vramMb={specs.vram_mb || 0}
              useCase={useCase}
              onBuildForModel={() => {}}
            />
          </div>
        </section>
      )}

      {/* Upgrade Advisor */}
      {results && !isCpuOnlyMode && selectedGpu && (
        <section id="upgrade-advisor" className="w-full py-8 border-t border-gray-700">
          <div className="mx-auto max-w-7xl px-4">
            <UpgradeAdvisor
              results={results}
              currentGpu={selectedGpu}
              currentVramMb={specs.vram_mb || 0}
              allGpus={gpus}
              allModels={models}
              useCase={useCase}
              onBuildForModel={() => {}}
            />
          </div>
        </section>
      )}

      {/* Footer with Newsletter Banner */}
      <SiteFooter />
    </div>
  );
}
