'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle, useTheme } from '@/components/ThemeProvider';
import Logo from '@/components/Logo';

export default function Navbar() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Pages where we DON'T show the Search button (it's redundant there)
  const isHomeOrSearch = pathname === '/' || pathname === '/search';

  const navLinks = [
    { label: 'Tier List', href: '/tier-list' },
    { label: 'Compare', href: '/compare' },
    { label: 'Benchmarks', href: '/benchmarks' },
    { label: 'GPU Prices', href: '/gpu-prices' },
    { label: 'Enterprise', href: '/enterprise' },
    { label: 'Methodology', href: '/methodology' },
    { label: 'Blog', href: '/blog' },
    { label: 'FAQ', href: '/faq' },
    { label: 'About', href: '/about' },
  ];

  // Pages that should be visually highlighted as primary actions in the bar.
  // We render these with a subtle accent ring instead of a flat link to make
  // them more discoverable. Keeps the rest of the nav uncluttered.
  const featuredHrefs = new Set(['/tier-list', '/compare']);

  // Per-link accent colors for the featured CTAs.
  const featuredAccent: Record<string, { dark: string; light: string }> = {
    '/tier-list': {
      dark:  'border-rose-500/40 text-rose-300 hover:bg-rose-500/10',
      light: 'border-rose-300 text-rose-700 hover:bg-rose-50',
    },
    '/compare': {
      dark:  'border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10',
      light: 'border-cyan-300 text-cyan-700 hover:bg-cyan-50',
    },
  };

  return (
    <header className={`sticky top-0 z-50 border-b backdrop-blur-sm ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'}`}>
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className={`transition-colors ${isDark ? 'text-white hover:text-blue-400' : 'text-gray-900 hover:text-blue-600'}`}>
            <Logo size={28} />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-5 items-center text-sm">
            {navLinks.map(link => {
              if (featuredHrefs.has(link.href)) {
                const a = featuredAccent[link.href];
                const tone = isDark ? a.dark : a.light;
                const active = pathname === link.href || pathname.startsWith(link.href + '/');
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${tone} ${active ? (isDark ? 'bg-white/5' : 'bg-black/5') : ''}`}
                  >
                    {link.label}
                  </Link>
                );
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors ${
                    pathname === link.href
                      ? (isDark ? 'text-white font-medium' : 'text-gray-900 font-medium')
                      : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            {/* Search button — shown on all pages except / and /search */}
            {!isHomeOrSearch && (
              <Link
                href="/search"
                className="group relative inline-flex items-center gap-1.5 px-5 py-2 text-white text-sm font-medium rounded-lg transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-sm shadow-blue-600/20 hover:shadow-md hover:shadow-blue-500/25"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </Link>
            )}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            <ThemeToggle />

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 flex flex-col gap-4">
            {navLinks.map(link => {
              if (featuredHrefs.has(link.href)) {
                const a = featuredAccent[link.href];
                const tone = isDark ? a.dark : a.light;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`w-fit px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${tone}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                );
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors ${
                    pathname === link.href
                      ? (isDark ? 'text-white font-medium' : 'text-gray-900 font-medium')
                      : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}
            {!isHomeOrSearch && (
              <Link
                href="/search"
                className="inline-flex items-center gap-1.5 px-5 py-2 text-white text-sm font-medium rounded-lg transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-sm w-fit"
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
