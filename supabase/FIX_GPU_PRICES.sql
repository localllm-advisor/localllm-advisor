-- ============================================================
-- Quick fix: Populate GPU prices
-- ============================================================
-- Run this in Supabase SQL Editor if GPU prices are empty.
-- This clears any stale rows and inserts fresh data.
-- ============================================================

-- Clear existing (stale or conflicting) price rows
DELETE FROM gpu_prices;

-- Insert current prices
INSERT INTO gpu_prices (gpu_name, price_usd, retailer, retailer_url, in_stock) VALUES

-- NVIDIA RTX 50-series
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

-- NVIDIA RTX 40-series
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

-- NVIDIA RTX 30-series (used market)
('NVIDIA RTX 3090 Ti',     999, 'eBay',     'https://www.ebay.com/sch/i.html?_nkw=rtx+3090+ti',                true),
('NVIDIA RTX 3090',        849, 'eBay',     'https://www.ebay.com/sch/i.html?_nkw=rtx+3090',                   true),
('NVIDIA RTX 3080 Ti',     499, 'eBay',     'https://www.ebay.com/sch/i.html?_nkw=rtx+3080+ti',                true),
('NVIDIA RTX 3080 12GB',   379, 'eBay',     'https://www.ebay.com/sch/i.html?_nkw=rtx+3080+12gb',              true),
('NVIDIA RTX 3080 10GB',   329, 'eBay',     'https://www.ebay.com/sch/i.html?_nkw=rtx+3080+10gb',              true),
('NVIDIA RTX 3070',        229, 'eBay',     'https://www.ebay.com/sch/i.html?_nkw=rtx+3070',                   true),
('NVIDIA RTX 3060 12GB',   189, 'eBay',     'https://www.ebay.com/sch/i.html?_nkw=rtx+3060+12gb',              true),

-- AMD RX 9000-series
('AMD RX 9070 XT',         599, 'Amazon',   'https://www.amazon.com/s?k=rx+9070+xt',                           true),
('AMD RX 9070 XT',         599, 'Newegg',   'https://www.newegg.com/p/pl?d=rx+9070+xt',                        true),
('AMD RX 9070 XT',         649, 'Best Buy', 'https://www.bestbuy.com/site/searchpage.jsp?st=rx+9070+xt',        true),
('AMD RX 9070',            549, 'Amazon',   'https://www.amazon.com/s?k=rx+9070',                              true),
('AMD RX 9070',            549, 'Newegg',   'https://www.newegg.com/p/pl?d=rx+9070',                           true),

-- AMD RX 7000-series
('AMD RX 7900 XTX',        849, 'Amazon',   'https://www.amazon.com/s?k=rx+7900+xtx',                          true),
('AMD RX 7900 XTX',        799, 'Newegg',   'https://www.newegg.com/p/pl?d=rx+7900+xtx',                       true),
('AMD RX 7900 XT',          649, 'Amazon',   'https://www.amazon.com/s?k=rx+7900+xt',                           true),
('AMD RX 7900 XT',          599, 'Newegg',   'https://www.newegg.com/p/pl?d=rx+7900+xt',                        true),
('AMD RX 7800 XT',          449, 'Amazon',   'https://www.amazon.com/s?k=rx+7800+xt',                           true),
('AMD RX 7800 XT',          429, 'Newegg',   'https://www.newegg.com/p/pl?d=rx+7800+xt',                        true),
('AMD RX 7600 XT',          319, 'Amazon',   'https://www.amazon.com/s?k=rx+7600+xt',                           true),
('AMD RX 7600',             249, 'Amazon',   'https://www.amazon.com/s?k=rx+7600',                              true),
('AMD RX 7600',             239, 'Newegg',   'https://www.newegg.com/p/pl?d=rx+7600',                           true),

-- Intel Arc
('Intel Arc B580',          249, 'Amazon',   'https://www.amazon.com/s?k=arc+b580',                             true),
('Intel Arc B580',          249, 'Newegg',   'https://www.newegg.com/p/pl?d=arc+b580',                          true),
('Intel Arc B580',          249, 'Best Buy', 'https://www.bestbuy.com/site/searchpage.jsp?st=arc+b580',          true),
('Intel Arc B570',          219, 'Amazon',   'https://www.amazon.com/s?k=arc+b570',                             true),
('Intel Arc B570',          219, 'Newegg',   'https://www.newegg.com/p/pl?d=arc+b570',                          true);

-- Verify
SELECT count(*) AS total_gpu_prices FROM gpu_prices;
