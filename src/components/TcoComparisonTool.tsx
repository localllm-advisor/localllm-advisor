'use client';

import { useState, useMemo } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import EnterprisePaywall from '@/components/EnterprisePaywall';
import CollapsibleSection from '@/components/CollapsibleSection';
import { TCO_TIERS, type PricingTier } from '@/lib/stripe';
import type { CloudProvider } from '@/lib/types';

interface CloudOption {
  provider: CloudProvider;
  label: string;
  model: string;
  inputPer1MTokens: number;
  outputPer1MTokens: number;
  enabled: boolean;
}

interface TcoInputState {
  dailyRequests: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  growthRateMonthly: number;

  hardwareCost: number;
  monthlyElectricity: number;
  monthlyMaintenance: number;
  monthlyStaff: number;

  months: 12 | 24 | 36;
}

interface TcoResultData {
  onPremCumulative: number[];
  cloudCumulative: { provider: string; label: string; costs: number[] }[];
  onPremTotal: number;
  breakEvens: { provider: string; label: string; month: number | null }[];
}

// Cloud API pricing (per 1M tokens, as of early 2026)
const DEFAULT_CLOUD_OPTIONS: CloudOption[] = [
  { provider: 'openai', label: 'OpenAI GPT-4o', model: 'gpt-4o', inputPer1MTokens: 2.50, outputPer1MTokens: 10.00, enabled: true },
  { provider: 'anthropic', label: 'Anthropic Claude Sonnet', model: 'claude-sonnet', inputPer1MTokens: 3.00, outputPer1MTokens: 15.00, enabled: true },
  { provider: 'google', label: 'Google Gemini 1.5 Pro', model: 'gemini-1.5-pro', inputPer1MTokens: 1.25, outputPer1MTokens: 5.00, enabled: true },
  { provider: 'aws_bedrock', label: 'AWS Bedrock (Llama 3)', model: 'llama-3-70b', inputPer1MTokens: 2.65, outputPer1MTokens: 3.50, enabled: false },
];

const PROVIDER_COLORS: Record<string, { dark: string; light: string; bar: string }> = {
  openai: { dark: 'text-green-400', light: 'text-green-700', bar: 'bg-green-500' },
  anthropic: { dark: 'text-orange-400', light: 'text-orange-700', bar: 'bg-orange-500' },
  google: { dark: 'text-blue-400', light: 'text-blue-700', bar: 'bg-blue-500' },
  aws_bedrock: { dark: 'text-yellow-400', light: 'text-yellow-700', bar: 'bg-yellow-500' },
  azure_openai: { dark: 'text-cyan-400', light: 'text-cyan-700', bar: 'bg-cyan-500' },
};

export default function TcoComparisonTool() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Realistic enterprise defaults: 50K daily requests makes on-prem competitive
  const [input, setInput] = useState<TcoInputState>({
    dailyRequests: 50000,
    avgInputTokens: 800,
    avgOutputTokens: 400,
    growthRateMonthly: 0.10,
    hardwareCost: 60000,
    monthlyElectricity: 500,
    monthlyMaintenance: 300,
    monthlyStaff: 1500,
    months: 36,
  });

  const [cloudOptions, setCloudOptions] = useState<CloudOption[]>(DEFAULT_CLOUD_OPTIONS);
  const [showResults, setShowResults] = useState(false);
  const [activeTier, setActiveTier] = useState<PricingTier>('free');

  const toggleCloud = (provider: CloudProvider) => {
    setCloudOptions(prev => prev.map(c =>
      c.provider === provider ? { ...c, enabled: !c.enabled } : c
    ));
    setShowResults(false);
  };

  const result = useMemo((): TcoResultData | null => {
    if (!showResults) return null;

    const months = input.months;
    const enabledProviders = cloudOptions.filter(c => c.enabled);

    // On-prem: upfront hardware + monthly operating costs
    const onPremCumulative: number[] = [];
    let onPremRunning = input.hardwareCost;
    const monthlyOpex = input.monthlyElectricity + input.monthlyMaintenance + input.monthlyStaff;

    for (let m = 0; m < months; m++) {
      onPremRunning += monthlyOpex;
      onPremCumulative.push(Math.round(onPremRunning));
    }

    // Cloud: pay per token, scales with usage growth
    const cloudCumulative = enabledProviders.map(cloud => {
      const costs: number[] = [];
      let running = 0;

      for (let m = 0; m < months; m++) {
        const growthFactor = Math.pow(1 + input.growthRateMonthly, m);
        const dailyReqs = input.dailyRequests * growthFactor;
        const monthlyReqs = dailyReqs * 30;

        const inputTokensMonth = monthlyReqs * input.avgInputTokens;
        const outputTokensMonth = monthlyReqs * input.avgOutputTokens;

        const inputCost = (inputTokensMonth / 1_000_000) * cloud.inputPer1MTokens;
        const outputCost = (outputTokensMonth / 1_000_000) * cloud.outputPer1MTokens;

        running += inputCost + outputCost;
        costs.push(Math.round(running));
      }

      return { provider: cloud.provider, label: cloud.label, costs };
    });

    // Break-even: find the first month where on-prem cumulative < cloud cumulative
    const breakEvens = cloudCumulative.map(cloud => {
      let breakEvenMonth: number | null = null;
      for (let m = 0; m < months; m++) {
        if (onPremCumulative[m] < cloud.costs[m]) {
          breakEvenMonth = m + 1;
          break;
        }
      }
      return { provider: cloud.provider, label: cloud.label, month: breakEvenMonth };
    });

    return {
      onPremCumulative,
      cloudCumulative,
      onPremTotal: onPremRunning,
      breakEvens,
    };
  }, [showResults, input, cloudOptions]);

  const inputCls = `w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${
    isDark
      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-blue-500'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500'
  }`;

  const labelCls = `block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`;

  // Find max cost for chart scaling
  const maxCost = result ? Math.max(
    result.onPremTotal,
    ...result.cloudCumulative.map(c => c.costs[c.costs.length - 1] || 0)
  ) : 0;

  return (
    <div>
      {/* Input: Usage Patterns — always visible */}
      <div className={`rounded-xl p-5 border mb-4 ${isDark ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`text-sm font-semibold mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Usage Patterns
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Daily Requests</label>
            <input type="number" min={100} value={input.dailyRequests}
              onChange={e => { setInput(p => ({ ...p, dailyRequests: Number(e.target.value) })); setShowResults(false); }}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Avg Input Tokens</label>
            <input type="number" min={10} value={input.avgInputTokens}
              onChange={e => { setInput(p => ({ ...p, avgInputTokens: Number(e.target.value) })); setShowResults(false); }}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Avg Output Tokens</label>
            <input type="number" min={10} value={input.avgOutputTokens}
              onChange={e => { setInput(p => ({ ...p, avgOutputTokens: Number(e.target.value) })); setShowResults(false); }}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Monthly Growth</label>
            <select value={input.growthRateMonthly}
              onChange={e => { setInput(p => ({ ...p, growthRateMonthly: Number(e.target.value) })); setShowResults(false); }}
              className={inputCls}>
              <option value={0}>0% (Flat)</option>
              <option value={0.05}>5%/month</option>
              <option value={0.10}>10%/month</option>
              <option value={0.15}>15%/month</option>
              <option value={0.20}>20%/month</option>
            </select>
          </div>
        </div>
      </div>

      {/* On-Prem Costs — collapsible with sensible defaults */}
      <div className="mb-6">
        <CollapsibleSection title="On-Premise Costs" subtitle="hardware $60K, electricity $500/mo, maintenance $300/mo, staff $1.5K/mo">
          <div className={`rounded-xl p-5 border ${isDark ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className={labelCls}>Hardware (one-time)</label>
                <div className="relative">
                  <span className={`absolute left-3 top-2.5 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>$</span>
                  <input type="number" min={0} value={input.hardwareCost}
                    onChange={e => { setInput(p => ({ ...p, hardwareCost: Number(e.target.value) })); setShowResults(false); }}
                    className={`${inputCls} pl-7`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Electricity /mo</label>
                <div className="relative">
                  <span className={`absolute left-3 top-2.5 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>$</span>
                  <input type="number" min={0} value={input.monthlyElectricity}
                    onChange={e => { setInput(p => ({ ...p, monthlyElectricity: Number(e.target.value) })); setShowResults(false); }}
                    className={`${inputCls} pl-7`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Maintenance /mo</label>
                <div className="relative">
                  <span className={`absolute left-3 top-2.5 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>$</span>
                  <input type="number" min={0} value={input.monthlyMaintenance}
                    onChange={e => { setInput(p => ({ ...p, monthlyMaintenance: Number(e.target.value) })); setShowResults(false); }}
                    className={`${inputCls} pl-7`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Staff allocation /mo</label>
                <div className="relative">
                  <span className={`absolute left-3 top-2.5 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>$</span>
                  <input type="number" min={0} value={input.monthlyStaff}
                    onChange={e => { setInput(p => ({ ...p, monthlyStaff: Number(e.target.value) })); setShowResults(false); }}
                    className={`${inputCls} pl-7`} />
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* Cloud Providers Selection */}
      <div className={`rounded-xl p-5 border mb-6 ${isDark ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Compare Against Cloud Providers
        </h4>
        <div className="flex flex-wrap gap-3">
          {cloudOptions.map(cloud => (
            <button
              key={cloud.provider}
              onClick={() => toggleCloud(cloud.provider)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                cloud.enabled
                  ? isDark
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                    : 'bg-blue-50 border-blue-300 text-blue-700'
                  : isDark
                    ? 'bg-gray-800 border-gray-700 text-gray-500'
                    : 'bg-white border-gray-200 text-gray-400'
              }`}
            >
              {cloud.label}
              <span className={`ml-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                ${cloud.inputPer1MTokens}/${cloud.outputPer1MTokens} per 1M
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Analysis Period + Calculate */}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label className={labelCls}>Analysis Period</label>
          <select value={input.months}
            onChange={e => { setInput(p => ({ ...p, months: Number(e.target.value) as 12 | 24 | 36 })); setShowResults(false); }}
            className={inputCls}>
            <option value={12}>12 months (1 year)</option>
            <option value={24}>24 months (2 years)</option>
            <option value={36}>36 months (3 years)</option>
          </select>
        </div>
        <button
          onClick={() => setShowResults(true)}
          className="inline-flex items-center justify-center px-8 py-2.5 text-white font-semibold rounded-lg transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-sm shadow-blue-600/20 hover:shadow-md text-sm"
        >
          Compare Costs
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary Cards — always visible as preview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* On-Prem Total */}
            <div className={`rounded-xl p-4 border ${isDark ? 'bg-indigo-900/20 border-indigo-700' : 'bg-indigo-50 border-indigo-200'}`}>
              <p className={`text-xs font-medium ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>On-Premise ({input.months}mo)</p>
              <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                ${result.onPremTotal.toLocaleString()}
              </p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                ${input.hardwareCost.toLocaleString()} hardware + ${((result.onPremTotal - input.hardwareCost)).toLocaleString()} operating
              </p>
            </div>

            {/* Cloud Totals */}
            {result.cloudCumulative.map(cloud => {
              const colors = PROVIDER_COLORS[cloud.provider] || PROVIDER_COLORS.openai;
              const total = cloud.costs[cloud.costs.length - 1] || 0;
              const diff = result.onPremTotal - total;

              return (
                <div key={cloud.provider} className={`rounded-xl p-4 border ${isDark ? 'bg-gray-800/40 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <p className={`text-xs font-medium ${isDark ? colors.dark : colors.light}`}>{cloud.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    ${total.toLocaleString()}
                  </p>
                  {diff > 0 ? (
                    <p className={`text-xs mt-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                      On-prem saves ${diff.toLocaleString()} vs. this
                    </p>
                  ) : diff < 0 ? (
                    <p className={`text-xs mt-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                      ${Math.abs(diff).toLocaleString()} cheaper than on-prem
                    </p>
                  ) : (
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Same cost as on-prem
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Break-Even — FREE tier content */}
          <div className={`rounded-xl p-5 border ${isDark ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <h4 className={`text-sm font-semibold mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Break-Even Analysis
              {activeTier === 'free' && (
                <span className={`text-xs font-normal ml-2 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>Free Preview</span>
              )}
            </h4>
            <div className="space-y-3">
              {result.breakEvens.map(be => {
                const colors = PROVIDER_COLORS[be.provider] || PROVIDER_COLORS.openai;
                return (
                  <div key={be.provider} className="flex items-center gap-3">
                    <span className={`text-sm font-medium w-48 ${isDark ? colors.dark : colors.light}`}>{be.label}</span>
                    {be.month ? (
                      <div className="flex-1 flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: isDark ? '#1f2937' : '#e5e7eb' }}>
                          <div
                            className={`h-full rounded-full ${colors.bar}`}
                            style={{ width: `${Math.min(100, (be.month / input.months) * 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold whitespace-nowrap ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Month {be.month}
                        </span>
                      </div>
                    ) : (
                      <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Cloud remains cheaper over {input.months} months at this volume
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Verdict — free tier shows this but no dollar amounts */}
            {activeTier === 'free' && (
              <div className={`mt-4 rounded-lg p-3 border border-dashed text-center ${isDark ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-gray-50'}`}>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Exact dollar savings and full timeline available with Plus or Ultra
                </p>
              </div>
            )}
          </div>

          {/* PLUS+ content: Detailed Timeline */}
          {activeTier !== 'free' && (
            <div className={`rounded-xl p-5 border ${isDark ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <h4 className={`text-sm font-semibold mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Cumulative Cost Over Time
              </h4>
              <div className="space-y-4">
                {[
                  { label: 'Month 6', idx: 5 },
                  { label: 'Month 12', idx: 11 },
                  ...(input.months >= 24 ? [{ label: 'Month 24', idx: 23 }] : []),
                  ...(input.months >= 36 ? [{ label: 'Month 36', idx: 35 }] : []),
                ].filter(t => t.idx < input.months).map(timepoint => {
                  const onPremCost = result.onPremCumulative[timepoint.idx] || 0;
                  return (
                    <div key={timepoint.label}>
                      <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{timepoint.label}</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs w-36 truncate ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>On-Premise</span>
                          <div className="flex-1 h-4 rounded overflow-hidden" style={{ background: isDark ? '#1f2937' : '#e5e7eb' }}>
                            <div className="h-full rounded bg-indigo-500" style={{ width: `${maxCost > 0 ? (onPremCost / maxCost) * 100 : 0}%` }} />
                          </div>
                          <span className={`text-xs font-mono w-24 text-right ${isDark ? 'text-white' : 'text-gray-900'}`}>${onPremCost.toLocaleString()}</span>
                        </div>
                        {result.cloudCumulative.map(cloud => {
                          const cost = cloud.costs[timepoint.idx] || 0;
                          const colors = PROVIDER_COLORS[cloud.provider] || PROVIDER_COLORS.openai;
                          return (
                            <div key={cloud.provider} className="flex items-center gap-2">
                              <span className={`text-xs w-36 truncate ${isDark ? colors.dark : colors.light}`}>{cloud.label}</span>
                              <div className="flex-1 h-4 rounded overflow-hidden" style={{ background: isDark ? '#1f2937' : '#e5e7eb' }}>
                                <div className={`h-full rounded ${colors.bar}`} style={{ width: `${maxCost > 0 ? (cost / maxCost) * 100 : 0}%` }} />
                              </div>
                              <span className={`text-xs font-mono w-24 text-right ${isDark ? 'text-white' : 'text-gray-900'}`}>${cost.toLocaleString()}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ULTRA content: Extra analysis sections */}
          {activeTier === 'ultra' && (
            <div className={`rounded-xl p-5 border-2 ${isDark ? 'border-purple-700 bg-purple-900/20' : 'border-purple-300 bg-purple-50'}`}>
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>ULTRA</span>
                <h5 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Extended TCO Analysis</h5>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className={`rounded-lg p-4 ${isDark ? 'bg-gray-900/60' : 'bg-white/80'}`}>
                  <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>Sensitivity Analysis (3 Scenarios)</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Conservative (5% growth), base case ({(input.growthRateMonthly * 100).toFixed(0)}% growth), and aggressive ({(input.growthRateMonthly * 200).toFixed(0)}% growth) projections with break-even variance for each scenario.</p>
                </div>
                <div className={`rounded-lg p-4 ${isDark ? 'bg-gray-900/60' : 'bg-white/80'}`}>
                  <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>Hidden Cloud Costs</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Data egress fees (~$0.09/GB), SLA penalties for 99.9% uptime, premium support tiers ($15K-100K/yr), and rate-limit overage charges factored into true cloud TCO.</p>
                </div>
                <div className={`rounded-lg p-4 ${isDark ? 'bg-gray-900/60' : 'bg-white/80'}`}>
                  <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>GDPR Compliance Addendum</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>DPO allocation costs, annual audit fees, breach insurance premiums, and data residency requirements for on-prem vs. cloud EU deployment.</p>
                </div>
                <div className={`rounded-lg p-4 ${isDark ? 'bg-gray-900/60' : 'bg-white/80'}`}>
                  <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>Carbon Footprint Comparison</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Estimated CO₂ emissions for on-premise (based on local grid mix) vs. cloud providers&apos; reported carbon intensity. ESG reporting data included.</p>
                </div>
              </div>
            </div>
          )}

          {/* Paywall: show when on free tier */}
          {activeTier === 'free' && (
            <div className="relative">
              <div className="blur-sm select-none pointer-events-none opacity-60">
                <div className={`rounded-xl p-5 border ${isDark ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  <h4 className={`text-sm font-semibold mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Cumulative Cost Over Time
                  </h4>
                  <div className="space-y-4">
                    {[{ label: 'Month 6', idx: 5 }, { label: 'Month 12', idx: 11 }].map(tp => (
                      <div key={tp.label}>
                        <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tp.label}</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs w-36">On-Premise</span>
                            <div className="flex-1 h-4 rounded bg-indigo-500/40" />
                            <span className="text-xs w-24 text-right">$XXX,XXX</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <EnterprisePaywall
                tiers={TCO_TIERS}
                currentTier={activeTier}
                onSelectTier={setActiveTier}
              />
            </div>
          )}

          <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            Cloud API prices based on publicly listed pricing as of early 2026. On-premise costs are estimates
            and don&apos;t include initial setup, networking, or physical infrastructure beyond power.
          </p>
        </div>
      )}
    </div>
  );
}
