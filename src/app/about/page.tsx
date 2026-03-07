'use client';

import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white hover:text-blue-400 transition-colors">
            LocalLLM Advisor
          </Link>
          <nav className="flex gap-6 text-sm">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/methodology" className="text-gray-400 hover:text-white transition-colors">
              Methodology
            </Link>
            <Link href="/faq" className="text-gray-400 hover:text-white transition-colors">
              FAQ
            </Link>
            <Link href="/about" className="text-white">
              About
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">About LocalLLM Advisor</h1>

        <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What is this?</h2>
            <p>
              LocalLLM Advisor is a free, open-source tool that helps you find the best Large Language Model
              for your specific hardware. Instead of guessing whether a model will run on your GPU,
              you get concrete estimates based on real specifications.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Why we built it</h2>
            <p>
              Running LLMs locally is becoming increasingly popular, but choosing the right model is confusing.
              You need to consider VRAM, memory bandwidth, quantization levels, and how these affect both
              quality and speed. Most people either pick a model that is too big (and runs painfully slow)
              or too small (missing out on better quality).
            </p>
            <p>
              We wanted a tool that gives honest, data-driven recommendations—not marketing hype.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How it works</h2>
            <p>
              We combine three data sources:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>
                <strong className="text-white">Hardware specs database</strong> — 50+ GPUs and 30+ CPUs with
                detailed specifications (VRAM, bandwidth, compute performance)
              </li>
              <li>
                <strong className="text-white">Model benchmarks</strong> — Data from the Open LLM Leaderboard
                on HuggingFace, including IFEval, BBH, MATH, GPQA, and more
              </li>
              <li>
                <strong className="text-white">Performance formulas</strong> — Physics-based calculations for
                token generation speed, VRAM usage, and inference modes
              </li>
            </ul>
            <p className="mt-4">
              For the full technical details, see our <Link href="/methodology" className="text-blue-400 hover:text-blue-300">Methodology</Link> page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Open Source</h2>
            <p>
              The entire project is open source. You can inspect the code, verify our calculations,
              suggest improvements, or run your own instance.
            </p>
            <a
              href="https://github.com/localllm-advisor/localllm-advisor"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              View on GitHub
            </a>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Limitations</h2>
            <p>
              Our estimates are approximations based on theoretical calculations. Real-world performance
              depends on many factors: your specific system configuration, the inference engine you use
              (llama.cpp, Ollama, vLLM), background processes, and more.
            </p>
            <p>
              We are constantly improving our models. If you find significant discrepancies between our
              estimates and your real-world results, please let us know on GitHub.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">No Affiliation</h2>
            <p>
              LocalLLM Advisor is an independent project. We are not affiliated with Ollama, HuggingFace,
              NVIDIA, AMD, Apple, or any model provider. Our recommendations are based purely on data,
              not sponsorships.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="mx-auto max-w-4xl px-4 border-t border-gray-800 pt-6 pb-8 text-center text-xs text-gray-500">
        <div className="flex justify-center gap-6 mb-4">
          <Link href="/" className="hover:text-gray-300 transition-colors">Home</Link>
          <Link href="/methodology" className="hover:text-gray-300 transition-colors">Methodology</Link>
          <Link href="/faq" className="hover:text-gray-300 transition-colors">FAQ</Link>
          <Link href="/about" className="hover:text-gray-300 transition-colors">About</Link>
          <a
            href="https://github.com/localllm-advisor/localllm-advisor"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-300 transition-colors"
          >
            GitHub
          </a>
        </div>
        <p>LocalLLM Advisor — Open source tool for the local AI community.</p>
      </footer>
    </div>
  );
}
