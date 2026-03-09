'use client';

import { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import {
  supabase,
  signInWithGitHub,
  signInWithGoogle,
  createPriceAlert,
  getGpuPriceStats,
} from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { AlertType, GpuPriceStats } from '@/lib/types';

interface PriceAlertModalProps {
  gpuName: string;
  currentPrice?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PriceAlertModal({
  gpuName,
  currentPrice: initialPrice,
  onClose,
  onSuccess,
}: PriceAlertModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [priceStats, setPriceStats] = useState<GpuPriceStats | null>(null);

  // Form state
  const [targetPrice, setTargetPrice] = useState('');
  const [alertType, setAlertType] = useState<AlertType>('below');

  // Check auth status and fetch price stats
  useEffect(() => {
    async function init() {
      const [{ data: { user } }, stats] = await Promise.all([
        supabase.auth.getUser(),
        getGpuPriceStats(gpuName),
      ]);
      setUser(user);
      setPriceStats(stats);

      // Pre-fill target price with a reasonable default
      if (stats?.current_price_usd) {
        setTargetPrice(Math.round(stats.current_price_usd * 0.9).toString());
      } else if (initialPrice) {
        setTargetPrice(Math.round(initialPrice * 0.9).toString());
      }

      setLoading(false);
    }

    init();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [gpuName, initialPrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const price = parseInt(targetPrice);
    if (isNaN(price) || price <= 0) {
      setError('Please enter a valid price');
      setSubmitting(false);
      return;
    }

    const result = await createPriceAlert({
      gpu_name: gpuName,
      target_price_usd: price,
      alert_type: alertType,
    });

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } else {
      setError(result.error || 'Failed to create alert');
    }

    setSubmitting(false);
  };

  const currentPrice = priceStats?.current_price_usd ?? initialPrice;

  const inputClass = `w-full px-3 py-2 rounded-lg border text-sm ${
    isDark
      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
  } focus:outline-none focus:ring-1 focus:ring-blue-500`;

  const labelClass = `block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-md rounded-2xl border shadow-2xl ${
          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Set Price Alert
            </h2>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {gpuName}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading...</p>
            </div>
          ) : !user ? (
            // Login prompt
            <div className="text-center py-6">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Sign in to create alerts
              </h3>
              <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                We&apos;ll notify you when the price reaches your target.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={signInWithGitHub}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Continue with GitHub
                </button>
                <button
                  onClick={signInWithGoogle}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors border ${
                    isDark
                      ? 'bg-gray-800 hover:bg-gray-700 text-white border-gray-600'
                      : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                  }`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
              </div>
            </div>
          ) : success ? (
            // Success message
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Alert Created!
              </h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                We&apos;ll notify you when the price changes.
              </p>
            </div>
          ) : (
            // Create alert form
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Price info */}
              {(currentPrice || priceStats?.min_30d) && (
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {currentPrice && (
                      <div>
                        <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Current Price</div>
                        <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          ${currentPrice.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {priceStats?.min_30d && (
                      <div>
                        <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>30-Day Low</div>
                        <div className="font-semibold text-green-400">
                          ${priceStats.min_30d.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {priceStats?.avg_30d && (
                      <div>
                        <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>30-Day Avg</div>
                        <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          ${priceStats.avg_30d.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {priceStats?.max_30d && (
                      <div>
                        <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>30-Day High</div>
                        <div className="font-semibold text-red-400">
                          ${priceStats.max_30d.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Alert type */}
              <div>
                <label className={labelClass}>Alert me when price is</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'below', label: 'Below', icon: '↓' },
                    { value: 'above', label: 'Above', icon: '↑' },
                    { value: 'any_change', label: 'Any Change', icon: '↔' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAlertType(option.value as AlertType)}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        alertType === option.value
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : isDark
                            ? 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {option.icon} {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target price */}
              {alertType !== 'any_change' && (
                <div>
                  <label className={labelClass}>Target Price (USD) *</label>
                  <div className="relative">
                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      $
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      placeholder="Enter target price..."
                      className={`${inputClass} pl-7`}
                      required
                    />
                  </div>
                  {currentPrice && targetPrice && (
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {alertType === 'below'
                        ? `${Math.round((1 - parseInt(targetPrice) / currentPrice) * 100)}% below current price`
                        : `${Math.round((parseInt(targetPrice) / currentPrice - 1) * 100)}% above current price`
                      }
                    </p>
                  )}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    Create Alert
                  </>
                )}
              </button>

              <p className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Logged in as {user.email || user.user_metadata?.user_name}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
