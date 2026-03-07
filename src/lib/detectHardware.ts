/**
 * Hardware detection using WebGL and browser APIs
 */

import { GPU } from './types';

export interface DetectedHardware {
  gpuRenderer: string | null;
  gpuVendor: string | null;
  deviceMemoryGb: number | null;
  coreCount: number | null;
  isSoftwareRenderer: boolean;
  // CPU detection (limited)
  cpuHint: string | null; // e.g. "16 threads" or "Apple M3 Pro"
  isAppleSilicon: boolean;
  appleChip: string | null; // e.g. "M3 Pro", "M2 Max"
}

/**
 * Software/fallback renderers that should be ignored
 */
const SOFTWARE_RENDERERS = [
  'microsoft basic render driver',
  'basic render driver',
  'swiftshader',
  'llvmpipe',
  'softpipe',
  'software rasterizer',
  'mesa',
  'vmware',
  'virtualbox',
  'parallel',
  'remote desktop',
  'rdp',
  'citrix',
];

/**
 * Check if a renderer is a software/fallback renderer
 */
export function isSoftwareRenderer(renderer: string): boolean {
  if (!renderer) return true;
  const lower = renderer.toLowerCase();
  return SOFTWARE_RENDERERS.some(sw => lower.includes(sw));
}

/**
 * Detect GPU using WebGL debug info
 */
export function detectGpuWebGL(): { renderer: string | null; vendor: string | null; isSoftware: boolean } {
  if (typeof window === 'undefined') {
    return { renderer: null, vendor: null, isSoftware: false };
  }

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl || !(gl instanceof WebGLRenderingContext)) {
      return { renderer: null, vendor: null, isSoftware: false };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) {
      return { renderer: null, vendor: null, isSoftware: false };
    }

    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const isSoftware = isSoftwareRenderer(renderer || '');

    return {
      renderer: isSoftware ? null : (renderer || null),
      vendor: isSoftware ? null : (vendor || null),
      isSoftware,
    };
  } catch {
    return { renderer: null, vendor: null, isSoftware: false };
  }
}

/**
 * Detect system RAM (approximate, limited by browser API)
 */
export function detectSystemMemory(): number | null {
  if (typeof navigator === 'undefined') return null;

  // navigator.deviceMemory returns approximate RAM in GB (2, 4, 8, etc.)
  // It's intentionally imprecise for privacy reasons
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return mem || null;
}

/**
 * Detect CPU core count
 */
export function detectCoreCount(): number | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.hardwareConcurrency || null;
}

/**
 * Detect all available hardware info
 */
export function detectHardware(): DetectedHardware {
  const { renderer, vendor, isSoftware } = detectGpuWebGL();
  const coreCount = detectCoreCount();
  const appleChip = detectAppleChip(renderer);
  const platform = typeof navigator !== 'undefined' ? navigator.platform || '' : '';

  return {
    gpuRenderer: renderer,
    gpuVendor: vendor,
    deviceMemoryGb: detectSystemMemory(),
    coreCount,
    isSoftwareRenderer: isSoftware,
    cpuHint: generateCpuHint(coreCount, appleChip, platform),
    isAppleSilicon: !!appleChip,
    appleChip,
  };
}

/**
 * Detect Apple Silicon chip from GPU renderer
 * Returns chip name like "M3 Pro" or null if not Apple Silicon
 */
export function detectAppleChip(renderer: string | null): string | null {
  if (!renderer) return null;

  const appleMatch = renderer.match(/Apple\s*(M\d+)(\s+Pro|\s+Max|\s+Ultra)?/i);
  if (appleMatch) {
    const [, chip, variant] = appleMatch;
    return `${chip}${variant || ''}`.trim();
  }

  return null;
}

/**
 * Generate CPU hint based on available info
 */
export function generateCpuHint(
  coreCount: number | null,
  appleChip: string | null,
  platform: string
): string | null {
  if (appleChip) {
    return `Apple ${appleChip}`;
  }

  if (coreCount) {
    // Try to give helpful hints based on core count
    const hints: string[] = [`${coreCount} threads`];

    if (platform.includes('Win')) {
      if (coreCount >= 32) {
        hints.push('High-end desktop/workstation');
      } else if (coreCount >= 16) {
        hints.push('Mid-high desktop');
      } else if (coreCount >= 8) {
        hints.push('Mid-range desktop/laptop');
      }
    }

    return hints.join(' · ');
  }

  return null;
}

/**
 * Parse GPU renderer string to extract model name
 * Examples:
 *   "NVIDIA GeForce RTX 4070 Ti/PCIe/SSE2" -> "RTX 4070 Ti"
 *   "AMD Radeon RX 7900 XTX" -> "RX 7900 XTX"
 *   "Apple M3 Pro" -> "M3 Pro"
 *   "Intel(R) Arc(TM) A770" -> "Arc A770"
 */
export function parseGpuRenderer(renderer: string): string {
  if (!renderer) return '';

  let name = renderer;

  // Remove common suffixes
  name = name.replace(/\/PCIe\/SSE2$/i, '');
  name = name.replace(/\/PCIe$/i, '');
  name = name.replace(/Direct3D.*$/i, '');
  name = name.replace(/OpenGL Engine$/i, '');

  // NVIDIA: extract RTX/GTX model
  const nvidiaMatch = name.match(/(RTX|GTX)\s*(\d{4})\s*(Ti|SUPER)?/i);
  if (nvidiaMatch) {
    const [, series, model, suffix] = nvidiaMatch;
    return `${series.toUpperCase()} ${model}${suffix ? ' ' + suffix : ''}`.trim();
  }

  // AMD: extract RX model
  const amdMatch = name.match(/RX\s*(\d{4})\s*(XT|XTX)?/i);
  if (amdMatch) {
    const [, model, suffix] = amdMatch;
    return `RX ${model}${suffix ? ' ' + suffix.toUpperCase() : ''}`.trim();
  }

  // Apple: extract M-series
  const appleMatch = name.match(/Apple\s*(M\d+)(\s+Pro|\s+Max|\s+Ultra)?/i);
  if (appleMatch) {
    const [, chip, variant] = appleMatch;
    return `${chip}${variant || ''}`.trim();
  }

  // Intel Arc
  const arcMatch = name.match(/Arc.*?(A\d{3,4})/i);
  if (arcMatch) {
    return `Arc ${arcMatch[1]}`;
  }

  // Fallback: return cleaned string
  return name.replace(/^(NVIDIA|AMD|Intel|Apple)\s*/i, '').trim();
}

/**
 * Find best matching GPU from database based on detected renderer
 */
export function matchGpuFromRenderer(renderer: string, gpus: GPU[]): GPU | null {
  if (!renderer || !gpus.length) return null;

  const parsed = parseGpuRenderer(renderer);
  const rendererLower = renderer.toLowerCase();
  const parsedLower = parsed.toLowerCase();

  // Score each GPU by match quality
  let bestMatch: GPU | null = null;
  let bestScore = 0;

  for (const gpu of gpus) {
    let score = 0;
    const gpuNameLower = gpu.name.toLowerCase();

    // Exact match on parsed name
    if (gpuNameLower.includes(parsedLower) || parsedLower.includes(gpuNameLower)) {
      score += 100;
    }

    // Check aliases
    for (const alias of gpu.aliases) {
      const aliasLower = alias.toLowerCase();
      if (rendererLower.includes(aliasLower) || aliasLower.includes(parsedLower)) {
        score += 80;
        break;
      }
    }

    // Partial matches on key parts
    const gpuParts = gpuNameLower.split(/[\s-]+/);
    const rendererParts = rendererLower.split(/[\s-]+/);

    for (const part of gpuParts) {
      if (part.length > 2 && rendererParts.some(rp => rp.includes(part) || part.includes(rp))) {
        score += 10;
      }
    }

    // Model number match (e.g., "4070", "7900")
    const gpuModelMatch = gpu.name.match(/\d{4}/);
    const rendererModelMatch = renderer.match(/\d{4}/);
    if (gpuModelMatch && rendererModelMatch && gpuModelMatch[0] === rendererModelMatch[0]) {
      score += 50;
    }

    // Variant match (Ti, XTX, Pro, etc.)
    const variants = ['ti', 'super', 'xt', 'xtx', 'pro', 'max', 'ultra'];
    for (const v of variants) {
      const inGpu = gpuNameLower.includes(v);
      const inRenderer = rendererLower.includes(v);
      if (inGpu && inRenderer) {
        score += 30;
      } else if (inGpu !== inRenderer) {
        score -= 20; // Penalty for variant mismatch
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = gpu;
    }
  }

  // Only return if we have a reasonable match
  return bestScore >= 50 ? bestMatch : null;
}
