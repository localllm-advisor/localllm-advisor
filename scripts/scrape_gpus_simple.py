#!/usr/bin/env python3
"""
Simple GPU Scraper - Uses VideoCardz and official specs

No browser needed, just requests.
"""

import json
import re
import time
from pathlib import Path
from dataclasses import dataclass, asdict, field
from typing import Optional

import requests
from bs4 import BeautifulSoup

# ============================================================================
# Known GPU Specs (from official sources - these don't change)
# ============================================================================

NVIDIA_GPUS = [
    # RTX 50 Series (Blackwell) - specs from NVIDIA press releases
    {
        "name": "NVIDIA RTX 5090",
        "vendor": "nvidia",
        "vram_mb": 32768,
        "bandwidth_gbps": 1792,
        "memory_type": "GDDR7",
        "cuda_cores": 21760,
        "tensor_cores": 680,
        "fp32_tflops": 104,
        "fp16_tflops": 209,
        "architecture": "Blackwell",
        "compute_capability": "10.0",
        "tdp_watts": 575,
        "pcie_gen": 5,
        "pcie_lanes": 16,
        "msrp_usd": 1999,
    },
    {
        "name": "NVIDIA RTX 5080",
        "vendor": "nvidia",
        "vram_mb": 16384,
        "bandwidth_gbps": 960,
        "memory_type": "GDDR7",
        "cuda_cores": 10752,
        "tensor_cores": 336,
        "fp32_tflops": 55,
        "fp16_tflops": 110,
        "architecture": "Blackwell",
        "compute_capability": "10.0",
        "tdp_watts": 360,
        "pcie_gen": 5,
        "pcie_lanes": 16,
        "msrp_usd": 999,
    },
    {
        "name": "NVIDIA RTX 5070 Ti",
        "vendor": "nvidia",
        "vram_mb": 16384,
        "bandwidth_gbps": 896,
        "memory_type": "GDDR7",
        "cuda_cores": 8960,
        "tensor_cores": 280,
        "fp32_tflops": 47,
        "fp16_tflops": 93,
        "architecture": "Blackwell",
        "compute_capability": "10.0",
        "tdp_watts": 300,
        "pcie_gen": 5,
        "pcie_lanes": 16,
        "msrp_usd": 749,
    },
    {
        "name": "NVIDIA RTX 5070",
        "vendor": "nvidia",
        "vram_mb": 12288,
        "bandwidth_gbps": 672,
        "memory_type": "GDDR7",
        "cuda_cores": 6144,
        "tensor_cores": 192,
        "fp32_tflops": 32,
        "fp16_tflops": 64,
        "architecture": "Blackwell",
        "compute_capability": "10.0",
        "tdp_watts": 250,
        "pcie_gen": 5,
        "pcie_lanes": 8,
        "msrp_usd": 549,
    },
    # RTX 40 Series (Ada Lovelace)
    {
        "name": "NVIDIA RTX 4090",
        "vendor": "nvidia",
        "vram_mb": 24576,
        "bandwidth_gbps": 1008,
        "memory_type": "GDDR6X",
        "cuda_cores": 16384,
        "tensor_cores": 512,
        "fp32_tflops": 82.6,
        "fp16_tflops": 165,
        "architecture": "Ada Lovelace",
        "compute_capability": "8.9",
        "tdp_watts": 450,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "msrp_usd": 1599,
    },
    {
        "name": "NVIDIA RTX 4080 SUPER",
        "vendor": "nvidia",
        "vram_mb": 16384,
        "bandwidth_gbps": 736,
        "memory_type": "GDDR6X",
        "cuda_cores": 10240,
        "tensor_cores": 320,
        "fp32_tflops": 52,
        "fp16_tflops": 104,
        "architecture": "Ada Lovelace",
        "compute_capability": "8.9",
        "tdp_watts": 320,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "msrp_usd": 999,
    },
    {
        "name": "NVIDIA RTX 4080",
        "vendor": "nvidia",
        "vram_mb": 16384,
        "bandwidth_gbps": 717,
        "memory_type": "GDDR6X",
        "cuda_cores": 9728,
        "tensor_cores": 304,
        "fp32_tflops": 48.7,
        "fp16_tflops": 97,
        "architecture": "Ada Lovelace",
        "compute_capability": "8.9",
        "tdp_watts": 320,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "msrp_usd": 1199,
    },
    {
        "name": "NVIDIA RTX 4070 Ti SUPER",
        "vendor": "nvidia",
        "vram_mb": 16384,
        "bandwidth_gbps": 672,
        "memory_type": "GDDR6X",
        "cuda_cores": 8448,
        "tensor_cores": 264,
        "fp32_tflops": 44,
        "fp16_tflops": 88,
        "architecture": "Ada Lovelace",
        "compute_capability": "8.9",
        "tdp_watts": 285,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "msrp_usd": 799,
    },
    {
        "name": "NVIDIA RTX 4070 Ti",
        "vendor": "nvidia",
        "vram_mb": 12288,
        "bandwidth_gbps": 504,
        "memory_type": "GDDR6X",
        "cuda_cores": 7680,
        "tensor_cores": 240,
        "fp32_tflops": 40,
        "fp16_tflops": 80,
        "architecture": "Ada Lovelace",
        "compute_capability": "8.9",
        "tdp_watts": 285,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "msrp_usd": 799,
    },
    {
        "name": "NVIDIA RTX 4070 SUPER",
        "vendor": "nvidia",
        "vram_mb": 12288,
        "bandwidth_gbps": 504,
        "memory_type": "GDDR6X",
        "cuda_cores": 7168,
        "tensor_cores": 224,
        "fp32_tflops": 35.5,
        "fp16_tflops": 75,
        "architecture": "Ada Lovelace",
        "compute_capability": "8.9",
        "tdp_watts": 220,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "msrp_usd": 599,
    },
    {
        "name": "NVIDIA RTX 4070",
        "vendor": "nvidia",
        "vram_mb": 12288,
        "bandwidth_gbps": 504,
        "memory_type": "GDDR6X",
        "cuda_cores": 5888,
        "tensor_cores": 184,
        "fp32_tflops": 29,
        "fp16_tflops": 58,
        "architecture": "Ada Lovelace",
        "compute_capability": "8.9",
        "tdp_watts": 200,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "msrp_usd": 549,
    },
    {
        "name": "NVIDIA RTX 4060 Ti 16GB",
        "vendor": "nvidia",
        "vram_mb": 16384,
        "bandwidth_gbps": 288,
        "memory_type": "GDDR6",
        "cuda_cores": 4352,
        "tensor_cores": 136,
        "fp32_tflops": 22,
        "fp16_tflops": 44,
        "architecture": "Ada Lovelace",
        "compute_capability": "8.9",
        "tdp_watts": 165,
        "pcie_gen": 4,
        "pcie_lanes": 8,
        "msrp_usd": 499,
    },
    {
        "name": "NVIDIA RTX 4060 Ti 8GB",
        "vendor": "nvidia",
        "vram_mb": 8192,
        "bandwidth_gbps": 288,
        "memory_type": "GDDR6",
        "cuda_cores": 4352,
        "tensor_cores": 136,
        "fp32_tflops": 22,
        "fp16_tflops": 44,
        "architecture": "Ada Lovelace",
        "compute_capability": "8.9",
        "tdp_watts": 160,
        "pcie_gen": 4,
        "pcie_lanes": 8,
        "msrp_usd": 399,
    },
    {
        "name": "NVIDIA RTX 4060",
        "vendor": "nvidia",
        "vram_mb": 8192,
        "bandwidth_gbps": 272,
        "memory_type": "GDDR6",
        "cuda_cores": 3072,
        "tensor_cores": 96,
        "fp32_tflops": 15.1,
        "fp16_tflops": 30,
        "architecture": "Ada Lovelace",
        "compute_capability": "8.9",
        "tdp_watts": 115,
        "pcie_gen": 4,
        "pcie_lanes": 8,
        "msrp_usd": 299,
    },
    # RTX 30 Series (Ampere)
    {
        "name": "NVIDIA RTX 3090 Ti",
        "vendor": "nvidia",
        "vram_mb": 24576,
        "bandwidth_gbps": 1008,
        "memory_type": "GDDR6X",
        "cuda_cores": 10752,
        "tensor_cores": 336,
        "fp32_tflops": 40,
        "fp16_tflops": 80,
        "architecture": "Ampere",
        "compute_capability": "8.6",
        "tdp_watts": 450,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "availability": "used_only",
    },
    {
        "name": "NVIDIA RTX 3090",
        "vendor": "nvidia",
        "vram_mb": 24576,
        "bandwidth_gbps": 936,
        "memory_type": "GDDR6X",
        "cuda_cores": 10496,
        "tensor_cores": 328,
        "fp32_tflops": 35.6,
        "fp16_tflops": 71,
        "architecture": "Ampere",
        "compute_capability": "8.6",
        "tdp_watts": 350,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "availability": "used_only",
    },
    {
        "name": "NVIDIA RTX 3080 Ti",
        "vendor": "nvidia",
        "vram_mb": 12288,
        "bandwidth_gbps": 912,
        "memory_type": "GDDR6X",
        "cuda_cores": 10240,
        "tensor_cores": 320,
        "fp32_tflops": 34.1,
        "fp16_tflops": 68,
        "architecture": "Ampere",
        "compute_capability": "8.6",
        "tdp_watts": 350,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "availability": "used_only",
    },
    {
        "name": "NVIDIA RTX 3080 12GB",
        "vendor": "nvidia",
        "vram_mb": 12288,
        "bandwidth_gbps": 912,
        "memory_type": "GDDR6X",
        "cuda_cores": 8960,
        "tensor_cores": 280,
        "fp32_tflops": 30.6,
        "fp16_tflops": 61,
        "architecture": "Ampere",
        "compute_capability": "8.6",
        "tdp_watts": 350,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "availability": "used_only",
    },
    {
        "name": "NVIDIA RTX 3080 10GB",
        "vendor": "nvidia",
        "vram_mb": 10240,
        "bandwidth_gbps": 760,
        "memory_type": "GDDR6X",
        "cuda_cores": 8704,
        "tensor_cores": 272,
        "fp32_tflops": 29.8,
        "fp16_tflops": 60,
        "architecture": "Ampere",
        "compute_capability": "8.6",
        "tdp_watts": 320,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "availability": "used_only",
    },
    {
        "name": "NVIDIA RTX 3070 Ti",
        "vendor": "nvidia",
        "vram_mb": 8192,
        "bandwidth_gbps": 608,
        "memory_type": "GDDR6X",
        "cuda_cores": 6144,
        "tensor_cores": 192,
        "fp32_tflops": 21.7,
        "fp16_tflops": 43,
        "architecture": "Ampere",
        "compute_capability": "8.6",
        "tdp_watts": 290,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "availability": "used_only",
    },
    {
        "name": "NVIDIA RTX 3070",
        "vendor": "nvidia",
        "vram_mb": 8192,
        "bandwidth_gbps": 448,
        "memory_type": "GDDR6",
        "cuda_cores": 5888,
        "tensor_cores": 184,
        "fp32_tflops": 20.3,
        "fp16_tflops": 40,
        "architecture": "Ampere",
        "compute_capability": "8.6",
        "tdp_watts": 220,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "availability": "used_only",
    },
    {
        "name": "NVIDIA RTX 3060 Ti",
        "vendor": "nvidia",
        "vram_mb": 8192,
        "bandwidth_gbps": 448,
        "memory_type": "GDDR6",
        "cuda_cores": 4864,
        "tensor_cores": 152,
        "fp32_tflops": 16.2,
        "fp16_tflops": 32,
        "architecture": "Ampere",
        "compute_capability": "8.6",
        "tdp_watts": 200,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "availability": "used_only",
    },
    {
        "name": "NVIDIA RTX 3060 12GB",
        "vendor": "nvidia",
        "vram_mb": 12288,
        "bandwidth_gbps": 360,
        "memory_type": "GDDR6",
        "cuda_cores": 3584,
        "tensor_cores": 112,
        "fp32_tflops": 12.7,
        "fp16_tflops": 25,
        "architecture": "Ampere",
        "compute_capability": "8.6",
        "tdp_watts": 170,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "msrp_usd": 329,
    },
]

AMD_GPUS = [
    # RX 7000 Series (RDNA3)
    {
        "name": "AMD RX 7900 XTX",
        "vendor": "amd",
        "vram_mb": 24576,
        "bandwidth_gbps": 960,
        "memory_type": "GDDR6",
        "stream_processors": 6144,
        "compute_units": 96,
        "fp32_tflops": 61,
        "fp16_tflops": 123,
        "architecture": "RDNA3",
        "tdp_watts": 355,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "msrp_usd": 999,
    },
    {
        "name": "AMD RX 7900 XT",
        "vendor": "amd",
        "vram_mb": 20480,
        "bandwidth_gbps": 800,
        "memory_type": "GDDR6",
        "stream_processors": 5376,
        "compute_units": 84,
        "fp32_tflops": 52,
        "fp16_tflops": 103,
        "architecture": "RDNA3",
        "tdp_watts": 315,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "msrp_usd": 899,
    },
    {
        "name": "AMD RX 7900 GRE",
        "vendor": "amd",
        "vram_mb": 16384,
        "bandwidth_gbps": 576,
        "memory_type": "GDDR6",
        "stream_processors": 5120,
        "compute_units": 80,
        "fp32_tflops": 46,
        "fp16_tflops": 92,
        "architecture": "RDNA3",
        "tdp_watts": 260,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "msrp_usd": 549,
    },
    {
        "name": "AMD RX 7800 XT",
        "vendor": "amd",
        "vram_mb": 16384,
        "bandwidth_gbps": 624,
        "memory_type": "GDDR6",
        "stream_processors": 3840,
        "compute_units": 60,
        "fp32_tflops": 37,
        "fp16_tflops": 75,
        "architecture": "RDNA3",
        "tdp_watts": 263,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "msrp_usd": 499,
    },
    {
        "name": "AMD RX 7700 XT",
        "vendor": "amd",
        "vram_mb": 12288,
        "bandwidth_gbps": 432,
        "memory_type": "GDDR6",
        "stream_processors": 3456,
        "compute_units": 54,
        "fp32_tflops": 30,
        "fp16_tflops": 60,
        "architecture": "RDNA3",
        "tdp_watts": 245,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "msrp_usd": 449,
    },
    {
        "name": "AMD RX 7600 XT",
        "vendor": "amd",
        "vram_mb": 16384,
        "bandwidth_gbps": 288,
        "memory_type": "GDDR6",
        "stream_processors": 2048,
        "compute_units": 32,
        "fp32_tflops": 22,
        "fp16_tflops": 44,
        "architecture": "RDNA3",
        "tdp_watts": 190,
        "pcie_gen": 4,
        "pcie_lanes": 8,
        "msrp_usd": 329,
    },
    {
        "name": "AMD RX 7600",
        "vendor": "amd",
        "vram_mb": 8192,
        "bandwidth_gbps": 288,
        "memory_type": "GDDR6",
        "stream_processors": 2048,
        "compute_units": 32,
        "fp32_tflops": 22,
        "fp16_tflops": 44,
        "architecture": "RDNA3",
        "tdp_watts": 165,
        "pcie_gen": 4,
        "pcie_lanes": 8,
        "msrp_usd": 269,
    },
    # RX 6000 Series (RDNA2)
    {
        "name": "AMD RX 6950 XT",
        "vendor": "amd",
        "vram_mb": 16384,
        "bandwidth_gbps": 576,
        "memory_type": "GDDR6",
        "stream_processors": 5120,
        "compute_units": 80,
        "fp32_tflops": 23.6,
        "fp16_tflops": 47,
        "architecture": "RDNA2",
        "tdp_watts": 335,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "availability": "used_only",
    },
    {
        "name": "AMD RX 6900 XT",
        "vendor": "amd",
        "vram_mb": 16384,
        "bandwidth_gbps": 512,
        "memory_type": "GDDR6",
        "stream_processors": 5120,
        "compute_units": 80,
        "fp32_tflops": 23.04,
        "fp16_tflops": 46,
        "architecture": "RDNA2",
        "tdp_watts": 300,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "availability": "used_only",
    },
    {
        "name": "AMD RX 6800 XT",
        "vendor": "amd",
        "vram_mb": 16384,
        "bandwidth_gbps": 512,
        "memory_type": "GDDR6",
        "stream_processors": 4608,
        "compute_units": 72,
        "fp32_tflops": 20.7,
        "fp16_tflops": 41,
        "architecture": "RDNA2",
        "tdp_watts": 300,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "availability": "used_only",
    },
    {
        "name": "AMD RX 6800",
        "vendor": "amd",
        "vram_mb": 16384,
        "bandwidth_gbps": 512,
        "memory_type": "GDDR6",
        "stream_processors": 3840,
        "compute_units": 60,
        "fp32_tflops": 16.2,
        "fp16_tflops": 33,
        "architecture": "RDNA2",
        "tdp_watts": 250,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "availability": "used_only",
    },
    {
        "name": "AMD RX 6700 XT",
        "vendor": "amd",
        "vram_mb": 12288,
        "bandwidth_gbps": 384,
        "memory_type": "GDDR6",
        "stream_processors": 2560,
        "compute_units": 40,
        "fp32_tflops": 13.2,
        "fp16_tflops": 26,
        "architecture": "RDNA2",
        "tdp_watts": 230,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "availability": "used_only",
    },
]

INTEL_GPUS = [
    {
        "name": "Intel Arc A770 16GB",
        "vendor": "intel",
        "vram_mb": 16384,
        "bandwidth_gbps": 560,
        "memory_type": "GDDR6",
        "compute_units": 32,
        "fp32_tflops": 17.2,
        "fp16_tflops": 35,
        "architecture": "Alchemist",
        "tdp_watts": 225,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "msrp_usd": 349,
    },
    {
        "name": "Intel Arc A750",
        "vendor": "intel",
        "vram_mb": 8192,
        "bandwidth_gbps": 512,
        "memory_type": "GDDR6",
        "compute_units": 28,
        "fp32_tflops": 15.3,
        "fp16_tflops": 30,
        "architecture": "Alchemist",
        "tdp_watts": 225,
        "pcie_gen": 4,
        "pcie_lanes": 16,
        "msrp_usd": 289,
    },
    {
        "name": "Intel Arc B580",
        "vendor": "intel",
        "vram_mb": 12288,
        "bandwidth_gbps": 456,
        "memory_type": "GDDR6",
        "compute_units": 20,
        "fp32_tflops": 14.5,
        "fp16_tflops": 29,
        "architecture": "Battlemage",
        "tdp_watts": 190,
        "pcie_gen": 4,
        "pcie_lanes": 8,
        "msrp_usd": 249,
    },
]

APPLE_SILICON = [
    {"name": "Apple M1 (8GB)", "vendor": "apple", "vram_mb": 8192, "bandwidth_gbps": 68, "memory_type": "Unified", "gpu_cores": 8, "fp16_tflops": 2.6, "fp32_tflops": 2.6, "architecture": "M1", "tdp_watts": 20},
    {"name": "Apple M1 Pro (16GB)", "vendor": "apple", "vram_mb": 16384, "bandwidth_gbps": 200, "memory_type": "Unified", "gpu_cores": 16, "fp16_tflops": 5.2, "fp32_tflops": 5.2, "architecture": "M1 Pro", "tdp_watts": 30},
    {"name": "Apple M1 Max (32GB)", "vendor": "apple", "vram_mb": 32768, "bandwidth_gbps": 400, "memory_type": "Unified", "gpu_cores": 32, "fp16_tflops": 10.4, "fp32_tflops": 10.4, "architecture": "M1 Max", "tdp_watts": 60},
    {"name": "Apple M1 Ultra (64GB)", "vendor": "apple", "vram_mb": 65536, "bandwidth_gbps": 800, "memory_type": "Unified", "gpu_cores": 64, "fp16_tflops": 21, "fp32_tflops": 21, "architecture": "M1 Ultra", "tdp_watts": 100},
    {"name": "Apple M2 (8GB)", "vendor": "apple", "vram_mb": 8192, "bandwidth_gbps": 100, "memory_type": "Unified", "gpu_cores": 10, "fp16_tflops": 3.6, "fp32_tflops": 3.6, "architecture": "M2", "tdp_watts": 22},
    {"name": "Apple M2 Pro (16GB)", "vendor": "apple", "vram_mb": 16384, "bandwidth_gbps": 200, "memory_type": "Unified", "gpu_cores": 19, "fp16_tflops": 6.8, "fp32_tflops": 6.8, "architecture": "M2 Pro", "tdp_watts": 30},
    {"name": "Apple M2 Max (32GB)", "vendor": "apple", "vram_mb": 32768, "bandwidth_gbps": 400, "memory_type": "Unified", "gpu_cores": 38, "fp16_tflops": 13.6, "fp32_tflops": 13.6, "architecture": "M2 Max", "tdp_watts": 60},
    {"name": "Apple M2 Ultra (64GB)", "vendor": "apple", "vram_mb": 65536, "bandwidth_gbps": 800, "memory_type": "Unified", "gpu_cores": 76, "fp16_tflops": 27.2, "fp32_tflops": 27.2, "architecture": "M2 Ultra", "tdp_watts": 100},
    {"name": "Apple M3 (8GB)", "vendor": "apple", "vram_mb": 8192, "bandwidth_gbps": 100, "memory_type": "Unified", "gpu_cores": 10, "fp16_tflops": 4.1, "fp32_tflops": 4.1, "architecture": "M3", "tdp_watts": 22},
    {"name": "Apple M3 Pro (18GB)", "vendor": "apple", "vram_mb": 18432, "bandwidth_gbps": 150, "memory_type": "Unified", "gpu_cores": 18, "fp16_tflops": 7.4, "fp32_tflops": 7.4, "architecture": "M3 Pro", "tdp_watts": 30},
    {"name": "Apple M3 Max (36GB)", "vendor": "apple", "vram_mb": 36864, "bandwidth_gbps": 300, "memory_type": "Unified", "gpu_cores": 40, "fp16_tflops": 16.4, "fp32_tflops": 16.4, "architecture": "M3 Max", "tdp_watts": 60},
    {"name": "Apple M3 Max (48GB)", "vendor": "apple", "vram_mb": 49152, "bandwidth_gbps": 400, "memory_type": "Unified", "gpu_cores": 40, "fp16_tflops": 16.4, "fp32_tflops": 16.4, "architecture": "M3 Max", "tdp_watts": 60},
    {"name": "Apple M4 (16GB)", "vendor": "apple", "vram_mb": 16384, "bandwidth_gbps": 120, "memory_type": "Unified", "gpu_cores": 10, "fp16_tflops": 4.6, "fp32_tflops": 4.6, "architecture": "M4", "tdp_watts": 22},
    {"name": "Apple M4 Pro (24GB)", "vendor": "apple", "vram_mb": 24576, "bandwidth_gbps": 273, "memory_type": "Unified", "gpu_cores": 20, "fp16_tflops": 9.2, "fp32_tflops": 9.2, "architecture": "M4 Pro", "tdp_watts": 30},
    {"name": "Apple M4 Pro (48GB)", "vendor": "apple", "vram_mb": 49152, "bandwidth_gbps": 273, "memory_type": "Unified", "gpu_cores": 20, "fp16_tflops": 9.2, "fp32_tflops": 9.2, "architecture": "M4 Pro", "tdp_watts": 30},
    {"name": "Apple M4 Max (48GB)", "vendor": "apple", "vram_mb": 49152, "bandwidth_gbps": 546, "memory_type": "Unified", "gpu_cores": 40, "fp16_tflops": 18.4, "fp32_tflops": 18.4, "architecture": "M4 Max", "tdp_watts": 60},
    {"name": "Apple M4 Max (64GB)", "vendor": "apple", "vram_mb": 65536, "bandwidth_gbps": 546, "memory_type": "Unified", "gpu_cores": 40, "fp16_tflops": 18.4, "fp32_tflops": 18.4, "architecture": "M4 Max", "tdp_watts": 60},
    {"name": "Apple M4 Max (128GB)", "vendor": "apple", "vram_mb": 131072, "bandwidth_gbps": 546, "memory_type": "Unified", "gpu_cores": 40, "fp16_tflops": 18.4, "fp32_tflops": 18.4, "architecture": "M4 Max", "tdp_watts": 60},
]


# ============================================================================
# Price Scraping
# ============================================================================

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'en-US,en;q=0.9',
}


def scrape_geizhals_price(query: str) -> Optional[int]:
    """Scrape price from Geizhals.de"""
    url = f"https://geizhals.de/?fs={query.replace(' ', '+')}&cat=gra16_512"

    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(resp.text, 'lxml')

        products = soup.select('.productlist__product')
        query_parts = query.lower().split()[:2]

        for product in products[:5]:
            name_el = product.select_one('.productlist__name')
            price_el = product.select_one('.productlist__price')

            if not name_el or not price_el:
                continue

            name = name_el.text.strip().lower()

            if all(p in name for p in query_parts):
                match = re.search(r'€\s*([\d.,]+)', price_el.text)
                if match:
                    price = float(match.group(1).replace('.', '').replace(',', '.'))
                    return int(price)

        return None

    except Exception as e:
        return None


def generate_aliases(name: str) -> list:
    """Generate search aliases"""
    aliases = [name]

    # Remove vendor prefix
    short = name.replace('NVIDIA ', '').replace('AMD ', '').replace('Intel ', '').replace('Apple ', '')
    aliases.append(short)

    # No spaces
    aliases.append(short.replace(' ', ''))

    # Lowercase
    aliases.append(short.lower())

    return list(set(aliases))


# ============================================================================
# Main
# ============================================================================

def main():
    print("=" * 60)
    print("GPU Database Builder (specs + live prices)")
    print("=" * 60)

    all_gpus = []

    # Combine all GPU data
    all_data = NVIDIA_GPUS + AMD_GPUS + INTEL_GPUS + APPLE_SILICON

    print(f"\nProcessing {len(all_data)} GPUs...")

    for gpu_data in all_data:
        # Add aliases
        gpu_data['aliases'] = generate_aliases(gpu_data['name'])

        # Set default availability
        if 'availability' not in gpu_data:
            gpu_data['availability'] = 'available'

        all_gpus.append(gpu_data)

    # Scrape prices
    print("\nScraping prices from Geizhals.de...")

    for gpu in all_gpus:
        if gpu['vendor'] == 'apple':
            continue  # Skip Apple (integrated)

        query = gpu['name'].replace('NVIDIA ', '').replace('AMD ', '').replace('Intel ', '')
        price = scrape_geizhals_price(query)

        if price:
            gpu['price_eur'] = price
            # Estimate USD from EUR (rough conversion)
            gpu['price_usd'] = int(price * 1.08)
            print(f"  {gpu['name']}: €{price}")
        elif 'msrp_usd' in gpu:
            # Use MSRP as fallback
            gpu['price_usd'] = gpu['msrp_usd']
            gpu['price_eur'] = int(gpu['msrp_usd'] * 0.95)  # Rough EUR estimate
            print(f"  {gpu['name']}: MSRP ${gpu['msrp_usd']}")

        # Remove msrp_usd (internal only)
        gpu.pop('msrp_usd', None)

        time.sleep(0.3)  # Rate limiting

    # Save
    print(f"\n{'=' * 60}")
    print(f"Total: {len(all_gpus)} GPUs")

    output_path = Path('public/data/gpus.json')
    output_path.write_text(json.dumps(all_gpus, indent=2))
    print(f"Saved to {output_path}")


if __name__ == '__main__':
    main()
