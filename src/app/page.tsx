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
          {/* Animated Mesh Gradient Background */}
          <MeshGradient />

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

              {/* Tagline — typing effect */}
              <Reveal delay={100}>
                <p className={`text-2xl sm:text-3xl font-semibold h-[1.5em] ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  <TypeWriter
                    phrases={[
                      'Run AI locally. Keep your data yours.',
                      'Find the best LLM for your GPU.',
                      'No cloud. No API fees. Total privacy.',
                      'From Llama to Mistral — ranked for your hardware.',
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
                      <CountUp to={607} suffix="+" duration={1600} />
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

              {/* Instant Check Card */}
              <Reveal delay={600}>
                <div className="pt-12">
                  <InstantCheck />
                </div>
              </Reveal>

              {/* Beginner Guide Card */}
              <Reveal delay={700}>
                <div className="pt-12 mx-auto max-w-2xl">
                  <Link href="/guide">
                    <div className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                      isDark
                        ? 'border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-cyan-950/40 hover:border-cyan-400/60 hover:shadow-2xl hover:shadow-cyan-500/20'
                        : 'border-cyan-200 bg-gradient-to-r from-cyan-50/80 via-blue-50/60 to-cyan-50/80 hover:border-cyan-400 hover:shadow-2xl hover:shadow-cyan-400/20'
                    }`}>
                      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                        isDark
                          ? 'bg-gradient-to-r from-cyan-600/0 via-cyan-600/10 to-cyan-600/0'
                          : 'bg-gradient-to-r from-cyan-400/0 via-cyan-400/10 to-cyan-400/0'
                      }`} />
                      <div className="relative p-6 flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center transition-all duration-300 ${
                          isDark ? 'bg-cyan-500/20 group-hover:bg-cyan-500/30 group-hover:scale-110' : 'bg-cyan-100 group-hover:bg-cyan-200 group-hover:scale-110'
                        }`}>
                          <svg className={`w-6 h-6 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`text-lg font-bold group-hover:text-cyan-500 transition-colors ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              New to Local AI?
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isDark ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-cyan-100 text-cyan-600 border border-cyan-200'
                            }`}>
                              Guide
                            </span>
                          </div>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Step-by-step beginner guide — from zero to your first chatbot in minutes
                          </p>
                        </div>
                        <svg className={`w-5 h-5 flex-shrink-0 transition-all duration-300 group-hover:translate-x-1.5 ${isDark ? 'text-cyan-500 group-hover:text-cyan-400' : 'text-cyan-400 group-hover:text-cyan-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                </div>
              </Reveal>

            </div>
          </div>
        </section>
      </main>

      {/* Footer with Newsletter Banner */}
      <SiteFooter />
    </div>
  );
}
