#!/usr/bin/env python3
"""
GPU Scraper for LocalLLM Advisor

Scrapes GPU specifications from TechPowerUp and prices from PCPartPicker.
Outputs a complete gpus.json for the hardware recommendation engine.

Usage:
    python scripts/scrape_gpus.py [--specs-only] [--prices-only] [--output gpus.json]

Requirements:
    pip install requests beautifulsoup4 lxml
"""

import argparse
import json
import re
import time
import random
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from bs4 import BeautifulSoup

# ============================================================================
# Configuration
# ============================================================================

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

# GPUs we care about for LLM inference (consumer + prosumer)
TARGET_GPUS = {
    'nvidia': [
        # RTX 50 Series (Blackwell)
        'RTX 5090', 'RTX 5080', 'RTX 5070 Ti', 'RTX 5070',
        # RTX 40 Series (Ada Lovelace)
        'RTX 4090', 'RTX 4080 Super', 'RTX 4080', 'RTX 4070 Ti Super',
        'RTX 4070 Ti', 'RTX 4070 Super', 'RTX 4070',
        'RTX 4060 Ti 16 GB', 'RTX 4060 Ti', 'RTX 4060',
        # RTX 30 Series (Ampere)
        'RTX 3090 Ti', 'RTX 3090', 'RTX 3080 Ti', 'RTX 3080 12 GB', 'RTX 3080',
        'RTX 3070 Ti', 'RTX 3070', 'RTX 3060 Ti', 'RTX 3060 12 GB', 'RTX 3060',
        # Professional
        'RTX A6000', 'RTX A5000', 'RTX A4000',
        'RTX 6000 Ada', 'RTX 5000 Ada', 'RTX 4000 Ada',
    ],
    'amd': [
        # RX 9000 Series (RDNA4)
        'RX 9070 XT', 'RX 9070',
        # RX 7000 Series (RDNA3)
        'RX 7900 XTX', 'RX 7900 XT', 'RX 7900 GRE',
        'RX 7800 XT', 'RX 7700 XT', 'RX 7600 XT', 'RX 7600',
        # RX 6000 Series (RDNA2)
        'RX 6950 XT', 'RX 6900 XT', 'RX 6800 XT', 'RX 6800',
        'RX 6750 XT', 'RX 6700 XT', 'RX 6650 XT', 'RX 6600 XT', 'RX 6600',
        # Professional
        'Radeon PRO W7900', 'Radeon PRO W7800',
    ],
    'intel': [
        'Arc A770 16 GB', 'Arc A770 8 GB', 'Arc A750', 'Arc A580',
        'Arc A380', 'Arc B580',
    ],
}

# ============================================================================
# Data Classes
# ============================================================================

@dataclass
class GPUSpecs:
    name: str
    vendor: str
    aliases: list

    # Pricing
    price_usd: Optional[int] = None
    price_eur: Optional[int] = None
    affiliate_url: Optional[str] = None
    availability: str = 'available'  # available, preorder, used_only, discontinued

    # Memory
    vram_mb: int = 0
    bandwidth_gbps: float = 0
    memory_type: str = 'GDDR6'

    # Compute (NVIDIA)
    cuda_cores: Optional[int] = None
    tensor_cores: Optional[int] = None

    # Compute (AMD)
    stream_processors: Optional[int] = None
    compute_units: Optional[int] = None

    # Compute (Intel)
    xe_cores: Optional[int] = None

    # Compute (Apple)
    gpu_cores: Optional[int] = None

    # Performance
    fp16_tflops: Optional[float] = None
    fp32_tflops: Optional[float] = None
    int8_tops: Optional[int] = None

    # Architecture
    architecture: str = ''
    compute_capability: Optional[str] = None

    # Interface
    pcie_gen: Optional[int] = None
    pcie_lanes: Optional[int] = None

    # Power
    tdp_watts: Optional[int] = None


# ============================================================================
# TechPowerUp Scraper (Specs)
# ============================================================================

class TechPowerUpScraper:
    """Scrape GPU specs from TechPowerUp GPU Database"""

    BASE_URL = 'https://www.techpowerup.com'
    SEARCH_URL = f'{BASE_URL}/gpu-specs/'

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    def search_gpu(self, query: str) -> Optional[str]:
        """Search for a GPU and return its detail page URL"""
        params = {'sort': 'name', 'q': query}

        try:
            resp = self.session.get(self.SEARCH_URL, params=params, timeout=10)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'lxml')

            # Find the table with results
            table = soup.find('table', class_='processors')
            if not table:
                return None

            # Get first matching result
            rows = table.find_all('tr')[1:]  # Skip header
            for row in rows:
                cells = row.find_all('td')
                if len(cells) >= 1:
                    link = cells[0].find('a')
                    if link and query.lower() in link.text.lower():
                        return self.BASE_URL + link['href']

            return None

        except Exception as e:
            print(f"  Error searching for {query}: {e}")
            return None

    def get_gpu_specs(self, url: str) -> Optional[dict]:
        """Scrape specs from a GPU detail page"""
        try:
            resp = self.session.get(url, timeout=10)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'lxml')

            specs = {}

            # Get GPU name
            title = soup.find('h1', class_='gpudb-name')
            if title:
                specs['name'] = title.text.strip()

            # Parse spec sections
            sections = soup.find_all('section', class_='details')
            for section in sections:
                rows = section.find_all('dl')
                for row in rows:
                    dt = row.find('dt')
                    dd = row.find('dd')
                    if dt and dd:
                        key = dt.text.strip().lower()
                        value = dd.text.strip()
                        specs[key] = value

            return specs

        except Exception as e:
            print(f"  Error fetching specs from {url}: {e}")
            return None

    def parse_specs(self, raw_specs: dict, vendor: str) -> Optional[GPUSpecs]:
        """Convert raw specs to GPUSpecs object"""
        if not raw_specs:
            return None

        name = raw_specs.get('name', '')

        # Parse VRAM
        vram_mb = 0
        memory_str = raw_specs.get('memory size', '')
        match = re.search(r'(\d+)\s*(GB|MB)', memory_str, re.I)
        if match:
            val = int(match.group(1))
            unit = match.group(2).upper()
            vram_mb = val * 1024 if unit == 'GB' else val

        # Parse bandwidth
        bandwidth = 0
        bw_str = raw_specs.get('bandwidth', '')
        match = re.search(r'([\d.]+)\s*GB/s', bw_str, re.I)
        if match:
            bandwidth = float(match.group(1))

        # Parse memory type
        mem_type = 'GDDR6'
        mem_type_str = raw_specs.get('memory type', '')
        for t in ['HBM3', 'HBM2e', 'HBM2', 'GDDR7', 'GDDR6X', 'GDDR6', 'GDDR5']:
            if t.lower() in mem_type_str.lower():
                mem_type = t
                break

        # Parse shaders/cores
        cuda_cores = None
        stream_processors = None
        shaders_str = raw_specs.get('shading units', '')
        match = re.search(r'(\d+)', shaders_str.replace(',', ''))
        if match:
            cores = int(match.group(1))
            if vendor == 'nvidia':
                cuda_cores = cores
            elif vendor == 'amd':
                stream_processors = cores

        # Parse compute units (AMD)
        compute_units = None
        cu_str = raw_specs.get('compute units', '')
        match = re.search(r'(\d+)', cu_str)
        if match:
            compute_units = int(match.group(1))

        # Parse tensor cores (NVIDIA)
        tensor_cores = None
        tc_str = raw_specs.get('tensor cores', '')
        match = re.search(r'(\d+)', tc_str)
        if match:
            tensor_cores = int(match.group(1))

        # Parse FP16 TFLOPS
        fp16_tflops = None
        fp16_str = raw_specs.get('fp16 (half)', raw_specs.get('pixel rate', ''))
        match = re.search(r'([\d.]+)\s*TFLOPS', fp16_str, re.I)
        if match:
            fp16_tflops = float(match.group(1))

        # Parse FP32 TFLOPS
        fp32_tflops = None
        fp32_str = raw_specs.get('fp32 (float)', raw_specs.get('float performance', ''))
        match = re.search(r'([\d.]+)\s*TFLOPS', fp32_str, re.I)
        if match:
            fp32_tflops = float(match.group(1))

        # Parse TDP
        tdp = None
        tdp_str = raw_specs.get('tdp', raw_specs.get('power', ''))
        match = re.search(r'(\d+)\s*W', tdp_str)
        if match:
            tdp = int(match.group(1))

        # Parse architecture
        arch = raw_specs.get('architecture', raw_specs.get('gpu', ''))

        # Generate aliases
        aliases = self._generate_aliases(name)

        return GPUSpecs(
            name=name,
            vendor=vendor,
            aliases=aliases,
            vram_mb=vram_mb,
            bandwidth_gbps=bandwidth,
            memory_type=mem_type,
            cuda_cores=cuda_cores,
            stream_processors=stream_processors,
            compute_units=compute_units,
            tensor_cores=tensor_cores,
            fp16_tflops=fp16_tflops,
            fp32_tflops=fp32_tflops,
            tdp_watts=tdp,
            architecture=arch,
        )

    def _generate_aliases(self, name: str) -> list:
        """Generate search aliases for a GPU name"""
        aliases = []

        # Remove vendor prefix
        clean = re.sub(r'^(NVIDIA |AMD |Intel )', '', name, flags=re.I)
        aliases.append(clean)

        # Short versions
        short = re.sub(r'GeForce |Radeon |Arc ', '', clean, flags=re.I)
        if short != clean:
            aliases.append(short)

        # Without spaces
        no_space = short.replace(' ', '')
        if no_space != short:
            aliases.append(no_space)

        # Lowercase
        aliases.append(short.lower())

        return list(set(aliases))


# ============================================================================
# PCPartPicker Scraper (Prices)
# ============================================================================

class PCPartPickerScraper:
    """Scrape GPU prices from PCPartPicker"""

    BASE_URL = 'https://pcpartpicker.com'
    SEARCH_URL = f'{BASE_URL}/products/video-card/'

    REGIONS = {
        'us': {'url': 'https://pcpartpicker.com', 'currency': 'USD'},
        'uk': {'url': 'https://uk.pcpartpicker.com', 'currency': 'GBP'},
        'de': {'url': 'https://de.pcpartpicker.com', 'currency': 'EUR'},
        'fr': {'url': 'https://fr.pcpartpicker.com', 'currency': 'EUR'},
        'it': {'url': 'https://it.pcpartpicker.com', 'currency': 'EUR'},
    }

    def __init__(self, region: str = 'us'):
        self.region = region
        self.config = self.REGIONS.get(region, self.REGIONS['us'])
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    def search_gpu(self, query: str) -> list:
        """Search for a GPU and return price listings"""
        url = f"{self.config['url']}/products/video-card/"
        params = {'q': query}

        try:
            resp = self.session.get(url, params=params, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'lxml')

            results = []

            # Find product rows
            rows = soup.select('tr.tr__product')
            for row in rows:
                try:
                    # Product name
                    name_el = row.select_one('td.td__name a')
                    if not name_el:
                        continue
                    name = name_el.text.strip()

                    # Skip if doesn't match query
                    if not self._matches_query(name, query):
                        continue

                    # Price
                    price_el = row.select_one('td.td__price')
                    price = None
                    if price_el:
                        price_text = price_el.text.strip()
                        match = re.search(r'[\$€£]([\d,]+\.?\d*)', price_text)
                        if match:
                            price = float(match.group(1).replace(',', ''))

                    # Link
                    link = name_el.get('href', '')
                    if link and not link.startswith('http'):
                        link = self.config['url'] + link

                    results.append({
                        'name': name,
                        'price': price,
                        'currency': self.config['currency'],
                        'url': link,
                        'in_stock': price is not None,
                    })

                except Exception:
                    continue

            return results

        except Exception as e:
            print(f"  Error searching PCPartPicker for {query}: {e}")
            return []

    def _matches_query(self, name: str, query: str) -> bool:
        """Check if product name matches the search query"""
        name_lower = name.lower()
        query_lower = query.lower()

        # Extract key parts from query
        parts = query_lower.replace('-', ' ').split()

        # Must contain all significant parts
        return all(part in name_lower for part in parts if len(part) > 2)

    def get_best_price(self, query: str) -> Optional[dict]:
        """Get the best (lowest) price for a GPU"""
        results = self.search_gpu(query)

        if not results:
            return None

        # Filter to in-stock items
        in_stock = [r for r in results if r['in_stock'] and r['price']]

        if not in_stock:
            return None

        # Sort by price
        in_stock.sort(key=lambda x: x['price'])

        return in_stock[0]


# ============================================================================
# Amazon Scraper (Prices + Affiliate)
# ============================================================================

class AmazonScraper:
    """Scrape GPU prices from Amazon (with affiliate link support)"""

    REGIONS = {
        'us': {'url': 'https://www.amazon.com', 'currency': 'USD'},
        'uk': {'url': 'https://www.amazon.co.uk', 'currency': 'GBP'},
        'de': {'url': 'https://www.amazon.de', 'currency': 'EUR'},
        'fr': {'url': 'https://www.amazon.fr', 'currency': 'EUR'},
        'it': {'url': 'https://www.amazon.it', 'currency': 'EUR'},
        'es': {'url': 'https://www.amazon.es', 'currency': 'EUR'},
    }

    def __init__(self, region: str = 'us', affiliate_tag: str = None):
        self.region = region
        self.config = self.REGIONS.get(region, self.REGIONS['us'])
        self.affiliate_tag = affiliate_tag
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    def search_gpu(self, query: str) -> Optional[dict]:
        """Search Amazon for a GPU"""
        search_url = f"{self.config['url']}/s"
        params = {
            'k': f"{query} graphics card",
            'i': 'computers',
        }

        try:
            resp = self.session.get(search_url, params=params, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'lxml')

            # Find product cards
            results = soup.select('[data-component-type="s-search-result"]')

            for result in results[:5]:  # Check first 5 results
                try:
                    # Product title
                    title_el = result.select_one('h2 a span')
                    if not title_el:
                        continue
                    title = title_el.text.strip()

                    # Check if it matches
                    if not self._matches_query(title, query):
                        continue

                    # Price
                    price_el = result.select_one('.a-price .a-offscreen')
                    price = None
                    if price_el:
                        price_text = price_el.text.strip()
                        match = re.search(r'[\$€£]([\d,]+\.?\d*)', price_text)
                        if match:
                            price = float(match.group(1).replace(',', ''))

                    # ASIN for link
                    asin = result.get('data-asin', '')

                    # Build URL with affiliate tag
                    product_url = f"{self.config['url']}/dp/{asin}"
                    if self.affiliate_tag:
                        product_url += f"?tag={self.affiliate_tag}"

                    if price:
                        return {
                            'name': title,
                            'price': price,
                            'currency': self.config['currency'],
                            'url': product_url,
                            'asin': asin,
                        }

                except Exception:
                    continue

            return None

        except Exception as e:
            print(f"  Error searching Amazon for {query}: {e}")
            return None

    def _matches_query(self, title: str, query: str) -> bool:
        """Check if product title matches the query"""
        title_lower = title.lower()
        query_lower = query.lower()

        # Must contain key model identifiers
        parts = query_lower.replace('-', ' ').split()
        matches = sum(1 for part in parts if part in title_lower)

        return matches >= len(parts) * 0.7  # 70% match threshold


# ============================================================================
# Main Scraper
# ============================================================================

class GPUScraper:
    """Main GPU scraper combining multiple sources"""

    def __init__(self, affiliate_tag: str = None):
        self.tpu = TechPowerUpScraper()
        self.pcp_us = PCPartPickerScraper('us')
        self.pcp_de = PCPartPickerScraper('de')
        self.amazon_us = AmazonScraper('us', affiliate_tag)
        self.amazon_de = AmazonScraper('de', affiliate_tag)
        self.affiliate_tag = affiliate_tag

    def scrape_gpu(self, query: str, vendor: str) -> Optional[GPUSpecs]:
        """Scrape a single GPU's specs and prices"""
        print(f"  Scraping {query}...")

        # Get specs from TechPowerUp
        tpu_url = self.tpu.search_gpu(query)
        specs = None

        if tpu_url:
            raw_specs = self.tpu.get_gpu_specs(tpu_url)
            specs = self.tpu.parse_specs(raw_specs, vendor)

        if not specs:
            print(f"    Could not find specs for {query}")
            return None

        # Get prices
        time.sleep(random.uniform(1, 2))  # Rate limiting

        # Try PCPartPicker US
        pcp_result = self.pcp_us.get_best_price(query)
        if pcp_result:
            specs.price_usd = int(pcp_result['price'])

        time.sleep(random.uniform(0.5, 1))

        # Try PCPartPicker DE for EUR
        pcp_de_result = self.pcp_de.get_best_price(query)
        if pcp_de_result:
            specs.price_eur = int(pcp_de_result['price'])

        # Try Amazon for affiliate links
        if self.affiliate_tag:
            time.sleep(random.uniform(1, 2))
            amazon_result = self.amazon_us.search_gpu(query)
            if amazon_result:
                specs.affiliate_url = amazon_result['url']
                if not specs.price_usd:
                    specs.price_usd = int(amazon_result['price'])

        # Determine availability
        if specs.price_usd or specs.price_eur:
            specs.availability = 'available'
        else:
            # Check if it's an older card
            if any(x in query for x in ['3090', '3080', '3070', '3060', '6900', '6800']):
                specs.availability = 'used_only'
            else:
                specs.availability = 'available'

        return specs

    def scrape_all(self) -> list:
        """Scrape all target GPUs"""
        all_gpus = []

        for vendor, gpu_list in TARGET_GPUS.items():
            print(f"\nScraping {vendor.upper()} GPUs...")

            for gpu_name in gpu_list:
                try:
                    specs = self.scrape_gpu(gpu_name, vendor)
                    if specs:
                        all_gpus.append(specs)
                        print(f"    ✓ {specs.name}: ${specs.price_usd or 'N/A'} / €{specs.price_eur or 'N/A'}")

                    time.sleep(random.uniform(2, 4))  # Be nice to servers

                except Exception as e:
                    print(f"    ✗ Error scraping {gpu_name}: {e}")

        return all_gpus

    def to_json(self, gpus: list) -> str:
        """Convert GPU list to JSON"""
        # Convert to dicts and remove None values
        gpu_dicts = []
        for gpu in gpus:
            d = asdict(gpu)
            # Remove None values
            d = {k: v for k, v in d.items() if v is not None}
            gpu_dicts.append(d)

        return json.dumps(gpu_dicts, indent=2)


# ============================================================================
# Apple Silicon (Manual - no scraping needed)
# ============================================================================

APPLE_SILICON = [
    GPUSpecs(
        name="Apple M1 (8GB)", vendor="apple", aliases=["M1", "m1", "M1 8GB"],
        vram_mb=8192, bandwidth_gbps=68, memory_type="Unified",
        gpu_cores=8, fp16_tflops=2.6, fp32_tflops=2.6, architecture="M1", tdp_watts=20
    ),
    GPUSpecs(
        name="Apple M1 Pro (16GB)", vendor="apple", aliases=["M1 Pro", "m1 pro", "M1 Pro 16GB"],
        vram_mb=16384, bandwidth_gbps=200, memory_type="Unified",
        gpu_cores=16, fp16_tflops=5.2, fp32_tflops=5.2, architecture="M1 Pro", tdp_watts=30
    ),
    GPUSpecs(
        name="Apple M1 Max (32GB)", vendor="apple", aliases=["M1 Max", "m1 max", "M1 Max 32GB"],
        vram_mb=32768, bandwidth_gbps=400, memory_type="Unified",
        gpu_cores=32, fp16_tflops=10.4, fp32_tflops=10.4, architecture="M1 Max", tdp_watts=60
    ),
    GPUSpecs(
        name="Apple M1 Ultra (64GB)", vendor="apple", aliases=["M1 Ultra", "m1 ultra", "M1 Ultra 64GB"],
        vram_mb=65536, bandwidth_gbps=800, memory_type="Unified",
        gpu_cores=64, fp16_tflops=21, fp32_tflops=21, architecture="M1 Ultra", tdp_watts=100
    ),
    GPUSpecs(
        name="Apple M2 (8GB)", vendor="apple", aliases=["M2", "m2", "M2 8GB"],
        vram_mb=8192, bandwidth_gbps=100, memory_type="Unified",
        gpu_cores=10, fp16_tflops=3.6, fp32_tflops=3.6, architecture="M2", tdp_watts=22
    ),
    GPUSpecs(
        name="Apple M2 Pro (16GB)", vendor="apple", aliases=["M2 Pro", "m2 pro", "M2 Pro 16GB"],
        vram_mb=16384, bandwidth_gbps=200, memory_type="Unified",
        gpu_cores=19, fp16_tflops=6.8, fp32_tflops=6.8, architecture="M2 Pro", tdp_watts=30
    ),
    GPUSpecs(
        name="Apple M2 Max (32GB)", vendor="apple", aliases=["M2 Max", "m2 max", "M2 Max 32GB"],
        vram_mb=32768, bandwidth_gbps=400, memory_type="Unified",
        gpu_cores=38, fp16_tflops=13.6, fp32_tflops=13.6, architecture="M2 Max", tdp_watts=60
    ),
    GPUSpecs(
        name="Apple M2 Ultra (64GB)", vendor="apple", aliases=["M2 Ultra", "m2 ultra", "M2 Ultra 64GB"],
        vram_mb=65536, bandwidth_gbps=800, memory_type="Unified",
        gpu_cores=76, fp16_tflops=27.2, fp32_tflops=27.2, architecture="M2 Ultra", tdp_watts=100
    ),
    GPUSpecs(
        name="Apple M3 (8GB)", vendor="apple", aliases=["M3", "m3", "M3 8GB"],
        vram_mb=8192, bandwidth_gbps=100, memory_type="Unified",
        gpu_cores=10, fp16_tflops=4.1, fp32_tflops=4.1, architecture="M3", tdp_watts=22
    ),
    GPUSpecs(
        name="Apple M3 Pro (18GB)", vendor="apple", aliases=["M3 Pro", "m3 pro", "M3 Pro 18GB"],
        vram_mb=18432, bandwidth_gbps=150, memory_type="Unified",
        gpu_cores=18, fp16_tflops=7.4, fp32_tflops=7.4, architecture="M3 Pro", tdp_watts=30
    ),
    GPUSpecs(
        name="Apple M3 Max (36GB)", vendor="apple", aliases=["M3 Max", "m3 max", "M3 Max 36GB"],
        vram_mb=36864, bandwidth_gbps=300, memory_type="Unified",
        gpu_cores=40, fp16_tflops=16.4, fp32_tflops=16.4, architecture="M3 Max", tdp_watts=60
    ),
    GPUSpecs(
        name="Apple M3 Max (48GB)", vendor="apple", aliases=["M3 Max 48GB", "m3 max 48"],
        vram_mb=49152, bandwidth_gbps=400, memory_type="Unified",
        gpu_cores=40, fp16_tflops=16.4, fp32_tflops=16.4, architecture="M3 Max", tdp_watts=60
    ),
    GPUSpecs(
        name="Apple M4 (16GB)", vendor="apple", aliases=["M4", "m4", "M4 16GB"],
        vram_mb=16384, bandwidth_gbps=120, memory_type="Unified",
        gpu_cores=10, fp16_tflops=4.6, fp32_tflops=4.6, architecture="M4", tdp_watts=22
    ),
    GPUSpecs(
        name="Apple M4 Pro (24GB)", vendor="apple", aliases=["M4 Pro", "m4 pro", "M4 Pro 24GB"],
        vram_mb=24576, bandwidth_gbps=273, memory_type="Unified",
        gpu_cores=20, fp16_tflops=9.2, fp32_tflops=9.2, architecture="M4 Pro", tdp_watts=30
    ),
    GPUSpecs(
        name="Apple M4 Pro (48GB)", vendor="apple", aliases=["M4 Pro 48GB", "m4 pro 48"],
        vram_mb=49152, bandwidth_gbps=273, memory_type="Unified",
        gpu_cores=20, fp16_tflops=9.2, fp32_tflops=9.2, architecture="M4 Pro", tdp_watts=30
    ),
    GPUSpecs(
        name="Apple M4 Max (48GB)", vendor="apple", aliases=["M4 Max", "m4 max", "M4 Max 48GB"],
        vram_mb=49152, bandwidth_gbps=546, memory_type="Unified",
        gpu_cores=40, fp16_tflops=18.4, fp32_tflops=18.4, architecture="M4 Max", tdp_watts=60
    ),
    GPUSpecs(
        name="Apple M4 Max (64GB)", vendor="apple", aliases=["M4 Max 64GB", "m4 max 64"],
        vram_mb=65536, bandwidth_gbps=546, memory_type="Unified",
        gpu_cores=40, fp16_tflops=18.4, fp32_tflops=18.4, architecture="M4 Max", tdp_watts=60
    ),
    GPUSpecs(
        name="Apple M4 Max (128GB)", vendor="apple", aliases=["M4 Max 128GB", "m4 max 128"],
        vram_mb=131072, bandwidth_gbps=546, memory_type="Unified",
        gpu_cores=40, fp16_tflops=18.4, fp32_tflops=18.4, architecture="M4 Max", tdp_watts=60
    ),
]


# ============================================================================
# CLI
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='Scrape GPU specs and prices')
    parser.add_argument('--output', '-o', default='public/data/gpus.json',
                        help='Output JSON file path')
    parser.add_argument('--affiliate-tag', '-a', default=None,
                        help='Amazon affiliate tag for buy links')
    parser.add_argument('--specs-only', action='store_true',
                        help='Only scrape specs, skip prices')
    parser.add_argument('--prices-only', action='store_true',
                        help='Only update prices in existing file')
    parser.add_argument('--test', action='store_true',
                        help='Test mode: scrape only 3 GPUs')

    args = parser.parse_args()

    print("=" * 60)
    print("GPU Scraper for LocalLLM Advisor")
    print("=" * 60)

    scraper = GPUScraper(affiliate_tag=args.affiliate_tag)

    if args.test:
        # Test mode: just scrape a few GPUs
        print("\nTest mode: scraping 3 sample GPUs...")
        test_gpus = [
            ('RTX 4090', 'nvidia'),
            ('RX 7900 XTX', 'amd'),
            ('Arc A770', 'intel'),
        ]
        gpus = []
        for name, vendor in test_gpus:
            specs = scraper.scrape_gpu(name, vendor)
            if specs:
                gpus.append(specs)
    else:
        # Full scrape
        gpus = scraper.scrape_all()

    # Add Apple Silicon (no scraping needed)
    gpus.extend(APPLE_SILICON)

    print(f"\n{'=' * 60}")
    print(f"Scraped {len(gpus)} GPUs total")

    # Save to file
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    json_output = scraper.to_json(gpus)
    output_path.write_text(json_output)

    print(f"Saved to {output_path}")
    print("=" * 60)


if __name__ == '__main__':
    main()
