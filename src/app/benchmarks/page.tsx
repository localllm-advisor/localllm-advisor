'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  BenchmarkWithVotes,
  getAllBenchmarksWithVotes,
  getFilterOptions,
  voteBenchmark,
  getUser,
  signInWithGitHub,
  signInWithGoogle,
  signOut,
} from '@/lib/supabase';
import { useTheme } from '@/components/ThemeProvider';
import { User } from '@supabase/supabase-js';

// Grouped benchmark type
interface GroupedBenchmark {
  key: string;
  model_id: string;
  quant_level: string;
  gpu_name: string;
  gpu_vram_mb?: number;
  tokens_per_second: number;
  runtime?: string;
  cpu_name?: string;
  ram_gb?: number;
  context_length?: number;
  prefill_tokens_per_second?: number;
  time_to_first_token_ms?: number;
  // Aggregated fields
  submission_count: number;
  total_vote_score: number;
  notes: string[];
  latest_date: string;
  // For voting - use the first benchmark's id
  benchmark_ids: string[];
  user_votes: (number | undefined)[];
}

function groupBenchmarks(benchmarks: BenchmarkWithVotes[]): GroupedBenchmark[] {
  const groups = new Map<string, GroupedBenchmark>();

  for (const b of benchmarks) {
    // Key: same model, quant, gpu, and similar speed (within 1 tok/s)
    const speedRounded = Math.round(b.tokens_per_second);
    const key = `${b.model_id}|${b.quant_level}|${b.gpu_name}|${speedRounded}`;

    if (groups.has(key)) {
      const group = groups.get(key)!;
      group.submission_count++;
      group.total_vote_score += b.vote_score;
      if (b.notes) group.notes.push(b.notes);
      if (b.created_at && b.created_at > group.latest_date) {
        group.latest_date = b.created_at;
      }
      group.benchmark_ids.push(b.id!);
      group.user_votes.push(b.user_vote);
      // Take additional fields if missing
      if (!group.prefill_tokens_per_second && b.prefill_tokens_per_second) {
        group.prefill_tokens_per_second = b.prefill_tokens_per_second;
      }
      if (!group.time_to_first_token_ms && b.time_to_first_token_ms) {
        group.time_to_first_token_ms = b.time_to_first_token_ms;
      }
    } else {
      groups.set(key, {
        key,
        model_id: b.model_id,
        quant_level: b.quant_level,
        gpu_name: b.gpu_name,
        gpu_vram_mb: b.gpu_vram_mb,
        tokens_per_second: b.tokens_per_second,
        runtime: b.runtime,
        cpu_name: b.cpu_name,
        ram_gb: b.ram_gb,
        context_length: b.context_length,
        prefill_tokens_per_second: b.prefill_tokens_per_second,
        time_to_first_token_ms: b.time_to_first_token_ms,
        submission_count: 1,
        total_vote_score: b.vote_score,
        notes: b.notes ? [b.notes] : [],
        latest_date: b.created_at || '',
        benchmark_ids: [b.id!],
        user_votes: [b.user_vote],
      });
    }
  }

  return Array.from(groups.values());
}

function BenchmarksContent() {
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [benchmarks, setBenchmarks] = useState<BenchmarkWithVotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Filters - initialize from URL params
  const [modelFilter, setModelFilter] = useState(searchParams.get('model') || '');
  const [gpuFilter, setGpuFilter] = useState(searchParams.get('gpu') || '');
  const [quantFilter, setQuantFilter] = useState(searchParams.get('quant') || '');
  const [sortBy, setSortBy] = useState<'vote_score' | 'tokens_per_second' | 'created_at'>('vote_score');

  // Filter options
  const [filterOptions, setFilterOptions] = useState<{
    models: string[];
    gpus: string[];
    quantLevels: string[];
  }>({ models: [], gpus: [], quantLevels: [] });

  useEffect(() => {
    async function init() {
      const [currentUser, options] = await Promise.all([
        getUser(),
        getFilterOptions(),
      ]);
      setUser(currentUser);
      setFilterOptions(options);
    }
    init();
  }, []);

  useEffect(() => {
    async function fetchBenchmarks() {
      setLoading(true);
      const data = await getAllBenchmarksWithVotes({
        modelId: modelFilter || undefined,
        gpuName: gpuFilter || undefined,
        quantLevel: quantFilter || undefined,
        sortBy,
        limit: 100,
      });
      setBenchmarks(data);
      setLoading(false);
    }
    fetchBenchmarks();
  }, [modelFilter, gpuFilter, quantFilter, sortBy]);

  const handleVote = async (benchmarkId: string, voteType: 1 | -1) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    const result = await voteBenchmark(benchmarkId, voteType);
    if (result.success) {
      // Optimistically update the UI
      setBenchmarks(prev =>
        prev.map(b => {
          if (b.id !== benchmarkId) return b;

          const wasUpvoted = b.user_vote === 1;
          const wasDownvoted = b.user_vote === -1;
          const isTogglingOff = b.user_vote === voteType;

          let newUpvotes = b.upvotes;
          let newDownvotes = b.downvotes;
          let newUserVote: number | undefined = voteType;

          if (isTogglingOff) {
            if (voteType === 1) newUpvotes--;
            else newDownvotes--;
            newUserVote = undefined;
          } else {
            if (voteType === 1) {
              newUpvotes++;
              if (wasDownvoted) newDownvotes--;
            } else {
              newDownvotes++;
              if (wasUpvoted) newUpvotes--;
            }
          }

          return {
            ...b,
            upvotes: newUpvotes,
            downvotes: newDownvotes,
            vote_score: newUpvotes - newDownvotes,
            user_vote: newUserVote,
          };
        })
      );
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Group similar benchmarks
  const groupedBenchmarks = useMemo(() => {
    const groups = groupBenchmarks(benchmarks);
    // Sort groups based on current sort
    if (sortBy === 'vote_score') {
      groups.sort((a, b) => b.total_vote_score - a.total_vote_score);
    } else if (sortBy === 'tokens_per_second') {
      groups.sort((a, b) => b.tokens_per_second - a.tokens_per_second);
    } else {
      groups.sort((a, b) => b.latest_date.localeCompare(a.latest_date));
    }
    return groups;
  }, [benchmarks, sortBy]);

  // Check if user has voted on any benchmark in a group
  const hasUserVotedInGroup = (group: GroupedBenchmark, voteType: 1 | -1) => {
    return group.user_votes.some(v => v === voteType);
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`border-b ${isDark ? 'border-gray-800 bg-gray-900/80' : 'border-gray-200 bg-white/80'} backdrop-blur-sm sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Advisor
              </Link>
              <div className={`h-6 w-px ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
              <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Community Benchmarks
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {groupedBenchmarks.length} results ({benchmarks.length} submissions)
              </span>
              {/* User status */}
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {(user.user_metadata?.avatar_url || user.user_metadata?.picture) ? (
                      <img
                        src={user.user_metadata.avatar_url || user.user_metadata.picture}
                        alt=""
                        className="w-7 h-7 rounded-full"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'}`}>
                        {(user.user_metadata?.name || user.user_metadata?.full_name || user.email || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <span className={`text-sm hidden sm:inline ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0]}
                    </span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className={`text-xs px-2 py-1 rounded ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} transition-colors`}
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign in
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className={`rounded-xl border p-4 mb-6 ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'}`}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Model:</label>
              <select
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option value="">All Models</option>
                {filterOptions.models.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>GPU:</label>
              <select
                value={gpuFilter}
                onChange={(e) => setGpuFilter(e.target.value)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option value="">All GPUs</option>
                {filterOptions.gpus.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Quant:</label>
              <select
                value={quantFilter}
                onChange={(e) => setQuantFilter(e.target.value)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option value="">All</option>
                {filterOptions.quantLevels.map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Sort:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option value="vote_score">Top Voted</option>
                <option value="tokens_per_second">Fastest</option>
                <option value="created_at">Newest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Benchmarks List */}
        {loading ? (
          <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4" />
            <p>Loading benchmarks...</p>
          </div>
        ) : benchmarks.length === 0 ? (
          <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-lg font-medium mb-2">No benchmarks found</p>
            <p className="text-sm">Be the first to submit your benchmark results!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedBenchmarks.map((group) => (
              <div
                key={group.key}
                className={`rounded-xl border p-4 transition-colors ${isDark ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-800' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
              >
                <div className="flex gap-4">
                  {/* Voting */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => handleVote(group.benchmark_ids[0], 1)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        hasUserVotedInGroup(group, 1)
                          ? 'bg-green-500/20 text-green-500'
                          : isDark
                          ? 'text-gray-500 hover:text-green-400 hover:bg-gray-700'
                          : 'text-gray-400 hover:text-green-600 hover:bg-gray-100'
                      }`}
                      title={user ? 'Helpful benchmark' : 'Sign in to vote'}
                    >
                      <svg className="w-5 h-5" fill={hasUserVotedInGroup(group, 1) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <span className={`text-sm font-bold ${
                      group.total_vote_score > 0
                        ? 'text-green-500'
                        : group.total_vote_score < 0
                        ? 'text-red-500'
                        : isDark ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {group.total_vote_score}
                    </span>
                    <button
                      onClick={() => handleVote(group.benchmark_ids[0], -1)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        hasUserVotedInGroup(group, -1)
                          ? 'bg-red-500/20 text-red-500'
                          : isDark
                          ? 'text-gray-500 hover:text-red-400 hover:bg-gray-700'
                          : 'text-gray-400 hover:text-red-600 hover:bg-gray-100'
                      }`}
                      title={user ? 'Not helpful' : 'Sign in to vote'}
                    >
                      <svg className="w-5 h-5" fill={hasUserVotedInGroup(group, -1) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {group.model_id}
                          </h3>
                          {group.submission_count > 1 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
                              {group.submission_count}x confirmed
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                            {group.quant_level}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                            {group.runtime || 'ollama'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-500">
                          {group.tokens_per_second} <span className="text-sm font-normal">tok/s</span>
                        </div>
                        <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {formatDate(group.latest_date)}
                        </div>
                      </div>
                    </div>

                    {/* Hardware Info */}
                    <div className={`flex flex-wrap gap-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                        <span className="font-medium">{group.gpu_name}</span>
                        {group.gpu_vram_mb && (
                          <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                            ({Math.round(group.gpu_vram_mb / 1024)} GB)
                          </span>
                        )}
                      </div>

                      {group.cpu_name && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>{group.cpu_name}</span>
                        </div>
                      )}

                      {group.ram_gb && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <span>{group.ram_gb} GB RAM</span>
                        </div>
                      )}

                      {group.context_length && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                          </svg>
                          <span>{group.context_length.toLocaleString()} ctx</span>
                        </div>
                      )}
                    </div>

                    {/* Additional metrics */}
                    {(group.prefill_tokens_per_second || group.time_to_first_token_ms) && (
                      <div className={`flex gap-4 mt-3 pt-3 border-t text-sm ${isDark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-600'}`}>
                        {group.prefill_tokens_per_second && (
                          <div>
                            <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Prefill:</span>{' '}
                            <span className="font-medium">{group.prefill_tokens_per_second} tok/s</span>
                          </div>
                        )}
                        {group.time_to_first_token_ms && (
                          <div>
                            <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>TTFT:</span>{' '}
                            <span className="font-medium">{group.time_to_first_token_ms} ms</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes - show all collected notes */}
                    {group.notes.length > 0 && (
                      <div className={`mt-3 pt-3 border-t text-sm ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Notes ({group.notes.length}):
                        </span>
                        <ul className={`mt-1 space-y-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {group.notes.map((note, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className={isDark ? 'text-gray-600' : 'text-gray-400'}>•</span>
                              <span>{note}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md mx-4 rounded-2xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Sign in to vote
            </h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Please sign in to vote on benchmarks and help the community identify accurate results.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => signInWithGitHub()}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                Continue with GitHub
              </button>
              <button
                onClick={() => signInWithGoogle()}
                className={`w-full flex items-center justify-center gap-3 px-4 py-3 border rounded-lg transition-colors ${isDark ? 'border-gray-600 hover:bg-gray-700 text-white' : 'border-gray-300 hover:bg-gray-50 text-gray-900'}`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>
            </div>
            <button
              onClick={() => setShowLoginModal(false)}
              className={`w-full mt-4 py-2 text-sm ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BenchmarksPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <BenchmarksContent />
    </Suspense>
  );
}
