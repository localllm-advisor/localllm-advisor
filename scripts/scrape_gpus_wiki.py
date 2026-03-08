#!/usr/bin/env python3
"""
GPU Scraper using Wikipedia tables + price APIs

Wikipedia has well-structured GPU comparison tables that don't block bots.
"""

import json
import re
import time
import random
from pathlib import Path
from dataclasses import dataclass, asdict, field
from typing import Optional

import requests
from bs4 import BeautifulSoup

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; LocalLLMAdvisor/1.0; +https://github.com/localllm-advisor)',
}

# ============================================================================
# Wikipedia GPU Tables
# ============================================================================

WIKI_PAGES = {
    'nvidia_geforce_40': 'https://en.wikipedia.org/wiki/GeForce_40_series',
    'nvidia_geforce_30': 'https://en.wikipedia.org/wiki/GeForce_30_series',
    'nvidia_geforce_50': 'https://en.wikipedia.org/wiki/GeForce_50_series',
    'amd_rx_7000': 'https://en.wikipedia.org/wiki/Radeon_RX_7000_series',
    'amd_rx_6000': 'https://en.wikipedia.org/wiki/Radeon_RX_6000_series',
    'intel_arc': 'https://en.wikipedia.org/wiki/Intel_Arc',
}

@dataclass
class GPU:
    name: str
    vendor: str
    aliases: list = field(default_factory=list)

    # Pricing
    price_usd: Optional[int] = None
    price_eur: Optional[int] = None
    availability: str = 'available'

    # Memory
    vram_mb: int = 0
    bandwidth_gbps: float = 0
    memory_type: str = 'GDDR6'

    # Compute
    cuda_cores: Optional[int] = None
    stream_processors: Optional[int] = None
    compute_units: Optional[int] = None
    tensor_cores: Optional[int] = None
    gpu_cores: Optional[int] = None

    # Performance
    fp16_tflops: Optional[float] = None
    fp32_tflops: Optional[float] = None

    # Architecture
    architecture: str = ''
    compute_capability: Optional[str] = None

    # Interface
    pcie_gen: Optional[int] = None
    pcie_lanes: Optional[int] = None

    # Power
    tdp_watts: Optional[int] = None


def parse_number(text: str) -> Optional[float]:
    """Extract number from text like '24 GB' or '1,008 GB/s'"""
    if not text:
        return None
    # Remove commas and extract number
    text = text.replace(',', '').replace('\u00a0', ' ')
    match = re.search(r'([\d.]+)', text)
    return float(match.group(1)) if match else None


def parse_vram(text: str) -> int:
    """Parse VRAM like '24 GB' to MB"""
    num = parse_number(text)
    if not num:
        return 0
    text_lower = text.lower()
    if 'gb' in text_lower:
        return int(num * 1024)
    elif 'mb' in text_lower:
        return int(num)
    return int(num * 1024)  # Assume GB


def parse_bandwidth(text: str) -> float:
    """Parse bandwidth like '1,008 GB/s' to GB/s"""
    num = parse_number(text)
    return num if num else 0


def parse_tflops(text: str) -> Optional[float]:
    """Parse TFLOPS like '82.58 TFLOPS'"""
    num = parse_number(text)
    return num if num else None


def scrape_nvidia_wiki(url: str, series: str) -> list[GPU]:
    """Scrape NVIDIA GPU specs from Wikipedia"""
    print(f"  Fetching {url}...")

    resp = requests.get(url, headers=HEADERS, timeout=30)
    soup = BeautifulSoup(resp.text, 'lxml')

    gpus = []

    # Find specification tables
    tables = soup.find_all('table', class_='wikitable')

    for table in tables:
        # Check if this is a specs table by looking for headers
        headers = table.find_all('th')
        header_text = ' '.join(h.get_text().lower() for h in headers)

        # Look for tables with memory and shader info
        if not ('memory' in header_text or 'shaders' in header_text or 'cuda' in header_text):
            continue

        # Get header indices
        header_row = table.find('tr')
        if not header_row:
            continue

        header_cells = header_row.find_all(['th', 'td'])
        col_map = {}

        for i, cell in enumerate(header_cells):
            text = cell.get_text().lower().strip()
            if 'model' in text or 'launch' in text:
                col_map['name'] = i
            elif 'cuda' in text or 'shader' in text or 'stream' in text:
                col_map['cores'] = i
            elif 'size' in text and 'memory' in text:
                col_map['vram'] = i
            elif 'bandwidth' in text:
                col_map['bandwidth'] = i
            elif 'bus' in text and 'memory' in text:
                col_map['bus'] = i
            elif 'tdp' in text or 'power' in text:
                col_map['tdp'] = i
            elif 'fp32' in text or 'tflops' in text:
                col_map['tflops'] = i

        # Parse rows
        rows = table.find_all('tr')[1:]  # Skip header

        for row in rows:
            cells = row.find_all(['td', 'th'])
            if len(cells) < 3:
                continue

            # Get GPU name
            name_idx = col_map.get('name', 0)
            if name_idx >= len(cells):
                continue

            name_cell = cells[name_idx]
            name = name_cell.get_text().strip()

            # Filter for RTX models
            if not name or 'rtx' not in name.lower():
                continue

            # Clean name
            name = re.sub(r'\[.*?\]', '', name).strip()
            name = re.sub(r'\s+', ' ', name)

            # Skip if doesn't look like a GPU name
            if len(name) < 5 or len(name) > 50:
                continue

            gpu = GPU(
                name=f"NVIDIA {name}" if not name.startswith('NVIDIA') else name,
                vendor='nvidia',
                aliases=[name, name.replace(' ', ''), name.lower()],
                architecture=series,
            )

            # Parse specs
            if 'cores' in col_map and col_map['cores'] < len(cells):
                cores = parse_number(cells[col_map['cores']].get_text())
                if cores:
                    gpu.cuda_cores = int(cores)

            if 'vram' in col_map and col_map['vram'] < len(cells):
                gpu.vram_mb = parse_vram(cells[col_map['vram']].get_text())

            if 'bandwidth' in col_map and col_map['bandwidth'] < len(cells):
                gpu.bandwidth_gbps = parse_bandwidth(cells[col_map['bandwidth']].get_text())

            if 'tdp' in col_map and col_map['tdp'] < len(cells):
                tdp = parse_number(cells[col_map['tdp']].get_text())
                if tdp:
                    gpu.tdp_watts = int(tdp)

            if 'tflops' in col_map and col_map['tflops'] < len(cells):
                gpu.fp32_tflops = parse_tflops(cells[col_map['tflops']].get_text())

            # Only add if we got meaningful data
            if gpu.vram_mb > 0 or gpu.cuda_cores:
                gpus.append(gpu)
                print(f"    Found: {gpu.name} - {gpu.vram_mb}MB, {gpu.cuda_cores} cores")

    return gpus


def scrape_amd_wiki(url: str, series: str) -> list[GPU]:
    """Scrape AMD GPU specs from Wikipedia"""
    print(f"  Fetching {url}...")

    resp = requests.get(url, headers=HEADERS, timeout=30)
    soup = BeautifulSoup(resp.text, 'lxml')

    gpus = []
    tables = soup.find_all('table', class_='wikitable')

    for table in tables:
        headers = table.find_all('th')
        header_text = ' '.join(h.get_text().lower() for h in headers)

        if not ('memory' in header_text or 'stream' in header_text or 'compute' in header_text):
            continue

        header_row = table.find('tr')
        if not header_row:
            continue

        header_cells = header_row.find_all(['th', 'td'])
        col_map = {}

        for i, cell in enumerate(header_cells):
            text = cell.get_text().lower().strip()
            if 'model' in text:
                col_map['name'] = i
            elif 'stream' in text or 'shader' in text:
                col_map['sp'] = i
            elif 'compute' in text and 'unit' in text:
                col_map['cu'] = i
            elif 'size' in text:
                col_map['vram'] = i
            elif 'bandwidth' in text:
                col_map['bandwidth'] = i
            elif 'tdp' in text or 'tbp' in text or 'power' in text:
                col_map['tdp'] = i

        rows = table.find_all('tr')[1:]

        for row in rows:
            cells = row.find_all(['td', 'th'])
            if len(cells) < 3:
                continue

            name_idx = col_map.get('name', 0)
            if name_idx >= len(cells):
                continue

            name = cells[name_idx].get_text().strip()
            name = re.sub(r'\[.*?\]', '', name).strip()

            if not name or 'rx' not in name.lower():
                continue

            if len(name) < 5 or len(name) > 50:
                continue

            gpu = GPU(
                name=f"AMD {name}" if not name.startswith('AMD') else name,
                vendor='amd',
                aliases=[name, name.replace(' ', ''), name.lower()],
                architecture=series,
            )

            if 'sp' in col_map and col_map['sp'] < len(cells):
                sp = parse_number(cells[col_map['sp']].get_text())
                if sp:
                    gpu.stream_processors = int(sp)

            if 'cu' in col_map and col_map['cu'] < len(cells):
                cu = parse_number(cells[col_map['cu']].get_text())
                if cu:
                    gpu.compute_units = int(cu)

            if 'vram' in col_map and col_map['vram'] < len(cells):
                gpu.vram_mb = parse_vram(cells[col_map['vram']].get_text())

            if 'bandwidth' in col_map and col_map['bandwidth'] < len(cells):
                gpu.bandwidth_gbps = parse_bandwidth(cells[col_map['bandwidth']].get_text())

            if 'tdp' in col_map and col_map['tdp'] < len(cells):
                tdp = parse_number(cells[col_map['tdp']].get_text())
                if tdp:
                    gpu.tdp_watts = int(tdp)

            if gpu.vram_mb > 0 or gpu.stream_processors:
                gpus.append(gpu)
                print(f"    Found: {gpu.name} - {gpu.vram_mb}MB, {gpu.stream_processors} SPs")

    return gpus


# ============================================================================
# Price Scraping (from previous script)
# ============================================================================

def search_pricewatch(query: str) -> dict:
    """Search multiple price sources"""
    prices = {}

    # Try Geizhals.de for EUR
    try:
        url = f"https://geizhals.de/?fs={query.replace(' ', '+')}&cat=gra16_512"
        resp = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(resp.text, 'lxml')

        products = soup.select('.productlist__product')
        for product in products[:3]:
            name_el = product.select_one('.productlist__name')
            price_el = product.select_one('.productlist__price')

            if name_el and price_el:
                name = name_el.text.strip().lower()
                if all(p in name for p in query.lower().split()[:2]):
                    match = re.search(r'€\s*([\d.,]+)', price_el.text)
                    if match:
                        price = float(match.group(1).replace('.', '').replace(',', '.'))
                        prices['eur'] = int(price)
                        break
    except Exception as e:
        print(f"      Geizhals error: {e}")

    return prices


# ============================================================================
# Main
# ============================================================================

def main():
    print("=" * 60)
    print("GPU Scraper (Wikipedia + Prices)")
    print("=" * 60)

    all_gpus = []

    # Scrape NVIDIA
    print("\nScraping NVIDIA GPUs from Wikipedia...")

    for name, url in WIKI_PAGES.items():
        if 'nvidia' not in name:
            continue

        series = name.replace('nvidia_geforce_', 'RTX ').upper()
        try:
            gpus = scrape_nvidia_wiki(url, series)
            all_gpus.extend(gpus)
            time.sleep(1)
        except Exception as e:
            print(f"  Error scraping {name}: {e}")

    # Scrape AMD
    print("\nScraping AMD GPUs from Wikipedia...")

    for name, url in WIKI_PAGES.items():
        if 'amd' not in name:
            continue

        series = name.replace('amd_rx_', 'RDNA').upper()
        try:
            gpus = scrape_amd_wiki(url, series)
            all_gpus.extend(gpus)
            time.sleep(1)
        except Exception as e:
            print(f"  Error scraping {name}: {e}")

    # Get prices
    print("\nFetching prices...")
    for gpu in all_gpus:
        # Simple search query
        query = gpu.name.replace('NVIDIA ', '').replace('AMD ', '')
        prices = search_pricewatch(query)

        if 'eur' in prices:
            gpu.price_eur = prices['eur']
            print(f"  {gpu.name}: €{gpu.price_eur}")

        time.sleep(0.5)

    # Convert to JSON
    print(f"\n{'=' * 60}")
    print(f"Found {len(all_gpus)} GPUs")

    # Save
    output = []
    for gpu in all_gpus:
        d = asdict(gpu)
        # Remove None values
        d = {k: v for k, v in d.items() if v is not None and v != 0 and v != []}
        output.append(d)

    output_path = Path('public/data/gpus_scraped.json')
    output_path.write_text(json.dumps(output, indent=2))
    print(f"Saved to {output_path}")


if __name__ == '__main__':
    main()
