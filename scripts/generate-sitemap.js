#!/usr/bin/env node
/**
 * Generate sitemap.xml including all programmatic SEO pages.
 * Run: node scripts/generate-sitemap.js
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://localllm-advisor.com';

function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-\.]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Static pages
const staticPages = [
  { path: '', changefreq: 'weekly', priority: '1.0' },
  { path: '/search', changefreq: 'weekly', priority: '0.9' },
  { path: '/search/model', changefreq: 'weekly', priority: '0.9' },
  { path: '/search/hardware', changefreq: 'weekly', priority: '0.9' },
  { path: '/enterprise', changefreq: 'monthly', priority: '0.8' },
  { path: '/gpu-prices', changefreq: 'daily', priority: '0.7' },
  { path: '/benchmarks', changefreq: 'daily', priority: '0.7' },
  { path: '/faq', changefreq: 'monthly', priority: '0.5' },
  { path: '/methodology', changefreq: 'monthly', priority: '0.5' },
  { path: '/about', changefreq: 'monthly', priority: '0.5' },
];

// Popular GPUs and models for SEO pages
const POPULAR_GPU_NAMES = [
  'NVIDIA RTX 4090', 'NVIDIA RTX 4080 SUPER', 'NVIDIA RTX 4080',
  'NVIDIA RTX 4070 Ti SUPER', 'NVIDIA RTX 4070 Ti', 'NVIDIA RTX 4070 SUPER',
  'NVIDIA RTX 4070', 'NVIDIA RTX 4060 Ti 16GB', 'NVIDIA RTX 4060 Ti 8GB',
  'NVIDIA RTX 4060', 'NVIDIA RTX 3090', 'NVIDIA RTX 3090 Ti',
  'NVIDIA RTX 3080 Ti', 'NVIDIA RTX 3080 12GB', 'NVIDIA RTX 3080 10GB',
  'NVIDIA RTX 3070 Ti', 'NVIDIA RTX 3070', 'NVIDIA RTX 3060 12GB',
  'NVIDIA RTX 5090', 'NVIDIA RTX 5080', 'NVIDIA RTX 5070 Ti', 'NVIDIA RTX 5070',
  'AMD RX 7900 XTX', 'AMD RX 7900 XT', 'AMD RX 7800 XT', 'AMD RX 7600',
  'Apple M3 Max (48GB)', 'Apple M4 Max (64GB)', 'Apple M4 Max (128GB)',
  'Apple M2 Ultra (192GB)', 'Apple M4 Pro (24GB)',
];

const POPULAR_MODEL_IDS = [
  'llama-3.1-8b', 'llama-3.1-70b', 'llama-3.1-405b',
  'llama-3.3-70b', 'llama-4-maverick-400b',
  'mistral-7b-v0.1', 'mistral-small-24b-2501', 'mistral-large-123b',
  'mixtral-8x7b',
  'qwen2.5-7b', 'qwen2.5-14b', 'qwen2.5-32b', 'qwen2.5-72b',
  'qwen3-8b', 'qwen3-32b',
  'deepseek-r1-distill-llama-8b', 'deepseek-r1-distill-qwen-32b',
  'deepseek-r1-distill-llama-70b', 'deepseek-r1-684.5b',
  'deepseek-v3-685b',
  'phi-4-14b', 'gemma-9.2b', 'gemma-27.2b',
  'codellama-34b', 'codestral-22b',
  'command-35b', 'command-r-plus-104b',
];

// Load data
const models = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/models.json'), 'utf-8'));
const gpus = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/gpus.json'), 'utf-8'));

const gpuNameSet = new Set(POPULAR_GPU_NAMES);
const modelIdSet = new Set(POPULAR_MODEL_IDS);

const popularGpus = gpus.filter(g => gpuNameSet.has(g.name));
const popularModels = models.filter(m => modelIdSet.has(m.id));

// Generate SEO page entries
const seoPages = [];
for (const gpu of popularGpus) {
  for (const model of popularModels) {
    seoPages.push({
      path: `/gpu/${toSlug(gpu.name)}/${toSlug(model.name)}`,
      changefreq: 'monthly',
      priority: '0.6',
    });
  }
}

// Build sitemap XML
const allPages = [...staticPages, ...seoPages];

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

// Write sitemap
const outputPath = path.join(__dirname, '../public/sitemap.xml');
fs.writeFileSync(outputPath, xml);

console.log(`Sitemap generated: ${allPages.length} URLs`);
console.log(`  - ${staticPages.length} static pages`);
console.log(`  - ${seoPages.length} SEO pages (${popularGpus.length} GPUs × ${popularModels.length} models)`);
console.log(`Written to: ${outputPath}`);
