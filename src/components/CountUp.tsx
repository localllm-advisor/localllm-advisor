'use client';

import { useCountUp } from '@/hooks/useCountUp';

/**
 * CountUp — animated number that counts from 0 to target on scroll-entry.
 *
 * Usage:
 *   <CountUp to={242} suffix="+" className="text-5xl font-bold" />
 *   <CountUp to={1115} suffix="+" compact />  →  "1.11k+"
 */
interface CountUpProps {
  /** Target number */
  to: number;
  /** Starting number (default: 0) */
  from?: number;
  /** Text after the number, e.g. "+" or "%" */
  suffix?: string;
  /** Text before the number */
  prefix?: string;
  /** Animation duration ms (default: 1400) */
  duration?: number;
  /** Extra className */
  className?: string;
  /**
   * When true and `to` >= 1000, display the animated value in compact
   * thousands notation (e.g. 1115 → "1.11k").  The animation still counts
   * the raw integer internally; only the rendering is formatted.
   */
  compact?: boolean;
}

/**
 * Format a raw integer as a compact "Xk" string, floored to 2 decimal
 * places so the final frame never overshoots (e.g. 1115 → "1.11k", not "1.12k").
 */
function formatCompact(value: number): string {
  return (Math.floor(value / 10) / 100).toFixed(2) + 'k';
}

export default function CountUp({
  to,
  from = 0,
  suffix = '',
  prefix = '',
  duration = 1400,
  className = '',
  compact = false,
}: CountUpProps) {
  const { ref, value } = useCountUp({ to, from, duration });

  // Use compact formatting only when the final target warrants it
  const displayValue = compact && to >= 1000 ? formatCompact(value) : value;

  return (
    <span ref={ref} className={className}>
      {prefix}{displayValue}{suffix}
    </span>
  );
}
