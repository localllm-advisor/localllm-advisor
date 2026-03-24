import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Find a Model — LocalLLM Advisor',
  description:
    'Get ranked LLM recommendations for your GPU. Enter your hardware specs and use case to find models that actually run on your machine.',
  openGraph: {
    title: 'Find a Model — LocalLLM Advisor',
    description: 'Ranked LLM recommendations based on your actual GPU and RAM',
    type: 'website',
  },
  alternates: {
    canonical: '/search/model',
  },
};

export default function ModelSearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
