'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';
import Reveal from '@/components/Reveal';
import { useTheme } from '@/components/ThemeProvider';
import { getCloudProviderUrl } from '@/lib/affiliateLinks';

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                    */
/* ------------------------------------------------------------------ */
function Section({
  number,
  title,
  children,
  isDark,
  delay = 0,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
  isDark: boolean;
  delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <section
        className={`rounded-2xl border p-6 sm:p-8 ${
          isDark
            ? 'border-gray-700 bg-gray-800/40'
            : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex items-start gap-4 mb-5">
          <span
            className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm ${
              isDark ? 'bg-cyan-600 text-white' : 'bg-cyan-100 text-cyan-800'
            }`}
          >
            {number}
          </span>
          <h2
            className={`text-xl sm:text-2xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {title}
          </h2>
        </div>
        <div
          className={`space-y-4 text-[15px] leading-relaxed ${
            isDark ? 'text-gray-300' : 'text-gray-600'
          }`}
        >
          {children}
        </div>
      </section>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline badge                                                       */
/* ------------------------------------------------------------------ */
function Badge({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        isDark
          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
          : 'bg-cyan-100 text-cyan-700 border border-cyan-200'
      }`}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Code block                                                         */
/* ------------------------------------------------------------------ */
function Code({ children, isDark }: { children: string; isDark: boolean }) {
  return (
    <pre
      className={`rounded-xl px-5 py-4 text-sm overflow-x-auto font-mono ${
        isDark ? 'bg-gray-900 text-gray-200' : 'bg-gray-100 text-gray-800'
      }`}
    >
      {children}
    </pre>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function GuidePage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const strong = isDark ? 'text-white font-semibold' : 'text-gray-900 font-semibold';
  const link = isDark
    ? 'text-cyan-400 hover:text-cyan-300 underline underline-offset-2'
    : 'text-cyan-600 hover:text-cyan-500 underline underline-offset-2';

  return (
    <div
      className={`min-h-screen flex flex-col ${
        isDark ? 'bg-cyan-950/40' : 'bg-cyan-50/70'
      }`}
    >
      <Navbar />
      <BackButton />

      <PageHero
        title="Run Your First LLM Locally"
        subtitle="A no-jargon, step-by-step guide for total beginners — from zero to a chatbot running on your own PC."
        accent="blue"
      />

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-10 space-y-8">
        {/* -------------------------------------------------------- */}
        {/* SECTION 1 — WHY LOCAL                                     */}
        {/* -------------------------------------------------------- */}
        <Section number="1" title="Why Run AI Locally?" isDark={isDark} delay={0}>
          <p>
            Cloud AI services like ChatGPT and Claude are powerful, but they come with trade-offs.
            Running a Large Language Model (LLM) on <em>your own machine</em> gives you advantages
            that no cloud service can match:
          </p>
          <ul className="space-y-2 pl-1">
            <li className="flex gap-2">
              <span className="text-cyan-500 mt-0.5">&#x2022;</span>
              <span><span className={strong}>Total privacy</span> — your prompts and data never leave your device. Perfect for medical notes, legal docs, company secrets, or anything you don&apos;t want on someone else&apos;s server.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-500 mt-0.5">&#x2022;</span>
              <span><span className={strong}>Zero recurring cost</span> — once you download a model, you can use it forever with no API fees and no subscriptions.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-500 mt-0.5">&#x2022;</span>
              <span><span className={strong}>Works offline</span> — no Wi-Fi, no problem. Great for travel, air-gapped environments, or spotty connections.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-500 mt-0.5">&#x2022;</span>
              <span><span className={strong}>No rate limits</span> — send as many messages as you like, as fast as your hardware allows.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-500 mt-0.5">&#x2022;</span>
              <span><span className={strong}>Full customizability</span> — fine-tune models, swap system prompts, chain tools together — you&apos;re in control.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-500 mt-0.5">&#x2022;</span>
              <span><span className={strong}>Ethical by design</span> — your conversations never train corporate models, build behavioral profiles, or feed advertising systems. You get capable AI without trading your data for it.</span>
            </li>
          </ul>
          <p>
            The catch? You need decent hardware (especially a GPU with enough VRAM) and the models are not quite as powerful as the very best cloud offerings — yet. For most everyday tasks, though, today&apos;s open-source models are excellent.
          </p>
        </Section>

        {/* -------------------------------------------------------- */}
        {/* SECTION 2 — WHAT YOU NEED                                 */}
        {/* -------------------------------------------------------- */}
        <Section number="2" title="What You Need" isDark={isDark} delay={100}>
          <p>Here&apos;s a quick checklist before you start:</p>

          <div className={`rounded-xl p-5 ${isDark ? 'bg-gray-900/60' : 'bg-gray-50'}`}>
            <p className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Hardware</p>
            <ul className="space-y-2 pl-1">
              <li className="flex gap-2">
                <span className="text-cyan-500 mt-0.5">&#x2022;</span>
                <span><span className={strong}>GPU with 8 GB+ VRAM</span> — NVIDIA (RTX 3060 12 GB or above), AMD (RX 7600 XT+), or <span className={strong}>Apple Silicon</span> Mac (M1/M2/M3/M4 — unified memory counts as VRAM).</span>
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-500 mt-0.5">&#x2022;</span>
                <span><span className={strong}>16 GB RAM minimum</span> (32 GB recommended for larger models).</span>
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-500 mt-0.5">&#x2022;</span>
                <span><span className={strong}>~20 GB free disk space</span> for the runtime + one or two models.</span>
              </li>
            </ul>
            <p className={`text-xs mt-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              No GPU? You can still run small models on CPU — it&apos;ll be slower (1–10 tok/s instead of 30–100+), but it works.
            </p>
          </div>

          <div className={`rounded-xl p-5 ${isDark ? 'bg-gray-900/60' : 'bg-gray-50'}`}>
            <p className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Software</p>
            <ul className="space-y-2 pl-1">
              <li className="flex gap-2">
                <span className="text-cyan-500 mt-0.5">&#x2022;</span>
                <span><span className={strong}>Ollama</span> — the easiest way to download and run LLMs. One install, one command. Free and open-source. Works on Windows, Mac, and Linux.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-500 mt-0.5">&#x2022;</span>
                <span><span className={strong}>A chat UI (optional)</span> — Ollama runs in a terminal, but you can connect a friendly UI like <span className={strong}>Open WebUI</span> or <span className={strong}>Jan</span> for a ChatGPT-like experience.</span>
              </li>
            </ul>
          </div>
        </Section>

        {/* -------------------------------------------------------- */}
        {/* SECTION 3 — FIND THE BEST MODEL                           */}
        {/* -------------------------------------------------------- */}
        <Section number="3" title="Find the Best Model for Your Hardware" isDark={isDark} delay={200}>
          <p>
            Not every model runs well on every GPU. A 70-billion-parameter model will crawl on an 8 GB card, while a tiny model on a beefy GPU wastes potential. That&apos;s where <span className={strong}>LocalLLM Advisor</span> comes in.
          </p>

          <div
            className={`rounded-xl border-2 p-5 ${
              isDark
                ? 'border-cyan-500/30 bg-cyan-950/20'
                : 'border-cyan-200 bg-cyan-50/60'
            }`}
          >
            <p className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              How to use our &ldquo;Find a Model&rdquo; tool
            </p>
            <ol className="space-y-2 pl-1">
              <li className="flex gap-2">
                <span className={strong}>1.</span>
                <span>Go to <Link href="/search/model" className={link}>Find a Model</Link>.</span>
              </li>
              <li className="flex gap-2">
                <span className={strong}>2.</span>
                <span>Select your GPU (or enter specs manually).</span>
              </li>
              <li className="flex gap-2">
                <span className={strong}>3.</span>
                <span>Pick a use-case — chat, coding, creative writing, etc.</span>
              </li>
              <li className="flex gap-2">
                <span className={strong}>4.</span>
                <span>Click <em>&ldquo;Find Models&rdquo;</em>. You&apos;ll instantly see a ranked list of models with estimated speed, quality scores, and VRAM usage.</span>
              </li>
            </ol>
            <p className="mt-3">
              Write down the <span className={strong}>model name</span> (e.g. <code className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-gray-800 text-cyan-300' : 'bg-gray-200 text-cyan-700'}`}>llama3.1:8b-q4_K_M</code>) — you&apos;ll need it in the next step.
            </p>
          </div>

          <p>
            <Badge isDark={isDark}>Tip</Badge>{' '}
            Don&apos;t know your GPU? On <span className={strong}>Windows</span>, open Task Manager → Performance → GPU. On <span className={strong}>Mac</span>, click Apple menu → About This Mac — look for the chip name (e.g. &ldquo;Apple M2 Pro 16 GB&rdquo;).
          </p>
        </Section>

        {/* -------------------------------------------------------- */}
        {/* SECTION 4 — DOWNLOAD & INSTALL                            */}
        {/* -------------------------------------------------------- */}
        <Section number="4" title="Download &amp; Install Ollama" isDark={isDark} delay={300}>
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Windows */}
            <div className={`rounded-xl p-5 ${isDark ? 'bg-gray-900/60' : 'bg-gray-50'}`}>
              <p className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8.5v8.5H3V3zm9.5 0H21v8.5h-8.5V3zM3 12.5h8.5V21H3v-8.5zm9.5 0H21V21h-8.5v-8.5z"/></svg>
                Windows
              </p>
              <ol className="space-y-1.5 text-sm">
                <li>1. Go to <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer" className={link}>ollama.com/download</a></li>
                <li>2. Download the Windows installer</li>
                <li>3. Run the <code>.exe</code> — follow the wizard</li>
                <li>4. Open <span className={strong}>Command Prompt</span> or <span className={strong}>PowerShell</span></li>
              </ol>
            </div>

            {/* Mac */}
            <div className={`rounded-xl p-5 ${isDark ? 'bg-gray-900/60' : 'bg-gray-50'}`}>
              <p className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                macOS
              </p>
              <ol className="space-y-1.5 text-sm">
                <li>1. Go to <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer" className={link}>ollama.com/download</a></li>
                <li>2. Download the macOS app</li>
                <li>3. Drag to Applications, open it</li>
                <li>4. Open <span className={strong}>Terminal</span> (Cmd + Space → &ldquo;Terminal&rdquo;)</li>
              </ol>
            </div>
          </div>

          <p>
            Verify the install by typing:
          </p>
          <Code isDark={isDark}>ollama --version</Code>
          <p>
            If you see a version number, you&apos;re good to go.
          </p>
        </Section>

        {/* -------------------------------------------------------- */}
        {/* SECTION 5 — RUN IT                                        */}
        {/* -------------------------------------------------------- */}
        <Section number="5" title="Run Your First Model" isDark={isDark} delay={400}>
          <p>
            With Ollama installed, running a model is a single command. Using the model name you found in Step 3:
          </p>
          <Code isDark={isDark}>{`ollama run llama3.1:8b`}</Code>
          <p>
            The first time you run this, Ollama will download the model (this may take a few minutes depending on your internet speed — models range from 4 GB to 40+ GB). After that, you&apos;ll see a prompt where you can start chatting directly in your terminal.
          </p>
          <p>
            <Badge isDark={isDark}>Try it</Badge>{' '}
            Type something like <em>&ldquo;Explain quantum computing in simple terms&rdquo;</em> and watch the response stream in.
          </p>

          <div className={`rounded-xl p-5 mt-2 ${isDark ? 'bg-gray-900/60' : 'bg-gray-50'}`}>
            <p className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Useful commands</p>
            <ul className="space-y-1.5 text-sm font-mono">
              <li><code>ollama list</code> <span className="font-sans">— see all downloaded models</span></li>
              <li><code>ollama pull mistral</code> <span className="font-sans">— download a model without running it</span></li>
              <li><code>ollama rm llama3.1:8b</code> <span className="font-sans">— delete a model to free disk space</span></li>
              <li><code>ollama serve</code> <span className="font-sans">— start the API server (port 11434) for external UIs</span></li>
            </ul>
          </div>

          <div className={`rounded-xl p-5 ${isDark ? 'bg-gray-900/60' : 'bg-gray-50'}`}>
            <p className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Want a nicer chat interface?</p>
            <p className="text-sm">
              Ollama exposes an API on <code className={`px-1 py-0.5 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>localhost:11434</code>. Connect a web UI for a ChatGPT-like experience:
            </p>
            <ul className="space-y-1.5 text-sm mt-2 pl-1">
              <li className="flex gap-2">
                <span className="text-cyan-500">&#x2022;</span>
                <span><a href="https://github.com/open-webui/open-webui" target="_blank" rel="noopener noreferrer" className={link}>Open WebUI</a> — full-featured, runs via Docker</span>
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-500">&#x2022;</span>
                <span><a href="https://jan.ai" target="_blank" rel="noopener noreferrer" className={link}>Jan</a> — desktop app, great for beginners, no Docker needed</span>
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-500">&#x2022;</span>
                <span><a href="https://lmstudio.ai" target="_blank" rel="noopener noreferrer" className={link}>LM Studio</a> — GUI with built-in model browser</span>
              </li>
            </ul>
          </div>
        </Section>

        {/* -------------------------------------------------------- */}
        {/* SECTION 6 — CLOUD ALTERNATIVES                            */}
        {/* -------------------------------------------------------- */}
        <Section number="6" title="Cloud Alternatives (When Local Isn&apos;t Enough)" isDark={isDark} delay={500}>
          <p>
            Sometimes you need a bigger model than your hardware can handle, or you need massive throughput for a production workload. In that case, cloud GPU providers let you rent powerful machines by the hour:
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { name: 'RunPod', desc: 'On-demand GPU pods, starting ~$0.20/hr', url: getCloudProviderUrl('runpod') },
              { name: 'Vast.ai', desc: 'GPU marketplace, cheap spot instances', url: getCloudProviderUrl('vast.ai') },
              { name: 'Lambda', desc: 'A100/H100 instances for serious workloads', url: 'https://lambdalabs.com' },
              { name: 'AWS / GCP / Azure', desc: 'Enterprise-grade, pay-per-second GPU VMs', url: '#' },
            ].map((p) => (
              <div
                key={p.name}
                className={`rounded-xl p-4 text-sm ${
                  isDark ? 'bg-gray-900/60' : 'bg-gray-50'
                }`}
              >
                <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{p.name}</p>
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{p.desc}</p>
                {p.url !== '#' && (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className={`${link} text-xs mt-1 inline-block`}>
                    Visit site &rarr;
                  </a>
                )}
              </div>
            ))}
          </div>

          <p>
            These are great for experimenting with 70B+ models or running inference at scale. But for everyday personal use, a local setup beats them on privacy, cost, and convenience.
          </p>
        </Section>

        {/* -------------------------------------------------------- */}
        {/* CTA                                                        */}
        {/* -------------------------------------------------------- */}
        <Reveal delay={600}>
          <div className="text-center pt-4 pb-8">
            <p className={`text-lg mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Ready to find the perfect model for your hardware?
            </p>
            <Link
              href="/search/model"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-600/20 hover:shadow-xl hover:shadow-cyan-500/30 hover:-translate-y-0.5 transition-all duration-300"
            >
              Find Your Model
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </Reveal>
      </main>

      <SiteFooter />
    </div>
  );
}
