import type { Metadata } from 'next';
import Analytics from '@/components/Analytics';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'LocalLLM Advisor — Find the best LLM for your hardware',
  description:
    'Select your GPU, pick a use case, and get instant ranked LLM recommendations with Ollama commands ready to copy. Zero backend, free.',
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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <ThemeProvider>
          <Analytics />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
