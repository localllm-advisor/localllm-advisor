# LocalLLM Advisor — Business Plan

**Versione:** 1.0
**Data:** Marzo 2025
**Founders:** [Nome 1] — Data Scientist / CEO | [Nome 2] — DevOps / CTO

---

## 1. Executive Summary

LocalLLM Advisor è una piattaforma web che aiuta utenti e professionisti a scegliere il miglior modello LLM per il proprio hardware — o il miglior hardware per un dato modello — interamente in locale, senza dipendenze da servizi cloud.

Il prodotto si posiziona all'incrocio di due trend in forte crescita: l'esplosione dei modelli open-weight (Llama, Qwen, DeepSeek, Gemma) e la crescente domanda di AI locale per ragioni di privacy, costo e indipendenza tecnologica.

Il tool è già funzionante: 132 modelli con benchmark completi, 56 GPU con prezzi, motore di scoring, auto-detection hardware, community benchmarks, e hardware recipe. L'obiettivo è andare online entro 30 giorni, acquisire i primi 10.000 utenti mensili in 3 mesi, e raggiungere il break-even operativo entro 12 mesi tramite affiliazioni, sponsorship e contenuti premium.

---

## 2. Problema

Chi vuole usare LLM in locale oggi si trova davanti a tre domande senza risposta semplice:

1. **"Il mio hardware può far girare questo modello?"** — Servono calcoli su VRAM, bandwidth, quantizzazione, e la risposta cambia per ogni combinazione GPU/modello/quant.
2. **"Quale modello è il migliore per il mio caso d'uso?"** — Esistono centinaia di modelli, decine di benchmark, e nessuno strumento che li incrocia con le specifiche hardware dell'utente.
3. **"Che hardware devo comprare?"** — Chi vuole entrare nel mondo local AI non sa se spendere $500 o $3000, e non esistono raccomandazioni oggettive basate su dati.

Le risorse attuali (Reddit, YouTube, blog post) sono frammentate, soggettive, e diventano obsolete in settimane.

---

## 3. Soluzione

LocalLLM Advisor risolve questi tre problemi con un'unica interfaccia:

- **Find Models** — Seleziona il tuo hardware, scegli un use case, ottieni una classifica di modelli con stime di performance realistiche e comandi Ollama pronti.
- **Build for Model** — Scegli un modello, imposta budget e velocità desiderata, ottieni raccomandazioni hardware con prezzi e link d'acquisto.
- **Community Benchmarks** — Dati reali crowdsourced per validare le stime teoriche.

Differenziatori chiave:
- 100% client-side (nessun backend, nessun dato utente raccolto)
- Benchmark coverage completa su tutti i modelli
- Engine di scoring trasparente e documentato
- Supporto Apple Silicon, multi-GPU, cloud alternatives

---

## 4. Mercato

### Dimensione

- **r/LocalLLaMA**: 300.000+ iscritti, in crescita del 15-20% trimestrale
- **Ollama**: 5M+ download cumulativi (fonte: GitHub stars + Docker pulls)
- **LM Studio**: 2M+ download
- **Ricerche Google** per "best GPU for LLM", "how much VRAM for Llama", "run AI locally": in crescita esponenziale dal 2023

Il mercato target immediato è composto da 500.000-1.000.000 di utenti attivi nel mondo che già usano o vogliono usare LLM in locale. Il mercato potenziale più ampio include sviluppatori, ricercatori, PMI che vogliono AI privata, e appassionati tech.

### Segmentazione

| Segmento | Dimensione stimata | Willingness to pay | Priorità |
|---|---|---|---|
| Hobbyist/smanettoni | ~400K | Bassa (affiliate) | Alta (volume) |
| Sviluppatori professionisti | ~200K | Media (tool/API) | Alta |
| PMI privacy-conscious | ~50K | Alta (consulting) | Media (fase 2) |
| Studenti/ricercatori | ~150K | Bassa | Media (SEO) |

### Concorrenza

| Competitor | Punti di forza | Debolezze |
|---|---|---|
| r/LocalLLaMA | Community enorme | Non è un tool, info frammentata |
| LLM Explorer (vari) | Catalogo modelli | Nessuna correlazione con hardware |
| Can I Run This LLM? | Semplicità | Solo fit/no-fit, nessuno scoring |
| GPU Benchmark sites | Dati hardware | Zero focus su LLM |

Nessun competitor attuale offre la combinazione di: scoring per use case + hardware recommendation + community benchmarks + GGUF links + multi-GPU support.

---

## 5. Business Model

### Fase 1: Revenue da affiliazione (Mese 0-6)

| Fonte | Revenue stimata/mese | Note |
|---|---|---|
| Amazon Affiliates (GPU) | €200-800 | 3-4% su GPU, avg €30/vendita |
| Newegg Affiliates | €100-400 | Simile ad Amazon |
| Ollama/LM Studio sponsor | €0-500 | Da negoziare dopo trazione |
| **Totale Fase 1** | **€300-1.700/mese** | |

Ipotesi: 10.000-30.000 visitatori/mese, conversion rate affiliazione 0.5-1%.

### Fase 2: Sponsorship + Newsletter (Mese 6-12)

| Fonte | Revenue stimata/mese | Note |
|---|---|---|
| Affiliate (crescita) | €800-2.000 | Più traffico, più conversioni |
| Sponsor banner/featured | €500-2.000 | AMD, NVIDIA partner program, tool AI |
| Newsletter sponsorship | €200-1.000 | CPM €20-50 su lista tech |
| **Totale Fase 2** | **€1.500-5.000/mese** | |

Ipotesi: 50.000-100.000 visitatori/mese, newsletter 3.000-5.000 iscritti.

### Fase 3: Contenuti premium + B2B (Mese 12-24)

| Fonte | Revenue stimata/mese | Note |
|---|---|---|
| Revenue precedenti (crescita) | €3.000-6.000 | |
| Guide/corsi premium | €500-2.000 | "Deploy AI in azienda", prompt engineering |
| API access (per tool terzi) | €500-1.500 | Recommendation engine as API |
| Consulting PMI | €1.000-3.000 | Sizing hardware per deployment aziendali |
| **Totale Fase 3** | **€5.000-12.500/mese** | |

### Proiezione annuale

| | Anno 1 | Anno 2 |
|---|---|---|
| Revenue lorda | €12.000-30.000 | €60.000-150.000 |
| Costi operativi | €2.000-5.000 | €10.000-25.000 |
| Revenue netta (pre-tax) | €10.000-25.000 | €50.000-125.000 |

---

## 6. Costi

### Fase iniziale (Mese 0-6)

| Voce | Costo | Frequenza |
|---|---|---|
| Dominio (.com) | €12 | Annuale |
| Hosting (Vercel/GitHub Pages) | €0 | Free tier |
| Supabase (community benchmarks) | €0 | Free tier fino a 500MB |
| Email marketing (Resend/Mailchimp) | €0-20/mese | Free tier iniziale |
| Costituzione società (SRL semplificata o SRLs) | €500-1.500 | Una tantum |
| Commercialista | €100-200/mese | |
| **Totale Fase iniziale** | **~€200/mese + €1.500 una tantum** | |

### Fase di crescita (Mese 6-12)

| Voce | Costo | Frequenza |
|---|---|---|
| Hosting (se traffico alto) | €20-50/mese | Vercel Pro |
| Supabase Pro | €25/mese | Se community cresce |
| Email marketing | €30-50/mese | |
| Growth marketing freelance | €500-1.000/mese | Opzionale |
| Tool analytics (Plausible) | €9/mese | Privacy-friendly |
| **Totale crescita** | **€600-1.300/mese** | |

---

## 7. Go-to-Market

### Settimana 1-2: Launch

- Deploy su dominio definitivo (localllm-advisor.com o simile)
- Post su r/LocalLLaMA (Show & Tell) — target: front page, 500+ upvotes
- Post su Hacker News (Show HN) — target: front page
- Post su X/Twitter con demo GIF/video
- Post su r/selfhosted, r/MachineLearning, r/artificial

### Settimana 3-4: SEO Foundation

- Pubblicare 5-10 pagine SEO long-tail: "Best GPU for [Modello] [Anno]", "How much VRAM for [Modello]", "[GPU] vs [GPU] for LLM"
- Queste pagine si posizionano su Google in 2-4 settimane e portano traffico passivo costante
- Integrare link affiliati in tutte le raccomandazioni hardware

### Mese 2-3: Community Seed

- Rispondere attivamente su r/LocalLLaMA linkando il tool quando rilevante (senza spam)
- Creare una newsletter settimanale: "This Week in Local AI" (nuovi modelli, benchmark, hardware deals)
- Attivare GitHub Discussions per feedback e feature request

### Mese 3-6: Partnership

- Contattare AMD Developer Relations (hanno budget per creator AI)
- Proporre integrazione/mention a Ollama, LM Studio, Open WebUI
- Guest post su blog tech (Towards Data Science, Medium, dev.to)

### Mese 6-12: Espansione

- Aggiungere sezione guide/tutorial (installazione Ollama, ottimizzazione, prompt engineering)
- Valutare community features solo se la domanda è dimostrata
- Esplorare B2B: landing page dedicata "AI locale per la tua azienda"

---

## 8. Metriche Chiave (KPI)

| Metrica | Target 3 mesi | Target 6 mesi | Target 12 mesi |
|---|---|---|---|
| Visitatori unici/mese | 10.000 | 50.000 | 100.000 |
| Iscritti newsletter | 500 | 3.000 | 8.000 |
| Community benchmarks | 100 | 500 | 2.000 |
| Revenue mensile | €300 | €1.500 | €5.000 |
| Posizioni SEO top 10 | 5 | 20 | 50 |
| Click affiliati/mese | 500 | 3.000 | 10.000 |

---

## 9. Team

### Founder 1 — Software Engineer / Data Scientist
- Sviluppo frontend/backend, data pipeline, modelli di scoring
- Content tecnico (blog, guide, documentazione)

### Founder 2 — Data Scientist / DevOps
- Infrastruttura, CI/CD, scraping pipeline, monitoring
- Analisi dati, ottimizzazione performance, A/B testing

### Figure da coinvolgere (non soci)

| Ruolo | Quando | Come | Costo stimato |
|---|---|---|---|
| Commercialista online | Mese 0 | Servizio fisso | €100-200/mese |
| Mentor startup | Mese 0-1 | Incubatore/CDP Venture/acceleratore | Gratuito |
| Growth marketer freelance | Mese 3-6 | LinkedIn/Indie Hackers | €500-1.000/mese |
| Content writer tecnico | Mese 6+ | Freelance | €300-500/mese |

Non è necessario assumere nessuno nei primi 6 mesi. I founder coprono tutte le competenze tecniche necessarie.

---

## 10. Aspetti Legali e Societari

### Forma societaria consigliata

**SRL Semplificata (SRLs)** — Costo di costituzione: €0-500 (atto notarile gratuito o quasi per under-35 con capitale €1).

Vantaggi: responsabilità limitata, possibilità di fatturare, accesso a regimi fiscali agevolati. Alternativa iniziale: una P.IVA forfettaria di uno dei due founder, con accordo scritto per la futura società.

### Tempistiche consigliate

- **Mese 0-2**: Iniziare con P.IVA forfettaria di un founder (tassazione 5% per primi 5 anni se nuova attività, limite €85.000)
- **Mese 3-6**: Costituire SRLs quando le revenue superano €500/mese o servono contratti di sponsorship
- Accordo scritto tra i founder dal giorno 0 (quote, ruoli, vesting, clausola di uscita)

### Adempimenti

- [ ] Accordo scritto tra founder (quote 50/50, vesting 2 anni, cliff 6 mesi)
- [ ] P.IVA forfettaria (codice ATECO 62.01 — sviluppo software)
- [ ] Privacy policy e cookie policy sul sito (GDPR)
- [ ] Disclosure "affiliate links" visibile (requisito Amazon Associates + normativa UE)
- [ ] Terms of service base

---

## 11. Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---|---|---|---|
| Competitor lancia tool simile | Alta | Medio | Velocità di go-to-market, SEO first-mover, community moat |
| Reddit/community non risponde al lancio | Media | Alto | Preparare 3-4 canali di lancio in parallelo, non dipendere da uno solo |
| Revenue affiliate insufficienti | Media | Medio | Diversificare subito: sponsorship + newsletter + SEO |
| Cambio rapido nel mercato modelli | Alta | Basso | Pipeline di aggiornamento dati già automatizzata |
| Burnout founder (progetto part-time) | Media | Alto | Obiettivi settimanali realistici, milestone chiare, celebrare i progressi |
| Problemi legali (GDPR, affiliate disclosure) | Bassa | Alto | Compliance dal giorno 0, privacy policy, no dati utente sensibili |

---

## 12. Roadmap

```
MESE 0-1 ──────────────────────────────────────────
  [x] Prodotto funzionante (132 modelli, 56 GPU)
  [ ] Deploy su dominio definitivo
  [ ] Launch Reddit + HN + Twitter
  [ ] Affiliate links attivi (Amazon, Newegg)
  [ ] Landing page con email signup
  [ ] Privacy policy + affiliate disclosure

MESE 2-3 ──────────────────────────────────────────
  [ ] 10 pagine SEO long-tail pubblicate
  [ ] Newsletter settimanale attiva
  [ ] GitHub Discussions aperte
  [ ] Primi 500 iscritti newsletter
  [ ] Primi dati analytics (capire cosa funziona)

MESE 3-6 ──────────────────────────────────────────
  [ ] 50.000 visitatori/mese
  [ ] Primo contatto sponsor (AMD, tool AI)
  [ ] Sezione guide/tutorial
  [ ] Mobile responsive completo
  [ ] Costituzione SRLs (se revenue lo giustificano)

MESE 6-12 ─────────────────────────────────────────
  [ ] 100.000 visitatori/mese
  [ ] €5.000/mese revenue
  [ ] Partnership attive con 2-3 sponsor
  [ ] Valutazione community features
  [ ] Esplorazione B2B

MESE 12-24 ─────────────────────────────────────────
  [ ] Revenue stabile €8.000-12.000/mese
  [ ] Team allargato (1 freelance growth/content)
  [ ] API pubblica per recommendation engine
  [ ] Espansione internazionale (localizzazione)
```

---

## 13. Exit / Scenari a lungo termine

Il progetto non richiede investimenti esterni per essere profittevole. I possibili scenari a 2-5 anni sono:

1. **Lifestyle business** — €100-150K/anno netti per i due founder, gestibile part-time dopo la fase di crescita. Scenario più probabile e più sicuro.
2. **Acquisizione** — Tool di questo tipo interessano a: Ollama, LM Studio, produttori hardware (AMD, NVIDIA), piattaforme cloud (RunPod, Lambda). Valuation stimata: 3-5x revenue annuale.
3. **Scaling** — Se il mercato local AI esplode come previsto, pivot verso piattaforma SaaS B2B per enterprise AI deployment. Richiede funding.

La strategia consigliata è puntare allo scenario 1, che non preclude gli altri due.

---

*Documento redatto a scopo di pianificazione interna. Le stime finanziarie sono basate su benchmark di mercato per tool tech di nicchia e vanno validate con dati reali post-lancio.*
