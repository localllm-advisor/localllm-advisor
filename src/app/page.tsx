'use client';

import { useState, useRef } from 'react';
import { GPU, UseCase } from '@/lib/types';
import { useRecommendation } from '@/hooks/useRecommendation';
import GpuSelector from '@/components/GpuSelector';
import UseCasePicker from '@/components/UseCasePicker';
import ContextSlider from '@/components/ContextSlider';
import RamSlider from '@/components/RamSlider';
import ResultsList from '@/components/ResultsList';

export default function Home() {
  const { gpus, results, isLoading, error, runRecommendation } =
    useRecommendation();

  const [selectedGpu, setSelectedGpu] = useState<GPU | null>(null);
  const [manualVram, setManualVram] = useState<number | null>(null);
  const [manualBandwidth, setManualBandwidth] = useState<number | null>(null);
  const [useCase, setUseCase] = useState<UseCase>('chat');
  const [contextLength, setContextLength] = useState(4096);
  const [ramGb, setRamGb] = useState(16);
  const resultsRef = useRef<HTMLDivElement>(null);

  const vramMb = selectedGpu?.vram_mb ?? manualVram;
  const bandwidthGbps = selectedGpu?.bandwidth_gbps ?? manualBandwidth ?? undefined;

  function handleGpuSelect(gpu: GPU | null, manualVramGb?: number, manualBandwidthGbps?: number) {
    if (gpu) {
      setSelectedGpu(gpu);
      setManualVram(null);
      setManualBandwidth(null);
    } else if (manualVramGb) {
      setSelectedGpu(null);
      setManualVram(manualVramGb * 1024);
      setManualBandwidth(manualBandwidthGbps ?? null);
    } else {
      setSelectedGpu(null);
      setManualVram(null);
      setManualBandwidth(null);
    }
  }

  function handleSubmit() {
    if (!vramMb) return;

    runRecommendation({
      vram_mb: vramMb,
      useCase,
      contextLength,
      bandwidth_gbps: bandwidthGbps,
      fp16_tflops: selectedGpu?.fp16_tflops,
      tensor_cores: selectedGpu?.tensor_cores,
      ram_gb: ramGb,
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
          <GpuSelector
            gpus={gpus}
            onSelect={handleGpuSelect}
            selectedGpu={selectedGpu}
          />

          <UseCasePicker selected={useCase} onChange={setUseCase} />

          <ContextSlider value={contextLength} onChange={setContextLength} />

          <RamSlider value={ramGb} onChange={setRamGb} />

          {/* CTA */}
          <button
            onClick={handleSubmit}
            disabled={!vramMb}
            className="w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-blue-600"
          >
            Find My Models
          </button>
        </section>
      </main>

      {/* Results - Full Width */}
      {results && (
        <section ref={resultsRef} className="mx-auto max-w-7xl px-4 py-6">
          <ResultsList
            results={results}
            gpuName={selectedGpu?.name ?? null}
            vramMb={vramMb!}
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
