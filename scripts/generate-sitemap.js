#!/usr/bin/env node
/**
 * Generate sitemap.xml including all programmatic SEO pages.
 *
 * The set of GPUs/models/pairs used here is pulled from scripts/_curated.js,
 * which mirrors src/lib/curated.ts so the sitemap can never drift away from
 * the actual generateStaticParams output.
 *
 * Run: node scripts/generate-sitemap.js
 */

const fs = require('fs');
const path = require('path');
const {
  popularGpus,
  popularModels,
  toSlug,
  getSeoStaticParamsSuperset,
  getCompareStaticParams,
} = require('./_curated');

const BASE_URL = 'https://localllm-advisor.com';

const staticPages = [
  { path: '',             changefreq: 'weekly',  priority: '1.0' },
  { path: '/search',      changefreq: 'weekly',  priority: '0.9' },
  { path: '/search/model',    changefreq: 'weekly',  priority: '0.9' },
  { path: '/search/hardware', changefreq: 'weekly',  priority: '0.9' },
  { path: '/tier-list',   changefreq: 'weekly',  priority: '0.9' },
  { path: '/compare',     changefreq: 'weekly',  priority: '0.85' },
  { path: '/enterprise',  changefreq: 'monthly', priority: '0.8' },
  { path: '/gpu-prices',  changefreq: 'daily',   priority: '0.7' },
  { path: '/benchmarks',  changefreq: 'daily',   priority: '0.7' },
  { path: '/api',         changefreq: 'monthly', priority: '0.6' },
  { path: '/faq',         changefreq: 'monthly', priority: '0.5' },
  { path: '/methodology', changefreq: 'monthly', priority: '0.5' },
  { path: '/about',       changefreq: 'monthly', priority: '0.5' },
];

// /gpu/<gpuSlug>/<modelSlug> — emit ONE entry per pre-rendered page so the
// sitemap is in lockstep with the static-export build output.
const seoSet = getSeoStaticParamsSuperset();
const seoPages = seoSet.map(({ gpuSlug, modelSlug }) => ({
  path: `/gpu/${gpuSlug}/${modelSlug}`,
  changefreq: 'monthly',
  priority: '0.6',
}));

// /compare/<a>/<b> — same set as the route's generateStaticParams.
const compareParams = getCompareStaticParams();
const comparePages = compareParams.map(({ a, b }) => ({
  path: `/compare/${a}/${b}`,
  changefreq: 'monthly',
  priority: '0.55',
}));

const allPages = [...staticPages, ...seoPages, ...comparePages];

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
for (const page of allPages) {
  xml += '  <url>\n';
  xml += `    <loc>${BASE_URL}${page.path}</loc>\n`;
  xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
  xml += `    <priority>${page.priority}</priority>\n`;
  xml += '  </url>\n';
}
xml += '</urlset>\n';

const outputPath = path.join(__dirname, '../public/sitemap.xml');
fs.writeFileSync(outputPath, xml);

// Silence the unused-import linter; the legacy stats line below is helpful.
void toSlug;

console.log(`Sitemap generated: ${allPages.length} URLs`);
console.log(`  - ${staticPages.length} static pages`);
console.log(`  - ${seoPages.length} SEO pages (superset of all internal links)`);
console.log(`  - ${comparePages.length} compare pages`);
console.log(`  - source: ${popularGpus.length} popular GPUs · ${popularModels.length} popular models`);
console.log(`Written to: ${outputPath}`);
