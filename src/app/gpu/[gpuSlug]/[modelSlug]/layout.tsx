import type { Metadata } from 'next';
import { existsSync } from 'fs';
import { join } from 'path';

function fromSlug(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Resolve the per-page OG image. Build-time `scripts/generate-og-images.js`
 * pre-renders 1200×630 SVGs into /public/og/ for every popular (gpu, model)
 * combination. If the SVG exists, use it; otherwise fall back to the global
 * og-image.png so social cards never 404.
 */
function resolveOgImage(gpuSlug: string, modelSlug: string): string {
  const ogFile = `gpu-model--${gpuSlug}--${modelSlug}.svg`;
  const fsPath = join(process.cwd(), 'public', 'og', ogFile);
  return existsSync(fsPath) ? `/og/${ogFile}` : '/og-image.png';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gpuSlug: string; modelSlug: string }>;
}): Promise<Metadata> {
  const { gpuSlug, modelSlug } = await params;
  const gpuName = fromSlug(gpuSlug);
  const modelName = fromSlug(modelSlug);

  const title = `Can ${gpuName} Run ${modelName}?`;
  const description = `Check if the ${gpuName} has enough VRAM to run ${modelName} locally. See quantization options, estimated speed, and VRAM usage.`;
  const ogImage = resolveOgImage(gpuSlug, modelSlug);

  return {
    title,
    description,
    alternates: {
      canonical: `/gpu/${gpuSlug}/${modelSlug}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${gpuName} running ${modelName}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

/**
 * JSON-LD structured data — emitted on every (gpu, model) page so Google
 * can show rich results in SERP (FAQ snippet, "TechArticle" badging).
 *
 * We emit:
 *   - TechArticle  → for the page itself (title, description, image)
 *   - FAQPage      → answers the literal "Can X run Y?" question, the
 *                    same question the H1 asks, which gets a rich-result
 *                    eligible snippet.
 */
function buildJsonLd(gpuSlug: string, modelSlug: string) {
  const gpuName = fromSlug(gpuSlug);
  const modelName = fromSlug(modelSlug);
  const url = `https://localllm-advisor.com/gpu/${gpuSlug}/${modelSlug}`;
  const ogImage = `https://localllm-advisor.com${resolveOgImage(gpuSlug, modelSlug)}`;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: `Can ${gpuName} Run ${modelName}?`,
      description: `Compatibility check, VRAM usage, and tokens-per-second estimate for ${modelName} on the ${gpuName}.`,
      url,
      image: ogImage,
      author: { '@type': 'Organization', name: 'localllm-advisor.com' },
      publisher: {
        '@type': 'Organization',
        name: 'localllm-advisor.com',
        url: 'https://localllm-advisor.com',
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `Can the ${gpuName} run ${modelName}?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text:
              `Whether the ${gpuName} can run ${modelName} depends on the chosen quantization. ` +
              `localllm-advisor.com computes the required VRAM for every quant (Q2/Q4/Q5/Q6/Q8) ` +
              `and reports the largest one that fits with 5–15% headroom on the ${gpuName}.`,
          },
        },
        {
          '@type': 'Question',
          name: `What tokens-per-second can I expect from ${modelName} on the ${gpuName}?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text:
              `Token-generation speed for local LLMs is bandwidth-bound. ` +
              `tok/s ≈ memory_bandwidth / model_size_at_chosen_quant. ` +
              `localllm-advisor.com reports an estimate with a ±15–30% uncertainty band reflecting driver / runtime variation.`,
          },
        },
      ],
    },
  ];
}

export default async function GpuModelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ gpuSlug: string; modelSlug: string }>;
}) {
  const { gpuSlug, modelSlug } = await params;
  const ld = buildJsonLd(gpuSlug, modelSlug);
  return (
    <>
      {ld.map((obj, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }}
        />
      ))}
      {children}
    </>
  );
}
