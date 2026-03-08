#!/usr/bin/env python3
"""
GPU Scraper using Playwright (headless browser)

Bypasses anti-bot protection on TechPowerUp for reliable scraping.

Install:
    pip install playwright
    playwright install chromium

Usage:
    python scripts/scrape_gpus_playwright.py
"""

import asyncio
import json
import re
import time
from pathlib import Path
from dataclasses import dataclass, asdict, field
from typing import Optional

from playwright.async_api import async_playwright, Page

# ============================================================================
# GPU List to scrape
# ============================================================================

GPUS_TO_SCRAPE = [
    # NVIDIA RTX 50 Series
    ("geforce-rtx-5090", "nvidia", "Blackwell"),
    ("geforce-rtx-5080", "nvidia", "Blackwell"),
    ("geforce-rtx-5070-ti", "nvidia", "Blackwell"),
    ("geforce-rtx-5070", "nvidia", "Blackwell"),

    # NVIDIA RTX 40 Series
    ("geforce-rtx-4090", "nvidia", "Ada Lovelace"),
    ("geforce-rtx-4080-super", "nvidia", "Ada Lovelace"),
    ("geforce-rtx-4080", "nvidia", "Ada Lovelace"),
    ("geforce-rtx-4070-ti-super", "nvidia", "Ada Lovelace"),
    ("geforce-rtx-4070-ti", "nvidia", "Ada Lovelace"),
    ("geforce-rtx-4070-super", "nvidia", "Ada Lovelace"),
    ("geforce-rtx-4070", "nvidia", "Ada Lovelace"),
    ("geforce-rtx-4060-ti-16-gb", "nvidia", "Ada Lovelace"),
    ("geforce-rtx-4060-ti", "nvidia", "Ada Lovelace"),
    ("geforce-rtx-4060", "nvidia", "Ada Lovelace"),

    # NVIDIA RTX 30 Series
    ("geforce-rtx-3090-ti", "nvidia", "Ampere"),
    ("geforce-rtx-3090", "nvidia", "Ampere"),
    ("geforce-rtx-3080-ti", "nvidia", "Ampere"),
    ("geforce-rtx-3080-12-gb", "nvidia", "Ampere"),
    ("geforce-rtx-3080", "nvidia", "Ampere"),
    ("geforce-rtx-3070-ti", "nvidia", "Ampere"),
    ("geforce-rtx-3070", "nvidia", "Ampere"),
    ("geforce-rtx-3060-ti", "nvidia", "Ampere"),
    ("geforce-rtx-3060", "nvidia", "Ampere"),

    # AMD RX 7000 Series
    ("radeon-rx-7900-xtx", "amd", "RDNA3"),
    ("radeon-rx-7900-xt", "amd", "RDNA3"),
    ("radeon-rx-7900-gre", "amd", "RDNA3"),
    ("radeon-rx-7800-xt", "amd", "RDNA3"),
    ("radeon-rx-7700-xt", "amd", "RDNA3"),
    ("radeon-rx-7600-xt", "amd", "RDNA3"),
    ("radeon-rx-7600", "amd", "RDNA3"),

    # AMD RX 6000 Series
    ("radeon-rx-6950-xt", "amd", "RDNA2"),
    ("radeon-rx-6900-xt", "amd", "RDNA2"),
    ("radeon-rx-6800-xt", "amd", "RDNA2"),
    ("radeon-rx-6800", "amd", "RDNA2"),
    ("radeon-rx-6700-xt", "amd", "RDNA2"),
    ("radeon-rx-6600-xt", "amd", "RDNA2"),
    ("radeon-rx-6600", "amd", "RDNA2"),

    # Intel Arc
    ("intel-arc-a770-16-gb", "intel", "Alchemist"),
    ("intel-arc-a750", "intel", "Alchemist"),
    ("intel-arc-a580", "intel", "Alchemist"),
    ("intel-arc-b580", "intel", "Battlemage"),
]

# ============================================================================
# Data Class
# ============================================================================

@dataclass
class GPU:
    name: str
    vendor: str
    aliases: list = field(default_factory=list)

    price_usd: Optional[int] = None
    price_eur: Optional[int] = None
    availability: str = 'available'

    vram_mb: int = 0
    bandwidth_gbps: float = 0
    memory_type: str = 'GDDR6'

    cuda_cores: Optional[int] = None
    stream_processors: Optional[int] = None
    compute_units: Optional[int] = None
    tensor_cores: Optional[int] = None
    gpu_cores: Optional[int] = None

    fp16_tflops: Optional[float] = None
    fp32_tflops: Optional[float] = None
    int8_tops: Optional[int] = None

    architecture: str = ''
    compute_capability: Optional[str] = None

    pcie_gen: Optional[int] = None
    pcie_lanes: Optional[int] = None

    tdp_watts: Optional[int] = None


# ============================================================================
# Scraper
# ============================================================================

def parse_number(text: str) -> Optional[float]:
    """Extract number from text"""
    if not text:
        return None
    text = text.replace(',', '').replace('\u00a0', ' ').strip()
    match = re.search(r'([\d.]+)', text)
    return float(match.group(1)) if match else None


async def scrape_tpu_gpu(page: Page, slug: str, vendor: str, arch: str) -> Optional[GPU]:
    """Scrape a single GPU from TechPowerUp"""
    url = f"https://www.techpowerup.com/gpu-specs/{slug}.c0000"

    try:
        await page.goto(url, wait_until='networkidle', timeout=30000)

        # Wait for content to load
        await page.wait_for_selector('.gpudb-name', timeout=10000)

        # Get GPU name
        name_el = await page.query_selector('.gpudb-name')
        name = await name_el.inner_text() if name_el else slug

        # Create GPU object
        gpu = GPU(
            name=name,
            vendor=vendor,
            architecture=arch,
            aliases=[
                name,
                name.replace('NVIDIA ', '').replace('AMD ', '').replace('Intel ', ''),
                name.replace(' ', '').lower(),
            ]
        )

        # Parse specs from the details section
        spec_rows = await page.query_selector_all('.gpudb-specs-large dl, .details dl')

        for row in spec_rows:
            dt = await row.query_selector('dt')
            dd = await row.query_selector('dd')

            if not dt or not dd:
                continue

            key = (await dt.inner_text()).lower().strip()
            value = (await dd.inner_text()).strip()

            # Parse different spec fields
            if 'memory size' in key:
                num = parse_number(value)
                if num:
                    if 'gb' in value.lower():
                        gpu.vram_mb = int(num * 1024)
                    else:
                        gpu.vram_mb = int(num)

            elif 'memory type' in key:
                for mem_type in ['HBM3', 'HBM2e', 'HBM2', 'GDDR7', 'GDDR6X', 'GDDR6', 'GDDR5']:
                    if mem_type.lower() in value.lower():
                        gpu.memory_type = mem_type
                        break

            elif 'bandwidth' in key:
                num = parse_number(value)
                if num:
                    gpu.bandwidth_gbps = num

            elif 'shading units' in key or 'cuda cores' in key:
                num = parse_number(value)
                if num:
                    if vendor == 'nvidia':
                        gpu.cuda_cores = int(num)
                    elif vendor == 'amd':
                        gpu.stream_processors = int(num)

            elif 'compute units' in key:
                num = parse_number(value)
                if num:
                    gpu.compute_units = int(num)

            elif 'tensor cores' in key:
                num = parse_number(value)
                if num:
                    gpu.tensor_cores = int(num)

            elif 'tdp' in key or 'typical board power' in key:
                num = parse_number(value)
                if num:
                    gpu.tdp_watts = int(num)

            elif 'fp16' in key and 'half' in key:
                num = parse_number(value)
                if num and 'tflops' in value.lower():
                    gpu.fp16_tflops = num

            elif 'fp32' in key or 'float performance' in key:
                num = parse_number(value)
                if num and 'tflops' in value.lower():
                    gpu.fp32_tflops = num

            elif 'compute capability' in key:
                match = re.search(r'(\d+\.\d+)', value)
                if match:
                    gpu.compute_capability = match.group(1)

        return gpu

    except Exception as e:
        print(f"    Error scraping {slug}: {e}")
        return None


async def scrape_prices(page: Page, gpu: GPU):
    """Scrape prices from Geizhals"""
    query = gpu.name.replace('NVIDIA ', '').replace('AMD ', '').replace('Intel ', '')
    url = f"https://geizhals.de/?fs={query.replace(' ', '+')}&cat=gra16_512"

    try:
        await page.goto(url, wait_until='networkidle', timeout=15000)

        # Find first product with price
        products = await page.query_selector_all('.productlist__product')

        for product in products[:5]:
            name_el = await product.query_selector('.productlist__name')
            price_el = await product.query_selector('.productlist__price')

            if not name_el or not price_el:
                continue

            name = (await name_el.inner_text()).lower()
            query_parts = query.lower().split()[:2]

            if all(p in name for p in query_parts):
                price_text = await price_el.inner_text()
                match = re.search(r'€\s*([\d.,]+)', price_text)
                if match:
                    price = float(match.group(1).replace('.', '').replace(',', '.'))
                    gpu.price_eur = int(price)
                    break

    except Exception as e:
        print(f"    Price error: {e}")


# ============================================================================
# Main
# ============================================================================

async def main():
    print("=" * 60)
    print("GPU Scraper (Playwright + TechPowerUp)")
    print("=" * 60)

    gpus = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        page = await context.new_page()

        # Scrape GPU specs
        print(f"\nScraping {len(GPUS_TO_SCRAPE)} GPUs from TechPowerUp...")

        for i, (slug, vendor, arch) in enumerate(GPUS_TO_SCRAPE):
            print(f"  [{i+1}/{len(GPUS_TO_SCRAPE)}] {slug}...")

            gpu = await scrape_tpu_gpu(page, slug, vendor, arch)

            if gpu:
                print(f"    ✓ {gpu.name}: {gpu.vram_mb}MB, {gpu.cuda_cores or gpu.stream_processors or '?'} cores")
                gpus.append(gpu)
            else:
                print(f"    ✗ Failed")

            await asyncio.sleep(1)  # Rate limiting

        # Scrape prices
        print(f"\nScraping prices from Geizhals...")

        for gpu in gpus:
            await scrape_prices(page, gpu)
            if gpu.price_eur:
                print(f"  {gpu.name}: €{gpu.price_eur}")
            await asyncio.sleep(0.5)

        await browser.close()

    # Save results
    print(f"\n{'=' * 60}")
    print(f"Scraped {len(gpus)} GPUs")

    output = []
    for gpu in gpus:
        d = asdict(gpu)
        d = {k: v for k, v in d.items() if v is not None and v != 0 and v != []}
        output.append(d)

    output_path = Path('public/data/gpus_scraped.json')
    output_path.write_text(json.dumps(output, indent=2))
    print(f"Saved to {output_path}")


if __name__ == '__main__':
    asyncio.run(main())
