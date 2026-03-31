import type { Metadata } from 'next';
import Analytics from '@/components/Analytics';
import CookieConsent from '@/components/CookieConsent';
import { ThemeProvider } from '@/components/ThemeProvider';
import MouseGlow from '@/components/MouseGlow';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'LocalLLM Advisor — Find the Best LLM for Your Hardware',
    template: '%s | LocalLLM Advisor',
  },
  description:
    'Privacy-first AI recommendations. Select your GPU, pick a use case, and get instant ranked LLM recommendations with Ollama commands ready to copy. Totally free.',
  keywords: [
    'local LLM', 'AI on device', 'privacy AI', 'GPU LLM', 'Ollama',
    'VRAM calculator', 'RTX LLM', 'run AI locally', 'GGUF models',
    'ethical AI', 'on-premise AI', 'GDPR AI',
  ],
  authors: [{ name: 'LocalLLM Advisor' }],
  creator: 'LocalLLM Advisor',
  metadataBase: new URL('https://localllm-advisor.com'),
  openGraph: {
    title: 'LocalLLM Advisor — Privacy-First AI Recommendations',
    description: 'Find the best local LLM for your hardware, or the best hardware for your LLM. No cloud, no data sharing, no API fees.',
    type: 'website',
    siteName: 'LocalLLM Advisor',
    locale: 'en_US',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'LocalLLM Advisor — Privacy-First AI Recommendations',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LocalLLM Advisor — Find the Best LLM for Your Hardware',
    description: 'Privacy-first AI recommendations based on your actual GPU and RAM.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Content Security Policy */}
        <meta
          httpEquiv="Content-Security-Policy"
          content={[
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://epnt.ebay.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self' https://www.google-analytics.com https://api.web3forms.com https://api.buttondown.com https://*.supabase.co https://epnt.ebay.com https://*.ebay.com",
            "frame-src 'none'",
            "object-src 'none'",
            "base-uri 'self'",
          ].join('; ')}
        />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />

        {/* eBay Partner Network — Smart Links
            Automatically converts every ebay.com link on the page into an
            affiliate link using the campaign ID below.
            Docs: https://partnerhelp.ebay.com/helpcenter/s/article/Smart-Links-Quick-Start-Guide */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: 'window._epn = {campaign: 5339146601};' }} />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://epnt.ebay.com/static/epn-smart-tools.js" async />
      </head>
      <body className="antialiased font-sans">
        <ThemeProvider>
          <Analytics />
          <MouseGlow />
          {children}
          <CookieConsent />
        </ThemeProvider>
      </body>
    </html>
  );
}
