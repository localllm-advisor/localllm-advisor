#!/usr/bin/env node
/**
 * update-curated-models.js
 *
 * Keeps src/data/curated.json#popularModelIds and #tierListAllowIds fresh
 * without requiring manual editing every time a new model family lands.
 *
 * Strategy
 * --------
 * Score each model in models.json by a composite signal:
 *   score = log10(hf_downloads + 1)        // popularity
 *         + quality_score / 10             // benchmark quality (if present)
 *         - size_penalty                   // deprioritise models that won't
 *                                          //   fit on any popular GPU
 *
 * Then keep the top POPULAR_N models for popularModelIds and top TIER_N for
 * tierListAllowIds, applying hard filters (must have quantizations, must be
 * a chat/coding/reasoning model, not tiny junk models).
 *
 * IDs that are already in the curated lists are ALWAYS kept (they were
 * editorially chosen for quality reasons beyond download counts).  New
 * candidates are added up to the target size.
 *
 * Usage
 * -----
 *   node scripts/update-curated-models.js [--dry-run]
 *
 * Add this to a GitHub Actions workflow (e.g. triggered after sync_models_from_hf)
 * to keep the list automatically fresh.
 */

const fs   = require('fs');
const path = require('path');

const ROOT        = path.resolve(__dirname, '..');
const MODELS_PATH = path.join(ROOT, 'public/data/models.json');
const CURATED_PATH= path.join(ROOT, 'src/data/curated.json');

const DRY_RUN     = process.argv.includes('--dry-run');
const POPULAR_N   = 50;   // max size of popularModelIds
const TIER_N      = 60;   // max size of tierListAllowIds

// Hard filter: capabilities that qualify a model for recommendation
const VALID_CAPS  = new Set(['chat', 'coding', 'reasoning', 'tool_use']);

// Hard filter: minimum downloads to be considered
const MIN_DOWNLOADS = 50_000;

// Hard filter: minimum parameter size (skip tiny toy models)
const MIN_PARAMS_B  = 0.8;

// Hard filter: must have at least one quantization (i.e. locally runnable)
const MIN_QUANTS = 1;

// ---------------------------------------------------------------------------

function score(m) {
  const dl      = m.hf_downloads   || 0;
  const quality = m.quality_score  || 0;   // 0–100
  const params  = m.params_b       || 1;

  // Download score (log scale so a 10M-download model isn't 1000× a 10k model)
  const dlScore = Math.log10(dl + 1);

  // Quality bonus — add up to 1 point for top-quality models
  const qualityBonus = quality / 100;

  // Size penalty: gently deprioritise models > 70B (hard to run locally)
  const sizePenalty = params > 70 ? Math.log2(params / 70) * 0.3 : 0;

  return dlScore + qualityBonus - sizePenalty;
}

function qualifies(m) {
  if (!m.id)                       return false;
  if (!m.quantizations?.length || m.quantizations.length < MIN_QUANTS) return false;
  if ((m.params_b || 0) < MIN_PARAMS_B) return false;
  if ((m.hf_downloads || 0) < MIN_DOWNLOADS) return false;

  // Must have at least one chat/coding/reasoning capability
  const caps = m.capabilities || [];
  if (!caps.some(c => VALID_CAPS.has(c))) return false;

  return true;
}

// ---------------------------------------------------------------------------

const models  = JSON.parse(fs.readFileSync(MODELS_PATH,  'utf-8'));
const curated = JSON.parse(fs.readFileSync(CURATED_PATH, 'utf-8'));

const eligible = models
  .filter(qualifies)
  .sort((a, b) => score(b) - score(a));

function updateList(currentIds, targetSize) {
  const kept    = new Set(currentIds);              // always keep existing
  const result  = [...currentIds];                  // start with current list

  for (const m of eligible) {
    if (result.length >= targetSize) break;
    if (!kept.has(m.id)) {
      result.push(m.id);
      kept.add(m.id);
    }
  }
  return result;
}

const newPopular = updateList(curated.popularModelIds, POPULAR_N);
const newTier    = updateList(curated.tierListAllowIds, TIER_N);

const addedPopular = newPopular.filter(id => !curated.popularModelIds.includes(id));
const addedTier    = newTier.filter(id => !curated.tierListAllowIds.includes(id));

console.log(`Eligible models: ${eligible.length}`);
console.log(`popularModelIds:  ${curated.popularModelIds.length} → ${newPopular.length}  (+${addedPopular.length} new)`);
console.log(`tierListAllowIds: ${curated.tierListAllowIds.length} → ${newTier.length}  (+${addedTier.length} new)`);

if (addedPopular.length) {
  console.log('\nAdded to popularModelIds:');
  addedPopular.forEach(id => {
    const m = models.find(x => x.id === id);
    console.log(`  ${id}  (${(m?.hf_downloads||0).toLocaleString()} dl, ${m?.params_b}B)`);
  });
}
if (addedTier.length) {
  console.log('\nAdded to tierListAllowIds:');
  addedTier.forEach(id => {
    const m = models.find(x => x.id === id);
    console.log(`  ${id}  (${(m?.hf_downloads||0).toLocaleString()} dl, ${m?.params_b}B)`);
  });
}

if (DRY_RUN) {
  console.log('\n[dry-run] No changes written.');
  process.exit(0);
}

curated.popularModelIds  = newPopular;
curated.tierListAllowIds = newTier;

fs.writeFileSync(CURATED_PATH, JSON.stringify(curated, null, 2) + '\n', 'utf-8');
console.log('\nWrote updated curated.json ✓');
