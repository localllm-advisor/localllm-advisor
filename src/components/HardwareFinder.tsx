'use client';

import { useState, useMemo } from 'react';
import { Model, GPU } from '@/lib/types';
import { findHardwareForModel, HardwareRecommendation } from '@/lib/hardwareAdvisor';

interface HardwareFinderProps {
  models: Model[];
  gpus: GPU[];
}

type SpeedPreference = 'any' | 'usable' | 'fast' | 'blazing';
type BudgetRange = 'any' | 'under500' | 'under1000' | 'under1500' | 'under2000';

const SPEED_OPTIONS: { value: SpeedPreference; label: string; minToks: number; desc: string }[] = [
  { value: 'any', label: 'Any', minToks: 1, desc: 'Just make it run' },
  { value: 'usable', label: 'Usable', minToks: 10, desc: '10+ tok/s' },
  { value: 'fast', label: 'Fast', minToks: 25, desc: '25+ tok/s' },
  { value: 'blazing', label: 'Blazing', minToks: 50, desc: '50+ tok/s' },
];

const BUDGET_OPTIONS: { value: BudgetRange; label: string; maxEur: number | null }[] = [
  { value: 'any', label: 'No limit', maxEur: null },
  { value: 'under500', label: 'Under €500', maxEur: 500 },
  { value: 'under1000', label: 'Under €1,000', maxEur: 1000 },
  { value: 'under1500', label: 'Under €1,500', maxEur: 1500 },
  { value: 'under2000', label: 'Under €2,000', maxEur: 2000 },
];

const QUANT_OPTIONS = [
  { value: 'Q4_K_M', label: 'Q4 (Smallest)', bpw: 4.5 },
  { value: 'Q6_K', label: 'Q6 (Balanced)', bpw: 6.5 },
  { value: 'Q8_0', label: 'Q8 (Quality)', bpw: 8.5 },
  { value: 'FP16', label: 'FP16 (Max)', bpw: 16 },
];

export default function HardwareFinder({ models, gpus }: HardwareFinderProps) {
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [speedPref, setSpeedPref] = useState<SpeedPreference>('usable');
  const [budgetRange, setBudgetRange] = useState<BudgetRange>('any');
  const [quantPref, setQuantPref] = useState<string>('Q4_K_M');
  const [modelQuery, setModelQuery] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  const selectedModel = models.find(m => m.id === selectedModelId);

  const filteredModels = useMemo(() => {
    if (!modelQuery) return models.slice(0, 20);
    const q = modelQuery.toLowerCase();
    return models.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.family.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [models, modelQuery]);

  const recommendations = useMemo(() => {
    if (!selectedModel) return [];

    const speedOpt = SPEED_OPTIONS.find(s => s.value === speedPref);
    const budgetOpt = BUDGET_OPTIONS.find(b => b.value === budgetRange);
    const quantOpt = QUANT_OPTIONS.find(q => q.value === quantPref);

    return findHardwareForModel(
      selectedModel,
      gpus,
      speedOpt?.minToks || 10,
      budgetOpt?.maxEur || null,
      quantOpt?.bpw || 4.5
    );
  }, [selectedModel, gpus, speedPref, budgetRange, quantPref]);

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
              onClick={() => setBudgetRange(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                budgetRange === opt.value
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {selectedModel && (
        <div className="space-y-4 pt-4 border-t border-gray-700">
          <h3 className="text-lg font-semibold text-white">
            Hardware for {selectedModel.name}
          </h3>

          {recommendations.length === 0 ? (
            <div className="rounded-lg border border-yellow-600/50 bg-yellow-900/20 p-4">
              <p className="text-yellow-400">
                No GPUs found matching your criteria. Try:
              </p>
              <ul className="text-sm text-gray-400 mt-2 list-disc list-inside">
                <li>Lowering the speed requirement</li>
                <li>Using a smaller quantization (Q4)</li>
                <li>Increasing your budget</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec, idx) => (
                <HardwareCard key={rec.gpu.name} rec={rec} rank={idx + 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HardwareCard({ rec, rank }: { rec: HardwareRecommendation; rank: number }) {
  const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '•';
  const priceDisplay = rec.gpu.price_eur
    ? `€${rec.gpu.price_eur.toLocaleString()}`
    : rec.gpu.price_usd
      ? `$${rec.gpu.price_usd.toLocaleString()}`
      : 'Price N/A';

  const availabilityBadge = rec.gpu.availability === 'used_only'
    ? { text: 'Used', color: 'bg-yellow-600' }
    : rec.gpu.availability === 'preorder'
      ? { text: 'Pre-order', color: 'bg-blue-600' }
      : rec.gpu.availability === 'discontinued'
        ? { text: 'Discontinued', color: 'bg-red-600' }
        : null;

  return (
    <div className={`rounded-xl border p-4 ${
      rank === 1
        ? 'border-yellow-500/50 bg-yellow-900/10'
        : 'border-gray-700 bg-gray-800/50'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl">{rankEmoji}</span>
            <h4 className="text-lg font-semibold text-white">{rec.gpu.name}</h4>
            {rec.gpuCount > 1 && (
              <span className="px-2 py-0.5 rounded bg-purple-600 text-xs text-white">
                {rec.gpuCount}x GPU
              </span>
            )}
            {availabilityBadge && (
              <span className={`px-2 py-0.5 rounded text-xs text-white ${availabilityBadge.color}`}>
                {availabilityBadge.text}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="text-gray-400">
              Speed: <span className="text-green-400 font-medium">~{Math.round(rec.estimatedToksPerSec)} tok/s</span>
            </span>
            <span className="text-gray-400">
              VRAM: <span className="text-white">{rec.vramUsagePercent}%</span>
            </span>
            <span className="text-gray-400">
              Total VRAM: <span className="text-white">{Math.round(rec.totalVramGb)}GB</span>
            </span>
          </div>

          {rec.notes && (
            <p className="mt-2 text-xs text-gray-500">{rec.notes}</p>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className="text-xl font-bold text-white">
            {rec.gpuCount > 1
              ? `€${((rec.gpu.price_eur || 0) * rec.gpuCount).toLocaleString()}`
              : priceDisplay
            }
          </div>
          {rec.gpuCount > 1 && rec.gpu.price_eur && (
            <div className="text-xs text-gray-500">
              {rec.gpuCount}x {priceDisplay}
            </div>
          )}

          {rec.gpu.affiliate_url ? (
            <a
              href={rec.gpu.affiliate_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500 transition-colors"
            >
              Buy on Amazon →
            </a>
          ) : (
            <a
              href={`https://www.amazon.com/s?k=${encodeURIComponent(rec.gpu.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-500 transition-colors"
            >
              Search on Amazon →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
