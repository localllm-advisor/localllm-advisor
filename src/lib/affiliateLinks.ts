import { GPU } from './types';

// ============================================================================
// Affiliate configuration — driven entirely by environment variables.
//
// Active retailers (shown to users):
//   Amazon   → NEXT_PUBLIC_AMAZON_TAG        ✓ active
//   eBay     → NEXT_PUBLIC_EBAY_CAMPAIGN_ID  ✓ active (Smart Links + EPN URLs)
//
// Inactive retailers (commented out — uncomment + set env var when ready):
//   Newegg   → NEXT_PUBLIC_RAKUTEN_ID         (join Rakuten/LinkShare first)
//   B&H      → NEXT_PUBLIC_BH_AFFILIATE_ID    (get deep-link format from assigned network)
//
// Cloud providers (not retail cards, unaffected):
//   RunPod   → NEXT_PUBLIC_RUNPOD_REF_URL     ✓ active
//   Vast.ai  → NEXT_PUBLIC_VAST_REF_URL       ✓ active
//   Lambda   → NEXT_PUBLIC_LAMBDA_REF_URL     (set when you have a referral URL)
//
// No per-product configuration is ever needed. 
// ============================================================================

const AMAZON_TAG      = process.env.NEXT_PUBLIC_AMAZON_TAG      || '';
const RUNPOD_REF_URL  = process.env.NEXT_PUBLIC_RUNPOD_REF_URL  || 'https://runpod.io';
const VAST_REF_URL    = process.env.NEXT_PUBLIC_VAST_REF_URL    || 'https://cloud.vast.ai';
const LAMBDA_REF_URL  = process.env.NEXT_PUBLIC_LAMBDA_REF_URL  || 'https://lambdalabs.com';
const EBAY_CAMPAIGN_ID = process.env.NEXT_PUBLIC_EBAY_CAMPAIGN_ID || '';

// ── Inactive — uncomment when you have the affiliate IDs ──────────────────
// const RAKUTEN_ID     = process.env.NEXT_PUBLIC_RAKUTEN_ID     || '';  // Newegg
// const BH_AFFILIATE_ID = process.env.NEXT_PUBLIC_BH_AFFILIATE_ID || ''; // B&H Photo

// Active retailers only — extend this union when re-enabling others
export type RetailerName = 'Amazon' | 'eBay';
// Future: | 'Newegg' | 'B&H Photo'

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
  // Reliable fallback: Amazon search with associate tag
  const base = `https://www.amazon.it/s?k=${encodeURIComponent(gpuName)}`;
  if (AMAZON_TAG) {
    return { href: `${base}&tag=${AMAZON_TAG}`, monetized: true };
  }
  return { href: base, monetized: false };
}

// ============================================================================
// eBay — EPN URL format (primary) + Smart Links script (backup)
//
// The Smart Links script in layout.tsx (window._epn = {campaign: 5339146601})
// automatically rewrites all ebay.com links in the DOM as a second tracking
// layer. The EPN URL format below is the primary / server-side affiliate link.
//
// To activate: set NEXT_PUBLIC_EBAY_CAMPAIGN_ID in .env.local / .env.production
// Docs: https://partnerhelp.ebay.com/helpcenter/s/article/Smart-Links-Quick-Start-Guide
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
// Newegg via Rakuten (LinkShare) — INACTIVE
//
// To reactivate:
//   1. Join Rakuten Advertising at https://rakutenadvertising.com/
//   2. Apply to the Newegg program (merchant ID 32440)
//   3. Set NEXT_PUBLIC_RAKUTEN_ID in .env.local and .env.production
//   4. Uncomment RAKUTEN_ID above and buildNeweggUrl below
//   5. Add 'Newegg' back to RetailerName and re-include it in getRetailerLinks
// ============================================================================

// function buildNeweggUrl(gpuName: string): { href: string; monetized: boolean } {
//   const neweggSearch = `https://www.newegg.com/p/pl?d=${encodeURIComponent(gpuName)}`;
//   if (RAKUTEN_ID) {
//     return {
//       href: `https://click.linksynergy.com/deeplink?id=${RAKUTEN_ID}&mid=32440&murl=${encodeURIComponent(neweggSearch)}`,
//       monetized: true,
//     };
//   }
//   return { href: neweggSearch, monetized: false };
// }

// ============================================================================
// B&H Photo — INACTIVE
//
// To reactivate:
//   1. Apply via CJ Affiliate (https://www.cj.com/) or Impact (check B&H's
//      current network — it has changed over the years)
//   2. Once accepted, get your publisher ID and the correct deep-link format
//   3. Set NEXT_PUBLIC_BH_AFFILIATE_ID in .env.local and .env.production
//   4. Uncomment BH_AFFILIATE_ID above, fill in the TODO below, and
//      uncomment buildBhUrl, then add 'B&H Photo' back to RetailerName
//      and re-include it in getRetailerLinks
// ============================================================================

// function buildBhUrl(gpuName: string): { href: string; monetized: boolean } {
//   const bhSearch = `https://www.bhphotovideo.com/c/search?q=${encodeURIComponent(gpuName)}`;
//   if (BH_AFFILIATE_ID) {
//     // TODO: replace with the deep-link format your assigned network provides.
//     // CJ example:   https://www.jdoqocy.com/click-{BH_AFFILIATE_ID}?url=<encoded bhSearch>
//     // Impact example: https://go.bhphotovideo.com/c/...
//     return { href: bhSearch, monetized: false };
//   }
//   return { href: bhSearch, monetized: false };
// }

// ============================================================================
// Public API
// ============================================================================

/**
 * Returns monetized retailer links for any GPU.
 * Currently active: Amazon + eBay.
 * Newegg and B&H Photo are commented out — see above to reactivate.
 *
 * @param gpuName  The GPU name string (used for search fallbacks)
 * @param gpu      Optional full GPU object; enables ASIN-based Amazon links
 *                 when gpu.affiliate_url has been populated by the scraper.
 */
export function getRetailerLinks(gpuName: string, gpu?: GPU): RetailerLink[] {
  const amazon = buildAmazonUrl(gpuName, gpu);
  const ebay   = buildEbayUrl(gpuName);
  // const newegg = buildNeweggUrl(gpuName);  // uncomment when Rakuten ID is ready
  // const bh     = buildBhUrl(gpuName);      // uncomment when B&H affiliate ID is ready

  return [
    { name: 'Amazon', href: amazon.href, monetized: amazon.monetized },
    { name: 'eBay',   href: ebay.href,   monetized: ebay.monetized   },
    // { name: 'Newegg',    href: newegg.href, monetized: newegg.monetized },
    // { name: 'B&H Photo', href: bh.href,     monetized: bh.monetized    },
  ];
}

/**
 * Returns the href for a single retailer.
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
