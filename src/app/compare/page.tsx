import type { Metadata } from 'next';
import {
  getCompareEligibleGpus,
  getFeaturedComparePairs,
  getPeerByName,
} from '@/lib/curated';
import CompareIndexClient from './CompareIndexClient';

export const metadata: Metadata = {
  title: 'Compare GPUs for LLMs',
  description:
    'Side-by-side comparisons of consumer GPUs for running local LLMs — VRAM, bandwidth, and model fit.',
  alternates: { canonical: '/compare' },
  openGraph: {
    title: 'Compare GPUs for LLMs',
    description: 'Side-by-side LLM comparisons for popular consumer GPUs.',
    images: [{ url: '/og/og-home.svg', width: 1200, height: 630 }],
  },
};

/**
 * /compare index page. The pool of eligible GPUs and the curated featured
 * pairings both come from src/data/curated.json, the single source of truth
 * shared with /compare/[a]/[b]/page.tsx, sitemap.js and og-images.js.
 */
export default function CompareIndexPage() {
  return (
    <CompareIndexClient
      popular={getCompareEligibleGpus()}
      featuredPairs={getFeaturedComparePairs()}
      peerByName={getPeerByName()}
    />
  );
}
