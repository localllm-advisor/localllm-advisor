# TODO

Problemi da risolvere in ordine di priorità.

---

## ✅ Completati

- [x] **UX Redesign v2** - Multi-page flow: Landing → Search Fork → Model/Hardware Search → Results
- [x] **Shared components** - Navbar, Footer condivisi tra tutte le pagine
- [x] **Enterprise page** - Pagina contatti per aziende con benefit cards e form
- [x] **Database modelli espanso** - 242 modelli da 35+ famiglie, 100% benchmark coverage
- [x] **Data cleanup v2** - Rimossi 29 modelli morti, aggiunti 17 popolari
- [x] **Data expansion v3** - +110 modelli (GPT-2, BLOOM, LLaVA, Qwen3, Llama 4, ecc.)
- [x] **Benchmark 100%** - Tutti i 242 modelli con benchmark reali e capability tags
- [x] **GGUF sources** - 80%+ con link diretti (bartowski, TheBloke, unsloth)
- [x] **GPU database espanso** - 122 GPU (data center, consumer, Apple Silicon)
- [x] **CPU database espanso** - 65 CPU (AMD Zen 5, Intel Arrow Lake, Apple Ultra)
- [x] **HF models catalog** - 159 modelli nel catalogo HF
- [x] **Scoring engine v2** - Pesi aggiornati per 5 use case
- [x] **Auto-detect GPU** - WebGPU (dedicated GPU) + WebGL fallback
- [x] **Auto-detect CPU** - Thread count e Apple Silicon
- [x] **Filtri avanzati** - Context, quant, size, speed, benchmarks
- [x] **Hardware Recipe** - Raccomandazioni hardware complete
- [x] **Multi-GPU** - Configurazioni 2x, 4x, 8x con scaling
- [x] **Cloud alternatives** - RunPod, Vast.ai, Lambda
- [x] **GPU price scraper** - Prezzi USD da Newegg
- [x] **Dark/Light mode** - Toggle in header, persisted in localStorage
- [x] **Export risultati** - JSON e CSV
- [x] **Supabase schema** - 6 tabelle, 4 views, RLS policies, triggers
- [x] **SEO meta tags** - OG tags, Twitter cards, per-page metadata, sitemap.xml, robots.txt
- [x] **Graceful Supabase fallback** - App funziona al 100% senza Supabase configurato
- [x] **Dual GPU detection** - WebGPU powerPreference: high-performance per GPU dedicata

---

## 🔴 Priorità Alta — Pre-lancio (entro 30/03)

### 1. Email capture / Newsletter signup
- [x] Componente EmailCapture riutilizzabile
- [x] Integrazione sulla landing page
- [x] Integrazione sulla pagina risultati
- [x] Integrazione nel footer (variant inline)
- [ ] Setup Buttondown/Mailchimp account

### 2. Cloud provider referral links
- [x] Link RunPod, Vast.ai, Lambda pronti per referral tag
- [x] Struttura URL predisposta (aggiungere ?ref=xxx quando si hanno i referral)
- [x] REFERRAL_TAGS centralizzato in hardwareAdvisor.ts
- [ ] Registrazione ai programmi referral (dopo P.IVA)

### 3. Mobile responsive
- [ ] Homepage / Landing
- [ ] Hardware selector dropdowns
- [ ] Results cards
- [ ] Hardware Recipe cards
- [ ] Navigation header

### 4. Deploy
- [ ] GitHub repository pulito (squash commits)
- [ ] GitHub Pages configurato
- [ ] Dominio custom acquistato e configurato
- [ ] `.env.production` con variabili corrette

---

## 🟡 Priorità Media — Post-lancio

### 5. Pagine SEO programmatiche
- [x] Generatore statico: "Can [GPU] run [Model]?" (~775 pagine, 31 GPU × 25 modelli)
- [x] generateStaticParams per output: 'export'
- [x] Script generate-sitemap.js (785 URL totali)
- [x] Layout con generateMetadata per OG/Twitter
- [ ] Generatore statico: "Best GPU for [Model]"
- [ ] Generatore statico: "How much VRAM for [Model]"
- [ ] Schema.org markup per GPU/Model data

### 6. Affiliate links (dopo P.IVA)
- [ ] Amazon affiliate tag (tag=xxx-21) su tutti i link GPU
- [ ] Newegg/BestBuy affiliate tags
- [ ] Cloud provider referral tags (RunPod, Vast.ai, Lambda)
- [ ] Disclosure "affiliate link" visibile
- [ ] Click tracking analytics

### 7. Cost comparison: Buy vs Rent
- [ ] Calcolo break-even GPU locale vs cloud
- [ ] Visualizzazione interattiva (slider ore/giorno)

### 8. Share configuration via URL
- [ ] URL con parametri: ?gpu=rtx4090&model=llama3.1-70b&quant=q4
- [ ] Bottone "Share this configuration"

### 9. Validazione benchmark reali
- [ ] Bootstrap dati da Reddit/YouTube/Discord
- [ ] Range "stimato vs reale" quando ci sono community submissions
- [ ] Calibrazione formule di stima

### 10. Prezzi EUR
- [ ] Conversione USD→EUR con tasso aggiornabile
- [ ] Toggle EUR/USD nell'interfaccia

---

## 🟢 Priorità Bassa

### 11. PDF Report a pagamento
- [ ] Generazione PDF brandizzato con raccomandazione completa
- [ ] Integrazione Stripe/PayPal per pagamento
- [ ] Versione gratuita (risultati base) vs premium (report dettagliato)

### 12. Widget/API embeddabile
- [ ] Endpoint API: GPU + modello → risultato
- [ ] Widget iframe per siti terzi
- [ ] Documentazione API

### 13. Model comparison side-by-side
- [ ] Seleziona 2-3 modelli e confronta benchmark, VRAM, speed

### 14. Ollama command generator
- [ ] Comandi pronti da copiare dopo raccomandazione hardware

### 15. PWA (Progressive Web App)
- [ ] manifest.json
- [ ] Service worker per offline

### 16. Più cloud provider
- [ ] Together.ai, Replicate, Modal, Paperspace, CoreWeave

---

## 💰 Revenue streams (in ordine di attivazione)

1. **Email list** — Valore indiretto, costruisce audience. Attivo dal giorno 1.
2. **Cloud referral** — RunPod/Vast.ai/Lambda 10-15% ricorrente. Dopo P.IVA.
3. **Amazon affiliate** — 2.5% su hardware. Dopo P.IVA.
4. **PDF report enterprise** — 10-50€ per report. Medio termine.
5. **API/Widget licensing** — Per siti tech. Lungo termine.
6. **Consulenza AI Readiness** — 150€/sessione. Quando c'è volume enterprise.

---

## 🚀 Checklist lancio (30/03/2026)

1. [x] UX redesign multi-page flow
2. [x] Landing page con messaging etico/privacy
3. [x] Enterprise contact page
4. [x] SEO meta tags + sitemap + robots.txt
5. [x] Supabase schema pronto
6. [x] GPU detection dedicata (WebGPU)
7. [x] Email capture component
8. [x] Cloud referral links predisposti
9. [ ] npm run build senza errori
10. [ ] GitHub Pages live
11. [ ] Dominio custom configurato
12. [ ] Post r/LocalLLaMA preparato
13. [ ] Post HackerNews preparato
14. [ ] README con screenshot

---

## Domande?

Apri una issue su GitHub.
