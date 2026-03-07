'use client';

import { useState, useRef, useEffect } from 'react';
import { GPU, CPU } from '@/lib/types';

export interface HardwareSpecs {
  // GPU
  gpu_name?: string;
  vram_mb: number | null;
  bandwidth_gbps?: number;
  fp16_tflops?: number;
  tensor_cores?: number;
  // CPU
  cpu_name?: string;
  cpu_cores?: number;
  cpu_threads?: number;
  avx2?: boolean;
  avx512?: boolean;
  // System
  ram_gb: number;
}

interface HardwareConfigProps {
  gpus: GPU[];
  cpus: CPU[];
  specs: HardwareSpecs;
  onChange: (specs: HardwareSpecs) => void;
}

export default function HardwareConfig({
  gpus,
  cpus,
  specs,
  onChange,
}: HardwareConfigProps) {
  const [gpuQuery, setGpuQuery] = useState('');
  const [cpuQuery, setCpuQuery] = useState('');
  const [gpuOpen, setGpuOpen] = useState(false);
  const [cpuOpen, setCpuOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedGpu, setSelectedGpu] = useState<GPU | null>(null);
  const [selectedCpu, setSelectedCpu] = useState<CPU | null>(null);

  const gpuRef = useRef<HTMLDivElement>(null);
  const cpuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (gpuRef.current && !gpuRef.current.contains(e.target as Node)) {
        setGpuOpen(false);
      }
      if (cpuRef.current && !cpuRef.current.contains(e.target as Node)) {
        setCpuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredGpus = gpus.filter((gpu) => {
    const q = gpuQuery.toLowerCase();
    return gpu.name.toLowerCase().includes(q) || gpu.aliases.some((a) => a.toLowerCase().includes(q));
  });

  const filteredCpus = cpus.filter((cpu) => {
    const q = cpuQuery.toLowerCase();
    return cpu.name.toLowerCase().includes(q);
  });

  function handleGpuSelect(gpu: GPU) {
    setSelectedGpu(gpu);
    setGpuQuery(gpu.name);
    setGpuOpen(false);
    onChange({
      ...specs,
      gpu_name: gpu.name,
      vram_mb: gpu.vram_mb,
      bandwidth_gbps: gpu.bandwidth_gbps,
      fp16_tflops: gpu.fp16_tflops,
      tensor_cores: gpu.tensor_cores,
    });
  }

  function handleCpuSelect(cpu: CPU) {
    setSelectedCpu(cpu);
    setCpuQuery(cpu.name);
    setCpuOpen(false);
    onChange({
      ...specs,
      cpu_name: cpu.name,
      cpu_cores: cpu.cores,
      cpu_threads: cpu.threads,
      avx2: cpu.avx2,
      avx512: cpu.avx512,
    });
  }

  function updateSpec<K extends keyof HardwareSpecs>(key: K, value: HardwareSpecs[K]) {
    onChange({ ...specs, [key]: value });
  }

  const RAM_OPTIONS = [8, 16, 32, 64, 128];

  return (
    <div className="space-y-4">
      {/* GPU Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">GPU</label>
        <div ref={gpuRef} className="relative">
          <input
            type="text"
            value={gpuQuery}
            onChange={(e) => {
              setGpuQuery(e.target.value);
              setGpuOpen(true);
              if (selectedGpu) {
                setSelectedGpu(null);
                onChange({ ...specs, gpu_name: undefined, vram_mb: null, bandwidth_gbps: undefined, fp16_tflops: undefined, tensor_cores: undefined });
              }
            }}
            onFocus={() => setGpuOpen(true)}
            placeholder="Search GPU (e.g. 4070, M3 Pro, 7900 XTX)..."
            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-sm"
          />
          {gpuOpen && filteredGpus.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-600 bg-gray-800 shadow-xl">
              {filteredGpus.slice(0, 20).map((gpu) => (
                <li
                  key={gpu.name}
                  onClick={() => handleGpuSelect(gpu)}
                  className="cursor-pointer px-4 py-2 hover:bg-gray-700 text-gray-200 text-sm flex justify-between"
                >
                  <span>{gpu.name}</span>
                  <span className="text-gray-500">{Math.round(gpu.vram_mb / 1024)}GB</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {selectedGpu && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
            <span>VRAM: <span className="text-white">{Math.round(selectedGpu.vram_mb / 1024)}GB</span></span>
            <span>BW: <span className="text-white">{selectedGpu.bandwidth_gbps} GB/s</span></span>
            {selectedGpu.fp16_tflops && <span>FP16: <span className="text-white">{selectedGpu.fp16_tflops}T</span></span>}
            {selectedGpu.tensor_cores && <span>TC: <span className="text-white">{selectedGpu.tensor_cores}</span></span>}
          </div>
        )}
      </div>

      {/* CPU Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">CPU</label>
        <div ref={cpuRef} className="relative">
          <input
            type="text"
            value={cpuQuery}
            onChange={(e) => {
              setCpuQuery(e.target.value);
              setCpuOpen(true);
              if (selectedCpu) {
                setSelectedCpu(null);
                onChange({ ...specs, cpu_name: undefined, cpu_cores: undefined, cpu_threads: undefined, avx2: undefined, avx512: undefined });
              }
            }}
            onFocus={() => setCpuOpen(true)}
            placeholder="Search CPU (e.g. Ryzen 9, i9-14900K, M3 Max)..."
            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-sm"
          />
          {cpuOpen && filteredCpus.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-600 bg-gray-800 shadow-xl">
              {filteredCpus.slice(0, 20).map((cpu) => (
                <li
                  key={cpu.name}
                  onClick={() => handleCpuSelect(cpu)}
                  className="cursor-pointer px-4 py-2 hover:bg-gray-700 text-gray-200 text-sm flex justify-between"
                >
                  <span>{cpu.name}</span>
                  <span className="text-gray-500">{cpu.cores}C/{cpu.threads}T</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {selectedCpu && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
            <span>Cores: <span className="text-white">{selectedCpu.cores}C/{selectedCpu.threads}T</span></span>
            <span>Cache: <span className="text-white">{selectedCpu.l3_cache_mb}MB</span></span>
            {selectedCpu.avx512 && <span className="text-green-400">AVX-512</span>}
            {selectedCpu.avx2 && !selectedCpu.avx512 && <span className="text-blue-400">AVX2</span>}
          </div>
        )}
      </div>

      {/* System RAM */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">System RAM</label>
          <span className="text-sm font-semibold text-white">{specs.ram_gb} GB</span>
        </div>
        <div className="flex gap-2">
          {RAM_OPTIONS.map((ram) => (
            <button
              key={ram}
              type="button"
              onClick={() => updateSpec('ram_gb', ram)}
              className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
                specs.ram_gb === ram
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
              }`}
            >
              {ram}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced / Manual Override */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
      >
        <svg
          className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {showAdvanced ? 'Hide' : 'Show'} Advanced / Manual Override
      </button>

      {showAdvanced && (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 space-y-4">
          <p className="text-xs text-gray-500">Override any spec manually. Empty fields use values from selected hardware.</p>

          {/* GPU Specs */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">GPU Specs</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">VRAM (GB)</label>
                <input
                  type="number"
                  min="1"
                  max="256"
                  value={specs.vram_mb ? Math.round(specs.vram_mb / 1024) : ''}
                  onChange={(e) => updateSpec('vram_mb', e.target.value ? parseInt(e.target.value) * 1024 : null)}
                  placeholder="e.g. 12"
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Bandwidth (GB/s)</label>
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={specs.bandwidth_gbps ?? ''}
                  onChange={(e) => updateSpec('bandwidth_gbps', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g. 504"
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">FP16 TFLOPS</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  step="0.1"
                  value={specs.fp16_tflops ?? ''}
                  onChange={(e) => updateSpec('fp16_tflops', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="e.g. 40"
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tensor Cores</label>
                <input
                  type="number"
                  min="0"
                  max="2000"
                  value={specs.tensor_cores ?? ''}
                  onChange={(e) => updateSpec('tensor_cores', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g. 184"
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* CPU Specs */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">CPU Specs</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cores</label>
                <input
                  type="number"
                  min="1"
                  max="256"
                  value={specs.cpu_cores ?? ''}
                  onChange={(e) => updateSpec('cpu_cores', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g. 8"
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Threads</label>
                <input
                  type="number"
                  min="1"
                  max="512"
                  value={specs.cpu_threads ?? ''}
                  onChange={(e) => updateSpec('cpu_threads', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g. 16"
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-4 col-span-2">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={specs.avx2 ?? false}
                    onChange={(e) => updateSpec('avx2', e.target.checked)}
                    className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                  />
                  AVX2
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={specs.avx512 ?? false}
                    onChange={(e) => updateSpec('avx512', e.target.checked)}
                    className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                  />
                  AVX-512
                </label>
              </div>
            </div>
          </div>

          {/* System RAM Custom */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">System</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">RAM (GB)</label>
                <input
                  type="number"
                  min="1"
                  max="4096"
                  value={specs.ram_gb}
                  onChange={(e) => updateSpec('ram_gb', parseInt(e.target.value) || 16)}
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
