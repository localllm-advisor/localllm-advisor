'use client';

import { useState } from 'react';
import { useTheme } from './ThemeProvider';
import { cooldownCheck } from '@/lib/rateLimit';

interface EmailCaptureProps {
  /** Where the form appears — affects messaging */
  variant: 'landing' | 'results' | 'gpu-prices' | 'inline';
  /** Optional class name override */
  className?: string;
}

const COPY = {
  landing: {
    title: 'Stay ahead of local AI',
    subtitle: 'Get weekly updates on new models, GPU deals, and performance tips.',
    cta: 'Subscribe',
  },
  results: {
    title: 'Save your setup',
    subtitle: 'Get notified when GPU prices drop or better models become available.',
    cta: 'Notify me',
  },
  'gpu-prices': {
    title: 'Never miss a deal',
    subtitle: 'Weekly GPU price drops and restocks, straight to your inbox.',
    cta: 'Get alerts',
  },
  inline: {
    title: 'Get updates',
    subtitle: 'New models, GPU deals, and local AI tips — once a week.',
    cta: 'Subscribe',
  },
};

export default function EmailCapture({ variant, className }: EmailCaptureProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const copy = COPY[variant];

  // If neither Web3Forms nor Buttondown is configured, don't render at all
  const web3formsKey = process.env.NEXT_PUBLIC_WEB3FORMS_KEY;
  const buttondownId = process.env.NEXT_PUBLIC_BUTTONDOWN_ID;
  if (!web3formsKey && !buttondownId) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Proper email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!email || !emailRegex.test(email) || email.length > 254) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    // Rate limit: one submission every 5 seconds
    const { allowed, retryAfterMs } = cooldownCheck(`email-${variant}`, 5000);
    if (!allowed) {
      setErrorMsg(`Please wait ${Math.ceil(retryAfterMs / 1000)}s before trying again.`);
      return;
    }

    setStatus('loading');

    try {
      // Prefer Web3Forms if configured
      if (web3formsKey) {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: web3formsKey,
            botcheck: '',
            email,
            subject: `Newsletter signup (${variant}) — LocalLLM Advisor`,
            from_name: 'LocalLLM Advisor Newsletter',
          }),
        });

        if (res.ok) {
          setStatus('success');
        } else {
          setErrorMsg('Something went wrong. Please try again.');
          setStatus('error');
        }
        return;
      }

      // Fallback: Buttondown
      if (buttondownId) {
        const res = await fetch('https://api.buttondown.com/v1/subscribers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email_address: email,
            tags: [variant],
          }),
        });

        if (res.ok || res.status === 201 || res.status === 409) {
          setStatus('success');
        } else {
          const data = await res.json().catch(() => null);
          setErrorMsg(data?.detail || 'Something went wrong. Please try again.');
          setStatus('error');
        }
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className={`rounded-xl p-6 text-center ${isDark ? 'bg-green-900/20 border border-green-700' : 'bg-green-50 border border-green-200'} ${className || ''}`}>
        <p className={`text-lg font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>
          You&apos;re in!
        </p>
        <p className={`text-sm mt-1 ${isDark ? 'text-green-300/70' : 'text-green-600'}`}>
          We&apos;ll keep you posted. No spam, unsubscribe anytime.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-6 ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-gray-50 border border-gray-200'} ${className || ''}`}>
      <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {copy.title}
      </h3>
      <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        {copy.subtitle}
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setStatus('idle'); setErrorMsg(''); }}
          placeholder="you@example.com"
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isDark
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
          }`}
          disabled={status === 'loading'}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            status === 'loading'
              ? 'bg-gray-500 text-gray-300 cursor-wait'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {status === 'loading' ? '...' : copy.cta}
        </button>
      </form>

      {errorMsg && (
        <p className="text-sm text-red-500 mt-2">{errorMsg}</p>
      )}

      <p className={`text-xs mt-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        Free, once a week. No spam. Unsubscribe anytime.
      </p>
    </div>
  );
}
