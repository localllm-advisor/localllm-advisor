'use client';

import { useTheme } from '@/components/ThemeProvider';

/**
 * LocalLLM Advisor Logo component.
 * Renders the brand logo via <img>, automatically switching between
 * dark and light variants based on the current theme. Uses subdued
 * opacity to blend with the site's design.
 */

interface LogoProps {
  /** Height in pixels. Width scales proportionally. */
  size?: number;
  /** Show "LocalLLM Advisor" text next to the logo. */
  showText?: boolean;
  /** Additional CSS classes for the container. */
  className?: string;
}

export default function Logo({ size = 32, showText = true, className = '' }: LogoProps) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Black logo on light backgrounds, white logo on dark backgrounds
  const logoFile = isDark ? 'logo_dark.svg' : 'logo_light.svg';

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${basePath}/${logoFile}`}
        alt="LocalLLM Advisor"
        width={size}
        height={size}
        style={{ flexShrink: 0 }}
        aria-hidden={showText ? 'true' : undefined}
      />
      {showText && (
        <span className="font-bold whitespace-nowrap" style={{ fontSize: size * 0.55 }}>
          LocalLLM Advisor
        </span>
      )}
    </span>
  );
}
