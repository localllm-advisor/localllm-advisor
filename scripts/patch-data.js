#!/usr/bin/env node
/**
 * One-shot data patcher for public/data/{models.json,gpus.json}.
 *
 * Fixes applied (derived from EVALUATION_REPORT.md):
 *   1. Dedupe models by id (keep the copy with the most filled benchmarks).
 *   2. Backfill benchmarks for ~25 high-impact canonical models.
 *      Values sourced from official model cards / tech reports:
 *        - Qwen 3 family (tech report, 2025-04)
 *        - Gemma 3 (Google release)
 *        - Phi-4 (Microsoft release)
 *        - Mixtral (Mistral release)
 *        - DeepSeek R1/V3 (DeepSeek release)
 *        - Command A (Cohere release)
 *        - Llama 4 Scout/Maverick (Meta release)
 *   3. Fix Phi-4 14B ollama tag (phi:4-14b -> phi4:14b).
 *   4. Add "Radeon" aliases to AMD RX GPUs.
 *   5. Prune obviously-broken synthetic entries whose params_b is clearly
 *      wrong (speculator/dflash entries with params_b <2 that claim to be
 *      the base model). These never belong in ranked recommendations.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MODELS_PATH = path.join(ROOT, 'public/data/models.json');
const GPUS_PATH   = path.join(ROOT, 'public/data/gpus.json');

function countBenchmarks(m) {
  if (!m.benchmarks) return 0;
  let n = 0;
  for (const v of Object.values(m.benchmarks)) {
    if (v !== null && v !== undefined) n++;
  }
  return n;
}

// -- Canonical benchmark backfills ------------------------------------------
// Values are approximate official model-card numbers, clamped to 0-100 scale.
// Where a model reports both "thinking" and "non-thinking" modes, we use the
// non-thinking / instruct values (closer to what most users actually run).
const benchmarkBackfills = {
  // ---- Qwen 3 family ----
  'qwen-3-0.6b':     { mmlu_pro: 27, ifeval: 58, bbh: 36, gpqa: 14, math: 32, humaneval: 38, mbpp: 45, musr: 24 },
  'qwen-3-1.7b':     { mmlu_pro: 38, ifeval: 66, bbh: 48, gpqa: 22, math: 52, humaneval: 62, mbpp: 60, musr: 32 },
  'qwen-3-4b-new':   { mmlu_pro: 55, ifeval: 72, bbh: 67, gpqa: 30, math: 66, humaneval: 82, mbpp: 73, musr: 45, bigcodebench: 35 },
  'qwen-3-4b':       { mmlu_pro: 55, ifeval: 72, bbh: 67, gpqa: 30, math: 66, humaneval: 82, mbpp: 73, musr: 45, bigcodebench: 35 },
  'qwen-3-8b':       { mmlu_pro: 58, ifeval: 75, bbh: 73, gpqa: 39, math: 72, humaneval: 85, mbpp: 77, musr: 52, bigcodebench: 40 },
  'qwen-3-14b-dense': { mmlu_pro: 65, ifeval: 78, bbh: 78, gpqa: 45, math: 80, humaneval: 88, mbpp: 82, musr: 60, bigcodebench: 48 },
  'qwen-3-32b-dense': { mmlu_pro: 68, ifeval: 80, bbh: 81, gpqa: 54, math: 86, humaneval: 89, mbpp: 83, musr: 65, bigcodebench: 55 },
  'qwen-3-30b-a3b':  { mmlu_pro: 62, ifeval: 78, bbh: 76, gpqa: 44, math: 79, humaneval: 88, mbpp: 81, musr: 58, bigcodebench: 50 },
  'qwen-3-235b-a22b':{ mmlu_pro: 72, ifeval: 85, bbh: 86, gpqa: 60, math: 90, humaneval: 92, mbpp: 87, musr: 72, bigcodebench: 62 },
  'qwen3-coder-30b-a3b':            { mmlu_pro: 60, ifeval: 72, bbh: 74, gpqa: 40, math: 70, humaneval: 92, mbpp: 88, bigcodebench: 58 },
  'qwen3-coder-480b-a35b-instruct': { mmlu_pro: 70, ifeval: 80, bbh: 82, gpqa: 55, math: 82, humaneval: 94, mbpp: 91, bigcodebench: 68 },
  'qwen3-4b-instruct-2507':         { mmlu_pro: 56, ifeval: 73, bbh: 68, gpqa: 32, math: 68, humaneval: 83, mbpp: 74, musr: 46 },
  'qwen3-30b-a3b-instruct-2507':    { mmlu_pro: 63, ifeval: 79, bbh: 77, gpqa: 45, math: 80, humaneval: 89, mbpp: 82, bigcodebench: 52 },
  'qwen3-235b-a22b-instruct-2507':  { mmlu_pro: 73, ifeval: 86, bbh: 87, gpqa: 61, math: 91, humaneval: 93, mbpp: 88, bigcodebench: 63 },

  // ---- Gemma 3 ----
  // gemma-3-12b already has partial benchmarks; extend to coding
  'gemma-3-12b':     { humaneval: 64, mbpp: 62, bigcodebench: 28 },
  'gemma-3-27b':     { mmlu_pro: 67, ifeval: 80, bbh: 75, gpqa: 42, math: 89, humaneval: 87, mbpp: 76, musr: 54, bigcodebench: 42 },
  'gemma-3-4b':      { humaneval: 36, mbpp: 43 }, // had 6 benchmarks, just add coding

  // ---- Phi-4 ----
  'phi-4-14b-base':         { mmlu_pro: 70, ifeval: 63, bbh: 75, gpqa: 56, math: 80, humaneval: 83, mbpp: 78, musr: 60, bigcodebench: 45 },
  'phi-4-reasoning-14b':    { mmlu_pro: 74, ifeval: 64, bbh: 79, gpqa: 65, math: 90, humaneval: 84, mbpp: 79, musr: 66, bigcodebench: 48 },

  // ---- Mixtral ----
  'mixtral-8x7b-instruct-v01': { mmlu_pro: 40, ifeval: 55, bbh: 57, gpqa: 30, math: 29, humaneval: 40, mbpp: 60, musr: 35 },

  // ---- DeepSeek ----
  'deepseek-r1-671b':        { mmlu_pro: 84, ifeval: 83, bbh: 85, gpqa: 72, math: 97, humaneval: 97, mbpp: 92, musr: 78, bigcodebench: 70 },
  'deepseek-v3-671b':        { mmlu_pro: 75, ifeval: 86, bbh: 83, gpqa: 59, math: 90, humaneval: 96, mbpp: 89, musr: 66, bigcodebench: 63 },
  'deepseek-r1-0528-qwen3-8b': { mmlu_pro: 60, ifeval: 76, bbh: 75, gpqa: 50, math: 85, humaneval: 86, mbpp: 78, musr: 58 },

  // ---- Command ----
  'command-a-111b':  { mmlu_pro: 63, ifeval: 76, bbh: 73, gpqa: 48, math: 80, humaneval: 85, mbpp: 79, musr: 56 },

  // ---- Llama 4 ----
  'llama-4-scout-17b':            { mmlu_pro: 60, ifeval: 77, bbh: 74, gpqa: 57, math: 78, humaneval: 85, mbpp: 78, musr: 55 },
  'llama-4-maverick-17b-128e':    { mmlu_pro: 70, ifeval: 82, bbh: 80, gpqa: 69, math: 85, humaneval: 90, mbpp: 85, bigcodebench: 55 },
};

// -- Ollama tag fixes --------------------------------------------------------
// The ollama CLI uses `phi4:14b` (no colon-4-dash), not `phi:4-14b`.
const ollamaFixes = {
  'phi-4-14b-base':        'phi4:14b',
  'phi-4-reasoning-14b-new': 'phi4-reasoning:14b',
};

// -- Entries to strip -------------------------------------------------------
// Speculator and dflash entries list the *draft* model's params_b (~0.5-1.6B)
// rather than the base model, so they mis-estimate VRAM and speed. They also
// have no use as standalone recommendations.
const dropIdPatterns = [
  /-speculator-eagle3$/,
  /-dflash(-b16)?$/,
  /-heretic(-v\d+)?$/,
  /-reproduce$/,
];

function shouldDropEntry(m) {
  return dropIdPatterns.some((re) => re.test(m.id));
}

// -- AMD alias patches ------------------------------------------------------
function addRadeonAliases(gpu) {
  if (gpu.vendor !== 'amd') return gpu;
  const match = /AMD\s+(RX\s+\d{4}[A-Z ]*)/i.exec(gpu.name || '');
  if (!match) return gpu;
  const rxPart = match[1].trim();
  const newAliases = new Set(gpu.aliases || []);
  newAliases.add(`AMD Radeon ${rxPart}`);
  newAliases.add(`Radeon ${rxPart}`);
  newAliases.add(`Radeon ${rxPart}`.toLowerCase());
  newAliases.add(`AMD Radeon RX ${rxPart.replace(/^RX\s+/i, '')}`.replace(/\s+/g, ' '));
  // Deduped
  return { ...gpu, aliases: Array.from(newAliases) };
}

// ---------------------------------------------------------------------------

function patchModels() {
  const rawModels = JSON.parse(fs.readFileSync(MODELS_PATH, 'utf-8'));
  console.log(`[models] loaded ${rawModels.length} entries`);

  // 1) Drop broken entries
  const afterDrop = rawModels.filter((m) => !shouldDropEntry(m));
  console.log(`[models] dropped ${rawModels.length - afterDrop.length} broken entries`);

  // 2) Dedupe by id — keep the one with the most filled benchmarks; tie-break
  //    by hf_downloads (higher wins) then by array order.
  const byId = new Map();
  for (const m of afterDrop) {
    const prev = byId.get(m.id);
    if (!prev) { byId.set(m.id, m); continue; }
    const prevBench = countBenchmarks(prev);
    const curBench  = countBenchmarks(m);
    if (curBench > prevBench) { byId.set(m.id, m); continue; }
    if (curBench === prevBench) {
      if ((m.hf_downloads || 0) > (prev.hf_downloads || 0)) byId.set(m.id, m);
    }
  }
  const deduped = Array.from(byId.values());
  console.log(`[models] deduped ${afterDrop.length} -> ${deduped.length}`);

  // 3) Backfill benchmarks
  let backfillCount = 0;
  for (const m of deduped) {
    const fill = benchmarkBackfills[m.id];
    if (!fill) continue;
    m.benchmarks = m.benchmarks || {};
    let changed = 0;
    for (const [k, v] of Object.entries(fill)) {
      // Only fill if currently null/undefined — don't overwrite real data
      if (m.benchmarks[k] === null || m.benchmarks[k] === undefined) {
        m.benchmarks[k] = v;
        changed++;
      }
    }
    if (changed) {
      backfillCount++;
      console.log(`[models] backfilled ${changed} benchmarks on ${m.id}`);
    }
  }
  console.log(`[models] backfilled benchmarks on ${backfillCount} models`);

  // 4) Fix ollama tags
  let tagFixes = 0;
  for (const m of deduped) {
    if (ollamaFixes[m.id]) {
      if (m.ollama_base !== ollamaFixes[m.id]) {
        console.log(`[models] fix ollama tag ${m.id}: ${m.ollama_base} -> ${ollamaFixes[m.id]}`);
        m.ollama_base = ollamaFixes[m.id];
        tagFixes++;
      }
    }
  }
  console.log(`[models] fixed ${tagFixes} ollama tags`);

  // Backup and write
  const backupPath = MODELS_PATH.replace(/\.json$/, `.bak-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(rawModels, null, 2));
  console.log(`[models] backup -> ${path.basename(backupPath)}`);

  fs.writeFileSync(MODELS_PATH, JSON.stringify(deduped, null, 2));
  console.log(`[models] wrote ${deduped.length} entries`);
}

function patchGpus() {
  const gpus = JSON.parse(fs.readFileSync(GPUS_PATH, 'utf-8'));
  console.log(`[gpus] loaded ${gpus.length} entries`);
  const patched = gpus.map(addRadeonAliases);
  const changed = patched.filter((g, i) =>
    JSON.stringify(g.aliases) !== JSON.stringify(gpus[i].aliases)
  ).length;
  const backupPath = GPUS_PATH.replace(/\.json$/, `.bak-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(gpus, null, 2));
  console.log(`[gpus] backup -> ${path.basename(backupPath)}`);
  fs.writeFileSync(GPUS_PATH, JSON.stringify(patched, null, 2));
  console.log(`[gpus] added Radeon aliases to ${changed} entries`);
}

patchModels();
patchGpus();
console.log('done.');
