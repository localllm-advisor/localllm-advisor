/**
 * Stripe configuration for enterprise reports.
 *
 * HOW TO ACTIVATE:
 * 1. Create a Stripe account at https://stripe.com (requires Partita IVA in Italy)
 * 2. Create two Payment Links in the Stripe dashboard:
 *    - "Plus Report" at €149
 *    - "Ultra Report" at €500
 * 3. Add the Payment Link URLs to your .env.local:
 *    NEXT_PUBLIC_STRIPE_PLUS_LINK=https://buy.stripe.com/your_plus_link
 *    NEXT_PUBLIC_STRIPE_ULTRA_LINK=https://buy.stripe.com/your_ultra_link
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
  price: string;       // display string, e.g. "€149"
  priceNote: string;   // e.g. "one-time"
  accent: string;      // Tailwind color prefix
  stripeLink: string;
  features: string[];
  highlighted?: boolean;
}

export const SIZING_TIERS: TierConfig[] = [
  {
    id: 'free',
    label: 'Free',
    price: '€0',
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
    label: 'Plus',
    price: '€149',
    priceNote: 'one-time',
    accent: 'blue',
    stripeLink: STRIPE_PLUS_LINK,
    highlighted: true,
    features: [
      'All 24 GPU configurations compared (NVIDIA, AMD, Intel)',
      'Full cost breakdown per GPU (hardware, electricity, maintenance)',
      'Cost-per-concurrent-user efficiency ranking',
      'First-year TCO analysis for every option',
      'Deployment topology details',
      'Exportable data for procurement',
    ],
  },
  {
    id: 'ultra',
    label: 'Ultra',
    price: '€300',
    priceNote: 'one-time',
    accent: 'purple',
    stripeLink: STRIPE_ULTRA_LINK,
    features: [
      'Everything in Plus',
      'GDPR infrastructure compliance assessment',
      'Multi-model fleet optimization (run 2+ models on same hardware)',
      'Power & cooling infrastructure specifications',
      '12-month scaling roadmap with growth projections',
      'Executive-ready PDF report with compliance appendix',
      'Rack layout & networking topology recommendations',
    ],
  },
];

export const TCO_TIERS: TierConfig[] = [
  {
    id: 'free',
    label: 'Free',
    price: '€0',
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
    label: 'Plus',
    price: '€149',
    priceNote: 'one-time',
    accent: 'blue',
    stripeLink: STRIPE_PLUS_LINK,
    highlighted: true,
    features: [
      'Full cumulative cost timeline (month-by-month)',
      'Exact dollar savings for each provider',
      'Detailed on-prem vs. cloud cost breakdown',
      'Growth-adjusted projections over 12–36 months',
      'Per-provider input vs. output token cost split',
      'Exportable comparison data',
    ],
  },
  {
    id: 'ultra',
    label: 'Ultra',
    price: '€300',
    priceNote: 'one-time',
    accent: 'purple',
    stripeLink: STRIPE_ULTRA_LINK,
    features: [
      'Everything in Plus',
      'Sensitivity analysis (3 growth scenarios)',
      'Hidden cloud costs analysis (egress, SLA penalties, support tiers)',
      'GDPR compliance cost addendum (DPO, auditing, breach insurance)',
      'Carbon footprint comparison (on-prem vs. cloud)',
      'Executive-ready PDF report for board presentations',
      'Custom cloud provider pricing (your negotiated rates)',
    ],
  },
];
