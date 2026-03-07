'use client';

import { useState } from 'react';

interface ContextSliderProps {
  value: number;
  onChange: (value: number) => void;
}

const contextOptions = [4096, 8192, 16384, 32768, 65536, 131072, 200000];
const labels = ['4K', '8K', '16K', '32K', '64K', '128K', '200K'];

export default function ContextSlider({ value, onChange }: ContextSliderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentIndex = contextOptions.indexOf(value);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300"
      >
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        Advanced Options
        <span className="text-gray-500">
          (Context: {labels[currentIndex]})
        </span>
      </button>

      {isOpen && (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            Context Length
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max={contextOptions.length - 1}
              step="1"
              value={currentIndex}
              onChange={(e) => onChange(contextOptions[parseInt(e.target.value)])}
              className="flex-1 accent-blue-500"
            />
            <span className="w-12 text-right text-sm font-mono text-blue-400">
              {labels[currentIndex]}
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            {labels.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Higher context uses more VRAM (KV cache grows linearly). 4K for chat, 8-16K for coding, 32K+ for long documents.
          </p>
          {value >= 65536 && (
            <p className="text-xs text-yellow-500">
              High context ({labels[currentIndex]}) requires significant VRAM. Not all models support this.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
