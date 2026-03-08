'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BenchmarkStats, getBenchmarkStats } from '@/lib/supabase';
import { useTheme } from './ThemeProvider';

interface CommunityBenchmarksProps {
  modelId: string;
  modelName: string;
  quantLevel: string;
  onSubmitClick: () => void;
}

export default function CommunityBenchmarks({
  modelId,
  modelName,
  quantLevel,
  onSubmitClick,
}: CommunityBenchmarksProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [stats, setStats] = useState<BenchmarkStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const data = await getBenchmarkStats(modelId);
        // Filter by quant level if specified, otherwise show all
        const filtered = quantLevel
          ? data.filter(s => s.quant_level === quantLevel)
          : data;
        setStats(filtered);
      } catch (err) {
        setError('Failed to load community benchmarks');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [modelId, quantLevel]);

  // Find max TPS for scaling bars
  const maxTps = Math.max(...stats.map(s => s.max_tps), 1);

  return (
    <div className={`rounded-xl border p-4 ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Community Benchmarks
          </h3>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Real-world performance from users
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/benchmarks?model=${encodeURIComponent(modelId)}`}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            See all
          </Link>
          <button
            onClick={onSubmitClick}
            className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Submit yours
          </button>
        </div>
      </div>

      {loading ? (
        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} text-center py-4`}>
          Loading benchmarks...
        </div>
      ) : error ? (
        <div className="text-sm text-red-400 text-center py-4">{error}</div>
      ) : stats.length === 0 ? (
        <div className={`text-center py-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm font-medium">No benchmarks yet</p>
          <p className="text-xs mt-1">Be the first to submit your results!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stats.map((stat) => (
            <div
              key={`${stat.gpu_name}-${stat.quant_level}`}
              className={`p-3 rounded-lg ${isDark ? 'bg-gray-900/50' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {stat.gpu_name}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                    {stat.quant_level}
                  </span>
                </div>
                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {stat.submission_count} {stat.submission_count === 1 ? 'report' : 'reports'}
                </span>
              </div>

              {/* Performance bar */}
              <div className="relative h-6 bg-gray-700 rounded overflow-hidden">
                {/* Range bar (min to max) */}
                <div
                  className="absolute h-full bg-blue-900/50"
                  style={{
                    left: `${(stat.min_tps / maxTps) * 100}%`,
                    width: `${((stat.max_tps - stat.min_tps) / maxTps) * 100}%`,
                  }}
                />
                {/* Average marker */}
                <div
                  className="absolute h-full w-1 bg-blue-500"
                  style={{ left: `${(stat.avg_tps / maxTps) * 100}%` }}
                />
                {/* Median marker */}
                <div
                  className="absolute h-full w-0.5 bg-green-500"
                  style={{ left: `${(stat.median_tps / maxTps) * 100}%` }}
                />
                {/* Label */}
                <div className="absolute inset-0 flex items-center justify-between px-2">
                  <span className="text-xs text-white font-medium">
                    {stat.avg_tps} tok/s avg
                  </span>
                  <span className="text-xs text-gray-300">
                    {stat.min_tps}-{stat.max_tps}
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-1.5 text-[10px]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-sm"></span>
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Average</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-sm"></span>
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Median</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-4 h-2 bg-blue-900/50 rounded-sm"></span>
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Range</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
