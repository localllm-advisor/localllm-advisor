'use client';

import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';
import Logo from '@/components/Logo';

export default function Footer() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <footer className={`border-t transition-colors ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/50'}`}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        {/* Top section: 3 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          {/* Brand column */}
          <div>
            <Link href="/" className={isDark ? 'text-white' : 'text-gray-900'}>
              <Logo size={24} />
            </Link>
            <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
              The free tool that helps you find the best LLM for your hardware, or the best hardware for your LLM. 100% client-side, zero data collection, total privacy.
            </p>
          </div>

          {/* Resources column */}
          <div>
            <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>Resources</h4>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/gpu-prices" className={`transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                GPU Prices
              </Link>
              <Link href="/benchmarks" className={`transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                Benchmarks
              </Link>
              <Link href="/methodology" className={`transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                Methodology
              </Link>
              <Link href="/faq" className={`transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                FAQ
              </Link>
            </div>
          </div>

          {/* Project column */}
          <div>
            <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>Project</h4>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/about" className={`transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                About
              </Link>
              <Link href="/enterprise" className={`transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                Enterprise
              </Link>
              <Link href="/privacy" className={`transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                Privacy Policy
              </Link>
              <a
                href="mailto:info@localllm-advisor.com"
                className={`inline-flex items-center gap-1 transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Contact Us
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Support banner — hidden until Partita IVA is registered */}
        {/* TODO: Re-enable donation UI after business registration */}

        {/* Bottom bar */}
        <div className={`text-center text-xs pt-6 border-t ${isDark ? 'border-gray-800 text-gray-600' : 'border-gray-200 text-gray-500'}`}>
          <p>© {new Date().getFullYear()} LocalLLM Advisor. Totally free. Run AI locally — keep your data yours.</p>
        </div>
      </div>
    </footer>
  );
}
