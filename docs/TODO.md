# Roadmap & Known Issues

This document tracks planned improvements and known issues. For bug reports or feature requests, open a GitHub issue.

---

## In Progress

- **Mobile responsive polish** — hardware selector dropdowns, results cards, navigation header
- **Newsletter / email capture** — backend integration with email provider

---

## Planned

### High Priority

- **More programmatic SEO pages** — "Best GPU for [Model]", "How much VRAM for [Model]", schema.org markup
- **EUR/USD price toggle** — currency conversion with an updatable rate
- **Share configuration via URL** — `?gpu=rtx4090&model=llama3.1-70b&quant=q4` deep links

### Medium Priority

- **Model comparison side-by-side** — select 2–3 models and compare benchmarks, VRAM, speed
- **More cloud providers** — Together.ai, Replicate, Modal, Paperspace, CoreWeave
- **Benchmark calibration** — show "estimated vs. real" ranges when community data is available

### Low Priority / Stretch

- **PWA / offline support** — service worker, manifest.json
- **Embeddable widget / API** — `GET /api?gpu=rtx4090&model=llama3&quant=q4` → JSON result
- **Ollama command generator** — ready-to-copy commands after hardware recommendation

---

## Completed

- [x] CPU inference support + CPU-only mode
- [x] Multi-GPU support (2x, 4x, 8x) with scaling estimates
- [x] Auto GPU + CPU detection (WebGL/WebGPU)
- [x] Advanced filters (context, quant, size, speed, benchmarks, model families)
- [x] "Build for Model" reverse hardware search with full Hardware Recipe
- [x] Cloud provider alternatives (RunPod, Vast.ai, Lambda) with pricing
- [x] Datacenter-scale requirements for 1000B+ models
- [x] Setup Score & Upgrade Advisor with community data integration
- [x] Community benchmarks: submission form, voting, filtering, anti-abuse
- [x] GPU Price Tracker with history, trends, price alerts, GitHub Actions scraper
- [x] GPU Reviews with LLM-specific ratings (performance, value, noise/temps)
- [x] Cloud fallback cards when local hardware is a bottleneck
- [x] Share setup modal with Ollama command + configuration summary
- [x] Enterprise fleet sizing calculator and TCO analysis
- [x] Dark/light theme with system preference detection
- [x] Export results as JSON and CSV
- [x] SEO: Open Graph tags, sitemap.xml, robots.txt, per-page metadata
- [x] Programmatic pages: "Can [GPU] run [Model]?" (~775 static pages)
- [x] 242+ model database with 100% benchmark coverage
- [x] 122 GPU database (consumer, data center, Apple Silicon)
- [x] 65 CPU database (Intel Arrow Lake, AMD Zen 5, Apple Ultra)
- [x] GGUF download links for 80%+ of models
- [x] Graceful Supabase fallback (app works fully without it)

---

## Known Issues

- Google OAuth consent screen shows the Supabase project ID subdomain instead of the site domain. This is expected on the Supabase free tier and requires a Pro plan + custom domain to resolve.
- GPU price data depends on daily scraping from Newegg/Amazon. Prices may be stale if the scraper fails.

---

## Contributing

Pull requests are welcome. If you want to contribute:

1. Fork the repo and create a feature branch
2. Run `npm run dev` and test your changes
3. Make sure `npm run build` passes with zero errors
4. Open a PR with a clear description of the change

For data contributions (new GPUs, CPUs, or model benchmark data), you can either open a PR editing the JSON files in `public/data/`, or submit real-world benchmarks directly through the app.
