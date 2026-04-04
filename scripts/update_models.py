#!/usr/bin/env python3
"""
Script per aggiornare models.json con dati da Ollama + benchmark leaderboards

Usage: python scripts/update_models.py

Fonti dati:
1. Ollama Registry (https://ollama.com/library) → modelli + tag disponibili
2. Open LLM Leaderboard (HuggingFace) → benchmark generali (IFEval, BBH, MATH, GPQA, MUSR, MMLU-PRO)
3. EvalPlus Leaderboard → coding benchmark (HumanEval, MBPP)
4. BigCodeBench Leaderboard → coding benchmark avanzati
5. Calcolo interno → VRAM stimata

Requisiti:
  pip install requests pandas pyarrow datasets
"""

import json
import re
import time
from pathlib import Path
from typing import Any
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError

# Prova a importare pandas per il leaderboard
try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False
    print("WARN: pandas non installato, benchmark non disponibili")
    print("      Installa con: pip install pandas pyarrow")

DATA_DIR = Path(__file__).parent.parent / "public" / "data"

# ============================================================
# CONFIGURAZIONE MODELLI
# ============================================================
# Mappa: ollama_model -> hf_model_id (per matching benchmark)
# Aggiungi qui i modelli che vuoi tracciare

OLLAMA_MODELS = {
    # Llama
    "llama3.1": {
        "hf_patterns": ["meta-llama/Llama-3.1", "Meta-Llama-3.1"],
        "family": "llama",
        "capabilities": ["chat", "coding", "reasoning"],
    },
    "llama3.2": {
        "hf_patterns": ["meta-llama/Llama-3.2", "Meta-Llama-3.2"],
        "family": "llama",
        "capabilities": ["chat", "coding"],
    },
    "llama3.3": {
        "hf_patterns": ["meta-llama/Llama-3.3", "Meta-Llama-3.3"],
        "family": "llama",
        "capabilities": ["chat", "coding", "reasoning"],
    },

    # Qwen
    "qwen2.5": {
        "hf_patterns": ["Qwen/Qwen2.5-", "Qwen2.5-"],
        "family": "qwen",
        "capabilities": ["chat", "coding", "reasoning"],
    },
    "qwen2.5-coder": {
        "hf_patterns": ["Qwen/Qwen2.5-Coder", "Qwen2.5-Coder"],
        "family": "qwen",
        "capabilities": ["chat", "coding"],
    },

    # DeepSeek
    "deepseek-r1": {
        "hf_patterns": ["deepseek-ai/DeepSeek-R1", "DeepSeek-R1"],
        "family": "deepseek",
        "capabilities": ["chat", "reasoning"],
    },
    "deepseek-v3": {
        "hf_patterns": ["deepseek-ai/DeepSeek-V3", "DeepSeek-V3"],
        "family": "deepseek",
        "capabilities": ["chat", "coding", "reasoning"],
        "architecture": "moe",
    },

    # Mistral
    "mistral": {
        "hf_patterns": ["mistralai/Mistral-7B", "Mistral-7B"],
        "family": "mistral",
        "capabilities": ["chat", "coding"],
    },
    "mistral-nemo": {
        "hf_patterns": ["mistralai/Mistral-Nemo", "Mistral-Nemo"],
        "family": "mistral",
        "capabilities": ["chat", "coding"],
    },
    "mistral-small": {
        "hf_patterns": ["mistralai/Mistral-Small", "Mistral-Small"],
        "family": "mistral",
        "capabilities": ["chat", "coding", "reasoning"],
    },

    # Phi
    "phi3": {
        "hf_patterns": ["microsoft/Phi-3", "Phi-3"],
        "family": "phi",
        "capabilities": ["chat", "coding", "reasoning"],
    },
    "phi4": {
        "hf_patterns": ["microsoft/phi-4", "phi-4"],
        "family": "phi",
        "capabilities": ["chat", "coding", "reasoning"],
    },

    # Gemma
    "gemma2": {
        "hf_patterns": ["google/gemma-2", "gemma-2"],
        "family": "gemma",
        "capabilities": ["chat", "reasoning"],
    },
    "gemma3": {
        "hf_patterns": ["google/gemma-3", "gemma-3"],
        "family": "gemma",
        "capabilities": ["chat", "reasoning"],
    },
    "gemma4": {
        "hf_patterns": ["google/gemma-4", "gemma-4"],
        "family": "gemma",
        "capabilities": ["chat", "reasoning"],
    },

    # Vision
    "llava": {
        "hf_patterns": ["llava-hf/llava", "llava"],
        "family": "llava",
        "capabilities": ["chat", "vision"],
    },
}

# BPW (bits per weight) per quantizzazione
QUANT_BPW = {
    "fp16": 16.0,
    "q8_0": 8.0,
    "q6_k": 6.5,
    "q5_k_m": 5.5,
    "q5_k_s": 5.5,
    "q5_1": 5.5,
    "q5_0": 5.0,
    "q4_k_m": 4.5,
    "q4_k_s": 4.5,
    "q4_1": 4.5,
    "q4_0": 4.0,
    "q3_k_l": 3.5,
    "q3_k_m": 3.4,
    "q3_k_s": 3.0,
    "q2_k": 2.5,
}

QUANT_QUALITY = {
    "fp16": 1.0,
    "q8_0": 0.995,
    "q6_k": 0.97,
    "q5_k_m": 0.96,
    "q5_k_s": 0.95,
    "q5_1": 0.95,
    "q5_0": 0.94,
    "q4_k_m": 0.94,
    "q4_k_s": 0.93,
    "q4_1": 0.92,
    "q4_0": 0.90,
    "q3_k_l": 0.88,
    "q3_k_m": 0.86,
    "q3_k_s": 0.84,
    "q2_k": 0.82,
}

# ============================================================
# SCRAPING OLLAMA
# ============================================================

def fetch_url(url: str, timeout: int = 15) -> str | None:
    """Fetch URL content."""
    try:
        req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=timeout) as resp:
            return resp.read().decode("utf-8")
    except (HTTPError, URLError, TimeoutError) as e:
        print(f"  [!] Error fetching {url}: {e}")
        return None


def scrape_ollama_models() -> list[str]:
    """Scrape lista modelli da Ollama library."""
    print("Fetching Ollama model list...")

    html = fetch_url("https://ollama.com/library")
    if not html:
        return list(OLLAMA_MODELS.keys())

    # Estrai href="/library/{model}"
    matches = re.findall(r'href="/library/([a-z0-9._-]+)"', html, re.I)
    models = sorted(set(matches))

    # Filtra solo quelli che ci interessano
    tracked = [m for m in models if m in OLLAMA_MODELS]
    print(f"  Found {len(models)} models, tracking {len(tracked)}")

    return tracked if tracked else list(OLLAMA_MODELS.keys())


def scrape_ollama_tags(model_name: str) -> list[dict]:
    """Scrape tag disponibili per un modello Ollama."""
    url = f"https://ollama.com/library/{model_name}/tags"
    html = fetch_url(url)

    if not html:
        return []

    # Pattern: /library/model:tag
    pattern = rf'href="/library/{re.escape(model_name)}:([^"]+)"'
    tags = list(set(re.findall(pattern, html, re.I)))

    return tags


def parse_ollama_tag(tag: str) -> dict | None:
    """
    Parse un tag Ollama e estrai parametri e quantizzazione.

    Esempi:
      "8b" -> params=8, quant="q4_k_m" (default)
      "8b-q8_0" -> params=8, quant="q8_0"
      "70b-instruct-q4_k_m" -> params=70, quant="q4_k_m"
    """
    tag_lower = tag.lower()

    # Estrai parametri (es. 8b, 70b, 3.8b)
    param_match = re.search(r"(\d+\.?\d*)b", tag_lower)
    if not param_match:
        return None

    params_b = float(param_match.group(1))

    # Estrai quantizzazione
    quant = "q4_k_m"  # default
    for q in QUANT_BPW.keys():
        if q in tag_lower:
            quant = q
            break

    # Instruct o text?
    is_instruct = "instruct" in tag_lower or "chat" in tag_lower

    return {
        "params_b": params_b,
        "quant": quant,
        "is_instruct": is_instruct,
        "original_tag": tag,
    }


# ============================================================
# BENCHMARK DAL LEADERBOARD
# ============================================================

_leaderboard_df = None

def load_leaderboard() -> pd.DataFrame | None:
    """Carica il dataset Open LLM Leaderboard."""
    global _leaderboard_df

    if _leaderboard_df is not None:
        return _leaderboard_df

    if not HAS_PANDAS:
        return None

    print("Loading Open LLM Leaderboard dataset...")

    try:
        # Prova prima con datasets library
        try:
            from datasets import load_dataset
            ds = load_dataset("open-llm-leaderboard/contents", split="train")
            _leaderboard_df = ds.to_pandas()
            print(f"  Loaded {len(_leaderboard_df)} entries via datasets")
            return _leaderboard_df
        except ImportError:
            pass

        # Fallback: scarica direttamente il parquet
        url = "https://huggingface.co/datasets/open-llm-leaderboard/contents/resolve/main/data/train-00000-of-00001.parquet"
        _leaderboard_df = pd.read_parquet(url)
        print(f"  Loaded {len(_leaderboard_df)} entries via parquet")
        return _leaderboard_df
    except Exception as e:
        print(f"  [!] Error loading leaderboard: {e}")
        return None


def find_benchmark(model_name: str, params_b: float, hf_patterns: list[str]) -> dict:
    """Cerca benchmark per un modello da tutte le fonti disponibili."""
    benchmarks = {
        "humaneval": None,
        "mmlu_pro": None,
        "math": None,
        "ifeval": None,
        "bbh": None,
        "mmmu": None,
        "gpqa": None,
        "musr": None,
        "mbpp": None,
        "bigcodebench": None,
        "alpacaeval": None,
        "mmbench": None,
    }

    # 1. Open LLM Leaderboard (IFEval, BBH, MATH, GPQA, MUSR, MMLU-PRO)
    df = load_leaderboard()
    if df is not None:
        for pattern in hf_patterns:
            mask = df["fullname"].str.contains(pattern, case=False, na=False)

            if params_b > 0:
                param_col = "#Params (B)"
                if param_col in df.columns:
                    param_mask = (df[param_col] >= params_b * 0.8) & (df[param_col] <= params_b * 1.2)
                    mask = mask & param_mask

            matches = df[mask]

            if len(matches) > 0:
                best = matches.loc[matches["Average ⬆️"].idxmax()]
                benchmarks["ifeval"] = _safe_float(best.get("IFEval"))
                benchmarks["bbh"] = _safe_float(best.get("BBH"))
                benchmarks["math"] = _safe_float(best.get("MATH Lvl 5"))
                benchmarks["gpqa"] = _safe_float(best.get("GPQA"))
                benchmarks["musr"] = _safe_float(best.get("MUSR"))
                benchmarks["mmlu_pro"] = _safe_float(best.get("MMLU-PRO"))
                break

    # 2. EvalPlus (HumanEval, MBPP)
    evalplus = find_evalplus_benchmark(model_name, params_b, hf_patterns)
    benchmarks["humaneval"] = evalplus.get("humaneval")
    benchmarks["mbpp"] = evalplus.get("mbpp")

    # 3. BigCodeBench
    benchmarks["bigcodebench"] = find_bigcodebench(model_name, params_b, hf_patterns)

    return benchmarks


def _safe_float(val) -> float | None:
    """Converte in float o None."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    try:
        return round(float(val), 1)
    except (ValueError, TypeError):
        return None


# ============================================================
# EVALPLUS LEADERBOARD (HumanEval, MBPP)
# ============================================================
# NOTE: EvalPlus non pubblica i risultati come dataset HuggingFace.
# I benchmark HumanEval/MBPP devono essere aggiunti manualmente
# o da altre fonti. Per ora restituisce sempre None.

_evalplus_attempted = False

def find_evalplus_benchmark(model_name: str, params_b: float, hf_patterns: list[str]) -> dict:
    """
    Cerca benchmark HumanEval e MBPP.
    TODO: Trovare fonte dati per EvalPlus results.
    """
    global _evalplus_attempted

    # Log solo una volta
    if not _evalplus_attempted:
        _evalplus_attempted = True
        print("  [i] EvalPlus: HumanEval/MBPP data not available (no public dataset)")

    return {"humaneval": None, "mbpp": None}


# ============================================================
# BIGCODEBENCH LEADERBOARD
# ============================================================

_bigcodebench_df = None

def load_bigcodebench() -> pd.DataFrame | None:
    """Carica il dataset BigCodeBench."""
    global _bigcodebench_df

    if _bigcodebench_df is not None:
        return _bigcodebench_df

    if not HAS_PANDAS:
        return None

    print("Loading BigCodeBench leaderboard...")

    try:
        from datasets import load_dataset
        ds = load_dataset("bigcode/bigcodebench-results", split="train")
        _bigcodebench_df = ds.to_pandas()
        print(f"  Loaded {len(_bigcodebench_df)} entries from BigCodeBench")
        # Debug: print sample
        # print(f"  Columns: {_bigcodebench_df.columns.tolist()}")
        return _bigcodebench_df
    except Exception as e:
        print(f"  [!] BigCodeBench not available: {e}")
        return None


def find_bigcodebench(model_name: str, params_b: float, hf_patterns: list[str]) -> float | None:
    """
    Cerca benchmark BigCodeBench.

    Il dataset ha colonne:
    - model: nome modello (es. "Qwen2.5-Coder-32B-Instruct")
    - size: parametri in B
    - complete: pass rate "complete" mode
    - instruct: pass rate "instruct" mode
    """
    df = load_bigcodebench()
    if df is None:
        return None

    for pattern in hf_patterns:
        # Match sul nome modello
        mask = df["model"].str.contains(pattern, case=False, na=False)

        # Filtra per size simile se specificato
        if params_b > 0 and "size" in df.columns:
            size_mask = (df["size"] >= params_b * 0.8) & (df["size"] <= params_b * 1.2)
            mask = mask & size_mask

        matches = df[mask]

        if len(matches) > 0:
            # Usa "instruct" score (più rilevante per chat models)
            # oppure "complete" come fallback
            best = matches.iloc[0]
            score = best.get("instruct") or best.get("complete")
            if score is not None:
                return _safe_float(score)

    return None


# ============================================================
# GENERAZIONE MODELLI
# ============================================================

def estimate_vram_mb(params_b: float, bpw: float, overhead: int = 500) -> int:
    """Calcola VRAM stimata in MB."""
    return round(params_b * bpw / 8 * 1024) + overhead


def generate_model_entry(
    ollama_name: str,
    params_b: float,
    quantizations: list[dict],
    config: dict,
    benchmarks: dict,
) -> dict:
    """Genera entry per models.json."""

    # ID univoco
    model_id = f"{ollama_name}-{int(params_b)}b"
    if params_b != int(params_b):
        model_id = f"{ollama_name}-{params_b}b"

    # Nome leggibile
    family_names = {
        "llama": "Llama",
        "qwen": "Qwen",
        "deepseek": "DeepSeek",
        "mistral": "Mistral",
        "phi": "Phi",
        "gemma": "Gemma",
        "llava": "LLaVA",
    }

    family = config.get("family", ollama_name)
    base_name = family_names.get(family, family.title())

    # Estrai versione dal nome ollama (es. llama3.1 -> 3.1)
    version_match = re.search(r"(\d+\.?\d*)", ollama_name)
    version = version_match.group(1) if version_match else ""

    if "coder" in ollama_name:
        name = f"{base_name} {version} Coder {params_b}B"
    elif "r1" in ollama_name:
        name = f"{base_name} R1 {params_b}B"
    elif "v3" in ollama_name:
        name = f"{base_name} V3"
    elif "nemo" in ollama_name:
        name = f"{base_name} Nemo {params_b}B"
    elif "small" in ollama_name:
        name = f"{base_name} Small {params_b}B"
    elif version:
        name = f"{base_name} {version} {params_b}B"
    else:
        name = f"{base_name} {params_b}B"

    # Context length (stima basata su famiglia)
    context_lengths = {
        "llama": 131072,
        "qwen": 32768,
        "deepseek": 32768,
        "mistral": 32768,
        "phi": 16384,
        "gemma": 131072,  # Gemma 3/4 = 128K; Gemma 2 = 8K (over-reporting is safer)
        "llava": 4096,
    }

    return {
        "id": model_id,
        "name": name.strip(),
        "family": family,
        "params_b": params_b,
        "architecture": config.get("architecture", "dense"),
        "capabilities": config.get("capabilities", ["chat"]),
        "context_length": context_lengths.get(family, 8192),
        "release_date": None,  # Da popolare manualmente
        "ollama_base": f"{ollama_name}:{int(params_b)}b" if params_b == int(params_b) else f"{ollama_name}:{params_b}b",
        "quantizations": quantizations,
        "benchmarks": benchmarks,
    }


# ============================================================
# BENCHMARK MATCHING
# ============================================================

# Pattern HF per ogni famiglia di modelli
HF_PATTERNS_BY_FAMILY = {
    "llama": ["meta-llama/Llama", "Meta-Llama"],
    "qwen": ["Qwen/Qwen", "Qwen2", "Qwen3"],
    "mistral": ["mistralai/Mistral", "Mistral-"],
    "phi": ["microsoft/Phi", "microsoft/phi"],
    "gemma": ["google/gemma-4", "google/gemma-3", "google/gemma-2", "google/gemma", "gemma-4", "gemma-3", "gemma-2", "gemma-"],
    "deepseek": ["deepseek-ai/DeepSeek", "DeepSeek-"],
    "falcon": ["tiiuae/falcon", "tiiuae/Falcon"],
    "yi": ["01-ai/Yi"],
    "vicuna": ["lmsys/vicuna"],
    "starcoder": ["bigcode/starcoder"],
    "codellama": ["meta-llama/CodeLlama"],
    "command": ["CohereForAI/c4ai-command"],
    "olmo": ["allenai/OLMo"],
    "glm": ["THUDM/glm", "zai-org/GLM"],
    "grok": ["xai-org/grok"],
    "bloom": ["bigscience/bloom"],
    "stablelm": ["stabilityai/stablelm"],
    "zephyr": ["HuggingFaceH4/zephyr"],
    "hermes": ["NousResearch/Nous-Hermes"],
    "wizard": ["WizardLMTeam/Wizard"],
    "openchat": ["openchat/openchat"],
    "solar": ["upstage/SOLAR"],
    "orca": ["microsoft/Orca"],
    "granite": ["ibm-granite/granite"],
    "nemotron": ["nvidia/NVIDIA-Nemotron"],
    "exaone": ["LGAI-EXAONE/EXAONE"],
    "kimi": ["moonshotai/Kimi"],
    "minimax": ["MiniMaxAI/MiniMax"],
    "mimo": ["XiaomiMiMo/MiMo"],
    "ernie": ["baidu/ERNIE"],
    "embedding": ["nomic-ai/nomic-embed", "BAAI/bge"],
}


def get_hf_patterns(family: str, name: str) -> list[str]:
    """Ottieni pattern HF per un modello."""
    patterns = HF_PATTERNS_BY_FAMILY.get(family, [])

    # Aggiungi pattern basati sul nome
    if "coder" in name.lower():
        patterns = patterns + ["Coder"]
    if "r1" in name.lower():
        patterns = patterns + ["R1"]
    if "v3" in name.lower():
        patterns = patterns + ["V3"]

    return patterns if patterns else [name]


# ============================================================
# MAIN
# ============================================================

def main():
    print("=" * 60)
    print("LocalLLM Advisor - Benchmark Updater")
    print("=" * 60)
    print()
    print("Fonti benchmark:")
    print("  1. Open LLM Leaderboard → IFEval, BBH, MATH, GPQA, MUSR, MMLU-PRO")
    print("  2. BigCodeBench → BigCodeBench")
    print()

    # Carica modelli esistenti
    models_path = DATA_DIR / "models.json"
    if not models_path.exists():
        print(f"ERROR: {models_path} not found!")
        print("Run scrape_hf_models.py and merge_models.py first.")
        return

    with open(models_path) as f:
        models = json.load(f)
    print(f"Loaded {len(models)} models")

    # Aggiorna benchmark per ogni modello
    updated = 0
    for i, model in enumerate(models, 1):
        family = model.get("family", "")
        name = model.get("name", "")
        params_b = model.get("params_b", 0)

        # Salta modelli embedding
        if family == "embedding" or "embed" in name.lower():
            continue

        # Ottieni pattern HF
        hf_patterns = get_hf_patterns(family, name)

        # Cerca benchmark
        benchmarks = find_benchmark(name, params_b, hf_patterns)

        # Aggiorna solo se troviamo benchmark
        has_benchmarks = any(v is not None for v in benchmarks.values())
        if has_benchmarks:
            old_benchmarks = model.get("benchmarks", {})
            # Merge: preserva vecchi benchmark, aggiungi nuovi
            for k, v in benchmarks.items():
                if v is not None:
                    old_benchmarks[k] = v
            model["benchmarks"] = old_benchmarks
            updated += 1
            print(f"  [{i}/{len(models)}] ✓ {name}: updated benchmarks")
        else:
            if i <= 20 or i % 10 == 0:  # Log primi 20 e ogni 10
                print(f"  [{i}/{len(models)}] - {name}: no benchmarks found")

    # Scrivi
    with open(models_path, "w") as f:
        json.dump(models, f, indent=2)

    print()
    print("=" * 60)
    print(f"Updated benchmarks for {updated}/{len(models)} models")
    print(f"Written to {models_path}")


if __name__ == "__main__":
    main()
