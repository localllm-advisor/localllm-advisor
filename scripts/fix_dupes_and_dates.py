#!/usr/bin/env python3
"""
Fix duplicate IDs and remaining fake (2026) release dates in models.json.
"""
import json
from pathlib import Path

MODELS_PATH = Path(__file__).parent.parent / "public" / "data" / "models.json"

with open(MODELS_PATH) as f:
    models = json.load(f)

# ============================================================
# FIX 1: Duplicate IDs — give each model a unique, descriptive ID
# ============================================================

# Strategy: rename models to be more specific based on their hf_id/name

ID_RENAMES = {
    # llama-8b duplicates (base vs instruct of same model — keep instruct, remove base)
    # We'll remove the base model since instruct is what users actually run
    ("llama-8b", "meta-llama/Llama-3.1-8B"): "__REMOVE__",  # base model, not chat
    ("llama-8b", "meta-llama/Llama-3.1-8B-Instruct"): "llama-3.1-8b",  # keep with better ID

    # llama-70.6b: one is Llama 3.1 70B, one is Llama 3.3 70B
    # We already added llama-3.3-70b and llama-3.1-70b as new models,
    # so these pre-existing scraped versions are redundant
    ("llama-70.6b", "meta-llama/Llama-3.1-70B-Instruct"): "__REMOVE__",  # we added llama-3.1-70b
    ("llama-70.6b", "meta-llama/Llama-3.3-70B-Instruct"): "__REMOVE__",  # we added llama-3.3-70b

    # mistral-small-24b: one is Mistral-Small-24B v2501, other is v3.1
    ("mistral-small-24b", "mistralai/Mistral-Small-24B-Instruct-2501"): "mistral-small-24b-2501",
    ("mistral-small-24b", "mistralai/Mistral-Small-3.1-24B-Instruct-2503"): "mistral-small-3.1-24b",

    # mistral-46.7b: Mixtral-8x7B vs Nous-Hermes-2-Mixtral
    ("mistral-46.7b", "mistralai/Mixtral-8x7B-Instruct-v0.1"): "mixtral-8x7b",
    ("mistral-46.7b", "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO"): "nous-hermes2-mixtral-8x7b",

    # phi-14b: 4 models! Phi-3-medium, phi-4, Phi-4-reasoning, Phi-4-multimodal
    ("phi-14b", "microsoft/Phi-3-medium-14b-instruct"): "phi-3-medium-14b",
    ("phi-14b", "microsoft/phi-4"): "phi-4-14b",
    ("phi-14b", "microsoft/Phi-4-reasoning"): "phi-4-reasoning-14b",
    ("phi-14b", "microsoft/Phi-4-multimodal-instruct"): "phi-4-multimodal-14b",
}

# Apply renames
to_remove = []
for i, m in enumerate(models):
    key = (m["id"], m.get("hf_id", ""))
    if key in ID_RENAMES:
        new_id = ID_RENAMES[key]
        if new_id == "__REMOVE__":
            to_remove.append(i)
            print(f"  REMOVE: {m['id']} ({m['name']}) — superseded by new entry")
        else:
            old_id = m["id"]
            m["id"] = new_id
            print(f"  RENAME: {old_id} → {new_id} ({m['name']})")

# Remove marked entries (reverse order to preserve indices)
for i in sorted(to_remove, reverse=True):
    models.pop(i)

# ============================================================
# FIX 2: Remaining 2026 fake dates
# ============================================================

REAL_DATES = {
    # Gemma family
    "gemma-9.2b":       "2024-06-27",   # Gemma 2 9B
    "gemma-27.2b":      "2024-06-27",   # Gemma 2 27B
    "gemma-27.4b":      "2025-03-12",   # Gemma 3 27B

    # Llama family
    "llama-1.1b":       "2024-01-08",   # TinyLlama
    "llama-1.2b":       "2024-09-25",   # Llama 3.2 1B
    "llama-3.2b":       "2024-09-25",   # Llama 3.2 3B
    "llama-3.1-8b":     "2024-07-23",   # Llama 3.1 8B (renamed from llama-8b)

    # Mistral
    "mistral-7.2b":     "2023-09-27",   # Mistral 7B v0.1
    "mistral-small-24b-2501": "2025-01-30",  # Mistral Small 24B Jan 2025

    # Phi
    "phi-3.8b":         "2024-04-23",   # Phi-3 mini 4k
    "phi-3-medium-14b": "2024-05-21",   # Phi-3 medium
    "phi-4-14b":        "2024-12-12",   # Phi-4
    "phi-4-reasoning-14b": "2025-04-01", # Phi-4 reasoning
    "phi-4-multimodal-14b": "2025-01-07", # Phi-4 multimodal

    # Qwen family
    "qwen-800m":        "2025-04-29",   # Qwen3 0.6B
    "qwen-900m":        "2025-06-01",   # Qwen3.5 0.8B
    "qwen-coder-1.5b":  "2024-11-12",   # Qwen2.5-Coder-1.5B
    "qwen-2.3b":        "2025-06-01",   # Qwen3.5 2B
    "qwen-4.7b":        "2025-06-01",   # Qwen3.5 4B
    "qwen-9.7b":        "2025-06-01",   # Qwen3.5 9B
    "qwen-27.8b":       "2025-06-01",   # Qwen3.5 27B
    "qwen-36b":         "2025-06-01",   # Qwen3.5 35B-A3B (MoE)
    "qwen-125.1b":      "2025-06-01",   # Qwen3.5 122B-A10B (MoE)
}

# Also add capability fixes for these models
EXTRA_CAPABILITY_FIXES = {
    "phi-4-reasoning-14b": ["chat", "reasoning", "coding"],
    "phi-4-multimodal-14b": ["chat", "vision", "reasoning"],
    "phi-4-14b": ["chat", "coding", "reasoning"],
    "phi-3-medium-14b": ["chat", "coding", "reasoning"],
    "qwen-coder-1.5b": ["coding", "chat"],
    "mistral-small-3.1-24b": ["chat", "coding", "reasoning", "vision", "tool_use"],
    "mistral-small-24b-2501": ["chat", "coding", "reasoning", "tool_use"],
    "mixtral-8x7b": ["chat", "coding"],
    "qwen-36b": ["chat", "coding", "reasoning"],  # MoE
    "qwen-125.1b": ["chat", "coding", "reasoning"],  # MoE
}

dates_fixed = 0
caps_fixed = 0
for m in models:
    # Fix dates
    if m["id"] in REAL_DATES:
        old = m.get("release_date")
        m["release_date"] = REAL_DATES[m["id"]]
        if old != REAL_DATES[m["id"]]:
            dates_fixed += 1
            print(f"  DATE FIX: {m['id']:35s} {old} → {REAL_DATES[m['id']]}")

    # Fix capabilities
    if m["id"] in EXTRA_CAPABILITY_FIXES:
        old = m.get("capabilities", [])
        new = EXTRA_CAPABILITY_FIXES[m["id"]]
        if sorted(old) != sorted(new):
            m["capabilities"] = new
            caps_fixed += 1

# Sort
models.sort(key=lambda m: (m["family"], m["params_b"]))

# Write
with open(MODELS_PATH, "w") as f:
    json.dump(models, f, indent=2, ensure_ascii=False)

print(f"\nFixed {dates_fixed} dates, {caps_fixed} capabilities")
print(f"Removed {len(to_remove)} duplicate/superseded models")
print(f"Final count: {len(models)}")
