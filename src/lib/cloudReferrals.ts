/**
 * Cloud GPU Provider Referral Configuration
 * ==========================================
 * Central config for all cloud GPU provider referral/affiliate links.
 *
 * HOW TO ACTIVATE:
 * 1. Sign up for each provider's affiliate/referral program
 * 2. Fill in your referral IDs below
 * 3. Redeploy — links across the entire site update automatically
 *
 * Referral programs:
 *   RunPod:   https://runpod.io/affiliate
 *   Vast.ai:  https://vast.ai/affiliate
 *   Lambda:   https://lambdalabs.com/affiliate
 *   Together: https://together.ai/affiliate
 */

export interface CloudProvider {
  name: string;
  slug: string;
  description: string;
  baseUrl: string;
  referralId: string;       // Your affiliate/referral ID (empty = no tracking)
  referralParam: string;    // URL parameter name for referral (e.g. 'ref', 'utm_source')
  priceLabel: string;       // e.g. "from $0.20/hr"
  highlight?: string;       // e.g. "Best for beginners"
}

export const CLOUD_PROVIDERS: CloudProvider[] = [
  {
    name: 'RunPod',
    slug: 'runpod',
    description: 'On-demand GPU pods with serverless inference. Great for experimentation.',
    baseUrl: 'https://runpod.io',
    referralId: '',           // TODO: add your RunPod referral ID
    referralParam: 'ref',
    priceLabel: 'from $0.20/hr',
    highlight: 'Easiest to start',
  },
  {
    name: 'Vast.ai',
    slug: 'vastai',
    description: 'GPU marketplace with cheap spot instances. Best bang-for-buck.',
    baseUrl: 'https://vast.ai',
    referralId: '',           // TODO: add your Vast.ai referral ID
    referralParam: 'ref_id',
    priceLabel: 'from $0.15/hr',
    highlight: 'Cheapest option',
  },
  {
    name: 'Lambda',
    slug: 'lambda',
    description: 'A100/H100 cloud for serious ML workloads. Top-tier hardware.',
    baseUrl: 'https://lambdalabs.com',
    referralId: '',           // TODO: add your Lambda referral ID
    referralParam: 'ref',
    priceLabel: 'from $1.29/hr',
  },
  {
    name: 'Together AI',
    slug: 'together',
    description: 'Serverless inference API — no GPU management needed. Pay per token.',
    baseUrl: 'https://together.ai',
    referralId: '',           // TODO: add your Together AI referral ID
    referralParam: 'ref',
    priceLabel: 'from $0.20/M tokens',
    highlight: 'No setup required',
  },
];

/**
 * Build a referral-tracked URL for a cloud provider.
 * Returns plain URL if no referral ID is configured.
 */
export function getCloudUrl(slug: string): string {
  const provider = CLOUD_PROVIDERS.find(p => p.slug === slug);
  if (!provider) return '#';
  if (!provider.referralId) return provider.baseUrl;
  const sep = provider.baseUrl.includes('?') ? '&' : '?';
  return `${provider.baseUrl}${sep}${provider.referralParam}=${provider.referralId}`;
}

/**
 * Build a referral-tracked URL from a base URL and provider slug.
 * Used by hardwareAdvisor.ts cloud options.
 */
export function cloudLink(baseUrl: string, slug: string): string {
  const provider = CLOUD_PROVIDERS.find(p => p.slug === slug);
  if (!provider || !provider.referralId) return baseUrl;
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}${provider.referralParam}=${provider.referralId}`;
}

/** Returns true if any referral ID is configured */
export const hasAnyReferrals = CLOUD_PROVIDERS.some(p => !!p.referralId);
