'use client';

import { useState, useEffect } from 'react';
import { GPU, CPU, Model, RecommendationInput, ScoredModel, AdvancedFilters, Quantization } from '@/lib/types';
import { recommend } from '@/lib/engine';

/**
 * Generate an Ollama-compatible tag from model name and quant level.
 * E.g. "Llama 3.1 70B" + "Q4_K_M" → "llama3.1:70b-q4_K_M"
 *      "DeepSeek-V3 685B" + "Q8_0" → "deepseek-v3:685b-q8_0"
 *      "Qwen 2.5 32B" + "FP16"   → "qwen2.5:32b-fp16"
 */
function generateOllamaTag(modelName: string, modelId: string, quantLevel: string): string {
  // Common Ollama model mappings (model id → ollama base name)
  const OLLAMA_NAMES: Record<string, string> = {
    'llama-3.3-70b': 'llama3.3:70b',
    'llama-3.2-90b': 'llama3.2:90b',
    'llama-3.2-11b': 'llama3.2:11b',
    'llama-3.2-3b': 'llama3.2:3b',
    'llama-3.2-1b': 'llama3.2:1b',
    'llama-3.1-405b': 'llama3.1:405b',
    'llama-3.1-70b': 'llama3.1:70b',
    'llama-3.1-8b': 'llama3.1:8b',
    'llama-3-70b': 'llama3:70b',
    'llama-3-8b': 'llama3:8b',
    'mistral-7b': 'mistral:7b',
    'mixtral-8x7b': 'mixtral:8x7b',
    'mixtral-8x22b': 'mixtral:8x22b',
    'gemma-2-27b': 'gemma2:27b',
    'gemma-2-9b': 'gemma2:9b',
    'gemma-2-2b': 'gemma2:2b',
    'phi-4-14b': 'phi4:14b',
    'phi-3.5-mini': 'phi3.5:3.8b',
    'phi-3-mini': 'phi3:3.8b',
    'phi-3-medium': 'phi3:14b',
    'qwen-2.5-72b': 'qwen2.5:72b',
    'qwen-2.5-32b': 'qwen2.5:32b',
    'qwen-2.5-14b': 'qwen2.5:14b',
    'qwen-2.5-7b': 'qwen2.5:7b',
    'qwen-2.5-3b': 'qwen2.5:3b',
    'qwen-2.5-1.5b': 'qwen2.5:1.5b',
    'qwen-2.5-0.5b': 'qwen2.5:0.5b',
    'qwen-2.5-coder-32b': 'qwen2.5-coder:32b',
    'qwen-2.5-coder-14b': 'qwen2.5-coder:14b',
    'qwen-2.5-coder-7b': 'qwen2.5-coder:7b',
    'deepseek-r1-671b': 'deepseek-r1:671b',
    'deepseek-v3-685b': 'deepseek-v3:685b',
    'deepseek-v2.5-236b': 'deepseek-v2.5:236b',
    'deepseek-coder-v2-236b': 'deepseek-coder-v2:236b',
    'command-r-plus-104b': 'command-r-plus:104b',
    'command-r-35b': 'command-r:35b',
    'codellama-70b': 'codellama:70b',
    'codellama-34b': 'codellama:34b',
    'codellama-13b': 'codellama:13b',
    'codellama-7b': 'codellama:7b',
  };

  // Check for known mappings first
  const known = OLLAMA_NAMES[modelId];
  if (known) {
    const quantSuffix = quantLevel === 'FP16' ? 'fp16' : quantLevel.toLowerCase();
    return `${known}-${quantSuffix}`;
  }

  // Fallback: auto-generate from model name
  // "Llama 3.1 70B" → "llama3.1:70b"
  // "DeepSeek-V3 685B" → "deepseek-v3:685b"
  const name = modelName.trim();

  // Extract parameter size (e.g., "70B", "1.5B", "8x7B")
  const sizeMatch = name.match(/(\d+\.?\d*[Bb]|\d+x\d+\.?\d*[Bb])$/);
  const size = sizeMatch ? sizeMatch[1].toLowerCase() : '';

  // Get the base name (everything before the size)
  let base = sizeMatch ? name.slice(0, sizeMatch.index).trim() : name;

  // Clean up: lowercase, remove spaces, keep hyphens and dots
  base = base
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9.\-]/g, '');

  // Remove trailing hyphens or dots
  base = base.replace(/[-.]$/, '');

  const quantSuffix = quantLevel === 'FP16' ? 'fp16' : quantLevel.toLowerCase();

  if (size) {
    return `${base}:${size}-${quantSuffix}`;
  }
  return `${base}-${quantSuffix}`;
}

/**
 * Enrich model quantizations with ollama_tag if missing.
 */
function enrichModelsWithOllamaTags(models: Model[]): Model[] {
  return models.map(model => ({
    ...model,
    quantizations: model.quantizations.map((q: Quantization) => ({
      ...q,
      ollama_tag: q.ollama_tag || generateOllamaTag(model.name, model.id, q.level),
    })),
  }));
}

export function useRecommendation() {
  const [gpus, setGpus] = useState<GPU[]>([]);
  const [cpus, setCpus] = useState<CPU[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [results, setResults] = useState<ScoredModel[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const [gpuRes, cpuRes, modelRes] = await Promise.all([
          fetch(`${basePath}/data/gpus.json`),
          fetch(`${basePath}/data/cpus.json`),
          fetch(`${basePath}/data/models.json`),
        ]);

        if (!gpuRes.ok || !cpuRes.ok || !modelRes.ok) {
          throw new Error('Failed to load data files');
        }

        const [gpuData, cpuData, modelData] = await Promise.all([
          gpuRes.json(),
          cpuRes.json(),
          modelRes.json(),
        ]);

        setGpus(gpuData);
        setCpus(cpuData);
        setModels(enrichModelsWithOllamaTags(modelData));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  function runRecommendation(input: RecommendationInput, filters?: AdvancedFilters) {
    const scored = recommend(models, input, filters);
    setResults(scored);
    return scored;
  }

  function clearResults() {
    setResults(null);
  }

  return { gpus, cpus, models, results, isLoading, error, runRecommendation, clearResults };
}
