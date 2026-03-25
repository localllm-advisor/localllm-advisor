import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Beginner Guide — Run Your First LLM Locally | LocalLLM Advisor',
  description:
    'Step-by-step guide for total beginners to run a Large Language Model locally on Windows or Mac. Covers Ollama, hardware requirements, model selection, and cloud alternatives.',
  alternates: { canonical: '/guide' },
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
