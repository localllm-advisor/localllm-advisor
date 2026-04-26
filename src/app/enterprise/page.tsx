/**
 * Enterprise page — Server Component.
 *
 * Reads dataset counts at build time so the "GPUs & Models Supported" stat
 * always reflects the actual dataset size without any manual update.
 */

import { getDatasetStats } from '@/lib/datasetStats';
import EnterprisePageClient from './EnterprisePageClient';

export default function EnterprisePage() {
  const { totalHardwareAndModels } = getDatasetStats();
  return <EnterprisePageClient totalHardwareAndModels={totalHardwareAndModels} />;
}
