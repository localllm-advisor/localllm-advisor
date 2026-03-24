import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Find Hardware — LocalLLM Advisor',
  description:
    'Discover the best GPU and hardware setup for running local AI models. Compare GPUs, check VRAM requirements, and get upgrade recommendations.',
  openGraph: {
    title: 'Find Hardware — LocalLLM Advisor',
    description: 'Best GPU and hardware recommendations for local AI',
    type: 'website',
  },
  alternates: {
    canonical: '/search/hardware',
  },
};

export default function HardwareSearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
