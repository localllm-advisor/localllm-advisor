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
