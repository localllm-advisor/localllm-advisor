'use client';

import { useState } from 'react';
import { AdvancedFilters, QuantLevel, ModelSizeRange, SortBy } from '@/lib/types';

interface AdvancedOptionsProps {
  filters: AdvancedFilters;
  onChange: (filters: AdvancedFilters) => void;
}

const CONTEXT_OPTIONS = [4096, 8192, 16384, 32768, 65536, 131072, 200000];
const CONTEXT_LABELS = ['4K', '8K', '16K', '32K', '64K', '128K', '200K'];

const QUANT_OPTIONS: { value: QuantLevel; label: string; desc: string }[] = [
  { value: 'Q4_K_M', label: 'Q4', desc: 'Smallest, fastest' },
  { value: 'Q6_K', label: 'Q6', desc: 'Good balance' },
  { value: 'Q8_0', label: 'Q8', desc: 'High quality' },
  { value: 'FP16', label: 'FP16', desc: 'Maximum quality' },
];

const SIZE_OPTIONS: { value: ModelSizeRange; label: string; range: string }[] = [
  { value: 'small', label: 'Small', range: '≤7B' },
  { value: 'medium', label: 'Medium', range: '8-13B' },
  { value: 'large', label: 'Large', range: '14-34B' },
  { value: 'xlarge', label: 'XL', range: '35B+' },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'score', label: 'Overall Score' },
  { value: 'speed', label: 'Speed (tok/s)' },
  { value: 'quality', label: 'Quality (benchmarks)' },
  { value: 'vram', label: 'VRAM Usage (lowest)' },
  { value: 'params', label: 'Parameters (smallest)' },
];

const SPEED_OPTIONS = [
  { value: null, label: 'Any' },
  { value: 5, label: '5+ tok/s' },
  { value: 10, label: '10+ tok/s' },
  { value: 20, label: '20+ tok/s' },
  { value: 30, label: '30+ tok/s' },
  { value: 50, label: '50+ tok/s' },
];

export const DEFAULT_FILTERS: AdvancedFilters = {
  contextLength: 4096,
  quantLevels: ['Q4_K_M', 'Q6_K', 'Q8_0', 'FP16'],
  minSpeed: null,
  sizeRanges: ['small', 'medium', 'large', 'xlarge'],
  sortBy: 'score',
  minMmlu: null,
  minMath: null,
  minCoding: null,
  showCpuOnly: true,
  showOffload: true,
  showOnlyFitsVram: false,
};

export default function AdvancedOptions({ filters, onChange }: AdvancedOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const contextIndex = CONTEXT_OPTIONS.indexOf(filters.contextLength);

  function updateFilter<K extends keyof AdvancedFilters>(key: K, value: AdvancedFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  function toggleQuant(level: QuantLevel) {
    const current = filters.quantLevels;
    if (current.includes(level)) {
      if (current.length > 1) {
        updateFilter('quantLevels', current.filter(q => q !== level));
      }
    } else {
      updateFilter('quantLevels', [...current, level]);
    }
  }

  function toggleSize(size: ModelSizeRange) {
    const current = filters.sizeRanges;
    if (current.includes(size)) {
      if (current.length > 1) {
        updateFilter('sizeRanges', current.filter(s => s !== size));
      }
    } else {
      updateFilter('sizeRanges', [...current, size]);
    }
  }

  // Count active filters
  const activeFilters = [
    filters.contextLength !== 4096,
    filters.quantLevels.length < 4,
    filters.minSpeed !== null,
    filters.sizeRanges.length < 4,
    filters.sortBy !== 'score',
    filters.minMmlu !== null,
    filters.minMath !== null,
    filters.minCoding !== null,
    !filters.showCpuOnly,
    !filters.showOffload,
    filters.showOnlyFitsVram,
  ].filter(Boolean).length;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300"
      >
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Advanced Options
        {activeFilters > 0 && (
          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
            {activeFilters}
          </span>
        )}
        <span className="text-gray-500">
          (Context: {CONTEXT_LABELS[contextIndex]})
        </span>
      </button>

      {isOpen && (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 space-y-5">
          {/* Context Length */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Context Length</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max={CONTEXT_OPTIONS.length - 1}
                step="1"
                value={contextIndex}
                onChange={(e) => updateFilter('contextLength', CONTEXT_OPTIONS[parseInt(e.target.value)])}
                className="flex-1 accent-blue-500"
              />
              <span className="w-14 text-right text-sm font-mono text-blue-400">
                {CONTEXT_LABELS[contextIndex]}
              </span>
            </div>
            {filters.contextLength >= 65536 && (
              <p className="text-xs text-yellow-500">
                High context requires significant VRAM. Not all models support this.
              </p>
            )}
          </div>

          {/* Sort By */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Sort By</label>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateFilter('sortBy', opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    filters.sortBy === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantization Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Quantization</label>
            <div className="flex flex-wrap gap-2">
              {QUANT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleQuant(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    filters.quantLevels.includes(opt.value)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                  title={opt.desc}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Q4: smallest/fastest, FP16: highest quality. Click to toggle.
            </p>
          </div>

          {/* Model Size Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Model Size</label>
            <div className="flex flex-wrap gap-2">
              {SIZE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleSize(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    filters.sizeRanges.includes(opt.value)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {opt.label} <span className="text-xs opacity-75">{opt.range}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Minimum Speed */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Minimum Speed</label>
            <div className="flex flex-wrap gap-2">
              {SPEED_OPTIONS.map(opt => (
                <button
                  key={opt.value ?? 'any'}
                  type="button"
                  onClick={() => updateFilter('minSpeed', opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    filters.minSpeed === opt.value
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Benchmark Minimums */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Minimum Benchmarks</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">MMLU-PRO</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Any"
                  value={filters.minMmlu ?? ''}
                  onChange={(e) => updateFilter('minMmlu', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">MATH</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Any"
                  value={filters.minMath ?? ''}
                  onChange={(e) => updateFilter('minMath', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Coding</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Any"
                  value={filters.minCoding ?? ''}
                  onChange={(e) => updateFilter('minCoding', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Show/Hide Toggles */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Show Models</label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showOffload}
                  onChange={(e) => updateFilter('showOffload', e.target.checked)}
                  className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                />
                GPU+RAM Offload
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showCpuOnly}
                  onChange={(e) => updateFilter('showCpuOnly', e.target.checked)}
                  className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                />
                CPU Only
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showOnlyFitsVram}
                  onChange={(e) => updateFilter('showOnlyFitsVram', e.target.checked)}
                  className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                />
                Only fits in VRAM
              </label>
            </div>
          </div>

          {/* Reset Button */}
          <div className="pt-2 border-t border-gray-700">
            <button
              type="button"
              onClick={() => onChange(DEFAULT_FILTERS)}
              className="text-sm text-gray-400 hover:text-white"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
