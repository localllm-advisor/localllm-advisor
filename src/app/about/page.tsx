'use client';

import Link from 'next/link';
import Reveal from '@/components/Reveal';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';
import { useTheme } from '@/components/ThemeProvider';

export default function AboutPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-blue-950/40' : 'bg-blue-50/70'}`}>
      <Navbar />
      <BackButton />

      <PageHero
        title="About LocalLLM Advisor"
        subtitle="The story behind the tool and how it works."
        accent="blue"
      />

      <main className="flex-1 mx-auto max-w-3xl px-4 py-12">
        <div className={`prose max-w-none space-y-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          <Reveal delay={100}>
            <section>
              <h2 className={`text-xl font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>What is this?</h2>
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
              <h2 className={`text-xl font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Why we built it</h2>
              <p>
                Running LLMs locally is becoming increasingly popular, but choosing the right model is confusing.
                You need to consider VRAM, memory bandwidth, quantization levels, and how these affect both
                quality and speed. Most people either pick a model that is too big (and runs painfully slow)
                or too small (missing out on better quality). Moreover, buying new hardware is a big investment, and it&apos;s hard to know what will work best for your needs.
              </p>
              <p>
                We wanted a tool that gives honest, data-driven recommendations, not marketing hype.
              </p>
            </section>
          </Reveal>

          <Reveal delay={250}>
            <section>
              <h2 className={`text-xl font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Ethical AI by Design</h2>
              <p>
                Running AI locally is not just a technical decision, it's an ethical one. The mainstream
                narrative around AI has largely normalised the idea that to use capable AI tools, you must
                hand over your data to a third party. We think that trade-off is neither necessary nor
                acceptable as a default.
              </p>
              <p className="mt-3">
                When a model runs on your own hardware, several concrete ethical problems disappear:
                your conversations cannot be used to train future commercial models without your consent,
                no company builds a behavioural profile from your queries, and sensitive topics (health, legal matters, personal relationships, business strategy) stay on your device by
                architecture, not merely by policy. Data sovereignty is not a marketing promise; it is
                a technical reality.
              </p>
              <p className="mt-3">
                Open-source models running locally represent one of the most tangible answers the AI
                community has produced to questions about privacy, autonomy, and accountability. We built
                this tool because we believe capable AI and respect for user rights are not in conflict.
              </p>
            </section>
          </Reveal>

          <Reveal delay={350}>
            <section>
              <h2 className={`text-xl font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>How it works</h2>
              <p>
                We combine three data sources:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  <strong className={isDark ? 'text-white' : 'text-gray-900'}>Hardware specs database</strong>: 50+ GPUs and 30+ CPUs with
                  detailed specifications (VRAM, bandwidth, compute performance)
                </li>
                <li>
                  <strong className={isDark ? 'text-white' : 'text-gray-900'}>Model benchmarks</strong>. Data from the Open LLM Leaderboard
                  on HuggingFace, including IFEval, BBH, MATH, GPQA, and more
                </li>
                <li>
                  <strong className={isDark ? 'text-white' : 'text-gray-900'}>Performance formulas</strong>. Physics-based calculations for
                  token generation speed, VRAM usage, and inference modes
                </li>
              </ul>
              <p className="mt-4">
                For the full technical details, see our <Link href="/methodology" className={isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}>Methodology</Link> page.
              </p>
            </section>
          </Reveal>

          <Reveal delay={450}>
            <section>
              <h2 className={`text-xl font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Limitations</h2>
              <p>
                Our estimates are approximations based on theoretical calculations. Real-world performance
                depends on many factors: your specific system configuration, the inference engine you use
                (llama.cpp, Ollama, vLLM), background processes, and more.
              </p>
              <p>
                We are constantly improving our models. If you find significant discrepancies between our
                estimates and your real-world results, please let us know at{' '}
                <a href="mailto:info@localllm-advisor.com" className={isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}>info@localllm-advisor.com</a>.
              </p>
            </section>
          </Reveal>

          <Reveal delay={550}>
            <section>
              <h2 className={`text-xl font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>No Affiliation</h2>
              <p>
                LocalLLM Advisor is an independent project. We are not affiliated with Ollama, HuggingFace,
                NVIDIA, AMD, Apple, or any model provider. Our recommendations are based purely on data,
                not sponsorships.
              </p>
            </section>
          </Reveal>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
