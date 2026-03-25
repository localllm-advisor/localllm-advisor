'use client';

import { useState } from 'react';
import { ScoredModel } from '@/lib/types';
import VramBar from './VramBar';
import { CLOUD_PROVIDERS, getCloudUrl } from '@/lib/cloudReferrals';

interface ModelCardProps {
  result: ScoredModel;
  rank: number;
}

export default function ModelCard({ result, rank }: ModelCardProps) {
  const [copied, setCopied] = useState(false);
  const { model, quant, score, memory, performance, inferenceMode, warnings } = result;

  const vramPercent = memory.vramPercent;
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
    <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-5 space-y-3 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5 transition-all duration-300">
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
              {performance.tokensPerSecondRange && (
                <>
                  <span>•</span>
                  <span>~{performance.tokensPerSecondRange.low}–{performance.tokensPerSecondRange.high} tok/s</span>
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

      {/* Performance stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-700/50">
          <div className="text-gray-500">Speed</div>
          <div className="text-white font-medium">
            {performance.tokensPerSecondRange
              ? `${performance.tokensPerSecondRange.low}–${performance.tokensPerSecondRange.high} tok/s`
              : '—'}
          </div>
        </div>
        <div className="bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-700/50">
          <div className="text-gray-500">Prefill</div>
          <div className="text-white font-medium">
            {performance.prefillRange
              ? `${performance.prefillRange.low}–${performance.prefillRange.high} tok/s`
              : '—'}
          </div>
        </div>
        <div className="bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-700/50">
          <div className="text-gray-500">VRAM</div>
          <div className="text-white font-medium">
            {(memory.totalVram / 1024).toFixed(1)}GB
            {memory.ramOffload > 0 && (
              <span className="text-yellow-400 ml-1">+{(memory.ramOffload / 1024).toFixed(1)}GB RAM</span>
            )}
          </div>
        </div>
        <div className="bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-700/50">
          <div className="text-gray-500">Load time</div>
          <div className="text-white font-medium">
            {performance.loadTimeSeconds ? `~${performance.loadTimeSeconds}s` : '—'}
          </div>
        </div>
      </div>

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

      {/* Cloud suggestion for models that don't fit */}
      {inferenceMode === 'not_possible' && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-950/20 px-3 py-2">
          <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
          </svg>
          <p className="text-xs text-gray-400">
            Too large for your GPU?{' '}
            {CLOUD_PROVIDERS.slice(0, 2).map((p, i) => (
              <span key={p.slug}>
                {i > 0 && ' or '}
                <a href={getCloudUrl(p.slug)} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                  {p.name} ({p.priceLabel})
                </a>
              </span>
            ))}
          </p>
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
