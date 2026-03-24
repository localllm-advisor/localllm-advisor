#!/usr/bin/env python3
"""
Scraper per modelli LLM da HuggingFace.
Fetches model metadata e computa requisiti RAM/VRAM.

Usage:
  python scripts/scrape_hf_models.py                  # Lista curata
  python scripts/scrape_hf_models.py --discover       # + trending models
  python scripts/scrape_hf_models.py --merge          # Merge con models.json esistente
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

HF_API = "https://huggingface.co/api/models"
DATA_DIR = Path(__file__).parent.parent / "public" / "data"

# Auth token opzionale per modelli gated
_hf_token: str | None = None


def _auth_headers() -> dict[str, str]:
    """HTTP headers con auth se disponibile."""
    headers = {"User-Agent": "llmadvisor-scraper/1.0"}
    if _hf_token:
        headers["Authorization"] = f"Bearer {_hf_token}"
    return headers


# ============================================================
# MODELLI DA SCRAPARE
# ============================================================

TARGET_MODELS = [
    # Meta Llama family
    "meta-llama/Llama-3.1-8B",
    "meta-llama/Llama-3.1-8B-Instruct",
    "meta-llama/Llama-3.1-70B-Instruct",
    "meta-llama/Llama-3.1-405B-Instruct",
    "meta-llama/Llama-3.2-1B",
    "meta-llama/Llama-3.2-3B",
    "meta-llama/Llama-3.2-11B-Vision-Instruct",
    "meta-llama/Llama-3.3-70B-Instruct",
    # Llama 4 MoE
    "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    "meta-llama/Llama-4-Maverick-17B-128E-Instruct",
    # Code Llama
    "meta-llama/CodeLlama-7b-Instruct-hf",
    "meta-llama/CodeLlama-13b-Instruct-hf",
    "meta-llama/CodeLlama-34b-Instruct-hf",

    # Mistral
    "mistralai/Mistral-7B-Instruct-v0.3",
    "mistralai/Mixtral-8x7B-Instruct-v0.1",
    "mistralai/Mixtral-8x22B-Instruct-v0.1",
    "mistralai/Mistral-Large-Instruct-2407",
    "mistralai/Mistral-Small-24B-Instruct-2501",
    "mistralai/Mistral-Small-3.1-24B-Instruct-2503",
    "mistralai/Ministral-8B-Instruct-2410",
    "mistralai/Mistral-Nemo-Instruct-2407",

    # Qwen
    "Qwen/Qwen2.5-7B-Instruct",
    "Qwen/Qwen2.5-14B-Instruct",
    "Qwen/Qwen2.5-32B-Instruct",
    "Qwen/Qwen2.5-72B-Instruct",
    "Qwen/Qwen2.5-Coder-1.5B-Instruct",
    "Qwen/Qwen2.5-Coder-7B-Instruct",
    "Qwen/Qwen2.5-Coder-14B-Instruct",
    "Qwen/Qwen2.5-Coder-32B-Instruct",
    "Qwen/Qwen2.5-VL-3B-Instruct",
    "Qwen/Qwen2.5-VL-7B-Instruct",
    "Qwen/Qwen3-0.6B",
    "Qwen/Qwen3-1.7B",
    "Qwen/Qwen3-4B",
    "Qwen/Qwen3-8B",
    "Qwen/Qwen3-14B",
    "Qwen/Qwen3-32B",
    "Qwen/Qwen3-30B-A3B",
    "Qwen/Qwen3-235B-A22B",
    "Qwen/Qwen3-Coder-480B-A35B-Instruct",
    # Qwen 3.5
    "Qwen/Qwen3.5-27B",
    "Qwen/Qwen3.5-35B-A3B",
    "Qwen/Qwen3.5-122B-A10B",
    "Qwen/Qwen3.5-397B-A17B",
    "Qwen/Qwen3.5-0.8B",
    "Qwen/Qwen3.5-2B",
    "Qwen/Qwen3.5-4B",
    "Qwen/Qwen3.5-9B",

    # Microsoft Phi
    "microsoft/phi-3-mini-4k-instruct",
    "microsoft/Phi-3-medium-14b-instruct",
    "microsoft/Phi-3.5-mini-instruct",
    "microsoft/phi-4",
    "microsoft/Phi-4-mini-instruct",
    "microsoft/Phi-4-reasoning",
    "microsoft/Phi-4-mini-reasoning",
    "microsoft/Phi-4-multimodal-instruct",
    "microsoft/Orca-2-7b",
    "microsoft/Orca-2-13b",

    # Google Gemma
    "google/gemma-2-2b-it",
    "google/gemma-2-9b-it",
    "google/gemma-2-27b-it",
    "google/gemma-3-1b-it",
    "google/gemma-3-4b-it",
    "google/gemma-3-12b-it",
    "google/gemma-3-27b-it",
    "google/gemma-3n-E4B-it",
    "google/gemma-3n-E2B-it",

    # DeepSeek
    "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
    "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B",
    "deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct",
    "deepseek-ai/DeepSeek-V3",
    "deepseek-ai/DeepSeek-R1",
    "deepseek-ai/DeepSeek-V3.2",
    "deepseek-ai/DeepSeek-V3.2-Speciale",

    # Cohere
    "CohereForAI/c4ai-command-r-v01",

    # 01.ai Yi
    "01-ai/Yi-6B-Chat",
    "01-ai/Yi-34B-Chat",

    # Upstage
    "upstage/SOLAR-10.7B-Instruct-v1.0",

    # TII Falcon
    "tiiuae/falcon-7b-instruct",
    "tiiuae/falcon-40b-instruct",
    "tiiuae/falcon-180B-chat",
    "tiiuae/Falcon3-7B-Instruct",
    "tiiuae/Falcon3-10B-Instruct",

    # HuggingFace
    "HuggingFaceH4/zephyr-7b-beta",
    "HuggingFaceTB/SmolLM3-3B",

    # OpenChat
    "openchat/openchat-3.5-0106",

    # LMSYS
    "lmsys/vicuna-7b-v1.5",
    "lmsys/vicuna-13b-v1.5",

    # NousResearch
    "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO",

    # WizardLM
    "WizardLMTeam/WizardLM-13B-V1.2",
    "WizardLMTeam/WizardCoder-15B-V1.0",

    # Code models
    "bigcode/starcoder2-7b",
    "bigcode/starcoder2-15b",

    # Small / edge
    "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
    "stabilityai/stablelm-2-1_6b-chat",

    # IBM Granite
    "ibm-granite/granite-3.1-8b-instruct",
    "ibm-granite/granite-4.0-h-tiny",
    "ibm-granite/granite-4.0-h-micro",
    "ibm-granite/granite-4.0-h-small",

    # Allen Institute
    "allenai/OLMo-2-0325-32B-Instruct",

    # Zhipu GLM
    "THUDM/glm-4-9b-chat",
    "zai-org/GLM-5",

    # xAI
    "xai-org/grok-1",

    # Moonshot
    "moonshotai/Kimi-K2-Instruct",
    "moonshotai/Kimi-K2.5",

    # MiniMax
    "MiniMaxAI/MiniMax-M2.5",

    # Xiaomi
    "XiaomiMiMo/MiMo-V2-Flash",
    "XiaomiMiMo/MiMo-7B-RL",

    # NVIDIA
    "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16",
    "nvidia/NVIDIA-Nemotron-Nano-9B-v2",

    # LG AI
    "LGAI-EXAONE/EXAONE-4.0-32B",
    "LGAI-EXAONE/EXAONE-4.0-1.2B",

    # Baidu
    "baidu/ERNIE-4.5-300B-A47B-Paddle",

    # Other
    "bigscience/bloom",
    "rednote-hilab/dots.llm1.inst",
    "meituan/LongCat-Flash",
    "inclusionAI/Ling-lite",

    # Embeddings
    "nomic-ai/nomic-embed-text-v1.5",
    "BAAI/bge-large-en-v1.5",
]

# BPW per quantizzazione
QUANT_BPW = {
    "F32": 4.0,
    "F16": 2.0,
    "BF16": 2.0,
    "Q8_0": 1.0,
    "Q6_K": 0.75,
    "Q5_K_M": 0.625,
    "Q4_K_M": 0.5,
    "Q4_0": 0.5,
    "Q3_K_M": 0.4375,
    "Q2_K": 0.3125,
}

RUNTIME_OVERHEAD = 1.2

# MoE configurations note
MOE_CONFIGS = {
    "mixtral": {"num_experts": 8, "active_experts": 2},
    "deepseek_v2": {"num_experts": 64, "active_experts": 6},
    "deepseek_v3": {"num_experts": 256, "active_experts": 8},
    "qwen3_moe": {"num_experts": 128, "active_experts": 8},
    "llama4": {"num_experts": 16, "active_experts": 1},
    "grok": {"num_experts": 8, "active_experts": 2},
}

# Active parameters per modelli MoE conosciuti
MOE_ACTIVE_PARAMS = {
    "mistralai/Mixtral-8x7B-Instruct-v0.1": 12_900_000_000,
    "mistralai/Mixtral-8x22B-Instruct-v0.1": 39_100_000_000,
    "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO": 12_900_000_000,
    "deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct": 2_400_000_000,
    "deepseek-ai/DeepSeek-V3": 37_000_000_000,
    "deepseek-ai/DeepSeek-R1": 37_000_000_000,
    "deepseek-ai/DeepSeek-V3.2": 37_000_000_000,
    "Qwen/Qwen3-30B-A3B": 3_300_000_000,
    "Qwen/Qwen3-235B-A22B": 22_000_000_000,
    "Qwen/Qwen3-Coder-480B-A35B-Instruct": 35_000_000_000,
    "Qwen/Qwen3.5-35B-A3B": 3_000_000_000,
    "Qwen/Qwen3.5-122B-A10B": 10_000_000_000,
    "Qwen/Qwen3.5-397B-A17B": 17_000_000_000,
    "meta-llama/Llama-4-Scout-17B-16E-Instruct": 17_000_000_000,
    "meta-llama/Llama-4-Maverick-17B-128E-Instruct": 17_000_000_000,
    "xai-org/grok-1": 86_000_000_000,
    "moonshotai/Kimi-K2-Instruct": 32_000_000_000,
}


# ============================================================
# SCRAPING
# ============================================================

def fetch_model_info(repo_id: str) -> dict | None:
    """Fetch model info da HuggingFace API."""
    url = f"{HF_API}/{repo_id}"
    req = urllib.request.Request(url, headers=_auth_headers())
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        if e.code == 401 and not _hf_token:
            print(f"  ⚠ HTTP 401 for {repo_id} — gated model, set HF_TOKEN")
        else:
            print(f"  ⚠ HTTP {e.code} for {repo_id}")
        return None
    except Exception as e:
        print(f"  ⚠ Error: {e}")
        return None


def fetch_config_json(repo_id: str) -> dict | None:
    """Fetch config.json per context length accurato."""
    url = f"https://huggingface.co/{repo_id}/resolve/main/config.json"
    req = urllib.request.Request(url, headers=_auth_headers())
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except Exception:
        return None


def format_param_count(total_params: int) -> str:
    """Formatta parametri in formato leggibile."""
    if total_params >= 1_000_000_000:
        val = total_params / 1_000_000_000
        return f"{val:.1f}B" if val != int(val) else f"{int(val)}B"
    elif total_params >= 1_000_000:
        val = total_params / 1_000_000
        return f"{val:.0f}M"
    else:
        return f"{total_params / 1_000:.0f}K"


def estimate_ram(total_params: int, quant: str) -> tuple[float, float]:
    """Stima RAM minima e raccomandata."""
    bpp = QUANT_BPW.get(quant, 0.5)
    model_size_gb = (total_params * bpp) / (1024**3)
    min_ram = model_size_gb * RUNTIME_OVERHEAD
    rec_ram = model_size_gb * 2.0
    return max(round(min_ram, 1), 1.0), max(round(rec_ram, 1), 2.0)


def estimate_vram(total_params: int, quant: str) -> float:
    """Stima VRAM minima."""
    bpp = QUANT_BPW.get(quant, 0.5)
    model_size_gb = (total_params * bpp) / (1024**3)
    return round(max(model_size_gb * 1.1, 0.5), 1)


def infer_context_length(config: dict | None) -> int:
    """Estrai context length da config."""
    if not config:
        return 4096

    keys = ["max_position_embeddings", "max_sequence_length", "seq_length", "n_positions"]

    for key in keys:
        if key in config:
            val = config[key]
            if isinstance(val, int) and val > 0:
                return val

    # Check text_config per modelli multimodali
    if "text_config" in config and isinstance(config["text_config"], dict):
        for key in keys:
            if key in config["text_config"]:
                val = config["text_config"][key]
                if isinstance(val, int) and val > 0:
                    return val

    return 4096


def extract_provider(repo_id: str) -> str:
    """Mappa org HF a nome provider."""
    org = repo_id.split("/")[0].lower()
    mapping = {
        "meta-llama": "Meta",
        "mistralai": "Mistral AI",
        "qwen": "Alibaba",
        "microsoft": "Microsoft",
        "google": "Google",
        "deepseek-ai": "DeepSeek",
        "bigcode": "BigCode",
        "cohereforai": "Cohere",
        "tinyllama": "Community",
        "stabilityai": "Stability AI",
        "nomic-ai": "Nomic",
        "baai": "BAAI",
        "01-ai": "01.ai",
        "upstage": "Upstage",
        "tiiuae": "TII",
        "huggingfaceh4": "HuggingFace",
        "huggingfacetb": "HuggingFace",
        "openchat": "OpenChat",
        "lmsys": "LMSYS",
        "nousresearch": "NousResearch",
        "wizardlmteam": "WizardLM",
        "ibm-granite": "IBM",
        "allenai": "Allen Institute",
        "thudm": "Zhipu AI",
        "zai-org": "Zhipu AI",
        "xai-org": "xAI",
        "moonshotai": "Moonshot",
        "minimaxai": "MiniMax",
        "xiaomimimo": "Xiaomi",
        "nvidia": "NVIDIA",
        "lgai-exaone": "LG AI",
        "baidu": "Baidu",
        "bigscience": "BigScience",
        "rednote-hilab": "Rednote",
        "meituan": "Meituan",
        "inclusionai": "Ant Group",
    }
    return mapping.get(org, org.title())


def infer_use_case(repo_id: str, pipeline_tag: str | None) -> str:
    """Inferisci use case dal nome."""
    rid = repo_id.lower()
    if "embed" in rid or "bge" in rid:
        return "embeddings"
    if "coder" in rid or "starcoder" in rid or "code" in rid:
        return "coding"
    if "r1" in rid or "reason" in rid:
        return "reasoning"
    if "vision" in rid or "-vl-" in rid or "multimodal" in rid:
        return "vision"
    if "instruct" in rid or "chat" in rid:
        return "chat"
    return "general"


def infer_capabilities(repo_id: str, pipeline_tag: str | None, use_case: str) -> list[str]:
    """Inferisci capabilities del modello."""
    caps = ["chat"]  # Base
    rid = repo_id.lower()

    if use_case == "coding" or "coder" in rid or "code" in rid:
        caps.append("coding")

    if use_case == "reasoning" or "r1" in rid or "reason" in rid:
        caps.append("reasoning")

    if use_case == "vision" or "vision" in rid or "-vl-" in rid or "multimodal" in rid:
        caps.append("vision")

    # Tool use per modelli noti
    if any(x in rid for x in ["qwen2.5", "qwen3", "llama-3", "mistral", "command-r"]):
        if "instruct" in rid:
            caps.append("tool_use")

    return list(set(caps))


def detect_moe(repo_id: str, config: dict | None, architecture: str, total_params: int) -> dict:
    """Rileva architettura MoE."""
    result = {
        "is_moe": False,
        "num_experts": None,
        "active_experts": None,
        "active_parameters": None,
    }

    num_experts = None
    active_experts = None

    if config:
        num_experts = config.get("num_local_experts") or config.get("num_experts")
        active_experts = config.get("num_experts_per_tok")

    if architecture in MOE_CONFIGS:
        moe = MOE_CONFIGS[architecture]
        num_experts = num_experts or moe["num_experts"]
        active_experts = active_experts or moe["active_experts"]

    if num_experts and active_experts:
        result["is_moe"] = True
        result["num_experts"] = num_experts
        result["active_experts"] = active_experts

        if repo_id in MOE_ACTIVE_PARAMS:
            result["active_parameters"] = MOE_ACTIVE_PARAMS[repo_id]
        else:
            # Stima: shared ~5%, rest è expert pool
            shared = int(total_params * 0.05)
            per_expert = (total_params - shared) // num_experts
            result["active_parameters"] = shared + active_experts * per_expert

    return result


def get_ollama_mapping(repo_id: str, params_b: float) -> str | None:
    """Mappa repo HF a tag Ollama."""
    rid = repo_id.lower()

    # Mappature specifiche
    mappings = {
        "meta-llama/llama-3.1-8b-instruct": "llama3.1:8b",
        "meta-llama/llama-3.1-70b-instruct": "llama3.1:70b",
        "meta-llama/llama-3.2-1b": "llama3.2:1b",
        "meta-llama/llama-3.2-3b": "llama3.2:3b",
        "meta-llama/llama-3.3-70b-instruct": "llama3.3:70b",
        "qwen/qwen2.5-7b-instruct": "qwen2.5:7b",
        "qwen/qwen2.5-14b-instruct": "qwen2.5:14b",
        "qwen/qwen2.5-32b-instruct": "qwen2.5:32b",
        "qwen/qwen2.5-72b-instruct": "qwen2.5:72b",
        "qwen/qwen2.5-coder-7b-instruct": "qwen2.5-coder:7b",
        "qwen/qwen2.5-coder-14b-instruct": "qwen2.5-coder:14b",
        "qwen/qwen2.5-coder-32b-instruct": "qwen2.5-coder:32b",
        "mistralai/mistral-7b-instruct-v0.3": "mistral:7b",
        "mistralai/mixtral-8x7b-instruct-v0.1": "mixtral:8x7b",
        "mistralai/mistral-nemo-instruct-2407": "mistral-nemo:12b",
        "mistralai/mistral-small-24b-instruct-2501": "mistral-small:24b",
        "google/gemma-2-2b-it": "gemma2:2b",
        "google/gemma-2-9b-it": "gemma2:9b",
        "google/gemma-2-27b-it": "gemma2:27b",
        "microsoft/phi-4": "phi4:14b",
        "deepseek-ai/deepseek-r1": "deepseek-r1:latest",
        "deepseek-ai/deepseek-v3": "deepseek-v3:latest",
    }

    return mappings.get(rid.lower())


def scrape_model(repo_id: str) -> dict | None:
    """Scrape un singolo modello."""
    info = fetch_model_info(repo_id)
    if not info:
        return None

    # Estrai parametri
    safetensors = info.get("safetensors", {})
    total_params = safetensors.get("total")
    if not total_params:
        params_by_dtype = safetensors.get("parameters", {})
        if params_by_dtype:
            total_params = max(params_by_dtype.values())

    if not total_params:
        print(f"  ⚠ No params for {repo_id}")
        return None

    config = info.get("config", {})
    pipeline_tag = info.get("pipeline_tag")
    default_quant = "Q4_K_M"

    full_config = fetch_config_json(repo_id)
    context_length = infer_context_length(full_config or config)

    min_ram, rec_ram = estimate_ram(total_params, default_quant)
    min_vram = estimate_vram(total_params, default_quant)

    architecture = config.get("model_type", "unknown")
    moe_info = detect_moe(repo_id, full_config, architecture, total_params)
    use_case = infer_use_case(repo_id, pipeline_tag)

    params_b = total_params / 1_000_000_000

    result = {
        "hf_id": repo_id,
        "name": repo_id.split("/")[-1],
        "provider": extract_provider(repo_id),
        "params_b": round(params_b, 1),
        "parameters_raw": total_params,
        "min_ram_gb": min_ram,
        "recommended_ram_gb": rec_ram,
        "min_vram_gb": min_vram,
        "default_quant": default_quant,
        "context_length": context_length,
        "use_case": use_case,
        "capabilities": infer_capabilities(repo_id, pipeline_tag, use_case),
        "pipeline_tag": pipeline_tag or "unknown",
        "architecture": "moe" if moe_info["is_moe"] else "dense",
        "hf_downloads": info.get("downloads", 0),
        "hf_likes": info.get("likes", 0),
        "release_date": (info.get("createdAt") or "")[:10] or None,
        "ollama_tag": get_ollama_mapping(repo_id, params_b),
    }

    if moe_info["is_moe"]:
        result["num_experts"] = moe_info["num_experts"]
        result["active_experts"] = moe_info["active_experts"]
        result["active_parameters"] = moe_info["active_parameters"]

    return result


# ============================================================
# GGUF SOURCES
# ============================================================

GGUF_PROVIDERS = ["unsloth", "bartowski"]


def check_gguf_repo_exists(repo_id: str) -> bool:
    """Verifica se esiste un repo GGUF."""
    url = f"{HF_API}/{repo_id}"
    req = urllib.request.Request(url, headers=_auth_headers())
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            info = json.loads(resp.read().decode())
            return "gguf" in info.get("tags", [])
    except Exception:
        return False


def enrich_gguf_sources(models: list[dict]) -> int:
    """Aggiungi gguf_sources ai modelli."""
    enriched = 0

    for i, model in enumerate(models, 1):
        model_name = model["hf_id"].split("/")[-1]
        sources = []

        for provider in GGUF_PROVIDERS:
            candidate = f"{provider}/{model_name}-GGUF"
            print(f"  [{i}/{len(models)}] Checking {candidate}...", end="")

            if check_gguf_repo_exists(candidate):
                sources.append({"repo": candidate, "provider": provider})
                print(" ✓")
            else:
                print(" ✗")

            time.sleep(0.1)

        if sources:
            model["gguf_sources"] = sources
            enriched += 1

    return enriched


# ============================================================
# DISCOVERY
# ============================================================

SKIP_ORGS = {"TheBloke", "unsloth", "mlx-community", "bartowski", "mradermacher"}


def discover_trending_models(limit: int = 30, min_downloads: int = 10000) -> list[str]:
    """Scopri modelli trending da HF."""
    curated = set(TARGET_MODELS)
    discovered = []

    for pipeline in ["text-generation"]:
        url = f"{HF_API}?pipeline_tag={pipeline}&sort=downloads&direction=-1&limit={limit * 5}"
        req = urllib.request.Request(url, headers=_auth_headers())

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                models = json.loads(resp.read().decode())
        except Exception as e:
            print(f"  ⚠ Discovery failed: {e}")
            continue

        for m in models:
            repo_id = m.get("id", "")
            if not repo_id or "/" not in repo_id:
                continue

            if repo_id in curated or repo_id in discovered:
                continue

            org = repo_id.split("/")[0]
            if org in SKIP_ORGS:
                continue

            if m.get("downloads", 0) < min_downloads:
                continue

            tags = set(m.get("tags", []))
            if tags & {"gguf", "adapter", "merge", "lora"}:
                continue

            if "safetensors" not in tags:
                continue

            discovered.append(repo_id)
            if len(discovered) >= limit:
                break

    return discovered[:limit]


# ============================================================
# FALLBACKS per modelli gated senza parametri nell'API
# ============================================================

FALLBACKS = [
    # Llama 3.1
    {"hf_id": "meta-llama/Llama-3.1-8B", "params_b": 8.0, "context_length": 131072,
     "provider": "Meta", "use_case": "general", "architecture": "dense"},
    {"hf_id": "meta-llama/Llama-3.1-8B-Instruct", "params_b": 8.0, "context_length": 131072,
     "provider": "Meta", "use_case": "chat", "architecture": "dense"},
    {"hf_id": "meta-llama/Llama-3.3-70B-Instruct", "params_b": 70.6, "context_length": 131072,
     "provider": "Meta", "use_case": "chat", "architecture": "dense"},
    {"hf_id": "meta-llama/Llama-3.2-11B-Vision-Instruct", "params_b": 10.7, "context_length": 131072,
     "provider": "Meta", "use_case": "vision", "architecture": "dense"},
    # Llama 4 MoE
    {"hf_id": "meta-llama/Llama-4-Scout-17B-16E-Instruct", "params_b": 109.0, "context_length": 131072,
     "provider": "Meta", "use_case": "vision", "architecture": "moe",
     "num_experts": 16, "active_experts": 1, "active_parameters": 17_000_000_000},
    # Mistral
    {"hf_id": "mistralai/Mistral-Large-Instruct-2407", "params_b": 123.0, "context_length": 131072,
     "provider": "Mistral AI", "use_case": "chat", "architecture": "dense"},
    {"hf_id": "mistralai/Mistral-Small-24B-Instruct-2501", "params_b": 24.0, "context_length": 32768,
     "provider": "Mistral AI", "use_case": "chat", "architecture": "dense"},
    {"hf_id": "mistralai/Mistral-Small-3.1-24B-Instruct-2503", "params_b": 24.0, "context_length": 131072,
     "provider": "Mistral AI", "use_case": "vision", "architecture": "dense"},
    {"hf_id": "mistralai/Ministral-8B-Instruct-2410", "params_b": 8.0, "context_length": 32768,
     "provider": "Mistral AI", "use_case": "chat", "architecture": "dense"},
    {"hf_id": "mistralai/Mistral-Nemo-Instruct-2407", "params_b": 12.2, "context_length": 131072,
     "provider": "Mistral AI", "use_case": "chat", "architecture": "dense"},
    # Qwen
    {"hf_id": "Qwen/Qwen2.5-14B-Instruct", "params_b": 14.8, "context_length": 131072,
     "provider": "Alibaba", "use_case": "chat", "architecture": "dense"},
    {"hf_id": "Qwen/Qwen2.5-32B-Instruct", "params_b": 32.5, "context_length": 131072,
     "provider": "Alibaba", "use_case": "chat", "architecture": "dense"},
    # Microsoft
    {"hf_id": "microsoft/phi-3-mini-4k-instruct", "params_b": 3.8, "context_length": 4096,
     "provider": "Microsoft", "use_case": "chat", "architecture": "dense"},
    {"hf_id": "microsoft/Phi-3-medium-14b-instruct", "params_b": 14.0, "context_length": 4096,
     "provider": "Microsoft", "use_case": "chat", "architecture": "dense"},
    {"hf_id": "microsoft/phi-4", "params_b": 14.0, "context_length": 16384,
     "provider": "Microsoft", "use_case": "reasoning", "architecture": "dense"},
    {"hf_id": "microsoft/Phi-4-reasoning", "params_b": 14.0, "context_length": 32768,
     "provider": "Microsoft", "use_case": "reasoning", "architecture": "dense"},
    {"hf_id": "microsoft/Phi-4-multimodal-instruct", "params_b": 14.0, "context_length": 131072,
     "provider": "Microsoft", "use_case": "vision", "architecture": "dense"},
    # Google
    {"hf_id": "google/gemma-3-12b-it", "params_b": 12.0, "context_length": 131072,
     "provider": "Google", "use_case": "vision", "architecture": "dense"},
    # DeepSeek
    {"hf_id": "deepseek-ai/DeepSeek-V3", "params_b": 685.0, "context_length": 131072,
     "provider": "DeepSeek", "use_case": "chat", "architecture": "moe",
     "num_experts": 256, "active_experts": 8, "active_parameters": 37_000_000_000},
    {"hf_id": "deepseek-ai/DeepSeek-V3.2", "params_b": 685.0, "context_length": 131072,
     "provider": "DeepSeek", "use_case": "chat", "architecture": "moe",
     "num_experts": 256, "active_experts": 8, "active_parameters": 37_000_000_000},
    # Cohere
    {"hf_id": "CohereForAI/c4ai-command-r-v01", "params_b": 35.0, "context_length": 131072,
     "provider": "Cohere", "use_case": "chat", "architecture": "dense"},
    # BAAI
    {"hf_id": "BAAI/bge-large-en-v1.5", "params_b": 0.335, "context_length": 512,
     "provider": "BAAI", "use_case": "embeddings", "architecture": "dense"},
    # LG AI
    {"hf_id": "LGAI-EXAONE/EXAONE-4.0-32B", "params_b": 32.0, "context_length": 131072,
     "provider": "LG AI", "use_case": "chat", "architecture": "dense"},
    # Xiaomi
    {"hf_id": "XiaomiMiMo/MiMo-7B-RL", "params_b": 7.0, "context_length": 32768,
     "provider": "Xiaomi", "use_case": "reasoning", "architecture": "dense"},
]


def make_fallback_model(fb: dict) -> dict:
    """Crea modello da fallback."""
    params_b = fb["params_b"]
    total_params = int(params_b * 1_000_000_000)
    min_ram, rec_ram = estimate_ram(total_params, "Q4_K_M")
    min_vram = estimate_vram(total_params, "Q4_K_M")

    result = {
        "hf_id": fb["hf_id"],
        "name": fb["hf_id"].split("/")[-1],
        "provider": fb["provider"],
        "params_b": params_b,
        "parameters_raw": total_params,
        "min_ram_gb": min_ram,
        "recommended_ram_gb": rec_ram,
        "min_vram_gb": min_vram,
        "default_quant": "Q4_K_M",
        "context_length": fb["context_length"],
        "use_case": fb["use_case"],
        "capabilities": infer_capabilities(fb["hf_id"], None, fb["use_case"]),
        "pipeline_tag": "text-generation",
        "architecture": fb["architecture"],
        "hf_downloads": 0,
        "hf_likes": 0,
        "release_date": None,
        "ollama_tag": get_ollama_mapping(fb["hf_id"], params_b),
        "_fallback": True,
    }

    if fb.get("num_experts"):
        result["num_experts"] = fb["num_experts"]
        result["active_experts"] = fb["active_experts"]
        result["active_parameters"] = fb["active_parameters"]

    return result


# ============================================================
# MAIN
# ============================================================

def main():
    parser = argparse.ArgumentParser(description="Scrape LLM models from HuggingFace")
    parser.add_argument("--discover", action="store_true", help="Discover trending models")
    parser.add_argument("-n", "--discover-limit", type=int, default=30)
    parser.add_argument("--min-downloads", type=int, default=10000)
    parser.add_argument("--gguf-sources", action="store_true", default=True)
    parser.add_argument("--no-gguf-sources", dest="gguf_sources", action="store_false")
    parser.add_argument("--token", type=str, default=None)
    parser.add_argument("--merge", action="store_true", help="Merge con models.json esistente")
    args = parser.parse_args()

    global _hf_token
    _hf_token = args.token or os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")

    if _hf_token:
        print(f"🔑 Auth token: {_hf_token[:4]}...{_hf_token[-4:]}")
    else:
        print("ℹ No HF token. Gated models may fail.")

    print(f"\n📥 Scraping {len(TARGET_MODELS)} models from HuggingFace...\n")

    results = []
    scraped_ids = set()

    for i, repo_id in enumerate(TARGET_MODELS, 1):
        print(f"[{i}/{len(TARGET_MODELS)}] {repo_id}...")
        model = scrape_model(repo_id)
        if model:
            print(f"  ✓ {model['params_b']}B, ctx {model['context_length']}, vram {model['min_vram_gb']}GB")
            results.append(model)
            scraped_ids.add(repo_id)
        time.sleep(0.3)

    # Aggiungi fallback per modelli mancanti
    fallback_count = 0
    for fb in FALLBACKS:
        if fb["hf_id"] not in scraped_ids:
            model = make_fallback_model(fb)
            results.append(model)
            scraped_ids.add(fb["hf_id"])
            fallback_count += 1
            print(f"  + Fallback: {fb['hf_id']} ({fb['params_b']}B)")

    if fallback_count > 0:
        print(f"\n📋 Added {fallback_count} fallback models")

    # Discovery
    if args.discover:
        print(f"\n🔍 Discovering trending models...")
        trending = discover_trending_models(args.discover_limit, args.min_downloads)
        print(f"  Found {len(trending)} new models\n")

        for i, repo_id in enumerate(trending, 1):
            print(f"[discover {i}/{len(trending)}] {repo_id}...")
            model = scrape_model(repo_id)
            if model:
                model["_discovered"] = True
                print(f"  ✓ {model['params_b']}B, {model['hf_downloads']:,} downloads")
                results.append(model)
            time.sleep(0.3)

    # Sort
    results.sort(key=lambda m: m["parameters_raw"])

    # GGUF sources
    if args.gguf_sources:
        print(f"\n📦 Checking GGUF sources...")
        gguf_count = enrich_gguf_sources(results)
        print(f"  Found GGUF for {gguf_count} models")

    # Write
    output_path = DATA_DIR / "hf_models.json"
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n✅ Wrote {len(results)} models to {output_path}")

    # Summary
    print("\n📊 Summary by provider:")
    providers = {}
    for m in results:
        p = m["provider"]
        providers[p] = providers.get(p, 0) + 1

    for p, count in sorted(providers.items(), key=lambda x: -x[1]):
        print(f"  {p}: {count}")


if __name__ == "__main__":
    main()
