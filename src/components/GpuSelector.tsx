'use client';

import { useState, useRef, useEffect } from 'react';
import { GPU } from '@/lib/types';
import { detectHardwareAsync, matchGpuFromRenderer, parseGpuRenderer } from '@/lib/detectHardware';

interface GpuSelectorProps {
  gpus: GPU[];
  onSelect: (gpu: GPU | null, manualVram?: number, manualBandwidth?: number) => void;
  selectedGpu: GPU | null;
}

export default function GpuSelector({
  gpus,
  onSelect,
  selectedGpu,
}: GpuSelectorProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualVram, setManualVram] = useState('');
  const [manualBandwidth, setManualBandwidth] = useState('');
  const [detectedRenderer, setDetectedRenderer] = useState<string | null>(null);
  const [detectedGpu, setDetectedGpu] = useState<GPU | null>(null);
  const [hasAutoDetected, setHasAutoDetected] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Auto-detect GPU on mount (async — WebGPU then WebGL fallback)
  useEffect(() => {
    if (hasAutoDetected || selectedGpu) return;

    let cancelled = false;

    async function detect() {
      const hardware = await detectHardwareAsync();
      if (cancelled) return;
      if (hardware.gpuRenderer) {
        setDetectedRenderer(hardware.gpuRenderer);
        const matched = matchGpuFromRenderer(hardware.gpuRenderer, gpus);
        if (matched) {
          setDetectedGpu(matched);
        }
      }
      setHasAutoDetected(true);
    }

    detect();
    return () => { cancelled = true; };
  }, [gpus, hasAutoDetected, selectedGpu]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = gpus.filter((gpu) => {
    const q = query.toLowerCase();
    return (
      gpu.name.toLowerCase().includes(q) ||
      gpu.aliases.some((a) => a.toLowerCase().includes(q))
    );
  });

  function handleSelect(gpu: GPU) {
    setQuery(gpu.name);
    setIsOpen(false);
    setShowManual(false);
    onSelect(gpu);
  }

  function handleManualSubmit() {
    const vram = parseInt(manualVram, 10);
    const bandwidth = parseInt(manualBandwidth, 10) || undefined;
    if (vram > 0) {
      onSelect(null, vram, bandwidth);
    }
  }

  function handleUseDetected() {
    if (detectedGpu) {
      setQuery(detectedGpu.name);
      onSelect(detectedGpu);
      setDetectedGpu(null);
      setDetectedRenderer(null);
    }
  }

  function handleDismissDetected() {
    setDetectedGpu(null);
    setDetectedRenderer(null);
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">
        Select your GPU
      </label>

      {/* Auto-detected GPU banner */}
      {detectedGpu && !selectedGpu && (
        <div className="rounded-lg border border-green-600/50 bg-green-900/20 p-3 space-y-2">
          <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            GPU Detected
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-white font-medium">{detectedGpu.name}</span>
              <span className="text-gray-400 ml-2">({Math.round(detectedGpu.vram_mb / 1024)}GB VRAM)</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleUseDetected}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-500"
              >
                Use this
              </button>
              <button
                onClick={handleDismissDetected}
                className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-600"
              >
                Choose different
              </button>
            </div>
          </div>
          {detectedRenderer && (
            <p className="text-xs text-gray-500">
              Detected: {parseGpuRenderer(detectedRenderer)}
            </p>
          )}
        </div>
      )}

      {/* Detected but not matched */}
      {detectedRenderer && !detectedGpu && !selectedGpu && (
        <div className="rounded-lg border border-yellow-600/50 bg-yellow-900/20 p-3 space-y-1">
          <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            GPU detected but not in database
          </div>
          <p className="text-sm text-gray-400">
            Detected: <span className="text-white">{parseGpuRenderer(detectedRenderer)}</span>
          </p>
          <p className="text-xs text-gray-500">
            Please select your GPU manually or enter specs below.
          </p>
        </div>
      )}

      <div ref={wrapperRef} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (selectedGpu) onSelect(null);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search GPU (e.g. 4070, M3 Pro, 7900 XTX)..."
          className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {isOpen && filtered.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-600 bg-gray-800 shadow-xl">
            {filtered.map((gpu) => (
              <li
                key={gpu.name}
                onClick={() => handleSelect(gpu)}
                className="cursor-pointer px-4 py-2.5 hover:bg-gray-700 text-gray-200 text-sm flex justify-between"
              >
                <span>{gpu.name}</span>
                <span className="text-gray-400">
                  {Math.round(gpu.vram_mb / 1024)}GB
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedGpu && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400">
          <span>VRAM: <span className="text-white">{Math.round(selectedGpu.vram_mb / 1024)}GB</span></span>
          <span>Bandwidth: <span className="text-white">{selectedGpu.bandwidth_gbps} GB/s</span></span>
          {selectedGpu.memory_type && (
            <span>Memory: <span className="text-white">{selectedGpu.memory_type}</span></span>
          )}
          {selectedGpu.fp16_tflops && (
            <span>FP16: <span className="text-white">{selectedGpu.fp16_tflops} TFLOPS</span></span>
          )}
          {selectedGpu.tensor_cores && (
            <span>Tensor Cores: <span className="text-white">{selectedGpu.tensor_cores}</span></span>
          )}
          {selectedGpu.cuda_cores && (
            <span>CUDA: <span className="text-white">{selectedGpu.cuda_cores}</span></span>
          )}
        </div>
      )}

      {!showManual ? (
        <button
          type="button"
          onClick={() => setShowManual(true)}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          I don&apos;t see my GPU — enter specs manually
        </button>
      ) : (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                VRAM (GB) *
              </label>
              <input
                type="number"
                min="1"
                max="128"
                value={manualVram}
                onChange={(e) => setManualVram(e.target.value)}
                placeholder="e.g. 12"
                className="w-24 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Bandwidth (GB/s)
              </label>
              <input
                type="number"
                min="1"
                max="2000"
                value={manualBandwidth}
                onChange={(e) => setManualBandwidth(e.target.value)}
                placeholder="e.g. 504"
                className="w-24 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleManualSubmit}
              disabled={!manualVram}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => setShowManual(false)}
              className="rounded-lg bg-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Bandwidth affects speed estimates. Check your GPU specs if unsure.
          </p>
        </div>
      )}
    </div>
  );
}
