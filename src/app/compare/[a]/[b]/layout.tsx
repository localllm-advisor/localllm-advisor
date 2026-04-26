import type { Metadata } from 'next';
import { existsSync } from 'fs';
import { join } from 'path';
import { fromSlug } from '@/lib/seoUtils';

/**
 * Per-pair metadata. The OG image is `compare--<a>--<b>.svg` if the pair is
 * in the popular set generated at build time, else falls back to og-home.svg
 * so social cards never 404.
 */
function resolveOgImage(a: string, b: string): string {
  const candidates = [
    `compare--${a}--${b}.svg`,
    `compare--${b}--${a}.svg`, // generator only emits one direction
  ];
  for (const f of candidates) {
    const fsPath = join(process.cwd(), 'public', 'og', f);
    if (existsSync(fsPath)) return `/og/${f}`;
  }
  return '/og/og-home.svg';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ a: string; b: string }>;
}): Promise<Metadata> {
  const { a, b } = await params;
  const aName = fromSlug(a);
  const bName = fromSlug(b);
  const title = `${aName} vs ${bName} for LLMs`;
  const description = `Side-by-side comparison: which is better for running local LLMs, ${aName} or ${bName}? VRAM, bandwidth, model fit, and tok/s.`;
  const og = resolveOgImage(a, b);

  return {
    title,
    description,
    alternates: { canonical: `/compare/${a}/${b}` },
    openGraph: {
      title, description,
      type: 'article',
      images: [{ url: og, width: 1200, height: 630, alt: `${aName} vs ${bName}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title, description, images: [og],
    },
  };
}

/**
 * JSON-LD: emit a TechArticle + a FAQPage answering "<a> vs <b> for LLMs"
 * so the page is eligible for rich-result rendering in Google SERPs.
 */
function buildCompareLd(a: string, b: string) {
  const aName = fromSlug(a);
  const bName = fromSlug(b);
  const url = `https://localllm-advisor.com/compare/${a}/${b}`;
  const og = `https://localllm-advisor.com${resolveOgImage(a, b)}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: `${aName} vs ${bName} for LLMs`,
      description: `Side-by-side LLM comparison: VRAM, bandwidth, model fit, tok/s.`,
      url,
      image: og,
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
          name: `Which is better for local LLMs, ${aName} or ${bName}?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text:
              `Local LLM performance is dominated by VRAM (which models fit) and memory bandwidth (how fast they decode). ` +
              `localllm-advisor.com computes a per-model fit table for both ${aName} and ${bName} so you can see exactly which side ` +
              `wins on the models you actually want to run.`,
          },
        },
      ],
    },
  ];
}

export default async function CompareLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ a: string; b: string }>;
}) {
  const { a, b } = await params;
  const ld = buildCompareLd(a, b);
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
