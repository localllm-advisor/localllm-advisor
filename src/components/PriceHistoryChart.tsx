'use client';

import { useMemo, useState } from 'react';
import { GpuPricePoint, PriceTrend } from '@/lib/types';

interface PriceHistoryChartProps {
  data: GpuPricePoint[];
  trend: PriceTrend;
  width?: number;
  height?: number;
  isDark?: boolean;
  showAxis?: boolean;
}

export default function PriceHistoryChart({
  data,
  trend,
  width = 300,
  height = 120,
  isDark = true,
  showAxis = true,
}: PriceHistoryChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<GpuPricePoint | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const chartData = useMemo(() => {
    if (data.length === 0) return null;

    const prices = data.map(d => d.price_usd);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // Padding for the chart
    const padX = showAxis ? 40 : 10;
    const padY = 20;
    const chartWidth = width - padX * 2;
    const chartHeight = height - padY * 2;

    // Generate points for the path
    const points = data.map((d, i) => {
      const x = padX + (i / (data.length - 1 || 1)) * chartWidth;
      const y = padY + chartHeight - ((d.price_usd - minPrice) / priceRange) * chartHeight;
      return { x, y, data: d };
    });

    // Create SVG path
    const pathD = points.reduce((acc, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      return `${acc} L ${point.x} ${point.y}`;
    }, '');

    // Create area path (for gradient fill)
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padY} L ${padX} ${height - padY} Z`;

    return {
      points,
      pathD,
      areaD,
      minPrice,
      maxPrice,
      padX,
      padY,
      chartHeight,
    };
  }, [data, width, height, showAxis]);

  if (!chartData || data.length < 2) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg ${
          isDark ? 'bg-gray-800/50 text-gray-500' : 'bg-gray-100 text-gray-400'
        }`}
        style={{ width, height }}
      >
        <span className="text-sm">No price data available</span>
      </div>
    );
  }

  const trendColor = trend === 'dropping' ? '#22c55e' : trend === 'rising' ? '#ef4444' : '#6b7280';
  const gradientId = `price-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="relative">
      <svg
        width={width}
        height={height}
        className="overflow-visible"
        onMouseLeave={() => setHoveredPoint(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={trendColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={trendColor} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Y-axis labels */}
        {showAxis && (
          <>
            <text
              x={chartData.padX - 5}
              y={chartData.padY}
              textAnchor="end"
              className={`text-[10px] ${isDark ? 'fill-gray-500' : 'fill-gray-400'}`}
            >
              ${chartData.maxPrice}
            </text>
            <text
              x={chartData.padX - 5}
              y={height - chartData.padY}
              textAnchor="end"
              className={`text-[10px] ${isDark ? 'fill-gray-500' : 'fill-gray-400'}`}
            >
              ${chartData.minPrice}
            </text>
          </>
        )}

        {/* Grid lines */}
        <line
          x1={chartData.padX}
          y1={chartData.padY}
          x2={width - chartData.padX}
          y2={chartData.padY}
          stroke={isDark ? '#374151' : '#e5e7eb'}
          strokeDasharray="4,4"
        />
        <line
          x1={chartData.padX}
          y1={height - chartData.padY}
          x2={width - chartData.padX}
          y2={height - chartData.padY}
          stroke={isDark ? '#374151' : '#e5e7eb'}
          strokeDasharray="4,4"
        />

        {/* Area fill */}
        <path d={chartData.areaD} fill={`url(#${gradientId})`} />

        {/* Line */}
        <path
          d={chartData.pathD}
          fill="none"
          stroke={trendColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Interactive points */}
        {chartData.points.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={hoveredPoint === point.data ? 6 : 4}
            fill={hoveredPoint === point.data ? trendColor : 'transparent'}
            stroke={trendColor}
            strokeWidth={2}
            className="cursor-pointer transition-all"
            onMouseEnter={() => {
              setHoveredPoint(point.data);
              setMousePos({ x: point.x, y: point.y });
            }}
          />
        ))}

        {/* Current price indicator */}
        {chartData.points.length > 0 && (
          <circle
            cx={chartData.points[chartData.points.length - 1].x}
            cy={chartData.points[chartData.points.length - 1].y}
            r={5}
            fill={trendColor}
            stroke={isDark ? '#1f2937' : '#ffffff'}
            strokeWidth={2}
          />
        )}
      </svg>

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          className={`absolute z-10 px-2 py-1 rounded text-xs pointer-events-none whitespace-nowrap ${
            isDark ? 'bg-gray-900 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-200 shadow-lg'
          }`}
          style={{
            left: mousePos.x,
            top: mousePos.y - 40,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-semibold">${hoveredPoint.price_usd}</div>
          <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            {new Date(hoveredPoint.scraped_at).toLocaleDateString()}
          </div>
          <div className={`capitalize ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {hoveredPoint.retailer}
          </div>
        </div>
      )}
    </div>
  );
}

// Mini chart for inline use (no axis, smaller)
export function MiniPriceChart({
  data,
  trend,
  width = 80,
  height = 30,
}: {
  data: GpuPricePoint[];
  trend: PriceTrend;
  width?: number;
  height?: number;
}) {
  const pathD = useMemo(() => {
    if (data.length < 2) return '';

    const prices = data.map(d => d.price_usd);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d.price_usd - minPrice) / priceRange) * height;
      return { x, y };
    });

    return points.reduce((acc, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      return `${acc} L ${point.x} ${point.y}`;
    }, '');
  }, [data, width, height]);

  if (data.length < 2) return null;

  const trendColor = trend === 'dropping' ? '#22c55e' : trend === 'rising' ? '#ef4444' : '#6b7280';

  return (
    <svg width={width} height={height}>
      <path
        d={pathD}
        fill="none"
        stroke={trendColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
