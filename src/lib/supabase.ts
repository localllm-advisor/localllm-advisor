import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Support both the new publishable key name and the legacy anon key name
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

// Supabase is optional — the app works without it (community features disabled)
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Types for community benchmarks
export interface BenchmarkSubmission {
  id?: string;
  user_id?: string;
  model_id: string;
  quant_level: string;
  gpu_name: string;
  gpu_vram_mb?: number;
  cpu_name?: string;
  ram_gb?: number;
  tokens_per_second: number;
  prefill_tokens_per_second?: number;
  time_to_first_token_ms?: number;
  context_length?: number;
  runtime?: string;
  notes?: string;
  created_at?: string;
  verified?: boolean;
  flagged?: boolean;
}

export interface BenchmarkStats {
  model_id: string;
  quant_level: string;
  gpu_name: string;
  submission_count: number;
  avg_tps: number;
  min_tps: number;
  max_tps: number;
  median_tps: number;
}

export interface BenchmarkWithVotes extends BenchmarkSubmission {
  upvotes: number;
  downvotes: number;
  vote_score: number;
  user_vote?: number; // 1, -1, or null
}

// Fetch benchmark stats for a model
export async function getBenchmarkStats(modelId: string): Promise<BenchmarkStats[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('benchmark_stats')
    .select('*')
    .eq('model_id', modelId)
    .order('submission_count', { ascending: false });

  if (error) {
    console.error('Error fetching benchmark stats:', error);
    return [];
  }

  return data || [];
}

// Fetch all benchmarks for a model (for detailed view)
export async function getBenchmarks(modelId: string, quantLevel?: string): Promise<BenchmarkSubmission[]> {
  if (!supabase) return [];
  let query = supabase
    .from('benchmarks')
    .select('*')
    .eq('model_id', modelId)
    .eq('flagged', false)
    .order('created_at', { ascending: false });

  if (quantLevel) {
    query = query.eq('quant_level', quantLevel);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching benchmarks:', error);
    return [];
  }

  return data || [];
}

// Submit a new benchmark
export async function submitBenchmark(benchmark: BenchmarkSubmission): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase is not configured' };
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be logged in to submit benchmarks' };
  }

  const { error } = await supabase
    .from('benchmarks')
    .insert({
      ...benchmark,
      user_id: user.id,
    });

  if (error) {
    console.error('Error submitting benchmark:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================
// Auth Return Action helpers
// ============================================
// Before OAuth redirect, save a "pending action" so we can re-open
// the right modal when the user lands back on the page.

export type AuthReturnAction =
  | { type: 'submit-benchmark'; modelId?: string; quantLevel?: string }
  | { type: 'submit-review'; gpuName?: string }
  | { type: 'create-alert'; gpuName?: string }
  | { type: 'login' };

export function setAuthReturnAction(action: AuthReturnAction) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('llm_auth_return_action', JSON.stringify(action));
  } catch { /* quota exceeded, ignore */ }
}

export function getAuthReturnAction(): AuthReturnAction | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('llm_auth_return_action');
    if (!raw) return null;
    localStorage.removeItem('llm_auth_return_action');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Auth helpers
export async function signInWithGitHub(): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Authentication is not configured' };
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.href : undefined,
    },
  });

  if (error) {
    console.error('Error signing in:', error);
    if (error.message?.includes('provider is not enabled')) {
      return { error: 'GitHub login is being set up. Please try again soon.' };
    }
    return { error: error.message };
  }
  return {};
}

export async function signInWithGoogle(): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Authentication is not configured' };
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.href : undefined,
    },
  });

  if (error) {
    console.error('Error signing in:', error);
    if (error.message?.includes('provider is not enabled')) {
      return { error: 'Google login is being set up. Please try again soon.' };
    }
    return { error: error.message };
  }
  return {};
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getUser() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Fetch all benchmarks with votes (for the benchmarks page)
export async function getAllBenchmarksWithVotes(options?: {
  modelId?: string;
  gpuName?: string;
  quantLevel?: string;
  sortBy?: 'vote_score' | 'tokens_per_second' | 'created_at';
  limit?: number;
  offset?: number;
}): Promise<BenchmarkWithVotes[]> {
  if (!supabase) return [];
  let query = supabase
    .from('benchmarks_with_votes')
    .select('*');

  if (options?.modelId) {
    query = query.eq('model_id', options.modelId);
  }
  if (options?.gpuName) {
    query = query.eq('gpu_name', options.gpuName);
  }
  if (options?.quantLevel) {
    query = query.eq('quant_level', options.quantLevel);
  }

  const sortBy = options?.sortBy || 'vote_score';
  query = query.order(sortBy, { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching benchmarks:', error);
    return [];
  }

  // If user is logged in, fetch their votes
  const user = await getUser();
  if (user && data) {
    const benchmarkIds = data.map(b => b.id);
    const { data: votes } = await supabase
      .from('benchmark_votes')
      .select('benchmark_id, vote_type')
      .eq('user_id', user.id)
      .in('benchmark_id', benchmarkIds);

    const voteMap = new Map(votes?.map(v => [v.benchmark_id, v.vote_type]) || []);
    return data.map(b => ({
      ...b,
      user_vote: voteMap.get(b.id) || null,
    }));
  }

  return data || [];
}

// Vote on a benchmark
export async function voteBenchmark(benchmarkId: string, voteType: 1 | -1): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase is not configured' };
  const user = await getUser();
  if (!user) {
    return { success: false, error: 'You must be logged in to vote' };
  }

  // Check if user already voted
  const { data: existingVote } = await supabase
    .from('benchmark_votes')
    .select('id, vote_type')
    .eq('user_id', user.id)
    .eq('benchmark_id', benchmarkId)
    .single();

  if (existingVote) {
    if (existingVote.vote_type === voteType) {
      // Same vote, remove it (toggle off)
      const { error } = await supabase
        .from('benchmark_votes')
        .delete()
        .eq('id', existingVote.id);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Different vote, update it
      const { error } = await supabase
        .from('benchmark_votes')
        .update({ vote_type: voteType })
        .eq('id', existingVote.id);

      if (error) {
        return { success: false, error: error.message };
      }
    }
  } else {
    // New vote
    const { error } = await supabase
      .from('benchmark_votes')
      .insert({
        user_id: user.id,
        benchmark_id: benchmarkId,
        vote_type: voteType,
      });

    if (error) {
      return { success: false, error: error.message };
    }
  }

  return { success: true };
}

// Get community benchmark stats for a specific GPU (for comparison)
export async function getGpuBenchmarkStats(gpuName: string): Promise<{
  avgTps: number;
  maxTps: number;
  benchmarkCount: number;
  modelsCovered: number;
  percentileData: { tps: number; count: number }[];
}> {
  if (!supabase) return { avgTps: 0, maxTps: 0, benchmarkCount: 0, modelsCovered: 0, percentileData: [] };
  const { data, error } = await supabase
    .from('benchmarks')
    .select('tokens_per_second, model_id')
    .eq('gpu_name', gpuName)
    .eq('flagged', false);

  if (error || !data || data.length === 0) {
    return { avgTps: 0, maxTps: 0, benchmarkCount: 0, modelsCovered: 0, percentileData: [] };
  }

  const tpsValues = data.map(d => d.tokens_per_second);
  const avgTps = tpsValues.reduce((a, b) => a + b, 0) / tpsValues.length;
  const maxTps = Math.max(...tpsValues);
  const uniqueModels = new Set(data.map(d => d.model_id));

  // Create percentile buckets
  const sortedTps = [...tpsValues].sort((a, b) => a - b);
  const percentileData = [
    { tps: sortedTps[Math.floor(sortedTps.length * 0.25)] || 0, count: 25 },
    { tps: sortedTps[Math.floor(sortedTps.length * 0.5)] || 0, count: 50 },
    { tps: sortedTps[Math.floor(sortedTps.length * 0.75)] || 0, count: 75 },
    { tps: sortedTps[Math.floor(sortedTps.length * 0.9)] || 0, count: 90 },
  ];

  return {
    avgTps: Math.round(avgTps),
    maxTps: Math.round(maxTps),
    benchmarkCount: data.length,
    modelsCovered: uniqueModels.size,
    percentileData,
  };
}

// Get global benchmark stats for percentile calculation
export async function getGlobalBenchmarkStats(): Promise<{
  allGpuStats: { gpuName: string; avgTps: number; benchmarkCount: number }[];
  overallAvgTps: number;
  overallMaxTps: number;
}> {
  if (!supabase) return { allGpuStats: [], overallAvgTps: 0, overallMaxTps: 0 };
  const { data, error } = await supabase
    .from('benchmarks')
    .select('gpu_name, tokens_per_second')
    .eq('flagged', false);

  if (error || !data || data.length === 0) {
    return { allGpuStats: [], overallAvgTps: 0, overallMaxTps: 0 };
  }

  // Group by GPU
  const gpuGroups = new Map<string, number[]>();
  for (const d of data) {
    if (!gpuGroups.has(d.gpu_name)) {
      gpuGroups.set(d.gpu_name, []);
    }
    gpuGroups.get(d.gpu_name)!.push(d.tokens_per_second);
  }

  const allGpuStats = Array.from(gpuGroups.entries()).map(([gpuName, tpsValues]) => ({
    gpuName,
    avgTps: Math.round(tpsValues.reduce((a, b) => a + b, 0) / tpsValues.length),
    benchmarkCount: tpsValues.length,
  })).sort((a, b) => b.avgTps - a.avgTps);

  const allTps = data.map(d => d.tokens_per_second);
  const overallAvgTps = Math.round(allTps.reduce((a, b) => a + b, 0) / allTps.length);
  const overallMaxTps = Math.max(...allTps);

  return { allGpuStats, overallAvgTps, overallMaxTps };
}

// Get unique values for filters
export async function getFilterOptions(): Promise<{
  models: string[];
  gpus: string[];
  quantLevels: string[];
}> {
  if (!supabase) return { models: [], gpus: [], quantLevels: [] };
  const [modelsRes, gpusRes, quantsRes] = await Promise.all([
    supabase.from('benchmarks').select('model_id').eq('flagged', false),
    supabase.from('benchmarks').select('gpu_name').eq('flagged', false),
    supabase.from('benchmarks').select('quant_level').eq('flagged', false),
  ]);

  const uniqueModels = Array.from(new Set(modelsRes.data?.map(r => r.model_id) || [])).sort();
  const uniqueGpus = Array.from(new Set(gpusRes.data?.map(r => r.gpu_name) || [])).sort();
  const uniqueQuants = Array.from(new Set(quantsRes.data?.map(r => r.quant_level) || [])).sort();

  return {
    models: uniqueModels,
    gpus: uniqueGpus,
    quantLevels: uniqueQuants,
  };
}

// ============================================
// GPU Price Tracking Functions
// ============================================

import type { GpuPricePoint, GpuPriceStats, PriceAlert, PriceTrend, AlertType, GpuReview, GpuReviewStats, NewGpuReviewInput, EnterpriseLeadFormData } from './types';

// Helper to calculate trend from price data
function calculateTrend(currentPrice: number | null, price7dAgo: number | null): PriceTrend {
  if (!currentPrice || !price7dAgo) return 'stable';
  const changePercent = ((currentPrice - price7dAgo) / price7dAgo) * 100;
  if (changePercent > 3) return 'rising';
  if (changePercent < -3) return 'dropping';
  return 'stable';
}

// Get price history for a GPU (for charts)
export async function getGpuPriceHistory(gpuName: string, days = 30): Promise<GpuPricePoint[]> {
  if (!supabase) return [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('gpu_prices')
    .select('*')
    .eq('gpu_name', gpuName)
    .gte('scraped_at', startDate.toISOString())
    .order('scraped_at', { ascending: true });

  if (error) {
    console.error('Error fetching GPU price history:', error);
    return [];
  }

  return data || [];
}

// Get price stats for a single GPU
export async function getGpuPriceStats(gpuName: string): Promise<GpuPriceStats | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('gpu_price_stats')
    .select('*')
    .eq('gpu_name', gpuName)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    ...data,
    trend: calculateTrend(data.current_price_usd, data.price_7d_ago),
  };
}

// Get price stats for multiple GPUs (batch query for UpgradeAdvisor)
export async function getMultipleGpuPriceStats(gpuNames: string[]): Promise<Map<string, GpuPriceStats>> {
  if (!supabase || gpuNames.length === 0) return new Map();

  const { data, error } = await supabase
    .from('gpu_price_stats')
    .select('*')
    .in('gpu_name', gpuNames);

  if (error || !data) {
    console.error('Error fetching GPU price stats:', error);
    return new Map();
  }

  const statsMap = new Map<string, GpuPriceStats>();
  for (const row of data) {
    statsMap.set(row.gpu_name, {
      ...row,
      trend: calculateTrend(row.current_price_usd, row.price_7d_ago),
    });
  }

  return statsMap;
}

// Get current prices with retailer info for multiple GPUs (for deals section)
export async function getCurrentGpuPrices(gpuNames: string[]): Promise<Map<string, GpuPricePoint[]>> {
  if (!supabase || gpuNames.length === 0) return new Map();

  // Get today's date for filtering recent prices
  const today = new Date();
  today.setDate(today.getDate() - 1); // Include yesterday's prices too

  const { data, error } = await supabase
    .from('gpu_prices')
    .select('*')
    .in('gpu_name', gpuNames)
    .gte('scraped_at', today.toISOString())
    .order('price_usd', { ascending: true });

  if (error || !data) {
    console.error('Error fetching current GPU prices:', error);
    return new Map();
  }

  // Group by GPU name, keeping only the best price per retailer
  const pricesMap = new Map<string, GpuPricePoint[]>();
  for (const row of data) {
    const existing = pricesMap.get(row.gpu_name) || [];
    // Only add if we don't already have this retailer
    if (!existing.some(p => p.retailer === row.retailer)) {
      existing.push(row);
      pricesMap.set(row.gpu_name, existing);
    }
  }

  return pricesMap;
}

// Get user's price alerts
export async function getUserPriceAlerts(): Promise<PriceAlert[]> {
  if (!supabase) return [];
  const user = await getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching price alerts:', error);
    return [];
  }

  return data || [];
}

// Create a new price alert
export async function createPriceAlert(input: {
  gpu_name: string;
  target_price_usd: number;
  alert_type: AlertType;
}): Promise<{ success: boolean; error?: string; alert?: PriceAlert }> {
  if (!supabase) return { success: false, error: 'Supabase is not configured' };
  const user = await getUser();
  if (!user) {
    return { success: false, error: 'You must be logged in to create alerts' };
  }

  const { data, error } = await supabase
    .from('price_alerts')
    .insert({
      user_id: user.id,
      gpu_name: input.gpu_name,
      target_price_usd: input.target_price_usd,
      alert_type: input.alert_type,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating price alert:', error);
    return { success: false, error: error.message };
  }

  return { success: true, alert: data };
}

// Update a price alert
export async function updatePriceAlert(
  alertId: string,
  updates: Partial<Pick<PriceAlert, 'target_price_usd' | 'alert_type' | 'is_active'>>
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase is not configured' };
  const user = await getUser();
  if (!user) {
    return { success: false, error: 'You must be logged in to update alerts' };
  }

  const { error } = await supabase
    .from('price_alerts')
    .update(updates)
    .eq('id', alertId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating price alert:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Delete a price alert
export async function deletePriceAlert(alertId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase is not configured' };
  const user = await getUser();
  if (!user) {
    return { success: false, error: 'You must be logged in to delete alerts' };
  }

  const { error } = await supabase
    .from('price_alerts')
    .delete()
    .eq('id', alertId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting price alert:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================
// GPU Review Functions
// ============================================

// Get reviews for a GPU
export async function getGpuReviews(gpuName: string, options?: {
  sortBy?: 'upvotes' | 'rating_overall' | 'created_at';
  limit?: number;
}): Promise<GpuReview[]> {
  if (!supabase) return [];
  const sortBy = options?.sortBy || 'upvotes';
  const sortColumn = sortBy === 'upvotes' ? 'upvotes' : sortBy;

  let query = supabase
    .from('gpu_reviews')
    .select('*')
    .eq('gpu_name', gpuName)
    .eq('is_hidden', false)
    .order(sortColumn, { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching GPU reviews:', error);
    return [];
  }

  // If user is logged in, fetch their votes
  const user = await getUser();
  if (user && data && data.length > 0) {
    const reviewIds = data.map(r => r.id);
    const { data: votes } = await supabase
      .from('gpu_review_votes')
      .select('review_id, vote_type')
      .eq('user_id', user.id)
      .in('review_id', reviewIds);

    const voteMap = new Map(votes?.map(v => [v.review_id, v.vote_type]) || []);
    return data.map(r => ({
      ...r,
      user_vote: voteMap.get(r.id) || null,
    }));
  }

  return data || [];
}

// Get review stats for multiple GPUs
export async function getGpuReviewStats(gpuNames: string[]): Promise<Map<string, GpuReviewStats>> {
  if (!supabase || gpuNames.length === 0) return new Map();

  const { data, error } = await supabase
    .from('gpu_review_stats')
    .select('*')
    .in('gpu_name', gpuNames);

  if (error || !data) {
    console.error('Error fetching GPU review stats:', error);
    return new Map();
  }

  const statsMap = new Map<string, GpuReviewStats>();
  for (const row of data) {
    statsMap.set(row.gpu_name, row);
  }

  return statsMap;
}

// Get single GPU review stats
export async function getSingleGpuReviewStats(gpuName: string): Promise<GpuReviewStats | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('gpu_review_stats')
    .select('*')
    .eq('gpu_name', gpuName)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

// Create/update review (upsert)
export async function submitGpuReview(input: NewGpuReviewInput): Promise<{ success: boolean; error?: string; review?: GpuReview }> {
  if (!supabase) return { success: false, error: 'Supabase is not configured' };
  const user = await getUser();
  if (!user) {
    return { success: false, error: 'You must be logged in to submit reviews' };
  }

  const reviewData = {
    user_id: user.id,
    gpu_name: input.gpu_name,
    rating_overall: input.rating_overall,
    rating_llm_performance: input.rating_llm_performance || null,
    rating_value: input.rating_value || null,
    rating_noise_temps: input.rating_noise_temps || null,
    title: input.title || null,
    body: input.body,
    pros: input.pros || [],
    cons: input.cons || [],
    models_tested: input.models_tested || [],
    typical_speed_tps: input.typical_speed_tps || null,
    vram_usage_percent: input.vram_usage_percent || null,
    use_case: input.use_case || null,
    best_for: input.best_for || [],
    purchase_price_usd: input.purchase_price_usd || null,
    months_owned: input.months_owned || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('gpu_reviews')
    .upsert(reviewData, {
      onConflict: 'user_id,gpu_name',
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting GPU review:', error);
    return { success: false, error: error.message };
  }

  return { success: true, review: data };
}

// Delete review
export async function deleteGpuReview(reviewId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase is not configured' };
  const user = await getUser();
  if (!user) {
    return { success: false, error: 'You must be logged in to delete reviews' };
  }

  const { error } = await supabase
    .from('gpu_reviews')
    .delete()
    .eq('id', reviewId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting GPU review:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Vote on review
export async function voteOnGpuReview(reviewId: string, voteType: 1 | -1): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase is not configured' };
  const user = await getUser();
  if (!user) {
    return { success: false, error: 'You must be logged in to vote' };
  }

  // Check if user already voted
  const { data: existingVote } = await supabase
    .from('gpu_review_votes')
    .select('id, vote_type')
    .eq('user_id', user.id)
    .eq('review_id', reviewId)
    .single();

  if (existingVote) {
    if (existingVote.vote_type === voteType) {
      // Same vote, remove it (toggle off)
      const { error } = await supabase
        .from('gpu_review_votes')
        .delete()
        .eq('id', existingVote.id);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Different vote, update it
      const { error } = await supabase
        .from('gpu_review_votes')
        .update({ vote_type: voteType })
        .eq('id', existingVote.id);

      if (error) {
        return { success: false, error: error.message };
      }
    }
  } else {
    // New vote
    const { error } = await supabase
      .from('gpu_review_votes')
      .insert({
        user_id: user.id,
        review_id: reviewId,
        vote_type: voteType,
      });

    if (error) {
      return { success: false, error: error.message };
    }
  }

  return { success: true };
}

// Get user's review for a GPU (to check if already reviewed)
export async function getUserGpuReview(gpuName: string): Promise<GpuReview | null> {
  if (!supabase) return null;
  const user = await getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('gpu_reviews')
    .select('*')
    .eq('user_id', user.id)
    .eq('gpu_name', gpuName)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

// ============================================
// Enterprise Lead Functions
// ============================================

export async function submitEnterpriseLead(
  formData: EnterpriseLeadFormData
): Promise<{ success: boolean; error?: string }> {
  // 1. Store in Supabase (if configured)
  if (supabase) {
    const { error } = await supabase
      .from('enterprise_leads')
      .insert({
        company_name: formData.companyName,
        contact_name: formData.contactName,
        email: formData.email,
        industry: formData.industry,
        company_size: formData.companySize || null,
        job_title: formData.jobTitle || null,
        phone: formData.phone || null,
        country: formData.country || null,
        primary_use_case: formData.primaryUseCase || null,
        use_case_description: formData.useCaseDescription || null,
        concurrent_users: formData.concurrentUsers || null,
        deployment: formData.deployment || null,
        existing_hardware: formData.existingHardware || null,
        compliance_requirements: formData.complianceRequirements || [],
        model_preferences: formData.modelPreferences || null,
        budget: formData.budget || null,
        timeline: formData.timeline || null,
        message: formData.message || null,
        referral_source: formData.referralSource || null,
        status: 'new',
      });

    if (error) {
      console.error('Error storing enterprise lead:', error);
      // Don't return error — still try email notification
    }
  }

  // 2. Send email notification via Supabase Edge Function
  try {
    if (supabase) {
      const { error } = await supabase.functions.invoke('send-enterprise-lead-email', {
        body: formData,
      });
      if (error) {
        console.warn('Email notification failed (non-critical):', error.message);
      }
    }
  } catch {
    // Email notification is best-effort — lead is already stored
    console.warn('Email notification unavailable');
  }

  return { success: true };
}
