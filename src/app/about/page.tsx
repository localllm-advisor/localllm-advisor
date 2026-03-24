'use client';

import Link from 'next/link';
import Reveal from '@/components/Reveal';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <BackButton />

      <main className="mx-auto max-w-3xl px-4 py-12">
        <Reveal delay={0}>
          <h1 className="text-3xl font-bold text-white mb-8">About LocalLLM Advisor</h1>
        </Reveal>

        <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
          <Reveal delay={100}>
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">What is this?</h2>
              <p>
                LocalLLM Advisor is a free tool that helps you find the best Large Language Model
                for your specific hardware, or the best hardware for your LLM, based on your specific configuration and needs. Instead of guessing whether a model will run on your GPU,
                you get concrete estimates based on real specifications, and instead of buying hardware based on assumptions,
                you can make informed decisions based on your specific use case.
              </p>
            </section>
          </Reveal>

          <Reveal delay={200}>
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Why we built it</h2>
              <p>
                Running LLMs locally is becoming increasingly popular, but choosing the right model is confusing.
                You need to consider VRAM, memory bandwidth, quantization levels, and how these affect both
                quality and speed. Most people either pick a model that is too big (and runs painfully slow)
                or too small (missing out on better quality). Moreover, buying new hardware is a big investment, and it&apos;s hard to know what will work best for your needs.
              </p>
              <p>
                We wanted a tool that gives honest, data-driven recommendations—not marketing hype.
              </p>
            </section>
          </Reveal>

          <Reveal delay={300}>
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
          </Reveal>

          <Reveal delay={400}>
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Limitations</h2>
              <p>
                Our estimates are approximations based on theoretical calculations. Real-world performance
                depends on many factors: your specific system configuration, the inference engine you use
                (llama.cpp, Ollama, vLLM), background processes, and more.
              </p>
              <p>
                We are constantly improving our models. If you find significant discrepancies between our
                estimates and your real-world results, please let us know at{' '}
                <a href="mailto:info@localllm-advisor.com" className="text-blue-400 hover:text-blue-300">info@localllm-advisor.com</a>.
              </p>
            </section>
          </Reveal>

          <Reveal delay={500}>
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">No Affiliation</h2>
              <p>
                LocalLLM Advisor is an independent project. We are not affiliated with Ollama, HuggingFace,
                NVIDIA, AMD, Apple, or any model provider. Our recommendations are based purely on data,
                not sponsorships.
              </p>
            </section>
          </Reveal>
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
            href="mailto:info@localllm-advisor.com"
            className="hover:text-gray-300 transition-colors"
          >
            Contact
          </a>
        </div>
        <p>LocalLLM Advisor — Find the best local LLM for your hardware, or the best hardware for your LLM.</p>
      </footer>
    </div>
  );
}
