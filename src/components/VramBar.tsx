import { getVramColor } from '@/lib/vram';

interface VramBarProps {
  percent: number;
}

const colorClasses = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
};

export default function VramBar({ percent }: VramBarProps) {
  const color = getVramColor(percent);
  const clampedPercent = Math.min(percent, 100);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 rounded-full bg-gray-700 overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClasses[color]} transition-all duration-300`}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
      <span
        className={`text-xs font-medium ${
          color === 'green'
            ? 'text-green-400'
            : color === 'yellow'
              ? 'text-yellow-400'
              : 'text-red-400'
        }`}
      >
        {percent}% VRAM
      </span>
    </div>
  );
}
