'use client';

import Link from 'next/link';

export default function MethodologyPage() {
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
            <Link href="/methodology" className="text-white">
              Methodology
            </Link>
            <Link href="/faq" className="text-gray-400 hover:text-white transition-colors">
              FAQ
            </Link>
            <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
              About
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Methodology</h1>
        <p className="text-gray-400 mb-8">
          How we calculate performance estimates and recommendations.
        </p>

        <div className="space-y-10 text-gray-300">
          {/* Model Size */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Model Size Estimation</h2>
            <p className="mb-3">
              The memory footprint of a model depends on its parameter count and quantization level (bits per weight):
            </p>
            <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm mb-3">
              size_mb = parameters_B × bits_per_weight / 8 × 1024
            </div>
            <p>
              <strong className="text-white">Example:</strong> A 7B model at Q4 (4-bit) quantization:
              7 × 4 / 8 × 1024 = <span className="text-green-400">3,584 MB ≈ 3.5 GB</span>
            </p>
          </section>

          {/* KV Cache */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">KV Cache</h2>
            <p className="mb-3">
              The KV (Key-Value) cache stores attention states and grows with context length.
              For context beyond the base 4K tokens:
            </p>
            <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm mb-3">
              kv_cache_mb = 0.5 × √(params_B / 7) × (context - 4096) / 1024
            </div>
            <p>
              Larger models need proportionally more KV cache. This is why 70B models can run out of
              VRAM at high context lengths even when the base model fits.
            </p>
          </section>

          {/* Inference Modes */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Inference Modes</h2>
            <p className="mb-4">We determine the best way to run each model based on available memory:</p>

            <div className="space-y-3">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-green-600 rounded text-xs font-medium">GPU Full</span>
                  <span className="text-white font-medium">Optimal Performance</span>
                </div>
                <p className="text-sm">
                  Entire model fits in VRAM (with 10% headroom). Expect 30-100+ tokens/second depending on GPU bandwidth.
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-yellow-600 rounded text-xs font-medium">GPU + RAM Offload</span>
                  <span className="text-white font-medium">Reduced Performance</span>
                </div>
                <p className="text-sm">
                  Part of the model runs on GPU, rest is offloaded to system RAM. Speed limited by PCIe bandwidth.
                  Expect 5-30 tokens/second.
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-orange-600 rounded text-xs font-medium">CPU Only</span>
                  <span className="text-white font-medium">Slow but Works</span>
                </div>
                <p className="text-sm">
                  Entire model runs on CPU using system RAM. Speed depends on RAM bandwidth and CPU capabilities.
                  Expect 1-15 tokens/second.
                </p>
              </div>
            </div>
          </section>

          {/* Token Generation Speed */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Token Generation Speed</h2>
            <p className="mb-3">
              Token generation (decode) is <strong className="text-white">memory-bandwidth bound</strong>.
              The formula is surprisingly simple:
            </p>
            <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm mb-3">
              tokens_per_sec = memory_bandwidth_GBps / model_size_GB
            </div>
            <p className="mb-4">
              <strong className="text-white">Example:</strong> RTX 4090 (1,008 GB/s bandwidth) running a 70B Q4 model (35 GB):
              1008 / 35 = <span className="text-green-400">~29 tokens/second</span>
            </p>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">Why bandwidth matters more than compute</h4>
              <p className="text-sm">
                During generation, each token requires reading the entire model weights from memory.
                Modern GPUs have far more compute power than needed—the bottleneck is how fast you can
                feed data to the cores. This is why the RTX 4090 and RTX 3090 have similar LLM performance
                despite the 4090 having much more compute: their memory bandwidth is comparable.
              </p>
            </div>
          </section>

          {/* Prefill Speed */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Prefill Speed (Prompt Processing)</h2>
            <p className="mb-3">
              Processing the input prompt is <strong className="text-white">compute-bound</strong>,
              not bandwidth-bound:
            </p>
            <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm mb-3">
              prefill_tokens_per_sec = (FP16_TFLOPS × utilization) / (params_B × 2)
            </div>
            <p>
              Utilization is typically 30% without tensor cores, 60% with tensor cores.
              This affects "time to first token"—how long you wait before generation starts.
            </p>
          </section>

          {/* Multi-GPU */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Multi-GPU Scaling</h2>
            <p className="mb-3">
              Multiple GPUs can combine their VRAM and bandwidth, but with overhead:
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">With NVLink</h4>
                <p className="text-sm mb-2">High-speed direct GPU-to-GPU connection.</p>
                <ul className="text-sm space-y-1">
                  <li>• Effective VRAM: <span className="text-green-400">95%</span> of total</li>
                  <li>• Effective bandwidth: <span className="text-green-400">90%</span> scaling</li>
                </ul>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">Without NVLink (PCIe)</h4>
                <p className="text-sm mb-2">Communication through system bus.</p>
                <ul className="text-sm space-y-1">
                  <li>• Effective VRAM: <span className="text-yellow-400">85%</span> of total</li>
                  <li>• Effective bandwidth: <span className="text-yellow-400">~30%</span> bonus per GPU</li>
                </ul>
              </div>
            </div>
          </section>

          {/* CPU Inference */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">CPU Inference</h2>
            <p className="mb-3">
              CPU inference speed depends on RAM bandwidth and CPU capabilities:
            </p>
            <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm mb-4">
              <div className="mb-2">base_speed = ram_bandwidth / model_size</div>
              <div className="text-gray-400"># Then apply multipliers:</div>
              <div>• Thread scaling (diminishing returns after 8 threads)</div>
              <div>• Clock speed scaling</div>
              <div>• SIMD: AVX2 (1.5×), AVX-512 (2×), AMX (3×)</div>
              <div>• L3 cache bonus</div>
            </div>
            <p>
              Intel's AMX (Advanced Matrix Extensions) provides significant acceleration for matrix operations,
              making newer Intel CPUs notably faster for LLM inference.
            </p>
          </section>

          {/* Scoring */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Final Score Calculation</h2>
            <p className="mb-3">
              Each model's final score combines three factors with weights that vary by use case:
            </p>
            <div className="bg-gray-800 rounded-lg p-4 space-y-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-white">Benchmark Score</span>
                <span className="text-gray-400">Based on relevant benchmarks (IFEval, MATH, HumanEval, etc.)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white">Quality Score</span>
                <span className="text-gray-400">Based on quantization level (Q8 &gt; Q4 &gt; Q2)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white">Speed Score</span>
                <span className="text-gray-400">Logarithmic scale: 60+ tok/s = 100, 1 tok/s = 5</span>
              </div>
            </div>

            <h4 className="text-white font-medium mb-2">Weights by Use Case</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 text-gray-400">Use Case</th>
                    <th className="text-center py-2 text-gray-400">Benchmark</th>
                    <th className="text-center py-2 text-gray-400">Quality</th>
                    <th className="text-center py-2 text-gray-400">Speed</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-gray-800">
                    <td className="py-2">Chat</td>
                    <td className="text-center">50%</td>
                    <td className="text-center">25%</td>
                    <td className="text-center">25%</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="py-2">Coding</td>
                    <td className="text-center">60%</td>
                    <td className="text-center">25%</td>
                    <td className="text-center">15%</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="py-2">Reasoning</td>
                    <td className="text-center">70%</td>
                    <td className="text-center">20%</td>
                    <td className="text-center">10%</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="py-2">Creative</td>
                    <td className="text-center">40%</td>
                    <td className="text-center">35%</td>
                    <td className="text-center">25%</td>
                  </tr>
                  <tr>
                    <td className="py-2">Vision</td>
                    <td className="text-center">55%</td>
                    <td className="text-center">25%</td>
                    <td className="text-center">20%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Data Sources */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Data Sources</h2>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <span className="text-blue-400">•</span>
                <span>
                  <strong className="text-white">Model benchmarks:</strong>{' '}
                  <a href="https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard"
                     target="_blank" rel="noopener noreferrer"
                     className="text-blue-400 hover:text-blue-300">
                    Open LLM Leaderboard
                  </a> on HuggingFace
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400">•</span>
                <span>
                  <strong className="text-white">GPU specifications:</strong> Official NVIDIA, AMD, Apple, Intel spec sheets
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400">•</span>
                <span>
                  <strong className="text-white">VRAM calculations:</strong> Based on{' '}
                  <a href="https://github.com/ggerganov/llama.cpp"
                     target="_blank" rel="noopener noreferrer"
                     className="text-blue-400 hover:text-blue-300">
                    llama.cpp
                  </a> memory estimation formulas
                </span>
              </li>
            </ul>
          </section>

          {/* Limitations */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Limitations</h2>
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
              <ul className="space-y-2 text-sm">
                <li>• KV cache formula is simplified; actual size depends on model architecture (GQA, MQA)</li>
                <li>• We assume uniform layer sizes; real models may vary</li>
                <li>• The 10% VRAM headroom is conservative; some systems can use more</li>
                <li>• CPU inference estimates are optimistic for modern CPUs with good SIMD</li>
                <li>• Real performance varies by inference engine (llama.cpp vs vLLM vs Ollama)</li>
              </ul>
            </div>
          </section>

          {/* Full Documentation */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Full Documentation</h2>
            <p>
              For complete implementation details, see the{' '}
              <a href="https://github.com/localllm-advisor/localllm-advisor/blob/main/docs/calcoli.md"
                 target="_blank" rel="noopener noreferrer"
                 className="text-blue-400 hover:text-blue-300">
                full calculation documentation
              </a>{' '}
              in our GitHub repository.
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
