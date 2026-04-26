import { getSEOGpus, toSlug, checkCompatibility, fromSlug, SEOGPU } from '@/lib/seoUtils';
import { getCompareStaticParams, getPopularModels } from '@/lib/curated';
import CompareClient from './CompareClient';

/**
 * Pre-rendered "GPU A vs GPU B" comparison page.
 *
 * Why this exists: "RTX 4090 vs 5090 LLM" / "RX 7900 XTX vs RTX 4090 LLM" are
 * extremely high-volume Google queries. Each pair gets a unique URL, a unique
 * <h1>, a unique OG image (built by scripts/generate-og-images.js), and
 * structured side-by-side data.
 *
 * The pair set comes from src/data/curated.json (compareEligibleGpuNames) so
 * sitemap, OG images, and this page all build from the same list. Both URL
 * directions of every unordered pair are emitted to keep links symmetrical.
 */

export function generateStaticParams() {
  return getCompareStaticParams();
}

function findGpuBySlug(slug: string): SEOGPU | null {
  const all = getSEOGpus();
  return all.find((g) => toSlug(g.name) === slug) || null;
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ a: string; b: string }>;
}) {
  const { a, b } = await params;
  const gpuA = findGpuBySlug(a);
  const gpuB = findGpuBySlug(b);

  if (!gpuA || !gpuB) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">GPU pair not found</h1>
          <p className="text-gray-500">{fromSlug(a)} or {fromSlug(b)} isn&apos;t in our dataset.</p>
        </div>
      </div>
    );
  }

  // Pre-compute compatibility against the popular models for both GPUs so the
  // client can render a side-by-side table without re-running heavy work.
  const models = getPopularModels();
  const rows = models.map((m) => ({
    model: { id: m.id, name: m.name, params_b: m.params_b, family: m.family },
    a: checkCompatibility(gpuA, m),
    b: checkCompatibility(gpuB, m),
  }));

  return <CompareClient gpuA={gpuA} gpuB={gpuB} rows={rows} />;
}
