'use client';

import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import MeshGradient from '@/components/MeshGradient';

export default function SearchPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Main Content */}
      <main className="flex-1">
        <section className={`relative overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
          <MeshGradient />
          <div className="relative mx-auto max-w-5xl px-4 py-24 sm:py-32">
            {/* Heading */}
            <Reveal>
              <h1 className={`text-4xl sm:text-5xl font-bold text-center mb-16 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                What are you looking for?
              </h1>
            </Reveal>

            {/* Cards Grid */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Card 1: Find a Model */}
              <Reveal delay={100} direction="left">
              <Link href="/search/model">
                <div
                  className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer h-full ${
                    isDark
                      ? 'border-gray-700 bg-gray-800/50 hover:border-blue-500/50 hover:bg-gray-800 hover:shadow-xl hover:shadow-blue-500/20'
                      : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-gray-50 hover:shadow-xl hover:shadow-blue-400/20'
                  }`}
                >
                  {/* Gradient on hover */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity ${isDark ? 'bg-gradient-to-br from-blue-600 to-purple-600' : 'bg-gradient-to-br from-blue-400 to-purple-400'}`} />

                  <div className="relative p-8 sm:p-12 flex flex-col h-full">
                    {/* Icon */}
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 transition-colors ${isDark ? 'bg-blue-500/20 group-hover:bg-blue-500/30' : 'bg-blue-100 group-hover:bg-blue-200'}`}>
                      <svg className={`w-8 h-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>

                    {/* Title */}
                    <h2 className={`text-2xl sm:text-3xl font-bold mb-3 group-hover:text-blue-500 transition-colors ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Find a Model
                    </h2>

                    {/* Description */}
                    <p className={`text-base leading-relaxed flex-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      I have hardware and want to find the best LLM to run on it
                    </p>

                    {/* Arrow */}
                    <div className="mt-6 flex items-center gap-2">
                      <span className={`text-sm font-semibold transition-colors ${isDark ? 'text-gray-400 group-hover:text-blue-400' : 'text-gray-600 group-hover:text-blue-600'}`}>
                        Get started
                      </span>
                      <svg className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isDark ? 'text-gray-400 group-hover:text-blue-400' : 'text-gray-600 group-hover:text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
              </Reveal>

              {/* Card 2: Find Hardware */}
              <Reveal delay={200} direction="right">
              <Link href="/search/hardware">
                <div
                  className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer h-full ${
                    isDark
                      ? 'border-gray-700 bg-gray-800/50 hover:border-orange-500/50 hover:bg-gray-800 hover:shadow-xl hover:shadow-orange-500/20'
                      : 'border-gray-200 bg-white hover:border-orange-400 hover:bg-gray-50 hover:shadow-xl hover:shadow-orange-400/20'
                  }`}
                >
                  {/* Gradient on hover */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity ${isDark ? 'bg-gradient-to-br from-orange-600 to-red-600' : 'bg-gradient-to-br from-orange-400 to-red-400'}`} />

                  <div className="relative p-8 sm:p-12 flex flex-col h-full">
                    {/* Icon */}
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 transition-colors ${isDark ? 'bg-orange-500/20 group-hover:bg-orange-500/30' : 'bg-orange-100 group-hover:bg-orange-200'}`}>
                      <svg className={`w-8 h-8 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                    </div>

                    {/* Title */}
                    <h2 className={`text-2xl sm:text-3xl font-bold mb-3 group-hover:text-orange-500 transition-colors ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Find Hardware
                    </h2>

                    {/* Description */}
                    <p className={`text-base leading-relaxed flex-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      I know which model I want and need the right hardware
                    </p>

                    {/* Arrow */}
                    <div className="mt-6 flex items-center gap-2">
                      <span className={`text-sm font-semibold transition-colors ${isDark ? 'text-gray-400 group-hover:text-orange-400' : 'text-gray-600 group-hover:text-orange-600'}`}>
                        Get started
                      </span>
                      <svg className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isDark ? 'text-gray-400 group-hover:text-orange-400' : 'text-gray-600 group-hover:text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
              </Reveal>
            </div>

            {/* Enterprise Banner */}
            <Reveal delay={300}>
              <Link href="/enterprise">
                <div
                  className={`mt-10 group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                    isDark
                      ? 'border-indigo-500/30 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-indigo-950/60 hover:border-indigo-400/60 hover:shadow-2xl hover:shadow-indigo-500/20'
                      : 'border-indigo-200 bg-gradient-to-r from-indigo-50 via-purple-50/80 to-indigo-50 hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-400/20'
                  }`}
                >
                  {/* Animated gradient shimmer */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                    isDark
                      ? 'bg-gradient-to-r from-indigo-600/0 via-indigo-600/10 to-indigo-600/0'
                      : 'bg-gradient-to-r from-indigo-400/0 via-indigo-400/10 to-indigo-400/0'
                  }`} />

                  <div className="relative p-6 sm:p-8 flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center transition-all duration-300 ${
                      isDark
                        ? 'bg-indigo-500/20 group-hover:bg-indigo-500/30 group-hover:scale-110'
                        : 'bg-indigo-100 group-hover:bg-indigo-200 group-hover:scale-110'
                    }`}>
                      <svg className={`w-7 h-7 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`text-xl font-bold group-hover:text-indigo-400 transition-colors ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Enterprise Solutions
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isDark ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-100 text-indigo-600 border border-indigo-200'
                        }`}>
                          For Teams
                        </span>
                      </div>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Fleet sizing, TCO comparison, and custom deployment plans for teams and businesses
                      </p>
                    </div>
                    <svg className={`w-6 h-6 flex-shrink-0 transition-all duration-300 group-hover:translate-x-1.5 ${isDark ? 'text-indigo-500 group-hover:text-indigo-400' : 'text-indigo-400 group-hover:text-indigo-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
