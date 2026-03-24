'use client';

import { useState } from 'react';
import { useTheme } from './ThemeProvider';
import StarRating from './StarRating';
import type { GpuReview, NewGpuReviewInput, BestForTag, GpuUseCase } from '@/lib/types';
import { submitGpuReview } from '@/lib/supabase';

interface GpuReviewFormProps {
  gpuName: string;
  existingReview?: GpuReview | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function GpuReviewForm({
  gpuName,
  existingReview,
  onClose,
  onSuccess,
}: GpuReviewFormProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isEditing = !!existingReview;

  const [formData, setFormData] = useState<NewGpuReviewInput>({
    gpu_name: gpuName,
    rating_overall: existingReview?.rating_overall || 0,
    rating_llm_performance: existingReview?.rating_llm_performance || undefined,
    rating_value: existingReview?.rating_value || undefined,
    rating_noise_temps: existingReview?.rating_noise_temps || undefined,
    title: existingReview?.title || '',
    body: existingReview?.body || '',
    pros: existingReview?.pros || [],
    cons: existingReview?.cons || [],
    models_tested: existingReview?.models_tested || [],
    typical_speed_tps: existingReview?.typical_speed_tps || undefined,
    vram_usage_percent: existingReview?.vram_usage_percent || undefined,
    use_case: existingReview?.use_case || undefined,
    best_for: existingReview?.best_for || [],
    purchase_price_usd: existingReview?.purchase_price_usd || undefined,
    months_owned: existingReview?.months_owned || undefined,
  });

  const [proInput, setProInput] = useState('');
  const [conInput, setConInput] = useState('');
  const [modelInput, setModelInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bestForOptions: { value: BestForTag; label: string }[] = [
    { value: 'budget', label: 'Budget-Friendly' },
    { value: 'large_models', label: 'Large Models (70B+)' },
    { value: 'multi_gpu', label: 'Multi-GPU Setup' },
    { value: 'quiet', label: 'Quiet Operation' },
    { value: 'power_efficient', label: 'Power Efficient' },
    { value: 'beginners', label: 'Beginners' },
  ];

  const useCaseOptions: { value: GpuUseCase; label: string }[] = [
    { value: 'chat', label: 'Chat' },
    { value: 'coding', label: 'Coding' },
    { value: 'reasoning', label: 'Reasoning' },
    { value: 'mixed', label: 'Mixed Use' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.rating_overall === 0) {
      setError('Please select an overall rating');
      return;
    }

    if (formData.body.length < 20) {
      setError('Review must be at least 20 characters');
      return;
    }

    setIsSubmitting(true);

    const result = await submitGpuReview(formData);

    if (!result.success) {
      setError(result.error || 'Failed to submit review');
      setIsSubmitting(false);
      return;
    }

    onSuccess();
    onClose();
  };

  const addPro = () => {
    if (proInput.trim() && formData.pros && formData.pros.length < 5) {
      setFormData({ ...formData, pros: [...(formData.pros || []), proInput.trim()] });
      setProInput('');
    }
  };

  const removePro = (index: number) => {
    setFormData({ ...formData, pros: formData.pros?.filter((_, i) => i !== index) });
  };

  const addCon = () => {
    if (conInput.trim() && formData.cons && formData.cons.length < 5) {
      setFormData({ ...formData, cons: [...(formData.cons || []), conInput.trim()] });
      setConInput('');
    }
  };

  const removeCon = (index: number) => {
    setFormData({ ...formData, cons: formData.cons?.filter((_, i) => i !== index) });
  };

  const addModel = () => {
    if (modelInput.trim() && formData.models_tested && formData.models_tested.length < 10) {
      setFormData({ ...formData, models_tested: [...(formData.models_tested || []), modelInput.trim()] });
      setModelInput('');
    }
  };

  const removeModel = (index: number) => {
    setFormData({ ...formData, models_tested: formData.models_tested?.filter((_, i) => i !== index) });
  };

  const toggleBestFor = (tag: BestForTag) => {
    const current = formData.best_for || [];
    if (current.includes(tag)) {
      setFormData({ ...formData, best_for: current.filter((t) => t !== tag) });
    } else if (current.length < 3) {
      setFormData({ ...formData, best_for: [...current, tag] });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border shadow-2xl ${
          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className={`sticky top-0 p-4 border-b ${
            isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {isEditing ? 'Edit Review' : 'Write Review'} for {gpuName}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className={`p-2 rounded-lg ${
                  isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 space-y-6">
            {/* Overall Rating */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Overall Rating *
              </label>
              <StarRating
                rating={formData.rating_overall}
                size="lg"
                editable
                onChange={(rating) => setFormData({ ...formData, rating_overall: rating })}
              />
            </div>

            {/* Sub-ratings */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  LLM Performance
                </label>
                <StarRating
                  rating={formData.rating_llm_performance || 0}
                  size="md"
                  editable
                  onChange={(rating) => setFormData({ ...formData, rating_llm_performance: rating })}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Value for Money
                </label>
                <StarRating
                  rating={formData.rating_value || 0}
                  size="md"
                  editable
                  onChange={(rating) => setFormData({ ...formData, rating_value: rating })}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Noise & Temps
                </label>
                <StarRating
                  rating={formData.rating_noise_temps || 0}
                  size="md"
                  editable
                  onChange={(rating) => setFormData({ ...formData, rating_noise_temps: rating })}
                />
              </div>
            </div>

            {/* Title */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Review Title (optional)
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                maxLength={150}
                placeholder="Summarize your experience"
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDark
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>

            {/* Body */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Your Review *
              </label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                minLength={20}
                maxLength={3000}
                rows={5}
                placeholder="Share your experience using this GPU for local LLMs..."
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDark
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                }`}
              />
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {formData.body.length}/3000 characters (min 20)
              </p>
            </div>

            {/* Pros */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Pros (up to 5)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={proInput}
                  onChange={(e) => setProInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPro())}
                  placeholder="Add a pro"
                  className={`flex-1 px-3 py-2 rounded-lg border ${
                    isDark
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={addPro}
                  disabled={(formData.pros?.length || 0) >= 5}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.pros?.map((pro, idx) => (
                  <span
                    key={idx}
                    className={`flex items-center gap-1 px-2 py-1 text-sm rounded ${
                      isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {pro}
                    <button type="button" onClick={() => removePro(idx)} className="hover:text-red-500">
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Cons */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Cons (up to 5)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={conInput}
                  onChange={(e) => setConInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCon())}
                  placeholder="Add a con"
                  className={`flex-1 px-3 py-2 rounded-lg border ${
                    isDark
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={addCon}
                  disabled={(formData.cons?.length || 0) >= 5}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.cons?.map((con, idx) => (
                  <span
                    key={idx}
                    className={`flex items-center gap-1 px-2 py-1 text-sm rounded ${
                      isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {con}
                    <button type="button" onClick={() => removeCon(idx)} className="hover:text-red-500">
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Best For Tags */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Best For (select up to 3)
              </label>
              <div className="flex flex-wrap gap-2">
                {bestForOptions.map((opt) => {
                  const isSelected = formData.best_for?.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleBestFor(opt.value)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        isSelected
                          ? 'bg-purple-600 border-purple-600 text-white'
                          : isDark
                          ? 'border-gray-700 text-gray-300 hover:border-purple-500'
                          : 'border-gray-200 text-gray-700 hover:border-purple-500'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Use Case */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Primary Use Case
              </label>
              <div className="flex flex-wrap gap-2">
                {useCaseOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, use_case: formData.use_case === opt.value ? undefined : opt.value })}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      formData.use_case === opt.value
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : isDark
                        ? 'border-gray-700 text-gray-300 hover:border-blue-500'
                        : 'border-gray-200 text-gray-700 hover:border-blue-500'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Models Tested */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Models Tested
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addModel())}
                  placeholder="e.g., llama3.1:70b, qwen2.5:32b"
                  className={`flex-1 px-3 py-2 rounded-lg border ${
                    isDark
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={addModel}
                  disabled={(formData.models_tested?.length || 0) >= 10}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.models_tested?.map((model, idx) => (
                  <span
                    key={idx}
                    className={`flex items-center gap-1 px-2 py-1 text-sm rounded ${
                      isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {model}
                    <button type="button" onClick={() => removeModel(idx)} className="hover:text-red-500">
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Typical Speed (tok/s)
                </label>
                <input
                  type="number"
                  value={formData.typical_speed_tps || ''}
                  onChange={(e) => setFormData({ ...formData, typical_speed_tps: e.target.value ? parseInt(e.target.value) : undefined })}
                  min={1}
                  max={500}
                  placeholder="e.g., 45"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDark
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  VRAM Usage (%)
                </label>
                <input
                  type="number"
                  value={formData.vram_usage_percent || ''}
                  onChange={(e) => setFormData({ ...formData, vram_usage_percent: e.target.value ? parseInt(e.target.value) : undefined })}
                  min={1}
                  max={100}
                  placeholder="e.g., 85"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDark
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>
            </div>

            {/* Purchase Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Purchase Price (USD)
                </label>
                <input
                  type="number"
                  value={formData.purchase_price_usd || ''}
                  onChange={(e) => setFormData({ ...formData, purchase_price_usd: e.target.value ? parseInt(e.target.value) : undefined })}
                  min={0}
                  placeholder="e.g., 699"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDark
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Months Owned
                </label>
                <input
                  type="number"
                  value={formData.months_owned || ''}
                  onChange={(e) => setFormData({ ...formData, months_owned: e.target.value ? parseInt(e.target.value) : undefined })}
                  min={0}
                  max={120}
                  placeholder="e.g., 6"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDark
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>
            </div>

            {/* Validation hints */}
            {(formData.rating_overall === 0 || formData.body.length < 20) && (
              <div className={`p-3 rounded-lg text-sm ${isDark ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400' : 'bg-yellow-50 border border-yellow-200 text-yellow-700'}`}>
                <span className="font-medium">To submit your review:</span>
                <ul className="mt-1 ml-4 list-disc">
                  {formData.rating_overall === 0 && (
                    <li>Select an overall rating (click the stars above)</li>
                  )}
                  {formData.body.length < 20 && (
                    <li>Write at least 20 characters in your review ({20 - formData.body.length} more needed)</li>
                  )}
                </ul>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`sticky bottom-0 p-4 border-t ${
            isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-lg ${
                  isDark
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || formData.rating_overall === 0 || formData.body.length < 20}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : isEditing ? 'Update Review' : 'Submit Review'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
