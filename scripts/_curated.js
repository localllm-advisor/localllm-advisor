/**
 * CommonJS mirror of src/lib/curated.ts for build-time scripts (sitemap,
 * og-images, api-json). Reads the same src/data/curated.json + dataset files
 * the TypeScript pages read at build time, validates every reference, and
 * exposes the same superset/eligibility helpers.
 *
 * Keep this file in sync with src/lib/curated.ts. The schema check below is
 * the only protection against drift, so don't disable it.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const curated = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/curated.json'), 'utf-8'));
const gpus    = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/gpus.json'),   'utf-8'));
const models  = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/models.json'), 'utf-8'));

function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-\.]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function validate() {
  const gpuNames = new Set(gpus.map((g) => g.name));
  const modelIds = new Set(models.map((m) => m.id));
  const missing = [];

  for (const n of curated.popularGpuNames)         if (!gpuNames.has(n)) missing.push(`popularGpuNames: ${n}`);
  for (const n of curated.compareEligibleGpuNames) if (!gpuNames.has(n)) missing.push(`compareEligibleGpuNames: ${n}`);
  for (const t of Object.keys(curated.tierGpuExamples)) {
    const v = curated.tierGpuExamples[t];
    if (!gpuNames.has(v)) missing.push(`tierGpuExamples.${t}: ${v}`);
  }
  for (const [a, b] of curated.featuredComparePairs) {
    if (!gpuNames.has(a)) missing.push(`featuredComparePairs[].a: ${a}`);
    if (!gpuNames.has(b)) missing.push(`featuredComparePairs[].b: ${b}`);
  }
  for (const id of curated.popularModelIds)  if (!modelIds.has(id)) missing.push(`popularModelIds: ${id}`);
  for (const id of curated.tierListAllowIds) if (!modelIds.has(id)) missing.push(`tierListAllowIds: ${id}`);

  if (missing.length) {
    console.error('\n❌ curated.json references entries that are not in the dataset:');
    missing.forEach((m) => console.error(`   • ${m}`));
    console.error('Either add them to public/data/{gpus,models}.json or remove them from src/data/curated.json.\n');
    process.exit(1);
  }
}
validate();

const popularGpus            = gpus  .filter((g) => curated.popularGpuNames.includes(g.name));
const popularModels          = models.filter((m) => curated.popularModelIds.includes(m.id));
const tierEligibleModels     = models.filter((m) => curated.tierListAllowIds.includes(m.id));
const compareEligibleGpus    = gpus  .filter((g) => curated.compareEligibleGpuNames.includes(g.name));

// Same superset rule as src/lib/curated.ts → getSeoStaticParamsSuperset()
function getSeoStaticParamsSuperset() {
  const gpuNameSet = new Set([
    ...curated.popularGpuNames,
    ...Object.values(curated.tierGpuExamples),
    ...curated.compareEligibleGpuNames,
  ]);
  const modelIdSet = new Set([
    ...curated.popularModelIds,
    ...curated.tierListAllowIds,
  ]);
  const gset = gpus  .filter((g) => gpuNameSet.has(g.name));
  const mset = models.filter((m) => modelIdSet.has(m.id));
  const out = [];
  for (const g of gset) for (const m of mset) {
    out.push({ gpu: g, model: m, gpuSlug: toSlug(g.name), modelSlug: toSlug(m.name) });
  }
  return out;
}

function getCompareStaticParams() {
  const out = [];
  for (let i = 0; i < compareEligibleGpus.length; i++) {
    for (let j = i + 1; j < compareEligibleGpus.length; j++) {
      out.push({ a: toSlug(compareEligibleGpus[i].name), b: toSlug(compareEligibleGpus[j].name) });
      out.push({ a: toSlug(compareEligibleGpus[j].name), b: toSlug(compareEligibleGpus[i].name) });
    }
  }
  return out;
}

module.exports = {
  curated,
  gpus,
  models,
  popularGpus,
  popularModels,
  tierEligibleModels,
  compareEligibleGpus,
  toSlug,
  getSeoStaticParamsSuperset,
  getCompareStaticParams,
};
