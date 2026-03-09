import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

// Auth helpers
export async function signInWithGitHub() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });

  if (error) {
    console.error('Error signing in:', error);
  }
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });

  if (error) {
    console.error('Error signing in:', error);
  }
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getUser() {
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
  const [modelsRes, gpusRes, quantsRes] = await Promise.all([
    supabase.from('benchmarks').select('model_id').eq('flagged', false),
    supabase.from('benchmarks').select('gpu_name').eq('flagged', false),
    supabase.from('benchmarks').select('quant_level').eq('flagged', false),
  ]);

  const uniqueModels = [...new Set(modelsRes.data?.map(r => r.model_id) || [])].sort();
  const uniqueGpus = [...new Set(gpusRes.data?.map(r => r.gpu_name) || [])].sort();
  const uniqueQuants = [...new Set(quantsRes.data?.map(r => r.quant_level) || [])].sort();

  return {
    models: uniqueModels,
    gpus: uniqueGpus,
    quantLevels: uniqueQuants,
  };
}
