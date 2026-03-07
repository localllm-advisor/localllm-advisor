#!/usr/bin/env python3
"""
Merge modelli da HuggingFace scrape con modelli esistenti (benchmark preservati).

Usage:
  python scripts/scrape_hf_models.py  # Prima scrape
  python scripts/merge_models.py      # Poi merge

Output: public/data/models.json (formato compatibile con l'app)
"""

import json
import re
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "public" / "data"

# Quantizzazioni standard da generare
QUANTIZATIONS = [
    {"level": "Q4_K_M", "bpw": 4.5, "quality": 0.94},
    {"level": "Q6_K", "bpw": 6.5, "quality": 0.97},
    {"level": "Q8_0", "bpw": 8.0, "quality": 0.995},
    {"level": "FP16", "bpw": 16.0, "quality": 1.0},
]


def estimate_vram_mb(params_b: float, bpw: float, overhead: int = 500) -> int:
    """Calcola VRAM in MB per una quantizzazione."""
    return round(params_b * bpw / 8 * 1024) + overhead


def hf_to_ollama_family(hf_id: str) -> str:
    """Mappa HF repo a famiglia Ollama."""
    rid = hf_id.lower()

    if "llama" in rid:
        return "llama"
    if "qwen" in rid:
        return "qwen"
    if "mistral" in rid or "mixtral" in rid:
        return "mistral"
    if "phi" in rid:
        return "phi"
    if "gemma" in rid:
        return "gemma"
    if "deepseek" in rid:
        return "deepseek"
    if "falcon" in rid:
        return "falcon"
    if "yi-" in rid:
        return "yi"
    if "vicuna" in rid:
        return "vicuna"
    if "starcoder" in rid:
        return "starcoder"
    if "codellama" in rid:
        return "codellama"
    if "granite" in rid:
        return "granite"
    if "olmo" in rid:
        return "olmo"
    if "glm" in rid:
        return "glm"
    if "grok" in rid:
        return "grok"
    if "kimi" in rid:
        return "kimi"
    if "solar" in rid:
        return "solar"
    if "orca" in rid:
        return "orca"
    if "wizard" in rid:
        return "wizard"
    if "zephyr" in rid:
        return "zephyr"
    if "openchat" in rid:
        return "openchat"
    if "hermes" in rid:
        return "hermes"
    if "command" in rid:
        return "command"
    if "bloom" in rid:
        return "bloom"
    if "stablelm" in rid:
        return "stablelm"
    if "tinyllama" in rid:
        return "tinyllama"
    if "smollm" in rid:
        return "smollm"
    if "exaone" in rid:
        return "exaone"
    if "nemotron" in rid:
        return "nemotron"
    if "minimax" in rid:
        return "minimax"
    if "mimo" in rid:
        return "mimo"
    if "ernie" in rid:
        return "ernie"
    if "embed" in rid or "bge" in rid:
        return "embedding"

    return "other"


def generate_model_id(hf_id: str, params_b: float) -> str:
    """Genera ID univoco per il modello."""
    family = hf_to_ollama_family(hf_id)

    # Estrai versione dal nome
    name = hf_id.split("/")[-1].lower()

    # Formatta parametri
    if params_b >= 1:
        param_str = f"{int(params_b)}b" if params_b == int(params_b) else f"{params_b}b"
    else:
        param_str = f"{int(params_b * 1000)}m"

    # ID base
    base_id = f"{family}-{param_str}"

    # Aggiungi suffissi specifici
    if "coder" in name:
        base_id = f"{family}-coder-{param_str}"
    elif "r1" in name:
        base_id = f"{family}-r1-{param_str}"
    elif "v3" in name:
        base_id = f"{family}-v3-{param_str}"
    elif "nemo" in name:
        base_id = f"{family}-nemo-{param_str}"
    elif "small" in name:
        base_id = f"{family}-small-{param_str}"
    elif "vision" in name or "-vl" in name:
        base_id = f"{family}-vision-{param_str}"

    return base_id


def generate_display_name(hf_id: str, params_b: float) -> str:
    """Genera nome leggibile."""
    name = hf_id.split("/")[-1]

    # Rimuovi suffissi comuni
    name = re.sub(r"-Instruct.*", "", name, flags=re.I)
    name = re.sub(r"-Chat.*", "", name, flags=re.I)
    name = re.sub(r"-hf$", "", name, flags=re.I)
    name = re.sub(r"-it$", "", name, flags=re.I)

    # Formatta parametri
    if params_b >= 1:
        param_str = f"{params_b}B" if params_b != int(params_b) else f"{int(params_b)}B"
    else:
        param_str = f"{int(params_b * 1000)}M"

    # Aggiungi parametri se non presenti
    if not re.search(r"\d+[BM]", name, re.I):
        name = f"{name} {param_str}"

    return name


def infer_ollama_tag(hf_id: str, params_b: float) -> str | None:
    """Inferisci tag Ollama dal modello HF."""
    rid = hf_id.lower()

    # Parametri formattati
    if params_b >= 1:
        p = f"{int(params_b)}b" if params_b == int(params_b) else f"{params_b}b"
    else:
        p = f"{int(params_b * 1000)}m"

    # Mappature conosciute
    if "llama-3.1" in rid:
        return f"llama3.1:{p}"
    if "llama-3.2" in rid:
        return f"llama3.2:{p}"
    if "llama-3.3" in rid:
        return f"llama3.3:{p}"
    if "qwen2.5-coder" in rid:
        return f"qwen2.5-coder:{p}"
    if "qwen2.5" in rid:
        return f"qwen2.5:{p}"
    if "qwen3" in rid:
        return f"qwen3:{p}"
    if "mistral-7b" in rid:
        return "mistral:7b"
    if "mixtral-8x7b" in rid:
        return "mixtral:8x7b"
    if "mixtral-8x22b" in rid:
        return "mixtral:8x22b"
    if "mistral-nemo" in rid:
        return f"mistral-nemo:{p}"
    if "mistral-small" in rid:
        return f"mistral-small:{p}"
    if "phi-3" in rid:
        return f"phi3:{p}"
    if "phi-4" in rid:
        return f"phi4:{p}"
    if "gemma-2" in rid or "gemma2" in rid:
        return f"gemma2:{p}"
    if "gemma-3" in rid or "gemma3" in rid:
        return f"gemma3:{p}"
    if "deepseek-r1" in rid:
        return "deepseek-r1"
    if "deepseek-v3" in rid:
        return "deepseek-v3"

    return None


def convert_hf_to_model(hf_model: dict) -> dict:
    """Converti modello HF al formato dell'app."""
    hf_id = hf_model["hf_id"]
    params_b = hf_model["params_b"]
    family = hf_to_ollama_family(hf_id)

    # Genera quantizzazioni
    quantizations = []
    for q in QUANTIZATIONS:
        # Salta quantizzazioni troppo grandi per modelli piccoli
        if params_b < 3 and q["level"] == "FP16":
            continue

        ollama_tag = infer_ollama_tag(hf_id, params_b)
        if ollama_tag:
            tag = f"{ollama_tag.rsplit(':', 1)[0]}:{params_b}b-instruct-{q['level'].lower()}"
        else:
            tag = f"{family}:{int(params_b)}b-{q['level'].lower()}"

        quantizations.append({
            "level": q["level"],
            "bpw": q["bpw"],
            "vram_mb": estimate_vram_mb(params_b, q["bpw"]),
            "quality": q["quality"],
            "ollama_tag": tag,
        })

    # Benchmark vuoti (da riempire con merge)
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

    # Capabilities
    caps = hf_model.get("capabilities", ["chat"])
    if "coding" in hf_model.get("use_case", ""):
        caps = list(set(caps + ["coding"]))

    return {
        "id": generate_model_id(hf_id, params_b),
        "name": generate_display_name(hf_id, params_b),
        "family": family,
        "params_b": params_b,
        "architecture": hf_model.get("architecture", "dense"),
        "capabilities": caps,
        "context_length": hf_model.get("context_length", 4096),
        "release_date": hf_model.get("release_date"),
        "ollama_base": infer_ollama_tag(hf_id, params_b) or f"{family}:{int(params_b)}b",
        "quantizations": quantizations,
        "benchmarks": benchmarks,
        # Extra fields
        "hf_id": hf_id,
        "provider": hf_model.get("provider"),
        "hf_downloads": hf_model.get("hf_downloads", 0),
        "gguf_sources": hf_model.get("gguf_sources", []),
    }


def main():
    print("=" * 60)
    print("Merge HuggingFace models with existing models.json")
    print("=" * 60)

    # Carica HF models
    hf_path = DATA_DIR / "hf_models.json"
    if not hf_path.exists():
        print(f"ERROR: {hf_path} not found. Run scrape_hf_models.py first.")
        return

    with open(hf_path) as f:
        hf_models = json.load(f)
    print(f"Loaded {len(hf_models)} HF models")

    # Carica modelli esistenti (per benchmark)
    models_path = DATA_DIR / "models.json"
    existing = []
    existing_map = {}
    if models_path.exists():
        with open(models_path) as f:
            existing = json.load(f)
        existing_map = {m["id"]: m for m in existing}
        print(f"Loaded {len(existing)} existing models")

    # Converti HF models
    converted = []
    for hf in hf_models:
        model = convert_hf_to_model(hf)
        converted.append(model)

    print(f"Converted {len(converted)} models")

    # Merge: preserva benchmark esistenti
    for model in converted:
        model_id = model["id"]

        # Match esatto
        if model_id in existing_map:
            old = existing_map[model_id]
            model["benchmarks"] = old.get("benchmarks", model["benchmarks"])
            model["release_date"] = old.get("release_date") or model["release_date"]
            continue

        # Match per famiglia + parametri
        for old in existing:
            if (old["family"] == model["family"] and
                abs(old["params_b"] - model["params_b"]) < 0.5):
                model["benchmarks"] = old.get("benchmarks", model["benchmarks"])
                model["release_date"] = old.get("release_date") or model["release_date"]
                break

    # Ordina per famiglia e parametri
    converted.sort(key=lambda m: (m["family"], m["params_b"]))

    # Scrivi
    with open(models_path, "w") as f:
        json.dump(converted, f, indent=2)

    print(f"\n✅ Wrote {len(converted)} models to {models_path}")

    # Stats
    print("\n📊 Summary by family:")
    families = {}
    for m in converted:
        f = m["family"]
        families[f] = families.get(f, 0) + 1

    for f, count in sorted(families.items(), key=lambda x: -x[1]):
        print(f"  {f}: {count}")

    # Benchmark coverage
    with_benchmarks = sum(1 for m in converted
                          if any(v is not None for v in m["benchmarks"].values()))
    print(f"\n📈 Models with benchmarks: {with_benchmarks}/{len(converted)}")


if __name__ == "__main__":
    main()
