'use client';

import Reveal from '@/components/Reveal';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import Footer from '@/components/Footer';
import { useTheme } from '@/components/ThemeProvider';

export default function MethodologyPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const heading = `text-xl font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`;
  const prose = isDark ? 'text-gray-300' : 'text-gray-600';
  const codeBg = isDark ? 'bg-gray-800' : 'bg-gray-100';
  const accent = isDark ? 'text-green-400' : 'text-green-600';
  const strong = isDark ? 'text-white' : 'text-gray-900';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-gray-50 border border-gray-200';
  const tableBorder = isDark ? 'border-gray-700' : 'border-gray-300';
  const tableRowBorder = isDark ? 'border-gray-800' : 'border-gray-200';
  const tableHead = isDark ? 'text-gray-400' : 'text-gray-500';
  const warnBg = isDark ? 'bg-yellow-900/20 border border-yellow-700/50' : 'bg-yellow-50 border border-yellow-200';

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <BackButton />

      <main className="flex-1 mx-auto max-w-3xl px-4 py-12">
        <Reveal delay={0}>
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Methodology</h1>
        </Reveal>
        <Reveal delay={100}>
          <p className={`mb-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            How we calculate performance estimates and recommendations.
          </p>
        </Reveal>

        <div className={`space-y-10 ${prose}`}>
          {/* Model Size */}
          <Reveal delay={200}>
            <section>
            <h2 className={heading}>Model Size Estimation</h2>
            <p className="mb-3">
              The memory footprint of a model depends on its parameter count and quantization level (bits per weight):
            </p>
            <div className={`${codeBg} rounded-lg p-4 font-mono text-sm mb-3`}>
              size_mb = parameters_B × bits_per_weight / 8 × 1024
            </div>
            <p>
              <strong className={strong}>Example:</strong> A 7B model at Q4 (4-bit) quantization:
              7 × 4 / 8 × 1024 = <span className={accent}>3,584 MB ≈ 3.5 GB</span>
            </p>
            </section>
          </Reveal>

          {/* KV Cache */}
          <Reveal delay={300}>
            <section>
            <h2 className={heading}>KV Cache</h2>
            <p className="mb-3">
              The KV (Key-Value) cache stores attention states and grows with context length.
              For context beyond the base 4K tokens:
            </p>
            <div className={`${codeBg} rounded-lg p-4 font-mono text-sm mb-3`}>
              kv_cache_mb = 0.5 × √(params_B / 7) × (context - 4096) / 1024
            </div>
            <p>
              Larger models need proportionally more KV cache. This is why 70B models can run out of
              VRAM at high context lengths even when the base model fits.
            </p>
            </section>
          </Reveal>

          {/* Inference Modes */}
          <Reveal delay={400}>
            <section>
            <h2 className={heading}>Inference Modes</h2>
            <p className="mb-4">We determine the best way to run each model based on available memory:</p>

            <div className="space-y-3">
              <div className={`${cardBg} rounded-lg p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-green-600 text-white rounded text-xs font-medium">GPU Full</span>
                  <span className={`${strong} font-medium`}>Optimal Performance</span>
                </div>
                <p className="text-sm">
                  Entire model fits in VRAM (with 10% headroom). Expect 30-100+ tokens/second depending on GPU bandwidth.
                </p>
              </div>

              <div className={`${cardBg} rounded-lg p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-yellow-600 text-white rounded text-xs font-medium">GPU + RAM Offload</span>
                  <span className={`${strong} font-medium`}>Reduced Performance</span>
                </div>
                <p className="text-sm">
                  Part of the model runs on GPU, rest is offloaded to system RAM. Speed limited by PCIe bandwidth.
                  Expect 5-30 tokens/second.
                </p>
              </div>

              <div className={`${cardBg} rounded-lg p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-orange-600 text-white rounded text-xs font-medium">CPU Only</span>
                  <span className={`${strong} font-medium`}>Slow but Works</span>
                </div>
                <p className="text-sm">
                  Entire model runs on CPU using system RAM. Speed depends on RAM bandwidth and CPU capabilities.
                  Expect 1–30 tokens/second (higher with DDR5 and AVX-512/AMX).
                </p>
              </div>
            </div>
            </section>
          </Reveal>

          {/* Token Generation Speed */}
          <Reveal delay={500}>
            <section>
            <h2 className={heading}>Token Generation Speed</h2>
            <p className="mb-3">
              Token generation (decode) is <strong className={strong}>memory-bandwidth bound</strong>.
              The formula is surprisingly simple:
            </p>
            <div className={`${codeBg} rounded-lg p-4 font-mono text-sm mb-3`}>
              tokens_per_sec = memory_bandwidth_GBps / model_size_GB
            </div>
            <p className="mb-4">
              <strong className={strong}>Example:</strong> RTX 4090 (1,008 GB/s bandwidth) running a 70B Q4 model (35 GB):
              1008 / 35 = <span className={accent}>~29 tokens/second</span>
            </p>

            <div className={`${cardBg} rounded-lg p-4`}>
              <h4 className={`${strong} font-medium mb-2`}>Why bandwidth matters more than compute</h4>
              <p className="text-sm">
                During generation, each token requires reading the entire model weights from memory.
                Modern GPUs have far more compute power than needed—the bottleneck is how fast you can
                feed data to the cores. This is why the RTX 4090 and RTX 3090 have similar LLM performance
                despite the 4090 having much more compute: their memory bandwidth is comparable.
              </p>
            </div>
            </section>
          </Reveal>

          {/* GPU + RAM Offload Model */}
          <Reveal delay={550}>
            <section>
            <h2 className={heading}>GPU + RAM Offload Speed</h2>
            <p className="mb-3">
              When a model doesn&apos;t fully fit in VRAM, some layers run on GPU and the rest on CPU/RAM.
              These layers process <strong className={strong}>sequentially</strong>, not in parallel —
              so the total time per token is the <em>sum</em> of both parts, not an average:
            </p>
            <div className={`${codeBg} rounded-lg p-4 font-mono text-sm mb-3 space-y-1`}>
              <div>gpu_time = (model_size × gpu_fraction) / gpu_bandwidth</div>
              <div>cpu_time = (model_size × cpu_fraction) / ram_bandwidth</div>
              <div>tok/s = 1 / (gpu_time + cpu_time + sync_overhead)</div>
            </div>
            <p className="mb-3">
              CPU layers read weights directly from system RAM, so the bottleneck is RAM bandwidth (not PCIe).
              PCIe only carries the small activation vectors (~8–32KB) between GPU and CPU layer groups,
              adding a small latency overhead (~0.1–0.2ms per token).
            </p>
            <div className={`${cardBg} rounded-lg p-4`}>
              <h4 className={`${strong} font-medium mb-2`}>Why offload is much slower than full GPU</h4>
              <p className="text-sm">
                Even with 80% of layers on GPU, the remaining 20% on CPU creates a serial
                bottleneck. PCIe 4.0 x16 provides ~25 GB/s effective bandwidth vs hundreds of GB/s
                for GPU memory. The overall speed is dominated by the slowest stage in the pipeline.
              </p>
            </div>
            </section>
          </Reveal>

          {/* Uncertainty Ranges */}
          <Reveal delay={575}>
            <section>
            <h2 className={heading}>Uncertainty Ranges</h2>
            <p className="mb-3">
              All performance estimates are shown as <strong className={strong}>ranges</strong> rather
              than single numbers. Real-world performance varies due to inference runtime (Ollama, llama.cpp,
              vLLM), driver version, thermal throttling, background system load, and model-specific optimizations.
            </p>
            <div className="grid gap-3 md:grid-cols-3 mb-3">
              <div className={`${cardBg} rounded-lg p-4 text-center`}>
                <div className="text-xs mb-1">GPU Full</div>
                <div className={`text-lg font-bold ${accent}`}>±15%</div>
                <div className="text-xs mt-1">Well-understood regime</div>
              </div>
              <div className={`${cardBg} rounded-lg p-4 text-center`}>
                <div className="text-xs mb-1">GPU + RAM Offload</div>
                <div className="text-lg font-bold text-yellow-400">±25%</div>
                <div className="text-xs mt-1">PCIe/sync variation</div>
              </div>
              <div className={`${cardBg} rounded-lg p-4 text-center`}>
                <div className="text-xs mb-1">CPU Only</div>
                <div className="text-lg font-bold text-orange-400">±30%</div>
                <div className="text-xs mt-1">Highly implementation-dependent</div>
              </div>
            </div>
            <p>
              These bands reflect the inherent variance in real-world setups. For precise numbers,
              we recommend running your own benchmarks and submitting them to our community benchmarks page.
            </p>
            </section>
          </Reveal>

          {/* Prefill Speed */}
          <Reveal delay={600}>
            <section>
            <h2 className={heading}>Prefill Speed (Prompt Processing)</h2>
            <p className="mb-3">
              Processing the input prompt is <strong className={strong}>compute-bound</strong>,
              not bandwidth-bound:
            </p>
            <div className={`${codeBg} rounded-lg p-4 font-mono text-sm mb-3`}>
              prefill_tok/s = (FP16_TFLOPS × 10<sup>12</sup> × utilization) / (params_B × 2 × 10<sup>9</sup>)
            </div>
            <p className="mb-2">
              Since TFLOPS is in trillions and params_B in billions, this simplifies to:
            </p>
            <div className={`${codeBg} rounded-lg p-4 font-mono text-sm mb-3`}>
              prefill_tok/s = (FP16_TFLOPS × utilization × 1000) / (params_B × 2)
            </div>
            <p>
              Utilization is typically 30% without tensor cores, 60% with tensor cores.
              This affects time to first token (TTFT)—how long you wait before generation starts.
            </p>
            </section>
          </Reveal>

          {/* Multi-GPU */}
          <Reveal delay={700}>
            <section>
            <h2 className={heading}>Multi-GPU Scaling</h2>
            <p className="mb-3">
              Multiple GPUs can combine their VRAM and bandwidth, but with overhead:
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className={`${cardBg} rounded-lg p-4`}>
                <h4 className={`${strong} font-medium mb-2`}>With NVLink</h4>
                <p className="text-sm mb-2">High-speed direct GPU-to-GPU connection.</p>
                <ul className="text-sm space-y-1">
                  <li>• Effective VRAM: <span className={accent}>95%</span> of total</li>
                  <li>• Effective bandwidth: <span className={accent}>90%</span> scaling</li>
                </ul>
              </div>
              <div className={`${cardBg} rounded-lg p-4`}>
                <h4 className={`${strong} font-medium mb-2`}>Without NVLink (PCIe)</h4>
                <p className="text-sm mb-2">Communication through system bus.</p>
                <ul className="text-sm space-y-1">
                  <li>• Effective VRAM: <span className="text-yellow-400">85%</span> of total</li>
                  <li>• Effective bandwidth: <span className="text-yellow-400">~30%</span> bonus per GPU</li>
                </ul>
              </div>
            </div>
            </section>
          </Reveal>

          {/* CPU Inference */}
          <Reveal delay={800}>
            <section>
            <h2 className={heading}>CPU Inference</h2>
            <p className="mb-3">
              CPU inference speed depends on RAM bandwidth and CPU capabilities:
            </p>
            <div className={`${codeBg} rounded-lg p-4 font-mono text-sm mb-4`}>
              <div className="mb-2">base_speed = ram_bandwidth / model_size</div>
              <div className={isDark ? 'text-gray-400' : 'text-gray-500'}># Then apply multipliers:</div>
              <div>• Thread scaling (diminishing returns after 8 threads)</div>
              <div>• Clock speed scaling</div>
              <div>• SIMD: AVX2 (1.5×), AVX-512 (2×), AMX (3×)</div>
              <div>• L3 cache bonus</div>
            </div>
            <p>
              Intel AMX (Advanced Matrix Extensions) provides significant acceleration for matrix operations,
              making newer Intel CPUs notably faster for LLM inference.
            </p>
            </section>
          </Reveal>

          {/* Scoring */}
          <Reveal delay={900}>
            <section>
            <h2 className={heading}>Final Score Calculation</h2>
            <p className="mb-3">
              Each model&apos;s final score combines three factors with weights that vary by use case:
            </p>
            <div className={`${codeBg} rounded-lg p-4 font-mono text-sm mb-4`}>
              score = benchmarkScore × wQuality + speedScore × wSpeed + (quantQuality × 100) × wQuant
            </div>
            <div className={`${cardBg} rounded-lg p-4 space-y-3 mb-4`}>
              <div className="flex justify-between items-center">
                <span className={strong}>Quality (Benchmarks)</span>
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>IFEval, MATH, HumanEval, MMLU-PRO, etc.</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={strong}>Speed</span>
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Logarithmic scale: 60+ tok/s = 100, 1 tok/s = 5</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={strong}>Quant Fidelity</span>
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Higher-bit quantizations score higher (Q8 &gt; Q4 &gt; Q2)</span>
              </div>
            </div>

            <h4 className={`${strong} font-medium mb-2`}>Weights by Use Case</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${tableBorder}`}>
                    <th className={`text-left py-2 ${tableHead}`}>Use Case</th>
                    <th className={`text-center py-2 ${tableHead}`}>Quality</th>
                    <th className={`text-center py-2 ${tableHead}`}>Speed</th>
                    <th className={`text-center py-2 ${tableHead}`}>Quant</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={`border-b ${tableRowBorder}`}>
                    <td className="py-2">Chat</td>
                    <td className="text-center">45%</td>
                    <td className="text-center">30%</td>
                    <td className="text-center">25%</td>
                  </tr>
                  <tr className={`border-b ${tableRowBorder}`}>
                    <td className="py-2">Coding</td>
                    <td className="text-center">55%</td>
                    <td className="text-center">25%</td>
                    <td className="text-center">20%</td>
                  </tr>
                  <tr className={`border-b ${tableRowBorder}`}>
                    <td className="py-2">Reasoning</td>
                    <td className="text-center">60%</td>
                    <td className="text-center">15%</td>
                    <td className="text-center">25%</td>
                  </tr>
                  <tr className={`border-b ${tableRowBorder}`}>
                    <td className="py-2">Creative</td>
                    <td className="text-center">40%</td>
                    <td className="text-center">35%</td>
                    <td className="text-center">25%</td>
                  </tr>
                  <tr className={`border-b ${tableRowBorder}`}>
                    <td className="py-2">Vision</td>
                    <td className="text-center">50%</td>
                    <td className="text-center">25%</td>
                    <td className="text-center">25%</td>
                  </tr>
                  <tr className={`border-b ${tableRowBorder}`}>
                    <td className="py-2">Roleplay</td>
                    <td className="text-center">35%</td>
                    <td className="text-center">35%</td>
                    <td className="text-center">30%</td>
                  </tr>
                  <tr>
                    <td className="py-2">Embedding</td>
                    <td className="text-center">70%</td>
                    <td className="text-center">10%</td>
                    <td className="text-center">20%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            </section>
          </Reveal>

          {/* Data Sources */}
          <Reveal delay={1000}>
            <section>
            <h2 className={heading}>Data Sources</h2>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>•</span>
                <span>
                  <strong className={strong}>Model benchmarks:</strong>{' '}
                  <a href="https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard"
                     target="_blank" rel="noopener noreferrer"
                     className={isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}>
                    Open LLM Leaderboard
                  </a> on HuggingFace
                </span>
              </li>
              <li className="flex gap-2">
                <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>•</span>
                <span>
                  <strong className={strong}>GPU specifications:</strong> Official NVIDIA, AMD, Apple, Intel spec sheets
                </span>
              </li>
              <li className="flex gap-2">
                <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>•</span>
                <span>
                  <strong className={strong}>VRAM calculations:</strong> Based on{' '}
                  <a href="https://github.com/ggerganov/llama.cpp"
                     target="_blank" rel="noopener noreferrer"
                     className={isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}>
                    llama.cpp
                  </a> memory estimation formulas
                </span>
              </li>
            </ul>
            </section>
          </Reveal>

          {/* Limitations */}
          <Reveal delay={1100}>
            <section>
            <h2 className={heading}>Limitations</h2>
            <div className={`${warnBg} rounded-lg p-4`}>
              <ul className="space-y-2 text-sm">
                <li>• KV cache formula is simplified; actual size depends on model architecture (GQA, MQA)</li>
                <li>• We assume uniform layer sizes; real models may vary</li>
                <li>• The 10% VRAM headroom is conservative; some systems can use more</li>
                <li>• CPU inference speed is capped at 60 tok/s; server-class CPUs with multi-channel DDR5 may exceed this</li>
                <li>• Real performance varies by inference engine (llama.cpp vs vLLM vs Ollama)</li>
                <li>• Benchmark scores reflect published evaluations; real-world quality may differ for specific tasks</li>
              </ul>
            </div>
            </section>
          </Reveal>
        </div>
      </main>

      <Footer />
    </div>
  );
}
