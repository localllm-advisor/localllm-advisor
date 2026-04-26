/**
 * datasetStats.ts — server-side utility (never 'use client').
 *
 * Reads the public dataset JSON files at build time and returns the actual
 * counts. Import this only from Server Components or server-only code.
 *
 * Why this exists:
 *   Hardcoded stat numbers on the frontend go stale every time the datasets
 *   are updated. This utility makes them automatically reflect reality at
 *   every build — no manual update ever needed.
 */

import fs from 'fs';
import path from 'path';

export interface DatasetStats {
  modelCount: number;
  gpuCount: number;
  cpuCount: number;
  /** Convenience total used by the Enterprise page ("GPUs & Models Supported") */
  totalHardwareAndModels: number;
}

function readJsonLength(filePath: string): number {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Returns the actual counts from the public/data JSON files.
 * Called at build time (SSG) or request time (SSR) — never in the browser.
 */
export function getDatasetStats(): DatasetStats {
  const dataDir = path.join(process.cwd(), 'public', 'data');

  const modelCount = readJsonLength(path.join(dataDir, 'models.json'));
  const gpuCount   = readJsonLength(path.join(dataDir, 'gpus.json'));
  const cpuCount   = readJsonLength(path.join(dataDir, 'cpus.json'));

  return {
    modelCount,
    gpuCount,
    cpuCount,
    totalHardwareAndModels: gpuCount + modelCount,
  };
}
