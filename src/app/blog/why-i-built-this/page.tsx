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
              cross-reference the GGUF quantizations available from <a href="https://huggingface.co/bartowski" className={link} target="_blank" rel="noopener noreferrer">bartowski</a> or <a href="https://huggingface.co/unsloth" className={link} target="_blank" rel="noopener noreferrer">unsloth</a>, then look up my
              GPU&apos;s memory bandwidth on <a href="https://www.techpowerup.com/gpu-specs/" className={link} target="_blank" rel="noopener noreferrer">TechPowerUp</a>, then search <a href="https://www.reddit.com/r/LocalLLaMA/" className={link} target="_blank" rel="noopener noreferrer">r/LocalLLaMA</a> for tok/s reports from
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
              <a href="https://github.com/ggerganov/llama.cpp" className={link} target="_blank" rel="noopener noreferrer">llama.cpp</a>, Ollama, vLLM, and others have made the actual &ldquo;run the model&rdquo; part
              mostly painless.
            </p>
          </Reveal>

          <Reveal delay={160}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              But the decision that comes <em>before</em> inference: which model to use, at which
              quantization level, on which hardware, and what performance to expect. None of that has been
              solved in a centralized way. New models appear on HuggingFace weekly. GPU product lines keep branching. Quantization
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
            <p className="text-[1.06rem] leading-[1.75] mb-3">
              <Link href="https://localllm-advisor.com" className={link}>LocalLLM Advisor</Link> is a web
              tool that answers two questions:
            </p>
            <ul className={`list-disc list-outside ml-6 mb-4 space-y-1 text-[1.06rem] leading-[1.75] ${prose}`}>
              <li>&ldquo;Given my hardware, what is the best model I can run?&rdquo;</li>
              <li>&ldquo;Given a model I want to run, what hardware do I need?&rdquo;</li>
            </ul>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              It currently covers 1.4k+ models across dense and MoE architectures, 206 GPUs (NVIDIA, AMD,
              Intel Arc, Apple Silicon), and 78 CPUs.
            </p>
          </Reveal>

          <Reveal delay={210}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              The <strong className={strong}>Model Finder</strong> takes your GPU (auto-detected via
              WebGPU, or selected manually) and a use case - chat, coding, reasoning, vision, roleplay,
              embedding - and returns a ranked list of models that fit. Each result shows the quantization
              level, estimated VRAM usage, estimated tok/s, and a ready-to-paste Ollama command. The
              ranking weighs model quality (from the <a href="https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard" className={link} target="_blank" rel="noopener noreferrer">Open LLM Leaderboard</a>: MMLU-PRO, HumanEval, MATH,
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
            <pre className={`rounded-lg border p-4 font-mono text-sm mb-5 overflow-x-auto leading-relaxed text-center ${codeBg}`}>
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

          {/* ── Figure 1: Decode step — memory-bandwidth bound ── */}
          <Reveal delay={268}>
            {(() => {
              // amber accent matches the blog's link/heading palette
              const accent = isDark ? '#d97706' : '#b45309';   // amber-600/700 — loaded / active
              const idle   = isDark ? '#44403c' : '#d6d3d1';   // stone-700/300  — stalled / idle
              const stroke = isDark ? '#78716c' : '#78716c';   // stone-500 — structural lines
              const text   = isDark ? '#d1d5db' : '#374151';   // gray-300/700 — matches blog prose
              const muted  = isDark ? '#6b7280' : '#9ca3af';   // gray-500/400 — secondary labels
              const font   = 'ui-monospace,SFMono-Regular,Menlo,monospace';

              return (
                <figure className={`my-4 border ${isDark ? 'bg-amber-950/20 border-amber-900/30' : 'bg-amber-50/40 border-amber-200'}`}>
                  <div className="p-6">
                    <svg viewBox="0 0 480 232" className="w-full"
                      aria-label="LLM decode step is memory-bandwidth bound">

                      {/* VRAM panel */}
                      <text x="95" y="18" textAnchor="middle" fontSize="10" fontWeight="600"
                        letterSpacing="0.08em" fill={text} fontFamily={font}>VRAM</text>
                      <rect x="20" y="26" width="150" height="118"
                        fill="none" stroke={stroke} strokeWidth="1"/>
                      {/* weight blocks — amber because they are being fully read every token */}
                      {[40, 54, 68, 82, 96, 110].map((y) => (
                        <rect key={y} x="32" y={y} width="126" height="8" fill={accent}/>
                      ))}
                      <text x="95" y="134" textAnchor="middle" fontSize="8"
                        fill={muted} fontFamily={font}>full weight read per token</text>

                      {/* bandwidth channel — amber arrows = saturated path */}
                      <text x="240" y="66" textAnchor="middle" fontSize="9"
                        fill={text} fontFamily={font}>320 GB/s</text>
                      {[80, 94, 108].map((y) => (
                        <g key={y}>
                          <line x1="180" y1={y} x2="298" y2={y} stroke={accent} strokeWidth="1"/>
                          <polygon points={`293,${y - 3} 300,${y} 293,${y + 3}`} fill={accent}/>
                        </g>
                      ))}

                      {/* GPU Compute panel */}
                      <text x="385" y="18" textAnchor="middle" fontSize="10" fontWeight="600"
                        letterSpacing="0.08em" fill={text} fontFamily={font}>GPU COMPUTE</text>
                      <rect x="310" y="26" width="150" height="118"
                        fill="none" stroke={stroke} strokeWidth="1"/>
                      {/* 1 of 8 cores active; the rest outline-only = stalled waiting for data */}
                      {Array.from({ length: 8 }).map((_, i) => {
                        const col = i % 4;
                        const row = Math.floor(i / 4);
                        const x = 324 + col * 32;
                        const y = 44 + row * 32;
                        const active = i === 0;
                        return (
                          <rect key={i} x={x} y={y} width="22" height="22"
                            fill={active ? accent : 'none'} stroke={stroke} strokeWidth="1"/>
                        );
                      })}
                      <text x="385" y="134" textAnchor="middle" fontSize="8"
                        fill={muted} fontFamily={font}>memory-bound stall</text>

                      {/* token output */}
                      <line x1="460" y1="85" x2="478" y2="85" stroke={stroke} strokeWidth="1"/>
                      <polygon points="473,82 479,85 473,88" fill={stroke}/>

                      {/* measurement bars: amber = saturated, stone = idle */}
                      {[
                        { label: 'bandwidth', pct: 92, barFill: accent },
                        { label: 'compute',   pct: 12, barFill: idle   },
                      ].map((b, i) => {
                        const y = 172 + i * 24;
                        return (
                          <g key={b.label} fontFamily={font} fontSize="9">
                            <text x="96" y={y + 7} textAnchor="end" fill={text}>{b.label}</text>
                            <rect x="104" y={y} width="300" height="8"
                              fill="none" stroke={stroke} strokeWidth="1"/>
                            <rect x="104" y={y} width={(300 * b.pct) / 100} height="8" fill={b.barFill}/>
                            <text x="412" y={y + 7} fill={text}>{b.pct}%</text>
                          </g>
                        );
                      })}

                      {/* axis ticks */}
                      {[0, 25, 50, 75, 100].map((t) => {
                        const x = 104 + 3 * t;
                        return (
                          <g key={t}>
                            <line x1={x} y1="212" x2={x} y2="216" stroke={stroke} strokeWidth="1"/>
                            <text x={x} y="226" textAnchor="middle" fontSize="7"
                              fill={muted} fontFamily={font}>{t}</text>
                          </g>
                        );
                      })}
                      <text x="418" y="226" fontSize="7" fill={muted} fontFamily={font}>%</text>
                    </svg>
                  </div>
                  <figcaption className={`px-6 pb-5 text-[11px] text-center ${isDark ? 'text-amber-900/60' : 'text-amber-900/50'}`}
                    style={{ fontFamily: 'ui-monospace,monospace' }}>
                    Decode is bandwidth-bound: loading weights from VRAM dominates each token step.
                    CUDA cores sit idle waiting for data, raising TFLOPS does not improve throughput.
                  </figcaption>
                </figure>
              );
            })()}
          </Reveal>

          <Reveal delay={270}>
            <p className="text-[1.06rem] leading-[1.75] mb-5">
              This is the same relationship the llama.cpp community uses as a rule of thumb, and it holds
              up well in practice. It&apos;s why the RTX 4090 and RTX 3090 end up with similar LLM
              performance despite the 4090 having far more compute; their memory bandwidth is in the same
              ballpark (1,008 GB/s vs. 936 GB/s).
            </p>
          </Reveal>

          {/* ── Figure 2: Dense vs MoE ── */}
          <Reveal delay={279}>
            {(() => {
              const accent = isDark ? '#d97706' : '#b45309';   // amber — active weights
              const stroke = isDark ? '#78716c' : '#78716c';   // stone-500 — structure
              const text   = isDark ? '#d1d5db' : '#374151';   // gray-300/700
              const muted  = isDark ? '#6b7280' : '#9ca3af';   // gray-500/400
              const font   = 'ui-monospace,SFMono-Regular,Menlo,monospace';

              // grid geometry — shared between both panels
              const blockSize = 22;
              const gap = 8;
              const gridDim = 4 * blockSize + 3 * gap; // 112
              const panelW = 180;
              const panelH = 140;
              const panelY = 42;
              const leftX = 20;
              const rightX = 280;
              const gridOffX = (panelW - gridDim) / 2; // 34
              const gridOffY = (panelH - gridDim) / 2; // 14

              const renderGrid = (px: number, activeSet: number[]) =>
                Array.from({ length: 16 }).map((_, i) => {
                  const col = i % 4;
                  const row = Math.floor(i / 4);
                  const x = px + gridOffX + col * (blockSize + gap);
                  const y = panelY + gridOffY + row * (blockSize + gap);
                  const active = activeSet.includes(i);
                  return (
                    <rect key={i} x={x} y={y} width={blockSize} height={blockSize}
                      fill={active ? accent : 'none'} stroke={stroke} strokeWidth="1"/>
                  );
                });

              const allActive = Array.from({ length: 16 }, (_, i) => i);
              const moeActive = [5, 10];

              // legend: centered at x=240, below both panels + their metrics
              // metrics end at panelY + panelH + 36 = 218
              // legend sits at y=244 (26px clearance), viewBox bottom = 270
              const legendY = 244;
              // item widths (monospace 8px ≈ 4.8px/char): swatch10 + gap6 + text
              // "active weights" 14ch→67px = item 83px; "resident, inactive" 18ch→86px = item 102px
              // gap between items 24px; total 209px; start = 240 - 104.5 = 135
              const leg1X = 136;
              const leg2X = 244;

              return (
                <figure className={`my-4 border ${isDark ? 'bg-amber-950/20 border-amber-900/30' : 'bg-amber-50/40 border-amber-200'}`}>
                  <div className="p-6">
                    <svg viewBox="0 0 480 270" className="w-full"
                      aria-label="Dense versus MoE weight layout">

                      {/* ── Left panel: Dense 7B ── */}
                      <text x={leftX + panelW / 2} y="18" textAnchor="middle" fontSize="10" fontWeight="600"
                        letterSpacing="0.08em" fill={text} fontFamily={font}>DENSE 7B</text>
                      <text x={leftX + panelW / 2} y="32" textAnchor="middle" fontSize="8"
                        fill={muted} fontFamily={font}>all weights read per token</text>
                      <rect x={leftX} y={panelY} width={panelW} height={panelH}
                        fill="none" stroke={stroke} strokeWidth="1"/>
                      {renderGrid(leftX, allActive)}

                      <text x={leftX + panelW / 2} y={panelY + panelH + 22} textAnchor="middle"
                        fontSize="9" fill={text} fontFamily={font}>VRAM  4.5 GB</text>
                      <text x={leftX + panelW / 2} y={panelY + panelH + 36} textAnchor="middle"
                        fontSize="9" fill={text} fontFamily={font}>32 tok/s</text>

                      {/* ── Right panel: MoE 67B ── */}
                      <text x={rightX + panelW / 2} y="18" textAnchor="middle" fontSize="10" fontWeight="600"
                        letterSpacing="0.08em" fill={text} fontFamily={font}>MOE 67B / 7B ACTIVE</text>
                      <text x={rightX + panelW / 2} y="32" textAnchor="middle" fontSize="8"
                        fill={muted} fontFamily={font}>subset of experts read per token</text>
                      <rect x={rightX} y={panelY} width={panelW} height={panelH}
                        fill="none" stroke={stroke} strokeWidth="1"/>
                      {renderGrid(rightX, moeActive)}

                      <text x={rightX + panelW / 2} y={panelY + panelH + 22} textAnchor="middle"
                        fontSize="9" fill={text} fontFamily={font}>VRAM  40 GB</text>
                      <text x={rightX + panelW / 2} y={panelY + panelH + 36} textAnchor="middle"
                        fontSize="9" fill={text} fontFamily={font}>28 tok/s</text>

                      {/* ── Legend — centered, equidistant from both panels ── */}
                      <g fontFamily={font} fontSize="8" fill={muted}>
                        <rect x={leg1X} y={legendY} width="10" height="10" fill={accent}/>
                        <text x={leg1X + 16} y={legendY + 8}>active weights</text>
                        <rect x={leg2X} y={legendY} width="10" height="10"
                          fill="none" stroke={stroke} strokeWidth="1"/>
                        <text x={leg2X + 16} y={legendY + 8}>resident, inactive</text>
                      </g>
                    </svg>
                  </div>
                </figure>
              );
            })()}
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
            <pre className={`rounded-lg border p-4 font-mono text-sm mb-5 text-center overflow-x-auto leading-relaxed ${codeBg}`}>
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
              throughput: system RAM offers 40–80 GB/s of effective bandwidth versus hundreds of GB/s on
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
              files in the build (about 1.7 MB total). Supabase powers only the community features (benchmarks, reviews, price alerts) where a database is actually necessary.
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
