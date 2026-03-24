'use client';

import { useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';

interface CollapsibleSectionProps {
  title: string;
  /** Optional subtitle shown next to the title in muted text */
  subtitle?: string;
  /** Whether the section starts open */
  defaultOpen?: boolean;
  children: React.ReactNode;
  /** Optional class for the outer wrapper */
  className?: string;
}

export default function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
  className = '',
}: CollapsibleSectionProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full flex items-center justify-between gap-2 pb-2 border-b text-left transition-colors ${
          isDark ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <h4 className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {title}
          </h4>
          {subtitle && (
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {subtitle}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          } ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
