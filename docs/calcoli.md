# Calcoli per le Raccomandazioni LLM

Questo documento spiega le formule e i calcoli utilizzati da LocalLLM Advisor per stimare le performance e determinare quali modelli possono girare sul tuo hardware.

## Indice

1. [Stima Dimensione Modello](#stima-dimensione-modello)
2. [Stima KV Cache](#stima-kv-cache)
3. [Modalità di Inferenza](#modalità-di-inferenza)
4. [Calcolo Memory Breakdown](#calcolo-memory-breakdown)
5. [Calcolo GPU Layers](#calcolo-gpu-layers)
6. [Bandwidth PCIe](#bandwidth-pcie)
7. [Bandwidth RAM](#bandwidth-ram)
8. [Velocità Inferenza CPU](#velocità-inferenza-cpu)
9. [Velocità Decode (Token/s)](#velocità-decode-tokens)
10. [Velocità Prefill](#velocità-prefill)
11. [Time to First Token](#time-to-first-token)
12. [Tempo di Caricamento](#tempo-di-caricamento)
13. [Multi-GPU e NVLink](#multi-gpu-e-nvlink)
14. [Score Finale](#score-finale)

---

## Stima Dimensione Modello

La dimensione di un modello in memoria dipende dal numero di parametri e dalla quantizzazione (bits per weight).

```
dimensione_mb = params_B × bpw / 8 × 1024
```

Dove:
- `params_B` = parametri in miliardi (es. 7 per un 7B)
- `bpw` = bits per weight (es. 4.0 per Q4, 8.0 per FP8)

**Esempio:** Un modello 7B a Q4 (4 bit):
```
7 × 4 / 8 × 1024 = 3584 MB ≈ 3.5 GB
```

---

## Stima KV Cache

La KV cache cresce con il context length. La formula approssimata:

```
kv_cache_mb = 0.5 × sqrt(params_B / 7) × (context - base_context) / 1024
```

Dove:
- `base_context` = 4096 (context incluso nel modello base)
- Il fattore `0.5 MB per 1K context` scala con la radice quadrata dei parametri

**Esempio:** Modello 70B con context 32K:
```
0.5 × sqrt(70/7) × (32768 - 4096) / 1024
= 0.5 × 3.16 × 28
≈ 44 MB extra per KV cache
```

**Nota:** Per context <= 4096, la KV cache è considerata già inclusa nella VRAM base del modello.

---

## Modalità di Inferenza

Il sistema determina automaticamente la modalità migliore:

| Modalità | Condizione | Performance |
|----------|------------|-------------|
| `gpu_full` | Modello + KV cache ≤ 90% VRAM | Massima velocità |
| `gpu_offload` | Eccesso può essere offloadato in RAM | Ridotta (dipende da PCIe) |
| `cpu_only` | Abbastanza RAM per modello + KV + 4GB headroom | Molto lenta |
| `not_possible` | Non abbastanza memoria | Non eseguibile |

```
max_vram = vram_disponibile × 0.9  // 10% headroom per sicurezza
totale_necessario = vram_modello + kv_cache

if (totale_necessario ≤ max_vram) → gpu_full
else if (ram_disponibile ≥ eccesso + 2GB) → gpu_offload
else if (ram_disponibile ≥ modello_q4 + kv + 4GB) → cpu_only
else → not_possible
```

---

## Calcolo Memory Breakdown

Dettaglio dell'utilizzo memoria:

```typescript
{
  modelVram: MB del modello in GPU,
  kvCacheVram: MB per KV cache,
  totalVram: modelVram + kvCacheVram,
  vramPercent: (totalVram / vram_disponibile) × 100,
  ramOffload: MB offloadati in RAM (se gpu_offload),
  totalRamUsed: ramOffload + 500MB overhead runtime
}
```

---

## Calcolo GPU Layers

Per la modalità `gpu_offload`, calcoliamo quanti layer stanno in GPU:

```
layers_stimati = 32 × (params_B / 7)  // ~32 layer per 7B
vram_per_layer = vram_modello / layers_stimati
vram_disponibile_per_layers = max_vram - kv_cache
gpu_layers = floor(vram_disponibile_per_layers / vram_per_layer)
```

**Esempio:** Modello 70B (320 layer stimati), 24GB VRAM, modello 40GB:
```
vram_per_layer = 40960 / 320 = 128 MB
vram_disponibile = 24576 × 0.9 - kv_cache ≈ 22000 MB
gpu_layers = 22000 / 128 ≈ 171 layer su GPU
```

---

## Bandwidth PCIe

La bandwidth PCIe influenza la velocità quando si usa offload:

```
bandwidth_per_lane = {
  PCIe 3.0: 0.985 GB/s
  PCIe 4.0: 1.969 GB/s
  PCIe 5.0: 3.938 GB/s
}

bandwidth_effettiva = bandwidth_per_lane × num_lanes × 0.8
```

Il fattore 0.8 tiene conto dell'overhead di encoding.

**Esempi:**
| Config | Bandwidth Teorica | Effettiva |
|--------|------------------|-----------|
| PCIe 3.0 x16 | 15.76 GB/s | ~12.6 GB/s |
| PCIe 4.0 x16 | 31.50 GB/s | ~25.2 GB/s |
| PCIe 5.0 x16 | 63.00 GB/s | ~50.4 GB/s |
| PCIe 4.0 x8 | 15.75 GB/s | ~12.6 GB/s |

---

## Bandwidth RAM

La bandwidth della RAM sistema influenza CPU inference e offload:

```
bandwidth_ram = (speed_mhz × 8 bytes × canali × 2) / 1000 / 1000 GB/s
```

Il `× 2` è per DDR (Double Data Rate).

**Esempi:**
| Config | Bandwidth |
|--------|-----------|
| DDR4-3200 Dual Channel | ~51 GB/s |
| DDR5-5600 Dual Channel | ~90 GB/s |
| DDR5-6400 Quad Channel | ~205 GB/s |

---

## Velocità Inferenza CPU

Per la modalità `cpu_only`, la velocità è limitata dalla RAM bandwidth:

```
base_tok_s = ram_bandwidth / model_size_gb

// Moltiplicatori
thread_mult = min(1 + log2(threads/4) × 0.3, 2.0)
clock_mult = boost_clock / 3.5

simd_mult = {
  AMX: 3.0      // Intel AMX per operazioni matrice
  AVX-512: 2.0  // Double width vs AVX2
  AVX2: 1.5     // Standard SIMD
  none: 1.0
}

cache_mult = min(1 + (l3_cache_mb - 16) / 64, 1.5)

tok_s = base × thread_mult × clock_mult × simd_mult × cache_mult
tok_s = clamp(tok_s, 1, 30)  // Cap realistico per CPU
```

**Esempio:** i9-14900K con DDR5-5600, modello 7B Q4:
```
ram_bw = 90 GB/s
model_size = 3.5 GB
base = 90 / 3.5 = 25.7 tok/s

thread_mult = min(1 + log2(32/4) × 0.3, 2.0) = 1.9
clock_mult = 5.8 / 3.5 = 1.66
simd_mult = 1.5 (AVX2, no AVX-512 su E-cores)
cache_mult = min(1 + (36-16)/64, 1.5) = 1.31

risultato = 25.7 × 1.9 × 1.66 × 1.5 × 1.31 = ~160 → cap a 30 tok/s
```

---

## Velocità Decode (Token/s)

La generazione di token è **memory-bandwidth bound**. Formula base:

```
tok_s = bandwidth_gpu / model_size_gb
```

Dove `bandwidth_gpu` è la bandwidth della memoria GPU (es. 504 GB/s per RTX 4070 Ti).

**Esempio:** RTX 4090 (1008 GB/s), modello 70B Q4 (35GB):
```
tok_s = 1008 / 35 ≈ 29 tok/s
```

### Con GPU Offload

Quando parte del modello è in RAM:

```
gpu_ratio = gpu_layers / total_layers
cpu_layer_bw = min(pcie_bandwidth, ram_bandwidth)

effective_bw = gpu_ratio × gpu_bw + (1 - gpu_ratio) × cpu_layer_bw
tok_s = effective_bw / model_size
```

**Esempio:** 50% layer su GPU (504 GB/s), 50% su CPU via PCIe 4.0 x16 (25 GB/s):
```
effective_bw = 0.5 × 504 + 0.5 × 25 = 264.5 GB/s
tok_s con 35GB model = 264.5 / 35 ≈ 7.5 tok/s
```

---

## Velocità Prefill

Il prefill (elaborazione prompt) è **compute-bound**:

```
flops_per_token = params_B × 2 × 10^9
tflops_disponibili = fp16_tflops × 10^12

utilization = tensor_cores ? 0.6 : 0.3

prefill_tok_s = (tflops_disponibili × utilization) / flops_per_token
```

**Esempio:** RTX 4090 (82.6 FP16 TFLOPS), modello 70B:
```
flops_per_token = 70 × 2 × 10^9 = 140 GFLOPS
prefill = (82.6 × 10^12 × 0.6) / (140 × 10^9) = 354 tok/s
```

---

## Time to First Token

Latenza prima del primo token generato:

```
ttft_ms = (prompt_tokens / prefill_tok_s) × 1000
```

Default: 100 token di prompt.

**Esempio:** 354 prefill tok/s, prompt 100 token:
```
ttft = (100 / 354) × 1000 ≈ 283 ms
```

---

## Tempo di Caricamento

Tempo per caricare il modello in memoria:

```
load_time_s = model_size_gb / storage_speed_gbps
```

**Valori tipici storage_speed:**
| Tipo | Velocità |
|------|----------|
| NVMe Gen4 | 7.0 GB/s |
| NVMe Gen3 | 3.5 GB/s |
| SATA SSD | 0.5 GB/s |
| HDD | 0.15 GB/s |

**Esempio:** Modello 35GB su NVMe Gen4:
```
load_time = 35 / 7 = 5 secondi
```

---

## Multi-GPU e NVLink

### VRAM Effettiva

```
// Con NVLink: scaling quasi lineare
effective_vram = vram × gpu_count × 0.95

// Senza NVLink: overhead di comunicazione
effective_vram = vram × gpu_count × 0.85
```

### Bandwidth Effettiva

```
// Con NVLink: scaling eccellente
effective_bw = bandwidth × gpu_count × 0.9

// Senza NVLink: il primo GPU è full speed, gli altri limitati
effective_bw = bandwidth × (1 + (gpu_count - 1) × 0.3)
```

**Esempio:** 2x RTX 4090 (1008 GB/s ciascuna):
```
Con NVLink: 1008 × 2 × 0.9 = 1814 GB/s
Senza NVLink: 1008 × (1 + 0.3) = 1310 GB/s
```

### Prefill Multi-GPU

```
effective_tflops = fp16_tflops × gpu_count × (nvlink ? 0.9 : 0.7)
```

---

## Score Finale

Il punteggio finale combina più fattori:

### 1. Speed Score (0-100)

Scala logaritmica da tok/s:

```
if (tok_s >= 60) → 100
if (tok_s <= 1) → 5

score = 5 + 95 × (log(tok_s) - log(1)) / (log(60) - log(1))
```

| tok/s | Score |
|-------|-------|
| 60+ | 100 |
| 30 | ~88 |
| 15 | ~76 |
| 7 | ~63 |
| 3 | ~48 |
| 1 | 5 |

### 2. Benchmark Score

Media pesata dei benchmark rilevanti per use case:

| Use Case | Benchmark Principali |
|----------|---------------------|
| Chat | IFEval, AlpacaEval |
| Coding | HumanEval, MBPP, BigCodeBench |
| Reasoning | MATH, GPQA, MUSR, BBH |
| Creative | AlpacaEval, IFEval |
| Vision | MMMU, MMBench |

### 3. Quality Score

Basato sulla quantizzazione:

| Quant | Quality |
|-------|---------|
| FP16/BF16 | 100 |
| Q8 | 95 |
| Q6 | 90 |
| Q5 | 85 |
| Q4 | 75 |
| Q3 | 60 |
| Q2 | 40 |

### 4. Pesi per Use Case

```typescript
{
  chat:      { benchmark: 0.50, quality: 0.25, speed: 0.25 },
  coding:    { benchmark: 0.60, quality: 0.25, speed: 0.15 },
  reasoning: { benchmark: 0.70, quality: 0.20, speed: 0.10 },
  creative:  { benchmark: 0.40, quality: 0.35, speed: 0.25 },
  vision:    { benchmark: 0.55, quality: 0.25, speed: 0.20 }
}
```

### Formula Finale

```
score = benchmark_score × w_bench
      + quality_score × w_quality
      + speed_score × w_speed
```

---

## Limitazioni e Approssimazioni

1. **KV Cache**: La formula è semplificata. La reale dimensione dipende dall'architettura (GQA, MQA, etc.)

2. **Layer uniformi**: Assumiamo che tutti i layer abbiano la stessa dimensione, ma in realtà possono variare

3. **Overhead sistema**: Il 10% di headroom VRAM è una stima conservativa

4. **CPU inference**: Le stime sono ottimistiche per CPU moderne con buone istruzioni SIMD

5. **Multi-GPU senza NVLink**: La comunicazione PCIe può variare molto in base al workload

6. **Prefill**: L'utilization reale dipende molto dall'implementazione (llama.cpp, vLLM, etc.)

---

## Riferimenti

- [llama.cpp Memory Estimation](https://github.com/ggerganov/llama.cpp/discussions/4167)
- [NVIDIA GPU Memory Bandwidth](https://www.nvidia.com/en-us/geforce/graphics-cards/)
- [DDR5 Memory Specifications](https://www.jedec.org/standards-documents/docs/jesd79-5b)
- [PCIe Specifications](https://pcisig.com/specifications)
