export type UseCase = 'chat' | 'coding' | 'reasoning' | 'creative' | 'vision';

export interface Quantization {
  level: string;
  bpw: number;
  vram_mb: number;
  quality: number;
  ollama_tag: string;
}

export interface Benchmarks {
  humaneval: number | null;
  mmlu_pro: number | null;
  math: number | null;
  ifeval: number | null;
  bbh: number | null;
  mmmu: number | null;
  gpqa: number | null;
  musr: number | null;
  mbpp: number | null;
  bigcodebench: number | null;
  alpacaeval: number | null;
  mmbench: number | null;
}

export interface Model {
  id: string;
  name: string;
  family: string;
  params_b: number;
  architecture: 'dense' | 'moe';
  capabilities: string[];
  context_length: number;
  release_date: string;
  ollama_base: string;
  quantizations: Quantization[];
  benchmarks: Benchmarks;
}

export interface GPU {
  name: string;
  vram_mb: number;
  bandwidth_gbps: number;
  vendor: 'nvidia' | 'amd' | 'apple' | 'intel';
  aliases: string[];
}

export interface RecommendationInput {
  vram_mb: number;
  useCase: UseCase;
  contextLength: number;
  bandwidth_gbps?: number;
}

export interface ScoredModel {
  model: Model;
  quant: Quantization;
  score: number;
  vramPercent: number;
  tokensPerSecond: number | null;
}

export interface BenchmarkWeight {
  key: keyof Benchmarks;
  weight: number;
}

export interface UseCaseWeights {
  benchmarks: BenchmarkWeight[];
  wQuality: number;
  wSpeed: number;
  wQuant: number;
}
