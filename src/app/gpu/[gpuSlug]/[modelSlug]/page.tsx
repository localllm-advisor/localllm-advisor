import { getSeoStaticParamsSuperset } from '@/lib/curated';
import GpuModelClient from './GpuModelClient';

/**
 * Static params for the per-(GPU, model) deep page.
 *
 * We don't pre-build the cartesian product of all GPUs × all models — that
 * would be ~30 × 800 = 24k pages, most of them never linked anywhere. Instead
 * we pre-build the UNION of every (gpu, model) pair that any other page on
 * the site might link to:
 *
 *   • popularGpus × popularModels         (existing /search and SEO pages)
 *   • tierGpuExamples × tierAllowedModels (tier-list "see on RTX 4060 →")
 *   • compareEligibleGpus × popularModels (compare-page row links)
 *
 * Computed once in src/lib/curated.ts so this stays in lockstep with whatever
 * tier-list / compare actually emit. If a future page introduces a new link
 * pattern it only needs to extend the superset there, and the build will
 * fail loudly (instead of silently 404-ing) for any stray reference.
 */
export function generateStaticParams() {
  return getSeoStaticParamsSuperset();
}

export default async function GpuModelPage({
  params,
}: {
  params: Promise<{ gpuSlug: string; modelSlug: string }>;
}) {
  const { gpuSlug, modelSlug } = await params;
  return <GpuModelClient gpuSlug={gpuSlug} modelSlug={modelSlug} />;
}
