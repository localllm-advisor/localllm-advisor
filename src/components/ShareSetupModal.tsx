'use client';

import { useState, useCallback } from 'react';
import { useTheme } from './ThemeProvider';

export interface ShareableModel {
  rank: number;
  name: string;
  params_b: number;
  quantLevel: string;
  tokensPerSecond: number | null;
  score: number;
  ollamaTag: string;
}

interface ShareSetupModalProps {
  gpuName: string;
  vramGb: number;
  useCase: string;
  models: ShareableModel[];   // pass top-5 (or fewer)
  onClose: () => void;
}

/** Encode the setup into a compact URL so others can see the same results. */
function buildShareUrl(gpuName: string, useCase: string, models: ShareableModel[]): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://localllm-advisor.com';
  const params = new URLSearchParams({
    gpu: gpuName,
    uc: useCase,
    top: models.map(m => m.ollamaTag).slice(0, 5).join(','),
  });
  return `${base}/search/model?${params.toString()}`;
}

export default function ShareSetupModal({ gpuName, vramGb, useCase, models, onClose }: ShareSetupModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const top5 = models.slice(0, 5);

  const shareUrl = buildShareUrl(gpuName, useCase, top5);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareUrl]);

  // Use-case emoji + label lookup
  const USE_CASE_META: Record<string, { icon: string; label: string }> = {
    chat:      { icon: '💬', label: 'Chat' },
    coding:    { icon: '💻', label: 'Coding' },
    reasoning: { icon: '🧠', label: 'Reasoning' },
    creative:  { icon: '✨', label: 'Creative Writing' },
    roleplay:  { icon: '🎭', label: 'Roleplay' },
    vision:    { icon: '👁️', label: 'Vision' },
    embedding: { icon: '🔢', label: 'Embedding' },
  };
  const ucMeta = USE_CASE_META[useCase] ?? { icon: '🤖', label: useCase };

  const rankEmojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

  // Reddit-ready share text — emoji-rich, matches InstantCheck format
  const redditText = [
    `🖥️ ${gpuName} (${vramGb} GB VRAM) — Top ${top5.length} models for ${ucMeta.label}`,
    '',
    ...top5.map(
      (m, i) => {
        const speedStr = m.tokensPerSecond != null ? ` @ ${m.tokensPerSecond} tok/s` : '';
        return `${rankEmojis[i] ?? `${i + 1}.`} ${m.name} (${m.quantLevel})${speedStr}`;
      }
    ),
    '',
    `🔗 Find yours → ${shareUrl}`,
    '(via LocalLLM Advisor — localllm-advisor.com)',
  ].join('\n');

  const handleCopyReddit = useCallback(() => {
    navigator.clipboard.writeText(redditText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [redditText]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${
          isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
        }`}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className={`absolute top-3 right-3 p-1.5 rounded-lg transition-colors ${
            isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
          }`}
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* ── Shareable Card ── */}
        <div
          className="p-6 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800"
          id="share-card"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🖥️</span>
            <div>
              <p className="text-white font-bold text-lg leading-tight">{gpuName}</p>
              <p className="text-blue-200 text-sm">{vramGb} GB VRAM · {ucMeta.icon} {ucMeta.label}</p>
            </div>
          </div>

          {/* Model list */}
          <div className="space-y-2">
            {top5.map((m, i) => (
              <div
                key={m.ollamaTag}
                className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-3 py-2"
              >
                <span className="text-base flex-shrink-0 w-6 text-center">
                  {rankEmojis[i] ?? `${i + 1}.`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">
                    {m.name}
                    <span className="ml-1.5 text-[10px] text-blue-200">({m.quantLevel})</span>
                  </p>
                  <p className="text-blue-200 text-xs">{m.params_b}B params</p>
                </div>
                {m.tokensPerSecond != null && (
                  <span className="flex-shrink-0 text-sm font-bold text-green-300 tabular-nums">
                    @ {m.tokensPerSecond} tok/s
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <p className="mt-4 text-xs text-blue-300 text-center">
            localllm-advisor.com · Find the best model for your GPU, or the best GPU for your model.
          </p>
        </div>

        {/* ── Actions ── */}
        <div className={`p-4 space-y-3 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>

          {/* Copy link */}
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy shareable link
              </>
            )}
          </button>

          {/* Copy Reddit text */}
          <button
            onClick={handleCopyReddit}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              isDark
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
            }`}
          >
            {/* Reddit icon */}
            <svg className="w-4 h-4 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm5.007 9.016a1.262 1.262 0 00-1.262 1.262c0 .175.036.341.1.492a5.894 5.894 0 01-3.362 1.048 5.904 5.904 0 01-3.36-1.047.625.625 0 10.003-.003c.063-.15.098-.315.098-.49a1.262 1.262 0 00-2.524 0c0 .496.287.927.706 1.135C5.574 13.5 7.641 15 10 15s4.426-1.5 4.595-3.587a1.262 1.262 0 00.412-2.397zM7.5 11a1 1 0 110-2 1 1 0 010 2zm5 0a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
            Copy text
          </button>

          <p className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Share in comments — the link lets others run the same search with their GPU
          </p>
        </div>
      </div>
    </div>
  );
}
