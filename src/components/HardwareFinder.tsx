'use client';

import { useState, useMemo } from 'react';
import { Model, GPU } from '@/lib/types';
import { buildHardwareRecipe, HardwareRecipe, HardwareOption, CloudOption } from '@/lib/hardwareAdvisor';

interface HardwareFinderProps {
  models: Model[];
  gpus: GPU[];
}

const QUANT_OPTIONS = [
  { value: 'Q4_K_M', label: 'Q4 (Smallest)', bpw: 4.5 },
  { value: 'Q6_K', label: 'Q6 (Balanced)', bpw: 6.5 },
  { value: 'Q8_0', label: 'Q8 (Quality)', bpw: 8.5 },
  { value: 'FP16', label: 'FP16 (Max)', bpw: 16 },
];

const SPEED_OPTIONS = [
  { value: 'any', label: 'Any', minToks: 1, desc: 'Just make it run' },
  { value: 'usable', label: 'Usable', minToks: 10, desc: '10+ tok/s' },
  { value: 'fast', label: 'Fast', minToks: 25, desc: '25+ tok/s' },
  { value: 'blazing', label: 'Blazing', minToks: 50, desc: '50+ tok/s' },
];

const BUDGET_OPTIONS = [
  { value: 'any', label: 'No limit', maxUsd: null },
  { value: 'under500', label: 'Under $500', maxUsd: 500 },
  { value: 'under1000', label: 'Under $1,000', maxUsd: 1000 },
  { value: 'under1500', label: 'Under $1,500', maxUsd: 1500 },
  { value: 'under2000', label: 'Under $2,000', maxUsd: 2000 },
  { value: 'under3000', label: 'Under $3,000', maxUsd: 3000 },
  { value: 'under5000', label: 'Under $5,000', maxUsd: 5000 },
];

export default function HardwareFinder({ models, gpus }: HardwareFinderProps) {
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [quantPref, setQuantPref] = useState<string>('Q4_K_M');
  const [speedPref, setSpeedPref] = useState<string>('usable');
  const [budgetPref, setBudgetPref] = useState<string>('any');
  const [modelQuery, setModelQuery] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [showAllOptions, setShowAllOptions] = useState(false);

  const selectedModel = models.find(m => m.id === selectedModelId);
  const selectedQuant = QUANT_OPTIONS.find(q => q.value === quantPref);
  const selectedSpeed = SPEED_OPTIONS.find(s => s.value === speedPref);
  const selectedBudget = BUDGET_OPTIONS.find(b => b.value === budgetPref);

  const filteredModels = useMemo(() => {
    const q = modelQuery.toLowerCase();
    const filtered = modelQuery
      ? models.filter(m =>
          m.name.toLowerCase().includes(q) ||
          m.family.toLowerCase().includes(q)
        )
      : models;
    return filtered.sort((a, b) => b.params_b - a.params_b);
  }, [models, modelQuery]);

  const recipe = useMemo(() => {
    if (!selectedModel) return null;
    return buildHardwareRecipe(
      selectedModel,
      gpus,
      selectedQuant?.bpw || 4.5,
      selectedSpeed?.minToks || 10,
      selectedBudget?.maxUsd || null
    );
  }, [selectedModel, gpus, selectedQuant, selectedSpeed, selectedBudget]);

  const handleSelectModel = (model: Model) => {
    setSelectedModelId(model.id);
    setModelQuery(model.name);
    setIsModelDropdownOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Which model do you want to run?
        </label>
        <div className="relative">
          <input
            type="text"
            value={modelQuery}
            onChange={(e) => {
              setModelQuery(e.target.value);
              setIsModelDropdownOpen(true);
              if (selectedModel && e.target.value !== selectedModel.name) {
                setSelectedModelId('');
              }
            }}
            onFocus={() => setIsModelDropdownOpen(true)}
            placeholder="Search model (e.g. Llama 3.1 70B, Qwen 2.5, Mixtral)..."
            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
          {isModelDropdownOpen && filteredModels.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-600 bg-gray-800 shadow-xl">
              {filteredModels.map((model) => (
                <li
                  key={model.id}
                  onClick={() => handleSelectModel(model)}
                  className="cursor-pointer px-4 py-2.5 hover:bg-gray-700 text-gray-200 text-sm flex justify-between"
                >
                  <span>{model.name}</span>
                  <span className="text-gray-500">{model.params_b}B</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {selectedModel && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400">
            <span>Parameters: <span className="text-white">{selectedModel.params_b}B</span></span>
            <span>Context: <span className="text-white">{(selectedModel.context_length / 1024).toFixed(0)}K</span></span>
            <span>Type: <span className="text-white">{selectedModel.architecture === 'moe' ? 'MoE' : 'Dense'}</span></span>
          </div>
        )}
      </div>

      {/* Quantization */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Quantization</label>
        <div className="flex flex-wrap gap-2">
          {QUANT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setQuantPref(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                quantPref === opt.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          Lower quant = less VRAM needed but slightly lower quality
        </p>
      </div>

      {/* Speed Preference */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Desired Speed</label>
        <div className="flex flex-wrap gap-2">
          {SPEED_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSpeedPref(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                speedPref === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {opt.label}
              <span className="ml-1 text-xs opacity-75">({opt.desc})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Budget</label>
        <div className="flex flex-wrap gap-2">
          {BUDGET_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setBudgetPref(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                budgetPref === opt.value
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recipe Results */}
      {recipe && <RecipeDisplay recipe={recipe} showAllOptions={showAllOptions} setShowAllOptions={setShowAllOptions} />}
    </div>
  );
}

// ============================================================================
// Recipe Display Component
// ============================================================================

function RecipeDisplay({
  recipe,
  showAllOptions,
  setShowAllOptions
}: {
  recipe: HardwareRecipe;
  showAllOptions: boolean;
  setShowAllOptions: (v: boolean) => void;
}) {
  return (
    <div className="space-y-6 pt-4 border-t border-gray-700">
      {/* Requirements Header */}
      <div className="rounded-xl bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 p-4">
        <h3 className="text-lg font-semibold text-white mb-3">
          Hardware Recipe for {recipe.model.name}
        </h3>

        {/* VRAM Requirements Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Q4', value: recipe.allVramRequirements.q4, selected: recipe.quantization === 'Q4_K_M' },
            { label: 'Q6', value: recipe.allVramRequirements.q6, selected: recipe.quantization === 'Q6_K' },
            { label: 'Q8', value: recipe.allVramRequirements.q8, selected: recipe.quantization === 'Q8_0' },
            { label: 'FP16', value: recipe.allVramRequirements.fp16, selected: recipe.quantization === 'FP16' },
          ].map(({ label, value, selected }) => (
            <div
              key={label}
              className={`rounded-lg p-3 text-center ${
                selected
                  ? 'bg-purple-600/30 border border-purple-500'
                  : 'bg-gray-800/50 border border-gray-700'
              }`}
            >
              <div className="text-xs text-gray-400">{label}</div>
              <div className={`text-lg font-bold ${selected ? 'text-purple-300' : 'text-white'}`}>
                {value.toFixed(1)} GB
              </div>
            </div>
          ))}
        </div>

        {/* Status Badge */}
        <div className="flex flex-wrap gap-2">
          {recipe.canRunSingleGpu ? (
            <span className="px-3 py-1 rounded-full bg-green-600/20 text-green-400 text-sm border border-green-600/30">
              ✓ Single GPU possible
            </span>
          ) : recipe.canRunDualGpu ? (
            <span className="px-3 py-1 rounded-full bg-yellow-600/20 text-yellow-400 text-sm border border-yellow-600/30">
              ⚡ Requires 2 GPUs
            </span>
          ) : recipe.canRunConsumer ? (
            <span className="px-3 py-1 rounded-full bg-orange-600/20 text-orange-400 text-sm border border-orange-600/30">
              🔥 Requires {recipe.minGpusNeeded}+ GPUs
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-red-600/20 text-red-400 text-sm border border-red-600/30">
              ☁️ Cloud recommended
            </span>
          )}

          {recipe.systemRequirements.minRamGb > 32 && (
            <span className="px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 text-sm border border-blue-600/30">
              RAM: {recipe.systemRequirements.minRamGb}GB+
            </span>
          )}

          {recipe.systemRequirements.minPsuWatts > 600 && (
            <span className="px-3 py-1 rounded-full bg-gray-600/20 text-gray-400 text-sm border border-gray-600/30">
              PSU: {recipe.systemRequirements.minPsuWatts}W+
            </span>
          )}
        </div>
      </div>

      {/* Featured Options */}
      {(recipe.budgetOption || recipe.recommendedOption || recipe.premiumOption) && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Recommended Builds</h4>
          <div className="grid gap-3 md:grid-cols-3">
            {recipe.budgetOption && (
              <OptionCard option={recipe.budgetOption} badge="Budget" badgeColor="bg-green-600" />
            )}
            {recipe.recommendedOption && recipe.recommendedOption !== recipe.budgetOption && (
              <OptionCard option={recipe.recommendedOption} badge="Best Value" badgeColor="bg-blue-600" />
            )}
            {recipe.premiumOption && recipe.premiumOption !== recipe.recommendedOption && (
              <OptionCard option={recipe.premiumOption} badge="Fastest" badgeColor="bg-purple-600" />
            )}
          </div>
        </div>
      )}

      {/* No Consumer Options - Show Cloud First */}
      {!recipe.canRunConsumer && recipe.cloudOptions.length > 0 && (
        <div className="rounded-xl border border-yellow-600/50 bg-yellow-900/10 p-4">
          <p className="text-yellow-400 mb-3">
            This model requires more VRAM than available consumer GPUs. Consider cloud options:
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {recipe.cloudOptions.map((cloud, idx) => (
              <CloudCard key={idx} cloud={cloud} />
            ))}
          </div>
        </div>
      )}

      {/* Cloud Options (when consumer options exist) */}
      {recipe.canRunConsumer && recipe.cloudOptions.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Cloud Alternatives</h4>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {recipe.cloudOptions.map((cloud, idx) => (
              <CloudCard key={idx} cloud={cloud} compact />
            ))}
          </div>
        </div>
      )}

      {/* All Options Toggle */}
      {recipe.allOptions.length > 3 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowAllOptions(!showAllOptions)}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            {showAllOptions ? '▼ Hide all options' : `▶ Show all ${recipe.allOptions.length} options`}
          </button>

          {showAllOptions && (
            <div className="grid gap-2">
              {recipe.allOptions.map((opt, idx) => (
                <CompactOptionRow key={idx} option={opt} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* System Requirements */}
      {recipe.systemRequirements.notes.length > 0 && (
        <div className="rounded-lg bg-gray-800/50 border border-gray-700 p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-2">System Notes</h4>
          <ul className="text-sm text-gray-300 space-y-1">
            {recipe.systemRequirements.notes.map((note, idx) => (
              <li key={idx}>• {note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Option Cards
// ============================================================================

function OptionCard({ option, badge, badgeColor }: { option: HardwareOption; badge: string; badgeColor: string }) {
  const priceDisplay = option.totalPrice
    ? `$${option.totalPrice.toLocaleString()}`
    : 'Price N/A';

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <span className={`px-2 py-0.5 rounded text-xs text-white ${badgeColor}`}>
          {badge}
        </span>
        <span className="text-lg font-bold text-white">{priceDisplay}</span>
      </div>

      <h5 className="font-semibold text-white mb-1">
        {option.gpuCount > 1 && `${option.gpuCount}x `}{option.gpu.name}
      </h5>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between text-gray-400">
          <span>Speed</span>
          <span className="text-green-400 font-medium">~{Math.round(option.estimatedToksPerSec)} tok/s</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>VRAM</span>
          <span className="text-white">{option.totalVramGb.toFixed(0)}GB ({option.vramUsagePercent}% used)</span>
        </div>
      </div>

      {option.notes && (
        <p className="mt-2 text-xs text-gray-500">{option.notes}</p>
      )}

      <a
        href={`https://www.amazon.com/s?k=${encodeURIComponent(option.gpu.name)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 block w-full text-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500 transition-colors"
      >
        Search on Amazon →
      </a>
    </div>
  );
}

function CloudCard({ cloud, compact = false }: { cloud: CloudOption; compact?: boolean }) {
  if (compact) {
    return (
      <a
        href={cloud.link}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 p-3 hover:border-blue-500 transition-colors"
      >
        <div>
          <div className="font-medium text-white text-sm">{cloud.provider}</div>
          <div className="text-xs text-gray-400">
            {cloud.gpuCount > 1 && `${cloud.gpuCount}x `}{cloud.gpuType}
          </div>
        </div>
        <div className="text-right">
          <div className="text-blue-400 font-medium">${cloud.pricePerHour.toFixed(2)}/hr</div>
          <div className="text-xs text-gray-500">~{Math.round(cloud.estimatedToksPerSec)} tok/s</div>
        </div>
      </a>
    );
  }

  return (
    <a
      href={cloud.link}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-xl border border-gray-700 bg-gray-800/50 p-4 hover:border-blue-500 transition-colors block"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-semibold text-white">{cloud.provider}</div>
          <div className="text-sm text-gray-400">
            {cloud.gpuCount > 1 && `${cloud.gpuCount}x `}{cloud.gpuType}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-blue-400">${cloud.pricePerHour.toFixed(2)}/hr</div>
        </div>
      </div>
      <div className="flex justify-between text-sm text-gray-400">
        <span>VRAM: {cloud.vramGb}GB</span>
        <span className="text-green-400">~{Math.round(cloud.estimatedToksPerSec)} tok/s</span>
      </div>
    </a>
  );
}

function CompactOptionRow({ option }: { option: HardwareOption }) {
  const priceDisplay = option.totalPrice
    ? `$${option.totalPrice.toLocaleString()}`
    : 'N/A';

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/30 px-4 py-2 text-sm">
      <div className="flex items-center gap-3">
        {option.gpuCount > 1 && (
          <span className="px-2 py-0.5 rounded bg-purple-600/30 text-purple-300 text-xs">
            {option.gpuCount}x
          </span>
        )}
        <span className="text-white font-medium">{option.gpu.name}</span>
      </div>
      <div className="flex items-center gap-4 text-gray-400">
        <span>{option.totalVramGb.toFixed(0)}GB</span>
        <span className="text-green-400">~{Math.round(option.estimatedToksPerSec)} tok/s</span>
        <span className="text-white font-medium w-24 text-right">{priceDisplay}</span>
      </div>
    </div>
  );
}
