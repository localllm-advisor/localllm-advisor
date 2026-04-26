'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import PageHero from '@/components/PageHero';
import SiteFooter from '@/components/SiteFooter';
import Reveal from '@/components/Reveal';
import { useTheme } from '@/components/ThemeProvider';

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  description: string;
  readingTime: string;
  tag: string;
}

const POSTS: BlogPost[] = [
  {
    slug: 'why-i-built-this',
    title: 'Mapping GPUs to LLMs (and back): A bandwidth-based estimator for local inference',
    date: 'April 2026',
    description:
      'How a weekend project to stop juggling GPU specs, model cards, and Reddit threads turned into a physics-based recommendation engine.',
    readingTime: '7 min read',
    tag: 'Founder Story',
  },
];

export default function BlogPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-amber-950/20' : 'bg-amber-50/50'}`}>
      <Navbar />
      <PageHero
        title="Blog"
        subtitle="Notes on local AI, hardware, and tech news."
        accent="amber"
      />

      <main className="flex-1 mx-auto max-w-3xl w-full px-4 py-12">
        <div className="space-y-6">
          {POSTS.map((post, i) => (
            <Reveal key={post.slug} delay={i * 100}>
              <Link href={`/blog/${post.slug}`} className="block group">
                <article
                  className={`rounded-2xl border p-6 transition-all duration-200 ${
                    isDark
                      ? 'border-gray-700/60 bg-gray-800/40 hover:border-amber-600/50 hover:bg-gray-800/70'
                      : 'border-gray-200 bg-white hover:border-amber-400/60 hover:shadow-md hover:shadow-amber-100'
                  }`}
                >
                  {/* Tag + date row */}
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        isDark
                          ? 'bg-amber-900/40 text-amber-300 border border-amber-700/50'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {post.tag}
                    </span>
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {post.date} · {post.readingTime}
                    </span>
                  </div>

                  {/* Title */}
                  <h2
                    className={`text-lg font-semibold leading-snug mb-2 transition-colors ${
                      isDark
                        ? 'text-white group-hover:text-amber-300'
                        : 'text-gray-900 group-hover:text-amber-700'
                    }`}
                  >
                    {post.title}
                  </h2>

                  {/* Description */}
                  <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {post.description}
                  </p>

                  {/* Read more */}
                  <div
                    className={`mt-4 flex items-center gap-1.5 text-sm font-medium transition-colors ${
                      isDark ? 'text-amber-400 group-hover:text-amber-300' : 'text-amber-600 group-hover:text-amber-700'
                    }`}
                  >
                    Read post
                    <svg
                      className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </article>
              </Link>
            </Reveal>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
