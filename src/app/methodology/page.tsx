'use client';

import Reveal from '@/components/Reveal';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import PageHero from '@/components/PageHero';
import SiteFooter from '@/components/SiteFooter';
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
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-green-950/40' : 'bg-green-50/70'}`}>
      <Navbar />
      <BackButton />
      <PageHero
        title="Methodology"
        subtitle="How we calculate performance estimates and recommendations."
        accent="green"
      />

      <main className="flex-1 mx-auto max-w-3xl px-4 py-12">
        <div className={`space-y-10 ${prose}`}>

          {/* Quick FAQ — answers the top-2 questions people ask immediately */}
          <Reveal delay={0}>
            <section className={`rounded-2xl border-2 p-6 ${isDark ? 'border-green-600/40 bg-green-950/30' : 'border-green-200 bg-green-50'}`}>
              <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <span className="text-2xl">❓</span> Quick FAQ
              </h2>
              <div className="space-y-5">
                <div>
                  <p className={`font-semibold mb-1 ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                    How are tok/s estimates calculated?
                  </p>
                  <p className="text-[15px]">
                    Token generation speed is <strong className={strong}>memory-bandwidth bound</strong>: each token requires reading the active model weights from GPU memory once.
                    For dense models, the formula is <code className={`px-1.5 py-0.5 rounded text-sm ${codeBg}`}>tok/s = GPU_bandwidth_GBps / model_size_GB</code>.
                    For MoE (Mixture-of-Experts) models, only the active expert weights are read per token, so speed is calculated against the active parameter count rather than the total.
                    For example, an RTX 4090 (1,008 GB/s) running a 7B Q4 model (~3.9 GB) yields ≈ 256 tok/s.
                    All estimates include a ±15–30% uncertainty band to reflect real-world variation from drivers, thermal throttling, and inference runtime.
                  </p>
                </div>
                <div>
                  <p className={`font-semibold mb-1 ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                    Are these real benchmarks or heuristics?
                  </p>
                  <p className="text-[15px]">
                    <strong className={strong}>Both, transparently.</strong>{' '}
                    Model quality scores (MMLU-PRO, MATH, IFEval, etc.) come directly from the{' '}
                    <a
                      href="https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard"
                      target="_blank" rel="noopener noreferrer"
                      className={isDark ? 'text-green-400 hover:text-green-300 underline' : 'text-green-600 hover:text-green-500 underline'}
                    >
                      Open LLM Leaderboard
                    </a>{' '}
                    — those are real, reproducible benchmark runs.
                    Speed estimates are <strong className={strong}>physics-based heuristics</strong> derived from GPU spec sheets (memory bandwidth, TFLOPS).
                    They are not measured on-device, but the underlying formula is the same one used by llama.cpp and the LLM community.
                    Want verified numbers? Submit your own results via the{' '}
                    <a href="/benchmarks" className={isDark ? 'text-green-400 hover:text-green-300 underline' : 'text-green-600 hover:text-green-500 underline'}>community benchmarks page</a>.
                  </p>
                </div>
              </div>
            </section>
          </Reveal>
          {/* Model Size */}
          <Reveal delay={200}>
            <section>
            <h2 className={heading}>Model Size Estimation</h2>
            <p className="mb-3">
              The memory footprint of a model depends on its parameter count and quantization level (bits per weight).
              For each model, we store pre-computed VRAM values derived from actual GGUF file measurements,
              which account for format overhead, embedding tables, and architecture-specific tensor layouts.
              When measured values are unavailable, we fall back to:
            </p>
            <div className={`${codeBg} rounded-lg p-4 font-mono text-sm mb-3`}>
              size_mb = parameters_B × bits_per_weight / 8 × 1024
            </div>
            <p>
              <strong className={strong}>Example:</strong> A 7B model at Q4_K_M (4.5 bpw) quantization:
              7 × 4.5 / 8 × 1024 = <span className={accent}>4,032 MB ≈ 3.9 GB</span>.
              The actual GGUF file is typically 5–15% larger due to format and tensor overhead.
            </p>
            </section>
          </Reveal>

          {/* KV Cache */}
          <Reveal delay={300}>
            <section>
            <h2 className={heading}>KV Cache</h2>
            <p className="mb-3">
              The KV (Key-Value) cache stores attention states for every token in the context window and grows linearly with context length.
              Each token position requires storing key and value vectors across all layers and KV heads in the model.
              The pre-computed VRAM values for each model already include the base KV cache overhead for a short context window (~4K tokens).
              For context beyond this baseline, the additional memory is estimated as:
            </p>
            <div className={`${codeBg} rounded-lg p-4 font-mono text-sm mb-3`}>
              extra_kv_cache_mb = 125 × √(params_B / 7) × (context − 4096) / 1024
            </div>
            <p className="mb-3">
              The base multiplier of 125 MB per 1K tokens corresponds to a 7B model using FP16 KV cache with Grouped-Query Attention (GQA) — the standard for modern LLMs.
              The square root scaling reflects the sub-linear growth of KV cache with model size: larger models have more layers but typically use GQA with a fixed number of KV heads, so KV cache grows slower than model parameters.
            </p>
            <div className={`${cardBg} rounded-lg p-4`}>
              <h4 className={`${strong} font-medium mb-2`}>Why context length matters for VRAM</h4>
              <p className="text-sm">
                KV cache can become the dominant memory consumer at long context lengths.
                A 70B model at 128K context needs approximately 49 GB of additional KV cache alone — more than the model weights at Q4 quantization (~40 GB).
                This is why a model that fits in VRAM at 4K context may not fit at 32K or 128K, even when the base model size is well within the GPU&apos;s capacity.
              </p>
            </div>
            </section>
          </Reveal>

          {/* MoE Models */}
          <Reveal delay={350}>
            <section>
            <h2 className={heading}>Mixture-of-Experts (MoE) Models</h2>
            <p className="mb-3">
              MoE models contain multiple &ldquo;expert&rdquo; sub-networks but only activate a fraction of them per token.
              This creates a fundamental distinction between VRAM requirements and inference speed:
            </p>

            <div className="grid gap-3 md:grid-cols-2 mb-4">
              <div className={`${cardBg} rounded-lg p-4`}>
                <h4 className={`${strong} font-medium mb-2`}>VRAM: Total Parameters</h4>
                <p className="text-sm">
                  All expert weights must be loaded into memory, since any expert may be activated at any time.
                  A 671B-parameter MoE model needs VRAM for all 671B parameters.
                </p>
              </div>
              <div className={`${cardBg} rounded-lg p-4`}>
                <h4 className={`${strong} font-medium mb-2`}>Speed: Active Parameters</h4>
                <p className="text-sm">
                  Only the active expert weights (plus shared attention layers) are read from memory per token.
                  A 671B model with 37B active params achieves decode speed as if it were a ~37B dense model.
                </p>
              </div>
            </div>

            <p className="mb-3">
              Every MoE model in our database includes an explicit <code className={`px-1.5 py-0.5 rounded text-sm ${codeBg}`}>active_params_b</code>{' '}
              value sourced from the model&apos;s official documentation or architecture paper.
              This ensures accurate speed estimates:
            </p>

            <div className={`${codeBg} rounded-lg p-4 font-mono text-sm mb-3`}>
              decode_tok/s = bandwidth_GBps / (active_params_B × bpw / 8)
            </div>

            <p>
              <strong className={strong}>Example:</strong> DeepSeek R1 (671B total, 37B active) at Q4 on an H100 (3,350 GB/s):
              VRAM needed = 671 × 4.5 / 8 ≈ <span className={accent}>377 GB</span> (requires multi-GPU),
              but decode speed = 3350 / (37 × 4.5 / 8) ≈ <span className={accent}>161 tok/s per shard</span> (before multi-GPU overhead).
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
                  Entire model fits in VRAM (with 10% headroom for KV cache growth and runtime overhead). Expect 30–100+ tokens/second depending on GPU bandwidth.
                </p>
              </div>

              <div className={`${cardBg} rounded-lg p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-yellow-600 text-white rounded text-xs font-medium">GPU + RAM Offload</span>
                  <span className={`${strong} font-medium`}>Reduced Performance</span>
                </div>
                <p className="text-sm">
                  Part of the model runs on GPU, rest is offloaded to system RAM. Speed is limited by the serial pipeline through GPU and CPU layers.
                  Requires at least 2 GB of free RAM beyond the offloaded portion. Expect 5–30 tokens/second.
                </p>
              </div>

              <div className={`${cardBg} rounded-lg p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-orange-600 text-white rounded text-xs font-medium">CPU Only</span>
                  <span className={`${strong} font-medium`}>Slow but Works</span>
                </div>
                <p className="text-sm">
                  Entire model runs on CPU using system RAM. Speed depends on RAM bandwidth and CPU capabilities (ISA extensions, core count, clock speed).
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
              Each token requires reading the active model weights from GPU memory. For dense models,
              this is the full model; for MoE models, only the active expert weights:
            </p>
            <div className={`${codeBg} rounded-lg p-4 font-mono text-sm mb-3`}>
              tokens_per_sec = memory_bandwidth_GBps / active_model_size_GB
            </div>
            <p className="mb-4">
              <strong className={strong}>Example:</strong> RTX 4090 (1,008 GB/s bandwidth) running a 70B Q4 dense model (~39 GB):
              1008 / 39 ≈ <span className={accent}>~26 tokens/second</span>
            </p>

            <div className={`${cardBg} rounded-lg p-4`}>
              <h4 className={`${strong} font-medium mb-2`}>Why bandwidth matters more than compute</h4>
              <p className="text-sm">
                During generation, each token requires reading the active model weights from memory.
                Modern GPUs have far more compute power than needed — the bottleneck is how fast you can
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
              <div>gpu_time = (active_size × gpu_fraction) / gpu_bandwidth</div>
              <div>cpu_time = (active_size × cpu_fraction) / ram_bandwidth</div>
              <div>tok/s = 1 / (gpu_time + cpu_time + sync_overhead)</div>
            </div>
            <p className="mb-3">
              CPU layers read weights directly from system RAM, so the bottleneck is RAM bandwidth (not PCIe).
              PCIe only carries the small activation vectors (~8–32 KB) between GPU and CPU layer groups,
              adding a small latency overhead (~0.1–0.2 ms per token). Faster PCIe generations (4.0, 5.0) reduce this latency.
            </p>
            <div className={`${cardBg} rounded-lg p-4`}>
              <h4 className={`${strong} font-medium mb-2`}>Why offload is much slower than full GPU</h4>
              <p className="text-sm">
                Even with 80% of layers on GPU, the remaining 20% on CPU creates a serial
                bottleneck. System RAM typically provides 40–80 GB/s (DDR4/DDR5) of effective bandwidth, compared to
                hundreds of GB/s for GPU memory. The overall speed is dominated by the slowest stage in the pipeline.
              </p>
            </div>
            </section>
          </Reveal>

          {/* RAM Bandwidth */}
          <Reveal delay={560}>
            <section>
            <h2 className={heading}>RAM Bandwidth</h2>
            <p className="mb-3">
              For CPU inference and GPU+RAM offload modes, system RAM bandwidth is a critical factor.
              We estimate it from the DDR specification and apply a real-world utilization factor:
            </p>
            <div className={`${codeBg} rounded-lg p-4 font-mono text-sm mb-3 space-y-1`}>
              <div>theoretical_GBps = transfer_rate_MT/s × 8 bytes × channels / 1000</div>
              <div>effective_GBps = theoretical_GBps × 0.75</div>
            </div>
            <p>
              The 75% utilization factor accounts for memory controller overhead, refresh cycles,
              cache line alignment, NUMA effects, and contention with the OS and other processes.
              For example, DDR5-6400 in dual-channel configuration: 6400 × 8 × 2 / 1000 × 0.75 ≈{' '}
              <span className={accent}>77 GB/s effective</span>.
            </p>
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
              not bandwidth-bound. The forward pass requires approximately 2 FLOPs per active parameter per token:
            </p>
            <div className={`${codeBg} rounded-lg p-4 font-mono text-sm mb-3`}>
              prefill_tok/s = (FP16_TFLOPS × 10<sup>12</sup> × utilization) / (active_params_B × 2 × 10<sup>9</sup>)
            </div>
            <p className="mb-3">
              Utilization is typically 30% without tensor cores, 60% with tensor cores.
              For MoE models, the active parameter count is used (same as for decode speed) since
              only the selected experts participate in the forward pass.
            </p>
            <p>
              This affects time to first token (TTFT) — how long you wait before generation starts.
              For a typical 100-token prompt, TTFT = 100 / prefill_tok/s.
            </p>
            </section>
          </Reveal>

          {/* Multi-GPU */}
          <Reveal delay={700}>
            <section>
            <h2 className={heading}>Multi-GPU Scaling</h2>
            <p className="mb-3">
              Multiple GPUs can combine their VRAM and bandwidth via tensor parallelism, but with overhead
              from inter-GPU communication:
            </p>
            <div className="grid gap-3 md:grid-cols-2 mb-4">
              <div className={`${cardBg} rounded-lg p-4`}>
                <h4 className={`${strong} font-medium mb-2`}>With NVLink</h4>
                <p className="text-sm mb-2">High-speed direct GPU-to-GPU connection.</p>
                <ul className="text-sm space-y-1">
                  <li>• Effective VRAM: <span className={accent}>95%</span> of total</li>
                  <li>• Effective bandwidth: <span className={accent}>90%</span> scaling per GPU</li>
                </ul>
              </div>
              <div className={`${cardBg} rounded-lg p-4`}>
                <h4 className={`${strong} font-medium mb-2`}>Without NVLink (PCIe)</h4>
                <p className="text-sm mb-2">Communication through system bus.</p>
                <ul className="text-sm space-y-1">
                  <li>• Effective VRAM: <span className="text-yellow-400">85%</span> of total</li>
                  <li>• Effective bandwidth: <span className="text-yellow-400">~30%</span> bonus per additional GPU</li>
                </ul>
              </div>
            </div>
            <p>
              The bandwidth formula for PCIe multi-GPU is: <code className={`px-1.5 py-0.5 rounded text-sm ${codeBg}`}>effective_bw = base_bw × (1 + (gpu_count − 1) × 0.3)</code>.
              This conservative estimate reflects the PCIe synchronization overhead during tensor-parallel inference.
              Apple Silicon devices do not support multi-GPU configurations (Ultra variants achieve
              high memory capacity through a single unified memory pool).
            </p>
            </section>
          </Reveal>

          {/* CPU Inference */}
          <Reveal delay={800}>
            <section>
            <h2 className={heading}>CPU Inference</h2>
            <p className="mb-3">
              CPU inference speed is primarily limited by system RAM bandwidth.
              The base speed is calculated the same way as GPU inference — bandwidth divided by active model size — then
              adjusted by CPU-specific multipliers:
            </p>
            <div className={`${codeBg} rounded-lg p-4 font-mono text-sm mb-4`}>
              <div className="mb-2">base_speed = effective_ram_bandwidth / active_model_size</div>
              <div className={isDark ? 'text-gray-400' : 'text-gray-500'}># Then apply multipliers:</div>
              <div>• Thread scaling (diminishing returns past 8 threads)</div>
              <div>• Clock speed scaling (relative to 3.5 GHz baseline)</div>
              <div>• SIMD: AVX2 (1.5×), AVX-512 (2×), AMX (3×)</div>
              <div>• L3 cache bonus (larger cache improves KV access)</div>
            </div>
            <p>
              Intel AMX (Advanced Matrix Extensions) provides significant acceleration for matrix operations,
              making newer Intel CPUs notably faster for LLM inference. CPU inference speed is capped at 60 tok/s
              to reflect practical limits.
            </p>
            </section>
          </Reveal>

          {/* Hardware Recommendations */}
          <Reveal delay={850}>
            <section>
            <h2 className={heading}>Hardware Recommendations</h2>
            <p className="mb-3">
              When recommending hardware for a specific model (&ldquo;Find Hardware&rdquo;), we evaluate every GPU in our database
              across single and multi-GPU configurations (1, 2, 4, and 8 GPUs). For each viable option:
            </p>
            <ul className="space-y-2 mb-4">
              <li className="flex gap-2">
                <span className={accent}>1.</span>
                <span>
                  <strong className={strong}>VRAM check:</strong> The model&apos;s pre-computed VRAM value (from measured GGUF data)
                  must fit within the GPU&apos;s total VRAM (with multi-GPU efficiency scaling applied).
                </span>
              </li>
              <li className="flex gap-2">
                <span className={accent}>2.</span>
                <span>
                  <strong className={strong}>Speed estimate:</strong> Decode tokens/sec is calculated from the GPU&apos;s memory
                  bandwidth and the model&apos;s active parameter count (accounting for MoE architecture).
                </span>
              </li>
              <li className="flex gap-2">
                <span className={accent}>3.</span>
                <span>
                  <strong className={strong}>Tier classification:</strong> Options are categorized as Budget (&lt;15 tok/s),
                  Recommended (15–40 tok/s), or Premium (40+ tok/s) and filtered by user preferences (minimum speed, maximum budget).
                </span>
              </li>
            </ul>
            <p>
              The final recommendations include a <strong className={strong}>minimum viable option</strong> (cheapest that can physically run the model),
              a <strong className={strong}>best value option</strong> (highest tok/s per dollar), and a <strong className={strong}>premium option</strong> (fastest within a reasonable price range).
              Cloud alternatives (RunPod, Vast.ai) are shown alongside local hardware for comparison.
              All GPU vendors are supported: NVIDIA, AMD, Intel Arc, and Apple Silicon.
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

            <p className="mb-3">
              Benchmark scores are renormalized when some benchmarks are missing for a model, so models with
              partial coverage are not unfairly penalized. The best available quantization is selected per model:
              we prefer GPU Full inference over offload or CPU, and within the same inference mode, higher-quality
              quantization is preferred.
            </p>

            <h4 className={`${strong} font-medium mb-2`}>Weights by Use Case</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${tableBorder}`}>
                    <th className={`text-left py-2 ${tableHead}`}>Use Case</th>
                    <th className={`text-center py-2 ${tableHead}`}>Quality</th>
                    <th className={`text-center py-2 ${tableHead}`}>Speed</th>
                    <th className={`text-center py-2 ${tableHead}`}>Quant</th>
                    <th className={`text-left py-2 pl-4 ${tableHead}`}>Key Benchmarks</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={`border-b ${tableRowBorder}`}>
                    <td className="py-2">Chat</td>
                    <td className="text-center">45%</td>
                    <td className="text-center">30%</td>
                    <td className="text-center">25%</td>
                    <td className="pl-4 text-xs">IFEval, MMLU-PRO, BBH, GPQA</td>
                  </tr>
                  <tr className={`border-b ${tableRowBorder}`}>
                    <td className="py-2">Coding</td>
                    <td className="text-center">55%</td>
                    <td className="text-center">25%</td>
                    <td className="text-center">20%</td>
                    <td className="pl-4 text-xs">HumanEval, BigCodeBench, MATH, IFEval</td>
                  </tr>
                  <tr className={`border-b ${tableRowBorder}`}>
                    <td className="py-2">Reasoning</td>
                    <td className="text-center">60%</td>
                    <td className="text-center">15%</td>
                    <td className="text-center">25%</td>
                    <td className="pl-4 text-xs">MATH, GPQA, BBH, MUSR</td>
                  </tr>
                  <tr className={`border-b ${tableRowBorder}`}>
                    <td className="py-2">Creative</td>
                    <td className="text-center">40%</td>
                    <td className="text-center">35%</td>
                    <td className="text-center">25%</td>
                    <td className="pl-4 text-xs">IFEval, MMLU-PRO, BBH</td>
                  </tr>
                  <tr className={`border-b ${tableRowBorder}`}>
                    <td className="py-2">Vision</td>
                    <td className="text-center">50%</td>
                    <td className="text-center">25%</td>
                    <td className="text-center">25%</td>
                    <td className="pl-4 text-xs">IFEval, MMLU-PRO, BBH, GPQA</td>
                  </tr>
                  <tr className={`border-b ${tableRowBorder}`}>
                    <td className="py-2">Roleplay</td>
                    <td className="text-center">35%</td>
                    <td className="text-center">35%</td>
                    <td className="text-center">30%</td>
                    <td className="pl-4 text-xs">IFEval, MMLU-PRO, BBH</td>
                  </tr>
                  <tr>
                    <td className="py-2">Embedding</td>
                    <td className="text-center">70%</td>
                    <td className="text-center">10%</td>
                    <td className="text-center">20%</td>
                    <td className="pl-4 text-xs">MMLU-PRO, BBH, IFEval</td>
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
                  <strong className={strong}>GPU specifications:</strong> Official NVIDIA, AMD, Apple, Intel spec sheets (206+ GPUs)
                </span>
              </li>
              <li className="flex gap-2">
                <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>•</span>
                <span>
                  <strong className={strong}>Model VRAM:</strong> Pre-computed from actual GGUF file measurements,
                  with formula fallback based on{' '}
                  <a href="https://github.com/ggerganov/llama.cpp"
                     target="_blank" rel="noopener noreferrer"
                     className={isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}>
                    llama.cpp
                  </a> memory estimation
                </span>
              </li>
              <li className="flex gap-2">
                <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>•</span>
                <span>
                  <strong className={strong}>MoE active parameters:</strong> Sourced from official model cards and architecture papers for all 77 MoE models in our database
                </span>
              </li>
              <li className="flex gap-2">
                <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>•</span>
                <span>
                  <strong className={strong}>CPU specifications:</strong> Intel, AMD, Apple Silicon spec sheets (78 CPUs)
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
                <li>• KV cache formula uses a GQA approximation; actual size varies by architecture (number of KV heads, head dimension)</li>
                <li>• We assume uniform layer sizes; real models may have varying layer dimensions</li>
                <li>• The 10% VRAM headroom is conservative; some systems can use more</li>
                <li>• CPU inference speed is capped at 60 tok/s; server-class CPUs with multi-channel DDR5 may exceed this</li>
                <li>• Real performance varies by inference engine (llama.cpp vs vLLM vs Ollama vs SGLang)</li>
                <li>• Benchmark scores reflect published evaluations; real-world quality may differ for specific tasks</li>
                <li>• MoE active parameter counts are sourced from documentation; some smaller or newer models use estimates</li>
                <li>• Multi-GPU estimates use conservative PCIe scaling factors; NVLink-connected systems may perform better than estimated</li>
              </ul>
            </div>
            </section>
          </Reveal>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
