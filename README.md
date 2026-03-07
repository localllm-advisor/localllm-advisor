# LocalLLM Advisor

Sito statico dove l'utente seleziona la propria GPU e RAM, sceglie un use case, e ottiene una lista ordinata di modelli LLM con stime di performance realistiche e comando Ollama pronto da copiare.

## Features

- **52 GPU supportate**: NVIDIA (RTX 30/40/50), AMD (RX 6000/7000), Apple Silicon (M1-M4), Intel Arc
- **32 CPU nel database**: per stime CPU inference
- **3 modalita' di inferenza**: GPU full, GPU+RAM offload, CPU only
- **Stime performance realistiche**: tokens/sec, prefill speed, time-to-first-token, load time
- **Memory breakdown**: VRAM usata, KV cache, offload su RAM
- **Warnings intelligenti**: avvisi per VRAM al limite, velocita' bassa, modelli grandi

## Prerequisiti

- [Node.js](https://nodejs.org/) >= 18 (consigliato: 20 LTS)
- npm (incluso con Node.js)
- Python 3.8+ (per aggiornamento dati)

```bash
node -v   # deve essere >= 18
npm -v
python3 --version
```

## Setup locale

```bash
# Clona il repo
git clone https://github.com/localllm-advisor/localllm-advisor.git
cd localllm-advisor

# Installa dipendenze
npm install

# Dev server con hot reload
npm run dev
# Apre su http://localhost:3000
```

> **Nota**: In sviluppo il sito e' su `http://localhost:3000`. In produzione (GitHub Pages) e' sotto `/localllm-advisor`.

### Build statica (come in produzione)

```bash
npm run build && npx serve out
# Il sito sara' su http://localhost:3000/localllm-advisor
```

## Architettura

### Struttura progetto

```
src/
  app/              # Page e layout Next.js
  components/       # Componenti React UI
    GpuSelector     # Autocomplete GPU con fallback manuale
    RamSlider       # Selettore RAM di sistema
    UseCasePicker   # Selezione use case
    ContextSlider   # Slider context length
    ModelCard       # Card risultato con stats e warnings
    VramBar         # Barra progresso VRAM
    ResultsList     # Lista risultati
  lib/
    engine.ts       # Recommendation engine principale
    vram.ts         # Calcoli VRAM, performance, inference mode
    scoring.ts      # Sistema di scoring benchmark-weighted
    types.ts        # TypeScript interfaces
  hooks/
    useRecommendation.ts  # React hook per stato e fetch
public/data/
  gpus.json         # Database GPU (52 schede)
  cpus.json         # Database CPU (32 processori)
  models.json       # Modelli LLM con benchmark
scripts/
  update_models.py  # Script scraping dati
```

### Come funziona il recommendation engine

```
Input utente          Engine                           Output
-------------         ------                           ------
GPU (VRAM, BW)   -->  1. Filtra per capability    --> ScoredModel[]
RAM di sistema   -->  2. Determina inference mode     - model
Use case         -->  3. Calcola memory breakdown     - quant
Context length   -->  4. Stima performance            - score
                      5. Genera warnings              - inferenceMode
                      6. Score + rank                 - memory {}
                                                      - performance {}
                                                      - warnings []
```

### Inference Modes

| Mode | Descrizione | Performance |
|------|-------------|-------------|
| `gpu_full` | Modello interamente in VRAM | Ottimale (30-100+ tok/s) |
| `gpu_offload` | Parte in VRAM, parte in RAM | Ridotta (10-30 tok/s) |
| `cpu_only` | Tutto su RAM + CPU | Molto lenta (1-5 tok/s) |
| `not_possible` | Non abbastanza memoria | N/A |

### Calcoli Performance

**Tokens/sec (decode)** - memory bandwidth bound:
```
tok/s = bandwidth_gbps / model_size_gb
```

**Prefill speed** - compute bound:
```
tok/s = (fp16_tflops * utilization) / (params_b * 2)
```

**KV Cache** - per context oltre 4K:
```
kv_mb = 0.5 * sqrt(params_b / 7) * extra_context_k
```

**VRAM stima**:
```
vram_mb = params_b * bpw / 8 * 1024 + overhead
```

## Database Hardware

### GPU (`public/data/gpus.json`)

52 GPU con specifiche complete:

| Campo | Descrizione |
|-------|-------------|
| `vram_mb` | Memoria video in MB |
| `bandwidth_gbps` | Bandwidth memoria GB/s |
| `fp16_tflops` | Performance FP16 |
| `tensor_cores` | Numero tensor cores (NVIDIA) |
| `cuda_cores` | CUDA cores (NVIDIA) |
| `architecture` | Ada Lovelace, RDNA3, M3, etc |
| `memory_type` | GDDR6, GDDR6X, HBM3, Unified |
| `tdp_watts` | Consumo energetico |

**Vendor supportati**: NVIDIA, AMD, Apple, Intel

### CPU (`public/data/cpus.json`)

32 CPU con specifiche per CPU inference:

| Campo | Descrizione |
|-------|-------------|
| `cores` / `threads` | Core fisici e thread |
| `base_clock_ghz` | Frequenza base |
| `l3_cache_mb` | Cache L3 |
| `avx2` / `avx512` | Istruzioni vettoriali |
| `max_ram_gb` | RAM massima supportata |

## Aggiornare i dati

### Script automatico (modelli)

```bash
# Setup (solo la prima volta)
python3 -m venv .venv
source .venv/bin/activate  # Linux/Mac
# oppure: .venv\Scripts\activate  # Windows

pip install requests beautifulsoup4 pandas pyarrow datasets

# Esegui lo script
python scripts/update_models.py
```

Lo script:
1. **Scrape Ollama Registry** - lista modelli e tag disponibili
2. **Open LLM Leaderboard** (HuggingFace) - benchmark (IFEval, BBH, MATH, GPQA, MUSR, MMLU-PRO)
3. **Calcola VRAM** - stima da parametri + bits-per-weight

Per aggiungere un nuovo modello, modificare `OLLAMA_MODELS` in `scripts/update_models.py`.

### Aggiungere una nuova GPU

Editare `public/data/gpus.json`:

```json
{
  "name": "RTX 5090",
  "vendor": "nvidia",
  "aliases": ["5090", "GeForce 5090"],
  "vram_mb": 32768,
  "bandwidth_gbps": 1792,
  "memory_type": "GDDR7",
  "cuda_cores": 21760,
  "tensor_cores": 680,
  "fp16_tflops": 209.5,
  "fp32_tflops": 104.8,
  "architecture": "Blackwell",
  "compute_capability": "10.0",
  "tdp_watts": 575
}
```

### Aggiungere una nuova CPU

Editare `public/data/cpus.json`:

```json
{
  "name": "AMD Ryzen 9 9950X",
  "vendor": "amd",
  "cores": 16,
  "threads": 32,
  "base_clock_ghz": 4.3,
  "boost_clock_ghz": 5.7,
  "l3_cache_mb": 64,
  "avx": true,
  "avx2": true,
  "avx512": true,
  "max_ram_gb": 192,
  "ram_channels": 2,
  "max_ram_speed_mhz": 5600
}
```

## UI Components

### GpuSelector
Autocomplete con ricerca fuzzy su nome e alias. Fallback per inserimento manuale VRAM.

### RamSlider
Selettore RAM sistema: 8, 16, 32, 64, 128 GB. Usato per calcolare offload.

### ModelCard
Mostra per ogni risultato:
- Rank, nome, parametri, quantizzazione
- Score 0-100 pesato per use case
- **Performance stats grid**: Speed, Prefill, VRAM, Load time
- **VRAM bar** con colori (verde/giallo/rosso)
- **Badge inference mode**: GPU+RAM, CPU only
- **Warnings**: avvisi contestuali
- **Comando Ollama** con copy button

### UseCasePicker
5 use case con pesi benchmark diversi:
- **Chat**: IFEval, AlpacaEval
- **Coding**: HumanEval, MBPP, BigCodeBench
- **Reasoning**: MATH, GPQA, BBH
- **Creative**: AlpacaEval, IFEval
- **Vision**: MMMU, MMBench

## TypeScript Interfaces

```typescript
// Input per recommendation
interface RecommendationInput {
  vram_mb: number;
  useCase: 'chat' | 'coding' | 'reasoning' | 'creative' | 'vision';
  contextLength: number;
  bandwidth_gbps?: number;
  fp16_tflops?: number;
  tensor_cores?: number;
  ram_gb?: number;
  cpu_cores?: number;
  mode?: 'gpu_only' | 'gpu_offload' | 'cpu_only' | 'auto';
}

// Output per ogni modello
interface ScoredModel {
  model: Model;
  quant: Quantization;
  score: number;
  inferenceMode: 'gpu_full' | 'gpu_offload' | 'cpu_only' | 'not_possible';
  gpuLayers: number | 'all';
  memory: {
    modelVram: number;
    kvCacheVram: number;
    totalVram: number;
    vramPercent: number;
    ramOffload: number;
    totalRamUsed: number;
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

## Deploy

Il repo ha un workflow GitHub Actions (`.github/workflows/deploy.yml`) che al push su `main`:
1. Builda il sito statico
2. Lo deploya su GitHub Pages

Per attivarlo: repo Settings -> Pages -> Source: **GitHub Actions**.

Il sito sara' su `https://localllm-advisor.github.io/localllm-advisor/`

## Stack

- Next.js 14 (Static Export)
- TypeScript + Tailwind CSS
- Zero backend, tutto client-side
- Python per data scraping

## TODO

- [ ] Aggiungere input CPU per stime CPU inference
- [ ] Multi-GPU support UI
- [ ] Benchmark comparativo tra modelli
- [ ] Dark/light theme toggle
- [ ] Export risultati (JSON/CSV)
- [ ] PWA per uso offline
