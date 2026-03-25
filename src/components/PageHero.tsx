'use client';

import { useTheme } from './ThemeProvider';
import Reveal from './Reveal';
import MeshGradient from './MeshGradient';

interface PageHeroProps {
  title: string;
  subtitle?: string;
  /** Accent color for the gradient. Defaults to 'blue'. */
  accent?: 'blue' | 'orange' | 'green' | 'purple' | 'indigo' | 'red';
  /** Extra content (badges, stats, etc.) rendered below the subtitle */
  children?: React.ReactNode;
}

const ACCENT_MAP = {
  blue: {
    dark: 'from-blue-600/15 via-transparent to-cyan-600/10',
    light: 'from-blue-100/80 via-transparent to-cyan-100/60',
    line: 'from-transparent via-blue-500 to-transparent',
    bgDark: 'bg-blue-950/20',
    bgLight: 'bg-blue-50/60',
  },
  orange: {
    dark: 'from-orange-600/15 via-transparent to-amber-600/10',
    light: 'from-orange-100/80 via-transparent to-amber-100/60',
    line: 'from-transparent via-orange-500 to-transparent',
    bgDark: 'bg-orange-950/20',
    bgLight: 'bg-orange-50/60',
  },
  green: {
    dark: 'from-green-600/15 via-transparent to-emerald-600/10',
    light: 'from-green-100/80 via-transparent to-emerald-100/60',
    line: 'from-transparent via-green-500 to-transparent',
    bgDark: 'bg-green-950/20',
    bgLight: 'bg-green-50/60',
  },
  purple: {
    dark: 'from-purple-600/15 via-transparent to-pink-600/10',
    light: 'from-purple-100/80 via-transparent to-pink-100/60',
    line: 'from-transparent via-purple-500 to-transparent',
    bgDark: 'bg-purple-950/20',
    bgLight: 'bg-purple-50/60',
  },
  indigo: {
    dark: 'from-indigo-600/15 via-transparent to-violet-600/10',
    light: 'from-indigo-100/80 via-transparent to-violet-100/60',
    line: 'from-transparent via-indigo-500 to-transparent',
    bgDark: 'bg-indigo-950/20',
    bgLight: 'bg-indigo-50/60',
  },
  red: {
    dark: 'from-red-600/15 via-transparent to-rose-600/10',
    light: 'from-red-100/80 via-transparent to-rose-100/60',
    line: 'from-transparent via-red-500 to-transparent',
    bgDark: 'bg-red-950/20',
    bgLight: 'bg-red-50/60',
  },
};

export default function PageHero({ title, subtitle, accent = 'blue', children }: PageHeroProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const a = ACCENT_MAP[accent];

  return (
    <div className={`relative overflow-hidden ${isDark ? a.bgDark : a.bgLight}`}>
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${isDark ? a.dark : a.light}`} />

      {/* Animated mesh grid */}
      <MeshGradient accent={accent} warpStrength={0.7} />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-20">
        <Reveal>
          <h1 className={`text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h1>
        </Reveal>

        {subtitle && (
          <Reveal delay={100}>
            <p className={`mt-4 text-lg max-w-2xl ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {subtitle}
            </p>
          </Reveal>
        )}

        {children && (
          <Reveal delay={200}>
            <div className="mt-6">
              {children}
            </div>
          </Reveal>
        )}

        {/* Accent line at bottom */}
        <div className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r ${a.line} opacity-30`} />
      </div>
    </div>
  );
}
