'use client';

import { AdvancedFilters, QuantLevel, ModelSizeRange, SortBy, ModelFamily, ModelArchitecture } from '@/lib/types';
import { useTheme } from '@/components/ThemeProvider';

interface AdvancedOptionsProps {
  filters: AdvancedFilters;
  onChange: (filters: AdvancedFilters) => void;
}

const CONTEXT_OPTIONS = [4096, 8192, 16384, 32768, 65536, 131072, 200000];
const CONTEXT_LABELS = ['4K', '8K', '16K', '32K', '64K', '128K', '200K'];

const QUANT_OPTIONS: { value: QuantLevel; label: string; desc: string }[] = [
  { value: 'Q3_K_M', label: 'Q3', desc: 'Ultra compact' },
  { value: 'Q4_K_M', label: 'Q4', desc: 'Smallest, fastest' },
  { value: 'Q5_K_M', label: 'Q5', desc: 'Balanced size' },
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

const FAMILY_OPTIONS: { value: ModelFamily; label: string }[] = [
  { value: 'llama', label: 'Llama' },
  { value: 'qwen', label: 'Qwen' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'gemma', label: 'Gemma' },
  { value: 'phi', label: 'Phi' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'falcon', label: 'Falcon' },
  { value: 'command', label: 'Command' },
  { value: 'glm', label: 'GLM' },
  { value: 'kimi', label: 'Kimi' },
  { value: 'exaone', label: 'EXAONE' },
  { value: 'nemotron', label: 'Nemotron' },
  { value: 'yi', label: 'Yi' },
  { value: 'bloom', label: 'BLOOM' },
  { value: 'starcoder', label: 'StarCoder' },
  { value: 'stablelm', label: 'StableLM' },
  { value: 'olmo', label: 'OLMo' },
  { value: 'mimo', label: 'MiMo' },
  { value: 'minimax', label: 'MiniMax' },
  { value: 'ernie', label: 'ERNIE' },
  { value: 'embedding', label: 'Embedding' },
  { value: 'zephyr', label: 'Zephyr' },
  { value: 'other', label: 'Other' },
];

const ARCHITECTURE_OPTIONS: { value: ModelArchitecture; label: string; desc: string }[] = [
  { value: 'dense', label: 'Dense', desc: 'Standard transformer' },
  { value: 'moe', label: 'MoE', desc: 'Mixture of Experts' },
];

const ALL_FAMILIES: ModelFamily[] = FAMILY_OPTIONS.map(f => f.value);
const ALL_ARCHITECTURES: ModelArchitecture[] = ['dense', 'moe'];

export const DEFAULT_FILTERS: AdvancedFilters = {
  contextLength: 4096,
  quantLevels: ['Q3_K_M', 'Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0', 'FP16'],
  minSpeed: null,
  sizeRanges: ['small', 'medium', 'large', 'xlarge'],
  families: ALL_FAMILIES,
  architectures: ALL_ARCHITECTURES,
  sortBy: 'score',
  minMmlu: null,
  minMath: null,
  minCoding: null,
  showCpuOnly: true,
  showOffload: true,
  showOnlyFitsVram: false,
};

export default function AdvancedOptions({ filters, onChange }: AdvancedOptionsProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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

  function toggleFamily(family: ModelFamily) {
    const current = filters.families;
    if (current.includes(family)) {
      if (current.length > 1) {
        updateFilter('families', current.filter(f => f !== family));
      }
    } else {
      updateFilter('families', [...current, family]);
    }
  }

  function toggleArchitecture(arch: ModelArchitecture) {
    const current = filters.architectures;
    if (current.includes(arch)) {
      if (current.length > 1) {
        updateFilter('architectures', current.filter(a => a !== arch));
      }
    } else {
      updateFilter('architectures', [...current, arch]);
    }
  }

  function selectAllFamilies() {
    updateFilter('families', ALL_FAMILIES);
  }

  function clearFamilies() {
    // Keep at least one
    updateFilter('families', [ALL_FAMILIES[0]]);
  }

  // Count active filters (reserved for future badge display)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _activeFilters = [
    filters.contextLength !== 4096,
    filters.quantLevels.length < 4,
    filters.minSpeed !== null,
    filters.sizeRanges.length < 4,
    filters.families.length < ALL_FAMILIES.length,
    filters.architectures.length < 2,
    filters.sortBy !== 'score',
    filters.minMmlu !== null,
    filters.minMath !== null,
    filters.minCoding !== null,
    !filters.showCpuOnly,
    !filters.showOffload,
    filters.showOnlyFitsVram,
  ].filter(Boolean).length;

  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-900/60 text-white placeholder-gray-600' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'}`;
  const labelClass = `block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`;
  const hintClass = `text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`;

  const pillActive = (color: string) =>
    `${color} text-white shadow-sm`;
  const pillInactive = isDark
    ? 'bg-gray-700 text-gray-400 hover:bg-gray-600 border border-gray-600'
    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300';

  return (
    <div className="space-y-5">
      {/* Context Length */}
      <div className="space-y-2">
        <label className={labelClass}>Context Length</label>
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
          <span className={`w-14 text-right text-sm font-mono ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
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
        <label className={labelClass}>Sort By</label>
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateFilter('sortBy', opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filters.sortBy === opt.value
                  ? pillActive('bg-blue-600')
                  : pillInactive
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quantization Filter */}
      <div className="space-y-2">
        <label className={labelClass}>Quantization</label>
        <div className="flex flex-wrap gap-2">
          {QUANT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleQuant(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filters.quantLevels.includes(opt.value)
                  ? pillActive('bg-purple-600')
                  : pillInactive
              }`}
              title={opt.desc}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className={hintClass}>Q4: smallest/fastest, FP16: highest quality. Click to toggle.</p>
      </div>

      {/* Model Size Filter */}
      <div className="space-y-2">
        <label className={labelClass}>Model Size</label>
        <div className="flex flex-wrap gap-2">
          {SIZE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleSize(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filters.sizeRanges.includes(opt.value)
                  ? pillActive('bg-green-600')
                  : pillInactive
              }`}
            >
              {opt.label} <span className="text-xs opacity-75">{opt.range}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Model Family Filter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className={labelClass}>Model Family</label>
          <div className="flex gap-2">
            <button type="button" onClick={selectAllFamilies} className={`text-xs ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}>All</button>
            <span className={isDark ? 'text-gray-600' : 'text-gray-400'}>|</span>
            <button type="button" onClick={clearFamilies} className={`text-xs ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}>Clear</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
          {FAMILY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleFamily(opt.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filters.families.includes(opt.value)
                  ? pillActive('bg-cyan-600')
                  : pillInactive
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className={hintClass}>{filters.families.length} of {ALL_FAMILIES.length} families selected</p>
      </div>

      {/* Architecture Filter */}
      <div className="space-y-2">
        <label className={labelClass}>Architecture</label>
        <div className="flex flex-wrap gap-2">
          {ARCHITECTURE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleArchitecture(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filters.architectures.includes(opt.value)
                  ? pillActive('bg-indigo-600')
                  : pillInactive
              }`}
              title={opt.desc}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className={hintClass}>Dense: standard transformer. MoE: Mixture of Experts (e.g., Mixtral, DeepSeek).</p>
      </div>

      {/* Minimum Speed */}
      <div className="space-y-2">
        <label className={labelClass}>Minimum Speed</label>
        <div className="flex flex-wrap gap-2">
          {SPEED_OPTIONS.map(opt => (
            <button
              key={opt.value ?? 'any'}
              type="button"
              onClick={() => updateFilter('minSpeed', opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filters.minSpeed === opt.value
                  ? pillActive('bg-orange-600')
                  : pillInactive
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Benchmark Minimums */}
      <div className="space-y-2">
        <label className={labelClass}>Minimum Benchmarks</label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={`block text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>MMLU-PRO</label>
            <input type="number" min="0" max="100" placeholder="Any"
              value={filters.minMmlu ?? ''}
              onChange={(e) => updateFilter('minMmlu', e.target.value ? parseInt(e.target.value) : null)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={`block text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>MATH</label>
            <input type="number" min="0" max="100" placeholder="Any"
              value={filters.minMath ?? ''}
              onChange={(e) => updateFilter('minMath', e.target.value ? parseInt(e.target.value) : null)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={`block text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Coding</label>
            <input type="number" min="0" max="100" placeholder="Any"
              value={filters.minCoding ?? ''}
              onChange={(e) => updateFilter('minCoding', e.target.value ? parseInt(e.target.value) : null)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Show/Hide Toggles */}
      <div className="space-y-2">
        <label className={labelClass}>Show Models</label>
        <div className="flex flex-wrap gap-4">
          {[
            { key: 'showOffload' as const, label: 'GPU+RAM Offload' },
            { key: 'showCpuOnly' as const, label: 'CPU Only' },
            { key: 'showOnlyFitsVram' as const, label: 'Only fits in VRAM' },
          ].map(({ key, label }) => (
            <label key={key} className={`flex items-center gap-2 text-sm cursor-pointer ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <input
                type="checkbox"
                checked={filters[key] as boolean}
                onChange={(e) => updateFilter(key, e.target.checked)}
                className="rounded border-gray-400 text-blue-500 focus:ring-blue-500"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      <div className={`pt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_FILTERS)}
          className={`text-sm ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
