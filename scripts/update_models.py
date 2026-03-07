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
        "gemma": 8192,
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
# MAIN
# ============================================================

def main():
    print("=" * 60)
    print("LocalLLM Advisor - Full Data Updater")
    print("=" * 60)
    print()
    print("Fonti:")
    print("  1. Ollama Registry → modelli e quantizzazioni")
    print("  2. Open LLM Leaderboard → IFEval, BBH, MATH, GPQA, MUSR, MMLU-PRO")
    print("  3. EvalPlus → HumanEval, MBPP")
    print("  4. BigCodeBench → BigCodeBench")
    print()

    # Carica modelli esistenti per preservare date
    models_path = DATA_DIR / "models.json"
    existing_models = []
    if models_path.exists():
        with open(models_path) as f:
            existing_models = json.load(f)
        print(f"Loaded {len(existing_models)} existing models")
    existing_map = {m["id"]: m for m in existing_models}

    # Scrape modelli Ollama
    ollama_models = scrape_ollama_models()

    all_models = []

    for ollama_name in ollama_models:
        if ollama_name not in OLLAMA_MODELS:
            continue

        config = OLLAMA_MODELS[ollama_name]
        print(f"\nProcessing {ollama_name}...")

        # Scrape tag disponibili
        tags = scrape_ollama_tags(ollama_name)
        if not tags:
            print(f"  [!] No tags found for {ollama_name}")
            continue

        # Raggruppa per parametri
        by_params: dict[float, list[dict]] = {}
        for tag in tags:
            parsed = parse_ollama_tag(tag)
            if parsed and parsed["is_instruct"]:  # Solo instruct/chat
                params = parsed["params_b"]
                if params not in by_params:
                    by_params[params] = []
                by_params[params].append(parsed)

        # Per ogni size, genera entry
        for params_b, tag_list in sorted(by_params.items()):
            # Deduplica quantizzazioni
            quants_seen = set()
            quantizations = []

            for t in tag_list:
                q = t["quant"]
                if q in quants_seen:
                    continue
                quants_seen.add(q)

                bpw = QUANT_BPW.get(q, 4.5)
                quality = QUANT_QUALITY.get(q, 0.9)

                quantizations.append({
                    "level": q.upper(),
                    "bpw": bpw,
                    "vram_mb": estimate_vram_mb(params_b, bpw),
                    "quality": quality,
                    "ollama_tag": f"{ollama_name}:{t['original_tag']}",
                })

            # Ordina per quality (migliore prima)
            quantizations.sort(key=lambda x: x["quality"], reverse=True)

            # Limita a 3-4 quantizzazioni più utili
            useful_quants = ["Q4_K_M", "Q6_K", "Q8_0", "Q2_K", "FP16"]
            quantizations = [q for q in quantizations if q["level"] in useful_quants][:4]

            if not quantizations:
                # Fallback: prendi le prime 3
                quantizations = sorted(tag_list, key=lambda x: QUANT_QUALITY.get(x["quant"], 0))[:3]
                quantizations = [{
                    "level": t["quant"].upper(),
                    "bpw": QUANT_BPW.get(t["quant"], 4.5),
                    "vram_mb": estimate_vram_mb(params_b, QUANT_BPW.get(t["quant"], 4.5)),
                    "quality": QUANT_QUALITY.get(t["quant"], 0.9),
                    "ollama_tag": f"{ollama_name}:{t['original_tag']}",
                } for t in quantizations]

            # Fetch benchmark
            benchmarks = find_benchmark(
                ollama_name,
                params_b,
                config.get("hf_patterns", [])
            )

            # Genera entry
            model = generate_model_entry(
                ollama_name,
                params_b,
                quantizations,
                config,
                benchmarks,
            )

            # Preserva release_date da esistenti
            if model["id"] in existing_map:
                model["release_date"] = existing_map[model["id"]].get("release_date")

            if not model["release_date"]:
                from datetime import date
                model["release_date"] = date.today().isoformat()

            all_models.append(model)
            print(f"  + {model['name']} ({len(quantizations)} quants)")

        time.sleep(0.3)  # Rate limiting

    # Ordina per famiglia e parametri
    all_models.sort(key=lambda m: (m["family"], m["params_b"]))

    # Scrivi
    with open(models_path, "w") as f:
        json.dump(all_models, f, indent=2)

    print()
    print("=" * 60)
    print(f"Written {len(all_models)} models to {models_path}")
    print()
    print("Summary by family:")
    families = sorted(set(m["family"] for m in all_models))
    for fam in families:
        count = sum(1 for m in all_models if m["family"] == fam)
        print(f"  {fam}: {count} models")


if __name__ == "__main__":
    main()
