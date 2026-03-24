'use client';

import { PriceTrend } from '@/lib/types';

interface PriceTrendBadgeProps {
  trend: PriceTrend;
  percentChange?: number;
  size?: 'sm' | 'md';
}

const TREND_CONFIG = {
  rising: {
    icon: '↑',
    label: 'Rising',
    textColor: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
  },
  dropping: {
    icon: '↓',
    label: 'Dropping',
    textColor: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
  },
  stable: {
    icon: '→',
    label: 'Stable',
    textColor: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-500/30',
  },
};

export default function PriceTrendBadge({ trend, percentChange, size = 'sm' }: PriceTrendBadgeProps) {
  const config = TREND_CONFIG[trend];

  const sizeClasses = size === 'sm'
    ? 'text-xs px-1.5 py-0.5 gap-0.5'
    : 'text-sm px-2 py-1 gap-1';

  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium ${sizeClasses} ${config.textColor} ${config.bgColor} ${config.borderColor}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
      {percentChange !== undefined && (
        <span className="opacity-75">
          {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
        </span>
      )}
    </span>
  );
}
