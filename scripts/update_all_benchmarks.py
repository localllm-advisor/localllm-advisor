#!/usr/bin/env python3
"""
Comprehensive Benchmark Updater for LocalLLM Advisor

Fetches benchmarks from multiple sources:
1. Open LLM Leaderboard (HuggingFace) → IFEval, BBH, MATH, GPQA, MUSR, MMLU-PRO
2. EvalPlus → HumanEval+, MBPP+
3. BigCodeBench → BigCodeBench scores

Usage:
    source .env.local  # Load HF_TOKEN
    python scripts/update_all_benchmarks.py
"""

import json
import re
import os
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError

try:
    import pandas as pd
    from datasets import load_dataset
    HAS_DEPS = True
except ImportError:
    HAS_DEPS = False
    print("ERROR: Missing dependencies. Run:")
    print("  pip install pandas pyarrow datasets")
    exit(1)

DATA_DIR = Path(__file__).parent.parent / "public" / "data"

# ============================================================
# EVALPLUS (HumanEval+, MBPP+)
# ============================================================

_evalplus_data = None

def load_evalplus():
    """Load EvalPlus leaderboard from their JSON endpoint."""
    global _evalplus_data

    if _evalplus_data is not None:
        return _evalplus_data

    print("Loading EvalPlus leaderboard...")

    try:
        url = "https://evalplus.github.io/results.json"
        req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        # Convert to lookup dict
        _evalplus_data = {}
        for model_name, info in data.items():
            scores = info.get("pass@1", {})
            _evalplus_data[model_name.lower()] = {
                "humaneval": scores.get("humaneval+"),
                "mbpp": scores.get("mbpp+"),
                "size": info.get("size"),
            }

        print(f"  Loaded {len(_evalplus_data)} models from EvalPlus")
        return _evalplus_data
    except Exception as e:
        print(f"  [!] EvalPlus error: {e}")
        return {}


def find_evalplus_score(model_name: str, params_b: float, family: str) -> dict:
    """Find HumanEval+ and MBPP+ scores for a model."""
    data = load_evalplus()
    if not data:
        return {"humaneval": None, "mbpp": None}

    model_lower = model_name.lower()

    # Try exact match first
    if model_lower in data:
        return {
            "humaneval": data[model_lower].get("humaneval"),
            "mbpp": data[model_lower].get("mbpp"),
        }

    # Try partial matches
    search_terms = [
        model_name,
        f"{family}-{params_b}b",
        f"{family}{params_b}b",
    ]

    # Add common variations
    if "coder" in model_lower:
        search_terms.append(model_name.replace("-", " "))

    for term in search_terms:
        term_lower = term.lower()
        for key, scores in data.items():
            if term_lower in key or key in term_lower:
                # Check size match if available
                size = scores.get("size")
                if size and abs(size - params_b) / params_b < 0.2:  # 20% tolerance
                    return {
                        "humaneval": scores.get("humaneval"),
                        "mbpp": scores.get("mbpp"),
                    }

    return {"humaneval": None, "mbpp": None}


# ============================================================
# OPEN LLM LEADERBOARD
# ============================================================

_leaderboard_df = None

def load_leaderboard() -> pd.DataFrame | None:
    """Load Open LLM Leaderboard dataset."""
    global _leaderboard_df

    if _leaderboard_df is not None:
        return _leaderboard_df

    print("Loading Open LLM Leaderboard...")

    try:
        ds = load_dataset("open-llm-leaderboard/contents", split="train")
        _leaderboard_df = ds.to_pandas()
        print(f"  Loaded {len(_leaderboard_df)} entries")
        return _leaderboard_df
    except Exception as e:
        print(f"  [!] Leaderboard error: {e}")
        return None


def find_leaderboard_scores(model_name: str, params_b: float, family: str) -> dict:
    """Find scores from Open LLM Leaderboard."""
    df = load_leaderboard()
    if df is None:
        return {}

    results = {
        "ifeval": None,
        "bbh": None,
        "math": None,
        "gpqa": None,
        "musr": None,
        "mmlu_pro": None,
    }

    # Build search patterns
    patterns = [
        model_name,
        f"{family}",
    ]

    # Add HF patterns
    hf_patterns = {
        "llama": ["meta-llama/Llama", "Meta-Llama"],
        "qwen": ["Qwen/Qwen", "Qwen2", "Qwen3"],
        "mistral": ["mistralai/Mistral", "Mistral-"],
        "phi": ["microsoft/Phi", "microsoft/phi"],
        "gemma": ["google/gemma", "gemma-"],
        "deepseek": ["deepseek-ai/DeepSeek", "DeepSeek-"],
        "falcon": ["tiiuae/falcon", "tiiuae/Falcon"],
        "yi": ["01-ai/Yi"],
        "starcoder": ["bigcode/starcoder"],
        "command": ["CohereForAI/c4ai-command"],
        "glm": ["THUDM/glm", "GLM-4"],
        "nemotron": ["nvidia/Nemotron"],
        "internlm": ["internlm/internlm"],
    }

    if family in hf_patterns:
        patterns.extend(hf_patterns[family])

    for pattern in patterns:
        mask = df["fullname"].str.contains(pattern, case=False, na=False)

        # Filter by params if specified
        if params_b > 0:
            param_col = "#Params (B)"
            if param_col in df.columns:
                param_mask = (df[param_col] >= params_b * 0.8) & (df[param_col] <= params_b * 1.2)
                mask = mask & param_mask

        matches = df[mask]

        if len(matches) > 0:
            # Get best scoring entry
            best = matches.loc[matches["Average ⬆️"].idxmax()]

            results["ifeval"] = _safe_float(best.get("IFEval"))
            results["bbh"] = _safe_float(best.get("BBH"))
            results["math"] = _safe_float(best.get("MATH Lvl 5"))
            results["gpqa"] = _safe_float(best.get("GPQA"))
            results["musr"] = _safe_float(best.get("MUSR"))
            results["mmlu_pro"] = _safe_float(best.get("MMLU-PRO"))
            break

    return results


# ============================================================
# BIGCODEBENCH
# ============================================================

_bigcodebench_df = None

def load_bigcodebench() -> pd.DataFrame | None:
    """Load BigCodeBench leaderboard."""
    global _bigcodebench_df

    if _bigcodebench_df is not None:
        return _bigcodebench_df

    print("Loading BigCodeBench leaderboard...")

    try:
        ds = load_dataset("bigcode/bigcodebench-results", split="train")
        _bigcodebench_df = ds.to_pandas()
        print(f"  Loaded {len(_bigcodebench_df)} entries")
        return _bigcodebench_df
    except Exception as e:
        print(f"  [!] BigCodeBench error: {e}")
        return None


def find_bigcodebench_score(model_name: str, params_b: float, family: str) -> float | None:
    """Find BigCodeBench score for a model."""
    df = load_bigcodebench()
    if df is None:
        return None

    patterns = [model_name, family]

    for pattern in patterns:
        mask = df["model"].str.contains(pattern, case=False, na=False)

        if params_b > 0 and "size" in df.columns:
            size_mask = (df["size"] >= params_b * 0.8) & (df["size"] <= params_b * 1.2)
            mask = mask & size_mask

        matches = df[mask]

        if len(matches) > 0:
            best = matches.iloc[0]
            score = best.get("instruct") or best.get("complete")
            return _safe_float(score)

    return None


# ============================================================
# HELPERS
# ============================================================

def _safe_float(val) -> float | None:
    """Convert to float or None."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    try:
        return round(float(val), 1)
    except (ValueError, TypeError):
        return None


# ============================================================
# MAIN
# ============================================================

def main():
    print("=" * 60)
    print("LocalLLM Advisor - Comprehensive Benchmark Updater")
    print("=" * 60)
    print()
    print("Sources:")
    print("  1. Open LLM Leaderboard → IFEval, BBH, MATH, GPQA, MUSR, MMLU-PRO")
    print("  2. EvalPlus → HumanEval+, MBPP+")
    print("  3. BigCodeBench → BigCodeBench")
    print()

    # Load models
    models_path = DATA_DIR / "models.json"
    if not models_path.exists():
        print(f"ERROR: {models_path} not found!")
        return

    with open(models_path) as f:
        models = json.load(f)

    print(f"Loaded {len(models)} models")
    print()

    # Pre-load all data sources
    load_leaderboard()
    load_evalplus()
    load_bigcodebench()
    print()

    # Update each model
    updated = 0
    updated_humaneval = 0
    updated_mbpp = 0
    updated_bigcodebench = 0

    for i, model in enumerate(models, 1):
        name = model.get("name", "")
        family = model.get("family", "")
        params_b = model.get("params_b", 0)

        # Skip embedding models
        if family == "embedding" or "embed" in name.lower():
            continue

        old_benchmarks = model.get("benchmarks", {})
        new_benchmarks = dict(old_benchmarks)  # Copy existing

        changes = []

        # 1. Open LLM Leaderboard
        llm_scores = find_leaderboard_scores(name, params_b, family)
        for key, value in llm_scores.items():
            if value is not None and (new_benchmarks.get(key) is None):
                new_benchmarks[key] = value
                changes.append(key)

        # 2. EvalPlus (HumanEval+, MBPP+)
        evalplus = find_evalplus_score(name, params_b, family)
        if evalplus["humaneval"] is not None and new_benchmarks.get("humaneval") is None:
            new_benchmarks["humaneval"] = evalplus["humaneval"]
            changes.append("humaneval")
            updated_humaneval += 1
        if evalplus["mbpp"] is not None and new_benchmarks.get("mbpp") is None:
            new_benchmarks["mbpp"] = evalplus["mbpp"]
            changes.append("mbpp")
            updated_mbpp += 1

        # 3. BigCodeBench
        bcb = find_bigcodebench_score(name, params_b, family)
        if bcb is not None and new_benchmarks.get("bigcodebench") is None:
            new_benchmarks["bigcodebench"] = bcb
            changes.append("bigcodebench")
            updated_bigcodebench += 1

        # Update model
        if changes:
            model["benchmarks"] = new_benchmarks
            updated += 1
            print(f"  [{i}/{len(models)}] ✓ {name}: +{', '.join(changes)}")
        else:
            if i <= 10 or i % 20 == 0:
                print(f"  [{i}/{len(models)}] - {name}")

    # Save
    with open(models_path, "w") as f:
        json.dump(models, f, indent=2)

    print()
    print("=" * 60)
    print(f"Updated {updated}/{len(models)} models")
    print(f"  - HumanEval+: {updated_humaneval} new")
    print(f"  - MBPP+: {updated_mbpp} new")
    print(f"  - BigCodeBench: {updated_bigcodebench} new")
    print(f"Written to {models_path}")


if __name__ == "__main__":
    main()
