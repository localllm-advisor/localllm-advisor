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
