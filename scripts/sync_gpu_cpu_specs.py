#!/usr/bin/env python3
"""
sync_gpu_cpu_specs.py
====================================================================
Daily sync of GPU / CPU specs from Wikipedia into:
  public/data/gpus.json
  public/data/cpus.json

Three-layer architecture for broad, stable, and future-proof coverage
----------------------------------------------------------------------

LAYER 1 — Known seed pages (static, curated)
  A comprehensive list of current GPU/CPU series Wikipedia comparison
  pages covering all major vendors (NVIDIA, AMD, Intel, Apple Silicon).
  These are always processed when they change.

LAYER 2 — Auto-discovery via Wikipedia Category API
  Queries the MediaWiki categorymembers API for GPU/CPU-related
  categories.  New series pages (matching patterns like "* series",
  "GeForce *", "Radeon *") are automatically detected without any
  code changes.  This catches new vendor entries, new architectures,
  and new series pages as soon as Wikipedia editors create them.

LAYER 3 — Revision ID caching  (sync_state.json)
  Wikipedia exposes the current revision ID of every page via the
  API.  We store the last-seen revision in scripts/sync_state.json.
  Pages whose revision hasn't changed since the last run are skipped
  entirely — no HTTP fetch, no parsing, no redundant work.
  This makes the daily job fast (usually < 60 s) and idempotent.

Guarantees
----------
  - Existing entries in gpus.json / cpus.json are NEVER modified.
    Manual edits and hand-curated specs are preserved forever.
  - Only adds entries that have at minimum: name + vram_mb + bandwidth_gbps
    (GPU) or name + cores / boost_clock_ghz (CPU).
  - No external dependencies beyond requests + beautifulsoup4 (already
    in scripts/requirements.txt).

Exit codes
----------
  0 — success (whether or not anything new was found)
  1 — fatal error (JSON files unreadable / unwritable)
"""

import argparse
import json
import re
import sys
import time
import random
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional

import requests
from bs4 import BeautifulSoup, Tag

# ─────────────────────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────────────────────

DATA_DIR    = Path(__file__).parent.parent / "public" / "data"
GPUS_FILE   = DATA_DIR / "gpus.json"
CPUS_FILE   = DATA_DIR / "cpus.json"
STATE_FILE  = Path(__file__).parent / "sync_state.json"  # revision ID cache

# ─────────────────────────────────────────────────────────────────────────────
# HTTP
# ─────────────────────────────────────────────────────────────────────────────

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (compatible; LocalLLMAdvisorBot/2.0; "
        "+https://localllm-advisor.com/about)"
    ),
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
})

WIKI_API = "https://en.wikipedia.org/w/api.php"


def wiki_api(params: dict, retries: int = 3) -> Optional[dict]:
    """Call the MediaWiki API and return the parsed JSON, or None on failure."""
    params.setdefault("format", "json")
    params.setdefault("formatversion", "2")
    for attempt in range(retries):
        try:
            resp = SESSION.get(WIKI_API, params=params, timeout=20)
            if resp.status_code == 200:
                return resp.json()
            print(f"  [api] HTTP {resp.status_code}")
        except requests.RequestException as exc:
            print(f"  [api] attempt {attempt + 1}: {exc}")
        if attempt < retries - 1:
            time.sleep(2 ** attempt * random.uniform(0.8, 1.5))
    return None


def fetch_page_html(title: str, retries: int = 3) -> Optional[BeautifulSoup]:
    """Fetch the rendered HTML of a Wikipedia article by title."""
    url = f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"
    for attempt in range(retries):
        try:
            resp = SESSION.get(url, timeout=25)
            if resp.status_code == 200:
                return BeautifulSoup(resp.text, "html.parser")
            print(f"  [http] {resp.status_code} for {title}")
            return None
        except requests.RequestException as exc:
            print(f"  [http] attempt {attempt + 1}: {exc}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt * random.uniform(1.0, 2.5))
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Revision ID cache (Layer 3)
# ─────────────────────────────────────────────────────────────────────────────

def load_state() -> dict:
    """Load revision-ID cache from sync_state.json (creates empty if absent)."""
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except Exception:
            pass
    return {"gpu_revisions": {}, "cpu_revisions": {}}


def save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state, indent=2) + "\n")


def get_current_revid(title: str) -> Optional[int]:
    """Return the current revision ID of a Wikipedia article via the API."""
    data = wiki_api({
        "action": "query",
        "titles": title,
        "prop": "revisions",
        "rvprop": "ids",
    })
    if not data:
        return None
    pages = data.get("query", {}).get("pages", [])
    if not pages:
        return None
    rev = pages[0].get("revisions", [{}])
    return rev[0].get("revid") if rev else None


def title_from_url(url: str) -> str:
    """Extract the Wikipedia article title from a full URL."""
    return url.split("/wiki/")[-1].replace("_", " ")


# ─────────────────────────────────────────────────────────────────────────────
# Auto-discovery via Wikipedia Category API (Layer 2)
# ─────────────────────────────────────────────────────────────────────────────

# Top-level Wikipedia categories to walk for new GPU/CPU series pages.
# The API returns subcategories and pages; we filter by title pattern.
DISCOVERY_CATEGORIES = {
    "gpu": [
        "Category:Nvidia graphics processing units",
        "Category:AMD graphics processing units",
        "Category:Intel graphics processing units",
        "Category:Apple silicon",
        "Category:AMD Instinct",
    ],
    "cpu": [
        "Category:AMD processors",
        "Category:Intel processors",
        "Category:Apple silicon",
        "Category:EPYC",
    ],
}

# Regex patterns that indicate a page is a series/comparison article
# (as opposed to an individual GPU page like "GeForce RTX 4090")
SERIES_PATTERNS = [
    r"\bseries\b",
    r"\bgeneration\b",
    r"geforce \d",
    r"radeon rx \d",
    r"intel arc [abcde]\d",
    r"apple m\d",
    r"ryzen \d",
    r"core ultra \d",
    r"epyc \d",
    r"threadripper",
    r"instinct mi\d",
    r"tesla \w",
    r"hopper\b",
    r"blackwell\b",
    r"ampere\b.*gpu",
]


def matches_series_pattern(title: str) -> bool:
    t = title.lower()
    return any(re.search(pat, t) for pat in SERIES_PATTERNS)


def discover_pages(category_type: str, known_urls: set[str]) -> list[str]:
    """
    Query Wikipedia categories and return URLs of pages not yet known,
    filtered by SERIES_PATTERNS.
    """
    new_urls = []
    seen_titles: set[str] = set()

    categories = DISCOVERY_CATEGORIES.get(category_type, [])
    for cat in categories:
        # Get both subcategories and article pages
        for cmtype in ("subcat", "page"):
            data = wiki_api({
                "action": "query",
                "list": "categorymembers",
                "cmtitle": cat,
                "cmtype": cmtype,
                "cmlimit": "200",
            })
            if not data:
                continue
            for member in data.get("query", {}).get("categorymembers", []):
                title = member.get("title", "")
                if not title or title in seen_titles:
                    continue
                seen_titles.add(title)

                # Remove "Category:" prefix for sub-cat titles
                clean = re.sub(r"^Category:", "", title)
                url = f"https://en.wikipedia.org/wiki/{clean.replace(' ', '_')}"

                if url in known_urls:
                    continue
                if matches_series_pattern(clean):
                    new_urls.append(url)
                    print(f"  [discovery] New page found: {clean}")

        time.sleep(random.uniform(0.3, 0.7))  # Be a polite bot

    return new_urls


# ─────────────────────────────────────────────────────────────────────────────
# Wikipedia table flattener  (handles rowspan / colspan)
# ─────────────────────────────────────────────────────────────────────────────

def flatten_wikitable(table: Tag) -> list[list[str]]:
    """
    Convert a Wikipedia <table> (with arbitrary rowspan/colspan) into a
    clean 2-D list of plain-text strings.  All rows have the same width.
    """
    grid: dict[tuple[int, int], str] = {}
    row_idx = 0

    for tr in table.find_all("tr", recursive=False):
        col_idx = 0
        for cell in tr.find_all(["td", "th"], recursive=False):
            while (row_idx, col_idx) in grid:
                col_idx += 1
            for sup in cell.find_all("sup"):
                sup.decompose()
            text = re.sub(r"\s+", " ", cell.get_text(" ", strip=True)).strip()
            rs = int(cell.get("rowspan", 1))
            cs = int(cell.get("colspan", 1))
            for r in range(rs):
                for c in range(cs):
                    grid[(row_idx + r, col_idx + c)] = text
            col_idx += cs
        row_idx += 1

    if not grid:
        return []
    max_row = max(r for r, _ in grid) + 1
    max_col = max(c for _, c in grid) + 1
    return [
        [grid.get((r, c), "") for c in range(max_col)]
        for r in range(max_row)
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Value parsers
# ─────────────────────────────────────────────────────────────────────────────

def parse_vram_mb(text: str) -> Optional[int]:
    m = re.search(r"([\d.]+)\s*GB", text, re.IGNORECASE)
    return int(float(m.group(1)) * 1024) if m else None


def parse_bandwidth(text: str) -> Optional[float]:
    m = re.search(r"([\d,]+(?:\.\d+)?)\s*(?:GB/s|GiB/s)", text, re.IGNORECASE)
    return float(m.group(1).replace(",", "")) if m else None


def parse_watts(text: str) -> Optional[int]:
    m = re.search(r"(\d+)\s*W\b", text, re.IGNORECASE)
    return int(m.group(1)) if m else None


def parse_integer(text: str) -> Optional[int]:
    m = re.search(r"[\d,]+", text)
    return int(m.group().replace(",", "")) if m else None


def parse_float_ghz(text: str) -> Optional[float]:
    m = re.search(r"([\d.]+)\s*GHz", text, re.IGNORECASE)
    return float(m.group(1)) if m else None


def find_col(headers: list[str], patterns: list[str]) -> int:
    for pat in patterns:
        for i, h in enumerate(headers):
            if re.search(pat, h, re.IGNORECASE):
                return i
    return -1


# ─────────────────────────────────────────────────────────────────────────────
# Page configuration
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class GPUPageConfig:
    url: str
    vendor: str
    architecture: str
    memory_type: str
    pcie_gen: int
    prefix: str


@dataclass
class CPUPageConfig:
    url: str
    vendor: str
    architecture: str
    prefix: str
    avx512: bool = False


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 1 — Seed page lists (comprehensive, all current series + vendors)
# ─────────────────────────────────────────────────────────────────────────────

GPU_SEED_PAGES: list[GPUPageConfig] = [

    # ── NVIDIA Consumer ───────────────────────────────────────────────────────
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/GeForce_50_series",
        vendor="nvidia", architecture="Blackwell",
        memory_type="GDDR7", pcie_gen=5, prefix="NVIDIA RTX ",
    ),
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/GeForce_40_series",
        vendor="nvidia", architecture="Ada Lovelace",
        memory_type="GDDR6X", pcie_gen=4, prefix="NVIDIA RTX ",
    ),
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/GeForce_30_series",
        vendor="nvidia", architecture="Ampere",
        memory_type="GDDR6X", pcie_gen=4, prefix="NVIDIA RTX ",
    ),
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/GeForce_20_series",
        vendor="nvidia", architecture="Turing",
        memory_type="GDDR6", pcie_gen=3, prefix="NVIDIA RTX ",
    ),
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/GeForce_16_series",
        vendor="nvidia", architecture="Turing",
        memory_type="GDDR6", pcie_gen=3, prefix="NVIDIA GTX ",
    ),
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/GeForce_10_series",
        vendor="nvidia", architecture="Pascal",
        memory_type="GDDR5X", pcie_gen=3, prefix="NVIDIA GTX ",
    ),

    # ── NVIDIA Professional / Data Center ────────────────────────────────────
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/Hopper_(microarchitecture)",
        vendor="nvidia", architecture="Hopper",
        memory_type="HBM3", pcie_gen=5, prefix="NVIDIA H",
    ),
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/Blackwell_(microarchitecture)",
        vendor="nvidia", architecture="Blackwell",
        memory_type="HBM3e", pcie_gen=5, prefix="NVIDIA GB",
    ),
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/Nvidia_RTX_Ada_Generation",
        vendor="nvidia", architecture="Ada Lovelace",
        memory_type="GDDR6", pcie_gen=4, prefix="NVIDIA RTX ",
    ),

    # ── AMD Consumer ─────────────────────────────────────────────────────────
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/Radeon_RX_9000_series",
        vendor="amd", architecture="RDNA 4",
        memory_type="GDDR6", pcie_gen=5, prefix="AMD RX ",
    ),
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/Radeon_RX_7000_series",
        vendor="amd", architecture="RDNA 3",
        memory_type="GDDR6", pcie_gen=4, prefix="AMD RX ",
    ),
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/Radeon_RX_6000_series",
        vendor="amd", architecture="RDNA 2",
        memory_type="GDDR6", pcie_gen=4, prefix="AMD RX ",
    ),
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/Radeon_RX_5000_series",
        vendor="amd", architecture="RDNA 1",
        memory_type="GDDR6", pcie_gen=4, prefix="AMD RX ",
    ),
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/Radeon_RX_Vega_series",
        vendor="amd", architecture="GCN 5",
        memory_type="HBM2", pcie_gen=3, prefix="AMD RX Vega ",
    ),

    # ── AMD Professional / Data Center ───────────────────────────────────────
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/AMD_Instinct",
        vendor="amd", architecture="CDNA",
        memory_type="HBM2e", pcie_gen=4, prefix="AMD Instinct ",
    ),
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/Radeon_Pro",
        vendor="amd", architecture="RDNA",
        memory_type="GDDR6", pcie_gen=4, prefix="AMD Radeon Pro ",
    ),

    # ── Intel ─────────────────────────────────────────────────────────────────
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/Intel_Arc",
        vendor="intel", architecture="Xe HPG",
        memory_type="GDDR6", pcie_gen=4, prefix="Intel Arc ",
    ),
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/Intel_Arc_Battlemage",
        vendor="intel", architecture="Xe2",
        memory_type="GDDR6", pcie_gen=5, prefix="Intel Arc B",
    ),

    # ── Apple Silicon ─────────────────────────────────────────────────────────
    # The main Apple silicon page has a unified comparison table
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/Apple_silicon",
        vendor="apple", architecture="Apple Silicon",
        memory_type="LPDDR5X", pcie_gen=0, prefix="Apple ",
    ),
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/Apple_M4",
        vendor="apple", architecture="Apple M4",
        memory_type="LPDDR5X", pcie_gen=0, prefix="Apple M4",
    ),
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/Apple_M3",
        vendor="apple", architecture="Apple M3",
        memory_type="LPDDR5X", pcie_gen=0, prefix="Apple M3",
    ),
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/Apple_M2",
        vendor="apple", architecture="Apple M2",
        memory_type="LPDDR5", pcie_gen=0, prefix="Apple M2",
    ),
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/Apple_M1",
        vendor="apple", architecture="Apple M1",
        memory_type="LPDDR4X", pcie_gen=0, prefix="Apple M1",
    ),

    # ── Qualcomm (relevant for Snapdragon X Elite workstations) ──────────────
    GPUPageConfig(
        url="https://en.wikipedia.org/wiki/Snapdragon_X_series",
        vendor="qualcomm", architecture="Oryon",
        memory_type="LPDDR5x", pcie_gen=0, prefix="Qualcomm Snapdragon ",
    ),
]


CPU_SEED_PAGES: list[CPUPageConfig] = [

    # ── AMD Consumer ─────────────────────────────────────────────────────────
    CPUPageConfig(
        url="https://en.wikipedia.org/wiki/Ryzen_9000",
        vendor="amd", architecture="Zen 5",
        prefix="AMD Ryzen ", avx512=True,
    ),
    CPUPageConfig(
        url="https://en.wikipedia.org/wiki/Ryzen_7000",
        vendor="amd", architecture="Zen 4",
        prefix="AMD Ryzen ", avx512=True,
    ),
    CPUPageConfig(
        url="https://en.wikipedia.org/wiki/Ryzen_5000",
        vendor="amd", architecture="Zen 3",
        prefix="AMD Ryzen ", avx512=False,
    ),
    CPUPageConfig(
        url="https://en.wikipedia.org/wiki/Ryzen_3000",
        vendor="amd", architecture="Zen 2",
        prefix="AMD Ryzen ", avx512=False,
    ),

    # ── AMD Server / HEDT ────────────────────────────────────────────────────
    CPUPageConfig(
        url="https://en.wikipedia.org/wiki/Epyc",
        vendor="amd", architecture="Zen",
        prefix="AMD EPYC ", avx512=True,
    ),
    CPUPageConfig(
        url="https://en.wikipedia.org/wiki/Ryzen_Threadripper",
        vendor="amd", architecture="Zen",
        prefix="AMD Threadripper ", avx512=True,
    ),

    # ── Intel Consumer ───────────────────────────────────────────────────────
    CPUPageConfig(
        url="https://en.wikipedia.org/wiki/Arrow_Lake",
        vendor="intel", architecture="Arrow Lake",
        prefix="Intel Core Ultra 200", avx512=False,
    ),
    CPUPageConfig(
        url="https://en.wikipedia.org/wiki/Meteor_Lake",
        vendor="intel", architecture="Meteor Lake",
        prefix="Intel Core Ultra 100", avx512=False,
    ),
    CPUPageConfig(
        url="https://en.wikipedia.org/wiki/Raptor_Lake",
        vendor="intel", architecture="Raptor Lake",
        prefix="Intel Core i", avx512=False,
    ),
    CPUPageConfig(
        url="https://en.wikipedia.org/wiki/Alder_Lake",
        vendor="intel", architecture="Alder Lake",
        prefix="Intel Core i", avx512=False,
    ),

    # ── Intel Server ─────────────────────────────────────────────────────────
    CPUPageConfig(
        url="https://en.wikipedia.org/wiki/Xeon",
        vendor="intel", architecture="Intel Xeon",
        prefix="Intel Xeon ", avx512=True,
    ),

    # ── Apple Silicon (also appears as CPU for CPU-inference use cases) ──────
    CPUPageConfig(
        url="https://en.wikipedia.org/wiki/Apple_M4",
        vendor="apple", architecture="Apple M4",
        prefix="Apple M4", avx512=False,
    ),
    CPUPageConfig(
        url="https://en.wikipedia.org/wiki/Apple_M3",
        vendor="apple", architecture="Apple M3",
        prefix="Apple M3", avx512=False,
    ),
]


# ─────────────────────────────────────────────────────────────────────────────
# Table extraction — GPUs
# ─────────────────────────────────────────────────────────────────────────────

def extract_gpus_from_table(
    table: Tag,
    cfg: GPUPageConfig,
) -> list[dict]:
    """
    Parse one Wikipedia comparison table and return GPU spec dicts.
    Only returns entries with at minimum: vram_mb AND bandwidth_gbps.
    """
    rows = flatten_wikitable(table)
    if len(rows) < 2:
        return []

    # Locate a header row with at least 5 non-empty cells
    header_idx = 0
    for i, row in enumerate(rows):
        if sum(1 for c in row if c.strip()) >= 5:
            header_idx = i
            break

    headers = [h.lower() for h in rows[header_idx]]

    col_model = find_col(headers, [r"^model$", r"model name", r"gpu name", r"^name$"])
    col_vram  = find_col(headers, [r"memory size", r"vram", r"mem\.? size", r"^memory$", r"unified memory"])
    col_bw    = find_col(headers, [r"memory band", r"mem.*band", r"bandwidth"])
    col_tdp   = find_col(headers, [r"^tdp$", r"power.*w\b", r"thermal.*w", r"^power$"])
    col_cuda  = find_col(headers, [r"cuda\s*core", r"shader", r"stream proc", r"^cores$", r"gpu core"])

    if col_model < 0 or col_vram < 0 or col_bw < 0:
        return []

    results = []

    for row in rows[header_idx + 1:]:
        if len(row) <= max(col_model, col_vram, col_bw):
            continue

        raw_name = row[col_model].strip()
        if not raw_name:
            continue
        if raw_name.lower() in ("model", "name", "gpu", "card"):
            continue
        if re.match(r"^[†*‡#\d]+$", raw_name):
            continue
        if not re.search(r"\d", raw_name):
            continue  # Pure text = likely a section header row

        vram_mb = parse_vram_mb(row[col_vram])
        bw_gbps = parse_bandwidth(row[col_bw])

        if not vram_mb or not bw_gbps:
            continue

        # Normalise name: strip footnotes, collapse spaces, remove trailing notes
        name_clean = re.sub(r"\[.*?\]", "", raw_name)
        name_clean = re.sub(r"\s*\(.*?\)\s*$", "", name_clean)
        name_clean = re.sub(r"\s+", " ", name_clean).strip()

        # Prepend vendor prefix if needed
        prefix = cfg.prefix.strip()
        if not name_clean.lower().startswith(prefix.lower()):
            canonical_name = f"{cfg.prefix}{name_clean}".strip()
        else:
            canonical_name = name_clean

        if len(canonical_name) < 5:
            continue

        entry: dict = {
            "name":           canonical_name,
            "vendor":         cfg.vendor,
            "aliases":        [],
            "availability":   "available",
            "vram_mb":        vram_mb,
            "bandwidth_gbps": bw_gbps,
            "memory_type":    cfg.memory_type,
            "architecture":   cfg.architecture,
        }

        if cfg.pcie_gen > 0:
            entry["pcie_gen"]   = cfg.pcie_gen
            entry["pcie_lanes"] = 16

        if col_tdp >= 0 and col_tdp < len(row):
            tdp = parse_watts(row[col_tdp])
            if tdp:
                entry["tdp_watts"] = tdp

        if col_cuda >= 0 and col_cuda < len(row):
            cores = parse_integer(row[col_cuda])
            if cores and cores > 0:
                key = {"nvidia": "cuda_cores", "amd": "stream_processors"}.get(
                    cfg.vendor, "gpu_cores"
                )
                entry[key] = cores

        results.append(entry)

    return results


# ─────────────────────────────────────────────────────────────────────────────
# Table extraction — CPUs
# ─────────────────────────────────────────────────────────────────────────────

def extract_cpus_from_table(table: Tag, cfg: CPUPageConfig) -> list[dict]:
    """
    Parse one Wikipedia comparison table and return CPU spec dicts.
    Requires at minimum: name + (cores or boost_clock_ghz).
    """
    rows = flatten_wikitable(table)
    if len(rows) < 2:
        return []

    header_idx = 0
    for i, row in enumerate(rows):
        if sum(1 for c in row if c.strip()) >= 4:
            header_idx = i
            break

    headers = [h.lower() for h in rows[header_idx]]

    col_model   = find_col(headers, [r"^model$", r"model name", r"cpu", r"processor"])
    col_cores   = find_col(headers, [r"^cores?$", r"core count", r"p.?core", r"performance core"])
    col_threads = find_col(headers, [r"^threads?$", r"thread count"])
    col_base    = find_col(headers, [r"base.*ghz", r"base.*clock", r"base freq"])
    col_boost   = find_col(headers, [r"boost.*ghz", r"max turbo", r"max.*freq", r"boost.*clock"])
    col_l3      = find_col(headers, [r"l3.*mb", r"l3.*cache", r"cache.*mb"])
    col_tdp     = find_col(headers, [r"^tdp$", r"tdp.*w", r"power.*w"])

    if col_model < 0:
        return []

    results = []

    for row in rows[header_idx + 1:]:
        if col_model >= len(row):
            continue
        raw_name = row[col_model].strip()
        if not raw_name:
            continue
        if raw_name.lower() in ("model", "name", "cpu", "processor"):
            continue
        if not re.search(r"\d", raw_name):
            continue

        name_clean = re.sub(r"\[.*?\]", "", raw_name)
        name_clean = re.sub(r"\s*\(.*?\)\s*$", "", name_clean)
        name_clean = re.sub(r"\s+", " ", name_clean).strip()

        prefix = cfg.prefix.strip()
        if not name_clean.lower().startswith(prefix.lower()):
            canonical_name = f"{cfg.prefix}{name_clean}".strip()
        else:
            canonical_name = name_clean

        if len(canonical_name) < 5:
            continue

        entry: dict = {
            "name":    canonical_name,
            "vendor":  cfg.vendor,
            "avx":     True,
            "avx2":    True,
            "avx512":  cfg.avx512,
        }

        if col_cores >= 0 and col_cores < len(row):
            v = parse_integer(row[col_cores])
            if v and 2 <= v <= 256:
                entry["cores"] = v

        if col_threads >= 0 and col_threads < len(row):
            v = parse_integer(row[col_threads])
            if v and 2 <= v <= 512:
                entry["threads"] = v
        elif "cores" in entry:
            entry["threads"] = entry["cores"] * 2

        if col_base >= 0 and col_base < len(row):
            v = parse_float_ghz(row[col_base])
            if v:
                entry["base_clock_ghz"] = v

        if col_boost >= 0 and col_boost < len(row):
            v = parse_float_ghz(row[col_boost])
            if v:
                entry["boost_clock_ghz"] = v

        if col_l3 >= 0 and col_l3 < len(row):
            v = parse_integer(row[col_l3])
            if v and 4 <= v <= 4096:
                entry["l3_cache_mb"] = v

        if col_tdp >= 0 and col_tdp < len(row):
            v = parse_watts(row[col_tdp])
            if v:
                entry["tdp_watts"] = v

        has_useful_spec = any(k in entry for k in ("cores", "boost_clock_ghz", "base_clock_ghz"))
        if not has_useful_spec:
            continue

        results.append(entry)

    return results


# ─────────────────────────────────────────────────────────────────────────────
# Name normalisation helpers
# ─────────────────────────────────────────────────────────────────────────────

def normalise_name(name: str) -> str:
    return re.sub(r"\s+", " ", name.lower()).strip()


def known_names(data: list[dict]) -> set[str]:
    s: set[str] = set()
    for entry in data:
        s.add(normalise_name(entry.get("name", "")))
        for alias in entry.get("aliases", []):
            s.add(normalise_name(alias))
    return s


# ─────────────────────────────────────────────────────────────────────────────
# Processing one page (GPU or CPU) with revision-ID caching
# ─────────────────────────────────────────────────────────────────────────────

def process_gpu_page(
    cfg: GPUPageConfig,
    existing_names: set[str],
    rev_cache: dict,
    force: bool = False,
) -> list[dict]:
    """
    Fetch and parse a GPU Wikipedia page, returning new GPU entries.
    Skips the page if its revision ID hasn't changed since last run.
    """
    title = title_from_url(cfg.url)
    current_rev = get_current_revid(title)

    if current_rev and not force:
        cached_rev = rev_cache.get(cfg.url)
        if cached_rev == current_rev:
            print(f"  [cache] {title} — rev {current_rev} unchanged, skipping")
            return []

    print(f"  [fetch] {title} (rev {current_rev})")
    soup = fetch_page_html(title)
    if not soup:
        print(f"  ✗ Could not fetch {title}")
        return []

    if current_rev:
        rev_cache[cfg.url] = current_rev

    candidates = []
    tables = soup.find_all("table", class_=re.compile(r"wikitable"))

    for table in tables:
        for gpu in extract_gpus_from_table(table, cfg):
            norm = normalise_name(gpu["name"])
            if norm not in existing_names:
                candidates.append(gpu)
                existing_names.add(norm)

    return candidates


def process_cpu_page(
    cfg: CPUPageConfig,
    existing_names: set[str],
    rev_cache: dict,
    force: bool = False,
) -> list[dict]:
    title = title_from_url(cfg.url)
    current_rev = get_current_revid(title)

    if current_rev and not force:
        cached_rev = rev_cache.get(cfg.url)
        if cached_rev == current_rev:
            print(f"  [cache] {title} — rev {current_rev} unchanged, skipping")
            return []

    print(f"  [fetch] {title} (rev {current_rev})")
    soup = fetch_page_html(title)
    if not soup:
        print(f"  ✗ Could not fetch {title}")
        return []

    if current_rev:
        rev_cache[cfg.url] = current_rev

    candidates = []
    tables = soup.find_all("table", class_=re.compile(r"wikitable"))

    for table in tables:
        for cpu in extract_cpus_from_table(table, cfg):
            norm = normalise_name(cpu["name"])
            if norm not in existing_names:
                candidates.append(cpu)
                existing_names.add(norm)

    return candidates


# ─────────────────────────────────────────────────────────────────────────────
# Main sync functions
# ─────────────────────────────────────────────────────────────────────────────

def sync_gpus(dry_run: bool, force: bool, no_discovery: bool) -> int:
    print("\n" + "=" * 60)
    print("GPU SYNC")
    print("=" * 60)

    try:
        existing: list[dict] = json.loads(GPUS_FILE.read_text())
    except Exception as exc:
        print(f"FATAL: cannot read {GPUS_FILE}: {exc}")
        sys.exit(1)

    existing_names = known_names(existing)
    print(f"Current dataset: {len(existing)} GPUs")

    state = load_state()
    rev_cache: dict = state.get("gpu_revisions", {})

    all_candidates: list[dict] = []
    seed_urls = {cfg.url for cfg in GPU_SEED_PAGES}

    # Layer 1: Process all seed pages
    print(f"\nProcessing {len(GPU_SEED_PAGES)} seed pages…")
    for cfg in GPU_SEED_PAGES:
        new = process_gpu_page(cfg, existing_names, rev_cache, force=force)
        if new:
            all_candidates.extend(new)
            for g in new:
                print(f"    + {g['name']:50s}  VRAM={g['vram_mb']//1024}GB  BW={g['bandwidth_gbps']}GB/s")
        time.sleep(random.uniform(0.4, 0.9))

    # Layer 2: Auto-discover new pages
    if not no_discovery:
        print("\nAuto-discovery pass…")
        discovered_urls = discover_pages("gpu", seed_urls)
        if discovered_urls:
            print(f"  Found {len(discovered_urls)} new pages to check")
            for url in discovered_urls:
                # Infer basic config from URL
                vendor = "nvidia" if "geforce" in url.lower() or "nvidia" in url.lower() else \
                         "amd" if "radeon" in url.lower() or "amd" in url.lower() else \
                         "intel" if "intel" in url.lower() else "unknown"
                cfg = GPUPageConfig(
                    url=url, vendor=vendor, architecture="Unknown",
                    memory_type="GDDR6", pcie_gen=4, prefix="",
                )
                new = process_gpu_page(cfg, existing_names, rev_cache, force=force)
                if new:
                    all_candidates.extend(new)
                    for g in new:
                        print(f"    + {g['name']}")
                time.sleep(random.uniform(0.4, 0.9))
        else:
            print("  No new pages discovered.")

    # Save updated revision cache (even on dry-run — caching is always safe)
    state["gpu_revisions"] = rev_cache
    save_state(state)

    print(f"\nNew GPU candidates: {len(all_candidates)}")

    if not all_candidates:
        print("Dataset is up to date.")
        return 0

    if dry_run:
        print(f"[DRY RUN] Would add {len(all_candidates)} GPUs. No file written.")
        return len(all_candidates)

    updated = existing + all_candidates
    GPUS_FILE.write_text(json.dumps(updated, indent=2, ensure_ascii=False) + "\n")
    print(f"✓ gpus.json: {len(existing)} → {len(updated)} GPUs")
    return len(all_candidates)


def sync_cpus(dry_run: bool, force: bool, no_discovery: bool) -> int:
    print("\n" + "=" * 60)
    print("CPU SYNC")
    print("=" * 60)

    try:
        existing: list[dict] = json.loads(CPUS_FILE.read_text())
    except Exception as exc:
        print(f"FATAL: cannot read {CPUS_FILE}: {exc}")
        sys.exit(1)

    existing_names = known_names(existing)
    print(f"Current dataset: {len(existing)} CPUs")

    state = load_state()
    rev_cache: dict = state.get("cpu_revisions", {})

    all_candidates: list[dict] = []
    seed_urls = {cfg.url for cfg in CPU_SEED_PAGES}

    print(f"\nProcessing {len(CPU_SEED_PAGES)} seed pages…")
    for cfg in CPU_SEED_PAGES:
        new = process_cpu_page(cfg, existing_names, rev_cache, force=force)
        if new:
            all_candidates.extend(new)
            for c in new:
                cores_str = f"  cores={c.get('cores','?')}" if "cores" in c else ""
                print(f"    + {c['name']}{cores_str}")
        time.sleep(random.uniform(0.4, 0.9))

    if not no_discovery:
        print("\nAuto-discovery pass…")
        discovered_urls = discover_pages("cpu", seed_urls)
        if discovered_urls:
            print(f"  Found {len(discovered_urls)} new pages to check")
            for url in discovered_urls:
                vendor = "amd" if "amd" in url.lower() or "ryzen" in url.lower() or "epyc" in url.lower() \
                         else "intel" if "intel" in url.lower() or "xeon" in url.lower() \
                         else "apple" if "apple" in url.lower() else "unknown"
                cfg = CPUPageConfig(url=url, vendor=vendor, architecture="Unknown", prefix="")
                new = process_cpu_page(cfg, existing_names, rev_cache, force=force)
                if new:
                    all_candidates.extend(new)
                    for c in new:
                        print(f"    + {c['name']}")
                time.sleep(random.uniform(0.4, 0.9))
        else:
            print("  No new pages discovered.")

    state["cpu_revisions"] = rev_cache
    save_state(state)

    print(f"\nNew CPU candidates: {len(all_candidates)}")

    if not all_candidates:
        print("Dataset is up to date.")
        return 0

    if dry_run:
        print(f"[DRY RUN] Would add {len(all_candidates)} CPUs. No file written.")
        return len(all_candidates)

    updated = existing + all_candidates
    CPUS_FILE.write_text(json.dumps(updated, indent=2, ensure_ascii=False) + "\n")
    print(f"✓ cpus.json: {len(existing)} → {len(updated)} CPUs")
    return len(all_candidates)


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Sync GPU/CPU specs from Wikipedia into public/data/",
    )
    parser.add_argument("--dry-run",      action="store_true",
                        help="Detect new entries but do NOT write to JSON files")
    parser.add_argument("--force",        action="store_true",
                        help="Ignore revision cache — re-fetch and re-parse every page")
    parser.add_argument("--no-discovery", action="store_true",
                        help="Skip the auto-discovery category walk (faster)")
    parser.add_argument("--gpus-only",    action="store_true")
    parser.add_argument("--cpus-only",    action="store_true")
    args = parser.parse_args()

    new_gpus = 0
    new_cpus = 0

    if not args.cpus_only:
        new_gpus = sync_gpus(
            dry_run=args.dry_run, force=args.force,
            no_discovery=args.no_discovery,
        )

    if not args.gpus_only:
        new_cpus = sync_cpus(
            dry_run=args.dry_run, force=args.force,
            no_discovery=args.no_discovery,
        )

    # ── Final summary ─────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("SYNC SUMMARY")
    print("=" * 60)

    gpu_total = len(json.loads(GPUS_FILE.read_text())) if GPUS_FILE.exists() else "?"
    cpu_total = len(json.loads(CPUS_FILE.read_text())) if CPUS_FILE.exists() else "?"

    print(f"New GPUs added:          {new_gpus}")
    print(f"New CPUs added:          {new_cpus}")
    print(f"Total GPUs in gpus.json: {gpu_total}")
    print(f"Total CPUs in cpus.json: {cpu_total}")

    # Frontend stats (gpuCount, cpuCount) are read dynamically at build time
    # via src/lib/datasetStats.ts — no TSX patching needed.
    if new_gpus > 0 or new_cpus > 0:
        print("\n→ Changes detected. Workflow will commit and push.")
    else:
        print("\n→ No changes. Nothing to commit.")


if __name__ == "__main__":
    main()
