#!/usr/bin/env python3
"""
Expand public/data/hf_models.json with more popular and historical models.
"""
import json, math

def ram(params_b):
    q4 = round(params_b * 4.5 / 8, 1)
    q6 = round(params_b * 6.5 / 8, 1)
    overhead = 0.4 if params_b < 4 else 0.6 if params_b < 15 else 1.0 if params_b < 35 else 2.0
    return {
        "min_vram_gb": round(q4 + overhead, 1),
        "min_ram_gb":  round(q4 + overhead, 1),
        "recommended_ram_gb": round(q6 + overhead + 0.5, 1),
    }

def model(hf_id, name, provider, params_b, ctx, use_case, caps,
          pipeline, arch, downloads, likes, release, ollama=None,
          gguf=None, params_raw=None):
    r = ram(params_b)
    entry = {
        "hf_id": hf_id,
        "name": name,
        "provider": provider,
        "params_b": params_b,
        "parameters_raw": params_raw or int(params_b * 1e9),
        "min_ram_gb": r["min_ram_gb"],
        "recommended_ram_gb": r["recommended_ram_gb"],
        "min_vram_gb": r["min_vram_gb"],
        "default_quant": "Q4_K_M",
        "context_length": ctx,
        "use_case": use_case,
        "capabilities": caps,
        "pipeline_tag": pipeline,
        "architecture": arch,
        "hf_downloads": downloads,
        "hf_likes": likes,
        "release_date": release,
        "ollama_tag": ollama,
    }
    if gguf:
        entry["gguf_sources"] = gguf
    return entry

NEW_HF_MODELS = [

    # ── Sentence Transformers / Embeddings ──────────────────────────────────

    model("sentence-transformers/all-MiniLM-L6-v2", "all-MiniLM-L6-v2",
          "Sentence Transformers", 0.022, 512, "embeddings", ["chat"],
          "sentence-similarity", "dense", 60000000, 3500, "2021-08-27",
          gguf=[{"repo": "second-state/All-MiniLM-L6-v2-Embedding-GGUF", "provider": "second-state"}]),

    model("sentence-transformers/all-mpnet-base-v2", "all-mpnet-base-v2",
          "Sentence Transformers", 0.109, 384, "embeddings", ["chat"],
          "sentence-similarity", "dense", 10000000, 1200, "2021-08-27"),

    model("BAAI/bge-m3", "bge-m3",
          "BAAI", 0.568, 8192, "embeddings", ["chat"],
          "sentence-similarity", "dense", 5000000, 900, "2024-01-30",
          gguf=[{"repo": "gpustack/bge-m3-GGUF", "provider": "gpustack"}]),

    model("BAAI/bge-base-en-v1.5", "bge-base-en-v1.5",
          "BAAI", 0.109, 512, "embeddings", ["chat"],
          "sentence-similarity", "dense", 8000000, 600, "2023-09-12"),

    model("intfloat/multilingual-e5-large-instruct", "multilingual-e5-large-instruct",
          "Microsoft", 0.560, 512, "embeddings", ["chat"],
          "sentence-similarity", "dense", 2000000, 400, "2024-03-01"),

    model("nomic-ai/nomic-embed-text-v1", "nomic-embed-text-v1",
          "Nomic", 0.137, 8192, "embeddings", ["chat"],
          "sentence-similarity", "dense", 3000000, 500, "2024-02-05"),

    # ── Reranking ──────────────────────────────────────────────────────────────

    model("BAAI/bge-reranker-v2-m3", "bge-reranker-v2-m3",
          "BAAI", 0.568, 8192, "embeddings", ["chat"],
          "text-classification", "dense", 1000000, 300, "2024-03-01"),

    # ── GPT-2 ─────────────────────────────────────────────────────────────────

    model("openai-community/gpt2", "GPT-2",
          "OpenAI", 0.117, 1024, "general", ["chat"],
          "text-generation", "dense", 30000000, 4000, "2019-02-14",
          ollama=None,
          gguf=[{"repo": "ggml-org/gpt-2-GGUF", "provider": "ggml-org"}]),

    model("openai-community/gpt2-xl", "GPT-2 XL",
          "OpenAI", 1.5, 1024, "general", ["chat"],
          "text-generation", "dense", 1500000, 800, "2019-11-05"),

    # ── Llama 2 ────────────────────────────────────────────────────────────────

    model("meta-llama/Llama-2-7b-chat-hf", "Llama-2-7B-Chat",
          "Meta", 7.0, 4096, "chat", ["chat"],
          "text-generation", "dense", 3000000, 3500, "2023-07-18",
          ollama="llama2:7b",
          gguf=[{"repo": "TheBloke/Llama-2-7B-Chat-GGUF", "provider": "TheBloke"}]),

    model("meta-llama/Llama-2-13b-chat-hf", "Llama-2-13B-Chat",
          "Meta", 13.0, 4096, "chat", ["chat"],
          "text-generation", "dense", 1500000, 2000, "2023-07-18",
          ollama="llama2:13b",
          gguf=[{"repo": "TheBloke/Llama-2-13B-chat-GGUF", "provider": "TheBloke"}]),

    model("meta-llama/Llama-2-70b-chat-hf", "Llama-2-70B-Chat",
          "Meta", 70.0, 4096, "chat", ["chat"],
          "text-generation", "dense", 800000, 1500, "2023-07-18",
          ollama="llama2:70b",
          gguf=[{"repo": "TheBloke/Llama-2-70B-Chat-GGUF", "provider": "TheBloke"}]),

    # ── Llama 3 ────────────────────────────────────────────────────────────────

    model("meta-llama/Meta-Llama-3-8B-Instruct", "Llama-3-8B-Instruct",
          "Meta", 8.0, 8192, "chat", ["chat"],
          "text-generation", "dense", 4000000, 3200, "2024-04-18",
          ollama="llama3:8b",
          gguf=[{"repo": "bartowski/Meta-Llama-3-8B-Instruct-GGUF", "provider": "bartowski"}]),

    model("meta-llama/Meta-Llama-3-70B-Instruct", "Llama-3-70B-Instruct",
          "Meta", 70.6, 8192, "chat", ["chat", "coding"],
          "text-generation", "dense", 2000000, 2500, "2024-04-18",
          ollama="llama3:70b",
          gguf=[{"repo": "bartowski/Meta-Llama-3-70B-Instruct-GGUF", "provider": "bartowski"}]),

    # ── Llama 3.1 405B ────────────────────────────────────────────────────────

    model("meta-llama/Llama-3.1-405B-Instruct", "Llama-3.1-405B-Instruct",
          "Meta", 405.0, 131072, "chat", ["chat", "coding", "reasoning"],
          "text-generation", "dense", 500000, 2000, "2024-07-23",
          gguf=[{"repo": "bartowski/Meta-Llama-3.1-405B-Instruct-GGUF", "provider": "bartowski"}]),

    # ── Llama 3.2 Vision ──────────────────────────────────────────────────────

    model("meta-llama/Llama-3.2-90B-Vision-Instruct", "Llama-3.2-90B-Vision-Instruct",
          "Meta", 88.6, 131072, "vision", ["chat", "vision"],
          "text-generation", "dense", 400000, 1200, "2024-09-25",
          gguf=[{"repo": "bartowski/Llama-3.2-90B-Vision-Instruct-GGUF", "provider": "bartowski"}]),

    # ── DeepSeek V2.5 / V3 ────────────────────────────────────────────────────

    model("deepseek-ai/DeepSeek-V2.5", "DeepSeek-V2.5",
          "DeepSeek", 236.0, 131072, "chat", ["chat", "coding"],
          "text-generation", "moe", 500000, 1800, "2024-09-05",
          gguf=[{"repo": "bartowski/DeepSeek-V2.5-GGUF", "provider": "bartowski"}]),

    # ── DeepSeek-Coder-V2 ─────────────────────────────────────────────────────

    model("deepseek-ai/DeepSeek-Coder-V2-Instruct", "DeepSeek-Coder-V2-Instruct",
          "DeepSeek", 236.0, 131072, "coding", ["coding", "chat"],
          "text-generation", "moe", 400000, 1500, "2024-06-17",
          gguf=[{"repo": "bartowski/DeepSeek-Coder-V2-Instruct-GGUF", "provider": "bartowski"}]),

    model("deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct", "DeepSeek-Coder-V2-Lite-Instruct",
          "DeepSeek", 15.7, 131072, "coding", ["coding", "chat"],
          "text-generation", "moe", 800000, 1200, "2024-06-17",
          ollama="deepseek-coder-v2:16b",
          gguf=[{"repo": "bartowski/DeepSeek-Coder-V2-Lite-Instruct-GGUF", "provider": "bartowski"}]),

    # ── DeepSeek R1 Zero ──────────────────────────────────────────────────────

    model("deepseek-ai/DeepSeek-R1-Zero", "DeepSeek-R1-Zero",
          "DeepSeek", 671.0, 131072, "reasoning", ["reasoning"],
          "text-generation", "moe", 300000, 1200, "2025-01-20"),

    # ── Qwen2.5 (non-coder) ───────────────────────────────────────────────────

    model("Qwen/Qwen2.5-3B-Instruct", "Qwen2.5-3B-Instruct",
          "Alibaba", 3.1, 32768, "chat", ["chat", "tool_use"],
          "text-generation", "dense", 800000, 400, "2024-09-18",
          ollama="qwen2.5:3b",
          gguf=[{"repo": "bartowski/Qwen2.5-3B-Instruct-GGUF", "provider": "bartowski"}]),

    model("Qwen/Qwen2.5-1.5B-Instruct", "Qwen2.5-1.5B-Instruct",
          "Alibaba", 1.54, 32768, "chat", ["chat"],
          "text-generation", "dense", 600000, 300, "2024-09-18",
          gguf=[{"repo": "bartowski/Qwen2.5-1.5B-Instruct-GGUF", "provider": "bartowski"}]),

    model("Qwen/Qwen2.5-0.5B-Instruct", "Qwen2.5-0.5B-Instruct",
          "Alibaba", 0.5, 32768, "chat", ["chat"],
          "text-generation", "dense", 400000, 200, "2024-09-18",
          gguf=[{"repo": "bartowski/Qwen2.5-0.5B-Instruct-GGUF", "provider": "bartowski"}]),

    # ── Qwen2.5-Coder 3B ─────────────────────────────────────────────────────

    model("Qwen/Qwen2.5-Coder-3B-Instruct", "Qwen2.5-Coder-3B-Instruct",
          "Alibaba", 3.1, 32768, "coding", ["coding", "chat"],
          "text-generation", "dense", 500000, 250, "2024-11-12",
          gguf=[{"repo": "bartowski/Qwen2.5-Coder-3B-Instruct-GGUF", "provider": "bartowski"}]),

    # ── Qwen3 ─────────────────────────────────────────────────────────────────

    model("Qwen/Qwen3-0.6B", "Qwen3-0.6B",
          "Alibaba", 0.6, 32768, "general", ["chat", "reasoning"],
          "text-generation", "dense", 2000000, 800, "2025-04-28",
          ollama="qwen3:0.6b",
          gguf=[{"repo": "bartowski/Qwen3-0.6B-GGUF", "provider": "bartowski"}]),

    model("Qwen/Qwen3-1.7B", "Qwen3-1.7B",
          "Alibaba", 1.7, 32768, "general", ["chat", "reasoning"],
          "text-generation", "dense", 3000000, 1200, "2025-04-28",
          ollama="qwen3:1.7b",
          gguf=[{"repo": "bartowski/Qwen3-1.7B-GGUF", "provider": "bartowski"}]),

    model("Qwen/Qwen3-4B", "Qwen3-4B",
          "Alibaba", 4.0, 32768, "general", ["chat", "reasoning"],
          "text-generation", "dense", 5000000, 2000, "2025-04-28",
          ollama="qwen3:4b",
          gguf=[{"repo": "bartowski/Qwen3-4B-GGUF", "provider": "bartowski"}]),

    model("Qwen/Qwen3-8B", "Qwen3-8B",
          "Alibaba", 8.2, 32768, "general", ["chat", "reasoning"],
          "text-generation", "dense", 8000000, 3500, "2025-04-28",
          ollama="qwen3:8b",
          gguf=[{"repo": "bartowski/Qwen3-8B-GGUF", "provider": "bartowski"}]),

    model("Qwen/Qwen3-14B", "Qwen3-14B",
          "Alibaba", 14.8, 32768, "general", ["chat", "reasoning"],
          "text-generation", "dense", 6000000, 2800, "2025-04-28",
          ollama="qwen3:14b",
          gguf=[{"repo": "bartowski/Qwen3-14B-GGUF", "provider": "bartowski"}]),

    model("Qwen/Qwen3-32B", "Qwen3-32B",
          "Alibaba", 32.8, 32768, "general", ["chat", "reasoning"],
          "text-generation", "dense", 5000000, 2500, "2025-04-28",
          ollama="qwen3:32b",
          gguf=[{"repo": "bartowski/Qwen3-32B-GGUF", "provider": "bartowski"}]),

    model("Qwen/Qwen3-30B-A3B", "Qwen3-30B-A3B",
          "Alibaba", 30.5, 32768, "general", ["chat", "reasoning"],
          "text-generation", "moe", 3000000, 1500, "2025-04-28",
          ollama="qwen3:30b-a3b",
          gguf=[{"repo": "bartowski/Qwen3-30B-A3B-GGUF", "provider": "bartowski"}]),

    # ── QwQ ───────────────────────────────────────────────────────────────────

    model("Qwen/QwQ-32B", "QwQ-32B",
          "Alibaba", 32.5, 131072, "reasoning", ["chat", "reasoning"],
          "text-generation", "dense", 6000000, 3000, "2025-03-05",
          ollama="qwq",
          gguf=[{"repo": "bartowski/QwQ-32B-GGUF", "provider": "bartowski"}]),

    # ── Phi-2 / Phi-3.5 ───────────────────────────────────────────────────────

    model("microsoft/phi-2", "Phi-2",
          "Microsoft", 2.7, 2048, "chat", ["chat", "coding"],
          "text-generation", "dense", 3000000, 2000, "2023-12-12",
          ollama="phi",
          gguf=[{"repo": "TheBloke/phi-2-GGUF", "provider": "TheBloke"}]),

    model("microsoft/Phi-3.5-mini-instruct", "Phi-3.5-mini-instruct",
          "Microsoft", 3.82, 131072, "chat", ["chat", "coding", "reasoning"],
          "text-generation", "dense", 2000000, 1500, "2024-08-20",
          ollama="phi3.5",
          gguf=[{"repo": "bartowski/Phi-3.5-mini-instruct-GGUF", "provider": "bartowski"}]),

    model("microsoft/Phi-3.5-MoE-instruct", "Phi-3.5-MoE-instruct",
          "Microsoft", 41.9, 131072, "chat", ["chat", "coding", "reasoning"],
          "text-generation", "moe", 500000, 800, "2024-08-20",
          gguf=[{"repo": "bartowski/Phi-3.5-MoE-instruct-GGUF", "provider": "bartowski"}]),

    # ── Gemma 2 2B ────────────────────────────────────────────────────────────

    model("google/gemma-2-2b-it", "gemma-2-2b-it",
          "Google", 2.61, 8192, "chat", ["chat"],
          "text-generation", "dense", 1500000, 1000, "2024-07-31",
          ollama="gemma2:2b",
          gguf=[{"repo": "bartowski/gemma-2-2b-it-GGUF", "provider": "bartowski"}]),

    model("google/codegemma-7b-it", "codegemma-7b-it",
          "Google", 8.54, 8192, "coding", ["coding"],
          "text-generation", "dense", 600000, 700, "2024-04-09",
          ollama="codegemma",
          gguf=[{"repo": "bartowski/codegemma-7b-it-GGUF", "provider": "bartowski"}]),

    # ── Mistral ───────────────────────────────────────────────────────────────

    model("mistralai/Mistral-7B-Instruct-v0.1", "Mistral-7B-Instruct-v0.1",
          "Mistral AI", 7.25, 32768, "chat", ["chat"],
          "text-generation", "dense", 5000000, 2000, "2023-09-27",
          gguf=[{"repo": "TheBloke/Mistral-7B-Instruct-v0.1-GGUF", "provider": "TheBloke"}]),

    model("mistralai/Codestral-22B-v0.1", "Codestral-22B-v0.1",
          "Mistral AI", 22.2, 32768, "coding", ["coding"],
          "text-generation", "dense", 600000, 1200, "2024-05-29",
          ollama="codestral",
          gguf=[{"repo": "bartowski/Codestral-22B-v0.1-GGUF", "provider": "bartowski"}]),

    model("mistralai/Pixtral-12B-2409", "Pixtral-12B",
          "Mistral AI", 12.0, 131072, "vision", ["chat", "vision"],
          "text-generation", "dense", 400000, 800, "2024-09-11",
          gguf=[{"repo": "bartowski/pixtral-12b-2409-GGUF", "provider": "bartowski"}]),

    model("mistralai/Ministral-8B-Instruct-2410", "Ministral-8B",
          "Mistral AI", 8.0, 131072, "chat", ["chat"],
          "text-generation", "dense", 500000, 600, "2024-10-16",
          gguf=[{"repo": "bartowski/Ministral-8B-Instruct-2410-GGUF", "provider": "bartowski"}]),

    model("mistralai/Ministral-3B-Instruct-2410", "Ministral-3B",
          "Mistral AI", 3.0, 131072, "chat", ["chat"],
          "text-generation", "dense", 400000, 400, "2024-10-16",
          gguf=[{"repo": "bartowski/Ministral-3B-Instruct-2410-GGUF", "provider": "bartowski"}]),

    model("mistralai/Devstral-Small-2505", "Devstral-Small-22B",
          "Mistral AI", 22.2, 131072, "coding", ["coding"],
          "text-generation", "dense", 200000, 500, "2025-05-07",
          gguf=[{"repo": "bartowski/Devstral-Small-2505-GGUF", "provider": "bartowski"}]),

    # ── StarCoder2 ────────────────────────────────────────────────────────────

    model("bigcode/starcoder2-15b-instruct-v0.1", "StarCoder2-15B-Instruct",
          "BigCode", 15.5, 16384, "coding", ["coding"],
          "text-generation", "dense", 400000, 600, "2024-05-01",
          ollama="starcoder2:15b",
          gguf=[{"repo": "bartowski/starcoder2-15b-instruct-v0.1-GGUF", "provider": "bartowski"}]),

    # ── WizardLM / WizardCoder ────────────────────────────────────────────────

    model("WizardLMTeam/WizardCoder-Python-34B-V1.0", "WizardCoder-Python-34B",
          "Microsoft", 34.0, 16384, "coding", ["coding"],
          "text-generation", "dense", 200000, 500, "2023-08-26",
          gguf=[{"repo": "TheBloke/WizardCoder-Python-34B-V1.0-GGUF", "provider": "TheBloke"}]),

    model("WizardLMTeam/WizardLM-2-8x22B", "WizardLM-2-8x22B",
          "Microsoft", 140.6, 65536, "chat", ["chat", "reasoning"],
          "text-generation", "moe", 200000, 700, "2024-04-15",
          gguf=[{"repo": "bartowski/WizardLM-2-8x22B-GGUF", "provider": "bartowski"}]),

    # ── OpenHermes / Nous ─────────────────────────────────────────────────────

    model("teknium/OpenHermes-2.5-Mistral-7B", "OpenHermes-2.5-Mistral-7B",
          "Teknium", 7.25, 32768, "chat", ["chat"],
          "text-generation", "dense", 1200000, 1500, "2023-11-01",
          ollama="openhermes",
          gguf=[{"repo": "TheBloke/OpenHermes-2.5-Mistral-7B-GGUF", "provider": "TheBloke"}]),

    model("NousResearch/Nous-Hermes-2-Mistral-7B-DPO", "Nous-Hermes-2-Mistral-7B",
          "Nous Research", 7.25, 32768, "chat", ["chat"],
          "text-generation", "dense", 400000, 700, "2024-01-01",
          gguf=[{"repo": "TheBloke/Nous-Hermes-2-Mistral-7B-DPO-GGUF", "provider": "TheBloke"}]),

    # ── InternLM ──────────────────────────────────────────────────────────────

    model("internlm/internlm2_5-7b-chat", "InternLM2.5-7B-Chat",
          "Shanghai AI Lab", 7.74, 1048576, "chat", ["chat", "coding", "reasoning"],
          "text-generation", "dense", 400000, 500, "2024-08-05",
          gguf=[{"repo": "bartowski/internlm2_5-7b-chat-GGUF", "provider": "bartowski"}]),

    model("internlm/internlm2_5-20b-chat", "InternLM2.5-20B-Chat",
          "Shanghai AI Lab", 19.8, 1048576, "chat", ["chat", "coding", "reasoning"],
          "text-generation", "dense", 100000, 200, "2024-08-05",
          gguf=[{"repo": "bartowski/internlm2_5-20b-chat-GGUF", "provider": "bartowski"}]),

    # ── Yi-1.5 ────────────────────────────────────────────────────────────────

    model("01-ai/Yi-1.5-9B-Chat", "Yi-1.5-9B-Chat",
          "01.AI", 9.0, 4096, "chat", ["chat"],
          "text-generation", "dense", 200000, 300, "2024-05-13",
          gguf=[{"repo": "bartowski/Yi-1.5-9B-Chat-GGUF", "provider": "bartowski"}]),

    model("01-ai/Yi-1.5-34B-Chat", "Yi-1.5-34B-Chat",
          "01.AI", 34.4, 4096, "chat", ["chat"],
          "text-generation", "dense", 150000, 300, "2024-05-13",
          gguf=[{"repo": "bartowski/Yi-1.5-34B-Chat-GGUF", "provider": "bartowski"}]),

    # ── Cohere Command-R ──────────────────────────────────────────────────────

    model("CohereForAI/c4ai-command-r-plus", "Command-R+ 104B",
          "Cohere", 104.0, 131072, "chat", ["chat", "reasoning"],
          "text-generation", "dense", 100000, 500, "2024-04-04",
          gguf=[{"repo": "bartowski/c4ai-command-r-plus-GGUF", "provider": "bartowski"}]),

    model("CohereForAI/c4ai-command-r7b-12-2024", "Command-R7B",
          "Cohere", 7.0, 131072, "chat", ["chat", "reasoning"],
          "text-generation", "dense", 100000, 250, "2024-12-13",
          gguf=[{"repo": "bartowski/c4ai-command-r7b-12-2024-GGUF", "provider": "bartowski"}]),

    model("CohereForAI/aya-expanse-8b", "Aya-Expanse-8B",
          "Cohere", 8.0, 131072, "chat", ["chat"],
          "text-generation", "dense", 150000, 300, "2024-10-30",
          gguf=[{"repo": "bartowski/aya-expanse-8b-GGUF", "provider": "bartowski"}]),

    model("CohereForAI/aya-expanse-32b", "Aya-Expanse-32B",
          "Cohere", 32.0, 131072, "chat", ["chat"],
          "text-generation", "dense", 80000, 200, "2024-10-30",
          gguf=[{"repo": "bartowski/aya-expanse-32b-GGUF", "provider": "bartowski"}]),

    # ── SmolLM2 ───────────────────────────────────────────────────────────────

    model("HuggingFaceTB/SmolLM2-135M-Instruct", "SmolLM2-135M",
          "HuggingFace", 0.135, 2048, "chat", ["chat"],
          "text-generation", "dense", 300000, 600, "2024-11-21",
          gguf=[{"repo": "HuggingFaceTB/SmolLM2-135M-Instruct-GGUF", "provider": "HuggingFace"}]),

    model("HuggingFaceTB/SmolLM2-360M-Instruct", "SmolLM2-360M",
          "HuggingFace", 0.36, 8192, "chat", ["chat"],
          "text-generation", "dense", 400000, 800, "2024-11-21",
          gguf=[{"repo": "HuggingFaceTB/SmolLM2-360M-Instruct-GGUF", "provider": "HuggingFace"}]),

    model("HuggingFaceTB/SmolLM2-1.7B-Instruct", "SmolLM2-1.7B",
          "HuggingFace", 1.71, 8192, "chat", ["chat"],
          "text-generation", "dense", 600000, 1200, "2024-11-21",
          ollama="smollm2:1.7b",
          gguf=[{"repo": "HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF", "provider": "HuggingFace"}]),

    # ── DBRX ──────────────────────────────────────────────────────────────────

    model("databricks/dbrx-instruct", "DBRX-Instruct",
          "Databricks", 132.0, 32768, "chat", ["chat", "coding"],
          "text-generation", "moe", 80000, 500, "2024-03-27",
          gguf=[{"repo": "bartowski/dbrx-instruct-GGUF", "provider": "bartowski"}]),

    # ── Falcon additions ──────────────────────────────────────────────────────

    model("tiiuae/falcon-40b-instruct", "Falcon-40B-Instruct",
          "TII", 40.0, 8192, "chat", ["chat"],
          "text-generation", "dense", 300000, 700, "2023-05-25",
          gguf=[{"repo": "TheBloke/falcon-40b-instruct-GGUF", "provider": "TheBloke"}]),

    model("tiiuae/Falcon3-3B-Instruct", "Falcon3-3B-Instruct",
          "TII", 3.1, 32768, "chat", ["chat"],
          "text-generation", "dense", 100000, 200, "2024-11-29",
          gguf=[{"repo": "bartowski/Falcon3-3B-Instruct-GGUF", "provider": "bartowski"}]),

    model("tiiuae/Falcon3-10B-Instruct", "Falcon3-10B-Instruct",
          "TII", 10.3, 32768, "chat", ["chat"],
          "text-generation", "dense", 150000, 250, "2024-11-29",
          gguf=[{"repo": "bartowski/Falcon3-10B-Instruct-GGUF", "provider": "bartowski"}]),

    # ── OLMo-2 additions ──────────────────────────────────────────────────────

    model("allenai/OLMo-2-1124-7B-Instruct", "OLMo-2-7B-Instruct",
          "Allen AI", 7.0, 4096, "chat", ["chat"],
          "text-generation", "dense", 150000, 300, "2024-11-24",
          gguf=[{"repo": "bartowski/OLMo-2-1124-7B-Instruct-GGUF", "provider": "bartowski"}]),

    model("allenai/OLMo-2-1124-13B-Instruct", "OLMo-2-13B-Instruct",
          "Allen AI", 13.0, 4096, "chat", ["chat"],
          "text-generation", "dense", 100000, 250, "2024-11-24",
          gguf=[{"repo": "bartowski/OLMo-2-1124-13B-Instruct-GGUF", "provider": "bartowski"}]),

    # ── ChatGLM ───────────────────────────────────────────────────────────────

    model("THUDM/chatglm3-6b", "ChatGLM3-6B",
          "Tsinghua/Zhipu AI", 6.24, 131072, "chat", ["chat", "coding"],
          "text-generation", "dense", 1000000, 1500, "2023-10-27",
          gguf=[{"repo": "TheBloke/chatglm3-6B-GGUF", "provider": "TheBloke"}]),

    # ── Baichuan2 ─────────────────────────────────────────────────────────────

    model("baichuan-inc/Baichuan2-7B-Chat", "Baichuan2-7B-Chat",
          "Baichuan AI", 7.0, 4096, "chat", ["chat"],
          "text-generation", "dense", 200000, 400, "2023-09-06",
          gguf=[{"repo": "TheBloke/Baichuan2-7B-Chat-GGUF", "provider": "TheBloke"}]),

    model("baichuan-inc/Baichuan2-13B-Chat", "Baichuan2-13B-Chat",
          "Baichuan AI", 13.0, 4096, "chat", ["chat"],
          "text-generation", "dense", 150000, 300, "2023-09-06",
          gguf=[{"repo": "TheBloke/Baichuan2-13B-Chat-GGUF", "provider": "TheBloke"}]),

    # ── NVIDIA Nemotron additions ─────────────────────────────────────────────

    model("nvidia/Llama-3.1-Nemotron-70B-Instruct-HF", "Llama-3.1-Nemotron-70B",
          "NVIDIA", 70.6, 131072, "chat", ["chat", "reasoning"],
          "text-generation", "dense", 500000, 1200, "2024-10-03",
          gguf=[{"repo": "bartowski/Llama-3.1-Nemotron-70B-Instruct-HF-GGUF", "provider": "bartowski"}]),

    # ── Granite additions ─────────────────────────────────────────────────────

    model("ibm-granite/granite-3.1-8b-instruct", "Granite-3.1-8B",
          "IBM", 8.17, 131072, "chat", ["chat", "coding"],
          "text-generation", "dense", 150000, 300, "2024-12-16",
          gguf=[{"repo": "bartowski/granite-3.1-8b-instruct-GGUF", "provider": "bartowski"}]),

    model("ibm-granite/granite-3.1-2b-instruct", "Granite-3.1-2B",
          "IBM", 2.0, 131072, "chat", ["chat", "coding"],
          "text-generation", "dense", 100000, 200, "2024-12-16",
          gguf=[{"repo": "bartowski/granite-3.1-2b-instruct-GGUF", "provider": "bartowski"}]),

    # ── Jamba ─────────────────────────────────────────────────────────────────

    model("ai21labs/AI21-Jamba-1.5-Mini", "Jamba-1.5-Mini",
          "AI21 Labs", 51.6, 262144, "chat", ["chat", "reasoning"],
          "text-generation", "moe", 80000, 200, "2024-08-22",
          gguf=[{"repo": "bartowski/AI21-Jamba-1.5-Mini-GGUF", "provider": "bartowski"}]),

    # ── Moondream ─────────────────────────────────────────────────────────────

    model("vikhyatk/moondream2", "Moondream2",
          "Moondream", 1.87, 2048, "vision", ["vision", "chat"],
          "image-text-to-text", "dense", 500000, 1200, "2024-03-05",
          ollama="moondream",
          gguf=[{"repo": "vikhyatk/moondream2", "provider": "moondream"}]),

    # ── LLaVA ─────────────────────────────────────────────────────────────────

    model("llava-hf/llava-1.5-7b-hf", "LLaVA-1.5-7B",
          "LLaVA", 7.1, 4096, "vision", ["vision", "chat"],
          "image-text-to-text", "dense", 600000, 1500, "2023-10-05",
          ollama="llava:7b",
          gguf=[{"repo": "mys/ggml_llava-v1.5-7b", "provider": "mys"}]),

    model("llava-hf/llava-1.5-13b-hf", "LLaVA-1.5-13B",
          "LLaVA", 13.1, 4096, "vision", ["vision", "chat"],
          "image-text-to-text", "dense", 300000, 1000, "2023-10-05",
          ollama="llava:13b",
          gguf=[{"repo": "mys/ggml_llava-v1.5-13b", "provider": "mys"}]),

    # ── DeepSeek VL2 ─────────────────────────────────────────────────────────

    model("deepseek-ai/deepseek-vl2-small", "DeepSeek-VL2-Small",
          "DeepSeek", 15.7, 4096, "vision", ["vision", "chat"],
          "image-text-to-text", "moe", 150000, 400, "2024-12-13",
          gguf=[{"repo": "bartowski/deepseek-vl2-small-GGUF", "provider": "bartowski"}]),

    # ── Qwen2-VL ─────────────────────────────────────────────────────────────

    model("Qwen/Qwen2-VL-2B-Instruct", "Qwen2-VL-2B",
          "Alibaba", 2.21, 32768, "vision", ["vision", "chat"],
          "image-text-to-text", "dense", 1000000, 1200, "2024-10-03",
          gguf=[{"repo": "bartowski/Qwen2-VL-2B-Instruct-GGUF", "provider": "bartowski"}]),

    model("Qwen/Qwen2-VL-7B-Instruct", "Qwen2-VL-7B",
          "Alibaba", 8.29, 32768, "vision", ["vision", "chat"],
          "image-text-to-text", "dense", 2000000, 2500, "2024-10-03",
          ollama="qwen2-vl:7b",
          gguf=[{"repo": "bartowski/Qwen2-VL-7B-Instruct-GGUF", "provider": "bartowski"}]),

    # ── Phi-4 Vision ──────────────────────────────────────────────────────────

    model("microsoft/Phi-4-multimodal-instruct", "Phi-4-multimodal",
          "Microsoft", 5.6, 131072, "vision", ["vision", "chat", "reasoning"],
          "text-generation", "dense", 300000, 600, "2025-01-07",
          gguf=[{"repo": "bartowski/Phi-4-multimodal-instruct-GGUF", "provider": "bartowski"}]),
]

# ── Merge ──────────────────────────────────────────────────────────────────────

with open("public/data/hf_models.json") as f:
    existing = json.load(f)

existing_ids = {m["hf_id"] for m in existing}
added = 0
for m in NEW_HF_MODELS:
    if m["hf_id"] not in existing_ids:
        existing.append(m)
        added += 1
    else:
        print(f"  SKIP: {m['hf_id']}")

# Sort by params_b
existing.sort(key=lambda m: m["params_b"])

with open("public/data/hf_models.json", "w") as f:
    json.dump(existing, f, indent=2)

print(f"\nAdded {added} HF models. Total: {len(existing)}")
use_cases = {}
for m in existing:
    uc = m.get("use_case", "unknown")
    use_cases[uc] = use_cases.get(uc, 0) + 1
for uc, cnt in sorted(use_cases.items(), key=lambda x: -x[1]):
    print(f"  {uc}: {cnt}")
