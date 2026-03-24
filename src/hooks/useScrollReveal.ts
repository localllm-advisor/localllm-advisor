'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Hook: Scroll-triggered reveal animation.
 * Uses IntersectionObserver to detect when an element enters the viewport.
 * Returns a ref to attach to the element and a `visible` boolean.
 *
 * Usage:
 *   const { ref, visible } = useScrollReveal({ threshold: 0.15 });
 *   <div ref={ref} className={`reveal ${visible ? 'reveal-visible' : ''}`}>
 */
interface ScrollRevealOptions {
  /** Fraction of element visible before triggering (0–1). Default: 0.12 */
  threshold?: number;
  /** Only fire once (default: true) */
  once?: boolean;
  /** Root margin — triggers earlier/later. Default: '0px 0px -40px 0px' */
  rootMargin?: string;
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {}
) {
  const { threshold = 0.12, once = true, rootMargin = '0px 0px -40px 0px' } = options;
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once, rootMargin]);

  return { ref, visible };
}
