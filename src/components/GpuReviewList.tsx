'use client';

import { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import GpuReviewCard from './GpuReviewCard';
import type { GpuReview } from '@/lib/types';
import { getGpuReviews, getUserGpuReview, deleteGpuReview, getUser } from '@/lib/supabase';

interface GpuReviewListProps {
  gpuName: string;
  onWriteReview: () => void;
  onEditReview: (review: GpuReview) => void;
  onLoginRequired: () => void;
  refreshKey?: number;
}

export default function GpuReviewList({
  gpuName,
  onWriteReview,
  onEditReview,
  onLoginRequired,
  refreshKey = 0,
}: GpuReviewListProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [reviews, setReviews] = useState<GpuReview[]>([]);
  const [userReview, setUserReview] = useState<GpuReview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'upvotes' | 'rating_overall' | 'created_at'>('upvotes');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadReviews();
    loadUserInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpuName, sortBy, refreshKey]);

  const loadUserInfo = async () => {
    const user = await getUser();
    setUserId(user?.id || null);
    if (user) {
      const review = await getUserGpuReview(gpuName);
      setUserReview(review);
    } else {
      setUserReview(null);
    }
  };

  const loadReviews = async () => {
    setIsLoading(true);
    const data = await getGpuReviews(gpuName, { sortBy });
    setReviews(data);
    setIsLoading(false);
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete your review?')) return;

    const result = await deleteGpuReview(reviewId);
    if (result.success) {
      setUserReview(null);
      loadReviews();
    }
  };

  const sortOptions = [
    { value: 'upvotes', label: 'Most Helpful' },
    { value: 'rating_overall', label: 'Highest Rated' },
    { value: 'created_at', label: 'Most Recent' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Community Reviews
        </h3>
        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className={`text-sm px-3 py-1.5 rounded-lg border ${
              isDark
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={userReview ? () => onEditReview(userReview) : onWriteReview}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            {userReview ? 'Edit Your Review' : 'Write Review'}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : reviews.length === 0 ? (
        <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <p className="mb-2">No reviews yet for this GPU.</p>
          <p className="text-sm">Be the first to share your experience!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <GpuReviewCard
              key={review.id}
              review={review}
              onVote={loadReviews}
              onLoginRequired={onLoginRequired}
              isOwnReview={review.user_id === userId}
              onEdit={() => onEditReview(review)}
              onDelete={() => handleDelete(review.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
