'use client';

import { useState, useEffect } from 'react';
import { GPU, CPU, Model, RecommendationInput, ScoredModel, AdvancedFilters } from '@/lib/types';
import { recommend } from '@/lib/engine';

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
        setModels(modelData);
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

  return { gpus, cpus, models, results, isLoading, error, runRecommendation };
}
