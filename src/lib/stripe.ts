/**
 * Stripe configuration for enterprise reports.
 *
 * HOW TO ACTIVATE:
 * 1. Create a Stripe account at https://stripe.com (requires Partita IVA in Italy)
 * 2. Create two Payment Links in the Stripe dashboard:
 *    - "Hardware Sizing Report" at $49 (one-time)
 *    - "Continuous Monitoring" at $199/mo (recurring)
 * 3. Add the Payment Link URLs to your .env.local:
 *    NEXT_PUBLIC_STRIPE_PLUS_LINK=https://buy.stripe.com/your_report_link
 *    NEXT_PUBLIC_STRIPE_ULTRA_LINK=https://buy.stripe.com/your_monitoring_link
 * 4. Redeploy — paid features activate automatically.
 */

export const STRIPE_PLUS_LINK = process.env.NEXT_PUBLIC_STRIPE_PLUS_LINK || '';
export const STRIPE_ULTRA_LINK = process.env.NEXT_PUBLIC_STRIPE_ULTRA_LINK || '';

/** Returns true when at least the Plus link is configured */
export const isStripeConfigured = !!STRIPE_PLUS_LINK;

export type PricingTier = 'free' | 'plus' | 'ultra';

export interface TierConfig {
  id: PricingTier;
  label: string;
  price: string;       // display string, e.g. "$49"
  priceNote: string;   // e.g. "one-time"
  accent: string;      // Tailwind color prefix
  stripeLink: string;
  features: string[];
  highlighted?: boolean;
}

export const SIZING_TIERS: TierConfig[] = [
  {
    id: 'free',
    label: 'Explorer',
    price: '$0',
    priceNote: 'forever',
    accent: 'green',
    stripeLink: '',
    features: [
      'Best-value GPU recommendation',
      'Architecture overview (TP degree, replicas, nodes)',
      'Performance metrics (tok/s, concurrent users)',
      'Scaling curve visualization',
    ],
  },
  {
    id: 'plus',
    label: 'Sizing Report',
    price: '$49',
    priceNote: 'one-time PDF',
    accent: 'blue',
    stripeLink: STRIPE_PLUS_LINK,
    highlighted: true,
    features: [
      'Downloadable PDF report with your exact specs',
      'All 24 GPU configurations compared (NVIDIA, AMD, Intel)',
      'Full cost breakdown per GPU (hardware, electricity, maintenance)',
      'Build vs. Cloud TCO comparison for your workload',
      'Cost-per-concurrent-user efficiency ranking',
      'Deployment topology & rack layout recommendations',
    ],
  },
  {
    id: 'ultra',
    label: 'Monitoring',
    price: '$199',
    priceNote: '/month',
    accent: 'purple',
    stripeLink: STRIPE_ULTRA_LINK,
    features: [
      'Everything in Sizing Report',
      'Live GPU price monitoring dashboard',
      'Weekly price drop alerts via email',
      'GDPR infrastructure compliance assessment',
      'Multi-model fleet optimization (run 2+ models on same hardware)',
      '12-month scaling roadmap with growth projections',
      'Priority support via email',
    ],
  },
];

export const TCO_TIERS: TierConfig[] = [
  {
    id: 'free',
    label: 'Explorer',
    price: '$0',
    priceNote: 'forever',
    accent: 'green',
    stripeLink: '',
    features: [
      'Break-even month for each cloud provider',
      'On-premise vs. cloud verdict',
      'Visual break-even progress bars',
      'Cloud provider selection & comparison',
    ],
  },
  {
    id: 'plus',
    label: 'TCO Report',
    price: '$49',
    priceNote: 'one-time PDF',
    accent: 'blue',
    stripeLink: STRIPE_PLUS_LINK,
    highlighted: true,
    features: [
      'Downloadable PDF with full TCO analysis',
      'Full cumulative cost timeline (month-by-month)',
      'Exact dollar savings for each provider',
      'Detailed on-prem vs. cloud cost breakdown',
      'Growth-adjusted projections over 12–36 months',
      'Per-provider input vs. output token cost split',
    ],
  },
  {
    id: 'ultra',
    label: 'Monitoring',
    price: '$199',
    priceNote: '/month',
    accent: 'purple',
    stripeLink: STRIPE_ULTRA_LINK,
    features: [
      'Everything in TCO Report',
      'Sensitivity analysis (3 growth scenarios)',
      'Hidden cloud costs analysis (egress, SLA penalties, support tiers)',
      'GDPR compliance cost addendum (DPO, auditing, breach insurance)',
      'Carbon footprint comparison (on-prem vs. cloud)',
      'Monthly updated reports as prices change',
      'Custom cloud provider pricing (your negotiated rates)',
    ],
  },
];
