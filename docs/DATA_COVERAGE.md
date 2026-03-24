# Data Coverage Report

Stato attuale della copertura dati per LocalLLM Advisor.

## Benchmark Coverage

### Disponibili (Open LLM Leaderboard)

| Benchmark | Use Case | Descrizione | Copertura |
|-----------|----------|-------------|-----------|
| IFEval | Chat, Creative | Instruction following | ✅ Completa |
| MMLU-PRO | Chat, Creative | Multi-task language understanding | ✅ Completa |
| BBH | Chat, Reasoning | Big-Bench Hard reasoning | ✅ Completa |
| MATH | Coding, Reasoning | Mathematical reasoning (Lvl 5) | ✅ Completa |
| GPQA | Reasoning | Graduate-level Q&A | ✅ Completa |
| MUSR | Reasoning | Multi-step reasoning | ✅ Completa |

### Disponibili (BigCodeBench)

| Benchmark | Use Case | Descrizione | Copertura |
|-----------|----------|-------------|-----------|
| BigCodeBench | Coding | Complex coding tasks | ⚠️ Parziale* |

*BigCodeBench ha risultati solo per alcuni modelli (principalmente Qwen Coder, DeepSeek Coder, etc.)

### Mancanti

| Benchmark | Use Case | Fonte Potenziale | Priorità |
|-----------|----------|------------------|----------|
| HumanEval | Coding | EvalPlus (no public dataset) | 🔴 Alta |
| MBPP | Coding | EvalPlus (no public dataset) | 🔴 Alta |
| AlpacaEval | Creative | tatsu-lab/alpaca_eval | 🟡 Media |
| MMMU | Vision | OpenCompass | 🟡 Media |
| MMBench | Vision | OpenCompass | 🟡 Media |
| MT-Bench | Chat | lmsys/chatbot_arena | 🟢 Bassa |
| Arena ELO | Chat | lmsys/chatbot_arena | 🟢 Bassa |

### Fonti Dati Potenziali

1. **EvalPlus** (https://evalplus.github.io/)
   - HumanEval+, MBPP+
   - No dataset pubblico HuggingFace
   - Possibile scraping HTML o API non documentata

2. **BigCodeBench** (https://huggingface.co/spaces/bigcode/bigcodebench-leaderboard)
   - Dataset: `bigcode/bigcodebench-results` ✅
   - Colonne: model, size, complete, instruct

3. **AlpacaEval** (https://tatsu-lab.github.io/alpaca_eval/)
   - Leaderboard pubblico
   - Possibile scraping o dataset HuggingFace

4. **OpenCompass** (https://opencompass.org.cn/)
   - MMMU, MMBench, altri benchmark vision
   - API o scraping necessario

5. **Chatbot Arena** (https://chat.lmsys.org/)
   - Arena ELO, MT-Bench
   - Dataset: `lmsys/chatbot_arena_conversations`

---

## Model Coverage

### Modelli Tracciati (28 modelli)

| Famiglia | Modelli | Sizes |
|----------|---------|-------|
| Gemma | gemma2 | 2B, 9B, 27B |
| Llama | llama3.1, llama3.2, llama3.3 | 1B, 3B, 8B, 70B, 405B |
| Mistral | mistral, mistral-nemo, mistral-small | 7B, 12B, 22B, 24B |
| Phi | phi3 | 3.8B, 14B |
| Qwen | qwen2.5, qwen2.5-coder | 0.5B - 72B |

### Modelli Mancanti (da aggiungere)

#### Alta Priorità (popolari su Ollama)

| Modello | Famiglia | Sizes | Capabilities |
|---------|----------|-------|--------------|
| deepseek-r1 | DeepSeek | 1.5B, 7B, 8B, 14B, 32B, 70B | reasoning |
| deepseek-v3 | DeepSeek | 671B (MoE) | chat, coding |
| phi4 | Phi | 14B | chat, reasoning |
| codellama | Llama | 7B, 13B, 34B, 70B | coding |
| command-r | Cohere | 35B, 104B | chat, RAG |
| yi | 01.AI | 6B, 9B, 34B | chat |
| solar | Upstage | 10.7B | chat |
| wizardlm2 | WizardLM | 7B, 8x22B | chat |
| openchat | OpenChat | 7B | chat |
| starling-lm | Starling | 7B | chat |
| neural-chat | Intel | 7B | chat |
| orca-mini | Orca | 3B, 7B, 13B | chat |
| stablelm | StabilityAI | 2B, 3B | chat |
| tinyllama | TinyLlama | 1.1B | chat |

#### Vision Models

| Modello | Famiglia | Sizes | Note |
|---------|----------|-------|------|
| llava | LLaVA | 7B, 13B, 34B | vision |
| llava-llama3 | LLaVA | 8B | vision, llama3 based |
| llava-phi3 | LLaVA | 3.8B | vision, phi3 based |
| bakllava | BakLLaVA | 7B | vision |
| moondream | Moondream | 1.8B | vision, tiny |
| minicpm-v | MiniCPM | 2.5B | vision |

#### Coding Specialists

| Modello | Famiglia | Sizes | Note |
|---------|----------|-------|------|
| starcoder2 | StarCoder | 3B, 7B, 15B | coding |
| codestral | Mistral | 22B | coding |
| codegemma | Gemma | 2B, 7B | coding |
| deepseek-coder | DeepSeek | 1.3B, 6.7B, 33B | coding |
| deepseek-coder-v2 | DeepSeek | 16B, 236B | coding, MoE |

#### Reasoning Specialists

| Modello | Famiglia | Sizes | Note |
|---------|----------|-------|------|
| qwq | Qwen | 32B | reasoning, o1-like |
| marco-o1 | AIDC-AI | 7B | reasoning |

---

## Configurazione Attuale

### Use Case → Benchmark Weights

```
Chat:
  - IFEval (40%)
  - MMLU-PRO (35%)
  - BBH (25%)

Coding:
  - BigCodeBench (35%)
  - MATH (25%)
  - BBH (25%)
  - IFEval (15%)

Reasoning:
  - MATH (30%)
  - GPQA (30%)
  - BBH (25%)
  - MUSR (15%)

Creative:
  - IFEval (45%)
  - MMLU-PRO (30%)
  - BBH (25%)

Vision:
  - IFEval (40%)
  - MMLU-PRO (35%)
  - BBH (25%)
  [TODO: MMMU, MMBench quando disponibili]
```

### Score Composition

```
Final Score = wQuality × BenchmarkScore
            + wSpeed × SpeedScore
            + wQuant × QuantQuality

Weights per use case:
  Chat:      wQuality=0.45, wSpeed=0.30, wQuant=0.25
  Coding:    wQuality=0.55, wSpeed=0.25, wQuant=0.20
  Reasoning: wQuality=0.55, wSpeed=0.20, wQuant=0.25
  Creative:  wQuality=0.40, wSpeed=0.30, wQuant=0.30
  Vision:    wQuality=0.50, wSpeed=0.25, wQuant=0.25
```

---

## TODO

### Benchmark
- [ ] Trovare fonte per HumanEval/MBPP (EvalPlus scraping?)
- [ ] Aggiungere AlpacaEval per creative
- [ ] Aggiungere MMMU/MMBench per vision
- [ ] Considerare MT-Bench/Arena ELO per chat

### Modelli
- [ ] Aggiungere DeepSeek R1 e V3
- [ ] Aggiungere Phi-4
- [ ] Aggiungere CodeLlama
- [ ] Aggiungere modelli vision (LLaVA, Moondream)
- [ ] Aggiungere coding specialists (StarCoder2, Codestral)
- [ ] Aggiungere QwQ per reasoning

### Script
- [ ] Automatizzare scraping EvalPlus
- [ ] Aggiungere validazione dati
- [ ] Aggiungere flag per update parziale (solo benchmark, solo modelli)
- [ ] Generare report coverage automatico

---

*Ultimo aggiornamento: 2024-03*
