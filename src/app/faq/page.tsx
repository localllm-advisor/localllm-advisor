'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';
import { useTheme } from '@/components/ThemeProvider';

interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'hardware' | 'models' | 'tool';
}

const FAQ_ITEMS: FAQItem[] = [
  // General
  {
    category: 'general',
    question: 'What is a local LLM?',
    answer: 'A local LLM (Large Language Model) runs entirely on your own computer, without sending data to external servers. This gives you privacy, offline access, and no API costs. Popular tools for running local LLMs include Ollama, llama.cpp, LM Studio, and vLLM.',
  },
  {
    category: 'general',
    question: 'Why run LLMs locally instead of using ChatGPT or Claude?',
    answer: 'Local LLMs offer: 1) Privacy - your data never leaves your machine, 2) No recurring costs - once downloaded, models are free to use, 3) Offline access - works without internet, 4) Customization - you can fine-tune models for your needs, 5) No rate limits - run as many queries as your hardware allows.',
  },
  {
    category: 'general',
    question: 'Are local LLMs as good as GPT-4 or Claude?',
    answer: 'The top open-source models (Llama 3, Qwen 2.5, DeepSeek) are approaching GPT-4 level on many benchmarks, but there\'s still a gap for complex reasoning tasks. For most everyday use cases like coding assistance, writing, and Q&A, modern local models are excellent. The quality depends heavily on model size - a 70B model will outperform a 7B model significantly.',
  },
  {
    category: 'general',
    question: 'What is quantization?',
    answer: 'Quantization reduces model precision to save memory. A model stored in FP16 (16-bit) takes 2 bytes per parameter, while Q4 (4-bit) takes only 0.5 bytes - a 4x reduction. This lets you run larger models on limited hardware. The tradeoff is slightly lower quality: Q8 is nearly lossless, Q4 has minimal quality loss, Q2 shows noticeable degradation.',
  },

  // Hardware
  {
    category: 'hardware',
    question: 'How much VRAM do I need?',
    answer: 'Rule of thumb: VRAM (GB) ≈ Parameters (B) × Bits / 8. For example, a 7B model at Q4 needs about 3.5GB VRAM. For comfortable usage: 8GB VRAM = up to 7B models, 12GB = up to 13B models, 24GB = up to 30B models, 48GB+ = 70B models. You can also offload to system RAM, but this significantly slows inference.',
  },
  {
    category: 'hardware',
    question: 'Why does GPU memory bandwidth matter?',
    answer: 'Token generation is memory-bandwidth bound, not compute-bound. During inference, the entire model must be read from memory for each token generated. Your speed (tokens/sec) ≈ Memory Bandwidth (GB/s) / Model Size (GB). This is why the RTX 3090 and 4090 have similar LLM performance despite the 4090 having much more compute power - their memory bandwidth is comparable.',
  },
  {
    category: 'hardware',
    question: 'Can I run LLMs on AMD GPUs?',
    answer: 'Yes! AMD GPUs work well with llama.cpp (via ROCm or Vulkan) and Ollama. The RX 7900 XTX with 24GB VRAM is a popular choice. Performance is typically 80-90% of equivalent NVIDIA GPUs. The main consideration is software support - some tools have better NVIDIA optimization.',
  },
  {
    category: 'hardware',
    question: 'Can I run LLMs on Apple Silicon?',
    answer: 'Absolutely! Apple Silicon (M1/M2/M3/M4) is excellent for local LLMs. The unified memory architecture means the full system RAM is available as VRAM. An M3 Max with 64GB RAM can run 70B models comfortably. The Metal Performance Shaders provide good acceleration. llama.cpp and Ollama both have native Apple Silicon support.',
  },
  {
    category: 'hardware',
    question: 'Is CPU inference viable?',
    answer: 'CPU inference works but is much slower than GPU - typically 1-15 tokens/second vs 30-100+ on GPU. It can be useful for: 1) Running models that don\'t fit in VRAM, 2) Testing before buying a GPU, 3) Servers with lots of RAM but no GPU. Modern CPUs with AVX-512 or AMX provide significant speedups.',
  },
  {
    category: 'hardware',
    question: 'Should I get multiple GPUs?',
    answer: 'Multiple GPUs help for larger models that don\'t fit in a single GPU\'s VRAM. With NVLink, you get near-linear scaling. Without NVLink (PCIe only), there\'s overhead - expect 70-85% efficiency. For most users, a single high-VRAM GPU is more practical than multiple smaller ones. Multi-GPU is mainly worth it for 70B+ models.',
  },

  // Models
  {
    category: 'models',
    question: 'Which model should I use for coding?',
    answer: 'Top coding models: 1) Qwen 2.5 Coder (32B is excellent, 7B is good for limited VRAM), 2) DeepSeek Coder, 3) CodeLlama. Look for models specifically trained on code. Benchmark: BigCodeBench, HumanEval, MBPP. For complex projects, a larger general model (70B) often outperforms smaller code-specific models.',
  },
  {
    category: 'models',
    question: 'Which model should I use for chat/assistant tasks?',
    answer: 'Best general assistants: 1) Llama 3 (8B or 70B), 2) Qwen 2.5 (various sizes), 3) Mistral/Mixtral. For chat, instruction-following matters most - look for "Instruct" or "Chat" variants. Benchmark: IFEval, AlpacaEval. If you want personality/creativity, look for models fine-tuned for that (many community finetunes on HuggingFace).',
  },
  {
    category: 'models',
    question: 'What are MoE (Mixture of Experts) models?',
    answer: 'MoE models like Mixtral activate only a subset of parameters for each token. A Mixtral 8x7B has 47B total parameters but only uses ~13B per token, giving 70B-like quality with 13B-like speed. The tradeoff: you still need VRAM for all 47B parameters. MoE models are great if you have enough VRAM but want faster inference.',
  },
  {
    category: 'models',
    question: 'What context length do I need?',
    answer: 'Context length is how much text the model can "see" at once. 4K tokens ≈ 3,000 words. For chat: 4-8K is usually enough. For coding: 8-16K helps for larger files. For document analysis: 32K+. Longer context uses more VRAM (KV cache grows linearly). Our tool estimates additional VRAM needed for extended context.',
  },

  // Tool
  {
    category: 'tool',
    question: 'How accurate are the speed estimates?',
    answer: 'Our estimates are based on theoretical calculations (bandwidth / model size). Real-world performance varies by: 1) Inference engine (llama.cpp vs vLLM vs TensorRT), 2) Batch size, 3) Context length, 4) System load. Expect ±20% variance. We err slightly conservative to avoid disappointment.',
  },
  {
    category: 'tool',
    question: 'Where does the benchmark data come from?',
    answer: 'Benchmark scores come from the Open LLM Leaderboard on HuggingFace, which uses standardized evaluation. Benchmarks include: IFEval (instruction following), BBH (reasoning), MATH (math), GPQA (science), HumanEval/MBPP/BigCodeBench (coding). We update data periodically.',
  },
  {
    category: 'tool',
    question: 'Why is my GPU not in the list?',
    answer: 'We maintain a curated list of popular GPUs. If yours is missing, use "Manual Entry" to input your VRAM and bandwidth specs (check your GPU\'s spec sheet). Want to add a GPU? Email us at info@localllm-advisor.com with the specs and we\'ll add it.',
  },
  {
    category: 'tool',
    question: 'Can I contribute to this project?',
    answer: 'Yes! LocalLLM Advisor is glad to accept your contributions. You can: 1) Add GPUs/CPUs to our database, 2) Update model data, 3) Improve calculations, 4) Fix bugs, 5) Suggest features. Email us at info@localllm-advisor.com to get started.',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'general', label: 'General' },
  { id: 'hardware', label: 'Hardware' },
  { id: 'models', label: 'Models' },
  { id: 'tool', label: 'This Tool' },
];

export default function FAQPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([0]));
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const filteredFAQs = selectedCategory === 'all'
    ? FAQ_ITEMS
    : FAQ_ITEMS.filter(item => item.category === selectedCategory);

  const toggleItem = (index: number) => {
    const newSet = new Set(openItems);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setOpenItems(newSet);
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-green-950/40' : 'bg-green-50/70'}`}>
      <Navbar />
      <BackButton />

      <PageHero
        title="Frequently Asked Questions"
        subtitle="Everything you need to know about running LLMs locally."
        accent="green"
      />

      <main className="flex-1 mx-auto max-w-3xl px-4 py-12">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="space-y-3">
          {filteredFAQs.map((item) => {
            const globalIndex = FAQ_ITEMS.indexOf(item);
            const isOpen = openItems.has(globalIndex);
            return (
              <div
                key={globalIndex}
                className={`rounded-xl border ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'} overflow-hidden`}
              >
                <button
                  onClick={() => toggleItem(globalIndex)}
                  className={`w-full flex items-center justify-between px-5 py-4 text-left ${isDark ? 'hover:bg-gray-800/80' : 'hover:bg-gray-50'} transition-colors`}
                >
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'} pr-4`}>{item.question}</span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transform transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <div className={`px-5 pb-4 text-sm leading-relaxed border-t ${isDark ? 'text-gray-300 border-gray-700/50' : 'text-gray-600 border-gray-200'} pt-3`}>
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still have questions */}
        <div className={`mt-12 p-6 rounded-xl border text-center ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>Still have questions?</h3>
          <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Check our methodology page for technical details, or reach out to us by email.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/methodology"
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
            >
              View Methodology
            </Link>
            <a
              href="mailto:info@localllm-advisor.com"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
            >
              Email Us
            </a>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
