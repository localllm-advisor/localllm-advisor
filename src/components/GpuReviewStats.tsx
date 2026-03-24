'use client';

import { useTheme } from './ThemeProvider';
import StarRating from './StarRating';
import type { GpuReviewStats as GpuReviewStatsType } from '@/lib/types';

interface GpuReviewStatsProps {
  stats: GpuReviewStatsType | null;
  compact?: boolean;
  onViewReviews?: () => void;
}

export default function GpuReviewStats({
  stats,
  compact = false,
  onViewReviews,
}: GpuReviewStatsProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!stats || stats.review_count === 0) {
    if (compact) {
      return (
        <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          No reviews
        </span>
      );
    }
    return null;
  }

  if (compact) {
    return (
      <button
        onClick={onViewReviews}
        className={`flex items-center gap-1 text-sm hover:underline ${
          isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <StarRating rating={stats.avg_rating} size="sm" />
        <span>({stats.review_count})</span>
      </button>
    );
  }

  return (
    <div className={`p-4 rounded-xl border ${
      isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Community Reviews
        </h4>
        {onViewReviews && (
          <button
            onClick={onViewReviews}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            View all
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="text-center">
          <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {stats.avg_rating.toFixed(1)}
          </div>
          <StarRating rating={stats.avg_rating} size="sm" />
          <div className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {stats.review_count} review{stats.review_count !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="flex-1 space-y-2">
          {stats.avg_llm_performance !== null && (
            <div className="flex items-center justify-between">
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                LLM Performance
              </span>
              <div className="flex items-center gap-2">
                <StarRating rating={stats.avg_llm_performance} size="sm" />
                <span className={`text-sm w-8 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {stats.avg_llm_performance.toFixed(1)}
                </span>
              </div>
            </div>
          )}
          {stats.avg_value !== null && (
            <div className="flex items-center justify-between">
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Value
              </span>
              <div className="flex items-center gap-2">
                <StarRating rating={stats.avg_value} size="sm" />
                <span className={`text-sm w-8 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {stats.avg_value.toFixed(1)}
                </span>
              </div>
            </div>
          )}
          {stats.avg_speed_tps !== null && (
            <div className="flex items-center justify-between">
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Avg Speed
              </span>
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                ~{stats.avg_speed_tps} tok/s
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
