#!/usr/bin/env python3
"""
Incremental sync for public/data/models.json from Hugging Face.

Goals
-----
- Keep all existing curated models exactly as-is (preserve manual benchmarks,
  capabilities, gguf_sources, etc.)
- Refresh hf_downloads for already-tracked HF repos (cheap: only updates one field)
- Discover new relevant public LLMs every run
- Avoid quantized duplicates / GGUF repos / LoRAs / adapters / merges /
  uncensored jailbreak fine-tunes
- Patch frontend CountUp numbers automatically so a single git commit covers
  both the data and the UI
- Write stable, schema-compatible JSON (no extra fields that break TypeScript)

Schema produced
---------------
Each entry matches the existing public/data/models.json schema:
  id, name, family, params_b, architecture, capabilities, context_length,
  release_date, hf_id, provider, hf_downloads, quantizations[], benchmarks{},
  (optional) gguf_sources[]

Run
---
  HF_TOKEN=hf_xxx python scripts/sync_models_from_hf.py
"""
from __future__ import annotations

import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
REPO_ROOT   = Path(__file__).parent.parent
DATA_DIR    = REPO_ROOT / "public" / "data"
MODELS_PATH = DATA_DIR / "models.json"
GPUS_PATH   = DATA_DIR / "gpus.json"
PAGE_TSX    = REPO_ROOT / "src" / "app" / "page.tsx"
ENTERPRISE_TSX = REPO_ROOT / "src" / "app" / "enterprise" / "page.tsx"

# ---------------------------------------------------------------------------
# HF API
# ---------------------------------------------------------------------------
HF_API      = "https://huggingface.co/api/models"
USER_AGENT  = "localllm-advisor-model-sync/1.0"
HF_TOKEN    = os.getenv("HF_TOKEN") or os.getenv("HUGGING_FACE_HUB_TOKEN")

HEADERS: dict[str, str] = {"User-Agent": USER_AGENT}
if HF_TOKEN:
    HEADERS["Authorization"] = f"Bearer {HF_TOKEN}"

REQUEST_TIMEOUT = 30
RETRYABLE       = {429, 500, 502, 503, 504}

# ---------------------------------------------------------------------------
# Discovery filters
# ---------------------------------------------------------------------------
# How many genuinely-new models to add per run (prevents runaway growth)
MAX_NEW_MODELS_PER_RUN = 300

# Minimum quality bar (either condition is enough to pass)
MIN_DOWNLOADS = 500
MIN_LIKES     = 20

# Param range for local-LLM relevance (B)
MIN_PARAMS_B = 0.10   # skip sub-100M toys
MAX_PARAMS_B = 1000.0 # we already have 744B in dataset

ALLOWED_PIPELINES = {
    "text-generation",
    "text2text-generation",
    "image-text-to-text",   # multimodal LLMs (Gemma 4, LLaVA, Phi-4-multimodal …)
    "any-to-any",           # omni models (Gemma 4 E-series, …)
    "sentence-similarity",
    "feature-extraction",
    "text-classification",
}

# Quantization / derivative repo orgs — we only want base/instruct weights
SKIP_ORGS = {
    "TheBloke", "bartowski", "unsloth", "mlx-community", "mradermacher",
    "lmstudio-community", "QuantFactory", "tensorblock", "city96",
    "dranger003", "afrideva", "second-state", "cstr", "RichardErkhov",
    "MaziyarPanahi", "NousResearch-GGUF", "TheBloke-GPTQ",
}

# Substrings that signal a repo is a derivative / quantized / jailbreak model
EXCLUDED_REPO_SUBSTRINGS = (
    "gguf", "gptq", "awq", "exl2", "mlx", "lora", "qlora", "adapter",
    "merged", "merge", "imatrix", "4bit", "8bit", "bnb-", "quant",
    "uncensored", "abliterated", "jailbreak", "nsfw", "roleplay-",
    "chat-vector", "dare-ties", "slerp",
)

# HF tags that mark a repo as a derivative or quantized model
EXCLUDED_TAGS = {
    "gguf", "gptq", "awq", "lora", "adapter", "merge", "mlx",
    "quantized", "4-bit", "8-bit",
}

# Discovery query specs — each yields a page of model stubs from the HF API.
#
# Three layers:
#  1. Global by pipeline_tag — catches popular/trending models of each type.
#  2. Trusted-org scans (NO pipeline_tag filter) — guarantees we pick up every
#     new release from key providers the very first run after publication,
#     regardless of what pipeline tag they chose (e.g. Gemma 4 uses
#     "image-text-to-text" and "any-to-any", not "text-generation").
#     The ALLOWED_PIPELINES + should_keep_candidate filters handle curation.
QUERY_SPECS = [
    # Global: text-generation (GPT-style, Llama, Mistral, most LLMs)
    {"pipeline_tag": "text-generation",     "sort": "downloads",    "direction": -1, "limit": 500},
    {"pipeline_tag": "text-generation",     "sort": "likes",        "direction": -1, "limit": 300},
    {"pipeline_tag": "text-generation",     "sort": "lastModified", "direction": -1, "limit": 300},
    # Global: multimodal LLMs (Gemma 4, LLaVA, Phi-4-multimodal, future omni models)
    {"pipeline_tag": "image-text-to-text",  "sort": "downloads",    "direction": -1, "limit": 200},
    {"pipeline_tag": "image-text-to-text",  "sort": "lastModified", "direction": -1, "limit": 200},
    {"pipeline_tag": "any-to-any",          "sort": "downloads",    "direction": -1, "limit": 100},
    {"pipeline_tag": "any-to-any",          "sort": "lastModified", "direction": -1, "limit": 100},
    # Global: other useful pipeline types
    {"pipeline_tag": "text2text-generation","sort": "downloads",    "direction": -1, "limit": 150},
    {"pipeline_tag": "sentence-similarity", "sort": "downloads",    "direction": -1, "limit": 150},
    {"pipeline_tag": "feature-extraction",  "sort": "downloads",    "direction": -1, "limit": 150},
    {"pipeline_tag": "text-classification", "sort": "downloads",    "direction": -1, "limit": 100},
    # Trusted-org scans — NO pipeline_tag filter so we see ALL their new models
    # immediately after release, before they rank in global queries.
    {"author": "google",       "sort": "lastModified", "direction": -1, "limit": 80},
    {"author": "meta-llama",   "sort": "lastModified", "direction": -1, "limit": 60},
    {"author": "mistralai",    "sort": "lastModified", "direction": -1, "limit": 60},
    {"author": "microsoft",    "sort": "lastModified", "direction": -1, "limit": 60},
    {"author": "Qwen",         "sort": "lastModified", "direction": -1, "limit": 60},
    {"author": "deepseek-ai",  "sort": "lastModified", "direction": -1, "limit": 50},
    {"author": "ibm-granite",  "sort": "lastModified", "direction": -1, "limit": 40},
    {"author": "nvidia",       "sort": "lastModified", "direction": -1, "limit": 40},
    {"author": "moonshotai",   "sort": "lastModified", "direction": -1, "limit": 30},
    {"author": "LGAI-EXAONE",  "sort": "lastModified", "direction": -1, "limit": 30},
]

# ---------------------------------------------------------------------------
# Quantisation table — must match existing models.json schema exactly
# ---------------------------------------------------------------------------
# (level, bits-per-weight, quality_score)
QUANTS = [
    ("Q4_K_M", 4.5,  0.94),
    ("Q6_K",   6.5,  0.97),
    ("Q8_0",   8.0,  0.995),
    ("FP16",  16.0,  1.0),
]

# ---------------------------------------------------------------------------
# Provider / family lookup tables
# ---------------------------------------------------------------------------
ORG_TO_PROVIDER: dict[str, str] = {
    "meta-llama":           "Meta",
    "mistralai":            "Mistral AI",
    "qwen":                 "Alibaba",
    "microsoft":            "Microsoft",
    "google":               "Google",
    "deepseek-ai":          "DeepSeek",
    "tiiuae":               "TII",
    "ibm-granite":          "IBM",
    "ibm":                  "IBM",
    "nomic-ai":             "Nomic",
    "baai":                 "BAAI",
    "cohereforai":          "Cohere",
    "coherelabs":           "Cohere",
    "thudm":                "Zhipu AI",
    "zai-org":              "Zhipu AI",
    "allenai":              "Allen Institute",
    "jinaai":               "Jina AI",
    "snowflake":            "Snowflake",
    "huggingfacetb":        "HuggingFace",
    "huggingfaceh4":        "HuggingFace",
    "openai-community":     "OpenAI",
    "openai":               "OpenAI",
    "sentence-transformers":"Sentence Transformers",
    "intfloat":             "Microsoft",
    "nvidia":               "NVIDIA",
    "nvidiaresearch":       "NVIDIA",
    "01-ai":                "01.AI",
    "internlm":             "Shanghai AI Lab",
    "Shanghai_AI_Laboratory": "Shanghai AI Lab",
    "ai21labs":             "AI21",
    "EleutherAI":           "EleutherAI",
    "stabilityai":          "Stability AI",
    "databricks":           "Databricks",
    "bigcode":              "BigCode",
    "codellama":            "Meta",
    "wizardlm":             "Microsoft",
    "teknium":              "Teknium",
    "nexusflow":            "Nexusflow",
    "upstage":              "Upstage",
    "lgai-exaone":          "LG AI",
    "lgai":                 "LG AI",
    "sarvamai":             "Sarvam AI",
    "liquidai":             "Liquid AI",
    "minimax-ai":           "MiniMax",
    "minimaxai":            "MiniMax",
    "x-ai":                 "xAI",
    "xai-org":              "xAI",
    "amazon":               "Amazon",
    "writer":               "Writer",
    "command-r":            "Cohere",
}

REPO_FAMILY_PATTERNS: list[tuple[str, str]] = [
    # order matters — more specific first
    (r"llama-?4",         "llama"),
    (r"llama-?3",         "llama"),
    (r"llama-?2",         "llama"),
    (r"llama",            "llama"),
    (r"qwen3\.5",         "qwen"),
    (r"qwen3",            "qwen"),
    (r"qwen2\.5",         "qwen"),
    (r"qwen2",            "qwen"),
    (r"qwq",              "qwen"),
    (r"qwen",             "qwen"),
    (r"mistral",          "mistral"),
    (r"mixtral",          "mixtral"),
    (r"devstral",         "mistral"),
    (r"deepseek",         "deepseek"),
    (r"janus",            "deepseek"),
    (r"phi-?4",           "phi"),
    (r"phi-?3",           "phi"),
    (r"phi-?2",           "phi"),
    (r"phi",              "phi"),
    (r"gemma-?4",         "gemma"),   # Gemma 4 (April 2026+)
    (r"gemma-?3n",        "gemma"),
    (r"gemma-?3",         "gemma"),
    (r"gemma-?2",         "gemma"),
    (r"gemma",            "gemma"),
    (r"falcon",           "falcon"),
    (r"granite",          "granite"),
    (r"nemotron",         "nemotron"),
    (r"glm-?5",           "glm"),
    (r"glm-?4",           "glm"),
    (r"chatglm",          "glm"),
    (r"command-?r",       "command"),
    (r"command-?a",       "command"),
    (r"aya",              "aya"),
    (r"bloom",            "bloom"),
    (r"stablelm",         "stablelm"),
    (r"starcoder",        "starcoder"),
    (r"codestral",        "mistral"),
    (r"solar",            "solar"),
    (r"internlm",         "internlm"),
    (r"exaone",           "exaone"),
    (r"olmo",             "olmо"),
    (r"smollm",           "smollm"),
    (r"gpt-oss",          "gpt-oss"),
    (r"minimax",          "minimax"),
    (r"lfm",              "lfm"),
    (r"sarvam",           "sarvam"),
    (r"jamba",            "jamba"),
    (r"mpt",              "mpt"),
    (r"bge-",             "embedding"),
    (r"e5-",              "embedding"),
    (r"nomic-embed",      "embedding"),
    (r"gte-",             "embedding"),
    (r"all-minilm",       "embedding"),
    (r"multilingual-e5",  "embedding"),
]


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def now_date() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value


def hf_get_json(url: str, params: dict[str, Any] | None = None, retries: int = 4) -> Any:
    for attempt in range(retries):
        try:
            resp = requests.get(url, headers=HEADERS, params=params, timeout=REQUEST_TIMEOUT)
            if resp.status_code == 429:
                wait = 2 ** attempt + 5
                print(f"  [rate-limit] sleeping {wait}s …")
                time.sleep(wait)
                continue
            if resp.status_code in RETRYABLE and attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as exc:
            if attempt == retries - 1:
                raise
            time.sleep(2 ** attempt)


def fetch_model_list(params: dict[str, Any]) -> list[dict[str, Any]]:
    try:
        data = hf_get_json(HF_API, params=params)
        return data if isinstance(data, list) else []
    except Exception as exc:
        print(f"  [warn] list query failed {params}: {exc}")
        return []


def fetch_model_detail(repo_id: str) -> dict[str, Any] | None:
    try:
        return hf_get_json(f"{HF_API}/{repo_id}")
    except Exception as exc:
        print(f"  [warn] detail failed for {repo_id}: {exc}")
        return None


def fetch_config_json(repo_id: str) -> dict[str, Any] | None:
    """Try to read config.json from the repo — gives us context_length etc."""
    url = f"https://huggingface.co/{repo_id}/resolve/main/config.json"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=20)
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# Schema helpers
# ---------------------------------------------------------------------------

def empty_benchmarks() -> dict[str, Any]:
    return {
        "humaneval":    None,
        "mmlu_pro":     None,
        "math":         None,
        "ifeval":       None,
        "bbh":          None,
        "mmmu":         None,
        "gpqa":         None,
        "musr":         None,
        "mbpp":         None,
        "bigcodebench": None,
        "alpacaeval":   None,
        "mmbench":      None,
    }


def calc_vram_mb(params_b: float, bpw: float) -> int:
    """Estimate VRAM in MB: params_b × bpw × 125.
    Matches the formula used in the existing curated dataset entries
    (adds ~5-8% overhead on top of raw bytes for KV-cache + activation buffers).
    """
    return round(params_b * bpw * 125)


def make_quantizations(params_b: float) -> list[dict[str, Any]]:
    """Build the quantizations array, omitting FP16 for large (≥24B) models
    to match the convention in the existing curated dataset.
    FP16 at 24B = ~48 GB which is above what most consumer setups can handle."""
    out = []
    for level, bpw, quality in QUANTS:
        if level == "FP16" and params_b >= 24:
            continue  # FP16 at 24B+ is impractical on consumer hardware
        out.append({
            "level":   level,
            "bpw":     bpw,
            "vram_mb": calc_vram_mb(params_b, bpw),
            "quality": quality,
        })
    return out


# ---------------------------------------------------------------------------
# Inference helpers
# ---------------------------------------------------------------------------

def infer_provider(repo_id: str) -> str:
    org = repo_id.split("/")[0].lower()
    for key, provider in ORG_TO_PROVIDER.items():
        if key.lower() == org:
            return provider
    # Capitalise org name as fallback
    return repo_id.split("/")[0]


def infer_family(repo_id: str) -> str:
    rid = repo_id.lower()
    for pattern, family in REPO_FAMILY_PATTERNS:
        if re.search(pattern, rid):
            return family
    # Last resort: first token of model name
    tail = slugify(repo_id.split("/")[-1].split("-")[0])
    return tail or "other"


def is_moe(repo_id: str, detail: dict[str, Any]) -> bool:
    rid = repo_id.lower()
    # Common MoE naming patterns
    if re.search(r"\d+x\d+b", rid):           # e.g. 8x7b, 8x22b
        return True
    if re.search(r"-a\d+b", rid):             # e.g. 30b-a3b, 120b-a12b
        return True
    if "mixtral" in rid or "moe" in rid:
        return True
    cfg = detail.get("config", {}) or {}
    model_type = str(cfg.get("model_type", "")).lower()
    if "moe" in model_type or "mixture" in model_type:
        return True
    tags = {str(t).lower() for t in detail.get("tags", [])}
    if "mixture-of-experts" in tags or "moe" in tags:
        return True
    return False


def infer_capabilities(repo_id: str, pipeline_tag: str) -> list[str]:
    rid = repo_id.lower()
    pt  = (pipeline_tag or "").lower()

    # Pure embedding models
    if pt in {"sentence-similarity", "feature-extraction"} or \
       any(s in rid for s in ("embed", "bge-", "e5-", "nomic-embed", "gte-", "minilm", "retrieval")):
        return ["embedding"]

    caps: set[str] = {"chat"}

    if any(s in rid for s in ("coder", "code", "starcoder", "codestral", "devstral")):
        caps.add("coding")
    if any(s in rid for s in ("reason", "-r1", "qwq", "magistral")):
        caps.add("reasoning")
    # Pipeline-tag-based multimodal detection — catches Gemma 4, future omni models, etc.
    # image-text-to-text covers Gemma 4 27B/31B; any-to-any covers Gemma 4 E-series
    if pt in {"image-text-to-text", "any-to-any"}:
        caps.add("vision")
    # Name-based multimodal detection (fallback / belt-and-suspenders)
    if re.search(r"gemma-?4.*-e\d+b", rid) or re.search(r"gemma-?4-e\d+b", rid):
        caps.add("vision")
    if any(s in rid for s in ("vision", "-vl", "multimodal", "vlm", "pixtral", "-v-", "gemma-3n")):
        caps.add("vision")
    if any(s in rid for s in ("multilingual", "multi-lingual", "aya", "sarvam")):
        caps.add("multilingual")
    if any(s in rid for s in ("tool", "function", "agent")):
        caps.add("tool_use")

    return sorted(caps)


def infer_context_length(detail: dict[str, Any], repo_id: str) -> int:
    """Extract max context from API detail or fall back to config.json, then
    use family-based defaults rather than the generic 4096 fallback."""
    keys = (
        "max_position_embeddings", "max_sequence_length",
        "seq_length", "n_positions", "sliding_window",
    )

    def scan(cfg: dict) -> int | None:
        for key in keys:
            val = cfg.get(key)
            if isinstance(val, int) and 512 < val <= 10_000_000:
                return val
        sub = cfg.get("text_config")
        if isinstance(sub, dict):
            return scan(sub)
        return None

    cfg = detail.get("config", {}) or {}
    found = scan(cfg)
    if found:
        return found

    # Try fetching config.json directly
    full_cfg = fetch_config_json(repo_id)
    if full_cfg:
        found = scan(full_cfg)
        if found:
            return found

    # Family-based sensible defaults
    rid = repo_id.lower()
    if any(s in rid for s in ("llama-4", "llama4")):
        return 1_048_576
    if any(s in rid for s in ("qwen3.5", "qwen3", "qwen2.5")):
        return 131_072
    if "mistral" in rid or "mixtral" in rid:
        return 131_072
    if "gemma-4" in rid or "gemma4" in rid:
        return 131_072  # Gemma 4: 128K context
    if "gemma-3n" in rid or "gemma3n" in rid:
        return 32_768
    if "gemma-3" in rid or "gemma3" in rid:
        return 131_072
    if "deepseek" in rid:
        return 131_072
    if "phi-4" in rid:
        return 32_768
    if "phi-3" in rid:
        return 131_072
    if "llama-3" in rid or "llama3" in rid:
        return 131_072
    if "falcon" in rid:
        return 8_192
    return 4_096


def extract_total_params(detail: dict[str, Any], repo_id: str) -> int | None:
    """Return total parameter count (raw integer), or None if unknown."""
    # Safetensors metadata is the most reliable source
    st = detail.get("safetensors", {}) or {}
    total = st.get("total")
    if isinstance(total, int) and total > 0:
        return total
    by_dtype = st.get("parameters", {})
    if isinstance(by_dtype, dict):
        nums = [v for v in by_dtype.values() if isinstance(v, int) and v > 0]
        if nums:
            return max(nums)

    # Config fields
    cfg = detail.get("config", {}) or {}
    for key in ("num_parameters", "n_parameters", "parameter_count"):
        val = cfg.get(key)
        if isinstance(val, int) and val > 0:
            return val

    # Parse from repo_id (e.g. "Llama-3.1-70B" → 70B, "8x7B" → 56B)
    rid = repo_id.lower()
    # MoE total params pattern: NxMb → N*M billions
    m = re.search(r"(\d+)x(\d+(?:\.\d+)?)b", rid)
    if m:
        return int(int(m.group(1)) * float(m.group(2)) * 1_000_000_000)
    # Standard: Nb
    m = re.search(r"(\d+(?:\.\d+)?)b(?:[^a-z]|$)", rid)
    if m:
        return int(float(m.group(1)) * 1_000_000_000)
    # Millions: Nm
    m = re.search(r"(\d+(?:\.\d+)?)m(?:[^a-z]|$)", rid)
    if m:
        return int(float(m.group(1)) * 1_000_000)

    return None


def prettify_name(repo_id: str, existing_name: str | None = None) -> str:
    if existing_name:
        return existing_name
    tail = repo_id.split("/")[-1]
    # Replace underscores, clean up repeated hyphens
    tail = tail.replace("_", "-")
    tail = re.sub(r"-+", "-", tail)
    # Upcase "b" suffix after numbers: 70b → 70B
    tail = re.sub(r"(\d)(b)(?=[^a-z]|$)", lambda m: m.group(1) + "B", tail)
    return tail


# ---------------------------------------------------------------------------
# Filtering
# ---------------------------------------------------------------------------

def has_excluded_signal(repo_id: str, tags: list[Any] | None) -> bool:
    rid = repo_id.lower()
    if any(sub in rid for sub in EXCLUDED_REPO_SUBSTRINGS):
        return True
    tag_set = {str(t).lower() for t in (tags or [])}
    if tag_set & EXCLUDED_TAGS:
        return True
    return False


def should_keep_candidate(c: dict[str, Any]) -> bool:
    repo_id = c.get("id", "")
    if not repo_id or "/" not in repo_id:
        return False
    org = repo_id.split("/")[0]
    if org in SKIP_ORGS:
        return False
    tags = c.get("tags", []) or []
    if has_excluded_signal(repo_id, tags):
        return False
    pt = (c.get("pipeline_tag") or "").lower()
    if pt not in ALLOWED_PIPELINES:
        return False
    downloads = int(c.get("downloads") or 0)
    likes     = int(c.get("likes") or 0)
    # Either threshold is enough to pass
    if downloads < MIN_DOWNLOADS and likes < MIN_LIKES:
        return False
    return True


# ---------------------------------------------------------------------------
# Model entry builder
# ---------------------------------------------------------------------------

def build_model_entry(
    detail: dict[str, Any],
    existing: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    repo_id = detail.get("id")
    if not repo_id:
        return None

    total_params = extract_total_params(detail, repo_id)
    if not total_params:
        return None

    params_b = round(total_params / 1_000_000_000, 1)
    if params_b < MIN_PARAMS_B or params_b > MAX_PARAMS_B:
        return None

    pipeline_tag = (detail.get("pipeline_tag") or "text-generation").lower()
    if pipeline_tag not in ALLOWED_PIPELINES:
        return None

    # Preserve all manually curated fields; only refresh hf_downloads
    if existing:
        entry = dict(existing)
        entry["hf_downloads"] = int(detail.get("downloads") or 0)
        # Also refresh hf_id casing in case it changed
        entry["hf_id"] = repo_id
        return entry

    # --- Build a brand-new entry ---
    release_date   = (detail.get("createdAt") or "")[:10] or now_date()
    name           = prettify_name(repo_id)
    family         = infer_family(repo_id)
    capabilities   = infer_capabilities(repo_id, pipeline_tag)
    architecture   = "moe" if is_moe(repo_id, detail) else "dense"
    context_length = infer_context_length(detail, repo_id)
    provider       = infer_provider(repo_id)

    return {
        "id":             slugify(name),
        "name":           name,
        "family":         family,
        "params_b":       params_b,
        "architecture":   architecture,
        "capabilities":   capabilities,
        "context_length": context_length,
        "release_date":   release_date,
        "hf_id":          repo_id,
        "provider":       provider,
        "hf_downloads":   int(detail.get("downloads") or 0),
        "quantizations":  make_quantizations(params_b),
        "benchmarks":     empty_benchmarks(),
    }


# ---------------------------------------------------------------------------
# Discovery
# ---------------------------------------------------------------------------

def unique_in_order(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out:  list[str] = []
    for item in items:
        if item and item not in seen:
            out.append(item)
            seen.add(item)
    return out


def discover_candidate_ids() -> list[str]:
    ids: list[str] = []
    for spec in QUERY_SPECS:
        batch = fetch_model_list(spec)
        kept  = [c["id"] for c in batch if should_keep_candidate(c)]
        print(f"  [query] {spec.get('pipeline_tag','?')} sort={spec.get('sort','?')} "
              f"→ {len(batch)} raw, {len(kept)} kept")
        ids.extend(kept)
    return unique_in_order(ids)


# ---------------------------------------------------------------------------
# Frontend count patcher
# ---------------------------------------------------------------------------

def patch_frontend_counts(model_count: int, gpu_count: int) -> list[str]:
    """Update hardcoded CountUp values in TSX files.
    Returns a list of files that were actually modified."""
    modified: list[str] = []
    combined = model_count + gpu_count

    # --- page.tsx: AI Models counter uses duration={1600} as sentinel ---
    if PAGE_TSX.exists():
        original = PAGE_TSX.read_text(encoding="utf-8")
        patched = re.sub(
            r'(CountUp to=\{)\d+(\} suffix="\+" duration=\{1600\})',
            rf'\g<1>{model_count}\g<2>',
            original,
        )
        if patched != original:
            PAGE_TSX.write_text(patched, encoding="utf-8")
            modified.append(str(PAGE_TSX.relative_to(REPO_ROOT)))
            print(f"  [patch] {PAGE_TSX.name}: AI Models → {model_count}")

    # --- enterprise/page.tsx: "GPUs & Models Supported" combined stat ---
    if ENTERPRISE_TSX.exists():
        original = ENTERPRISE_TSX.read_text(encoding="utf-8")
        # The pattern: CountUp to={NNN} suffix="+" /> immediately before the
        # closing </p> and the "GPUs &amp; Models Supported" label
        patched = re.sub(
            r'(<CountUp to=\{)\d+(\} suffix="\+" />)(</p>\s*<p[^>]*>GPUs &amp; Models)',
            rf'\g<1>{combined}\g<2>\g<3>',
            original,
            flags=re.DOTALL,
        )
        if patched != original:
            ENTERPRISE_TSX.write_text(patched, encoding="utf-8")
            modified.append(str(ENTERPRISE_TSX.relative_to(REPO_ROOT)))
            print(f"  [patch] {ENTERPRISE_TSX.name}: GPUs & Models → {combined} "
                  f"({model_count} models + {gpu_count} GPUs)")

    return modified


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def load_json(path: Path) -> Any:
    if path.exists():
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return []


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Load existing data
    existing_models: list[dict[str, Any]] = load_json(MODELS_PATH)
    gpus: list[dict[str, Any]] = load_json(GPUS_PATH)
    gpu_count = len(gpus)

    # Build lookup: hf_id (lower) → existing entry
    existing_by_hf: dict[str, dict[str, Any]] = {
        m["hf_id"].lower(): m for m in existing_models if m.get("hf_id")
    }

    # Collect IDs we already track (refresh these first)
    tracked_hf_ids = [m["hf_id"] for m in existing_models if m.get("hf_id")]

    print(f"[info] existing models: {len(existing_models)}, GPUs: {gpu_count}")
    print("[info] discovering candidates from Hugging Face …")
    discovered_ids = discover_candidate_ids()
    print(f"[info] unique discovered candidates: {len(discovered_ids)}")

    # Process order: tracked first (refresh), then new discoveries
    all_ids = unique_in_order(tracked_hf_ids + discovered_ids)
    print(f"[info] total repos to inspect: {len(all_ids)}")

    # We'll build the final list preserving existing ordering then appending new
    # Use an ordered dict keyed by hf_id (lower)
    result_by_hf: dict[str, dict[str, Any]] = {}

    # Pre-populate with existing models in their current order
    for m in existing_models:
        key = (m.get("hf_id") or m["id"]).lower()
        result_by_hf[key] = m

    new_added  = 0
    refreshed  = 0
    skipped    = 0

    for idx, repo_id in enumerate(all_ids, 1):
        key      = repo_id.lower()
        existing = existing_by_hf.get(key)

        # Don't exceed new-model cap (refreshes are always allowed)
        if existing is None and new_added >= MAX_NEW_MODELS_PER_RUN:
            continue

        detail = fetch_model_detail(repo_id)
        if not detail:
            skipped += 1
            continue

        tags = detail.get("tags", []) or []
        if has_excluded_signal(repo_id, tags):
            skipped += 1
            continue

        entry = build_model_entry(detail, existing)
        if not entry:
            skipped += 1
            continue

        if existing is None:
            new_added += 1
            result_by_hf[key] = entry
            print(f"  [{idx}/{len(all_ids)}] + NEW     {repo_id}  ({entry['params_b']}B)")
        else:
            refreshed += 1
            result_by_hf[key] = entry
            # Only log refreshes when downloads changed noticeably
            old_dl = existing.get("hf_downloads", 0)
            new_dl = entry.get("hf_downloads", 0)
            if abs(new_dl - old_dl) > old_dl * 0.05:  # >5% change
                print(f"  [{idx}/{len(all_ids)}] ~ REFRESH {repo_id}  "
                      f"downloads: {old_dl:,} → {new_dl:,}")

        # Be polite to the HF API
        time.sleep(0.1)

    # Build final list:
    # 1. Existing models in original order (preserves manual curation)
    # 2. New models appended at the end, sorted by (release_date DESC, params_b, name)
    existing_keys = {(m.get("hf_id") or m["id"]).lower() for m in existing_models}
    new_entries = [
        v for k, v in result_by_hf.items() if k not in existing_keys
    ]
    new_entries.sort(
        key=lambda m: (m.get("release_date", ""), float(m.get("params_b") or 0)),
    )

    final_models: list[dict[str, Any]] = []
    # Existing in original order (updated in-place)
    for m in existing_models:
        key = (m.get("hf_id") or m["id"]).lower()
        final_models.append(result_by_hf.get(key, m))
    # New entries appended
    final_models.extend(new_entries)

    # --- Write models.json ---
    new_json = json.dumps(final_models, indent=2, ensure_ascii=False) + "\n"
    old_json = MODELS_PATH.read_text(encoding="utf-8") if MODELS_PATH.exists() else ""

    if old_json == new_json:
        print("[done] models.json unchanged")
    else:
        MODELS_PATH.write_text(new_json, encoding="utf-8")
        print(f"[done] wrote {MODELS_PATH}  ({len(existing_models)} → {len(final_models)} models)")

    # NOTE: frontend stat counts (AI Models, GPU Types, "GPUs & Models Supported")
    # are no longer hardcoded in TSX files. They are read dynamically from the
    # JSON files at build time via src/lib/datasetStats.ts.
    # No patching of page.tsx or enterprise/page.tsx is needed here.

    # --- Final summary ---
    print()
    print("=" * 60)
    print(f"  Models :  {len(existing_models):4d} → {len(final_models):4d}  "
          f"(+{new_added} new, {refreshed} refreshed, {skipped} skipped)")
    print(f"  GPUs   :  {gpu_count}")
    print("=" * 60)


if __name__ == "__main__":
    main()
