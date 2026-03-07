'use client';

import { useState, useRef } from 'react';
import { UseCase } from '@/lib/types';
import { useRecommendation } from '@/hooks/useRecommendation';
import HardwareConfig, { HardwareSpecs } from '@/components/HardwareConfig';
import UseCasePicker from '@/components/UseCasePicker';
import ContextSlider from '@/components/ContextSlider';
import ResultsList from '@/components/ResultsList';

export default function Home() {
  const { gpus, cpus, results, isLoading, error, runRecommendation } =
    useRecommendation();

  const [specs, setSpecs] = useState<HardwareSpecs>({
    vram_mb: null,
    ram_gb: 16,
  });
  const [useCase, setUseCase] = useState<UseCase>('chat');
  const [contextLength, setContextLength] = useState(4096);
  const resultsRef = useRef<HTMLDivElement>(null);

  function handleSubmit() {
    if (!specs.vram_mb) return;

    runRecommendation({
      vram_mb: specs.vram_mb,
      useCase,
      contextLength,
      bandwidth_gbps: specs.bandwidth_gbps,
      fp16_tflops: specs.fp16_tflops,
      tensor_cores: specs.tensor_cores,
      ram_gb: specs.ram_gb,
      cpu_cores: specs.cpu_cores,
      cpu_threads: specs.cpu_threads,
      avx2: specs.avx2,
      avx512: specs.avx512,
      gpu_count: specs.gpu_count,
      nvlink: specs.nvlink,
      mode: specs.inference_mode,
    });

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
        <div className="mx-auto max-w-7xl px-4 py-4">
          <h1 className="text-xl font-bold text-white">
            LocalLLM Advisor
          </h1>
          <p className="text-sm text-gray-400">
            Find the best local LLM for your hardware
          </p>
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

          <ContextSlider value={contextLength} onChange={setContextLength} />

          {/* CTA */}
          <button
            onClick={handleSubmit}
            disabled={!specs.vram_mb}
            className="w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-blue-600"
          >
            Find My Models
          </button>
        </section>
      </main>

      {/* Results - Full Width */}
      {results && specs.vram_mb && (
        <section ref={resultsRef} className="mx-auto max-w-7xl px-4 py-6">
          <ResultsList
            results={results}
            gpuName={specs.gpu_name ?? null}
            vramMb={specs.vram_mb}
            useCase={useCase}
          />
        </section>
      )}

      {/* Footer */}
      <footer className="mx-auto max-w-7xl px-4 border-t border-gray-800 pt-6 pb-8 text-center text-xs text-gray-500">
        <p>
          LocalLLM Advisor — Open source tool for the local AI community.
        </p>
        <p className="mt-1">
          Data updated manually. Not affiliated with Ollama or any model
          provider.
        </p>
      </footer>
    </div>
  );
}
