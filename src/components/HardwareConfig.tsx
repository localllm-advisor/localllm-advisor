'use client';

import { useState, useRef, useEffect } from 'react';
import { GPU, CPU } from '@/lib/types';
import { detectHardware, matchGpuFromRenderer, parseGpuRenderer } from '@/lib/detectHardware';

export interface HardwareSpecs {
  // GPU
  gpu_name?: string;
  gpu_vendor?: 'nvidia' | 'amd' | 'apple' | 'intel';
  vram_mb: number | null;
  bandwidth_gbps?: number;
  memory_type?: 'GDDR6' | 'GDDR6X' | 'GDDR7' | 'HBM2' | 'HBM2e' | 'HBM3' | 'Unified';
  cuda_cores?: number;
  stream_processors?: number;
  gpu_cores?: number;
  compute_units?: number;
  tensor_cores?: number;
  fp16_tflops?: number;
  fp32_tflops?: number;
  int8_tops?: number;
  pcie_gen?: number;
  pcie_lanes?: number;
  gpu_tdp_watts?: number;
  // Multi-GPU
  gpu_count?: number;
  nvlink?: boolean;
  // CPU
  cpu_name?: string;
  cpu_vendor?: 'intel' | 'amd' | 'apple';
  cpu_cores?: number;
  cpu_threads?: number;
  p_cores?: number;
  e_cores?: number;
  base_clock_ghz?: number;
  boost_clock_ghz?: number;
  l3_cache_mb?: number;
  avx?: boolean;
  avx2?: boolean;
  avx512?: boolean;
  amx?: boolean;
  // System RAM
  ram_gb: number;
  ram_speed_mhz?: number;
  ram_channels?: number;
  // Storage
  storage_type?: 'nvme' | 'ssd' | 'hdd';
  storage_speed_gbps?: number;
  // Inference preference
  inference_mode?: 'auto' | 'gpu_only' | 'gpu_offload' | 'cpu_only';
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
  const [detectedRenderer, setDetectedRenderer] = useState<string | null>(null);
  const [detectedGpu, setDetectedGpu] = useState<GPU | null>(null);
  const [hasAutoDetected, setHasAutoDetected] = useState(false);
  const [isSoftwareRenderer, setIsSoftwareRenderer] = useState(false);
  const [cpuHint, setCpuHint] = useState<string | null>(null);
  const [detectedCpu, setDetectedCpu] = useState<CPU | null>(null);

  const gpuRef = useRef<HTMLDivElement>(null);
  const cpuRef = useRef<HTMLDivElement>(null);

  // Auto-detect hardware on mount
  useEffect(() => {
    if (hasAutoDetected) return;

    const hardware = detectHardware();

    // GPU detection
    if (!selectedGpu && !specs.vram_mb) {
      if (hardware.isSoftwareRenderer) {
        setIsSoftwareRenderer(true);
      } else if (hardware.gpuRenderer) {
        setDetectedRenderer(hardware.gpuRenderer);
        const matched = matchGpuFromRenderer(hardware.gpuRenderer, gpus);
        if (matched) {
          setDetectedGpu(matched);
        }
      }
    }

    // CPU detection
    if (!selectedCpu && !specs.cpu_cores) {
      setCpuHint(hardware.cpuHint);

      // For Apple Silicon, try to match CPU from database
      if (hardware.appleChip) {
        const matchedCpu = cpus.find(cpu =>
          cpu.name.toLowerCase().includes(hardware.appleChip!.toLowerCase())
        );
        if (matchedCpu) {
          setDetectedCpu(matchedCpu);
        }
      }
    }

    setHasAutoDetected(true);
  }, [gpus, cpus, hasAutoDetected, selectedGpu, selectedCpu, specs.vram_mb, specs.cpu_cores]);

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
      gpu_vendor: gpu.vendor,
      vram_mb: gpu.vram_mb,
      bandwidth_gbps: gpu.bandwidth_gbps,
      memory_type: gpu.memory_type,
      cuda_cores: gpu.cuda_cores,
      stream_processors: gpu.stream_processors,
      gpu_cores: gpu.gpu_cores,
      compute_units: gpu.compute_units,
      tensor_cores: gpu.tensor_cores,
      fp16_tflops: gpu.fp16_tflops,
      fp32_tflops: gpu.fp32_tflops,
      int8_tops: gpu.int8_tops,
      pcie_gen: gpu.pcie_gen,
      pcie_lanes: gpu.pcie_lanes,
      gpu_tdp_watts: gpu.tdp_watts,
    });
  }

  function handleCpuSelect(cpu: CPU) {
    setSelectedCpu(cpu);
    setCpuQuery(cpu.name);
    setCpuOpen(false);
    onChange({
      ...specs,
      cpu_name: cpu.name,
      cpu_vendor: cpu.vendor,
      cpu_cores: cpu.cores,
      cpu_threads: cpu.threads,
      p_cores: cpu.p_cores,
      e_cores: cpu.e_cores,
      base_clock_ghz: cpu.base_clock_ghz,
      boost_clock_ghz: cpu.boost_clock_ghz,
      l3_cache_mb: cpu.l3_cache_mb,
      avx: cpu.avx,
      avx2: cpu.avx2,
      avx512: cpu.avx512,
      amx: cpu.amx,
    });
  }

  function updateSpec<K extends keyof HardwareSpecs>(key: K, value: HardwareSpecs[K]) {
    onChange({ ...specs, [key]: value });
  }

  function handleUseDetectedGpu() {
    if (detectedGpu) {
      handleGpuSelect(detectedGpu);
      setDetectedGpu(null);
      setDetectedRenderer(null);
    }
  }

  function handleDismissDetectedGpu() {
    setDetectedGpu(null);
    setDetectedRenderer(null);
  }

  function handleUseDetectedCpu() {
    if (detectedCpu) {
      handleCpuSelect(detectedCpu);
      setDetectedCpu(null);
      setCpuHint(null);
    }
  }

  function handleDismissDetectedCpu() {
    setDetectedCpu(null);
    setCpuHint(null);
  }

  const RAM_OPTIONS = [8, 16, 32, 64, 128];

  return (
    <div className="space-y-4">
      {/* Software renderer warning */}
      {isSoftwareRenderer && !selectedGpu && !specs.vram_mb && (
        <div className="rounded-lg border border-orange-600/50 bg-orange-900/20 p-3 space-y-1">
          <div className="flex items-center gap-2 text-orange-400 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            GPU detection unavailable
          </div>
          <p className="text-sm text-gray-400">
            Your browser is using software rendering. This can happen with:
          </p>
          <ul className="text-xs text-gray-500 list-disc list-inside space-y-0.5">
            <li>Remote desktop or virtual machine</li>
            <li>Hardware acceleration disabled in browser settings</li>
            <li>Outdated GPU drivers</li>
          </ul>
          <p className="text-xs text-gray-500 mt-1">
            Please select your GPU manually below.
          </p>
        </div>
      )}

      {/* Auto-detected GPU banner */}
      {detectedGpu && !selectedGpu && !specs.vram_mb && (
        <div className="rounded-lg border border-green-600/50 bg-green-900/20 p-3 space-y-2">
          <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            GPU Detected
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-white font-medium">{detectedGpu.name}</span>
              <span className="text-gray-400 ml-2">({Math.round(detectedGpu.vram_mb / 1024)}GB VRAM)</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUseDetectedGpu}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-500"
              >
                Use this
              </button>
              <button
                type="button"
                onClick={handleDismissDetectedGpu}
                className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-600"
              >
                Choose different
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detected but not matched */}
      {detectedRenderer && !detectedGpu && !selectedGpu && !specs.vram_mb && (
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
            Select your GPU below or use Advanced to enter specs manually.
          </p>
        </div>
      )}

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
                onChange({
                  ...specs,
                  gpu_name: undefined, gpu_vendor: undefined, vram_mb: null, bandwidth_gbps: undefined,
                  memory_type: undefined, cuda_cores: undefined, stream_processors: undefined,
                  gpu_cores: undefined, compute_units: undefined, tensor_cores: undefined,
                  fp16_tflops: undefined, fp32_tflops: undefined, int8_tops: undefined,
                  pcie_gen: undefined, pcie_lanes: undefined, gpu_tdp_watts: undefined,
                });
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
            <span>VRAM: <span className="text-white">{Math.round(selectedGpu.vram_mb / 1024)}GB {selectedGpu.memory_type}</span></span>
            <span>BW: <span className="text-white">{selectedGpu.bandwidth_gbps} GB/s</span></span>
            {selectedGpu.cuda_cores && <span>CUDA: <span className="text-white">{selectedGpu.cuda_cores}</span></span>}
            {selectedGpu.stream_processors && <span>SP: <span className="text-white">{selectedGpu.stream_processors}</span></span>}
            {selectedGpu.gpu_cores && <span>GPU Cores: <span className="text-white">{selectedGpu.gpu_cores}</span></span>}
            {selectedGpu.tensor_cores && <span>TC: <span className="text-white">{selectedGpu.tensor_cores}</span></span>}
            {selectedGpu.fp16_tflops && <span>FP16: <span className="text-white">{selectedGpu.fp16_tflops}T</span></span>}
            {selectedGpu.pcie_gen && <span>PCIe: <span className="text-white">{selectedGpu.pcie_gen}.0 x{selectedGpu.pcie_lanes}</span></span>}
            {selectedGpu.tdp_watts && <span>TDP: <span className="text-white">{selectedGpu.tdp_watts}W</span></span>}
          </div>
        )}
      </div>

      {/* CPU Detection Banner */}
      {detectedCpu && !selectedCpu && !specs.cpu_cores && (
        <div className="rounded-lg border border-green-600/50 bg-green-900/20 p-3 space-y-2">
          <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            CPU Detected
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-white font-medium">{detectedCpu.name}</span>
              <span className="text-gray-400 ml-2">({detectedCpu.cores}C/{detectedCpu.threads}T)</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUseDetectedCpu}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-500"
              >
                Use this
              </button>
              <button
                type="button"
                onClick={handleDismissDetectedCpu}
                className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-600"
              >
                Choose different
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CPU Hint (when no match but have info) */}
      {cpuHint && !detectedCpu && !selectedCpu && !specs.cpu_cores && (
        <div className="rounded-lg border border-blue-600/50 bg-blue-900/20 p-3 space-y-1">
          <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            System Info
          </div>
          <p className="text-sm text-gray-300">
            {cpuHint}
          </p>
          <p className="text-xs text-gray-500">
            Select your CPU below for accurate performance estimates.
          </p>
        </div>
      )}

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
                onChange({
                  ...specs,
                  cpu_name: undefined, cpu_vendor: undefined, cpu_cores: undefined, cpu_threads: undefined,
                  p_cores: undefined, e_cores: undefined, base_clock_ghz: undefined, boost_clock_ghz: undefined,
                  l3_cache_mb: undefined, avx: undefined, avx2: undefined, avx512: undefined, amx: undefined,
                });
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
            {selectedCpu.p_cores && <span>P/E: <span className="text-white">{selectedCpu.p_cores}P/{selectedCpu.e_cores}E</span></span>}
            <span>Clock: <span className="text-white">{selectedCpu.base_clock_ghz}{selectedCpu.boost_clock_ghz ? `-${selectedCpu.boost_clock_ghz}` : ''} GHz</span></span>
            <span>L3: <span className="text-white">{selectedCpu.l3_cache_mb}MB</span></span>
            {selectedCpu.amx && <span className="text-purple-400">AMX</span>}
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
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">VRAM (GB)</label>
                <input
                  type="number"
                  min="1"
                  max="256"
                  value={specs.vram_mb ? Math.round(specs.vram_mb / 1024) : ''}
                  onChange={(e) => updateSpec('vram_mb', e.target.value ? parseInt(e.target.value) * 1024 : null)}
                  placeholder="12"
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
                  placeholder="504"
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Memory Type</label>
                <select
                  value={specs.memory_type ?? ''}
                  onChange={(e) => updateSpec('memory_type', e.target.value as HardwareSpecs['memory_type'] || undefined)}
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-</option>
                  <option value="GDDR6">GDDR6</option>
                  <option value="GDDR6X">GDDR6X</option>
                  <option value="GDDR7">GDDR7</option>
                  <option value="HBM2">HBM2</option>
                  <option value="HBM2e">HBM2e</option>
                  <option value="HBM3">HBM3</option>
                  <option value="Unified">Unified</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">CUDA Cores</label>
                <input
                  type="number"
                  min="0"
                  max="50000"
                  value={specs.cuda_cores ?? ''}
                  onChange={(e) => updateSpec('cuda_cores', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="9728"
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Stream Proc.</label>
                <input
                  type="number"
                  min="0"
                  max="50000"
                  value={specs.stream_processors ?? ''}
                  onChange={(e) => updateSpec('stream_processors', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="6144"
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
                  placeholder="304"
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
                  placeholder="82.6"
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">FP32 TFLOPS</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  step="0.1"
                  value={specs.fp32_tflops ?? ''}
                  onChange={(e) => updateSpec('fp32_tflops', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="41.3"
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">INT8 TOPS</label>
                <input
                  type="number"
                  min="1"
                  max="2000"
                  value={specs.int8_tops ?? ''}
                  onChange={(e) => updateSpec('int8_tops', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="660"
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">PCIe Gen</label>
                <select
                  value={specs.pcie_gen ?? ''}
                  onChange={(e) => updateSpec('pcie_gen', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-</option>
                  <option value="3">Gen 3</option>
                  <option value="4">Gen 4</option>
                  <option value="5">Gen 5</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">PCIe Lanes</label>
                <select
                  value={specs.pcie_lanes ?? ''}
                  onChange={(e) => updateSpec('pcie_lanes', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-</option>
                  <option value="4">x4</option>
                  <option value="8">x8</option>
                  <option value="16">x16</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">TDP (W)</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={specs.gpu_tdp_watts ?? ''}
                  onChange={(e) => updateSpec('gpu_tdp_watts', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="320"
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Multi-GPU */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Multi-GPU</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">GPU Count</label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={specs.gpu_count ?? ''}
                  onChange={(e) => updateSpec('gpu_count', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="1"
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={specs.nvlink ?? false}
                    onChange={(e) => updateSpec('nvlink', e.target.checked)}
                    className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                  />
                  NVLink
                </label>
              </div>
            </div>
          </div>

          {/* CPU Specs */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">CPU Specs</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cores</label>
                <input
                  type="number"
                  min="1"
                  max="256"
                  value={specs.cpu_cores ?? ''}
                  onChange={(e) => updateSpec('cpu_cores', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="8"
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
                  placeholder="16"
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">P-Cores</label>
                <input
                  type="number"
                  min="0"
                  max="64"
                  value={specs.p_cores ?? ''}
                  onChange={(e) => updateSpec('p_cores', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="8"
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">E-Cores</label>
                <input
                  type="number"
                  min="0"
                  max="64"
                  value={specs.e_cores ?? ''}
                  onChange={(e) => updateSpec('e_cores', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="16"
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Base GHz</label>
                <input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={specs.base_clock_ghz ?? ''}
                  onChange={(e) => updateSpec('base_clock_ghz', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="3.2"
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Boost GHz</label>
                <input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={specs.boost_clock_ghz ?? ''}
                  onChange={(e) => updateSpec('boost_clock_ghz', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="5.8"
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">L3 Cache (MB)</label>
                <input
                  type="number"
                  min="1"
                  max="1024"
                  value={specs.l3_cache_mb ?? ''}
                  onChange={(e) => updateSpec('l3_cache_mb', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="36"
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-end pb-1 gap-3 col-span-2 md:col-span-3 lg:col-span-5">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={specs.avx ?? false}
                    onChange={(e) => updateSpec('avx', e.target.checked)}
                    className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                  />
                  AVX
                </label>
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
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={specs.amx ?? false}
                    onChange={(e) => updateSpec('amx', e.target.checked)}
                    className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                  />
                  AMX
                </label>
              </div>
            </div>
          </div>

          {/* System */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">System</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
              <div>
                <label className="block text-xs text-gray-500 mb-1">RAM Speed (MHz)</label>
                <input
                  type="number"
                  min="800"
                  max="10000"
                  value={specs.ram_speed_mhz ?? ''}
                  onChange={(e) => updateSpec('ram_speed_mhz', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="5600"
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">RAM Channels</label>
                <select
                  value={specs.ram_channels ?? ''}
                  onChange={(e) => updateSpec('ram_channels', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-</option>
                  <option value="1">1 (Single)</option>
                  <option value="2">2 (Dual)</option>
                  <option value="4">4 (Quad)</option>
                  <option value="8">8 (Octa)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Storage Type</label>
                <select
                  value={specs.storage_type ?? ''}
                  onChange={(e) => updateSpec('storage_type', e.target.value as HardwareSpecs['storage_type'] || undefined)}
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-</option>
                  <option value="nvme">NVMe SSD</option>
                  <option value="ssd">SATA SSD</option>
                  <option value="hdd">HDD</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Storage GB/s</label>
                <input
                  type="number"
                  min="0.1"
                  max="20"
                  step="0.1"
                  value={specs.storage_speed_gbps ?? ''}
                  onChange={(e) => updateSpec('storage_speed_gbps', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="7.0"
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Inference Preference */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Inference Preference</h4>
            <div className="flex flex-wrap gap-2">
              {(['auto', 'gpu_only', 'gpu_offload', 'cpu_only'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updateSpec('inference_mode', mode)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    specs.inference_mode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                  }`}
                >
                  {mode === 'auto' && 'Auto'}
                  {mode === 'gpu_only' && 'GPU Only'}
                  {mode === 'gpu_offload' && 'GPU + RAM Offload'}
                  {mode === 'cpu_only' && 'CPU Only'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Auto: best mode based on VRAM. GPU Only: fail if model does not fit. Offload: use system RAM. CPU: no GPU.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
