import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GPU Prices — LocalLLM Advisor',
  description:
    'Track GPU prices across retailers. Compare current prices, view price history, and set alerts for the best deals on GPUs for local AI.',
  openGraph: {
    title: 'GPU Prices — LocalLLM Advisor',
    description: 'Track and compare GPU prices for local AI setups',
    type: 'website',
  },
  alternates: {
    canonical: '/gpu-prices',
  },
};

export default function GpuPricesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
