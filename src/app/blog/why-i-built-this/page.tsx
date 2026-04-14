'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import PageHero from '@/components/PageHero';
import SiteFooter from '@/components/SiteFooter';
import Reveal from '@/components/Reveal';
import { useTheme } from '@/components/ThemeProvider';

export default function WhyIBuiltThisPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const prose = isDark ? 'text-gray-300' : 'text-gray-600';
  const strong = isDark ? 'text-white' : 'text-gray-900';
  const codeBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200';
  const link = isDark
    ? 'text-amber-400 hover:text-amber-300 underline underline-offset-2 decoration-1'
    : 'text-amber-700 hover:text-amber-800 underline underline-offset-2 decoration-1';
  const h2 = `text-xl font-semibold mt-12 mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`;

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-amber-950/20' : 'bg-amber-50/50'}`}>
      <Navbar />

      <PageHero
        title="Which LLM can your GPU actually run, and what GPU do you need for a given model?"
        subtitle="April 2026 · by ok_computer · 7 min read"
        accent="amber"
      />

      <main className="flex-1 mx-auto max-w-2xl w-full px-4 py-12">
        <article className={`space-y-0 ${prose}`}>

          {/* Back to blog */}
          <Reveal delay={0}>
            <div className="mb-8">
              <Link
                href="/blog"
                className={`inline-flex items-center gap-2 text-sm transition-colors ${
                  isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                All posts
              </Link>
            </div>
          </Reveal>

          {/* Intro */}
          <Reveal delay={50}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              A few months ago I bought a PC with an RTX 5060 Ti. I wanted to run a
              coding-oriented LLM locally, keep my data off third-party servers, and stop paying per-token
              for things I could handle on my own machine. Picking the hardware took me an afternoon.
              Figuring out which model to actually download took me the rest of the week.
            </p>
          </Reveal>

          <Reveal delay={80}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              The information was out there, but it lived in six or seven different places that don&apos;t
              talk to each other. I&apos;d check a model card on HuggingFace for the parameter count, then
              cross-reference the GGUF quantizations available from bartowski or unsloth, then look up my
              GPU&apos;s memory bandwidth on TechPowerUp, then search r/LocalLLaMA for tok/s reports from
              someone with similar hardware, then check if the VRAM footprint left enough headroom for a
              reasonable context window. Halfway through, a new quantization variant would show up and
              I&apos;d start over.
            </p>
          </Reveal>

          <Reveal delay={100}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              I kept a spreadsheet for a while. It got unwieldy after about twenty models.
            </p>
          </Reveal>

          {/* Section 1 */}
          <Reveal delay={120}>
            <h2 className={h2}>Why this keeps getting harder</h2>
          </Reveal>

          <Reveal delay={140}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              Running models locally has gone from a niche hobby to something a significant chunk of
              developers and researchers do routinely. The reasons are well-documented: privacy, latency,
              cost control over time, and not being dependent on an API that can change pricing or terms
              of service at any time. The tooling on the inference side has gotten remarkably good:
              llama.cpp, Ollama, vLLM, and others have made the actual &ldquo;run the model&rdquo; part
              mostly painless.
            </p>
          </Reveal>

          <Reveal delay={160}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              But the decision that comes <em>before</em> inference — which model, at which quantization,
              on which hardware, and what performance to expect — hasn&apos;t been solved in a centralized
              way. New models appear on HuggingFace weekly. GPU product lines keep branching. Quantization
              methods evolve (GGUF alone has gone through multiple format revisions). The matrix of possible
              combinations grows faster than any single source can keep up with, and the existing resources
              each cover only one slice of it.
            </p>
          </Reveal>

          {/* Section 2 */}
          <Reveal delay={180}>
            <h2 className={h2}>What I ended up building</h2>
          </Reveal>

          <Reveal delay={200}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              <Link href="https://localllm-advisor.com" className={link}>LocalLLM Advisor</Link> is a web
              tool that answers two questions: &ldquo;given my hardware, what&apos;s the best model I can
              run?&rdquo; and &ldquo;given a model I want to run, what hardware do I need?&rdquo; It
              currently covers 1.4k+ models across dense and MoE architectures, 206 GPUs (NVIDIA, AMD,
              Intel Arc, Apple Silicon), and 78 CPUs.
            </p>
          </Reveal>

          <Reveal delay={210}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              The <strong className={strong}>Model Finder</strong> takes your GPU (auto-detected via
              WebGPU, or selected manually) and a use case - chat, coding, reasoning, vision, roleplay,
              embedding - and returns a ranked list of models that fit. Each result shows the quantization
              level, estimated VRAM usage, estimated tok/s, and a ready-to-paste Ollama command. The
              ranking weighs model quality (from the Open LLM Leaderboard: MMLU-PRO, HumanEval, MATH,
              IFEval, and others), predicted speed, and quantization quality, with different weights
              depending on the use case. Coding leans harder on HumanEval and BigCodeBench scores; roleplay
              prioritizes instruction following and generation speed.
            </p>
          </Reveal>

          <Reveal delay={220}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              The <strong className={strong}>Hardware Finder</strong> works the other direction. Pick a
              model, set a speed preference (usable, fast, or blazing) and a budget, and it shows which
              GPUs can handle it as single-card, multi-card with NVLink, or multi-card over PCIe, with
              current street prices pulled from Amazon and eBay. This is the mode I use most when a new
              model drops and I want to know if my current card can handle it or if I&apos;m looking at
              an upgrade.
            </p>
          </Reveal>

          <Reveal delay={230}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              There&apos;s also a <strong className={strong}>community benchmarks</strong> section where
              people submit real tok/s numbers from their own hardware, and a{' '}
              <strong className={strong}>GPU price tracker</strong> with 30-day price trends and alerts.
              The benchmarks section is still in early stages, I&apos;d like a lot more data points, especially
              on mid-range cards.
            </p>
          </Reveal>

          {/* Section 3 */}
          <Reveal delay={240}>
            <h2 className={h2}>How the estimation actually works</h2>
          </Reveal>

          <Reveal delay={250}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              The core insight behind the performance estimates is that LLM token generation (the decode
              phase) is memory-bandwidth bound, not compute bound. Each decode step reads the active model
              weights from VRAM. How many tokens per second you get is, to a first approximation, just
              how fast your GPU can read those weights:
            </p>
          </Reveal>

          <Reveal delay={260}>
            <pre className={`rounded-lg border p-4 font-mono text-sm mb-5 overflow-x-auto leading-relaxed ${codeBg}`}>
              <code>tok/s ≈ memory_bandwidth_GBps / model_size_GB</code>
            </pre>
          </Reveal>

          <Reveal delay={265}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              where{' '}
              <code className={`text-sm px-1.5 py-0.5 rounded border ${codeBg}`}>
                model_size_GB = parameters × bits_per_weight / 8
              </code>
              .
            </p>
          </Reveal>

          <Reveal delay={270}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              This is the same relationship the llama.cpp community uses as a rule of thumb, and it holds
              up well in practice. It&apos;s why the RTX 4090 and RTX 3090 end up with similar LLM
              performance despite the 4090 having far more compute — their memory bandwidth is in the same
              ballpark (1,008 GB/s vs. 936 GB/s).
            </p>
          </Reveal>

          <Reveal delay={280}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              Things get more interesting with MoE models. DeepSeek R1, for instance, has 671 billion
              total parameters but only activates about 37 billion per token. You need VRAM for all 671B
              (every expert must be loaded because any could be activated), but the per-token read is only
              37B worth of weights. So the VRAM requirement is massive, while the per-token speed is
              comparable to a 37B dense model. Getting this distinction wrong, and a lot of resources do,
              gives you either wildly pessimistic speed estimates or wildly optimistic VRAM estimates.
            </p>
          </Reveal>

          <Reveal delay={290}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              KV cache adds another layer. At short context lengths (4K tokens or less), the cache is
              small relative to the model weights and barely affects speed. But at 32K+ contexts, it can
              add tens of gigabytes. A 70B model that fits comfortably in VRAM at 4K context might not
              fit at 128K, because the KV cache alone approaches the size of the model weights. The tool
              models this with a power-law approximation calibrated against measured KV cache sizes across
              7B to 70B models:
            </p>
          </Reveal>

          <Reveal delay={295}>
            <pre className={`rounded-lg border p-4 font-mono text-sm mb-5 overflow-x-auto leading-relaxed ${codeBg}`}>
              <code>extra_kv_cache_mb = 128 × (params_B / 7)^0.4 × (context - 4096) / 1024</code>
            </pre>
          </Reveal>

          <Reveal delay={300}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              The 0.4 exponent reflects that larger models tend to widen their hidden dimensions rather
              than just stacking more layers, while Grouped-Query Attention keeps the KV head count fixed
              (typically 8) regardless of model size. This fits measured values to within about 5% across
              the common model sizes.
            </p>
          </Reveal>

          <Reveal delay={310}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              For GPU+RAM offload scenarios, the model is split across GPU and CPU layers that process
              sequentially. The total time per token is the sum of both, not an average. CPU layers read
              directly from system RAM (the bottleneck is RAM bandwidth, not PCIe), while PCIe only carries
              the small activation vectors between layer groups, adding roughly 0.1–0.2 ms of overhead per
              token. This sequential nature is why even offloading 20% of layers to RAM tanks your
              throughput — system RAM offers 40–80 GB/s of effective bandwidth versus hundreds of GB/s on
              the GPU side.
            </p>
          </Reveal>

          <Reveal delay={320}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              Every estimate in the tool has been validated against community benchmarks (with a ±15–30%
              uncertainty band). 15% for full GPU inference, 25% for offload, 30% for CPU-only.
              Real-world variation from drivers, thermal throttling, inference runtime configuration, and
              background system load means any single-point estimate is going to be wrong for some
              percentage of users. I&apos;d rather show the range.
            </p>
          </Reveal>

          {/* Section 4 */}
          <Reveal delay={330}>
            <h2 className={h2}>What runs client-side and why</h2>
          </Reveal>

          <Reveal delay={340}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              The entire recommendation engine runs in your browser. No server calls for the main flow,
              no account required, no telemetry. The model and GPU databases are bundled as static JSON
              files in the build (about 1.7 MB total). Supabase powers only the community features —
              benchmarks, reviews, price alerts — where a database is actually necessary.
            </p>
          </Reveal>

          <Reveal delay={350}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              I made this choice partly out of principle (a tool about running AI locally shouldn&apos;t
              phone home to do its job) and partly for practical reasons: it&apos;s simpler to deploy,
              cheaper to host, and faster for the user. The whole thing is a static Next.js export on
              GitHub Pages.
            </p>
          </Reveal>

          {/* Section 5 */}
          <Reveal delay={360}>
            <h2 className={h2}>Where the estimates are weakest</h2>
          </Reveal>

          <Reveal delay={370}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              I want to be upfront about limitations. The bandwidth formula works well for straightforward
              single-GPU, short-context inference, which is the most common case. But there are scenarios
              where I&apos;m less confident:
            </p>
          </Reveal>

          <Reveal delay={380}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              Mid-range GPUs (8–12 GB VRAM cards like the RTX 4060 or RX 7600) running heavily quantized
              models (Q3, Q4) are where the gap between predicted and measured tok/s tends to be largest.
              At aggressive quantization levels, dequantization overhead and cache behavior start to matter
              more, and these are hard to model from spec sheets alone.
            </p>
          </Reveal>

          <Reveal delay={390}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              Multi-GPU setups over PCIe (without NVLink) have real overhead that depends on the specific
              model architecture and how the runtime partitions layers. The tool uses empirical scaling
              factors (0.85× for PCIe, 0.95× for NVLink) but these are averages, not guarantees.
            </p>
          </Reveal>

          <Reveal delay={400}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              CPU-only inference varies a lot depending on ISA extensions (AVX2 vs. AVX-512 vs. AMX),
              memory channel configuration, and NUMA topology. Two machines with the same nominal specs
              can show 2× differences in tok/s if one has its memory channels populated differently.
            </p>
          </Reveal>

          <Reveal delay={410}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              The community benchmarks feature exists specifically to close these gaps. Real-world data
              from real hardware configurations is more valuable than any formula, and I&apos;m actively
              using submissions to validate and recalibrate the heuristics. If you have numbers from your
              own setup, I&apos;d genuinely like to see them.
            </p>
          </Reveal>

          {/* Section 6 */}
          <Reveal delay={420}>
            <h2 className={h2}>The methodology page</h2>
          </Reveal>

          <Reveal delay={430}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              Every formula, assumption, and data source used in the tool is documented on the{' '}
              <Link href="/methodology" className={link}>methodology page</Link>. It covers model size
              estimation, KV cache calculation, the bandwidth heuristic, inference modes, MoE handling,
              offload modeling, multi-GPU scaling, prefill speed, time-to-first-token, and confidence
              levels. I wrote it so that anyone can check the math, point out where it breaks, and help
              improve it.
            </p>
          </Reveal>

          {/* Closing */}
          <Reveal delay={440}>
            <div className={`my-10 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`} />
          </Reveal>

          <Reveal delay={450}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              That&apos;s essentially it. I built this because I needed it, I kept working on it because
              the problem turned out to be more interesting than I expected, and I&apos;m sharing it because
              the people who&apos;d benefit most are the same people who could help make the estimates better.
            </p>
          </Reveal>

          {/* CTA */}
          <Reveal delay={460}>
            <div
              className={`mt-10 rounded-2xl border p-8 text-center ${
                isDark
                  ? 'bg-amber-900/20 border-amber-700/40'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <p className={`font-semibold text-lg mb-1 ${strong}`}>Try LocalLLM Advisor</p>
              <p className={`text-sm mb-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Find the best model for your GPU, or the best GPU for your model.
              </p>
              <Link
                href="/"
                className={`inline-block px-8 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 ${
                  isDark
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-900/30'
                    : 'bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-200'
                }`}
              >
                localllm-advisor.com
              </Link>
            </div>
          </Reveal>

          {/* Contact */}
          <Reveal delay={470}>
            <p className={`mt-8 text-sm text-center ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              Questions, corrections, or benchmark submissions?{' '}
              <Link href="/methodology" className={link}>Methodology page</Link>
              {' '}·{' '}
              <Link href="/benchmarks" className={link}>Community benchmarks</Link>
              {' '}·{' '}
              <a href="mailto:info@localllm-advisor.com" className={link}>
                info@localllm-advisor.com
              </a>
            </p>
          </Reveal>

        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
