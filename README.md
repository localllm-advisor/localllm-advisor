# LocalLLM Advisor

Run AI locally. Keep your data yours.

The tool that helps you find the perfect LLM for your hardware — or the best hardware for your LLM. 100% client-side, zero data collection, completely free.

**Live at [localllm-advisor.com](https://localllm-advisor.com)**

---

## What It Does

### Find Models (I have hardware)
Select your GPU (or CPU), choose a use case, and get a ranked list of models with realistic performance estimates and ready-to-copy Ollama commands.

### Build for Model (I need hardware)
Choose a model you want to run, set your speed and budget preferences, and get GPU recommendations with prices and buy links.

### Enterprise Tools
For businesses evaluating on-premise LLM deployments: GPU fleet sizing calculator, cloud vs. on-premise TCO analysis, and compliance-aware architecture guidance.

---

## Features

### Hardware Detection
- **Auto-detect GPU** via WebGL — automatically identifies your graphics card
- **Auto-detect CPU** — detects thread count and Apple Silicon
- **206 GPUs** in database: NVIDIA (RTX 20/30/40/50, data center A/H/L series), AMD (RX 6000/7000), Apple Silicon (M1–M4 Pro/Max/Ultra), Intel Arc
- **78 CPUs** in database: Intel (12th–14th gen, Arrow Lake), AMD (Ryzen 5000/7000/9000, Zen 5), Apple Silicon (M1–M4 including Ultra)
- **Manual override** for any hardware spec

### Model Database
- **891+ LLM models** from 35+ providers (Meta, Mistral, Qwen, Google, Microsoft, DeepSeek, Cohere, and more)
- **Vision models**: LLaVA, Moondream, InternVL2, MiniCPM-V, Pixtral, Llama Vision, Qwen-VL
- **Embedding models**: Nomic, mxbai, BGE-M3, Snowflake Arctic
- **100% benchmark coverage**: MMLU-PRO, MATH, IFEval, BBH, BigCodeBench, HumanEval, MBPP, MMMU, MMBench, GPQA, MUSR
- **6 quantization levels** per model: Q3_K_M, Q4_K_M, Q5_K_M, Q6_K, Q8_0, FP16
- **MoE support** with active parameter detection
- **GGUF download links** for 80%+ of models (bartowski, unsloth, TheBloke)

### Performance Estimates
All estimates use physics-based formulas, not black-box ML:

- **Tokens/sec** (decode speed) — memory bandwidth bound: `tok/s = bandwidth_gbps / model_size_gb`
- **Prefill speed** — compute bound, uses tensor cores
- **Time-to-first-token** latency
- **Model load time** based on storage speed
- **VRAM breakdown**: model size + KV cache + overhead

### Inference Modes

| Mode | Description | Typical Speed |
|------|-------------|---------------|
| `gpu_full` | Model fully in VRAM | 30–100+ tok/s |
| `gpu_offload` | Part in VRAM, part in RAM | 10–30 tok/s |
| `cpu_only` | All in RAM, CPU inference | 1–10 tok/s |

### Advanced Filters
- **Context length**: 4K to 200K tokens
- **Sort by**: Score, Speed, Quality, VRAM, Parameters
- **Quantization filter**: Q3, Q4, Q5, Q6, Q8, FP16
- **Model size filter**: Small (≤7B), Medium (8–13B), Large (14–34B), XL (35B+)
- **Model family**: Llama, Qwen, Mistral, Gemma, Phi, DeepSeek, and 17+ more
- **Architecture**: Dense or MoE (Mixture of Experts)
- **Minimum speed**: 5/10/20/30/50+ tok/s
- **Benchmark minimums**: MMLU-PRO, MATH, Coding

### Hardware Recipe (Build for Model)
Complete hardware recommendations for any model:

- **VRAM Requirements**: Exact GB needed at Q4, Q6, Q8, FP16
- **Feasibility Check**: Single GPU / Multi-GPU / Cloud required
- **Speed Preferences**: Any, Usable (10+ tok/s), Fast (25+ tok/s), Blazing (50+ tok/s)
- **Budget Filters**: No limit, Under $500/$1000/$1500/$2000/$3000/$5000
- **Recommended Builds**: Budget / Best Value / Fastest
- **Multi-GPU Configs**: 2x, 4x, 8x GPU setups with scaling estimates
- **Cloud Alternatives**: RunPod, Vast.ai, Lambda with $/hr pricing
- **System Requirements**: RAM, PSU wattage, PCIe slots needed
- **Datacenter Scale**: For 1000B+ models, shows H100 cluster requirements

### Cloud Fallback Cards
When a model runs slowly on your hardware (< 8 tok/s) or uses > 85% of your VRAM, the app surfaces cloud alternatives inline with estimated tok/s and price/hr, so you can make an informed rent-vs-own decision.

### Setup Score & Upgrade Advisor
Comprehensive hardware evaluation:

- **Hardware Rating** (0–100, with Diamond/Gold/Silver/Bronze/Starter tiers)
- **Score Components**: VRAM capacity, memory bandwidth, model coverage, best quality, speed
- **Community Data**: Incorporates real benchmarks (30% weight)
- **GPU Upgrade Suggestions**: Ranked by cost/benefit, with Amazon buy links
- **Models Unlocked**: Shows which new models each upgrade enables

### Share Your Setup
Generate a shareable link or plain-text summary of your current hardware configuration and top model matches.

### Community Benchmarks
Real-world performance data crowdsourced from users:

- **Submit benchmarks**: Login with GitHub/Google, enter your GPU and measured tok/s
- **Aggregated stats**: Average, median, min/max performance per GPU
- **Visual comparison**: See how different GPUs perform with each model
- **Voting system**: Upvote/downvote helpful benchmark submissions
- **Filters**: By model, GPU, quantization level
- **Sorting**: Top voted, fastest, or newest

### GPU Price Tracker (`/gpu-prices`)
- **Price History**: Track prices from Newegg and Amazon over time
- **Price Trends**: Rising, dropping, or stable (7-day comparison)
- **Hot Deals**: GPUs below their 30-day average
- **Price Alerts**: Get notified when a GPU drops below your target price
- **Automated Updates**: GitHub Actions workflow runs daily

### GPU Reviews
Community-driven reviews specifically for LLM use cases:

- **Star Ratings**: Overall + LLM performance, value, noise/temps
- **Pros/Cons Lists**, **"Best For" Tags**, **LLM Context** (models tested, typical tok/s)
- **Voting System**: Upvote/downvote helpful reviews
- **External Links**: Reddit r/LocalLLaMA, Ollama issues, llama.cpp discussions

### Enterprise Tools
- **GPU Fleet Sizing Calculator**: Find the optimal GPU configuration for a target throughput and model
- **TCO Analysis**: Cloud vs. on-premise total cost of ownership with break-even projections

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18 (recommended: 20 LTS)
- npm (included with Node.js)

```bash
node -v   # must be >= 18
```

### Setup

```bash
git clone https://github.com/localllm-advisor/localllm-advisor.git
cd localllm-advisor
npm install
npm run dev
```

Open http://localhost:3000

> Community Benchmarks require Supabase setup (see below). The app works fully without it.

---

## Community Benchmarks Setup (Supabase)

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Note your project URL and anon key from Settings → API

### 2. Configure Environment Variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

### 3. Run Database Schema

1. Go to Supabase Dashboard → SQL Editor
2. Copy `supabase/schema.sql` → Paste and Run
3. Copy `supabase/gpu_prices_schema.sql` → Paste and Run

### 4. Enable OAuth Providers

**GitHub:**
1. Supabase Dashboard → Authentication → Providers → Enable GitHub
2. Create an OAuth App at [github.com/settings/developers](https://github.com/settings/developers)
3. Authorization callback URL: `https://your-project-id.supabase.co/auth/v1/callback`

**Google:**
1. Supabase Dashboard → Authentication → Providers → Enable Google
2. Create OAuth 2.0 credentials at [console.cloud.google.com](https://console.cloud.google.com)
3. Authorized redirect URI: `https://your-project-id.supabase.co/auth/v1/callback`

### 5. Configure Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: your production URL
- **Redirect URLs**: add both `http://localhost:3000` and your production URL

> **Note on OAuth branding**: Google's consent screen will show your Supabase project ID subdomain (e.g. `abc123.supabase.co`) until you configure a custom domain. This is expected behavior on the Supabase free tier.

## GPU Price Tracking Setup

1. Run `supabase/gpu_prices_schema.sql` in your Supabase SQL Editor
2. Add GitHub Actions secrets: `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
3. The workflow (`.github/workflows/scrape-gpu-prices.yml`) runs daily at 6:00 UTC

Manual scraping:

```bash
pip install -r scripts/requirements.txt
SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=xxx python scripts/scrape_gpu_prices.py
```

---

## Database Schema

```sql
benchmarks (id, user_id, model_id, quant_level, gpu_name, gpu_vram_mb,
  cpu_name, ram_gb, tokens_per_second, prefill_tokens_per_second,
  time_to_first_token_ms, context_length, runtime, notes, created_at, verified, flagged)

benchmark_votes (id, user_id, benchmark_id, vote_type, created_at)

benchmark_stats (model_id, quant_level, gpu_name,
  submission_count, avg_tps, min_tps, max_tps, median_tps)  -- view

gpu_prices (id, gpu_name, price_usd, retailer, retailer_url, in_stock, scraped_at)

price_alerts (id, user_id, gpu_name, target_price_usd, is_active, triggered_at)

gpu_reviews (id, user_id, gpu_name, rating_overall, rating_llm_performance,
  rating_value, rating_noise_temps, title, body, pros, cons,
  models_tested, typical_speed_tps, use_case, best_for, upvotes, downvotes)
```

Security: Row Level Security (RLS) is enabled on all tables. Users can only modify their own data. Flagging system for moderation.

---

## Project Structure

```
src/
  app/
    page.tsx                  # Landing page
    search/
      model/page.tsx          # Find models for your hardware
      hardware/page.tsx       # Find hardware for a model
    enterprise/               # Enterprise tools (fleet sizing, TCO)
    benchmarks/               # Community benchmarks browser
    gpu-prices/               # GPU price tracker
    classic/                  # Legacy single-page interface
    about/ faq/ methodology/  # Info pages
  components/
    HardwareConfig.tsx        # GPU/CPU selection + auto-detection
    HardwareFinder.tsx        # Reverse hardware search
    ResultsList.tsx           # Results with model detail panels
    CloudFallbackCard.tsx     # Cloud alternative suggestions
    UpgradeAdvisor.tsx        # Setup score + upgrade recommendations
    BenchmarkSubmitModal.tsx  # Community benchmark submission
    HomeBenchmarkFeed.tsx     # Live benchmark feed on landing page
    ShareSetupModal.tsx       # Share hardware configuration
    EnterprisePaywall.tsx     # Enterprise tier gating
    PriceHistoryChart.tsx     # GPU price history chart
    GpuReviewCard.tsx         # GPU review with voting
    AdvancedOptions.tsx       # Advanced filters panel
    UseCasePicker.tsx         # Use case selection
  lib/
    engine.ts                 # Recommendation engine
    hardwareAdvisor.ts        # Reverse engine: model → GPU
    vram.ts                   # VRAM/performance calculations
    scoring.ts                # Benchmark-weighted scoring
    detectHardware.ts         # WebGL GPU detection
    types.ts                  # TypeScript interfaces
  hooks/
    useRecommendation.ts      # React hook for state and data fetching
public/data/
  gpus.json                   # 122 GPU specs + prices
  cpus.json                   # 65 CPU specs
  models.json                 # 242+ LLM models with benchmarks
scripts/
  scrape_hf_models.py         # Scrape models from HuggingFace
  merge_models.py             # Merge into app format
  update_models.py            # Update benchmarks from Open LLM Leaderboard
  scrape_gpu_prices.py        # Daily price scraper (Newegg/Amazon → Supabase)
supabase/
  schema.sql                  # Benchmarks + reviews + voting schema
  gpu_prices_schema.sql       # GPU price tracking schema
```

---

## How It Works

```
User Input              Engine                              Output
----------              ------                              ------
GPU (VRAM, BW)   →     1. Filter by capability       →    ScoredModel[]
CPU (cores, AVX) →     2. Apply advanced filters          - model + quantization
RAM              →     3. Determine inference mode        - composite score
Use case         →     4. Calculate memory breakdown      - inference mode
Context length   →     5. Estimate performance            - memory breakdown
Filters          →     6. Generate warnings               - performance stats
                        7. Score and rank                  - warnings
                        8. Sort by preference
```

### Performance Formulas

```
# Decode speed (memory bandwidth bound)
tokens/sec = bandwidth_gbps / model_size_gb
model_size_gb = params_b × bits_per_weight / 8

# Prefill speed (compute bound)
tokens/sec = (fp16_tflops × utilization) / (params_b × 2)

# KV cache (context > 4K)
kv_cache_mb = 0.5 × sqrt(params_b / 7) × extra_context_k

# VRAM total
vram_mb = model_vram + kv_cache_vram + overhead_mb
```

---

## Updating Data

### Python Setup

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Update Models

```bash
source .venv/bin/activate
HF_TOKEN=hf_xxx python3 scripts/scrape_hf_models.py
python3 scripts/merge_models.py
HF_TOKEN=hf_xxx python3 scripts/update_models.py
```

`HF_TOKEN` is optional but recommended for gated models and higher rate limits. Create one at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens).

### Update GPU Prices

```bash
python3 scripts/update_gpu_prices.py
```

### Add a New GPU

Edit `public/data/gpus.json`:

```json
{
  "name": "NVIDIA RTX 5090",
  "vendor": "nvidia",
  "aliases": ["RTX 5090", "rtx 5090"],
  "price_usd": 1999,
  "availability": "available",
  "vram_mb": 32768,
  "bandwidth_gbps": 1792,
  "memory_type": "GDDR7",
  "fp16_tflops": 209,
  "architecture": "Blackwell",
  "tdp_watts": 575
}
```

Availability options: `available`, `preorder`, `used_only`, `discontinued`

---

## Production Build

```bash
npm run build
npx serve out
```

---

## Analytics

These are the only cookies used by the site. To enable Google Analytics:

```bash
# .env.local
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## Tech Stack

- **Next.js 14** (Static Export, App Router)
- **TypeScript** + **Tailwind CSS**
- **Supabase** — community benchmarks, GPU prices, reviews (optional)
- **Zero backend for core features** — all recommendation logic runs client-side
- **Python** for data scraping and database maintenance

---

## Roadmap

**Completed:**
- [x] CPU inference support + CPU-only mode
- [x] Multi-GPU support (2x, 4x, 8x)
- [x] Auto GPU + CPU detection (WebGL/WebGPU)
- [x] Advanced filters (context, quant, size, speed, benchmarks, families)
- [x] "Build for Model" reverse hardware search
- [x] Complete Hardware Recipe system
- [x] Cloud provider alternatives (RunPod, Vast.ai, Lambda)
- [x] Datacenter-scale requirements for 1000B+ models
- [x] Setup Score & Upgrade Advisor with community data integration
- [x] Community benchmarks with submission, voting, and filtering
- [x] Anti-abuse benchmark submission (rate limiting, duplicate prevention)
- [x] GPU Price Tracker with history, trends, and alerts
- [x] GPU Reviews with LLM-specific ratings and voting
- [x] Cloud fallback cards when hardware is a bottleneck
- [x] Share setup modal
- [x] Enterprise fleet sizing and TCO tools
- [x] Dark/light theme + system preference detection
- [x] Export results (JSON/CSV)

**Planned:**
- [ ] Mobile-responsive improvements
- [ ] Model comparison side-by-side
- [ ] PWA / offline support
- [ ] More cloud providers (Together.ai, Replicate, Modal, Paperspace)
- [ ] EUR/USD price toggle

---

## Contributing

Pull requests and issues are welcome. If you have real-world benchmark data for a GPU/model combination, please submit it through the app's community benchmarks feature.

---

## License

MIT
