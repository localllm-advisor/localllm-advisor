'use client';

import { useTheme } from './ThemeProvider';
import { getGpuResources } from '@/lib/external-links';

interface ExternalLinksProps {
  gpuName: string;
  vendor: string;
  compact?: boolean;
}

export default function ExternalLinks({
  gpuName,
  vendor,
  compact = false,
}: ExternalLinksProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const resources = getGpuResources(gpuName, vendor);

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {resources.slice(0, 3).map((resource) => (
          <a
            key={resource.name}
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors ${
              isDark
                ? 'border-gray-700 text-gray-400 hover:text-blue-400 hover:border-blue-500'
                : 'border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-500'
            }`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            {resource.name}
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl border ${
      isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <h4 className={`font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        External Discussions
      </h4>
      <div className="space-y-2">
        {resources.map((resource) => (
          <a
            key={resource.name}
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
              isDark
                ? 'border-gray-700 hover:border-blue-500 hover:bg-gray-700/50'
                : 'border-gray-200 hover:border-blue-500 hover:bg-gray-50'
            }`}
          >
            <div>
              <div className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {resource.name}
              </div>
              <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {resource.description}
              </div>
            </div>
            <svg
              className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}
