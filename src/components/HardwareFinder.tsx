'use client';

import { useState, useMemo, useEffect } from 'react';
import { Model, GPU } from '@/lib/types';
import { buildHardwareRecipe, HardwareRecipe, HardwareOption, CloudOption } from '@/lib/hardwareAdvisor';
import { useTheme } from '@/components/ThemeProvider';
import { getRetailerLinks } from '@/lib/affiliateLinks';

interface HardwareFinderProps {
  models: Model[];
  gpus: GPU[];
  initialModelId?: string;
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

export default function HardwareFinder({ models, gpus, initialModelId }: HardwareFinderProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [quantPref, setQuantPref] = useState<string>('Q4_K_M');
  const [speedPref, setSpeedPref] = useState<string>('usable');
  const [budgetPref, setBudgetPref] = useState<string>('any');
  const [modelQuery, setModelQuery] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [showAllOptions, setShowAllOptions] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Handle initial model selection from props
  useEffect(() => {
    if (initialModelId && models.length > 0) {
      const model = models.find(m => m.id === initialModelId);
      if (model) {
        setSelectedModelId(initialModelId);
        setModelQuery(model.name);
      }
    }
  }, [initialModelId, models]);

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
    setShowResults(false);
  };

  return (
    <div className="space-y-5">
      {/* Model + Preferences — single card */}
      <div
        className={`rounded-2xl border p-5 sm:p-6 ${
          isDark
            ? 'border-gray-700/60 bg-gray-800/40'
            : 'border-gray-200/80 bg-white/80'
        }`}
      >
        <div className="space-y-6">
          {/* Model Selection */}
          <div className="space-y-3">
            <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Model
            </h2>
            <div className="relative">
              <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={modelQuery}
                onChange={(e) => {
                  setModelQuery(e.target.value);
                  setIsModelDropdownOpen(true);
                  setShowResults(false);
                  if (selectedModel && e.target.value !== selectedModel.name) {
                    setSelectedModelId('');
                  }
                }}
                onFocus={() => setIsModelDropdownOpen(true)}
                placeholder="Search model (e.g. Llama 3.1 70B, Qwen 2.5, Mixtral)..."
                className={`w-full rounded-lg border pl-10 pr-4 py-2.5 text-sm transition-colors ${
                  isDark
                    ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none'
                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none'
                }`}
              />
              {isModelDropdownOpen && filteredModels.length > 0 && (
                <ul className={`absolute z-20 mt-2 max-h-60 w-full overflow-auto rounded-lg border shadow-lg ${
                  isDark
                    ? 'border-gray-600 bg-gray-800'
                    : 'border-gray-200 bg-white'
                }`}>
                  {filteredModels.map((model) => (
                    <li
                      key={model.id}
                      onClick={() => handleSelectModel(model)}
                      className={`cursor-pointer px-4 py-2.5 text-sm flex justify-between transition-colors ${
                        isDark
                          ? 'text-gray-200 hover:bg-gray-700'
                          : 'text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <span>{model.name}</span>
                      <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>{model.params_b}B</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {selectedModel && (
              <div className={`flex flex-wrap gap-x-4 gap-y-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <span>{selectedModel.params_b}B params</span>
                <span>{(selectedModel.context_length / 1024).toFixed(0)}K context</span>
                <span>{selectedModel.architecture === 'moe' ? 'MoE' : 'Dense'}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className={`border-t ${isDark ? 'border-gray-700/50' : 'border-gray-200/60'}`} />

          {/* Preferences — inline */}
          <div className="space-y-5">
            {/* Quantization */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Quantization
              </label>
              <div className="flex flex-wrap gap-2">
                {QUANT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setQuantPref(opt.value); setShowResults(false); }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      quantPref === opt.value
                        ? 'bg-purple-600 text-white shadow-sm'
                        : isDark
                          ? 'bg-transparent text-gray-400 hover:text-gray-300 border border-gray-700 hover:border-gray-500'
                          : 'bg-transparent text-gray-600 hover:text-gray-800 border border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Speed */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Speed
              </label>
              <div className="flex flex-wrap gap-2">
                {SPEED_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setSpeedPref(opt.value); setShowResults(false); }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      speedPref === opt.value
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isDark
                          ? 'bg-transparent text-gray-400 hover:text-gray-300 border border-gray-700 hover:border-gray-500'
                          : 'bg-transparent text-gray-600 hover:text-gray-800 border border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {opt.label}
                    <span className="ml-1 text-xs opacity-60">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Budget
              </label>
              <div className="flex flex-wrap gap-2">
                {BUDGET_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setBudgetPref(opt.value); setShowResults(false); }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      budgetPref === opt.value
                        ? 'bg-green-600 text-white shadow-sm'
                        : isDark
                          ? 'bg-transparent text-gray-400 hover:text-gray-300 border border-gray-700 hover:border-gray-500'
                          : 'bg-transparent text-gray-600 hover:text-gray-800 border border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Find Hardware Button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={() => setShowResults(true)}
          disabled={!selectedModel}
          className={`px-8 py-3 rounded-xl font-semibold transition-all sm:w-auto w-full ${
            selectedModel
              ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 cursor-pointer shadow-lg hover:shadow-xl'
              : `${isDark ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'} cursor-not-allowed`
          }`}
        >
          Find Hardware
        </button>
      </div>

      {/* Recipe Results */}
      {showResults && recipe && <RecipeDisplay recipe={recipe} showAllOptions={showAllOptions} setShowAllOptions={setShowAllOptions} isDark={isDark} minToks={selectedSpeed?.minToks ?? 1} />}
    </div>
  );
}

// ============================================================================
// Recipe Display Component
// ============================================================================

function RecipeDisplay({
  recipe,
  showAllOptions,
  setShowAllOptions,
  isDark,
  minToks,
}: {
  recipe: HardwareRecipe;
  showAllOptions: boolean;
  setShowAllOptions: (v: boolean) => void;
  isDark: boolean;
  minToks: number;
}) {
  return (
    <div className={`space-y-6 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
      {/* Requirements Header */}
      <div className={`rounded-xl border p-4 ${
        isDark
          ? 'bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-700/50'
          : 'bg-gradient-to-r from-blue-50/50 to-purple-50/50 border-blue-200/50'
      }`}>
        <h3 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
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
              className={`rounded-lg p-3 text-center border ${
                selected
                  ? isDark
                    ? 'bg-purple-600/30 border-purple-500'
                    : 'bg-purple-50 border-purple-300'
                  : isDark
                    ? 'bg-gray-800/50 border-gray-700'
                    : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{label}</div>
              <div className={`text-lg font-bold ${selected ? (isDark ? 'text-purple-300' : 'text-purple-700') : (isDark ? 'text-white' : 'text-gray-900')}`}>
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

      {/* All recommendation cards in a single row.
           Solo GPU card is included only when a single card can run the model
           and it differs from the budget option (avoids duplicates). */}
      {(() => {
        const showSolo = !!(
          recipe.cheapestSingleGpuOption &&
          !(
            recipe.budgetOption?.gpuCount === 1 &&
            recipe.budgetOption?.gpu.name === recipe.cheapestSingleGpuOption.gpu.name
          )
        );
        const hasAny = showSolo || recipe.budgetOption || recipe.recommendedOption || recipe.premiumOption;
        if (!hasAny) return null;

        // 4-column grid when solo card is present, 3-column otherwise
        const gridCols = showSolo
          ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
          : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';

        return (
          <div className="space-y-3">
            <h4 className={`text-sm font-medium uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Recommended Builds
            </h4>
            <div className={`grid gap-3 ${gridCols}`}>
              {showSolo && (
                <OptionCard
                  option={recipe.cheapestSingleGpuOption!}
                  badge="Solo GPU"
                  badgeColor="bg-amber-600"
                  isDark={isDark}
                  cardNote="cheapest single-card option"
                  belowSpeedThreshold={
                    recipe.cheapestSingleGpuOption!.estimatedToksPerSec < minToks
                  }
                />
              )}
              {recipe.budgetOption && (
                <OptionCard option={recipe.budgetOption} badge="Budget" badgeColor="bg-green-600" isDark={isDark} />
              )}
              {recipe.recommendedOption && recipe.recommendedOption !== recipe.budgetOption && (
                <OptionCard option={recipe.recommendedOption} badge="Best Value" badgeColor="bg-blue-600" isDark={isDark} />
              )}
              {recipe.premiumOption && recipe.premiumOption !== recipe.recommendedOption && (
                <OptionCard option={recipe.premiumOption} badge="Fastest" badgeColor="bg-purple-600" isDark={isDark} />
              )}
            </div>
          </div>
        );
      })()}

      {/* No filtered options but we have theoretical options - show minimum requirement */}
      {recipe.allOptions.length === 0 && recipe.minimumViableOption && (
        <div className="space-y-3">
          <div className={`rounded-xl border p-4 ${
            isDark
              ? 'border-yellow-600/50 bg-yellow-900/10'
              : 'border-yellow-300 bg-yellow-50'
          }`}>
            <p className={`mb-3 ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
              No GPUs match your speed/budget filters. Here&apos;s the minimum hardware required:
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <OptionCard option={recipe.minimumViableOption} badge="Minimum Required" badgeColor="bg-yellow-600" isDark={isDark} />
          </div>
        </div>
      )}

      {/* No consumer options at all - show cloud + theoretical minimum */}
      {!recipe.canRunConsumer && (
        <div className="space-y-4">
          <div className={`rounded-xl border p-4 ${
            isDark
              ? 'border-red-600/50 bg-red-900/10'
              : 'border-red-300 bg-red-50'
          }`}>
            <p className={`mb-2 font-medium ${isDark ? 'text-red-400' : 'text-red-700'}`}>
              This model is too large for consumer GPUs
            </p>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
              Requires {recipe.vramRequired.toFixed(0)}GB VRAM. Maximum consumer GPU is 32GB (RTX 5090).
              {recipe.vramRequired > 256 && (
                <span className="block mt-1">
                  Even 8x RTX 5090 (256GB) wouldn&apos;t be enough.
                </span>
              )}
            </p>
          </div>

          {recipe.cloudOptions.length > 0 ? (
            <div className="space-y-3">
              <h4 className={`text-sm font-medium uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Cloud Options</h4>
              <div className="grid gap-3 md:grid-cols-2">
                {recipe.cloudOptions.map((cloud, idx) => (
                  <CloudCard key={idx} cloud={cloud} isDark={isDark} />
                ))}
              </div>
            </div>
          ) : (
            <div className={`rounded-xl border p-4 ${
              isDark
                ? 'border-orange-600/50 bg-orange-900/10'
                : 'border-orange-300 bg-orange-50'
            }`}>
              <p className={`mb-2 font-medium ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
                Datacenter-scale infrastructure required
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                This model requires {recipe.vramRequired.toFixed(0)}GB VRAM - more than 16x H100 80GB (1.28TB).
                You&apos;ll need a large GPU cluster or consider a smaller quantization.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded text-sm ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                  ~{Math.ceil(recipe.vramRequired / 80)} x H100 80GB needed
                </span>
                <span className={`px-3 py-1 rounded text-sm ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                  ~${(Math.ceil(recipe.vramRequired / 80) * 2.5).toFixed(0)}/hr estimated
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cloud Alternatives (when consumer options exist) */}
      {recipe.canRunConsumer && recipe.cloudOptions.length > 0 && (
        <div className="space-y-3">
          <h4 className={`text-sm font-medium uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Cloud Alternatives</h4>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {recipe.cloudOptions.map((cloud, idx) => (
              <CloudCard key={idx} cloud={cloud} compact isDark={isDark} />
            ))}
          </div>
        </div>
      )}

      {/* All Options Toggle - show theoretical options */}
      {recipe.allTheoreticalOptions.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowAllOptions(!showAllOptions)}
            className={`text-sm transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
          >
            {showAllOptions
              ? '▼ Hide all options'
              : `▶ Show all ${recipe.allTheoreticalOptions.length} hardware options`
            }
          </button>

          {showAllOptions && (
            <div className="grid gap-2">
              {recipe.allTheoreticalOptions.map((opt, idx) => (
                <CompactOptionRow key={idx} option={opt} isDark={isDark} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* System Requirements */}
      {recipe.systemRequirements.notes.length > 0 && (
        <div className={`rounded-lg border p-4 ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Notes:</h4>
          <ul className={`text-sm space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
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

function OptionCard({
  option, badge, badgeColor, isDark, cardNote, belowSpeedThreshold = false,
}: {
  option: HardwareOption;
  badge: string;
  badgeColor: string;
  isDark: boolean;
  cardNote?: string;
  belowSpeedThreshold?: boolean;
}) {
  const priceDisplay = option.totalPrice
    ? `$${option.totalPrice.toLocaleString()}`
    : 'Price N/A';

  return (
    <div className={`rounded-xl border p-3 flex flex-col transition-all duration-300 hover:-translate-y-0.5 ${isDark ? 'border-gray-700 bg-gray-800/50 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5' : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100/50'}`}>

      {/* Upper content — grows to push buttons down */}
      <div className="flex-1">
        {/* Badge + total price */}
        <div className="flex items-center justify-between mb-1">
          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold text-white ${badgeColor}`}>
            {badge}
          </span>
          <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{priceDisplay}</span>
        </div>

        {/* Optional sub-label (e.g. "cheapest single-card option") */}
        {cardNote && (
          <p className={`text-[10px] mb-1.5 leading-none ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{cardNote}</p>
        )}

        {/* GPU name */}
        <div className="mb-2">
          <h5 className={`text-xs font-semibold leading-snug ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {option.gpuCount > 1 ? `${option.gpuCount}× ` : ''}{option.gpu.name}
          </h5>
          {option.gpu.price_usd && option.gpuCount > 1 && (
            <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              ${option.gpu.price_usd.toLocaleString()} each
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="space-y-0.5 text-[11px] mb-2">
          <div className={`flex justify-between ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <span>Speed</span>
            <span className={`font-medium ${belowSpeedThreshold ? (isDark ? 'text-amber-400' : 'text-amber-600') : 'text-green-400'}`}>
              ~{Math.round(option.estimatedToksPerSec)} tok/s{belowSpeedThreshold ? ' ⚠' : ''}
            </span>
          </div>
          <div className={`flex justify-between ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <span>VRAM</span>
            <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>
              {option.totalVramGb.toFixed(0)} GB · {option.vramUsagePercent}%
            </span>
          </div>
        </div>

        {/* Warnings / platform notes */}
        {belowSpeedThreshold && (
          <p className={`text-[10px] mb-1 ${isDark ? 'text-amber-500/80' : 'text-amber-600'}`}>
            Below your speed preference
          </p>
        )}
        {option.notes && (
          <p className={`text-[10px] mb-2 leading-snug ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{option.notes}</p>
        )}
      </div>

      {/* Retailer buttons — always at the bottom */}
      <div className="grid grid-cols-2 gap-1 mt-2">
        {getRetailerLinks(option.gpu.name, option.gpu).map((retailer) => (
          <a
            key={retailer.name}
            href={retailer.href}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className={`text-center rounded px-1 py-1 text-[10px] font-medium transition-all border truncate ${
              isDark
                ? 'bg-blue-700/30 hover:bg-blue-600/50 text-blue-300 hover:text-blue-200 border-blue-600/30 hover:border-blue-500/50'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border-blue-200 hover:border-blue-300'
            }`}
          >
            {retailer.name}
          </a>
        ))}
      </div>
    </div>
  );
}

function CloudCard({ cloud, compact = false, isDark }: { cloud: CloudOption; compact?: boolean; isDark: boolean }) {
  if (compact) {
    return (
      <a
        href={cloud.link}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${isDark ? 'border-gray-700 bg-gray-800/50 hover:border-blue-500' : 'border-gray-200 bg-white hover:border-blue-400'}`}
      >
        <div>
          <div className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{cloud.provider}</div>
          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {cloud.gpuCount > 1 && `${cloud.gpuCount}x `}{cloud.gpuType}
          </div>
        </div>
        <div className="text-right">
          <div className={`font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>${cloud.pricePerHour.toFixed(2)}/hr</div>
          <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>~{Math.round(cloud.estimatedToksPerSec)} tok/s</div>
        </div>
      </a>
    );
  }

  return (
    <a
      href={cloud.link}
      target="_blank"
      rel="noopener noreferrer"
      className={`rounded-xl border p-4 transition-colors block ${isDark ? 'border-gray-700 bg-gray-800/50 hover:border-blue-500' : 'border-gray-200 bg-white hover:border-blue-400'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{cloud.provider}</div>
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {cloud.gpuCount > 1 && `${cloud.gpuCount}x `}{cloud.gpuType}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>${cloud.pricePerHour.toFixed(2)}/hr</div>
        </div>
      </div>
      <div className={`flex justify-between text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        <span>VRAM: {cloud.vramGb}GB</span>
        <span className="text-green-400">~{Math.round(cloud.estimatedToksPerSec)} tok/s</span>
      </div>
    </a>
  );
}

function CompactOptionRow({ option, isDark }: { option: HardwareOption; isDark: boolean }) {
  const priceDisplay = option.totalPrice
    ? `$${option.totalPrice.toLocaleString()}`
    : 'N/A';

  const unitPrice = option.gpu.price_usd
    ? `$${option.gpu.price_usd.toLocaleString()}`
    : null;

  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-2 text-sm ${isDark ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center gap-3">
        {option.gpuCount > 1 && (
          <span className={`px-2 py-0.5 rounded text-xs ${isDark ? 'bg-purple-600/30 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
            {option.gpuCount}x
          </span>
        )}
        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{option.gpu.name}</span>
        {unitPrice && option.gpuCount === 1 && (
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>{unitPrice}</span>
        )}
      </div>
      <div className={`flex items-center gap-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        <span>{option.totalVramGb.toFixed(0)}GB</span>
        <span className="text-green-400">~{Math.round(option.estimatedToksPerSec)} tok/s</span>
        <span className={`font-medium w-24 text-right ${isDark ? 'text-white' : 'text-gray-900'}`}>{priceDisplay}</span>
      </div>
    </div>
  );
}
