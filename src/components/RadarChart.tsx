'use client';

interface RadarDataPoint {
  label: string;
  values: number[]; // One value per model, normalized 0-100
}

interface RadarChartProps {
  data: RadarDataPoint[];
  modelNames: string[];
  colors: string[];
  size?: number;
}

export default function RadarChart({ data, modelNames, colors, size = 300 }: RadarChartProps) {
  const center = size / 2;
  const radius = (size / 2) - 40; // Leave room for labels
  const angleStep = (2 * Math.PI) / data.length;

  // Calculate point position on the radar
  const getPoint = (index: number, value: number): { x: number; y: number } => {
    const angle = (index * angleStep) - (Math.PI / 2); // Start from top
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Generate polygon points for a model
  const getPolygonPoints = (modelIndex: number): string => {
    return data
      .map((d, i) => {
        const point = getPoint(i, d.values[modelIndex] ?? 0);
        return `${point.x},${point.y}`;
      })
      .join(' ');
  };

  // Generate axis lines
  const axes = data.map((_, i) => {
    const angle = (i * angleStep) - (Math.PI / 2);
    return {
      x2: center + radius * Math.cos(angle),
      y2: center + radius * Math.sin(angle),
    };
  });

  // Generate concentric circles for scale
  const circles = [20, 40, 60, 80, 100];

  // Label positions
  const labels = data.map((d, i) => {
    const angle = (i * angleStep) - (Math.PI / 2);
    const labelRadius = radius + 25;
    return {
      label: d.label,
      x: center + labelRadius * Math.cos(angle),
      y: center + labelRadius * Math.sin(angle),
    };
  });

  // Map color classes to actual colors for SVG
  const colorMap: Record<string, string> = {
    'bg-blue-500': '#3b82f6',
    'bg-green-500': '#22c55e',
    'bg-purple-500': '#a855f7',
    'bg-orange-500': '#f97316',
    'bg-pink-500': '#ec4899',
    'bg-cyan-500': '#06b6d4',
    'bg-yellow-500': '#eab308',
    'bg-red-500': '#ef4444',
    'bg-indigo-500': '#6366f1',
    'bg-teal-500': '#14b8a6',
  };

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background circles */}
        {circles.map((pct) => (
          <circle
            key={pct}
            cx={center}
            cy={center}
            r={(pct / 100) * radius}
            fill="none"
            stroke="#374151"
            strokeWidth="1"
            strokeDasharray={pct === 100 ? "0" : "4 4"}
            opacity={0.5}
          />
        ))}

        {/* Axis lines */}
        {axes.map((axis, i) => (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={axis.x2}
            y2={axis.y2}
            stroke="#374151"
            strokeWidth="1"
          />
        ))}

        {/* Data polygons */}
        {modelNames.map((_, modelIndex) => (
          <polygon
            key={modelIndex}
            points={getPolygonPoints(modelIndex)}
            fill={colorMap[colors[modelIndex]] || '#3b82f6'}
            fillOpacity={0.15}
            stroke={colorMap[colors[modelIndex]] || '#3b82f6'}
            strokeWidth="2"
          />
        ))}

        {/* Data points */}
        {modelNames.map((_, modelIndex) => (
          data.map((d, i) => {
            const point = getPoint(i, d.values[modelIndex] ?? 0);
            return (
              <circle
                key={`${modelIndex}-${i}`}
                cx={point.x}
                cy={point.y}
                r="4"
                fill={colorMap[colors[modelIndex]] || '#3b82f6'}
              />
            );
          })
        ))}

        {/* Labels */}
        {labels.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={l.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-gray-400 text-xs"
            fontSize="11"
          >
            {l.label}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {modelNames.map((name, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: colorMap[colors[i]] || '#3b82f6' }}
            />
            <span className="text-xs text-gray-300">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
