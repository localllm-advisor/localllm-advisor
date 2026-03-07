'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { UseCase, AdvancedFilters } from '@/lib/types';
import { useRecommendation } from '@/hooks/useRecommendation';
import HardwareConfig, { HardwareSpecs } from '@/components/HardwareConfig';
import UseCasePicker from '@/components/UseCasePicker';
import AdvancedOptions, { DEFAULT_FILTERS } from '@/components/AdvancedOptions';
import ResultsList from '@/components/ResultsList';
import { trackEvent } from '@/components/Analytics';

export default function Home() {
  const { gpus, cpus, results, isLoading, error, runRecommendation } =
    useRecommendation();

  const [specs, setSpecs] = useState<HardwareSpecs>({
    vram_mb: null,
    ram_gb: 16,
  });
  const [useCase, setUseCase] = useState<UseCase>('chat');
  const [filters, setFilters] = useState<AdvancedFilters>(DEFAULT_FILTERS);
  const resultsRef = useRef<HTMLDivElement>(null);

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
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">
              LocalLLM Advisor
            </h1>
            <p className="text-sm text-gray-400">
              Find the best local LLM for your hardware
            </p>
          </div>
          <nav className="flex gap-6 text-sm">
            <Link href="/methodology" className="text-gray-400 hover:text-white transition-colors">
              Methodology
            </Link>
            <Link href="/faq" className="text-gray-400 hover:text-white transition-colors">
              FAQ
            </Link>
            <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
              About
            </Link>
            <a
              href="https://github.com/localllm-advisor/localllm-advisor"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      {/* Form */}
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
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
      </main>

      {/* Results - Full Width */}
      {results && canSearch && (
        <section ref={resultsRef} className="mx-auto max-w-7xl px-4 py-6">
          <ResultsList
            results={results}
            gpuName={isCpuOnlyMode ? 'CPU Only' : (specs.gpu_name ?? null)}
            vramMb={specs.vram_mb || 0}
            useCase={useCase}
          />
        </section>
      )}

      {/* Footer */}
      <footer className="mx-auto max-w-7xl px-4 border-t border-gray-800 pt-6 pb-8 text-center text-xs text-gray-500">
        <div className="flex justify-center gap-6 mb-4">
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
          LocalLLM Advisor — Open source tool for the local AI community.
        </p>
        <p className="mt-1">
          Data updated manually. Not affiliated with Ollama or any model provider.
        </p>
      </footer>
    </div>
  );
}
