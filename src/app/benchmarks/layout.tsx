import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community Benchmarks — LocalLLM Advisor',
  description:
    'Real-world LLM performance benchmarks submitted by the community. Compare tokens/second across GPUs, models, and quantization levels.',
  openGraph: {
    title: 'Community Benchmarks — LocalLLM Advisor',
    description: 'Real-world LLM benchmarks from the community',
    type: 'website',
  },
  alternates: {
    canonical: '/benchmarks',
  },
};

export default function BenchmarksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
