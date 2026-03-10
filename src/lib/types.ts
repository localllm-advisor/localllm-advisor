export type UseCase = 'chat' | 'coding' | 'reasoning' | 'creative' | 'vision' | 'roleplay' | 'embedding';

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

export interface GGUFSource {
  repo: string;
  provider: string;
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
  hf_id?: string;
  provider?: string;
  quantizations: Quantization[];
  benchmarks: Benchmarks;
  // Optional metadata
  hf_id?: string;
  provider?: string;
  hf_downloads?: number;
  gguf_sources?: GGUFSource[];
}

export interface GPU {
  name: string;
  vendor: 'nvidia' | 'amd' | 'apple' | 'intel';
  aliases: string[];

  // Pricing (optional)
  price_usd?: number;
  price_eur?: number;
  affiliate_url?: string;
  availability?: 'available' | 'preorder' | 'used_only' | 'discontinued';

  // Memory
  vram_mb: number;
  bandwidth_gbps: number;
  memory_type: 'GDDR6' | 'GDDR6X' | 'GDDR7' | 'HBM2' | 'HBM2e' | 'HBM3' | 'Unified';

  // Compute
  cuda_cores?: number;          // NVIDIA
  stream_processors?: number;   // AMD
  tensor_cores?: number;        // NVIDIA (for FP16/INT8 acceleration)
  gpu_cores?: number;           // Apple Silicon
  compute_units?: number;       // AMD/Intel

  // Performance (theoretical)
  fp16_tflops?: number;         // FP16 performance
  fp32_tflops?: number;         // FP32 performance
  int8_tops?: number;           // INT8 performance (Tensor cores)

  // Architecture
  architecture: string;         // e.g. "Ada Lovelace", "RDNA3", "M3"
  compute_capability?: string;  // NVIDIA only, e.g. "8.9"

  // Interface
  pcie_gen?: number;            // PCIe generation (4, 5)
  pcie_lanes?: number;          // Number of PCIe lanes (16, 8)

  // Power
  tdp_watts?: number;           // Thermal Design Power
}

export interface CPU {
  name: string;
  vendor: 'intel' | 'amd' | 'apple';

  // Cores
  cores: number;
  threads: number;
  p_cores?: number;             // Performance cores (Intel hybrid)
  e_cores?: number;             // Efficiency cores (Intel hybrid)

  // Clock
  base_clock_ghz: number;
  boost_clock_ghz?: number;

  // Cache
  l3_cache_mb: number;

  // Instructions
  avx: boolean;
  avx2: boolean;
  avx512: boolean;
  amx?: boolean;                // Intel AMX for matrix ops

  // Memory support
  max_ram_gb: number;
  ram_channels: number;
  max_ram_speed_mhz: number;
}

export interface SystemConfig {
  gpu: GPU | null;
  cpu?: CPU | null;

  // System RAM
  ram_gb: number;
  ram_speed_mhz?: number;
  ram_channels?: number;

  // Storage (affects model loading time)
  storage_type?: 'nvme' | 'ssd' | 'hdd';
  storage_speed_gbps?: number;

  // Multi-GPU
  gpu_count?: number;
  nvlink?: boolean;
}

export interface RecommendationInput {
  useCase: UseCase;
  contextLength: number;

  // GPU specs
  vram_mb: number;
  bandwidth_gbps?: number;
  memory_type?: 'GDDR6' | 'GDDR6X' | 'GDDR7' | 'HBM2' | 'HBM2e' | 'HBM3' | 'Unified';
  cuda_cores?: number;
  stream_processors?: number;
  gpu_cores?: number;
  compute_units?: number;
  tensor_cores?: number;
  fp16_tflops?: number;
  fp32_tflops?: number;
  int8_tops?: number;
  pcie_gen?: number;
  pcie_lanes?: number;
  gpu_tdp_watts?: number;

  // Multi-GPU
  gpu_count?: number;
  nvlink?: boolean;

  // CPU specs (for CPU inference or hybrid)
  cpu_cores?: number;
  cpu_threads?: number;
  p_cores?: number;
  e_cores?: number;
  base_clock_ghz?: number;
  boost_clock_ghz?: number;
  l3_cache_mb?: number;
  avx?: boolean;
  avx2?: boolean;
  avx512?: boolean;
  amx?: boolean;

  // System RAM (for offloading)
  ram_gb?: number;
  ram_speed_mhz?: number;
  ram_channels?: number;

  // Storage
  storage_type?: 'nvme' | 'ssd' | 'hdd';
  storage_speed_gbps?: number;

  // Inference mode preference
  mode?: 'gpu_only' | 'gpu_offload' | 'cpu_only' | 'auto';
}

export type InferenceMode = 'gpu_full' | 'gpu_offload' | 'cpu_only' | 'not_possible';

export interface PerformanceEstimate {
  tokensPerSecond: number | null;
  prefillTokensPerSecond: number | null;  // Prompt processing speed
  timeToFirstToken: number | null;        // Latency in ms
  loadTimeSeconds: number | null;         // Model loading time
}

export interface MemoryBreakdown {
  modelVram: number;        // Base model size
  kvCacheVram: number;      // KV cache for context
  totalVram: number;        // Total GPU memory needed
  vramPercent: number;      // % of available VRAM
  ramOffload: number;       // Amount offloaded to RAM (if any)
  totalRamUsed: number;     // Total system RAM used
}

export interface ScoredModel {
  model: Model;
  quant: Quantization;
  score: number;

  // How to run this model
  inferenceMode: InferenceMode;
  gpuLayers: number | 'all';    // Number of layers on GPU (for offload)

  // Memory usage
  memory: MemoryBreakdown;

  // Performance estimates
  performance: PerformanceEstimate;

  // Warnings/notes
  warnings: string[];
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

export type SortBy = 'score' | 'speed' | 'quality' | 'vram' | 'params';

// GPU Price Tracking Types
export type PriceTrend = 'rising' | 'dropping' | 'stable';
export type Retailer = 'newegg' | 'amazon' | 'bestbuy';
export type AlertType = 'below' | 'above' | 'any_change';

export interface GpuPricePoint {
  id: string;
  gpu_name: string;
  price_usd: number;
  retailer: Retailer;
  retailer_url: string | null;
  in_stock: boolean;
  scraped_at: string;
}

export interface GpuPriceStats {
  gpu_name: string;
  current_price_usd: number | null;
  avg_30d: number | null;
  min_30d: number | null;
  max_30d: number | null;
  price_7d_ago: number | null;
  data_points_30d: number;
  trend: PriceTrend;
}

export interface PriceAlert {
  id: string;
  user_id: string;
  gpu_name: string;
  target_price_usd: number;
  alert_type: AlertType;
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
}

export type QuantLevel = 'Q3_K_M' | 'Q4_K_M' | 'Q5_K_M' | 'Q6_K' | 'Q8_0' | 'FP16';

export type ModelSizeRange = 'small' | 'medium' | 'large' | 'xlarge';

export type ModelFamily =
  | 'bloom' | 'command' | 'deepseek' | 'embedding' | 'ernie' | 'exaone'
  | 'falcon' | 'gemma' | 'glm' | 'kimi' | 'llama' | 'mimo' | 'minimax'
  | 'mistral' | 'nemotron' | 'olmo' | 'other' | 'phi' | 'qwen'
  | 'stablelm' | 'starcoder' | 'yi' | 'zephyr';

export type ModelArchitecture = 'dense' | 'moe';

export interface AdvancedFilters {
  contextLength: number;

  // Quantization filter
  quantLevels: QuantLevel[];

  // Speed filter
  minSpeed: number | null; // tokens/sec, null = no minimum

  // Model size filter (params)
  sizeRanges: ModelSizeRange[]; // small: ≤7B, medium: 8-13B, large: 14-34B, xlarge: 35B+

  // Model family filter
  families: ModelFamily[];

  // Architecture filter
  architectures: ModelArchitecture[];

  // Sort
  sortBy: SortBy;

  // Benchmark minimums
  minMmlu: number | null;
  minMath: number | null;
  minCoding: number | null; // humaneval/bigcodebench average

  // Show/hide
  showCpuOnly: boolean;
  showOffload: boolean;
  showOnlyFitsVram: boolean;
}

// GPU Review Types
export type GpuUseCase = 'chat' | 'coding' | 'reasoning' | 'mixed';
export type BestForTag = 'budget' | 'large_models' | 'multi_gpu' | 'quiet' | 'power_efficient' | 'beginners';

export interface GpuReview {
  id: string;
  user_id: string;
  gpu_name: string;
  rating_overall: number;
  rating_llm_performance: number | null;
  rating_value: number | null;
  rating_noise_temps: number | null;
  title: string | null;
  body: string;
  pros: string[];
  cons: string[];
  models_tested: string[];
  typical_speed_tps: number | null;
  vram_usage_percent: number | null;
  use_case: GpuUseCase | null;
  best_for: BestForTag[];
  purchase_price_usd: number | null;
  months_owned: number | null;
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  user_vote?: number | null;
  author_email?: string;
}

export interface GpuReviewStats {
  gpu_name: string;
  review_count: number;
  avg_rating: number;
  avg_llm_performance: number | null;
  avg_value: number | null;
  avg_speed_tps: number | null;
}

export interface NewGpuReviewInput {
  gpu_name: string;
  rating_overall: number;
  rating_llm_performance?: number;
  rating_value?: number;
  rating_noise_temps?: number;
  title?: string;
  body: string;
  pros?: string[];
  cons?: string[];
  models_tested?: string[];
  typical_speed_tps?: number;
  vram_usage_percent?: number;
  use_case?: GpuUseCase;
  best_for?: BestForTag[];
  purchase_price_usd?: number;
  months_owned?: number;
}
