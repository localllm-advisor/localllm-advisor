import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LocalLLM Advisor — Find the best LLM for your hardware',
  description:
    'Select your GPU, pick a use case, and get instant ranked LLM recommendations with Ollama commands ready to copy. Zero backend, free, open source.',
  openGraph: {
    title: 'LocalLLM Advisor',
    description: 'Find the best local LLM for your hardware in seconds',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
