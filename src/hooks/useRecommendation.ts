'use client';

import { useState, useEffect } from 'react';
import { GPU, Model, RecommendationInput, ScoredModel } from '@/lib/types';
import { recommend } from '@/lib/engine';

export function useRecommendation() {
  const [gpus, setGpus] = useState<GPU[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [results, setResults] = useState<ScoredModel[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [gpuRes, modelRes] = await Promise.all([
          fetch('/data/gpus.json'),
          fetch('/data/models.json'),
        ]);

        if (!gpuRes.ok || !modelRes.ok) {
          throw new Error('Failed to load data files');
        }

        const [gpuData, modelData] = await Promise.all([
          gpuRes.json(),
          modelRes.json(),
        ]);

        setGpus(gpuData);
        setModels(modelData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  function runRecommendation(input: RecommendationInput) {
    const scored = recommend(models, input);
    setResults(scored);
    return scored;
  }

  return { gpus, models, results, isLoading, error, runRecommendation };
}
