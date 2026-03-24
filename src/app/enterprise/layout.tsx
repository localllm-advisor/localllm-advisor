import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Enterprise Solutions — LocalLLM Advisor',
  description:
    'Deploy local AI models in your organization. GDPR-compliant, on-premise LLM infrastructure with full data privacy and predictable costs.',
  openGraph: {
    title: 'Enterprise Solutions — LocalLLM Advisor',
    description: 'GDPR-compliant on-premise AI for your organization',
    type: 'website',
  },
  alternates: {
    canonical: '/enterprise',
  },
};

export default function EnterpriseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
