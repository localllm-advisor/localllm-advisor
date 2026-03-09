#!/usr/bin/env python3
"""
GPU Price Scraper for LocalLLM Advisor
Scrapes GPU prices from Newegg and Amazon, stores in Supabase.

Usage:
  python scripts/scrape_gpu_prices.py [--dry-run]

Environment variables:
  SUPABASE_URL - Supabase project URL
  SUPABASE_SERVICE_KEY - Supabase service role key (not anon key)
"""

import os
import re
import sys
import json
import time
import random
import argparse
from datetime import datetime
from typing import Optional
from dataclasses import dataclass
from urllib.parse import quote_plus

import requests
from bs4 import BeautifulSoup

# GPU models to track (must match public/data/gpus.json names exactly!)
GPU_MODELS = [
    # NVIDIA RTX 50 series
    "NVIDIA RTX 5090",
    "NVIDIA RTX 5080",
    "NVIDIA RTX 5070 Ti",
    "NVIDIA RTX 5070",
    # NVIDIA RTX 40 series
    "NVIDIA RTX 4090",
    "NVIDIA RTX 4080 SUPER",
    "NVIDIA RTX 4080",
    "NVIDIA RTX 4070 Ti SUPER",
    "NVIDIA RTX 4070 Ti",
    "NVIDIA RTX 4070 SUPER",
    "NVIDIA RTX 4070",
    "NVIDIA RTX 4060 Ti 16GB",
    "NVIDIA RTX 4060 Ti 8GB",
    "NVIDIA RTX 4060",
    # NVIDIA RTX 30 series
    "NVIDIA RTX 3090 Ti",
    "NVIDIA RTX 3090",
    "NVIDIA RTX 3080 Ti",
    "NVIDIA RTX 3080 12GB",
    "NVIDIA RTX 3080 10GB",
    "NVIDIA RTX 3070 Ti",
    "NVIDIA RTX 3070",
    "NVIDIA RTX 3060 Ti",
    "NVIDIA RTX 3060 12GB",
    # AMD RX 7000 series
    "AMD RX 7900 XTX",
    "AMD RX 7900 XT",
    "AMD RX 7900 GRE",
    "AMD RX 7800 XT",
    "AMD RX 7700 XT",
    "AMD RX 7600 XT",
    "AMD RX 7600",
]

# Search query mappings (GPU name -> search terms)
SEARCH_QUERIES = {
    # RTX 50 series
    "NVIDIA RTX 5090": "RTX 5090",
    "NVIDIA RTX 5080": "RTX 5080",
    "NVIDIA RTX 5070 Ti": "RTX 5070 Ti",
    "NVIDIA RTX 5070": "RTX 5070 -Ti",
    # RTX 40 series
    "NVIDIA RTX 4090": "RTX 4090",
    "NVIDIA RTX 4080 SUPER": "RTX 4080 SUPER",
    "NVIDIA RTX 4080": "RTX 4080 -SUPER",
    "NVIDIA RTX 4070 Ti SUPER": "RTX 4070 Ti SUPER",
    "NVIDIA RTX 4070 Ti": "RTX 4070 Ti -SUPER",
    "NVIDIA RTX 4070 SUPER": "RTX 4070 SUPER",
    "NVIDIA RTX 4070": "RTX 4070 -Ti -SUPER",
    "NVIDIA RTX 4060 Ti 16GB": "RTX 4060 Ti 16GB",
    "NVIDIA RTX 4060 Ti 8GB": "RTX 4060 Ti 8GB",
    "NVIDIA RTX 4060": "RTX 4060 -Ti",
    # RTX 30 series
    "NVIDIA RTX 3090 Ti": "RTX 3090 Ti",
    "NVIDIA RTX 3090": "RTX 3090 -Ti",
    "NVIDIA RTX 3080 Ti": "RTX 3080 Ti",
    "NVIDIA RTX 3080 12GB": "RTX 3080 12GB",
    "NVIDIA RTX 3080 10GB": "RTX 3080 10GB",
    "NVIDIA RTX 3070 Ti": "RTX 3070 Ti",
    "NVIDIA RTX 3070": "RTX 3070 -Ti",
    "NVIDIA RTX 3060 Ti": "RTX 3060 Ti",
    "NVIDIA RTX 3060 12GB": "RTX 3060 12GB",
    # AMD RX 7000 series
    "AMD RX 7900 XTX": "RX 7900 XTX",
    "AMD RX 7900 XT": "RX 7900 XT -XTX",
    "AMD RX 7900 GRE": "RX 7900 GRE",
    "AMD RX 7800 XT": "RX 7800 XT",
    "AMD RX 7700 XT": "RX 7700 XT",
    "AMD RX 7600 XT": "RX 7600 XT",
    "AMD RX 7600": "RX 7600 -XT",
}

@dataclass
class PriceResult:
    gpu_name: str
    price_usd: int
    retailer: str
    retailer_url: str
    in_stock: bool


class GpuPriceScraper:
    """Scrapes GPU prices from various retailers."""

    USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    ]

    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.session = requests.Session()
        self.results: list[PriceResult] = []

    def _get_headers(self) -> dict:
        return {
            "User-Agent": random.choice(self.USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }

    def _delay(self):
        """Random delay between requests to avoid rate limiting."""
        time.sleep(random.uniform(1.5, 3.0))

    def scrape_newegg(self, gpu_name: str) -> Optional[PriceResult]:
        """Scrape price from Newegg."""
        search_query = SEARCH_QUERIES.get(gpu_name, gpu_name)
        url = f"https://www.newegg.com/p/pl?d={quote_plus(search_query)}&N=100007709"

        try:
            response = self.session.get(url, headers=self._get_headers(), timeout=15)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # Find product items
            items = soup.select(".item-cell, .item-container")

            for item in items[:5]:  # Check first 5 results
                # Get price
                price_elem = item.select_one(".price-current strong")
                if not price_elem:
                    continue

                price_text = price_elem.get_text(strip=True)
                price_match = re.search(r"[\d,]+", price_text)
                if not price_match:
                    continue

                price = int(price_match.group().replace(",", ""))

                # Skip unrealistic prices
                if price < 100 or price > 5000:
                    continue

                # Get product link
                link_elem = item.select_one("a.item-title, a.item-img")
                product_url = link_elem.get("href", url) if link_elem else url

                # Check stock status
                stock_elem = item.select_one(".item-promo")
                in_stock = not (stock_elem and "OUT OF STOCK" in stock_elem.get_text().upper())

                return PriceResult(
                    gpu_name=gpu_name,
                    price_usd=price,
                    retailer="newegg",
                    retailer_url=product_url,
                    in_stock=in_stock,
                )

        except Exception as e:
            print(f"  [Newegg] Error scraping {gpu_name}: {e}")

        return None

    def scrape_amazon(self, gpu_name: str) -> Optional[PriceResult]:
        """Scrape price from Amazon."""
        search_query = SEARCH_QUERIES.get(gpu_name, gpu_name)
        url = f"https://www.amazon.com/s?k={quote_plus(search_query + ' graphics card')}"

        try:
            response = self.session.get(url, headers=self._get_headers(), timeout=15)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # Find product items
            items = soup.select("[data-component-type='s-search-result']")

            for item in items[:5]:
                # Skip sponsored items
                if item.select_one("[data-component-type='sp-sponsored-result']"):
                    continue

                # Get price (whole and fraction)
                price_whole = item.select_one(".a-price-whole")
                if not price_whole:
                    continue

                price_text = price_whole.get_text(strip=True).replace(",", "").replace(".", "")
                try:
                    price = int(price_text)
                except ValueError:
                    continue

                # Skip unrealistic prices
                if price < 100 or price > 5000:
                    continue

                # Get product link
                link_elem = item.select_one("a.a-link-normal.s-no-outline")
                product_url = "https://www.amazon.com" + link_elem.get("href", "") if link_elem else url

                return PriceResult(
                    gpu_name=gpu_name,
                    price_usd=price,
                    retailer="amazon",
                    retailer_url=product_url,
                    in_stock=True,  # Amazon typically only shows in-stock items
                )

        except Exception as e:
            print(f"  [Amazon] Error scraping {gpu_name}: {e}")

        return None

    def scrape_all(self):
        """Scrape prices for all GPU models."""
        print(f"Starting GPU price scrape at {datetime.now().isoformat()}")
        print(f"Dry run: {self.dry_run}")
        print(f"Tracking {len(GPU_MODELS)} GPU models\n")

        for gpu_name in GPU_MODELS:
            print(f"Scraping: {gpu_name}")

            # Try Newegg first
            result = self.scrape_newegg(gpu_name)
            if result:
                self.results.append(result)
                print(f"  [Newegg] ${result.price_usd} {'(in stock)' if result.in_stock else '(out of stock)'}")
            else:
                print(f"  [Newegg] No price found")

            self._delay()

            # Try Amazon
            result = self.scrape_amazon(gpu_name)
            if result:
                self.results.append(result)
                print(f"  [Amazon] ${result.price_usd}")
            else:
                print(f"  [Amazon] No price found")

            self._delay()

        print(f"\nTotal prices scraped: {len(self.results)}")

    def save_to_supabase(self):
        """Save results to Supabase."""
        if self.dry_run:
            print("\n[DRY RUN] Would save the following to Supabase:")
            for r in self.results:
                print(f"  {r.gpu_name} @ {r.retailer}: ${r.price_usd}")
            return

        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")

        if not supabase_url or not supabase_key:
            print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
            sys.exit(1)

        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates",  # Upsert behavior
        }

        # Prepare data for insertion
        today = datetime.now().strftime("%Y-%m-%d")
        data = [
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

        # Insert into Supabase
        response = requests.post(
            f"{supabase_url}/rest/v1/gpu_prices",
            headers=headers,
            json=data,
        )

        if response.status_code in (200, 201):
            print(f"\nSuccessfully saved {len(data)} price records to Supabase")
        else:
            print(f"\nError saving to Supabase: {response.status_code}")
            print(response.text)
            sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Scrape GPU prices")
    parser.add_argument("--dry-run", action="store_true", help="Don't save to database")
    args = parser.parse_args()

    scraper = GpuPriceScraper(dry_run=args.dry_run)
    scraper.scrape_all()
    scraper.save_to_supabase()


if __name__ == "__main__":
    main()
