'use client';

import { useCountUp } from '@/hooks/useCountUp';

/**
 * CountUp — animated number that counts from 0 to target on scroll-entry.
 *
 * Usage:
 *   <CountUp to={242} suffix="+" className="text-5xl font-bold" />
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
}

export default function CountUp({
  to,
  from = 0,
  suffix = '',
  prefix = '',
  duration = 1400,
  className = '',
}: CountUpProps) {
  const { ref, value } = useCountUp({ to, from, duration });

  return (
    <span ref={ref} className={className}>
      {prefix}{value}{suffix}
    </span>
  );
}
