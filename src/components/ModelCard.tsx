'use client';

import { useState } from 'react';
import { ScoredModel } from '@/lib/types';
import VramBar from './VramBar';

interface ModelCardProps {
  result: ScoredModel;
  rank: number;
}

export default function ModelCard({ result, rank }: ModelCardProps) {
  const [copied, setCopied] = useState(false);
  const { model, quant, score, memory, performance, inferenceMode, warnings } = result;

  const vramPercent = memory.vramPercent;
  const tokensPerSecond = performance.tokensPerSecond;
  const vramGb = (quant.vram_mb / 1024).toFixed(1);
  const command = `ollama run ${quant.ollama_tag}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS
      const ta = document.createElement('textarea');
      ta.value = command;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const stars = Math.round(quant.quality * 5);

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-5 space-y-3 hover:border-gray-600 transition-colors">
      {/* Header: rank, name, score */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-sm font-bold text-blue-400">
            #{rank}
          </span>
          <div>
            <h3 className="font-semibold text-white">
              {model.name}
              <span className="ml-2 text-sm font-normal text-gray-400">
                {model.params_b}B
              </span>
            </h3>
            <p className="text-xs text-gray-400 flex items-center gap-2 flex-wrap">
              <span>{quant.level}</span>
              <span>•</span>
              <span>{vramGb}GB VRAM</span>
              {tokensPerSecond && (
                <>
                  <span>•</span>
                  <span>~{tokensPerSecond} tok/s</span>
                </>
              )}
              <span>•</span>
              <span className="text-yellow-400">
                {'★'.repeat(stars)}
                {'☆'.repeat(5 - stars)}
              </span>
              {inferenceMode !== 'gpu_full' && (
                <>
                  <span>•</span>
                  <span className={
                    inferenceMode === 'gpu_offload' ? 'text-yellow-400' :
                    inferenceMode === 'cpu_only' ? 'text-orange-400' :
                    'text-red-400'
                  }>
                    {inferenceMode === 'gpu_offload' && 'GPU+RAM'}
                    {inferenceMode === 'cpu_only' && 'CPU only'}
                    {inferenceMode === 'not_possible' && 'Too large'}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-white">{score}</span>
          <span className="text-sm text-gray-400">/100</span>
        </div>
      </div>

      {/* VRAM bar */}
      <VramBar percent={vramPercent} />

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {warnings.map((warning, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-md bg-yellow-500/10 px-2 py-1 text-xs text-yellow-400 border border-yellow-500/20"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {warning}
            </span>
          ))}
        </div>
      )}

      {/* Ollama command */}
      <div className="flex items-center gap-2 rounded-lg bg-gray-900 border border-gray-700 px-3 py-2.5">
        <code className="flex-1 text-sm text-green-400 font-mono">
          $ {command}
        </code>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
}
