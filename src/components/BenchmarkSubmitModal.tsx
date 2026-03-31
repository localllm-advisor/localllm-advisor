'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from './ThemeProvider';
import {
  supabase,
  submitBenchmark,
  signInWithGitHub,
  signInWithGoogle,
  setAuthReturnAction,
  BenchmarkSubmission,
} from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rateLimit';
import { User } from '@supabase/supabase-js';
import { GPU } from '@/lib/types';

// Common quantization levels for the "open" mode selector
const COMMON_QUANT_LEVELS = [
  'Q4_K_M', 'Q4_K_S', 'Q4_0',
  'Q5_K_M', 'Q5_K_S',
  'Q6_K',
  'Q8_0',
  'F16', 'FP16', 'BF16',
  'IQ4_XS', 'IQ3_XS',
  'Other',
];

interface BenchmarkSubmitModalProps {
  /**
   * Pre-filled model identifier (e.g. "llama3:8b-q4_K_M").
   * When omitted, the user enters it in the form.
   */
  modelId?: string;
  /** Display-only model name shown in the modal header. */
  modelName?: string;
  /**
   * Pre-filled quantization level (e.g. "Q4_K_M").
   * When omitted, the user picks one in the form.
   */
  quantLevel?: string;
  gpus: GPU[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function BenchmarkSubmitModal({
  modelId: propModelId,
  modelName,
  quantLevel: propQuantLevel,
  gpus,
  onClose,
  onSuccess,
}: BenchmarkSubmitModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ── Form state ───────────────────────────────────────────────────────────
  // Model / quant (only editable when not pre-filled from props)
  const [modelId, setModelId] = useState(propModelId || '');
  const [quantLevel, setQuantLevel] = useState(propQuantLevel || '');
  const [customQuant, setCustomQuant] = useState('');

  // GPU picker
  const [gpuName, setGpuName] = useState('');
  const [gpuSearch, setGpuSearch] = useState('');
  const [gpuDropdownOpen, setGpuDropdownOpen] = useState(false);
  const gpuDropdownRef = useRef<HTMLDivElement>(null);
  const [customGpu, setCustomGpu] = useState('');

  // Measurements
  const [tokensPerSecond, setTokensPerSecond] = useState('');
  const [prefillTps, setPrefillTps] = useState('');
  const [ttft, setTtft] = useState('');
  const [contextLength, setContextLength] = useState('4096');
  const [runtime, setRuntime] = useState('ollama');
  const [notes, setNotes] = useState('');

  // ── Honeypot: bots fill this; humans never see it ────────────────────────
  const [honeypot, setHoneypot] = useState('');

  // ── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Close GPU dropdown on outside click ──────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (gpuDropdownRef.current && !gpuDropdownRef.current.contains(e.target as Node)) {
        setGpuDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Submission handler ───────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Honeypot check — silently reject bots
    if (honeypot !== '') {
      // Pretend success so bots don't learn they were blocked
      setSuccess(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
      return;
    }

    // 2. Client-side rate limit (UX feedback; real enforcement is in the DB trigger)
    const rl = checkRateLimit('benchmark-submit', {
      maxAttempts: 5,
      windowMs: 60 * 60 * 1000, // 1-hour window
      cooldownMs: 30 * 1000,    // 30 s cooldown after hitting limit
    });
    if (!rl.allowed) {
      const secs = Math.ceil(rl.retryAfterMs / 1000);
      setError(`Too many submissions — please wait ${secs} second${secs !== 1 ? 's' : ''} before trying again.`);
      return;
    }

    setSubmitting(true);

    // 3. Resolve model_id and quant_level
    const finalModelId = (propModelId ?? modelId).trim();
    if (!finalModelId) {
      setError('Please enter a model ID (e.g. llama3:8b-q4_K_M).');
      setSubmitting(false);
      return;
    }
    if (finalModelId.length < 2 || finalModelId.length > 200) {
      setError('Model ID must be between 2 and 200 characters.');
      setSubmitting(false);
      return;
    }

    const resolvedQuant = propQuantLevel
      ? propQuantLevel
      : (quantLevel === 'Other' ? customQuant.trim() : quantLevel);
    if (!resolvedQuant) {
      setError('Please select or enter a quantization level.');
      setSubmitting(false);
      return;
    }
    if (resolvedQuant.length > 50) {
      setError('Quantization level must be 50 characters or fewer.');
      setSubmitting(false);
      return;
    }

    // 4. Resolve GPU
    const finalGpuName = (gpuName === 'other' ? customGpu : gpuName).trim();
    if (!finalGpuName) {
      setError('Please select or enter a GPU.');
      setSubmitting(false);
      return;
    }
    if (finalGpuName.length < 2 || finalGpuName.length > 150) {
      setError('GPU name must be between 2 and 150 characters.');
      setSubmitting(false);
      return;
    }

    // 5. Tokens per second
    const tps = parseFloat(tokensPerSecond);
    if (isNaN(tps) || tps <= 0 || tps >= 1000) {
      setError('Tokens/second must be a number between 0 and 1000.');
      setSubmitting(false);
      return;
    }

    // 6. Optional numeric fields
    const prefillVal = prefillTps ? parseFloat(prefillTps) : undefined;
    if (prefillVal !== undefined && (isNaN(prefillVal) || prefillVal <= 0 || prefillVal >= 10000)) {
      setError('Prefill tok/s must be a positive number under 10,000.');
      setSubmitting(false);
      return;
    }

    const ttftVal = ttft ? parseFloat(ttft) : undefined;
    if (ttftVal !== undefined && (isNaN(ttftVal) || ttftVal <= 0 || ttftVal > 60000)) {
      setError('Time to first token must be between 1 ms and 60,000 ms.');
      setSubmitting(false);
      return;
    }

    // 7. Notes length
    const trimmedNotes = notes.trim();
    if (trimmedNotes.length > 500) {
      setError('Notes must be 500 characters or fewer.');
      setSubmitting(false);
      return;
    }

    const selectedGpu = gpus.find(g => g.name === finalGpuName);

    const benchmark: BenchmarkSubmission = {
      model_id:                   finalModelId,
      quant_level:                resolvedQuant,
      gpu_name:                   finalGpuName,
      gpu_vram_mb:                selectedGpu?.vram_mb,
      tokens_per_second:          tps,
      prefill_tokens_per_second:  prefillVal,
      time_to_first_token_ms:     ttftVal,
      context_length:             parseInt(contextLength) || 4096,
      runtime,
      notes:                      trimmedNotes || undefined,
    };

    const result = await submitBenchmark(benchmark);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } else {
      setError(result.error || 'Submission failed. Please try again.');
    }

    setSubmitting(false);
  };

  // ── Styles ───────────────────────────────────────────────────────────────
  const inputClass = `w-full px-3 py-2 rounded-lg border text-sm ${
    isDark
      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
  } focus:outline-none focus:ring-1 focus:ring-blue-500`;

  const labelClass = `block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-lg rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto ${
          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-center justify-between p-4 border-b ${
          isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
        }`}>
          <div>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Submit Benchmark
            </h2>
            {(modelName || propModelId) && (
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {modelName || propModelId}
                {propQuantLevel ? ` • ${propQuantLevel}` : ''}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {authLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
              <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading…</p>
            </div>

          ) : !user ? (
            /* ── Login prompt ─────────────────────────────────────── */
            <div className="text-center py-6">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Sign in to submit
              </h3>
              <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                We use authentication to prevent spam and track your submissions.
              </p>
              {loginError && (
                <p className="text-sm text-red-500 mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">{loginError}</p>
              )}
              <div className="flex flex-col gap-3">
                <button
                  onClick={async () => {
                    setLoginError(null);
                    setAuthReturnAction({ type: 'submit-benchmark', modelId: propModelId, quantLevel: propQuantLevel });
                    const res = await signInWithGitHub();
                    if (res?.error) setLoginError(res.error);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Continue with GitHub
                </button>
                <button
                  onClick={async () => {
                    setLoginError(null);
                    setAuthReturnAction({ type: 'submit-benchmark', modelId: propModelId, quantLevel: propQuantLevel });
                    const res = await signInWithGoogle();
                    if (res?.error) setLoginError(res.error);
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors border ${
                    isDark
                      ? 'bg-gray-800 hover:bg-gray-700 text-white border-gray-600'
                      : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                  }`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
              </div>
            </div>

          ) : success ? (
            /* ── Success ──────────────────────────────────────────── */
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Benchmark Submitted!
              </h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Thank you for contributing to the community.
              </p>
            </div>

          ) : (
            /* ── Form ─────────────────────────────────────────────── */
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Honeypot — visually hidden, must stay empty */}
              <div
                aria-hidden="true"
                style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
              >
                <label htmlFor="bm-website">Website</label>
                <input
                  id="bm-website"
                  type="text"
                  name="website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  autoComplete="off"
                  tabIndex={-1}
                />
              </div>

              {/* Error banner */}
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* ── Model ID (only when not pre-filled) ───────────── */}
              {!propModelId && (
                <div>
                  <label className={labelClass}>Model ID *</label>
                  <input
                    type="text"
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    placeholder="e.g. llama3:8b, mistral:7b-instruct-q4_K_M"
                    maxLength={200}
                    className={inputClass}
                    required
                  />
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Use the Ollama model name (e.g. <code>ollama run &lt;name&gt;</code>)
                  </p>
                </div>
              )}

              {/* ── Quant level (only when not pre-filled) ────────── */}
              {!propQuantLevel && (
                <div>
                  <label className={labelClass}>Quantization level *</label>
                  <select
                    value={quantLevel}
                    onChange={(e) => setQuantLevel(e.target.value)}
                    className={inputClass}
                    required
                  >
                    <option value="">Select…</option>
                    {COMMON_QUANT_LEVELS.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                  {quantLevel === 'Other' && (
                    <input
                      type="text"
                      value={customQuant}
                      onChange={(e) => setCustomQuant(e.target.value)}
                      placeholder="Enter quantization level…"
                      maxLength={50}
                      className={`${inputClass} mt-2`}
                      required
                    />
                  )}
                </div>
              )}

              {/* ── GPU Picker ────────────────────────────────────── */}
              <div ref={gpuDropdownRef} className="relative">
                <label className={labelClass}>GPU *</label>
                <input
                  type="text"
                  value={gpuName === 'other' ? 'Other' : gpuSearch || gpuName}
                  onChange={(e) => { setGpuSearch(e.target.value); setGpuName(''); setGpuDropdownOpen(true); }}
                  onFocus={() => setGpuDropdownOpen(true)}
                  placeholder="Search GPU (e.g. RTX 4070, M3 Pro)…"
                  className={inputClass}
                  required={!gpuName}
                />
                {gpuDropdownOpen && (
                  <ul className={`absolute z-30 mt-1 max-h-[22rem] w-full overflow-auto rounded-lg border shadow-xl ${
                    isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white'
                  }`}>
                    {(() => {
                      const q = gpuSearch.toLowerCase();
                      const sorted = [
                        ...gpus.filter(g => g.vendor !== 'apple').sort((a, b) => a.name.localeCompare(b.name)),
                        ...gpus.filter(g => g.vendor === 'apple'),
                      ];
                      const filtered = q ? sorted.filter(g => g.name.toLowerCase().includes(q)) : sorted;
                      const visible = filtered.slice(0, 10);
                      const remaining = filtered.length - 10;
                      return (
                        <>
                          {visible.map(gpu => (
                            <li
                              key={gpu.name}
                              onClick={() => { setGpuName(gpu.name); setGpuSearch(''); setGpuDropdownOpen(false); }}
                              className={`cursor-pointer px-4 py-2.5 text-sm flex justify-between ${
                                isDark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-800'
                              }`}
                            >
                              <span>{gpu.name}</span>
                              <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>{Math.round(gpu.vram_mb / 1024)}GB</span>
                            </li>
                          ))}
                          {remaining > 0 && (
                            <li className={`px-4 py-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              {remaining} more — type to refine
                            </li>
                          )}
                          {filtered.length === 0 && (
                            <li className={`px-4 py-2.5 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              No matches — select "Other" to enter manually
                            </li>
                          )}
                          <li
                            onClick={() => { setGpuName('other'); setGpuSearch(''); setGpuDropdownOpen(false); }}
                            className={`cursor-pointer px-4 py-2.5 text-sm font-medium border-t ${
                              isDark ? 'hover:bg-gray-700 text-blue-400 border-gray-700' : 'hover:bg-gray-100 text-blue-600 border-gray-200'
                            }`}
                          >
                            Other (specify manually)
                          </li>
                        </>
                      );
                    })()}
                  </ul>
                )}
                {gpuName === 'other' && (
                  <input
                    type="text"
                    value={customGpu}
                    onChange={(e) => setCustomGpu(e.target.value)}
                    placeholder="Enter GPU name (e.g. RTX 5090, M4 Max 128GB)…"
                    maxLength={150}
                    className={`${inputClass} mt-2`}
                    required
                  />
                )}
              </div>

              {/* ── Tokens per second ─────────────────────────────── */}
              <div>
                <label className={labelClass}>Tokens/second (decode) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="999"
                  value={tokensPerSecond}
                  onChange={(e) => setTokensPerSecond(e.target.value)}
                  placeholder="e.g. 45.2"
                  className={inputClass}
                  required
                />
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  The generation speed shown in Ollama output (eval rate)
                </p>
              </div>

              {/* ── Optional fields ───────────────────────────────── */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Prefill tok/s</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="9999"
                    value={prefillTps}
                    onChange={(e) => setPrefillTps(e.target.value)}
                    placeholder="Optional"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Time to first token (ms)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="60000"
                    value={ttft}
                    onChange={(e) => setTtft(e.target.value)}
                    placeholder="Optional"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Context length</label>
                  <select
                    value={contextLength}
                    onChange={(e) => setContextLength(e.target.value)}
                    className={inputClass}
                  >
                    <option value="2048">2K</option>
                    <option value="4096">4K (default)</option>
                    <option value="8192">8K</option>
                    <option value="16384">16K</option>
                    <option value="32768">32K</option>
                    <option value="65536">64K</option>
                    <option value="131072">128K</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Runtime</label>
                  <select
                    value={runtime}
                    onChange={(e) => setRuntime(e.target.value)}
                    className={inputClass}
                  >
                    <option value="ollama">Ollama</option>
                    <option value="llama.cpp">llama.cpp</option>
                    <option value="vllm">vLLM</option>
                    <option value="exllama">ExLlama</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* ── Notes ─────────────────────────────────────────── */}
              <div>
                <label className={labelClass}>Notes <span className={isDark ? 'text-gray-600' : 'text-gray-400'}>(optional)</span></label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Driver version, settings used, custom flags, etc."
                  rows={2}
                  maxLength={500}
                  className={inputClass}
                />
                <p className={`text-xs mt-1 text-right ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                  {notes.length}/500
                </p>
              </div>

              {/* ── Submit ────────────────────────────────────────── */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Submit Benchmark
                  </>
                )}
              </button>

              <p className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Signed in as {user.email || user.user_metadata?.user_name} ·{' '}
                <span className={isDark ? 'text-gray-600' : 'text-gray-300'}>
                  max 10 submissions/hour · 1 per GPU+model/24 h
                </span>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
