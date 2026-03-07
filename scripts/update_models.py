"""
Data Update Script - Placeholder for future automation.

This script will eventually:
1. Fetch model list from ollamadb.dev/api/v1/models
2. For top 50 models by pull count, fetch details (params, quantizations)
3. Fetch benchmarks from HuggingFace Open LLM Leaderboard dataset
4. Calculate estimated VRAM per (model, quantization):
   VRAM_MB = (params_B * BPW / 8) * 1024 + overhead_MB
5. Generate updated models.json
6. Commit + push to trigger Vercel redeploy

Frequency: Manual, 1-2x per week.

Usage:
  python scripts/update_models.py
"""

import json
import sys
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "public" / "data"


def estimate_vram_mb(params_b: float, bpw: float, overhead_mb: int = 500) -> int:
    """Estimate VRAM in MB for a model at a given bits-per-weight."""
    return int(params_b * bpw / 8 * 1024) + overhead_mb


def main():
    print("=" * 60)
    print("LocalLLM Advisor - Data Update Script")
    print("=" * 60)
    print()
    print("This is a placeholder script.")
    print("For now, models.json and gpus.json are maintained manually.")
    print()
    print(f"Data directory: {DATA_DIR}")
    print()

    # Verify data files exist
    models_path = DATA_DIR / "models.json"
    gpus_path = DATA_DIR / "gpus.json"

    if models_path.exists():
        with open(models_path) as f:
            models = json.load(f)
        print(f"models.json: {len(models)} models")
    else:
        print("models.json: NOT FOUND")

    if gpus_path.exists():
        with open(gpus_path) as f:
            gpus = json.load(f)
        print(f"gpus.json: {len(gpus)} GPUs")
    else:
        print("gpus.json: NOT FOUND")

    print()
    print("VRAM estimation examples:")
    for params, bpw in [(7, 4.5), (14, 4.5), (32, 4.5), (70, 4.5), (7, 8.0), (14, 8.0)]:
        vram = estimate_vram_mb(params, bpw)
        print(f"  {params}B @ Q{bpw:.1f}: ~{vram} MB ({vram/1024:.1f} GB)")


if __name__ == "__main__":
    main()
