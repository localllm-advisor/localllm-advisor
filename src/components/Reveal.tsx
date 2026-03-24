'use client';

import { ReactNode } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

/**
 * Reveal — wrapper component for scroll-triggered fade-in.
 *
 * Usage:
 *   <Reveal>
 *     <section>...</section>
 *   </Reveal>
 *
 *   <Reveal delay={200} direction="left">
 *     <div>slides in from left after 200ms</div>
 *   </Reveal>
 */
interface RevealProps {
  children: ReactNode;
  /** Extra delay in ms (stagger children). Default: 0 */
  delay?: number;
  /** Slide direction. Default: 'up' */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  /** Extra className */
  className?: string;
  /** HTML tag to render. Default: 'div' */
  as?: keyof JSX.IntrinsicElements;
}

export default function Reveal({
  children,
  delay = 0,
  direction = 'up',
  className = '',
  as: Tag = 'div',
}: RevealProps) {
  const { ref, visible } = useScrollReveal({ threshold: 0.1 });

  const directionMap = {
    up: 'translateY(24px)',
    down: 'translateY(-24px)',
    left: 'translateX(24px)',
    right: 'translateX(-24px)',
    none: 'none',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Component = Tag as React.ElementType;

  return (
    <Component
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : directionMap[direction],
        transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </Component>
  );
}
