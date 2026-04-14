'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured, BenchmarkSubmission } from '@/lib/supabase';
import { useTheme } from './ThemeProvider';

/** Fetch the N most recent (non-flagged) benchmark submissions. */
async function getRecentBenchmarks(limit = 10): Promise<BenchmarkSubmission[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('benchmarks')
    .select('id, model_id, quant_level, gpu_name, tokens_per_second, runtime, created_at')
    .eq('flagged', false)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('HomeBenchmarkFeed fetch error:', error);
    return [];
  }
  return data || [];
}

/** Shorten a model_id for display — strip org prefix if present. */
function shortModelId(modelId: string): string {
  // "meta-llama/Llama-3.1-8B-Instruct" → "Llama-3.1-8B-Instruct"
  const slash = modelId.lastIndexOf('/');
  return slash >= 0 ? modelId.slice(slash + 1) : modelId;
}

/** Relative time string — "2h ago", "3d ago", etc. */
function relativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

export default function HomeBenchmarkFeed() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [rows, setRows] = useState<BenchmarkSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    getRecentBenchmarks(10).then((data) => {
      setRows(data);
      setLoading(false);
    });
  }, []);

  // Don't render the section at all when Supabase isn't connected
  if (!isSupabaseConfigured) return null;

  return (
    <section
      className={`relative mx-auto max-w-3xl w-full px-4 pb-16 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            🔥 Live Community Benchmarks
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Real tok/s numbers submitted by users, most recent first
          </p>
        </div>
        <Link
          href="/benchmarks"
          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
            isDark
              ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}
        >
          See all →
        </Link>
      </div>

      {/* Table */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          isDark ? 'border-white/8 bg-transparent' : 'border-gray-200 bg-white'
        }`}
      >
        {loading ? (
          <div className="py-10 text-center text-sm opacity-60">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-medium">No benchmarks yet — be the first!</p>
            <Link
              href="/benchmarks"
              className="mt-3 inline-block text-xs text-blue-500 hover:underline"
            >
              Submit yours →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr
                className={`text-xs uppercase tracking-wide ${
                  isDark
                    ? 'bg-white/5 text-gray-400 border-b border-white/8'
                    : 'bg-gray-50 text-gray-500 border-b border-gray-200'
                }`}
              >
                <th className="text-left px-4 py-2.5 font-medium">GPU</th>
                <th className="text-left px-4 py-2.5 font-medium">Model</th>
                <th className="text-right px-4 py-2.5 font-medium">tok/s</th>
                <th className="text-right px-4 py-2.5 font-medium hidden sm:table-cell">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  className={`transition-colors ${
                    isDark
                      ? 'border-b border-white/6 hover:bg-white/4'
                      : 'border-b border-gray-100 hover:bg-gray-50'
                  } last:border-b-0`}
                >
                  {/* GPU */}
                  <td className="px-4 py-2.5">
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {row.gpu_name}
                    </span>
                    {row.quant_level && (
                      <span
                        className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded ${
                          isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {row.quant_level}
                      </span>
                    )}
                  </td>

                  {/* Model */}
                  <td className="px-4 py-2.5 max-w-[140px] sm:max-w-none truncate">
                    <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                      {shortModelId(row.model_id)}
                    </span>
                  </td>

                  {/* tok/s */}
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={`font-semibold tabular-nums ${
                        row.tokens_per_second >= 60
                          ? 'text-green-500'
                          : row.tokens_per_second >= 20
                          ? isDark ? 'text-blue-400' : 'text-blue-600'
                          : isDark ? 'text-yellow-400' : 'text-yellow-600'
                      }`}
                    >
                      {row.tokens_per_second}
                    </span>
                    <span className={`ml-0.5 text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      t/s
                    </span>
                  </td>

                  {/* Timestamp */}
                  <td className="px-4 py-2.5 text-right hidden sm:table-cell">
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {row.created_at ? relativeTime(row.created_at) : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CTA */}
      <div className="mt-4 text-center">
        <Link
          href="/benchmarks"
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            isDark
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 hover:border-blue-400/50'
              : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Submit your benchmark and help the community
        </Link>
      </div>
    </section>
  );
}
