'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Hook: Animated number counter that triggers on scroll-entry.
 * Counts from 0 (or `from`) to `to` using requestAnimationFrame + easing.
 *
 * Usage:
 *   const { ref, value } = useCountUp({ to: 242, duration: 1200 });
 *   <span ref={ref}>{value}+</span>
 */
interface CountUpOptions {
  /** Target number */
  to: number;
  /** Starting number (default: 0) */
  from?: number;
  /** Animation duration in ms (default: 1400) */
  duration?: number;
  /** IntersectionObserver threshold (default: 0.3) */
  threshold?: number;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function useCountUp<T extends HTMLElement = HTMLSpanElement>(
  options: CountUpOptions
) {
  const { to, from = 0, duration = 1400, threshold = 0.3 } = options;
  const ref = useRef<T>(null);
  const [value, setValue] = useState(from);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          observer.unobserve(el);

          const startTime = performance.now();

          const tick = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutCubic(progress);
            const current = Math.round(from + (to - from) * eased);
            setValue(current);

            if (progress < 1) {
              requestAnimationFrame(tick);
            }
          };

          requestAnimationFrame(tick);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [to, from, duration, threshold]);

  return { ref, value };
}
