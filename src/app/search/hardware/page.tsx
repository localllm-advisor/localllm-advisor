'use client';

import { useRecommendation } from '@/hooks/useRecommendation';
import HardwareFinder from '@/components/HardwareFinder';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import Footer from '@/components/Footer';
import PageHero from '@/components/PageHero';
import { useTheme } from '@/components/ThemeProvider';

export default function HardwareSearchPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { models, gpus, isLoading, error } = useRecommendation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className={isDark ? 'text-gray-400' : 'text-gray-600'}>Loading data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className={isDark ? 'text-red-400' : 'text-red-600'}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-orange-950/40' : 'bg-orange-50/70'}`}>
      <Navbar />
      <BackButton />

      <PageHero
        title="Find the Right Hardware"
        subtitle="Select a model and get hardware recommendations based on your budget and speed preferences."
        accent="orange"
      />

      <main className="flex-1 mx-auto max-w-3xl px-4 py-12 w-full">

        <HardwareFinder models={models} gpus={gpus} />
      </main>

      <Footer />
    </div>
  );
}
