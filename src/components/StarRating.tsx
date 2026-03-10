'use client';

import { useState } from 'react';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  editable?: boolean;
  onChange?: (rating: number) => void;
  showValue?: boolean;
  label?: string;
}

export default function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  editable = false,
  onChange,
  showValue = false,
  label,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const displayRating = hoverRating !== null ? hoverRating : rating;

  const handleClick = (starIndex: number) => {
    if (editable && onChange) {
      onChange(starIndex);
    }
  };

  const handleMouseEnter = (starIndex: number) => {
    if (editable) {
      setHoverRating(starIndex);
    }
  };

  const handleMouseLeave = () => {
    if (editable) {
      setHoverRating(null);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {label && (
        <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">{label}</span>
      )}
      <div className="flex items-center">
        {[...Array(maxRating)].map((_, index) => {
          const starIndex = index + 1;
          const isFilled = starIndex <= displayRating;
          const isHalf = !isFilled && starIndex - 0.5 <= displayRating;

          return (
            <button
              key={index}
              type="button"
              className={`${sizeClasses[size]} ${editable ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
              onClick={() => handleClick(starIndex)}
              onMouseEnter={() => handleMouseEnter(starIndex)}
              onMouseLeave={handleMouseLeave}
              disabled={!editable}
            >
              <svg
                className={`${sizeClasses[size]} ${
                  isFilled
                    ? 'text-yellow-400'
                    : isHalf
                    ? 'text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
                fill={isFilled ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
          );
        })}
      </div>
      {showValue && (
        <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
