'use client';

import { useState, useEffect } from 'react';
import { ScoredModel, GPU } from '@/lib/types';
import { useTheme } from './ThemeProvider';
import CommunityBenchmarks from './CommunityBenchmarks';
import BenchmarkSubmitModal from './BenchmarkSubmitModal';

interface ModelDetailModalProps {
  model: ScoredModel;
  onClose: () => void;
}

const BENCHMARK_INFO: Record<string, { name: string; description: string }> = {
  humaneval: { name: 'HumanEval', description: 'Python code generation' },
  mbpp: { name: 'MBPP', description: 'Python programming problems' },
  bigcodebench: { name: 'BigCodeBench', description: 'Complex coding tasks' },
  mmlu_pro: { name: 'MMLU-PRO', description: 'Multi-task language understanding' },
  math: { name: 'MATH', description: 'Mathematical reasoning' },
  ifeval: { name: 'IFEval', description: 'Instruction following' },
  bbh: { name: 'BBH', description: 'Big-Bench Hard reasoning' },
  gpqa: { name: 'GPQA', description: 'Graduate-level Q&A' },
  musr: { name: 'MUSR', description: 'Multi-step reasoning' },
  mmmu: { name: 'MMMU', description: 'Multi-modal understanding' },
  mmbench: { name: 'MMBench', description: 'Multi-modal benchmark' },
  alpacaeval: { name: 'AlpacaEval', description: 'Instruction following quality' },
};

export default function ModelDetailModal({ model, onClose }: ModelDetailModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [copied, setCopied] = useState(false);
  const [showBenchmarkSubmit, setShowBenchmarkSubmit] = useState(false);
  const [gpus, setGpus] = useState<GPU[]>([]);
  const [refreshBenchmarks, setRefreshBenchmarks] = useState(0);

  // Load GPUs for the benchmark submit form
  useEffect(() => {
    fetch('/data/gpus.json')
      .then(res => res.json())
      .then(data => setGpus(data))
      .catch(console.error);
  }, []);

  const m = model.model;
  const quant = model.quant;
  const perf = model.performance;
  const mem = model.memory;

  // Get all benchmarks with values
  const benchmarksWithValues = Object.entries(m.benchmarks)
    .filter(([, val]) => val !== null && val !== undefined)
    .sort((a, b) => (b[1] as number) - (a[1] as number));

  // Generate links
  const ollamaBase = m.ollama_base.split(':')[0];
  const ollamaLink = `https://ollama.com/library/${ollamaBase}`;
  const hfLink = m.hf_id
    ? `https://huggingface.co/${m.hf_id}`
    : `https://huggingface.co/models?search=${encodeURIComponent(m.name)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border ${
          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        } shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-start justify-between p-6 border-b ${
          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div>
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {m.name}
            </h2>
            <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {m.provider || m.family} • {m.params_b}B parameters • {m.architecture.toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Score & Performance */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Score" value={model.score} suffix="/100" isDark={isDark} highlight />
            <StatCard
              label="Speed"
              value={perf.tokensPerSecond ?? '—'}
              suffix=" tok/s"
              isDark={isDark}
            />
            <StatCard
              label="VRAM"
              value={(mem.totalVram / 1024).toFixed(1)}
              suffix=" GB"
              isDark={isDark}
            />
            <StatCard
              label="Context"
              value={(m.context_length / 1000).toFixed(0)}
              suffix="K"
              isDark={isDark}
            />
          </div>

          {/* Current Quantization */}
          <Section title="Selected Quantization" isDark={isDark}>
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {quant.level}
                  </span>
                  <span className={`ml-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    ({quant.bpw} bits/weight)
                  </span>
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Quality: {(quant.quality * 100).toFixed(0)}%
                </div>
              </div>
              <div className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                VRAM: {(quant.vram_mb / 1024).toFixed(1)} GB
                {mem.ramOffload > 0 && (
                  <span className="text-yellow-500 ml-2">
                    + {(mem.ramOffload / 1024).toFixed(1)} GB RAM offload
                  </span>
                )}
              </div>
            </div>
          </Section>

          {/* All Quantizations */}
          <Section title="All Quantizations" isDark={isDark}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {m.quantizations.map((q) => (
                <div
                  key={q.level}
                  className={`p-3 rounded-lg border ${
                    q.level === quant.level
                      ? 'border-blue-500 bg-blue-500/10'
                      : isDark ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {q.level}
                  </div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {(q.vram_mb / 1024).toFixed(1)} GB VRAM
                  </div>
                  <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Quality: {(q.quality * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Benchmarks */}
          {benchmarksWithValues.length > 0 && (
            <Section title="Benchmarks" isDark={isDark}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {benchmarksWithValues.map(([key, val]) => {
                  const info = BENCHMARK_INFO[key] || { name: key, description: '' };
                  const value = val as number;
                  return (
                    <div
                      key={key}
                      className={`p-3 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {info.name}
                        </span>
                        <span className={`text-sm font-bold ${
                          value >= 70 ? 'text-green-500' :
                          value >= 50 ? 'text-yellow-500' :
                          isDark ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {value.toFixed(1)}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded overflow-hidden">
                        <div
                          className={`h-full ${
                            value >= 70 ? 'bg-green-500' :
                            value >= 50 ? 'bg-yellow-500' :
                            'bg-blue-500'
                          }`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                      <div className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {info.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Community Benchmarks */}
          <CommunityBenchmarks
            key={refreshBenchmarks}
            modelId={m.id}
            modelName={m.name}
            quantLevel={quant.level}
            onSubmitClick={() => setShowBenchmarkSubmit(true)}
          />

          {/* Model Info */}
          <Section title="Model Info" isDark={isDark}>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Family" value={m.family} isDark={isDark} />
              <InfoRow label="Architecture" value={m.architecture} isDark={isDark} />
              <InfoRow label="Parameters" value={`${m.params_b}B`} isDark={isDark} />
              <InfoRow label="Context Length" value={`${m.context_length.toLocaleString()} tokens`} isDark={isDark} />
              {m.release_date && (
                <InfoRow label="Release Date" value={m.release_date} isDark={isDark} />
              )}
              <InfoRow
                label="Capabilities"
                value={m.capabilities.join(', ')}
                isDark={isDark}
              />
            </div>
          </Section>

          {/* Performance Details */}
          <Section title="Performance Estimates" isDark={isDark}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoRow
                label="Decode Speed"
                value={perf.tokensPerSecond ? `${perf.tokensPerSecond} tok/s` : '—'}
                isDark={isDark}
              />
              <InfoRow
                label="Prefill Speed"
                value={perf.prefillTokensPerSecond ? `${perf.prefillTokensPerSecond} tok/s` : '—'}
                isDark={isDark}
              />
              <InfoRow
                label="Time to First Token"
                value={perf.timeToFirstToken ? `${perf.timeToFirstToken}ms` : '—'}
                isDark={isDark}
              />
              <InfoRow
                label="Load Time"
                value={perf.loadTimeSeconds ? `~${perf.loadTimeSeconds}s` : '—'}
                isDark={isDark}
              />
            </div>
          </Section>

          {/* Ollama Command */}
          <Section title="Run with Ollama" isDark={isDark}>
            <div className={`flex items-center gap-2 p-4 rounded-lg border font-mono text-sm ${
              isDark ? 'bg-gray-950 border-gray-700' : 'bg-gray-900 border-gray-700'
            }`}>
              <span className="text-green-400">$</span>
              <code className="text-green-400 flex-1">ollama run {quant.ollama_tag}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`ollama run ${quant.ollama_tag}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                  copied ? 'bg-green-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  'Copy'
                )}
              </button>
            </div>
          </Section>

          {/* Links */}
          <div className="flex gap-3">
            <a
              href={ollamaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              View on Ollama
            </a>
            <a
              href={hfLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors ${
                isDark
                  ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-200'
              }`}
            >
              <span className="text-xl">🤗</span>
              View on HuggingFace
            </a>
          </div>
        </div>
      </div>

      {/* Benchmark Submit Modal */}
      {showBenchmarkSubmit && (
        <BenchmarkSubmitModal
          modelId={m.id}
          modelName={m.name}
          quantLevel={quant.level}
          gpus={gpus}
          onClose={() => setShowBenchmarkSubmit(false)}
          onSuccess={() => setRefreshBenchmarks(prev => prev + 1)}
        />
      )}
    </div>
  );
}

function Section({ title, children, isDark }: { title: string; children: React.ReactNode; isDark: boolean }) {
  return (
    <div>
      <h3 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function StatCard({ label, value, suffix, isDark, highlight }: {
  label: string;
  value: string | number;
  suffix?: string;
  isDark: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`p-4 rounded-xl border ${
      highlight
        ? 'border-blue-500 bg-blue-500/10'
        : isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
    }`}>
      <div className={`text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${highlight ? 'text-blue-400' : isDark ? 'text-white' : 'text-gray-900'}`}>
        {value}
        {suffix && <span className="text-sm font-normal opacity-60">{suffix}</span>}
      </div>
    </div>
  );
}

function InfoRow({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  return (
    <div>
      <div className={`text-xs uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        {label}
      </div>
      <div className={`mt-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {value}
      </div>
    </div>
  );
}
