import { GPU } from './types';

// ============================================================================
// Affiliate configuration — driven entirely by environment variables.
//
// How to activate each vendor:
//   Amazon   → set NEXT_PUBLIC_AMAZON_TAG        (already active ✓)
//   RunPod   → set NEXT_PUBLIC_RUNPOD_REF_URL     (already active ✓)
//   Vast.ai  → set NEXT_PUBLIC_VAST_REF_URL       (already active ✓)
//   Lambda   → set NEXT_PUBLIC_LAMBDA_REF_URL     (set when you have a referral URL)
//   eBay     → set NEXT_PUBLIC_EBAY_CAMPAIGN_ID   (set when you join eBay Partner Network)
//   Newegg   → set NEXT_PUBLIC_RAKUTEN_ID         (set when you join Rakuten/LinkShare)
//   B&H      → set NEXT_PUBLIC_BH_AFFILIATE_ID    (set when you know your network's format)
//
// No per-product configuration is ever needed. Every GPU in the dataset
// (present and future) is automatically monetized as soon as the env var is set.
// ============================================================================

const AMAZON_TAG = process.env.NEXT_PUBLIC_AMAZON_TAG || '';
const RUNPOD_REF_URL = process.env.NEXT_PUBLIC_RUNPOD_REF_URL || 'https://runpod.io';
const VAST_REF_URL = process.env.NEXT_PUBLIC_VAST_REF_URL || 'https://cloud.vast.ai';
const LAMBDA_REF_URL = process.env.NEXT_PUBLIC_LAMBDA_REF_URL || 'https://lambdalabs.com';
const EBAY_CAMPAIGN_ID = process.env.NEXT_PUBLIC_EBAY_CAMPAIGN_ID || '';
const RAKUTEN_ID = process.env.NEXT_PUBLIC_RAKUTEN_ID || '';
const BH_AFFILIATE_ID = process.env.NEXT_PUBLIC_BH_AFFILIATE_ID || '';

export type RetailerName = 'Amazon' | 'Newegg' | 'eBay' | 'B&H Photo';

export interface RetailerLink {
  name: RetailerName;
  href: string;
  /** true when this link carries an active affiliate tag/code */
  monetized: boolean;
}

// ============================================================================
// Amazon
//
// Priority:
//   1. gpu.affiliate_url  — set by `scrape_gpus.py --affiliate-tag`; ASIN-based,
//      most reliable for Amazon's tracking. Run the script once and every GPU
//      in the dataset gets a proper product link automatically.
//   2. Search-with-tag fallback — works for every GPU name with zero manual work,
//      even for new GPUs added in future scrapes before a re-run of the script.
// ============================================================================

function buildAmazonUrl(gpuName: string, gpu?: GPU): { href: string; monetized: boolean } {
  // Best case: scraper already produced an ASIN-based product URL with the tag
  if (gpu?.affiliate_url) {
    return { href: gpu.affiliate_url, monetized: true };
  }
  // Reliable fallback: Amazon.it search with associate tag
  // amazon.it because the site is in Italian; change to amazon.com if preferred
  const base = `https://www.amazon.it/s?k=${encodeURIComponent(gpuName)}`;
  if (AMAZON_TAG) {
    return { href: `${base}&tag=${AMAZON_TAG}`, monetized: true };
  }
  return { href: base, monetized: false };
}

// ============================================================================
// eBay
//
// Uses the standard eBay Partner Network search link format.
// Set NEXT_PUBLIC_EBAY_CAMPAIGN_ID in .env to activate for all GPUs at once.
// ============================================================================

function buildEbayUrl(gpuName: string): { href: string; monetized: boolean } {
  const base = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(gpuName)}`;
  if (EBAY_CAMPAIGN_ID) {
    return {
      href: `${base}&mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=${EBAY_CAMPAIGN_ID}&toolid=10001&mkevt=1`,
      monetized: true,
    };
  }
  return { href: base, monetized: false };
}

// ============================================================================
// Newegg via Rakuten (LinkShare)
//
// Rakuten deep links wrap any destination URL, so a single publisher ID covers
// every GPU search automatically. Set NEXT_PUBLIC_RAKUTEN_ID to activate.
// mid=32440 is Newegg's Rakuten merchant ID.
// ============================================================================

function buildNeweggUrl(gpuName: string): { href: string; monetized: boolean } {
  const neweggSearch = `https://www.newegg.com/p/pl?d=${encodeURIComponent(gpuName)}`;
  if (RAKUTEN_ID) {
    return {
      href: `https://click.linksynergy.com/deeplink?id=${RAKUTEN_ID}&mid=32440&murl=${encodeURIComponent(neweggSearch)}`,
      monetized: true,
    };
  }
  return { href: neweggSearch, monetized: false };
}

// ============================================================================
// B&H Photo
//
// The exact deep-link format depends on which network B&H assigns you
// (CJ Affiliate, Impact, etc.). Set NEXT_PUBLIC_BH_AFFILIATE_ID once you
// know the format and update the buildBhUrl function with the correct wrapper.
// Until then all links are plain (non-monetized) search URLs.
// ============================================================================

function buildBhUrl(gpuName: string): { href: string; monetized: boolean } {
  const bhSearch = `https://www.bhphotovideo.com/c/search?q=${encodeURIComponent(gpuName)}`;
  if (BH_AFFILIATE_ID) {
    // TODO: replace with the deep-link format your assigned network provides.
    // CJ example:   https://www.jdoqocy.com/click-{BH_AFFILIATE_ID}?url=<encoded bhSearch>
    // Impact example: https://go.bhphotovideo.com/c/...
    // For now, link is non-monetized to avoid broken tracking.
    return { href: bhSearch, monetized: false };
  }
  return { href: bhSearch, monetized: false };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Returns monetized retailer links for any GPU.
 * Works automatically for every product in the dataset — no manual overrides.
 *
 * @param gpuName  The GPU name string (used for search fallbacks)
 * @param gpu      Optional full GPU object; enables ASIN-based Amazon links
 *                 when gpu.affiliate_url has been populated by the scraper.
 */
export function getRetailerLinks(gpuName: string, gpu?: GPU): RetailerLink[] {
  const amazon = buildAmazonUrl(gpuName, gpu);
  const ebay = buildEbayUrl(gpuName);
  const newegg = buildNeweggUrl(gpuName);
  const bh = buildBhUrl(gpuName);

  return [
    { name: 'Amazon',   href: amazon.href,  monetized: amazon.monetized },
    { name: 'Newegg',   href: newegg.href,  monetized: newegg.monetized },
    { name: 'B&H Photo', href: bh.href,     monetized: bh.monetized },
    { name: 'eBay',     href: ebay.href,    monetized: ebay.monetized },
  ];
}

/**
 * Returns the href for a single retailer.
 * Compatible with the (gpu: string) => string signature used in RETAILER_CONFIG.
 */
export function getRetailerUrl(
  retailer: RetailerName | string,
  gpuName: string,
  gpu?: GPU,
): string {
  return getRetailerLinks(gpuName, gpu).find(l => l.name === retailer)?.href ?? '#';
}

/**
 * Returns the referral URL for a cloud provider.
 * All cloud links are set centrally here via env vars.
 */
export function getCloudProviderUrl(provider: string): string {
  const norm = provider.toLowerCase();
  if (norm.includes('runpod')) return RUNPOD_REF_URL;
  if (norm.includes('vast'))   return VAST_REF_URL;
  if (norm.includes('lambda')) return LAMBDA_REF_URL;
  return '#';
}
