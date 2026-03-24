'use client';

import { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';

const CONSENT_KEY = 'llm_cookie_consent';

export type ConsentStatus = 'pending' | 'accepted' | 'rejected';

/** Read stored consent (safe for SSR). */
export function getConsentStatus(): ConsentStatus {
  if (typeof window === 'undefined') return 'pending';
  return (localStorage.getItem(CONSENT_KEY) as ConsentStatus) || 'pending';
}

export default function CookieConsent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if user hasn't decided yet
    if (getConsentStatus() === 'pending') {
      // Small delay so banner doesn't flash on first paint
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
    // Reload so Analytics component picks up consent
    window.location.reload();
  }

  function reject() {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 pointer-events-none">
      <div
        className={`pointer-events-auto mx-auto max-w-xl rounded-xl shadow-2xl border backdrop-blur-sm p-5 ${
          isDark
            ? 'bg-gray-900/95 border-gray-700 text-gray-200'
            : 'bg-white/95 border-gray-200 text-gray-800'
        }`}
      >
        <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          We use Google Analytics cookies to understand how visitors interact with
          the site. No personal data is collected or sold.{' '}
          <a
            href="/privacy"
            className={`underline ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
          >
            Privacy Policy
          </a>
        </p>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={accept}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            Accept
          </button>
          <button
            onClick={reject}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors border ${
              isDark
                ? 'border-gray-600 text-gray-400 hover:text-white hover:border-gray-500'
                : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400'
            }`}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
