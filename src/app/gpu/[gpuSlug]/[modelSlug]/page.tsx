import { getSEOModels, getSEOGpus, toSlug } from '@/lib/seoUtils';
import GpuModelClient from './GpuModelClient';

// Popular GPU/Model combinations for static generation
const POPULAR_GPU_NAMES = [
  'NVIDIA RTX 4090', 'NVIDIA RTX 4080 SUPER', 'NVIDIA RTX 4080',
  'NVIDIA RTX 4070 Ti SUPER', 'NVIDIA RTX 4070 Ti', 'NVIDIA RTX 4070 SUPER',
  'NVIDIA RTX 4070', 'NVIDIA RTX 4060 Ti 16GB', 'NVIDIA RTX 4060 Ti 8GB',
  'NVIDIA RTX 4060', 'NVIDIA RTX 3090', 'NVIDIA RTX 3090 Ti',
  'NVIDIA RTX 3080 Ti', 'NVIDIA RTX 3080 12GB', 'NVIDIA RTX 3080 10GB',
  'NVIDIA RTX 3070 Ti', 'NVIDIA RTX 3070', 'NVIDIA RTX 3060 12GB',
  'NVIDIA RTX 5090', 'NVIDIA RTX 5080', 'NVIDIA RTX 5070 Ti', 'NVIDIA RTX 5070',
  'AMD RX 7900 XTX', 'AMD RX 7900 XT', 'AMD RX 7800 XT', 'AMD RX 7600',
  'Apple M3 Max (48GB)', 'Apple M4 Max (64GB)', 'Apple M4 Max (128GB)',
  'Apple M2 Ultra (192GB)', 'Apple M4 Pro (24GB)',
];

const POPULAR_MODEL_IDS = [
  'llama-3.1-8b', 'llama-3.1-70b', 'llama-3.1-405b',
  'llama-3.3-70b', 'llama-4-maverick-400b',
  'mistral-7b-v0.1', 'mistral-small-24b-2501', 'mistral-large-123b',
  'mixtral-8x7b',
  'qwen2.5-7b', 'qwen2.5-14b', 'qwen2.5-32b', 'qwen2.5-72b',
  'qwen3-8b', 'qwen3-32b',
  'deepseek-r1-distill-llama-8b', 'deepseek-r1-distill-qwen-32b',
  'deepseek-r1-distill-llama-70b', 'deepseek-r1-684.5b',
  'deepseek-v3-685b',
  'phi-4-14b', 'gemma-9.2b', 'gemma-27.2b',
  'codellama-34b', 'codestral-22b',
  'command-35b', 'command-r-plus-104b',
];

export function generateStaticParams() {
  const allGpus = getSEOGpus();
  const allModels = getSEOModels();

  const gpuNameSet = new Set(POPULAR_GPU_NAMES);
  const modelIdSet = new Set(POPULAR_MODEL_IDS);

  const popularGpus = allGpus.filter(g => gpuNameSet.has(g.name));
  const popularModels = allModels.filter(m => modelIdSet.has(m.id));

  const params: { gpuSlug: string; modelSlug: string }[] = [];

  for (const gpu of popularGpus) {
    for (const model of popularModels) {
      params.push({
        gpuSlug: toSlug(gpu.name),
        modelSlug: toSlug(model.name),
      });
    }
  }

  return params;
}

export default async function GpuModelPage({
  params,
}: {
  params: Promise<{ gpuSlug: string; modelSlug: string }>;
}) {
  const { gpuSlug, modelSlug } = await params;
  return <GpuModelClient gpuSlug={gpuSlug} modelSlug={modelSlug} />;
}
