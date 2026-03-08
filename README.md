# LocalLLM Advisor

Find the best local LLM for your hardware — or find the best hardware for your model.

## Two Modes

### Find Models (I have hardware)
Select your GPU and RAM, choose a use case, and get a ranked list of models with realistic performance estimates and ready-to-copy Ollama commands.

### Build for Model (I need hardware)
Choose a model you want to run, set your speed and budget preferences, and get GPU recommendations with prices and buy links.

## Features

### Hardware Detection
- **Auto-detect GPU** via WebGL - automatically identifies your graphics card
- **Auto-detect CPU** - detects thread count and Apple Silicon chips
- **56 GPUs** in database: NVIDIA (RTX 30/40/50), AMD (RX 6000/7000), Apple Silicon (M1-M4), Intel Arc
- **32 CPUs** in database for CPU inference estimates
- **Manual override** for any hardware spec

### Hardware Recipe (Build for Model)
Complete hardware recommendations for any model:

- **VRAM Requirements**: Shows exact GB needed at Q4, Q6, Q8, FP16
- **Feasibility Check**: Single GPU / Multi-GPU / Cloud required
- **Speed Preferences**: Any, Usable (10+ tok/s), Fast (25+ tok/s), Blazing (50+ tok/s)
- **Budget Filters**: No limit, Under $500/$1000/$1500/$2000/$3000/$5000
- **Recommended Builds**:
  - Budget - cheapest option that works
  - Best Value - optimal speed per dollar
  - Fastest - maximum performance
- **Multi-GPU Configs**: 2x, 4x, 8x GPU setups with scaling estimates
- **Cloud Alternatives**: RunPod, Vast.ai, Lambda with $/hr pricing
- **System Requirements**: RAM, PSU wattage, PCIe slots needed
- **Datacenter Scale**: For 1000B+ models, shows H100 cluster requirements

Works for any model size:
- Small models (7B): Single RTX 4060 sufficient
- Large models (70B): RTX 4090 or multi-GPU options
- Massive models (405B+): Cloud options with cost estimates
- Extreme models (1000B+): Datacenter requirements (e.g., "9x H100 @ $22/hr")

### Model Database
- **147 LLM models** from 25+ providers (Meta, Mistral, Qwen, Google, Microsoft, DeepSeek, Cohere, etc.)
- **113 models with benchmarks**: MMLU-PRO, MATH, IFEval, BBH, BigCodeBench, HumanEval, MBPP
- **4 quantization levels** per model: Q4_K_M, Q6_K, Q8_0, FP16
- **MoE support** with active parameter detection

### Performance Estimates
- **Tokens/sec** (decode speed) - memory bandwidth bound
- **Prefill speed** - compute bound, uses tensor cores
- **Time-to-first-token** latency
- **Model load time** based on storage speed
- **VRAM breakdown**: model size, KV cache, overhead

### Inference Modes
| Mode | Description | Typical Speed |
|------|-------------|---------------|
| `gpu_full` | Model fully in VRAM | 30-100+ tok/s |
| `gpu_offload` | Part in VRAM, part in RAM | 10-30 tok/s |
| `cpu_only` | All in RAM, CPU inference | 1-10 tok/s |

### Advanced Filters
- **Context length**: 4K to 200K tokens
- **Sort by**: Score, Speed, Quality, VRAM, Parameters
- **Quantization filter**: Q4, Q6, Q8, FP16
- **Model size filter**: Small (≤7B), Medium (8-13B), Large (14-34B), XL (35B+)
- **Model family**: Llama, Qwen, Mistral, Gemma, Phi, DeepSeek, and 17 more families
- **Architecture**: Dense (standard) or MoE (Mixture of Experts)
- **Minimum speed**: 5/10/20/30/50+ tok/s
- **Benchmark minimums**: MMLU-PRO, MATH, Coding
- **Show/hide**: CPU-only models, GPU+RAM offload, only fits in VRAM

### Theme Support
- **Dark/Light mode** - toggle in header, persisted in localStorage
- **System preference** - auto-detects OS theme on first visit

### Model Detail Modal
Click on any model to view complete specifications:
- **All benchmarks** with visual bars (HumanEval, MBPP, BigCodeBench, MMLU-PRO, MATH, IFEval, BBH, GPQA, MUSR)
- **All quantizations** available (Q4_K_M, Q6_K, Q8_0, FP16) with VRAM requirements
- **Performance estimates**: decode speed, prefill speed, time-to-first-token, load time
- **Model info**: family, architecture, parameters, context length, release date, capabilities
- **Ready-to-copy** Ollama command
- **Direct links** to Ollama library and HuggingFace

### Community Benchmarks
Real-world performance data crowdsourced from users:
- **Submit your benchmarks**: Login with GitHub/Google, enter your GPU and measured tok/s
- **Aggregated stats**: Average, median, min/max performance per GPU
- **Visual comparison**: See how different GPUs perform with each model
- **Verified data**: Community-driven, more accurate than theoretical estimates

Example:
```
RTX 4090 (23 reports)  ████████████████████  67 tok/s avg (range: 58-72)
RTX 4070 (12 reports)  ████████████          42 tok/s avg (range: 38-47)
RTX 3080 (8 reports)   ██████████            35 tok/s avg (range: 31-39)
```

### Use Cases
5 use cases with different benchmark weights:
- **Chat**: IFEval, MMLU-PRO, BBH
- **Coding**: HumanEval, MBPP, BigCodeBench, IFEval
- **Reasoning**: MATH, GPQA, BBH, MUSR
- **Creative**: IFEval, AlpacaEval, MMLU-PRO
- **Vision**: MMMU, MMBench, IFEval

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18 (recommended: 20 LTS)
- npm (included with Node.js)

```bash
node -v   # must be >= 18
npm -v
```

### Setup

```bash
# Clone the repo
git clone https://github.com/localllm-advisor/localllm-advisor.git
cd localllm-advisor

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open http://localhost:3000

> **Note**: Community Benchmarks require Supabase setup (see below). The app works without it, but users won't be able to submit or view community benchmarks.

## Community Benchmarks Setup (Supabase)

Community Benchmarks uses [Supabase](https://supabase.com) for storing user-submitted benchmark data with GitHub/Google authentication.

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Note your project URL and anon key from Settings → API

### 2. Configure Environment Variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Database Schema

1. Go to your Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/schema.sql`
3. Paste and click "Run"

This creates:
- `benchmarks` table with RLS (Row Level Security) policies
- `benchmark_stats` view for aggregated statistics
- Indexes for performance
- Triggers for timestamps

### 4. Enable OAuth Providers

#### GitHub Authentication

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable "GitHub"
3. Go to [GitHub Developer Settings](https://github.com/settings/developers) → OAuth Apps → New OAuth App
4. Fill in:
   - **Application name**: LocalLLM Advisor
   - **Homepage URL**: `http://localhost:3000` (or your production URL)
   - **Authorization callback URL**: `https://your-project-id.supabase.co/auth/v1/callback`
5. Copy the Client ID and Client Secret to Supabase

#### Google Authentication

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable "Google"
3. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
4. Create OAuth 2.0 Client ID (Web application)
5. Add Authorized redirect URI: `https://your-project-id.supabase.co/auth/v1/callback`
6. Copy the Client ID and Client Secret to Supabase

### 5. Configure Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `http://localhost:3000` (development) or your production URL
- **Redirect URLs**: Add both `http://localhost:3000` and your production URL

### 6. Test the Setup

```bash
npm run dev
```

1. Open a model detail modal
2. Click "Submit yours" in Community Benchmarks section
3. Login with GitHub or Google
4. Submit a benchmark
5. Verify it appears in the stats

### Database Schema

```sql
-- Main table
benchmarks (
  id, user_id, model_id, quant_level,
  gpu_name, gpu_vram_mb, cpu_name, ram_gb,
  tokens_per_second, prefill_tokens_per_second,
  time_to_first_token_ms, context_length,
  runtime, notes, created_at, verified, flagged
)

-- Aggregated view
benchmark_stats (
  model_id, quant_level, gpu_name,
  submission_count, avg_tps, min_tps, max_tps, median_tps
)
```

### Security

- **Row Level Security (RLS)** enabled on all tables
- Users can only insert/update/delete their own benchmarks
- Public read access for non-flagged benchmarks
- Flagging system for moderation

### Production Build

```bash
npm run build && npx serve out
# Site will be at http://localhost:3000/localllm-advisor
```

> **Note**: In development the site is at `http://localhost:3000`. In production (GitHub Pages) it's under `/localllm-advisor`.

## Project Structure

```
src/
  app/                    # Next.js pages and layouts
    page.tsx              # Main page
    about/                # About page
    faq/                  # FAQ page
    methodology/          # Methodology page
  components/
    HardwareConfig.tsx    # GPU/CPU selection with auto-detection
    HardwareFinder.tsx    # Build for Model - reverse hardware search
    AdvancedOptions.tsx   # Filters panel (context, sort, quant, size, speed)
    UseCasePicker.tsx     # Use case selection
    ResultsList.tsx       # Results display with charts
    ModelCard.tsx         # Individual model card with stats
    VramBar.tsx           # VRAM usage visualization
  lib/
    engine.ts             # Recommendation engine
    hardwareAdvisor.ts    # Reverse engine: model -> GPU recommendations
    vram.ts               # VRAM/performance calculations
    scoring.ts            # Benchmark-weighted scoring
    detectHardware.ts     # WebGL GPU detection
    types.ts              # TypeScript interfaces
  hooks/
    useRecommendation.ts  # React hook for state and data fetching
public/data/
  gpus.json               # GPU database (56 cards)
  cpus.json               # CPU database (32 processors)
  models.json             # LLM models with benchmarks (84 models)
scripts/
  scrape_hf_models.py     # Scrape models from HuggingFace
  merge_models.py         # Merge into app format
  update_models.py        # Update benchmarks from leaderboards
  update_gpu_prices.py    # Update GPU prices from Newegg (USD)
  scrape_gpus_simple.py   # Full GPU scraper with specs + prices
```

## How It Works

```
User Input                Engine                              Output
----------                ------                              ------
GPU (VRAM, BW)    -->    1. Filter by capability      -->   ScoredModel[]
CPU (cores, AVX)  -->    2. Apply advanced filters          - model
RAM               -->    3. Determine inference mode        - quantization
Use case          -->    4. Calculate memory breakdown      - score
Context length    -->    5. Estimate performance            - inference mode
Filters           -->    6. Generate warnings               - memory breakdown
                         7. Score and rank                  - performance stats
                         8. Sort by preference              - warnings
```

## Performance Calculations

**Decode speed** (memory bandwidth bound):
```
tokens/sec = bandwidth_gbps / model_size_gb
```

**Prefill speed** (compute bound):
```
tokens/sec = (fp16_tflops * utilization) / (params_b * 2)
```

**KV Cache** (for context > 4K):
```
kv_cache_mb = 0.5 * sqrt(params_b / 7) * extra_context_k
```

**VRAM estimate**:
```
vram_mb = params_b * bits_per_weight / 8 * 1024 + overhead
```

## Updating Data

### Python Setup (first time only)

```bash
python3 -m venv .venv
source .venv/bin/activate  # Linux/Mac
# or: .venv\Scripts\activate  # Windows

pip install -r requirements.txt
```

### Update Models

```bash
source .venv/bin/activate

# 1. Scrape models from HuggingFace
HF_TOKEN=hf_xxx python3 scripts/scrape_hf_models.py

# 2. Merge into app format
python3 scripts/merge_models.py

# 3. Update benchmarks from Open LLM Leaderboard
HF_TOKEN=hf_xxx python3 scripts/update_models.py
```

### Update GPU Prices

```bash
source .venv/bin/activate

# Update USD prices from Newegg
python3 scripts/update_gpu_prices.py
```

The script scrapes current prices from Newegg for all 44 purchasable GPUs (excludes Apple Silicon which is not sold separately).

**Note**: HuggingFace token (`HF_TOKEN`) is optional but recommended for gated models (Llama, Mistral) and higher rate limits. Create one at https://huggingface.co/settings/tokens

### Add a New GPU

Edit `public/data/gpus.json`:

```json
{
  "name": "NVIDIA RTX 5090",
  "vendor": "nvidia",
  "aliases": ["RTX 5090", "rtx 5090", "RTX5090"],
  "price_usd": 1999,
  "availability": "available",
  "vram_mb": 32768,
  "bandwidth_gbps": 1792,
  "memory_type": "GDDR7",
  "cuda_cores": 21760,
  "tensor_cores": 680,
  "fp16_tflops": 209,
  "fp32_tflops": 104,
  "architecture": "Blackwell",
  "compute_capability": "10.0",
  "tdp_watts": 575
}
```

Availability options: `available`, `preorder`, `used_only`, `discontinued`

### Add a New CPU

Edit `public/data/cpus.json`:

```json
{
  "name": "AMD Ryzen 9 9950X",
  "vendor": "amd",
  "cores": 16,
  "threads": 32,
  "base_clock_ghz": 4.3,
  "boost_clock_ghz": 5.7,
  "l3_cache_mb": 64,
  "avx2": true,
  "avx512": true,
  "max_ram_gb": 192
}
```

## TypeScript Interfaces

```typescript
interface AdvancedFilters {
  contextLength: number;              // 4096 - 200000
  quantLevels: QuantLevel[];          // ['Q4_K_M', 'Q6_K', 'Q8_0', 'FP16']
  minSpeed: number | null;            // tokens/sec minimum
  sizeRanges: ModelSizeRange[];       // ['small', 'medium', 'large', 'xlarge']
  sortBy: SortBy;                     // 'score' | 'speed' | 'quality' | 'vram' | 'params'
  minMmlu: number | null;
  minMath: number | null;
  minCoding: number | null;
  showCpuOnly: boolean;
  showOffload: boolean;
  showOnlyFitsVram: boolean;
}

interface ScoredModel {
  model: Model;
  quant: Quantization;
  score: number;
  inferenceMode: 'gpu_full' | 'gpu_offload' | 'cpu_only';
  gpuLayers: number | 'all';
  memory: {
    modelVram: number;
    kvCacheVram: number;
    totalVram: number;
    vramPercent: number;
    ramOffload: number;
  };
  performance: {
    tokensPerSecond: number | null;
    prefillTokensPerSecond: number | null;
    timeToFirstToken: number | null;
    loadTimeSeconds: number | null;
  };
  warnings: string[];
}
```

## Deployment

The repo has a GitHub Actions workflow (`.github/workflows/deploy.yml`) that on push to `main`:
1. Builds the static site
2. Deploys to GitHub Pages

To enable: repo Settings -> Pages -> Source: **GitHub Actions**

Site will be at `https://localllm-advisor.github.io/localllm-advisor/`

## Community Discussions

The app includes community discussions powered by [Giscus](https://giscus.app/) (GitHub Discussions).

### Setup Giscus

1. **Enable Discussions** in your GitHub repository:
   - Go to repo Settings → General → Features → Check "Discussions"

2. **Create categories** in Discussions:
   - Go to Discussions tab → Categories → New category
   - Create: `Models` (for model discussions), `GPUs` (for GPU discussions)

3. **Configure Giscus**:
   - Go to https://giscus.app/
   - Enter your repo: `localllm-advisor/localllm-advisor`
   - Select category: `Models`
   - Copy the `data-repo-id` and `data-category-id` values

4. **Update the component**:
   - Edit `src/components/Giscus.tsx`
   - Fill in `data-repo-id` and `data-category-id`

### Features

- **Discuss button** on each model card opens a discussion modal
- **GitHub login** required to comment
- **Reactions** enabled (thumbs up, heart, etc.)
- **Theme sync** with dark/light mode

## Analytics

To enable Google Analytics, create `.env.local`:

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Events tracked:
- `find_models` - when user searches for models (with GPU/VRAM as label)

## Tech Stack

- **Next.js 14** (Static Export)
- **TypeScript** + **Tailwind CSS**
- **Zero backend** - all client-side
- **Python** for data scraping

## Roadmap

- [x] CPU inference support
- [x] Multi-GPU support
- [x] Benchmark comparison charts
- [x] Auto GPU detection (WebGL)
- [x] Auto CPU detection
- [x] Advanced filters panel
- [x] Context length up to 200K
- [x] CPU-only mode without GPU
- [x] "Build for Model" reverse hardware search
- [x] GPU pricing database with buy links
- [x] Complete Hardware Recipe system
- [x] Cloud provider alternatives (RunPod, Vast.ai, Lambda)
- [x] Multi-GPU configurations (2x, 4x, 8x)
- [x] Datacenter-scale requirements for 1000B+ models
- [x] Dark/light theme toggle
- [x] Model comparison radar chart
- [x] Export results (JSON/CSV)
- [x] Filter by model family/architecture
- [ ] PWA for offline use

## License

MIT
