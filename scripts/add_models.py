#!/usr/bin/env python3
"""
Add popular missing models to models.json
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "public" / "data"

# VRAM calculation: params_b * bpw / 8 * 1024 + overhead (500MB)
def calc_vram(params_b: float, bpw: float) -> int:
    return round(params_b * bpw / 8 * 1024) + 500

def make_quants(params_b: float, ollama_base: str) -> list:
    """Generate standard quantizations"""
    return [
        {
            "level": "Q4_K_M",
            "bpw": 4.5,
            "vram_mb": calc_vram(params_b, 4.5),
            "quality": 0.94,
            "ollama_tag": f"{ollama_base}-q4_k_m" if not ollama_base.endswith("b") else f"{ollama_base}:q4_k_m"
        },
        {
            "level": "Q6_K",
            "bpw": 6.5,
            "vram_mb": calc_vram(params_b, 6.5),
            "quality": 0.97,
            "ollama_tag": f"{ollama_base}-q6_k" if not ollama_base.endswith("b") else f"{ollama_base}:q6_k"
        },
        {
            "level": "Q8_0",
            "bpw": 8.0,
            "vram_mb": calc_vram(params_b, 8.0),
            "quality": 0.995,
            "ollama_tag": f"{ollama_base}-q8_0" if not ollama_base.endswith("b") else f"{ollama_base}:q8_0"
        },
        {
            "level": "FP16",
            "bpw": 16.0,
            "vram_mb": calc_vram(params_b, 16.0),
            "quality": 1.0,
            "ollama_tag": f"{ollama_base}-fp16" if not ollama_base.endswith("b") else f"{ollama_base}:fp16"
        }
    ]

def empty_benchmarks():
    return {
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
        "mmbench": None
    }

# New models to add
NEW_MODELS = [
    # Llama 2 (still popular)
    {
        "id": "llama2-7b",
        "name": "Llama 2 7B",
        "family": "llama",
        "params_b": 7.0,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 4096,
        "release_date": "2023-07-18",
        "ollama_base": "llama2:7b",
        "hf_id": "meta-llama/Llama-2-7b-chat-hf",
        "provider": "Meta"
    },
    {
        "id": "llama2-13b",
        "name": "Llama 2 13B",
        "family": "llama",
        "params_b": 13.0,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 4096,
        "release_date": "2023-07-18",
        "ollama_base": "llama2:13b",
        "hf_id": "meta-llama/Llama-2-13b-chat-hf",
        "provider": "Meta"
    },
    {
        "id": "llama2-70b",
        "name": "Llama 2 70B",
        "family": "llama",
        "params_b": 70.0,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 4096,
        "release_date": "2023-07-18",
        "ollama_base": "llama2:70b",
        "hf_id": "meta-llama/Llama-2-70b-chat-hf",
        "provider": "Meta"
    },

    # CodeLlama
    {
        "id": "codellama-7b",
        "name": "CodeLlama 7B",
        "family": "llama",
        "params_b": 7.0,
        "architecture": "dense",
        "capabilities": ["coding"],
        "context_length": 16384,
        "release_date": "2023-08-24",
        "ollama_base": "codellama:7b",
        "hf_id": "meta-llama/CodeLlama-7b-Instruct-hf",
        "provider": "Meta"
    },
    {
        "id": "codellama-13b",
        "name": "CodeLlama 13B",
        "family": "llama",
        "params_b": 13.0,
        "architecture": "dense",
        "capabilities": ["coding"],
        "context_length": 16384,
        "release_date": "2023-08-24",
        "ollama_base": "codellama:13b",
        "hf_id": "meta-llama/CodeLlama-13b-Instruct-hf",
        "provider": "Meta"
    },
    {
        "id": "codellama-34b",
        "name": "CodeLlama 34B",
        "family": "llama",
        "params_b": 34.0,
        "architecture": "dense",
        "capabilities": ["coding"],
        "context_length": 16384,
        "release_date": "2023-08-24",
        "ollama_base": "codellama:34b",
        "hf_id": "meta-llama/CodeLlama-34b-Instruct-hf",
        "provider": "Meta"
    },
    {
        "id": "codellama-70b",
        "name": "CodeLlama 70B",
        "family": "llama",
        "params_b": 70.0,
        "architecture": "dense",
        "capabilities": ["coding"],
        "context_length": 16384,
        "release_date": "2024-01-29",
        "ollama_base": "codellama:70b",
        "hf_id": "meta-llama/CodeLlama-70b-Instruct-hf",
        "provider": "Meta"
    },

    # TinyLlama
    {
        "id": "tinyllama-1.1b",
        "name": "TinyLlama 1.1B",
        "family": "llama",
        "params_b": 1.1,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 2048,
        "release_date": "2024-01-08",
        "ollama_base": "tinyllama:1.1b",
        "hf_id": "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
        "provider": "TinyLlama"
    },

    # SmolLM
    {
        "id": "smollm-135m",
        "name": "SmolLM 135M",
        "family": "other",
        "params_b": 0.135,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 2048,
        "release_date": "2024-07-01",
        "ollama_base": "smollm:135m",
        "hf_id": "HuggingFaceTB/SmolLM-135M-Instruct",
        "provider": "HuggingFace"
    },
    {
        "id": "smollm-360m",
        "name": "SmolLM 360M",
        "family": "other",
        "params_b": 0.36,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 2048,
        "release_date": "2024-07-01",
        "ollama_base": "smollm:360m",
        "hf_id": "HuggingFaceTB/SmolLM-360M-Instruct",
        "provider": "HuggingFace"
    },
    {
        "id": "smollm-1.7b",
        "name": "SmolLM 1.7B",
        "family": "other",
        "params_b": 1.7,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 2048,
        "release_date": "2024-07-01",
        "ollama_base": "smollm:1.7b",
        "hf_id": "HuggingFaceTB/SmolLM-1.7B-Instruct",
        "provider": "HuggingFace"
    },
    {
        "id": "smollm2-1.7b",
        "name": "SmolLM2 1.7B",
        "family": "other",
        "params_b": 1.7,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 8192,
        "release_date": "2024-11-01",
        "ollama_base": "smollm2:1.7b",
        "hf_id": "HuggingFaceTB/SmolLM2-1.7B-Instruct",
        "provider": "HuggingFace"
    },

    # Phi-1, Phi-2
    {
        "id": "phi1-1.3b",
        "name": "Phi-1 1.3B",
        "family": "phi",
        "params_b": 1.3,
        "architecture": "dense",
        "capabilities": ["coding"],
        "context_length": 2048,
        "release_date": "2023-06-20",
        "ollama_base": "phi:1.3b",
        "hf_id": "microsoft/phi-1",
        "provider": "Microsoft"
    },
    {
        "id": "phi1.5-1.3b",
        "name": "Phi-1.5 1.3B",
        "family": "phi",
        "params_b": 1.3,
        "architecture": "dense",
        "capabilities": ["chat", "coding"],
        "context_length": 2048,
        "release_date": "2023-09-11",
        "ollama_base": "phi:1.5b",
        "hf_id": "microsoft/phi-1_5",
        "provider": "Microsoft"
    },
    {
        "id": "phi2-2.7b",
        "name": "Phi-2 2.7B",
        "family": "phi",
        "params_b": 2.7,
        "architecture": "dense",
        "capabilities": ["chat", "coding", "reasoning"],
        "context_length": 2048,
        "release_date": "2023-12-12",
        "ollama_base": "phi:2.7b",
        "hf_id": "microsoft/phi-2",
        "provider": "Microsoft"
    },

    # DeepSeek Coder
    {
        "id": "deepseek-coder-1.3b",
        "name": "DeepSeek Coder 1.3B",
        "family": "deepseek",
        "params_b": 1.3,
        "architecture": "dense",
        "capabilities": ["coding"],
        "context_length": 16384,
        "release_date": "2023-11-02",
        "ollama_base": "deepseek-coder:1.3b",
        "hf_id": "deepseek-ai/deepseek-coder-1.3b-instruct",
        "provider": "DeepSeek"
    },
    {
        "id": "deepseek-coder-6.7b",
        "name": "DeepSeek Coder 6.7B",
        "family": "deepseek",
        "params_b": 6.7,
        "architecture": "dense",
        "capabilities": ["coding"],
        "context_length": 16384,
        "release_date": "2023-11-02",
        "ollama_base": "deepseek-coder:6.7b",
        "hf_id": "deepseek-ai/deepseek-coder-6.7b-instruct",
        "provider": "DeepSeek"
    },
    {
        "id": "deepseek-coder-33b",
        "name": "DeepSeek Coder 33B",
        "family": "deepseek",
        "params_b": 33.0,
        "architecture": "dense",
        "capabilities": ["coding"],
        "context_length": 16384,
        "release_date": "2023-11-02",
        "ollama_base": "deepseek-coder:33b",
        "hf_id": "deepseek-ai/deepseek-coder-33b-instruct",
        "provider": "DeepSeek"
    },

    # DeepSeek V2 (MoE)
    {
        "id": "deepseek-v2-236b",
        "name": "DeepSeek V2 236B",
        "family": "deepseek",
        "params_b": 236.0,
        "architecture": "moe",
        "capabilities": ["chat", "coding", "reasoning"],
        "context_length": 128000,
        "release_date": "2024-05-06",
        "ollama_base": "deepseek-v2:236b",
        "hf_id": "deepseek-ai/DeepSeek-V2-Chat",
        "provider": "DeepSeek"
    },
    {
        "id": "deepseek-v2-lite-16b",
        "name": "DeepSeek V2 Lite 16B",
        "family": "deepseek",
        "params_b": 16.0,
        "architecture": "moe",
        "capabilities": ["chat", "coding"],
        "context_length": 32000,
        "release_date": "2024-05-06",
        "ollama_base": "deepseek-v2:16b",
        "hf_id": "deepseek-ai/DeepSeek-V2-Lite-Chat",
        "provider": "DeepSeek"
    },

    # StarCoder 2
    {
        "id": "starcoder2-3b",
        "name": "StarCoder2 3B",
        "family": "starcoder",
        "params_b": 3.0,
        "architecture": "dense",
        "capabilities": ["coding"],
        "context_length": 16384,
        "release_date": "2024-02-28",
        "ollama_base": "starcoder2:3b",
        "hf_id": "bigcode/starcoder2-3b",
        "provider": "BigCode"
    },
    {
        "id": "starcoder2-7b",
        "name": "StarCoder2 7B",
        "family": "starcoder",
        "params_b": 7.0,
        "architecture": "dense",
        "capabilities": ["coding"],
        "context_length": 16384,
        "release_date": "2024-02-28",
        "ollama_base": "starcoder2:7b",
        "hf_id": "bigcode/starcoder2-7b",
        "provider": "BigCode"
    },
    {
        "id": "starcoder2-15b",
        "name": "StarCoder2 15B",
        "family": "starcoder",
        "params_b": 15.0,
        "architecture": "dense",
        "capabilities": ["coding"],
        "context_length": 16384,
        "release_date": "2024-02-28",
        "ollama_base": "starcoder2:15b",
        "hf_id": "bigcode/starcoder2-15b",
        "provider": "BigCode"
    },

    # Vicuna
    {
        "id": "vicuna-7b",
        "name": "Vicuna 7B",
        "family": "llama",
        "params_b": 7.0,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 4096,
        "release_date": "2023-03-30",
        "ollama_base": "vicuna:7b",
        "hf_id": "lmsys/vicuna-7b-v1.5",
        "provider": "LMSYS"
    },
    {
        "id": "vicuna-13b",
        "name": "Vicuna 13B",
        "family": "llama",
        "params_b": 13.0,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 4096,
        "release_date": "2023-03-30",
        "ollama_base": "vicuna:13b",
        "hf_id": "lmsys/vicuna-13b-v1.5",
        "provider": "LMSYS"
    },
    {
        "id": "vicuna-33b",
        "name": "Vicuna 33B",
        "family": "llama",
        "params_b": 33.0,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 4096,
        "release_date": "2023-06-22",
        "ollama_base": "vicuna:33b",
        "hf_id": "lmsys/vicuna-33b-v1.3",
        "provider": "LMSYS"
    },

    # OpenChat
    {
        "id": "openchat-7b",
        "name": "OpenChat 3.5 7B",
        "family": "other",
        "params_b": 7.0,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 8192,
        "release_date": "2023-11-01",
        "ollama_base": "openchat:7b",
        "hf_id": "openchat/openchat-3.5-0106",
        "provider": "OpenChat"
    },

    # Solar
    {
        "id": "solar-10.7b",
        "name": "SOLAR 10.7B",
        "family": "other",
        "params_b": 10.7,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 4096,
        "release_date": "2023-12-13",
        "ollama_base": "solar:10.7b",
        "hf_id": "upstage/SOLAR-10.7B-Instruct-v1.0",
        "provider": "Upstage"
    },

    # Orca 2
    {
        "id": "orca2-7b",
        "name": "Orca 2 7B",
        "family": "other",
        "params_b": 7.0,
        "architecture": "dense",
        "capabilities": ["chat", "reasoning"],
        "context_length": 4096,
        "release_date": "2023-11-18",
        "ollama_base": "orca2:7b",
        "hf_id": "microsoft/Orca-2-7b",
        "provider": "Microsoft"
    },
    {
        "id": "orca2-13b",
        "name": "Orca 2 13B",
        "family": "other",
        "params_b": 13.0,
        "architecture": "dense",
        "capabilities": ["chat", "reasoning"],
        "context_length": 4096,
        "release_date": "2023-11-18",
        "ollama_base": "orca2:13b",
        "hf_id": "microsoft/Orca-2-13b",
        "provider": "Microsoft"
    },

    # Neural Chat
    {
        "id": "neural-chat-7b",
        "name": "Neural Chat 7B",
        "family": "other",
        "params_b": 7.0,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 8192,
        "release_date": "2023-11-01",
        "ollama_base": "neural-chat:7b",
        "hf_id": "Intel/neural-chat-7b-v3-3",
        "provider": "Intel"
    },

    # Nous Hermes
    {
        "id": "nous-hermes-7b",
        "name": "Nous Hermes 2 7B",
        "family": "other",
        "params_b": 7.0,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 8192,
        "release_date": "2024-01-01",
        "ollama_base": "nous-hermes:7b",
        "hf_id": "NousResearch/Nous-Hermes-2-Mistral-7B-DPO",
        "provider": "NousResearch"
    },
    {
        "id": "nous-hermes-mixtral-8x7b",
        "name": "Nous Hermes 2 Mixtral 8x7B",
        "family": "mistral",
        "params_b": 46.7,
        "architecture": "moe",
        "capabilities": ["chat", "coding"],
        "context_length": 32768,
        "release_date": "2024-01-16",
        "ollama_base": "nous-hermes2-mixtral:8x7b",
        "hf_id": "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO",
        "provider": "NousResearch"
    },

    # Dolphin
    {
        "id": "dolphin-2.6-mixtral-8x7b",
        "name": "Dolphin 2.6 Mixtral 8x7B",
        "family": "mistral",
        "params_b": 46.7,
        "architecture": "moe",
        "capabilities": ["chat", "coding"],
        "context_length": 32768,
        "release_date": "2024-01-01",
        "ollama_base": "dolphin-mixtral:8x7b",
        "hf_id": "cognitivecomputations/dolphin-2.6-mixtral-8x7b",
        "provider": "Cognitive Computations"
    },
    {
        "id": "dolphin-llama3-8b",
        "name": "Dolphin Llama 3 8B",
        "family": "llama",
        "params_b": 8.0,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 8192,
        "release_date": "2024-04-20",
        "ollama_base": "dolphin-llama3:8b",
        "hf_id": "cognitivecomputations/dolphin-2.9-llama3-8b",
        "provider": "Cognitive Computations"
    },
    {
        "id": "dolphin-llama3-70b",
        "name": "Dolphin Llama 3 70B",
        "family": "llama",
        "params_b": 70.0,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 8192,
        "release_date": "2024-04-20",
        "ollama_base": "dolphin-llama3:70b",
        "hf_id": "cognitivecomputations/dolphin-2.9-llama3-70b",
        "provider": "Cognitive Computations"
    },

    # Granite (IBM)
    {
        "id": "granite-3b",
        "name": "Granite 3B",
        "family": "other",
        "params_b": 3.0,
        "architecture": "dense",
        "capabilities": ["coding"],
        "context_length": 8192,
        "release_date": "2024-05-06",
        "ollama_base": "granite-code:3b",
        "hf_id": "ibm-granite/granite-3b-code-instruct",
        "provider": "IBM"
    },
    {
        "id": "granite-8b",
        "name": "Granite 8B",
        "family": "other",
        "params_b": 8.0,
        "architecture": "dense",
        "capabilities": ["coding"],
        "context_length": 8192,
        "release_date": "2024-05-06",
        "ollama_base": "granite-code:8b",
        "hf_id": "ibm-granite/granite-8b-code-instruct",
        "provider": "IBM"
    },
    {
        "id": "granite-20b",
        "name": "Granite 20B",
        "family": "other",
        "params_b": 20.0,
        "architecture": "dense",
        "capabilities": ["coding"],
        "context_length": 8192,
        "release_date": "2024-05-06",
        "ollama_base": "granite-code:20b",
        "hf_id": "ibm-granite/granite-20b-code-instruct",
        "provider": "IBM"
    },
    {
        "id": "granite-34b",
        "name": "Granite 34B",
        "family": "other",
        "params_b": 34.0,
        "architecture": "dense",
        "capabilities": ["coding"],
        "context_length": 8192,
        "release_date": "2024-05-06",
        "ollama_base": "granite-code:34b",
        "hf_id": "ibm-granite/granite-34b-code-instruct",
        "provider": "IBM"
    },

    # Gemma 1
    {
        "id": "gemma1-2b",
        "name": "Gemma 1 2B",
        "family": "gemma",
        "params_b": 2.0,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 8192,
        "release_date": "2024-02-21",
        "ollama_base": "gemma:2b",
        "hf_id": "google/gemma-2b-it",
        "provider": "Google"
    },
    {
        "id": "gemma1-7b",
        "name": "Gemma 1 7B",
        "family": "gemma",
        "params_b": 7.0,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 8192,
        "release_date": "2024-02-21",
        "ollama_base": "gemma:7b",
        "hf_id": "google/gemma-7b-it",
        "provider": "Google"
    },

    # Qwen 1.5
    {
        "id": "qwen1.5-0.5b",
        "name": "Qwen 1.5 0.5B",
        "family": "qwen",
        "params_b": 0.5,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 32768,
        "release_date": "2024-02-04",
        "ollama_base": "qwen:0.5b",
        "hf_id": "Qwen/Qwen1.5-0.5B-Chat",
        "provider": "Alibaba"
    },
    {
        "id": "qwen1.5-1.8b",
        "name": "Qwen 1.5 1.8B",
        "family": "qwen",
        "params_b": 1.8,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 32768,
        "release_date": "2024-02-04",
        "ollama_base": "qwen:1.8b",
        "hf_id": "Qwen/Qwen1.5-1.8B-Chat",
        "provider": "Alibaba"
    },
    {
        "id": "qwen1.5-4b",
        "name": "Qwen 1.5 4B",
        "family": "qwen",
        "params_b": 4.0,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 32768,
        "release_date": "2024-02-04",
        "ollama_base": "qwen:4b",
        "hf_id": "Qwen/Qwen1.5-4B-Chat",
        "provider": "Alibaba"
    },
    {
        "id": "qwen1.5-7b",
        "name": "Qwen 1.5 7B",
        "family": "qwen",
        "params_b": 7.0,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 32768,
        "release_date": "2024-02-04",
        "ollama_base": "qwen:7b",
        "hf_id": "Qwen/Qwen1.5-7B-Chat",
        "provider": "Alibaba"
    },
    {
        "id": "qwen1.5-14b",
        "name": "Qwen 1.5 14B",
        "family": "qwen",
        "params_b": 14.0,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 32768,
        "release_date": "2024-02-04",
        "ollama_base": "qwen:14b",
        "hf_id": "Qwen/Qwen1.5-14B-Chat",
        "provider": "Alibaba"
    },
    {
        "id": "qwen1.5-32b",
        "name": "Qwen 1.5 32B",
        "family": "qwen",
        "params_b": 32.0,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 32768,
        "release_date": "2024-02-04",
        "ollama_base": "qwen:32b",
        "hf_id": "Qwen/Qwen1.5-32B-Chat",
        "provider": "Alibaba"
    },
    {
        "id": "qwen1.5-72b",
        "name": "Qwen 1.5 72B",
        "family": "qwen",
        "params_b": 72.0,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 32768,
        "release_date": "2024-02-04",
        "ollama_base": "qwen:72b",
        "hf_id": "Qwen/Qwen1.5-72B-Chat",
        "provider": "Alibaba"
    },
    {
        "id": "qwen1.5-110b",
        "name": "Qwen 1.5 110B",
        "family": "qwen",
        "params_b": 110.0,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 32768,
        "release_date": "2024-02-04",
        "ollama_base": "qwen:110b",
        "hf_id": "Qwen/Qwen1.5-110B-Chat",
        "provider": "Alibaba"
    },

    # WizardLM
    {
        "id": "wizardlm2-7b",
        "name": "WizardLM 2 7B",
        "family": "other",
        "params_b": 7.0,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 32768,
        "release_date": "2024-04-15",
        "ollama_base": "wizardlm2:7b",
        "hf_id": "WizardLMTeam/WizardLM-2-7B",
        "provider": "WizardLM"
    },
    {
        "id": "wizardlm2-8x22b",
        "name": "WizardLM 2 8x22B",
        "family": "mistral",
        "params_b": 141.0,
        "architecture": "moe",
        "capabilities": ["chat", "reasoning"],
        "context_length": 65536,
        "release_date": "2024-04-15",
        "ollama_base": "wizardlm2:8x22b",
        "hf_id": "WizardLMTeam/WizardLM-2-8x22B",
        "provider": "WizardLM"
    },

    # Mistral Large
    {
        "id": "mistral-large-123b",
        "name": "Mistral Large 123B",
        "family": "mistral",
        "params_b": 123.0,
        "architecture": "dense",
        "capabilities": ["chat", "coding", "reasoning"],
        "context_length": 128000,
        "release_date": "2024-02-26",
        "ollama_base": "mistral-large:123b",
        "hf_id": "mistralai/Mistral-Large-Instruct-2407",
        "provider": "Mistral AI"
    },

    # Yi
    {
        "id": "yi-6b",
        "name": "Yi 6B",
        "family": "yi",
        "params_b": 6.0,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 4096,
        "release_date": "2023-11-02",
        "ollama_base": "yi:6b",
        "hf_id": "01-ai/Yi-6B-Chat",
        "provider": "01.AI"
    },
    {
        "id": "yi-9b",
        "name": "Yi 1.5 9B",
        "family": "yi",
        "params_b": 9.0,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 4096,
        "release_date": "2024-05-13",
        "ollama_base": "yi:9b",
        "hf_id": "01-ai/Yi-1.5-9B-Chat",
        "provider": "01.AI"
    },
    {
        "id": "yi-34b",
        "name": "Yi 34B",
        "family": "yi",
        "params_b": 34.0,
        "architecture": "dense",
        "capabilities": ["chat"],
        "context_length": 4096,
        "release_date": "2023-11-02",
        "ollama_base": "yi:34b",
        "hf_id": "01-ai/Yi-34B-Chat",
        "provider": "01.AI"
    },

    # Yi Coder
    {
        "id": "yi-coder-1.5b",
        "name": "Yi Coder 1.5B",
        "family": "yi",
        "params_b": 1.5,
        "architecture": "dense",
        "capabilities": ["coding"],
        "context_length": 128000,
        "release_date": "2024-09-05",
        "ollama_base": "yi-coder:1.5b",
        "hf_id": "01-ai/Yi-Coder-1.5B-Chat",
        "provider": "01.AI"
    },
    {
        "id": "yi-coder-9b",
        "name": "Yi Coder 9B",
        "family": "yi",
        "params_b": 9.0,
        "architecture": "dense",
        "capabilities": ["coding"],
        "context_length": 128000,
        "release_date": "2024-09-05",
        "ollama_base": "yi-coder:9b",
        "hf_id": "01-ai/Yi-Coder-9B-Chat",
        "provider": "01.AI"
    },

    # InternLM
    {
        "id": "internlm2-7b",
        "name": "InternLM 2 7B",
        "family": "other",
        "params_b": 7.0,
        "architecture": "dense",
        "capabilities": ["chat", "coding"],
        "context_length": 32768,
        "release_date": "2024-01-17",
        "ollama_base": "internlm2:7b",
        "hf_id": "internlm/internlm2-chat-7b",
        "provider": "Shanghai AI Lab"
    },
    {
        "id": "internlm2-20b",
        "name": "InternLM 2 20B",
        "family": "other",
        "params_b": 20.0,
        "architecture": "dense",
        "capabilities": ["chat", "coding"],
        "context_length": 32768,
        "release_date": "2024-01-17",
        "ollama_base": "internlm2:20b",
        "hf_id": "internlm/internlm2-chat-20b",
        "provider": "Shanghai AI Lab"
    },

    # Qwen2-Math
    {
        "id": "qwen2-math-1.5b",
        "name": "Qwen2 Math 1.5B",
        "family": "qwen",
        "params_b": 1.5,
        "architecture": "dense",
        "capabilities": ["reasoning"],
        "context_length": 4096,
        "release_date": "2024-08-08",
        "ollama_base": "qwen2-math:1.5b",
        "hf_id": "Qwen/Qwen2-Math-1.5B-Instruct",
        "provider": "Alibaba"
    },
    {
        "id": "qwen2-math-7b",
        "name": "Qwen2 Math 7B",
        "family": "qwen",
        "params_b": 7.0,
        "architecture": "dense",
        "capabilities": ["reasoning"],
        "context_length": 4096,
        "release_date": "2024-08-08",
        "ollama_base": "qwen2-math:7b",
        "hf_id": "Qwen/Qwen2-Math-7B-Instruct",
        "provider": "Alibaba"
    },
    {
        "id": "qwen2-math-72b",
        "name": "Qwen2 Math 72B",
        "family": "qwen",
        "params_b": 72.0,
        "architecture": "dense",
        "capabilities": ["reasoning"],
        "context_length": 4096,
        "release_date": "2024-08-08",
        "ollama_base": "qwen2-math:72b",
        "hf_id": "Qwen/Qwen2-Math-72B-Instruct",
        "provider": "Alibaba"
    },
]


def main():
    models_path = DATA_DIR / "models.json"

    with open(models_path) as f:
        models = json.load(f)

    # Get existing IDs
    existing_ids = {m["id"] for m in models}
    print(f"Existing models: {len(existing_ids)}")

    # Add new models
    added = 0
    for model in NEW_MODELS:
        if model["id"] in existing_ids:
            print(f"  Skip (exists): {model['id']}")
            continue

        # Generate quantizations
        model["quantizations"] = make_quants(model["params_b"], model["ollama_base"])
        model["benchmarks"] = empty_benchmarks()
        model["hf_downloads"] = 0
        model["gguf_sources"] = []

        models.append(model)
        added += 1
        print(f"  Added: {model['id']} ({model['name']})")

    # Sort by family, then params
    models.sort(key=lambda m: (m["family"], m["params_b"]))

    # Write
    with open(models_path, "w") as f:
        json.dump(models, f, indent=2)

    print(f"\nTotal: {len(models)} models (+{added} new)")


if __name__ == "__main__":
    main()
