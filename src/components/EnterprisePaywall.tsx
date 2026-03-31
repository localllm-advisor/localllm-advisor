'use client';

import { useTheme } from '@/components/ThemeProvider';
import { type TierConfig, type PricingTier } from '@/lib/stripe';
import { CONTACT_EMAIL } from '@/lib/email';

interface EnterprisePaywallProps {
  /** The tiers to display */
  tiers: TierConfig[];
  /** Current active tier */
  currentTier: PricingTier;
  /** Callback when user selects the free tier */
  onSelectTier: (tier: PricingTier) => void;
}

/**
 * EnterprisePaywall — a 3-tier feature gating overlay.
 * Free tier is immediately accessible; Plus/Ultra prompt the user to get in touch.
 */
export default function EnterprisePaywall({
  tiers,
  currentTier,
  onSelectTier,
}: EnterprisePaywallProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const accentMap: Record<string, { bg: string; bgHover: string; border: string; text: string; badge: string }> = {
    green: {
      bg: isDark ? 'bg-green-600/20' : 'bg-green-50',
      bgHover: isDark ? 'hover:bg-green-600/30' : 'hover:bg-green-100',
      border: isDark ? 'border-green-700' : 'border-green-300',
      text: isDark ? 'text-green-400' : 'text-green-700',
      badge: isDark ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700',
    },
    blue: {
      bg: isDark ? 'bg-blue-600/20' : 'bg-blue-50',
      bgHover: isDark ? 'hover:bg-blue-600/30' : 'hover:bg-blue-100',
      border: isDark ? 'border-blue-600' : 'border-blue-400',
      text: isDark ? 'text-blue-400' : 'text-blue-700',
      badge: isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-700',
    },
    purple: {
      bg: isDark ? 'bg-purple-600/20' : 'bg-purple-50',
      bgHover: isDark ? 'hover:bg-purple-600/30' : 'hover:bg-purple-100',
      border: isDark ? 'border-purple-600' : 'border-purple-400',
      text: isDark ? 'text-purple-400' : 'text-purple-700',
      badge: isDark ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-100 text-purple-700',
    },
  };

  const contactSubject = encodeURIComponent('LocalLLM Advisor — Enterprise Inquiry');
  const contactHref = `mailto:${CONTACT_EMAIL}?subject=${contactSubject}`;

  return (
    <div className="relative">
      {/* Gradient fade overlay */}
      <div className={`absolute inset-0 z-10 ${
        isDark
          ? 'bg-gradient-to-b from-transparent via-gray-900/80 to-gray-900'
          : 'bg-gradient-to-b from-transparent via-white/80 to-white'
      }`} />

      {/* Tier Cards */}
      <div className="relative z-20 pt-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {tiers.map(tier => {
            const colors = accentMap[tier.accent] || accentMap.blue;
            const isActive = currentTier === tier.id;
            const isFree = tier.id === 'free';

            return (
              <div
                key={tier.id}
                className={`rounded-xl p-5 border-2 transition-all relative flex flex-col ${
                  tier.highlighted ? `${colors.border} ${colors.bg}` : isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
                } ${isActive ? 'ring-2 ring-offset-2 ' + (isDark ? 'ring-blue-500 ring-offset-gray-900' : 'ring-blue-500 ring-offset-white') : ''}`}
              >
                {/* Popular badge */}
                {tier.highlighted /*&& (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
                    MOST POPULAR
                  </div>
                )*/}

                {/* Header — label only, no price */}
                <div className="text-center mb-4">
                  <span className={`text-xs font-bold uppercase ${colors.text}`}>{tier.label}</span>
                </div>

                {/* Features */}
                <ul className={`text-xs space-y-2 mb-5 flex-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <svg className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${colors.text}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA — pinned to bottom */}
                <div className="mt-auto pt-2">
                  {isFree ? (
                    isActive ? (
                      <div className={`w-full text-center py-2 rounded-lg text-sm font-medium ${colors.badge}`}>
                        Current Plan
                      </div>
                    ) : (
                      <button
                        onClick={() => onSelectTier('free')}
                        className={`w-full py-2 rounded-lg text-sm font-medium border transition-all ${
                          isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        View Free Report
                      </button>
                    )
                  ) : (
                    <a
                      href={contactHref}
                      className={`block w-full text-center py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        tier.highlighted
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-sm'
                          : isDark
                            ? 'bg-purple-600 hover:bg-purple-500 text-white'
                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      Contact Us
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
