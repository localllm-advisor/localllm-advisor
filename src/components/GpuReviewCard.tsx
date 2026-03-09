'use client';

import { useState } from 'react';
import { useTheme } from './ThemeProvider';
import StarRating from './StarRating';
import type { GpuReview } from '@/lib/types';
import { voteOnGpuReview } from '@/lib/supabase';

interface GpuReviewCardProps {
  review: GpuReview;
  onVote?: () => void;
  onLoginRequired?: () => void;
  isOwnReview?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function GpuReviewCard({
  review,
  onVote,
  onLoginRequired,
  isOwnReview = false,
  onEdit,
  onDelete,
}: GpuReviewCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isVoting, setIsVoting] = useState(false);
  const [localUpvotes, setLocalUpvotes] = useState(review.upvotes);
  const [localDownvotes, setLocalDownvotes] = useState(review.downvotes);
  const [localUserVote, setLocalUserVote] = useState(review.user_vote);

  const handleVote = async (voteType: 1 | -1) => {
    if (isVoting) return;

    setIsVoting(true);
    const result = await voteOnGpuReview(review.id, voteType);

    if (!result.success) {
      if (result.error?.includes('logged in')) {
        onLoginRequired?.();
      }
      setIsVoting(false);
      return;
    }

    // Optimistic update
    if (localUserVote === voteType) {
      // Toggle off
      setLocalUserVote(null);
      if (voteType === 1) setLocalUpvotes(prev => prev - 1);
      else setLocalDownvotes(prev => prev - 1);
    } else if (localUserVote === -voteType) {
      // Switch vote
      setLocalUserVote(voteType);
      if (voteType === 1) {
        setLocalUpvotes(prev => prev + 1);
        setLocalDownvotes(prev => prev - 1);
      } else {
        setLocalUpvotes(prev => prev - 1);
        setLocalDownvotes(prev => prev + 1);
      }
    } else {
      // New vote
      setLocalUserVote(voteType);
      if (voteType === 1) setLocalUpvotes(prev => prev + 1);
      else setLocalDownvotes(prev => prev + 1);
    }

    setIsVoting(false);
    onVote?.();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const bestForLabels: Record<string, string> = {
    budget: 'Budget-Friendly',
    large_models: 'Large Models (70B+)',
    multi_gpu: 'Multi-GPU Setup',
    quiet: 'Quiet Operation',
    power_efficient: 'Power Efficient',
    beginners: 'Beginners',
  };

  const useCaseLabels: Record<string, string> = {
    chat: 'Chat',
    coding: 'Coding',
    reasoning: 'Reasoning',
    mixed: 'Mixed Use',
  };

  return (
    <div className={`p-4 rounded-xl border ${
      isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          {review.title && (
            <h4 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {review.title}
            </h4>
          )}
          <div className="flex items-center gap-3">
            <StarRating rating={review.rating_overall} size="sm" />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {formatDate(review.created_at)}
            </span>
          </div>
        </div>

        {isOwnReview && (
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className={`text-sm px-2 py-1 rounded ${
                isDark ? 'text-blue-400 hover:bg-gray-700' : 'text-blue-600 hover:bg-gray-100'
              }`}
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className={`text-sm px-2 py-1 rounded ${
                isDark ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-gray-100'
              }`}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Sub-ratings */}
      {(review.rating_llm_performance || review.rating_value || review.rating_noise_temps) && (
        <div className="flex flex-wrap gap-4 mb-3 text-sm">
          {review.rating_llm_performance && (
            <div className="flex items-center gap-1">
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>LLM Perf:</span>
              <StarRating rating={review.rating_llm_performance} size="sm" />
            </div>
          )}
          {review.rating_value && (
            <div className="flex items-center gap-1">
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Value:</span>
              <StarRating rating={review.rating_value} size="sm" />
            </div>
          )}
          {review.rating_noise_temps && (
            <div className="flex items-center gap-1">
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Noise/Temps:</span>
              <StarRating rating={review.rating_noise_temps} size="sm" />
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <p className={`mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        {review.body}
      </p>

      {/* Pros/Cons */}
      {(review.pros.length > 0 || review.cons.length > 0) && (
        <div className="grid grid-cols-2 gap-4 mb-3">
          {review.pros.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-green-500 mb-1">Pros</h5>
              <ul className="text-sm space-y-1">
                {review.pros.map((pro, idx) => (
                  <li key={idx} className={`flex items-start gap-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <span className="text-green-500">+</span>
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {review.cons.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-red-500 mb-1">Cons</h5>
              <ul className="text-sm space-y-1">
                {review.cons.map((con, idx) => (
                  <li key={idx} className={`flex items-start gap-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <span className="text-red-500">-</span>
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Best For Tags */}
      {review.best_for.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {review.best_for.map((tag) => (
            <span
              key={tag}
              className={`px-2 py-0.5 text-xs rounded-full ${
                isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'
              }`}
            >
              {bestForLabels[tag] || tag}
            </span>
          ))}
        </div>
      )}

      {/* LLM Context */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-3">
        {review.typical_speed_tps && (
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            ~{review.typical_speed_tps} tok/s
          </span>
        )}
        {review.vram_usage_percent && (
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            {review.vram_usage_percent}% VRAM
          </span>
        )}
        {review.use_case && (
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            {useCaseLabels[review.use_case]}
          </span>
        )}
        {review.months_owned && (
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            Owned {review.months_owned} month{review.months_owned > 1 ? 's' : ''}
          </span>
        )}
        {review.purchase_price_usd && (
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            Paid ${review.purchase_price_usd}
          </span>
        )}
      </div>

      {/* Models Tested */}
      {review.models_tested.length > 0 && (
        <div className="mb-3">
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Models tested:
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {review.models_tested.map((model, idx) => (
              <span
                key={idx}
                className={`px-2 py-0.5 text-xs rounded ${
                  isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {model}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Voting */}
      <div className="flex items-center gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => handleVote(1)}
          disabled={isVoting}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            localUserVote === 1
              ? 'bg-green-500/20 text-green-500'
              : isDark
              ? 'text-gray-400 hover:text-green-400 hover:bg-gray-700'
              : 'text-gray-500 hover:text-green-600 hover:bg-gray-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
          <span className="text-sm">{localUpvotes}</span>
        </button>
        <button
          onClick={() => handleVote(-1)}
          disabled={isVoting}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            localUserVote === -1
              ? 'bg-red-500/20 text-red-500'
              : isDark
              ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
              : 'text-gray-500 hover:text-red-600 hover:bg-gray-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-sm">{localDownvotes}</span>
        </button>
        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {localUpvotes - localDownvotes > 0 ? '+' : ''}{localUpvotes - localDownvotes} helpful
        </span>
      </div>
    </div>
  );
}
