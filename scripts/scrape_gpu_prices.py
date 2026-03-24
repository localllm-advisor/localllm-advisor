#!/usr/bin/env python3
"""
GPU Price Scraper for LocalLLM Advisor
========================================
Scrapes GPU prices from multiple sources and stores in Supabase.

Sources (in order of priority):
  1. PCPartPicker — aggregates Amazon, Newegg, B&H, Adorama (new cards)
  2. eBay sold listings — used market median (older/used cards)
  3. Newegg direct search — fallback when PCPartPicker fails

Usage:
  python scripts/scrape_gpu_prices.py [--dry-run] [--gpu "RTX 4090"]

Environment variables:
  SUPABASE_URL         - Supabase project URL
  SUPABASE_SERVICE_KEY - Supabase service role key (NOT the anon key)
"""

import os
import re
import sys
import json
import time
import random
import argparse
import statistics
from datetime import datetime
from typing import Optional
from dataclasses import dataclass, field
from urllib.parse import quote_plus, urlencode

import requests
from bs4 import BeautifulSoup


# ─────────────────────────────────────────────────────────────────────────────
# GPU TARGETS
# Each entry: {
#   "pcpp": PCPartPicker product slug (or None to skip),
#   "newegg": Newegg search string,
#   "ebay": eBay search string (used when used=True),
#   "used": True = pull from eBay sold listings instead of new retailers
# }
# ─────────────────────────────────────────────────────────────────────────────
GPU_TARGETS = {
    # ── NVIDIA RTX 50-series (new, PCPartPicker primary) ──────────────────
    "NVIDIA RTX 5090": {
        "pcpp": "nvidia-geforce-rtx-5090",
        "newegg": "RTX 5090",
        "used": False,
    },
    "NVIDIA RTX 5080": {
        "pcpp": "nvidia-geforce-rtx-5080",
        "newegg": "RTX 5080 -5090",
        "used": False,
    },
    "NVIDIA RTX 5070 Ti": {
        "pcpp": "nvidia-geforce-rtx-5070-ti",
        "newegg": "RTX 5070 Ti",
        "used": False,
    },
    "NVIDIA RTX 5070": {
        "pcpp": "nvidia-geforce-rtx-5070",
        "newegg": "RTX 5070 -Ti -5080",
        "used": False,
    },
    "NVIDIA RTX 5060 Ti": {
        "pcpp": "nvidia-geforce-rtx-5060-ti",
        "newegg": "RTX 5060 Ti",
        "used": False,
    },
    "NVIDIA RTX 5060": {
        "pcpp": "nvidia-geforce-rtx-5060",
        "newegg": "RTX 5060 -Ti",
        "used": False,
    },
    # ── NVIDIA RTX 40-series (new, PCPartPicker primary) ──────────────────
    "NVIDIA RTX 4090": {
        "pcpp": "nvidia-geforce-rtx-4090",
        "newegg": "RTX 4090 -5090",
        "used": False,
    },
    "NVIDIA RTX 4080 SUPER": {
        "pcpp": "nvidia-geforce-rtx-4080-super",
        "newegg": "RTX 4080 SUPER",
        "used": False,
    },
    "NVIDIA RTX 4080": {
        "pcpp": "nvidia-geforce-rtx-4080",
        "newegg": "RTX 4080 -SUPER -5080",
        "used": False,
    },
    "NVIDIA RTX 4070 Ti SUPER": {
        "pcpp": "nvidia-geforce-rtx-4070-ti-super",
        "newegg": "RTX 4070 Ti SUPER",
        "used": False,
    },
    "NVIDIA RTX 4070 Ti": {
        "pcpp": "nvidia-geforce-rtx-4070-ti",
        "newegg": "RTX 4070 Ti -SUPER",
        "used": False,
    },
    "NVIDIA RTX 4070 SUPER": {
        "pcpp": "nvidia-geforce-rtx-4070-super",
        "newegg": "RTX 4070 SUPER -Ti",
        "used": False,
    },
    "NVIDIA RTX 4070": {
        "pcpp": "nvidia-geforce-rtx-4070",
        "newegg": "RTX 4070 -Ti -SUPER -5070",
        "used": False,
    },
    "NVIDIA RTX 4060 Ti 16GB": {
        "pcpp": "nvidia-geforce-rtx-4060-ti-16gb",
        "newegg": "RTX 4060 Ti 16GB",
        "used": False,
    },
    "NVIDIA RTX 4060 Ti 8GB": {
        "pcpp": "nvidia-geforce-rtx-4060-ti",
        "newegg": "RTX 4060 Ti 8GB",
        "used": False,
    },
    "NVIDIA RTX 4060": {
        "pcpp": "nvidia-geforce-rtx-4060",
        "newegg": "RTX 4060 -Ti",
        "used": False,
    },
    # ── NVIDIA RTX 30-series (used market via eBay) ───────────────────────
    "NVIDIA RTX 3090 Ti": {
        "pcpp": None,
        "newegg": "RTX 3090 Ti",
        "ebay": "NVIDIA RTX 3090 Ti graphics card",
        "used": True,
    },
    "NVIDIA RTX 3090": {
        "pcpp": None,
        "newegg": "RTX 3090 -Ti",
        "ebay": "NVIDIA RTX 3090 graphics card -Ti",
        "used": True,
    },
    "NVIDIA RTX 3080 Ti": {
        "pcpp": None,
        "newegg": "RTX 3080 Ti",
        "ebay": "NVIDIA RTX 3080 Ti graphics card",
        "used": True,
    },
    "NVIDIA RTX 3080 12GB": {
        "pcpp": None,
        "newegg": "RTX 3080 12GB",
        "ebay": "NVIDIA RTX 3080 12GB graphics card",
        "used": True,
    },
    "NVIDIA RTX 3080 10GB": {
        "pcpp": None,
        "newegg": "RTX 3080 10GB",
        "ebay": "NVIDIA RTX 3080 10GB graphics card",
        "used": True,
    },
    "NVIDIA RTX 3070 Ti": {
        "pcpp": None,
        "newegg": "RTX 3070 Ti",
        "ebay": "NVIDIA RTX 3070 Ti graphics card",
        "used": True,
    },
    "NVIDIA RTX 3070": {
        "pcpp": None,
        "newegg": "RTX 3070 -Ti",
        "ebay": "NVIDIA RTX 3070 graphics card -Ti",
        "used": True,
    },
    "NVIDIA RTX 3060 Ti": {
        "pcpp": None,
        "newegg": "RTX 3060 Ti",
        "ebay": "NVIDIA RTX 3060 Ti graphics card",
        "used": True,
    },
    "NVIDIA RTX 3060 12GB": {
        "pcpp": None,
        "newegg": "RTX 3060 12GB",
        "ebay": "NVIDIA RTX 3060 12GB graphics card",
        "used": True,
    },
    # ── AMD RX 9000-series (new) ───────────────────────────────────────────
    "AMD RX 9070 XT": {
        "pcpp": "amd-radeon-rx-9070-xt",
        "newegg": "RX 9070 XT",
        "used": False,
    },
    "AMD RX 9070": {
        "pcpp": "amd-radeon-rx-9070",
        "newegg": "RX 9070 -XT",
        "used": False,
    },
    # ── AMD RX 7000-series (new, PCPartPicker primary) ────────────────────
    "AMD RX 7900 XTX": {
        "pcpp": "amd-radeon-rx-7900-xtx",
        "newegg": "RX 7900 XTX",
        "used": False,
    },
    "AMD RX 7900 XT": {
        "pcpp": "amd-radeon-rx-7900-xt",
        "newegg": "RX 7900 XT -XTX",
        "used": False,
    },
    "AMD RX 7900 GRE": {
        "pcpp": "amd-radeon-rx-7900-gre",
        "newegg": "RX 7900 GRE",
        "used": False,
    },
    "AMD RX 7800 XT": {
        "pcpp": "amd-radeon-rx-7800-xt",
        "newegg": "RX 7800 XT",
        "used": False,
    },
    "AMD RX 7700 XT": {
        "pcpp": "amd-radeon-rx-7700-xt",
        "newegg": "RX 7700 XT",
        "used": False,
    },
    "AMD RX 7600 XT": {
        "pcpp": "amd-radeon-rx-7600-xt",
        "newegg": "RX 7600 XT",
        "used": False,
    },
    "AMD RX 7600": {
        "pcpp": "amd-radeon-rx-7600",
        "newegg": "RX 7600 -XT",
        "used": False,
    },
    # ── Intel Arc (new) ───────────────────────────────────────────────────
    "Intel Arc B580": {
        "pcpp": "intel-arc-b580",
        "newegg": "Intel Arc B580",
        "used": False,
    },
    "Intel Arc B570": {
        "pcpp": "intel-arc-b570",
        "newegg": "Intel Arc B570 -B580",
        "used": False,
    },
    "Intel Arc A770 16GB": {
        "pcpp": "intel-arc-a770-16gb",
        "newegg": "Intel Arc A770 16GB",
        "used": False,
    },
    "Intel Arc A750": {
        "pcpp": "intel-arc-a750",
        "newegg": "Intel Arc A750 -A770",
        "used": False,
    },
}

# Price sanity bounds per GPU (min, max) in USD
PRICE_BOUNDS = {
    "NVIDIA RTX 5090": (1800, 3500),
    "NVIDIA RTX 5080": (900, 1800),
    "NVIDIA RTX 5070 Ti": (600, 1200),
    "NVIDIA RTX 5070": (450, 900),
    "NVIDIA RTX 5060 Ti": (300, 650),
    "NVIDIA RTX 5060": (250, 500),
    "NVIDIA RTX 4090": (900, 2200),
    "NVIDIA RTX 4080 SUPER": (700, 1200),
    "NVIDIA RTX 4080": (650, 1100),
    "NVIDIA RTX 4070 Ti SUPER": (550, 900),
    "NVIDIA RTX 4070 Ti": (500, 850),
    "NVIDIA RTX 4070 SUPER": (450, 750),
    "NVIDIA RTX 4070": (400, 700),
    "NVIDIA RTX 4060 Ti 16GB": (350, 600),
    "NVIDIA RTX 4060 Ti 8GB": (280, 500),
    "NVIDIA RTX 4060": (220, 400),
    "NVIDIA RTX 3090 Ti": (400, 900),
    "NVIDIA RTX 3090": (300, 800),
    "NVIDIA RTX 3080 Ti": (250, 600),
    "NVIDIA RTX 3080 12GB": (200, 500),
    "NVIDIA RTX 3080 10GB": (180, 450),
    "NVIDIA RTX 3070 Ti": (150, 380),
    "NVIDIA RTX 3070": (130, 350),
    "NVIDIA RTX 3060 Ti": (120, 300),
    "NVIDIA RTX 3060 12GB": (100, 280),
    "AMD RX 9070 XT": (450, 900),
    "AMD RX 9070": (380, 750),
    "AMD RX 7900 XTX": (550, 1100),
    "AMD RX 7900 XT": (450, 900),
    "AMD RX 7900 GRE": (350, 700),
    "AMD RX 7800 XT": (300, 600),
    "AMD RX 7700 XT": (250, 500),
    "AMD RX 7600 XT": (200, 400),
    "AMD RX 7600": (150, 350),
    "Intel Arc B580": (180, 350),
    "Intel Arc B570": (150, 300),
    "Intel Arc A770 16GB": (150, 320),
    "Intel Arc A750": (120, 280),
}
DEFAULT_BOUNDS = (80, 4000)


@dataclass
class PriceResult:
    gpu_name: str
    price_usd: int
    retailer: str
    retailer_url: str
    in_stock: bool
    source: str = "scraped"  # "pcpartpicker" | "ebay_used" | "newegg"


class GpuPriceScraper:
    """Multi-source GPU price scraper with anti-ban measures."""

    USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0",
    ]

    def __init__(self, dry_run: bool = False, target_gpu: Optional[str] = None):
        self.dry_run = dry_run
        self.target_gpu = target_gpu  # If set, only scrape this one GPU
        self.session = requests.Session()
        self.results: list[PriceResult] = []
        self._request_count = 0

    def _get_headers(self, referer: str = "https://www.google.com/") -> dict:
        return {
            "User-Agent": random.choice(self.USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Referer": referer,
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "cross-site",
            "DNT": "1",
        }

    def _delay(self, short: bool = False):
        """Random delay between requests — avoids triggering rate limits."""
        if short:
            time.sleep(random.uniform(0.5, 1.5))
        else:
            time.sleep(random.uniform(2.0, 4.5))
        self._request_count += 1
        # Extra long pause every 20 requests
        if self._request_count % 20 == 0:
            pause = random.uniform(8, 15)
            print(f"  [throttle] Pausing {pause:.1f}s after {self._request_count} requests…")
            time.sleep(pause)

    def _fetch(self, url: str, referer: str = "https://www.google.com/",
               retries: int = 3) -> Optional[BeautifulSoup]:
        """Fetch a URL with automatic retry + exponential backoff on 429/503."""
        for attempt in range(retries):
            try:
                resp = self.session.get(
                    url,
                    headers=self._get_headers(referer),
                    timeout=20,
                    allow_redirects=True,
                )
                if resp.status_code == 200:
                    return BeautifulSoup(resp.text, "html.parser")
                elif resp.status_code in (429, 503):
                    wait = (2 ** attempt) * random.uniform(5, 10)
                    print(f"  [rate-limit] HTTP {resp.status_code} → waiting {wait:.0f}s (attempt {attempt+1})")
                    time.sleep(wait)
                else:
                    print(f"  [http] Status {resp.status_code} for {url[:80]}")
                    return None
            except requests.RequestException as exc:
                print(f"  [error] Attempt {attempt+1}: {exc}")
                if attempt < retries - 1:
                    time.sleep(random.uniform(3, 7))
        return None

    # ─────────────────────────────────────────────────────────────────────
    # SOURCE 1: PCPartPicker
    # ─────────────────────────────────────────────────────────────────────
    def scrape_pcpartpicker(self, gpu_name: str, slug: str) -> list[PriceResult]:
        """
        Scrapes the PCPartPicker product page for a GPU.
        PCPartPicker shows prices from Amazon, Newegg, B&H, Adorama, etc.
        Returns all found retailer prices (multiple per GPU).
        """
        url = f"https://pcpartpicker.com/product/{slug}/"
        print(f"  [PCPartPicker] {url}")
        soup = self._fetch(url, referer="https://pcpartpicker.com/products/video-card/")
        if not soup:
            return []

        results = []
        bounds = PRICE_BOUNDS.get(gpu_name, DEFAULT_BOUNDS)

        # PCPartPicker price table: each row has retailer + price
        price_rows = soup.select("tr.td__finalPrice, div.price__wrapper")
        if not price_rows:
            # Fallback: look for the main price block
            price_rows = soup.select("[class*='price']")

        # Primary: look for the structured price list
        for row in soup.select("tr"):
            cells = row.find_all("td")
            if len(cells) < 2:
                continue
            retailer_cell = cells[0].get_text(strip=True)
            price_cell = cells[-1].get_text(strip=True)

            price_match = re.search(r"\$[\d,]+\.?\d*", price_cell)
            if not price_match:
                continue

            price = int(re.sub(r"[^\d]", "", price_match.group()))
            if not (bounds[0] <= price <= bounds[1]):
                continue

            # Find the buy link
            link_tag = row.find("a", href=True)
            retailer_url = link_tag["href"] if link_tag else url
            if retailer_url.startswith("/"):
                retailer_url = "https://pcpartpicker.com" + retailer_url

            # Normalize retailer name
            retailer = self._normalize_retailer(retailer_cell)
            in_stock = "out of stock" not in price_cell.lower()

            results.append(PriceResult(
                gpu_name=gpu_name,
                price_usd=price,
                retailer=retailer,
                retailer_url=retailer_url,
                in_stock=in_stock,
                source="pcpartpicker",
            ))

        # Deduplicate by retailer (keep lowest price per retailer)
        by_retailer: dict[str, PriceResult] = {}
        for r in results:
            if r.retailer not in by_retailer or r.price_usd < by_retailer[r.retailer].price_usd:
                by_retailer[r.retailer] = r

        return list(by_retailer.values())

    # ─────────────────────────────────────────────────────────────────────
    # SOURCE 2: eBay sold listings (used/older cards)
    # ─────────────────────────────────────────────────────────────────────
    def scrape_ebay_sold(self, gpu_name: str, search_query: str) -> Optional[PriceResult]:
        """
        Searches eBay completed/sold listings.
        Uses the median sold price to avoid outliers.
        """
        params = {
            "q": search_query,
            "LH_Sold": "1",       # Sold listings only
            "LH_Complete": "1",   # Completed listings
            "LH_ItemCondition": "3000",  # Used condition
            "rt": "nc",
        }
        url = "https://www.ebay.com/sch/i.html?" + urlencode(params)
        print(f"  [eBay sold] {search_query}")
        soup = self._fetch(url, referer="https://www.ebay.com/")
        if not soup:
            return None

        bounds = PRICE_BOUNDS.get(gpu_name, DEFAULT_BOUNDS)
        prices = []

        for item in soup.select(".s-item"):
            price_tag = item.select_one(".s-item__price")
            if not price_tag:
                continue
            price_text = price_tag.get_text(strip=True)
            # Handle price ranges like "$200.00 to $350.00" — skip them
            if " to " in price_text.lower():
                continue
            price_match = re.search(r"\$[\d,]+\.?\d*", price_text)
            if not price_match:
                continue
            price = int(re.sub(r"[^\d]", "", price_match.group()))
            if bounds[0] <= price <= bounds[1]:
                prices.append(price)

        if not prices:
            return None

        median_price = int(statistics.median(prices))
        print(f"  [eBay sold] {len(prices)} sold listings, median=${median_price}")

        return PriceResult(
            gpu_name=gpu_name,
            price_usd=median_price,
            retailer="eBay (used)",
            retailer_url=url,
            in_stock=True,  # eBay always has supply
            source="ebay_used",
        )

    # ─────────────────────────────────────────────────────────────────────
    # SOURCE 3: Newegg (fallback)
    # ─────────────────────────────────────────────────────────────────────
    def scrape_newegg(self, gpu_name: str, search_query: str) -> Optional[PriceResult]:
        """Scrapes the lowest price from Newegg search results."""
        url = f"https://www.newegg.com/p/pl?d={quote_plus(search_query)}&N=100007709"
        print(f"  [Newegg] {search_query}")
        soup = self._fetch(url, referer="https://www.newegg.com/Video-Cards-Video-Devices/Category/ID-38")
        if not soup:
            return None

        bounds = PRICE_BOUNDS.get(gpu_name, DEFAULT_BOUNDS)

        for item in soup.select(".item-cell, .item-container")[:8]:
            price_elem = item.select_one(".price-current strong")
            if not price_elem:
                continue
            price_match = re.search(r"[\d,]+", price_elem.get_text(strip=True))
            if not price_match:
                continue
            price = int(price_match.group().replace(",", ""))
            if not (bounds[0] <= price <= bounds[1]):
                continue

            link = item.select_one("a.item-title, a.item-img")
            product_url = link.get("href", url) if link else url
            stock_elem = item.select_one(".item-promo")
            in_stock = not (stock_elem and "OUT OF STOCK" in stock_elem.get_text().upper())

            return PriceResult(
                gpu_name=gpu_name,
                price_usd=price,
                retailer="Newegg",
                retailer_url=product_url,
                in_stock=in_stock,
                source="newegg",
            )
        return None

    # ─────────────────────────────────────────────────────────────────────
    # Main scrape loop
    # ─────────────────────────────────────────────────────────────────────
    def scrape_all(self):
        targets = GPU_TARGETS
        if self.target_gpu:
            if self.target_gpu not in targets:
                print(f"ERROR: Unknown GPU '{self.target_gpu}'. Valid options:")
                for k in targets:
                    print(f"  {k}")
                sys.exit(1)
            targets = {self.target_gpu: targets[self.target_gpu]}

        print(f"{'='*60}")
        print(f"GPU Price Scraper — {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}")
        print(f"Dry run: {self.dry_run} | GPUs to track: {len(targets)}")
        print(f"{'='*60}\n")

        for gpu_name, cfg in targets.items():
            print(f"\n▶ {gpu_name}")
            found_any = False

            if cfg.get("used"):
                # Used/older card → eBay sold listings
                ebay_query = cfg.get("ebay", f"{gpu_name} graphics card")
                result = self.scrape_ebay_sold(gpu_name, ebay_query)
                if result:
                    self.results.append(result)
                    found_any = True
                    print(f"  ✓ eBay (used): ${result.price_usd}")
                self._delay()

                # Also try Newegg for any remaining new stock
                newegg_result = self.scrape_newegg(gpu_name, cfg["newegg"])
                if newegg_result:
                    self.results.append(newegg_result)
                    found_any = True
                    print(f"  ✓ Newegg: ${newegg_result.price_usd} {'✓' if newegg_result.in_stock else '✗'}")
                self._delay()

            else:
                # New card → PCPartPicker first
                pcpp_slug = cfg.get("pcpp")
                pcpp_results = []
                if pcpp_slug:
                    pcpp_results = self.scrape_pcpartpicker(gpu_name, pcpp_slug)
                    self._delay()

                if pcpp_results:
                    for r in pcpp_results:
                        self.results.append(r)
                        stock_icon = "✓" if r.in_stock else "✗"
                        print(f"  ✓ {r.retailer}: ${r.price_usd} {stock_icon}")
                    found_any = True
                else:
                    # Fallback to Newegg
                    print(f"  [PCPartPicker] No results → trying Newegg fallback")
                    newegg_result = self.scrape_newegg(gpu_name, cfg["newegg"])
                    if newegg_result:
                        self.results.append(newegg_result)
                        found_any = True
                        print(f"  ✓ Newegg: ${newegg_result.price_usd} {'✓' if newegg_result.in_stock else '✗'}")
                    self._delay()

            if not found_any:
                print(f"  ✗ No prices found for {gpu_name}")

        print(f"\n{'='*60}")
        print(f"Total price records scraped: {len(self.results)}")
        print(f"{'='*60}\n")

    # ─────────────────────────────────────────────────────────────────────
    # Supabase persistence
    # ─────────────────────────────────────────────────────────────────────
    def save_to_supabase(self):
        if self.dry_run:
            print("[DRY RUN] Would insert the following records:")
            for r in self.results:
                stock = "in stock" if r.in_stock else "out of stock"
                print(f"  {r.gpu_name:40s} {r.retailer:20s} ${r.price_usd:5d}  {stock}")
            return

        supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
        supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")

        if not supabase_url or not supabase_key:
            print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables must be set.")
            sys.exit(1)

        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            # ON CONFLICT (gpu_name, retailer, scraped_date) → update price + in_stock
            "Prefer": "resolution=merge-duplicates",
        }

        today = datetime.utcnow().strftime("%Y-%m-%d")
        payload = [
            {
                "gpu_name": r.gpu_name,
                "price_usd": r.price_usd,
                "retailer": r.retailer,
                "retailer_url": r.retailer_url,
                "in_stock": r.in_stock,
                "scraped_date": today,
            }
            for r in self.results
        ]

        resp = requests.post(
            f"{supabase_url}/rest/v1/gpu_prices",
            headers=headers,
            json=payload,
            timeout=30,
        )

        if resp.status_code in (200, 201):
            print(f"✓ Saved {len(payload)} records to Supabase (table: gpu_prices)")
        else:
            print(f"✗ Supabase error {resp.status_code}: {resp.text[:500]}")
            sys.exit(1)

    # ─────────────────────────────────────────────────────────────────────
    # Helpers
    # ─────────────────────────────────────────────────────────────────────
    @staticmethod
    def _normalize_retailer(raw: str) -> str:
        raw = raw.lower().strip()
        if "amazon" in raw:
            return "Amazon"
        if "newegg" in raw:
            return "Newegg"
        if "b&h" in raw or "bhphotovideo" in raw or "b & h" in raw:
            return "B&H"
        if "adorama" in raw:
            return "Adorama"
        if "bestbuy" in raw or "best buy" in raw:
            return "Best Buy"
        if "walmart" in raw:
            return "Walmart"
        if "microcenter" in raw or "micro center" in raw:
            return "Micro Center"
        return raw.title() or "Unknown"


def main():
    parser = argparse.ArgumentParser(
        description="Scrape GPU prices from PCPartPicker, eBay, and Newegg"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Scrape prices but do NOT write to Supabase (for testing)",
    )
    parser.add_argument(
        "--gpu",
        metavar="GPU_NAME",
        help='Only scrape a single GPU, e.g. --gpu "NVIDIA RTX 4090"',
    )
    args = parser.parse_args()

    scraper = GpuPriceScraper(dry_run=args.dry_run, target_gpu=args.gpu)
    scraper.scrape_all()
    scraper.save_to_supabase()


if __name__ == "__main__":
    main()
