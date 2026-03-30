/**
 * Landing page — Server Component.
 *
 * Reads dataset counts from the JSON files at build time (SSG) so the
 * displayed stats always match the actual data. No manual updates needed:
 * every `next build` picks up the current file sizes automatically.
 */

import { getDatasetStats } from '@/lib/datasetStats';
import LandingPageClient from './LandingPageClient';

export default function LandingPage() {
  const stats = getDatasetStats();
  return <LandingPageClient stats={stats} />;
}
