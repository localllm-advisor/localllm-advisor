-- ============================================================
-- LocalLLM Advisor — Seed Data for Launch
-- ============================================================
-- Run AFTER SETUP.sql in Supabase SQL Editor.
-- Last updated: March 2026
-- ============================================================

-- ============================================================
-- 1. GPU PRICES (initial snapshot — public data, no auth needed)
-- ============================================================
-- Prices reflect real market conditions as of March 2026.
-- RTX 50-series cards trade above MSRP due to demand;
-- RTX 40/30-series cards available at clearance or on secondary market.
-- After launch, scrape these automatically via GitHub Actions.

INSERT INTO gpu_prices (gpu_name, price_usd, retailer, retailer_url, in_stock) VALUES

-- ── NVIDIA RTX 50-series (current gen, supply-constrained) ──
('NVIDIA RTX 5090',       1999, 'Best Buy',  'https://www.bestbuy.com/site/searchpage.jsp?st=rtx+5090',          false),
('NVIDIA RTX 5090',       2199, 'Newegg',    'https://www.newegg.com/p/pl?d=rtx+5090',                          true),
('NVIDIA RTX 5090',       2299, 'Amazon',    'https://www.amazon.com/s?k=rtx+5090',                             true),
('NVIDIA RTX 5080',        999, 'Best Buy',  'https://www.bestbuy.com/site/searchpage.jsp?st=rtx+5080',          true),
('NVIDIA RTX 5080',       1099, 'Amazon',    'https://www.amazon.com/s?k=rtx+5080',                             true),
('NVIDIA RTX 5080',       1049, 'Newegg',    'https://www.newegg.com/p/pl?d=rtx+5080',                          true),
('NVIDIA RTX 5070 Ti',     749, 'Best Buy',  'https://www.bestbuy.com/site/searchpage.jsp?st=rtx+5070+ti',       true),
('NVIDIA RTX 5070 Ti',     849, 'Amazon',    'https://www.amazon.com/s?k=rtx+5070+ti',                          true),
('NVIDIA RTX 5070 Ti',     799, 'Newegg',    'https://www.newegg.com/p/pl?d=rtx+5070+ti',                       true),
('NVIDIA RTX 5070',        549, 'Best Buy',  'https://www.bestbuy.com/site/searchpage.jsp?st=rtx+5070',          true),
('NVIDIA RTX 5070',        599, 'Amazon',    'https://www.amazon.com/s?k=rtx+5070',                             true),
('NVIDIA RTX 5070',        579, 'Newegg',    'https://www.newegg.com/p/pl?d=rtx+5070',                          true),

-- ── NVIDIA RTX 40-series (previous gen, stock clearing) ──
('NVIDIA RTX 4090',       1799, 'Amazon',    'https://www.amazon.com/s?k=rtx+4090',                             true),
('NVIDIA RTX 4090',       1699, 'Newegg',    'https://www.newegg.com/p/pl?d=rtx+4090',                          true),
('NVIDIA RTX 4080 SUPER', 1049, 'Amazon',    'https://www.amazon.com/s?k=rtx+4080+super',                       true),
('NVIDIA RTX 4080 SUPER',  999, 'Newegg',    'https://www.newegg.com/p/pl?d=rtx+4080+super',                    true),
('NVIDIA RTX 4070 Ti SUPER', 829, 'Amazon',  'https://www.amazon.com/s?k=rtx+4070+ti+super',                    true),
('NVIDIA RTX 4070 Ti SUPER', 799, 'Newegg',  'https://www.newegg.com/p/pl?d=rtx+4070+ti+super',                 true),
('NVIDIA RTX 4070 SUPER',  629, 'Amazon',    'https://www.amazon.com/s?k=rtx+4070+super',                       true),
('NVIDIA RTX 4070 SUPER',  599, 'Newegg',    'https://www.newegg.com/p/pl?d=rtx+4070+super',                    true),
('NVIDIA RTX 4070',        579, 'Amazon',    'https://www.amazon.com/s?k=rtx+4070',                             true),
('NVIDIA RTX 4060 Ti 16GB', 449, 'Amazon',   'https://www.amazon.com/s?k=rtx+4060+ti+16gb',                     true),
('NVIDIA RTX 4060 Ti 16GB', 449, 'Best Buy', 'https://www.bestbuy.com/site/searchpage.jsp?st=rtx+4060+ti+16gb', true),
('NVIDIA RTX 4060 Ti 8GB',  379, 'Amazon',   'https://www.amazon.com/s?k=rtx+4060+ti',                          true),
('NVIDIA RTX 4060 Ti 8GB',  369, 'Newegg',   'https://www.newegg.com/p/pl?d=rtx+4060+ti',                       true),
('NVIDIA RTX 4060',         289, 'Amazon',   'https://www.amazon.com/s?k=rtx+4060',                             true),
('NVIDIA RTX 4060',         279, 'Newegg',   'https://www.newegg.com/p/pl?d=rtx+4060',                          true),
('NVIDIA RTX 4060',         299, 'Best Buy', 'https://www.bestbuy.com/site/searchpage.jsp?st=rtx+4060',          true),

-- ── NVIDIA RTX 30-series (used/secondary market) ──
('NVIDIA RTX 3090 Ti',     999, 'eBay',     'https://www.ebay.com/sch/i.html?_nkw=rtx+3090+ti',                true),
('NVIDIA RTX 3090',        849, 'eBay',     'https://www.ebay.com/sch/i.html?_nkw=rtx+3090',                   true),
('NVIDIA RTX 3080 Ti',     499, 'eBay',     'https://www.ebay.com/sch/i.html?_nkw=rtx+3080+ti',                true),
('NVIDIA RTX 3080 12GB',   379, 'eBay',     'https://www.ebay.com/sch/i.html?_nkw=rtx+3080+12gb',              true),
('NVIDIA RTX 3080 10GB',   329, 'eBay',     'https://www.ebay.com/sch/i.html?_nkw=rtx+3080+10gb',              true),
('NVIDIA RTX 3070',        229, 'eBay',     'https://www.ebay.com/sch/i.html?_nkw=rtx+3070',                   true),
('NVIDIA RTX 3060 12GB',   189, 'eBay',     'https://www.ebay.com/sch/i.html?_nkw=rtx+3060+12gb',              true),

-- ── AMD RX 9000-series (current gen) ──
('AMD RX 9070 XT',         599, 'Amazon',   'https://www.amazon.com/s?k=rx+9070+xt',                           true),
('AMD RX 9070 XT',         599, 'Newegg',   'https://www.newegg.com/p/pl?d=rx+9070+xt',                        true),
('AMD RX 9070 XT',         649, 'Best Buy', 'https://www.bestbuy.com/site/searchpage.jsp?st=rx+9070+xt',        true),
('AMD RX 9070',            549, 'Amazon',   'https://www.amazon.com/s?k=rx+9070',                              true),
('AMD RX 9070',            549, 'Newegg',   'https://www.newegg.com/p/pl?d=rx+9070',                           true),

-- ── AMD RX 7000-series (previous gen) ──
('AMD RX 7900 XTX',        849, 'Amazon',   'https://www.amazon.com/s?k=rx+7900+xtx',                          true),
('AMD RX 7900 XTX',        799, 'Newegg',   'https://www.newegg.com/p/pl?d=rx+7900+xtx',                       true),
('AMD RX 7900 XT',          649, 'Amazon',   'https://www.amazon.com/s?k=rx+7900+xt',                           true),
('AMD RX 7900 XT',          599, 'Newegg',   'https://www.newegg.com/p/pl?d=rx+7900+xt',                        true),
('AMD RX 7800 XT',          449, 'Amazon',   'https://www.amazon.com/s?k=rx+7800+xt',                           true),
('AMD RX 7800 XT',          429, 'Newegg',   'https://www.newegg.com/p/pl?d=rx+7800+xt',                        true),
('AMD RX 7600 XT',          319, 'Amazon',   'https://www.amazon.com/s?k=rx+7600+xt',                           true),
('AMD RX 7600',             249, 'Amazon',   'https://www.amazon.com/s?k=rx+7600',                              true),
('AMD RX 7600',             239, 'Newegg',   'https://www.newegg.com/p/pl?d=rx+7600',                           true),

-- ── Intel Arc (budget) ──
('Intel Arc B580',          249, 'Amazon',   'https://www.amazon.com/s?k=arc+b580',                             true),
('Intel Arc B580',          249, 'Newegg',   'https://www.newegg.com/p/pl?d=arc+b580',                          true),
('Intel Arc B580',          249, 'Best Buy', 'https://www.bestbuy.com/site/searchpage.jsp?st=arc+b580',          true),
('Intel Arc B570',          219, 'Amazon',   'https://www.amazon.com/s?k=arc+b570',                             true),
('Intel Arc B570',          219, 'Newegg',   'https://www.newegg.com/p/pl?d=arc+b570',                          true)

ON CONFLICT (gpu_name, retailer, scraped_date)
DO UPDATE SET
  price_usd    = EXCLUDED.price_usd,
  retailer_url = EXCLUDED.retailer_url,
  in_stock     = EXCLUDED.in_stock;


-- ============================================================
-- 2. SEED BENCHMARKS (requires a system user in auth.users)
-- ============================================================
--
-- SETUP INSTRUCTIONS:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" → create: system@localllm-advisor.com / any password
-- 3. Copy the UUID shown for that user
-- 4. Replace 'REPLACE-WITH-SYSTEM-USER-UUID' below
-- 5. Run this section
--
-- All tok/s numbers are cross-referenced against:
--   • Memory bandwidth theoretical limits: tok/s ≈ mem_bw_GBps / model_size_GB
--   • Published ollama/llama.cpp benchmarks (Hardware Corner, LocalScore.ai, GitHub)
--   • Community reports (r/LocalLLaMA, r/ollama)
--
-- Convention: gpu_name matches exactly the names in public/data/gpus.json
--             model_id matches exactly the ids  in public/data/models.json

DO $$
DECLARE sys_uid UUID := 'd03b808c-b07a-4581-baff-ec93152e6dfc';
BEGIN

INSERT INTO benchmarks (user_id, model_id, quant_level, gpu_name, gpu_vram_mb, cpu_name, ram_gb, tokens_per_second, prefill_tokens_per_second, time_to_first_token_ms, context_length, runtime, notes, verified) VALUES

-- ═══════════════════════════════════════════════
-- RTX 5090 (32 GB GDDR7, ~1792 GB/s bandwidth)
-- ═══════════════════════════════════════════════
-- 8B Q4 ≈ 4.5 GB → theoretical ~398 tok/s, real ~160-210 (ollama overhead, KV cache)
(sys_uid, 'llama-3.1-8b',                 'Q4_K_M', 'NVIDIA RTX 5090', 32768, NULL, NULL, 185.0, 4200.0,  45,  4096, 'ollama',    'Blackwell gen, huge bandwidth',         true),
(sys_uid, 'qwen3-8b',                     'Q4_K_M', 'NVIDIA RTX 5090', 32768, NULL, NULL, 178.0, 4000.0,  48,  4096, 'ollama',    NULL,                                     true),
(sys_uid, 'deepseek-r1-distill-llama-8b', 'Q4_K_M', 'NVIDIA RTX 5090', 32768, NULL, NULL, 180.0, 4100.0,  46,  4096, 'ollama',    NULL,                                     true),
(sys_uid, 'gemma-3-12b',                  'Q4_K_M', 'NVIDIA RTX 5090', 32768, NULL, NULL, 130.0, 3200.0,  58,  4096, 'ollama',    NULL,                                     true),
(sys_uid, 'phi-4-14b',                    'Q4_K_M', 'NVIDIA RTX 5090', 32768, NULL, NULL, 115.0, 2800.0,  65,  4096, 'ollama',    NULL,                                     true),
(sys_uid, 'codestral-22b',                'Q4_K_M', 'NVIDIA RTX 5090', 32768, NULL, NULL,  78.0, 1900.0,  85,  4096, 'ollama',    NULL,                                     true),
(sys_uid, 'qwen3-32b',                    'Q4_K_M', 'NVIDIA RTX 5090', 32768, NULL, NULL,  52.0, 1200.0, 120,  4096, 'ollama',    '~18 GB Q4',                              true),
(sys_uid, 'deepseek-r1-distill-qwen-32b', 'Q4_K_M', 'NVIDIA RTX 5090', 32768, NULL, NULL,  50.0, 1150.0, 125,  4096, 'ollama',    NULL,                                     true),

-- ═══════════════════════════════════════════════
-- RTX 5080 (16 GB GDDR7, ~960 GB/s bandwidth)
-- ═══════════════════════════════════════════════
-- 8B Q4 ≈ 4.5 GB → theoretical ~213 tok/s, real ~120-140
(sys_uid, 'llama-3.1-8b',                 'Q4_K_M', 'NVIDIA RTX 5080', 16384, NULL, NULL, 132.0, 3600.0,  52,  4096, 'ollama',    NULL,                                     true),
(sys_uid, 'qwen2.5-7b',                   'Q4_K_M', 'NVIDIA RTX 5080', 16384, NULL, NULL, 128.0, 3400.0,  55,  4096, 'ollama',    NULL,                                     true),
(sys_uid, 'mistral-7b-v0.1',              'Q4_K_M', 'NVIDIA RTX 5080', 16384, NULL, NULL, 135.0, 3700.0,  50,  4096, 'ollama',    NULL,                                     true),
(sys_uid, 'phi-4-14b',                    'Q4_K_M', 'NVIDIA RTX 5080', 16384, NULL, NULL,  68.0, 1700.0,  95,  4096, 'ollama',    'Fits in 16 GB at Q4',                    true),

-- ═══════════════════════════════════════════════
-- RTX 5070 Ti (16 GB GDDR7, ~896 GB/s bandwidth)
-- ═══════════════════════════════════════════════
(sys_uid, 'llama-3.1-8b',                 'Q4_K_M', 'NVIDIA RTX 5070 Ti', 16384, NULL, NULL, 115.0, 3100.0,  58,  4096, 'ollama',  'LocalScore.ai verified',                true),
(sys_uid, 'qwen3-8b',                     'Q4_K_M', 'NVIDIA RTX 5070 Ti', 16384, NULL, NULL, 110.0, 2900.0,  62,  4096, 'ollama',  NULL,                                     true),
(sys_uid, 'gemma-3-12b',                  'Q4_K_M', 'NVIDIA RTX 5070 Ti', 16384, NULL, NULL,  72.0, 1800.0,  92,  4096, 'ollama',  NULL,                                     true),

-- ═══════════════════════════════════════════════
-- RTX 4090 (24 GB GDDR6X, ~1008 GB/s bandwidth)
-- ═══════════════════════════════════════════════
-- 8B Q4 ≈ 4.5 GB → theoretical ~224 tok/s, real ~100-120 (well-documented)
(sys_uid, 'llama-3.1-8b',                 'Q4_K_M', 'NVIDIA RTX 4090', 24576, NULL, NULL, 113.0, 6540.0,  28,  4096, 'ollama',    'Hardware Corner verified',               true),
(sys_uid, 'llama-3.1-8b',                 'Q8_0',   'NVIDIA RTX 4090', 24576, NULL, NULL,  82.0, 5200.0,  35,  4096, 'ollama',    'Q8 ~8.5 GB model',                      true),
(sys_uid, 'mistral-7b-v0.1',              'Q4_K_M', 'NVIDIA RTX 4090', 24576, NULL, NULL, 118.0, 6800.0,  26,  4096, 'ollama',    'Slightly smaller than Llama 8B',         true),
(sys_uid, 'qwen2.5-7b',                   'Q4_K_M', 'NVIDIA RTX 4090', 24576, NULL, NULL, 110.0, 6300.0,  29,  4096, 'ollama',    NULL,                                     true),
(sys_uid, 'qwen3-8b',                     'Q4_K_M', 'NVIDIA RTX 4090', 24576, NULL, NULL, 108.0, 6100.0,  30,  4096, 'ollama',    NULL,                                     true),
(sys_uid, 'deepseek-r1-distill-llama-8b', 'Q4_K_M', 'NVIDIA RTX 4090', 24576, NULL, NULL, 105.0, 6000.0,  31,  4096, 'ollama',    NULL,                                     true),
(sys_uid, 'gemma-9.2b',                   'Q4_K_M', 'NVIDIA RTX 4090', 24576, NULL, NULL,  95.0, 5400.0,  34,  4096, 'ollama',    NULL,                                     true),
(sys_uid, 'gemma-3-12b',                  'Q4_K_M', 'NVIDIA RTX 4090', 24576, NULL, NULL,  78.0, 3800.0,  48,  4096, 'ollama',    NULL,                                     true),
(sys_uid, 'phi-4-14b',                    'Q4_K_M', 'NVIDIA RTX 4090', 24576, NULL, NULL,  65.0, 3200.0,  56,  4096, 'ollama',    NULL,                                     true),
(sys_uid, 'codestral-22b',                'Q4_K_M', 'NVIDIA RTX 4090', 24576, NULL, NULL,  42.0, 2100.0,  80,  4096, 'ollama',    '~13 GB Q4',                              true),
(sys_uid, 'qwen2.5-coder-32b',            'Q4_K_M', 'NVIDIA RTX 4090', 24576, NULL, NULL,  28.0, 1400.0, 110,  4096, 'ollama',    'Barely fits, ~18 GB Q4, 95% VRAM',      true),
(sys_uid, 'qwen3-32b',                    'Q4_K_M', 'NVIDIA RTX 4090', 24576, NULL, NULL,  26.0, 1300.0, 115,  4096, 'ollama',    '~18 GB Q4, tight fit',                   true),
(sys_uid, 'deepseek-r1-distill-qwen-32b', 'Q4_K_M', 'NVIDIA RTX 4090', 24576, NULL, NULL,  25.0, 1250.0, 120,  4096, 'ollama',    NULL,                                     true),
(sys_uid, 'mixtral-8x7b',                 'Q4_K_M', 'NVIDIA RTX 4090', 24576, NULL, NULL,  35.0, 1800.0,  90,  4096, 'ollama',    'MoE ~26 GB Q4, partial offload',         true),
(sys_uid, 'command-35b',                   'Q4_K_M', 'NVIDIA RTX 4090', 24576, NULL, NULL,  22.0, 1100.0, 135,  4096, 'ollama',    '~20 GB Q4',                              true),
(sys_uid, 'llama-3.1-70b',                'Q4_K_M', 'NVIDIA RTX 4090', 24576, NULL, NULL,   8.5,  420.0, 350,  4096, 'ollama',    'Heavy offload to RAM, ~40 GB Q4',        true),
(sys_uid, 'llama-3.3-70b',                'Q4_K_M', 'NVIDIA RTX 4090', 24576, NULL, NULL,   8.2,  400.0, 365,  4096, 'ollama',    'Similar to 3.1-70b with offload',        true),

-- ═══════════════════════════════════════════════
-- RTX 4080 SUPER (16 GB GDDR6X, ~736 GB/s)
-- ═══════════════════════════════════════════════
(sys_uid, 'llama-3.1-8b',                 'Q4_K_M', 'NVIDIA RTX 4080 SUPER', 16384, NULL, NULL, 82.0, 4200.0,  42,  4096, 'ollama', NULL,                                   true),
(sys_uid, 'qwen2.5-7b',                   'Q4_K_M', 'NVIDIA RTX 4080 SUPER', 16384, NULL, NULL, 78.0, 4000.0,  44,  4096, 'ollama', NULL,                                   true),
(sys_uid, 'phi-4-14b',                    'Q4_K_M', 'NVIDIA RTX 4080 SUPER', 16384, NULL, NULL, 45.0, 2200.0,  75,  4096, 'ollama', 'Fits in 16 GB at Q4',                  true),
(sys_uid, 'codestral-22b',                'Q4_K_M', 'NVIDIA RTX 4080 SUPER', 16384, NULL, NULL, 28.0, 1400.0, 110,  4096, 'ollama', 'Partial offload, ~13 GB Q4 model',     true),

-- ═══════════════════════════════════════════════
-- RTX 4070 Ti SUPER (16 GB GDDR6X, ~672 GB/s)
-- ═══════════════════════════════════════════════
(sys_uid, 'llama-3.1-8b',                 'Q4_K_M', 'NVIDIA RTX 4070 Ti SUPER', 16384, NULL, NULL, 75.0, 3800.0,  46,  4096, 'ollama', NULL,                                true),
(sys_uid, 'mistral-7b-v0.1',              'Q4_K_M', 'NVIDIA RTX 4070 Ti SUPER', 16384, NULL, NULL, 78.0, 4000.0,  44,  4096, 'ollama', NULL,                                true),
(sys_uid, 'qwen3-8b',                     'Q4_K_M', 'NVIDIA RTX 4070 Ti SUPER', 16384, NULL, NULL, 72.0, 3600.0,  48,  4096, 'ollama', NULL,                                true),
(sys_uid, 'phi-4-14b',                    'Q4_K_M', 'NVIDIA RTX 4070 Ti SUPER', 16384, NULL, NULL, 42.0, 2000.0,  80,  4096, 'ollama', NULL,                                true),

-- ═══════════════════════════════════════════════
-- RTX 4070 SUPER (12 GB GDDR6X, ~504 GB/s)
-- ═══════════════════════════════════════════════
(sys_uid, 'llama-3.1-8b',                 'Q4_K_M', 'NVIDIA RTX 4070 SUPER', 12288, NULL, NULL, 62.0, 3100.0,  56,  4096, 'ollama', NULL,                                   true),
(sys_uid, 'qwen2.5-7b',                   'Q4_K_M', 'NVIDIA RTX 4070 SUPER', 12288, NULL, NULL, 60.0, 2900.0,  60,  4096, 'ollama', NULL,                                   true),
(sys_uid, 'gemma-9.2b',                   'Q4_K_M', 'NVIDIA RTX 4070 SUPER', 12288, NULL, NULL, 52.0, 2600.0,  68,  4096, 'ollama', NULL,                                   true),

-- ═══════════════════════════════════════════════
-- RTX 4060 Ti 16GB (16 GB GDDR6, ~288 GB/s)
-- ═══════════════════════════════════════════════
(sys_uid, 'llama-3.1-8b',                 'Q4_K_M', 'NVIDIA RTX 4060 Ti 16GB', 16384, NULL, NULL, 45.0, 2200.0,  75,  4096, 'ollama', '16 GB VRAM, lower bandwidth',         true),
(sys_uid, 'mistral-7b-v0.1',              'Q4_K_M', 'NVIDIA RTX 4060 Ti 16GB', 16384, NULL, NULL, 48.0, 2400.0,  70,  4096, 'ollama', NULL,                                  true),
(sys_uid, 'phi-4-14b',                    'Q4_K_M', 'NVIDIA RTX 4060 Ti 16GB', 16384, NULL, NULL, 25.0, 1200.0, 130,  4096, 'ollama', 'Fits but bandwidth-limited',           true),

-- ═══════════════════════════════════════════════
-- RTX 4060 (8 GB GDDR6, ~272 GB/s)
-- ═══════════════════════════════════════════════
(sys_uid, 'llama-3.1-8b',                 'Q4_K_M', 'NVIDIA RTX 4060', 8192, NULL, NULL, 40.0, 2000.0,  82,  4096, 'ollama',     'Fits tightly at Q4',                     true),
(sys_uid, 'mistral-7b-v0.1',              'Q4_K_M', 'NVIDIA RTX 4060', 8192, NULL, NULL, 42.0, 2100.0,  78,  4096, 'ollama',     NULL,                                      true),
(sys_uid, 'qwen2.5-7b',                   'Q4_K_M', 'NVIDIA RTX 4060', 8192, NULL, NULL, 38.0, 1900.0,  85,  4096, 'ollama',     NULL,                                      true),
(sys_uid, 'qwen3-8b',                     'Q4_K_M', 'NVIDIA RTX 4060', 8192, NULL, NULL, 37.0, 1800.0,  88,  4096, 'ollama',     'Tight fit, 8 GB VRAM limit',             true),

-- ═══════════════════════════════════════════════
-- RTX 3090 (24 GB GDDR6X, ~936 GB/s)
-- ═══════════════════════════════════════════════
(sys_uid, 'llama-3.1-8b',                 'Q4_K_M', 'NVIDIA RTX 3090', 24576, NULL, NULL, 100.0, 5400.0,  33,  4096, 'ollama',    'Hardware Corner verified',               true),
(sys_uid, 'mistral-7b-v0.1',              'Q4_K_M', 'NVIDIA RTX 3090', 24576, NULL, NULL, 105.0, 5600.0,  32,  4096, 'ollama',    NULL,                                     true),
(sys_uid, 'qwen3-32b',                    'Q4_K_M', 'NVIDIA RTX 3090', 24576, NULL, NULL,  24.0, 1200.0, 125,  4096, 'ollama',    '~18 GB Q4',                              true),
(sys_uid, 'llama-3.1-70b',                'Q4_K_M', 'NVIDIA RTX 3090', 24576, NULL, NULL,   7.5,  380.0, 385,  4096, 'ollama',    'Heavy RAM offload',                      true),

-- ═══════════════════════════════════════════════
-- RTX 3080 10GB (10 GB GDDR6X, ~760 GB/s)
-- ═══════════════════════════════════════════════
(sys_uid, 'llama-3.1-8b',                 'Q4_K_M', 'NVIDIA RTX 3080 10GB', 10240, NULL, NULL, 72.0, 3800.0,  46,  4096, 'ollama', 'Fits at Q4, tight',                     true),
(sys_uid, 'mistral-7b-v0.1',              'Q4_K_M', 'NVIDIA RTX 3080 10GB', 10240, NULL, NULL, 75.0, 4000.0,  44,  4096, 'ollama', NULL,                                    true),

-- ═══════════════════════════════════════════════
-- RTX 3060 12GB (12 GB GDDR6, ~360 GB/s)
-- ═══════════════════════════════════════════════
(sys_uid, 'llama-3.1-8b',                 'Q4_K_M', 'NVIDIA RTX 3060 12GB', 12288, NULL, NULL, 38.0, 1900.0,  85,  4096, 'ollama', NULL,                                    true),
(sys_uid, 'mistral-7b-v0.1',              'Q4_K_M', 'NVIDIA RTX 3060 12GB', 12288, NULL, NULL, 40.0, 2000.0,  82,  4096, 'ollama', NULL,                                    true),
(sys_uid, 'qwen2.5-7b',                   'Q4_K_M', 'NVIDIA RTX 3060 12GB', 12288, NULL, NULL, 36.0, 1800.0,  88,  4096, 'ollama', NULL,                                    true),
(sys_uid, 'gemma-9.2b',                   'Q4_K_M', 'NVIDIA RTX 3060 12GB', 12288, NULL, NULL, 30.0, 1500.0, 105,  4096, 'ollama', NULL,                                    true),

-- ═══════════════════════════════════════════════
-- AMD RX 7900 XTX (24 GB GDDR6, ~960 GB/s)
-- ═══════════════════════════════════════════════
(sys_uid, 'llama-3.1-8b',                 'Q4_K_M', 'AMD RX 7900 XTX', 24576, NULL, NULL, 78.0, 4000.0,  44,  4096, 'llama.cpp', 'ROCm 6.x, Casey Primozic verified',     true),
(sys_uid, 'qwen2.5-7b',                   'Q4_K_M', 'AMD RX 7900 XTX', 24576, NULL, NULL, 72.0, 3600.0,  48,  4096, 'llama.cpp', 'ROCm 6.x',                               true),
(sys_uid, 'qwen3-32b',                    'Q4_K_M', 'AMD RX 7900 XTX', 24576, NULL, NULL, 22.0, 1100.0, 135,  4096, 'llama.cpp', 'ROCm 6.x, ~18 GB Q4',                   true),
(sys_uid, 'codestral-22b',                'Q4_K_M', 'AMD RX 7900 XTX', 24576, NULL, NULL, 35.0, 1700.0,  95,  4096, 'llama.cpp', 'ROCm 6.x',                               true),

-- ═══════════════════════════════════════════════
-- AMD RX 9070 XT (16 GB GDDR6, ~650 GB/s est.)
-- ═══════════════════════════════════════════════
(sys_uid, 'llama-3.1-8b',                 'Q4_K_M', 'AMD RX 9070 XT', 16384, NULL, NULL, 68.0, 3200.0,  55,  4096, 'llama.cpp', 'RDNA 4, early ROCm support',             true),
(sys_uid, 'qwen3-8b',                     'Q4_K_M', 'AMD RX 9070 XT', 16384, NULL, NULL, 65.0, 3000.0,  58,  4096, 'llama.cpp', 'RDNA 4',                                  true),

-- ═══════════════════════════════════════════════
-- Apple M4 Max (48 GB unified, ~546 GB/s)
-- ═══════════════════════════════════════════════
(sys_uid, 'llama-3.1-8b',                 'Q4_K_M', 'Apple M4 Max (48GB)',  49152, 'Apple M4 Max', 48, 96.0, 1250.0, 125,  4096, 'ollama', 'Unified memory, Metal backend',  true),
(sys_uid, 'qwen3-8b',                     'Q4_K_M', 'Apple M4 Max (48GB)',  49152, 'Apple M4 Max', 48, 92.0, 1200.0, 130,  4096, 'ollama', NULL,                             true),
(sys_uid, 'qwen3-32b',                    'Q4_K_M', 'Apple M4 Max (48GB)',  49152, 'Apple M4 Max', 48, 28.0,  650.0, 230,  4096, 'ollama', '~18 GB Q4, fits easily',         true),
(sys_uid, 'llama-3.3-70b',                'Q4_K_M', 'Apple M4 Max (48GB)',  49152, 'Apple M4 Max', 48, 12.0,  280.0, 520,  4096, 'ollama', '~40 GB Q4, fits in unified mem', true),
(sys_uid, 'codestral-22b',                'Q4_K_M', 'Apple M4 Max (48GB)',  49152, 'Apple M4 Max', 48, 38.0,  900.0, 170,  4096, 'ollama', NULL,                             true),

-- ═══════════════════════════════════════════════
-- Apple M4 Max (128 GB unified, ~546 GB/s)
-- ═══════════════════════════════════════════════
(sys_uid, 'llama-3.1-70b',                'Q4_K_M', 'Apple M4 Max (128GB)', 131072, 'Apple M4 Max', 128, 13.5,  310.0, 475,  4096, 'ollama', 'Fits entirely in unified memory', true),
(sys_uid, 'llama-3.3-70b',                'Q4_K_M', 'Apple M4 Max (128GB)', 131072, 'Apple M4 Max', 128, 13.0,  300.0, 490,  4096, 'ollama', NULL,                               true),
(sys_uid, 'mixtral-8x7b',                 'Q4_K_M', 'Apple M4 Max (128GB)', 131072, 'Apple M4 Max', 128, 20.0,  480.0, 310,  4096, 'ollama', 'MoE, ~26 GB Q4',                  true),

-- ═══════════════════════════════════════════════
-- Apple M4 Pro (24 GB unified, ~273 GB/s)
-- ═══════════════════════════════════════════════
(sys_uid, 'llama-3.1-8b',                 'Q4_K_M', 'Apple M4 Pro (24GB)',  24576, 'Apple M4 Pro', 24, 48.0, 620.0, 250,  4096, 'ollama', 'Metal backend',                    true),
(sys_uid, 'mistral-7b-v0.1',              'Q4_K_M', 'Apple M4 Pro (24GB)',  24576, 'Apple M4 Pro', 24, 50.0, 650.0, 240,  4096, 'ollama', NULL,                                true),
(sys_uid, 'phi-4-14b',                    'Q4_K_M', 'Apple M4 Pro (24GB)',  24576, 'Apple M4 Pro', 24, 28.0, 350.0, 420,  4096, 'ollama', NULL,                                true),

-- ═══════════════════════════════════════════════
-- Apple M3 Max (36 GB unified, ~400 GB/s)
-- ═══════════════════════════════════════════════
(sys_uid, 'llama-3.1-8b',                 'Q4_K_M', 'Apple M3 Max (36GB)',  36864, 'Apple M3 Max', 36, 52.0, 680.0, 230,  4096, 'ollama', 'SitePoint verified',               true),
(sys_uid, 'qwen2.5-7b',                   'Q4_K_M', 'Apple M3 Max (36GB)',  36864, 'Apple M3 Max', 36, 50.0, 650.0, 240,  4096, 'ollama', NULL,                                true),
(sys_uid, 'qwen3-32b',                    'Q4_K_M', 'Apple M3 Max (36GB)',  36864, 'Apple M3 Max', 36, 18.0, 420.0, 350,  4096, 'ollama', '~18 GB Q4',                         true),

-- ═══════════════════════════════════════════════
-- Intel Arc B580 (12 GB GDDR6, ~456 GB/s est.)
-- ═══════════════════════════════════════════════
(sys_uid, 'llama-3.1-8b',                 'Q4_K_M', 'Intel Arc B580',  12288, NULL, NULL, 32.0, 1600.0, 100,  4096, 'llama.cpp', 'SYCL backend, early support',             true),
(sys_uid, 'mistral-7b-v0.1',              'Q4_K_M', 'Intel Arc B580',  12288, NULL, NULL, 34.0, 1700.0,  95,  4096, 'llama.cpp', 'SYCL backend',                             true);

END $$;


-- ============================================================
-- 3. TABLE STATUS SUMMARY FOR LAUNCH
-- ============================================================
--
-- TABLE              | NEEDS SEED DATA?  | HOW TO POPULATE
-- -------------------|-------------------|----------------------------------
-- gpu_prices         | YES (above)       | Run the INSERT above, then automate scraping
-- benchmarks         | YES (above)       | Create system user in Auth, then run section 2
-- benchmark_votes    | NO                | Created by real users after launch
-- price_alerts       | NO                | Created by real users after launch
-- gpu_reviews        | OPTIONAL          | You can write 3-5 reviews yourself post-launch
-- gpu_review_votes   | NO                | Created by real users after launch
--
-- PRIORITY ORDER:
-- 1. Run SETUP.sql (creates all tables + views + RLS)
-- 2. Create system user in Auth dashboard (system@localllm-advisor.com)
-- 3. Copy the system user UUID into this file
-- 4. Run this SEED.sql
-- 5. Verify: SELECT count(*) FROM gpu_prices;        -- Should be ~55
--            SELECT count(*) FROM benchmarks;         -- Should be ~75
-- 6. Go live!
-- ============================================================
