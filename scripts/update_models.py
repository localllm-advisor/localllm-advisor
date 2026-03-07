#!/usr/bin/env python3
"""
Script per aggiornare models.json con dati da Hugging Face

Usage: python scripts/update_models.py

Fonti dati:
- Modelli: lista curata di modelli popolari su Ollama
- Benchmark: Open LLM Leaderboard (HuggingFace API)
- VRAM: calcolata da parametri + quantizzazione
"""

import json
import time
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).parent.parent / "public" / "data"

# Configurazione modelli da tracciare (curata per Ollama)
MODEL_CONFIGS = [
    # Llama 3.x
    {"id": "llama3.1-8b", "hf_id": "meta-llama/Llama-3.1-8B-Instruct", "family": "llama", "params_b": 8, "ollama_base": "llama3.1:8b", "capabilities": ["chat", "coding", "reasoning"], "context_length": 131072},
    {"id": "llama3.1-70b", "hf_id": "meta-llama/Llama-3.1-70B-Instruct", "family": "llama", "params_b": 70, "ollama_base": "llama3.1:70b", "capabilities": ["chat", "coding", "reasoning"], "context_length": 131072},
    {"id": "llama3.2-3b", "hf_id": "meta-llama/Llama-3.2-3B-Instruct", "family": "llama", "params_b": 3, "ollama_base": "llama3.2:3b", "capabilities": ["chat", "coding"], "context_length": 131072},
    {"id": "llama3.3-70b", "hf_id": "meta-llama/Llama-3.3-70B-Instruct", "family": "llama", "params_b": 70, "ollama_base": "llama3.3:70b", "capabilities": ["chat", "coding", "reasoning"], "context_length": 131072},

    # Qwen 2.5
    {"id": "qwen2.5-7b", "hf_id": "Qwen/Qwen2.5-7B-Instruct", "family": "qwen", "params_b": 7, "ollama_base": "qwen2.5:7b", "capabilities": ["chat", "coding", "reasoning"], "context_length": 32768},
    {"id": "qwen2.5-14b", "hf_id": "Qwen/Qwen2.5-14B-Instruct", "family": "qwen", "params_b": 14, "ollama_base": "qwen2.5:14b", "capabilities": ["chat", "coding", "reasoning"], "context_length": 32768},
    {"id": "qwen2.5-32b", "hf_id": "Qwen/Qwen2.5-32B-Instruct", "family": "qwen", "params_b": 32, "ollama_base": "qwen2.5:32b", "capabilities": ["chat", "coding", "reasoning"], "context_length": 32768},
    {"id": "qwen2.5-72b", "hf_id": "Qwen/Qwen2.5-72B-Instruct", "family": "qwen", "params_b": 72, "ollama_base": "qwen2.5:72b", "capabilities": ["chat", "coding", "reasoning"], "context_length": 32768},

    # Qwen Coder
    {"id": "qwen2.5-coder-7b", "hf_id": "Qwen/Qwen2.5-Coder-7B-Instruct", "family": "qwen", "params_b": 7, "ollama_base": "qwen2.5-coder:7b", "capabilities": ["chat", "coding"], "context_length": 32768},
    {"id": "qwen2.5-coder-14b", "hf_id": "Qwen/Qwen2.5-Coder-14B-Instruct", "family": "qwen", "params_b": 14, "ollama_base": "qwen2.5-coder:14b", "capabilities": ["chat", "coding"], "context_length": 32768},
    {"id": "qwen2.5-coder-32b", "hf_id": "Qwen/Qwen2.5-Coder-32B-Instruct", "family": "qwen", "params_b": 32, "ollama_base": "qwen2.5-coder:32b", "capabilities": ["chat", "coding"], "context_length": 32768},

    # DeepSeek
    {"id": "deepseek-r1-7b", "hf_id": "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B", "family": "deepseek", "params_b": 7, "ollama_base": "deepseek-r1:7b", "capabilities": ["chat", "reasoning"], "context_length": 32768},
    {"id": "deepseek-r1-14b", "hf_id": "deepseek-ai/DeepSeek-R1-Distill-Qwen-14B", "family": "deepseek", "params_b": 14, "ollama_base": "deepseek-r1:14b", "capabilities": ["chat", "reasoning"], "context_length": 32768},
    {"id": "deepseek-r1-32b", "hf_id": "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B", "family": "deepseek", "params_b": 32, "ollama_base": "deepseek-r1:32b", "capabilities": ["chat", "reasoning"], "context_length": 32768},
    {"id": "deepseek-v3", "hf_id": "deepseek-ai/DeepSeek-V3", "family": "deepseek", "params_b": 671, "architecture": "moe", "ollama_base": "deepseek-v3", "capabilities": ["chat", "coding", "reasoning"], "context_length": 65536},

    # Mistral
    {"id": "mistral-7b", "hf_id": "mistralai/Mistral-7B-Instruct-v0.3", "family": "mistral", "params_b": 7, "ollama_base": "mistral:7b", "capabilities": ["chat", "coding"], "context_length": 32768},
    {"id": "mistral-nemo-12b", "hf_id": "mistralai/Mistral-Nemo-Instruct-2407", "family": "mistral", "params_b": 12, "ollama_base": "mistral-nemo:12b", "capabilities": ["chat", "coding"], "context_length": 131072},
    {"id": "mistral-small-24b", "hf_id": "mistralai/Mistral-Small-24B-Instruct-2501", "family": "mistral", "params_b": 24, "ollama_base": "mistral-small:24b", "capabilities": ["chat", "coding", "reasoning"], "context_length": 32768},

    # Phi
    {"id": "phi3-mini-3.8b", "hf_id": "microsoft/Phi-3-mini-4k-instruct", "family": "phi", "params_b": 3.8, "ollama_base": "phi3:mini", "capabilities": ["chat", "coding", "reasoning"], "context_length": 4096},
    {"id": "phi4-14b", "hf_id": "microsoft/phi-4", "family": "phi", "params_b": 14, "ollama_base": "phi4:14b", "capabilities": ["chat", "coding", "reasoning"], "context_length": 16384},

    # Gemma
    {"id": "gemma2-9b", "hf_id": "google/gemma-2-9b-it", "family": "gemma", "params_b": 9, "ollama_base": "gemma2:9b", "capabilities": ["chat", "reasoning"], "context_length": 8192},
    {"id": "gemma2-27b", "hf_id": "google/gemma-2-27b-it", "family": "gemma", "params_b": 27, "ollama_base": "gemma2:27b", "capabilities": ["chat", "reasoning"], "context_length": 8192},

    # Vision models
    {"id": "llava-v1.6-7b", "hf_id": "llava-hf/llava-v1.6-mistral-7b-hf", "family": "llava", "params_b": 7, "ollama_base": "llava:7b", "capabilities": ["chat", "vision"], "context_length": 4096},
    {"id": "llava-v1.6-13b", "hf_id": "llava-hf/llava-v1.6-vicuna-13b-hf", "family": "llava", "params_b": 13, "ollama_base": "llava:13b", "capabilities": ["chat", "vision"], "context_length": 4096},
]

# Quantizzazioni standard con BPW (bits per weight)
QUANT_CONFIGS = {
    "small": [  # <= 10B params
        {"level": "Q4_K_M", "bpw": 4.5, "quality": 0.94},
        {"level": "Q6_K", "bpw": 6.5, "quality": 0.97},
        {"level": "Q8_0", "bpw": 8.0, "quality": 0.995},
    ],
    "medium": [  # 10-40B params
        {"level": "Q4_K_M", "bpw": 4.5, "quality": 0.95},
        {"level": "Q6_K", "bpw": 6.5, "quality": 0.97},
        {"level": "Q8_0", "bpw": 8.0, "quality": 0.995},
    ],
    "large": [  # > 40B params
        {"level": "Q2_K", "bpw": 2.5, "quality": 0.82},
        {"level": "Q4_K_M", "bpw": 4.5, "quality": 0.94},
    ],
    "moe": [  # MoE models
        {"level": "Q4_K_M", "bpw": 4.5, "quality": 0.94},
        {"level": "Q8_0", "bpw": 8.0, "quality": 0.995},
    ],
}

FAMILY_NAMES = {
    "llama": "Llama",
    "qwen": "Qwen",
    "deepseek": "DeepSeek",
    "mistral": "Mistral",
    "phi": "Phi",
    "gemma": "Gemma",
    "llava": "LLaVA",
}


def estimate_vram_mb(params_b: float, bpw: float, overhead: int = 500) -> int:
    """Calcola VRAM stimata in MB."""
    return round(params_b * bpw / 8 * 1024) + overhead


def fetch_benchmarks(hf_model_id: str) -> dict[str, Any]:
    """Fetch benchmark da HuggingFace API."""
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

    try:
        encoded_id = urllib.parse.quote(hf_model_id, safe="")
        url = f"https://huggingface.co/api/models/{encoded_id}"

        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())

        # I benchmark potrebbero essere in cardData.eval_results
        if data.get("cardData", {}).get("eval_results"):
            for result in data["cardData"]["eval_results"]:
                metric = (result.get("metric_name") or "").lower()
                value = result.get("metric_value")

                if "humaneval" in metric:
                    benchmarks["humaneval"] = value
                elif "mmlu" in metric:
                    benchmarks["mmlu_pro"] = value
                elif "math" in metric:
                    benchmarks["math"] = value
                elif "ifeval" in metric:
                    benchmarks["ifeval"] = value
                elif "bbh" in metric:
                    benchmarks["bbh"] = value
                elif "gpqa" in metric:
                    benchmarks["gpqa"] = value
                elif "mbpp" in metric:
                    benchmarks["mbpp"] = value

        return benchmarks

    except urllib.error.HTTPError as e:
        print(f"  [!] HF API {e.code} for {hf_model_id}")
        return benchmarks
    except Exception as e:
        print(f"  [!] Error fetching {hf_model_id}: {e}")
        return benchmarks


def generate_quantizations(config: dict) -> list[dict]:
    """Genera quantizzazioni per un modello."""
    params_b = config["params_b"]
    architecture = config.get("architecture", "dense")
    ollama_base = config["ollama_base"]

    if architecture == "moe":
        quant_configs = QUANT_CONFIGS["moe"]
    elif params_b > 40:
        quant_configs = QUANT_CONFIGS["large"]
    elif params_b > 10:
        quant_configs = QUANT_CONFIGS["medium"]
    else:
        quant_configs = QUANT_CONFIGS["small"]

    quantizations = []
    for q in quant_configs:
        tag = ollama_base if q["level"] == "Q4_K_M" else f"{ollama_base}-{q['level'].lower()}"
        quantizations.append({
            "level": q["level"],
            "bpw": q["bpw"],
            "vram_mb": estimate_vram_mb(params_b, q["bpw"]),
            "quality": q["quality"],
            "ollama_tag": tag,
        })

    return quantizations


def format_model_name(config: dict) -> str:
    """Formatta il nome del modello per la UI."""
    base = FAMILY_NAMES.get(config["family"], config["family"])
    model_id = config["id"]
    params = config["params_b"]

    if "coder" in model_id:
        return f"{base} 2.5 Coder {params}B"
    if "r1" in model_id:
        return f"{base} R1 Distill {params}B"
    if "v3" in model_id:
        return f"{base} V3"
    if "nemo" in model_id:
        return f"{base} Nemo {params}B"
    if "small" in model_id:
        return f"{base} Small {params}B"
    if "mini" in model_id:
        return f"{base}-3 Mini {params}B"

    # Estrai versione dal pattern (es. llama3.1-8b -> 3.1)
    import re
    match = re.search(r"(\d+\.?\d*)-?\d*b", model_id, re.IGNORECASE)
    if match:
        return f"{base} {match.group(1)} {params}B"

    return f"{base} {params}B"


def main():
    print("=" * 60)
    print("LocalLLM Advisor - Model Data Updater")
    print("=" * 60)
    print()

    # Carica modelli esistenti per preservare benchmark manuali
    models_path = DATA_DIR / "models.json"
    existing_models = []

    if models_path.exists():
        with open(models_path) as f:
            existing_models = json.load(f)
        print(f"Loaded {len(existing_models)} existing models")
    else:
        print("No existing models.json found, creating new")

    existing_map = {m["id"]: m for m in existing_models}

    models = []

    for config in MODEL_CONFIGS:
        print(f"Processing {config['id']}...")

        # Usa benchmark esistenti se disponibili
        existing = existing_map.get(config["id"])
        benchmarks = None

        if existing and existing.get("benchmarks"):
            # Verifica se ci sono benchmark non nulli
            if any(v is not None for v in existing["benchmarks"].values()):
                benchmarks = existing["benchmarks"]

        if not benchmarks:
            benchmarks = fetch_benchmarks(config["hf_id"])
            time.sleep(0.2)  # Rate limiting

        model = {
            "id": config["id"],
            "name": format_model_name(config),
            "family": config["family"],
            "params_b": config["params_b"],
            "architecture": config.get("architecture", "dense"),
            "capabilities": config["capabilities"],
            "context_length": config["context_length"],
            "release_date": existing.get("release_date") if existing else None,
            "ollama_base": config["ollama_base"],
            "quantizations": generate_quantizations(config),
            "benchmarks": benchmarks,
        }

        # Default release_date se non presente
        if not model["release_date"]:
            from datetime import date
            model["release_date"] = date.today().isoformat()

        models.append(model)

    # Ordina per famiglia e parametri
    models.sort(key=lambda m: (m["family"], m["params_b"]))

    # Scrivi file
    with open(models_path, "w") as f:
        json.dump(models, f, indent=2)

    print()
    print(f"Written {len(models)} models to {models_path}")
    print()
    print("Summary by family:")
    families = sorted(set(m["family"] for m in models))
    for fam in families:
        count = sum(1 for m in models if m["family"] == fam)
        print(f"  {fam}: {count} models")


if __name__ == "__main__":
    main()
