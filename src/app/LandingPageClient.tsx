'use client';

import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';
import Navbar from '@/components/Navbar';
import SiteFooter from '@/components/SiteFooter';
import Reveal from '@/components/Reveal';
import CountUp from '@/components/CountUp';
import Logo from '@/components/Logo';
import TypeWriter from '@/components/TypeWriter';
import MeshGradient from '@/components/MeshGradient';
import InstantCheck from '@/components/InstantCheck';
import HomeBenchmarkFeed from '@/components/HomeBenchmarkFeed';
import type { DatasetStats } from '@/lib/datasetStats';

interface LandingPageClientProps {
  stats: DatasetStats;
}

export default function LandingPageClient({ stats }: LandingPageClientProps) {
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
          <div className={`absolute inset-0 pointer-events-none ${isDark ? 'bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10' : 'bg-gradient-to-br from-blue-100/50 via-transparent to-purple-100/50'}`} />
          {/* Animated Mesh Gradient Background */}
          <MeshGradient />

          <div className="relative mx-auto max-w-5xl px-4 pt-7 pb-12 sm:pt-9 sm:pb-16 lg:pt-11 lg:pb-22">
            {/* Main Content */}
            <div className="text-center space-y-5">
              {/* Title — logo inline with wordmark, compact and professional */}
              <Reveal>
                <div className="flex flex-row items-center justify-center gap-3">
                  <Logo size={50} showText={false} />
                  <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    LocalLLM Advisor
                  </h1>
                </div>
              </Reveal>

              {/* Tagline — typing effect */}
              <Reveal delay={100}>
                <p className={`text-xl sm:text-2xl font-semibold h-[1.5em] ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  <TypeWriter
                    phrases={[
                      'Run AI locally. Keep your data yours.',
                      'Find the best LLM for your GPU.',
                      'Find the best GPU for your LLM.',
                      'No cloud. No API fees. Total privacy.',
                      'From Llama to Mistral — ranked for your hardware.',
                      'Ethical by design.',
                    ]}
                    typingSpeed={45}
                    pauseDuration={2500}
                    deletingSpeed={20}
                    cursorColor={isDark ? 'text-blue-400' : 'text-blue-600'}
                  />
                </p>
              </Reveal>

              {/* Subtitle */}
              <Reveal delay={200}>
                <p className={`text-lg sm:text-lg max-w-2xl mx-auto leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  The free tool that helps you find the best LLM for your hardware, or the best hardware for your LLM. 100% client-side, zero data collection, total privacy.
                </p>
              </Reveal>

              {/* Feature Badges */}
              <Reveal delay={300}>
                <div className="flex flex-wrap justify-center gap-3">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${isDark ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Client-side
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
                    No AI training
                  </div>
                </div>
              </Reveal>

              {/* Stats Row — counts come from actual dataset files, never hardcoded */}
              <Reveal delay={400}>
                <div className="flex flex-wrap justify-center gap-6 sm:gap-12 pt-3">
                  <div className="text-center min-w-[5rem]">
                    <div className={`text-3xl sm:text-4xl font-bold tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      <CountUp to={stats.modelCount} suffix="+" duration={1600} compact />
                    </div>
                    <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>AI Models</div>
                  </div>
                  <div className="text-center min-w-[5rem]">
                    <div className={`text-3xl sm:text-4xl font-bold tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      <CountUp to={stats.gpuCount} suffix="+" duration={1400} />
                    </div>
                    <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>GPU Types</div>
                  </div>
                  <div className="text-center min-w-[5rem]">
                    <div className={`text-3xl sm:text-4xl font-bold tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      <CountUp to={stats.cpuCount} suffix="+" duration={1200} />
                    </div>
                    <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>CPU Types</div>
                  </div>
                </div>
              </Reveal>

              {/* CTA Button */}
              <Reveal delay={500}>
                <div className="pt-3">
                  <Link
                    href="/search"
                    className="group relative inline-flex items-center justify-center px-10 py-4 text-white font-semibold rounded-xl transition-all duration-300 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:via-blue-400 hover:to-indigo-500 shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
                  >
                    <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative">Get Started</span>
                  </Link>
                </div>
              </Reveal>

              {/* Instant Check Card */}
              <Reveal delay={600}>
                <div className="pt-6">
                  <InstantCheck />
                </div>
              </Reveal>

              {/* Tier List + Guide Cards — unified glass-card style */}
              <Reveal delay={650}>
                <div className="pt-8 mx-auto max-w-2xl space-y-3">

                  {/* Tier List */}
                  <Link href="/tier-list">
                    <div className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer ${
                      isDark
                        ? 'border-violet-500/25 bg-gray-900/60 hover:border-violet-400/50 hover:bg-gray-900/80 hover:shadow-xl hover:shadow-violet-500/10'
                        : 'border-violet-200/80 bg-white/70 hover:border-violet-400/70 hover:bg-white hover:shadow-xl hover:shadow-violet-200/60'
                    } backdrop-blur-sm`}>
                      <div className="relative p-5 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                          isDark ? 'bg-violet-500/15 ring-1 ring-violet-500/30' : 'bg-violet-50 ring-1 ring-violet-200'
                        }`}>
                          <svg className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-base font-semibold transition-colors group-hover:text-violet-500 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              LLM Tier List 2026
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                              isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-600'
                            }`}>New</span>
                          </div>
                          <p className={`text-sm leading-snug ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            S–D ranked models for every VRAM budget — 8 GB to 48 GB+
                          </p>
                        </div>
                        <svg className={`w-4 h-4 flex-shrink-0 transition-all duration-300 group-hover:translate-x-1 ${isDark ? 'text-gray-600 group-hover:text-violet-400' : 'text-gray-300 group-hover:text-violet-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>

                  {/* Beginner Guide */}
                  <Link href="/guide">
                    <div className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer ${
                      isDark
                        ? 'border-indigo-500/25 bg-gray-900/60 hover:border-indigo-400/50 hover:bg-gray-900/80 hover:shadow-xl hover:shadow-indigo-500/10'
                        : 'border-indigo-200/80 bg-white/70 hover:border-indigo-400/70 hover:bg-white hover:shadow-xl hover:shadow-indigo-200/60'
                    } backdrop-blur-sm`}>
                      <div className="relative p-5 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                          isDark ? 'bg-indigo-500/15 ring-1 ring-indigo-500/30' : 'bg-indigo-50 ring-1 ring-indigo-200'
                        }`}>
                          <svg className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-base font-semibold transition-colors group-hover:text-indigo-500 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              New to Local AI?
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                              isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'
                            }`}>Guide</span>
                          </div>
                          <p className={`text-sm leading-snug ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Step-by-step beginner guide — from zero to your first chatbot in minutes
                          </p>
                        </div>
                        <svg className={`w-4 h-4 flex-shrink-0 transition-all duration-300 group-hover:translate-x-1 ${isDark ? 'text-gray-600 group-hover:text-indigo-400' : 'text-gray-300 group-hover:text-indigo-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>

                </div>
              </Reveal>

            </div>
          </div>

          {/* Live community benchmark feed — inside hero so MeshGradient shows through */}
          <HomeBenchmarkFeed />

        </section>
      </main>

      {/* Footer with Newsletter Banner */}
      <SiteFooter />
    </div>
  );
}
