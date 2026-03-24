'use client';

import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import EmailCapture from '@/components/EmailCapture';
import Reveal from '@/components/Reveal';
import CountUp from '@/components/CountUp';
import Logo from '@/components/Logo';

export default function LandingPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className={`relative overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
          {/* Gradient Background */}
          <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10' : 'bg-gradient-to-br from-blue-100/50 via-transparent to-purple-100/50'}`} />

          <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-24 lg:py-32">
            {/* Main Content */}
            <div className="text-center space-y-8">
              {/* Title */}
              <Reveal>
                <div className="flex flex-col items-center gap-4">
                  <Logo size={96} showText={false} />
                  <h1 className={`text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    LocalLLM Advisor
                  </h1>
                </div>
              </Reveal>

              {/* Tagline */}
              <Reveal delay={100}>
                <p className={`text-2xl sm:text-3xl font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  Run AI locally. Keep your data yours.
                </p>
              </Reveal>

              {/* Subtitle */}
              <Reveal delay={200}>
                <p className={`text-lg sm:text-xl max-w-3xl mx-auto leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  The free tool that helps you find the best LLM for your hardware, or the best hardware for your LLM. 100% client-side, zero data collection, total privacy.
                </p>
              </Reveal>

              {/* Feature Badges */}
              <Reveal delay={300}>
              <div className="flex flex-wrap justify-center gap-3 pt-4">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${isDark ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Client-side only
                </div>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${isDark ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Zero tracking
                </div>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${isDark ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-purple-100 text-purple-700 border border-purple-200'}`}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Totally free
                </div>
              </div>
              </Reveal>

              {/* Stats Row */}
              <Reveal delay={400}>
                <div className="flex flex-wrap justify-center gap-8 sm:gap-16 pt-8">
                  <div className="text-center">
                    <div className={`text-4xl sm:text-5xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      <CountUp to={287} suffix="+" duration={1600} />
                    </div>
                    <div className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>AI Models</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-4xl sm:text-5xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      <CountUp to={195} suffix="+" duration={1400} />
                    </div>
                    <div className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>GPU Types</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-4xl sm:text-5xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      <CountUp to={78} suffix="+" duration={1200} />
                    </div>
                    <div className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>CPU Types</div>
                  </div>
                </div>
              </Reveal>

              {/* CTA Button */}
              <Reveal delay={500}>
                <div className="pt-8">
                  <Link
                    href="/search"
                    className="group relative inline-flex items-center justify-center px-10 py-4 text-white font-semibold rounded-xl transition-all duration-300 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:via-blue-400 hover:to-indigo-500 shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
                  >
                    <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative">Get Started</span>
                  </Link>
                </div>
              </Reveal>

              {/* Newsletter — integrated into hero, no separation */}
              <Reveal delay={600}>
                <div className="pt-12 mx-auto max-w-xl">
                  <EmailCapture variant="landing" />
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
