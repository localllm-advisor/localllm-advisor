#!/usr/bin/env python3
"""
GPU Price Updater for LocalLLM Advisor

Updates USD prices in gpus.json from Newegg.

Usage:
    python scripts/update_gpu_prices.py

Requirements:
    pip install requests beautifulsoup4 lxml
"""

import argparse
import json
import re
import time
import random
from pathlib import Path

import requests
from bs4 import BeautifulSoup

session = requests.Session()

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
}

# GPU search queries mapped to our GPU names
GPU_SEARCH_MAP = {
    # NVIDIA RTX 50
    "NVIDIA RTX 5090": "RTX 5090",
    "NVIDIA RTX 5080": "RTX 5080",
    "NVIDIA RTX 5070 Ti": "RTX 5070 Ti",
    "NVIDIA RTX 5070": "RTX 5070",
    # NVIDIA RTX 40
    "NVIDIA RTX 4090": "RTX 4090",
    "NVIDIA RTX 4080 SUPER": "RTX 4080 Super",
    "NVIDIA RTX 4080": "RTX 4080",
    "NVIDIA RTX 4070 Ti SUPER": "RTX 4070 Ti Super",
    "NVIDIA RTX 4070 Ti": "RTX 4070 Ti",
    "NVIDIA RTX 4070 SUPER": "RTX 4070 Super",
    "NVIDIA RTX 4070": "RTX 4070",
    "NVIDIA RTX 4060 Ti 16GB": "RTX 4060 Ti 16GB",
    "NVIDIA RTX 4060 Ti 8GB": "RTX 4060 Ti",
    "NVIDIA RTX 4060": "RTX 4060",
    # NVIDIA RTX 30
    "NVIDIA RTX 3090 Ti": "RTX 3090 Ti",
    "NVIDIA RTX 3090": "RTX 3090",
    "NVIDIA RTX 3080 12GB": "RTX 3080 12GB",
    "NVIDIA RTX 3080 10GB": "RTX 3080",
    "NVIDIA RTX 3070 Ti": "RTX 3070 Ti",
    "NVIDIA RTX 3070": "RTX 3070",
    "NVIDIA RTX 3060 Ti": "RTX 3060 Ti",
    "NVIDIA RTX 3060 12GB": "RTX 3060",
    # AMD RX 7000
    "AMD RX 7900 XTX": "RX 7900 XTX",
    "AMD RX 7900 XT": "RX 7900 XT",
    "AMD RX 7900 GRE": "RX 7900 GRE",
    "AMD RX 7800 XT": "RX 7800 XT",
    "AMD RX 7700 XT": "RX 7700 XT",
    "AMD RX 7600": "RX 7600",
    # AMD RX 6000
    "AMD RX 6900 XT": "RX 6900 XT",
    "AMD RX 6800 XT": "RX 6800 XT",
    "AMD RX 6800": "RX 6800",
    # Intel Arc
    "Intel Arc A770 16GB": "Arc A770",
    "Intel Arc A750": "Arc A750",
}


def search_newegg(query: str) -> dict | None:
    """Search Newegg for GPU prices (USD)"""
    search_url = f"https://www.newegg.com/p/pl?d={query.replace(' ', '+')}&N=100007709"

    try:
        resp = session.get(search_url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'lxml')

        products = soup.select('.item-cell')

        for product in products[:5]:
            name_el = product.select_one('.item-title')
            price_el = product.select_one('.price-current')

            if not name_el or not price_el:
                continue

            name = name_el.text.strip()

            # Check match
            query_parts = query.lower().split()
            if not all(part in name.lower() for part in query_parts):
                continue

            # Extract price
            strong = price_el.select_one('strong')
            sup = price_el.select_one('sup')

            if strong:
                dollars = strong.text.replace(',', '').replace('.', '')
                cents = sup.text.replace('.', '') if sup else '00'
                try:
                    price = float(f"{dollars}.{cents}")
                    return {
                        'price_usd': int(price),
                        'source': 'newegg',
                        'name': name,
                    }
                except ValueError:
                    continue

        return None

    except Exception as e:
        print(f"    Error: {e}")
        return None


def update_prices(gpus_file: str):
    """Update USD prices in gpus.json"""

    gpus_path = Path(gpus_file)
    if not gpus_path.exists():
        print(f"Error: {gpus_file} not found")
        return

    gpus = json.loads(gpus_path.read_text())

    print(f"Updating prices for {len(gpus)} GPUs...\n")

    updated = 0

    for gpu in gpus:
        name = gpu.get('name', '')
        vendor = gpu.get('vendor', '')

        # Skip Apple Silicon (not sold separately)
        if vendor == 'apple':
            continue

        search_query = GPU_SEARCH_MAP.get(name, name)

        usd_result = search_newegg(search_query)
        if usd_result:
            old_price = gpu.get('price_usd')
            gpu['price_usd'] = usd_result['price_usd']
            if old_price and old_price != usd_result['price_usd']:
                diff = usd_result['price_usd'] - old_price
                print(f"  {name}: ${usd_result['price_usd']} ({'+' if diff > 0 else ''}{diff})")
            else:
                print(f"  {name}: ${usd_result['price_usd']}")
            updated += 1
        else:
            print(f"  {name}: no price found")

        time.sleep(random.uniform(1, 2))

    # Save
    gpus_path.write_text(json.dumps(gpus, indent=2))

    print(f"\n{'=' * 50}")
    print(f"Updated {updated} GPUs")
    print(f"Saved to {gpus_file}")


def main():
    parser = argparse.ArgumentParser(description='Update GPU prices from Newegg (USD)')
    parser.add_argument('--file', '-f', default='public/data/gpus.json',
                        help='Path to gpus.json')

    args = parser.parse_args()

    print("GPU Price Updater (Newegg USD)")
    print("=" * 50)

    update_prices(args.file)


if __name__ == '__main__':
    main()
