'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';

/**
 * BackButton — a refined pill-style "Back" button below the navbar.
 * Uses router.back() so it respects browser history.
 */
export default function BackButton() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4">
      <button
        onClick={() => router.back()}
        className={`group inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
          isDark
            ? 'text-gray-400 bg-gray-800/60 hover:bg-gray-700/80 hover:text-white border border-gray-700/50 hover:border-gray-600'
            : 'text-gray-500 bg-gray-100/80 hover:bg-gray-200 hover:text-gray-900 border border-gray-200 hover:border-gray-300'
        }`}
      >
        <svg
          className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>
    </div>
  );
}
