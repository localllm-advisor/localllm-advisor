import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search — LocalLLM Advisor',
  description:
    'Find the perfect local LLM model or hardware for your needs. Privacy-first AI recommendations based on your actual hardware.',
  openGraph: {
    title: 'Search — LocalLLM Advisor',
    description: 'Find the perfect local LLM model or hardware setup',
    type: 'website',
  },
  alternates: {
    canonical: '/search',
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
