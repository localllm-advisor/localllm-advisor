'use client';

import { useTheme } from '@/components/ThemeProvider';
import EmailCapture from '@/components/EmailCapture';
import Footer from '@/components/Footer';

export default function SiteFooter() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <>
      {/* Newsletter — full-width thin banner above footer */}
      <div className={`border-t ${isDark ? 'border-gray-800 bg-gray-900/80' : 'border-gray-200 bg-gray-50/80'}`}>
        <div className="mx-auto max-w-7xl px-4 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <svg className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <span className="font-semibold">Stay ahead of local AI</span>
                <span className={`hidden sm:inline ${isDark ? 'text-gray-500' : 'text-gray-500'}`}> — weekly updates on models, GPU deals & tips. Free, once a week. No spam. Unsubscribe anytime.</span>
              </p>
            </div>
            <div className="w-full sm:w-auto flex-shrink-0">
              <EmailCapture variant="inline" className="!p-0 !border-0 !bg-transparent !rounded-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </>
  );
}
