# LocalLLM Advisor

Sito statico dove l'utente seleziona la propria GPU, sceglie un use case, e ottiene una lista ordinata di modelli LLM con il comando Ollama pronto da copiare.

## Prerequisiti

- [Node.js](https://nodejs.org/) >= 18 (consigliato: 20 LTS)
- npm (incluso con Node.js)

Per verificare:
```bash
node -v   # deve essere >= 18
npm -v
```

## Setup locale

```bash
# Clona il repo
git clone https://github.com/localllm-advisor/localllm-advisor.git
cd localllm-advisor

# Installa dipendenze
npm install

# Dev server con hot reload
npm run dev
# Apre su http://localhost:3000

# Build statica (come in produzione)
npm run build && npx serve out
```

## Struttura progetto

```
src/
  app/              # Page e layout Next.js
  components/       # Componenti React (GpuSelector, ModelCard, ecc.)
  lib/              # Engine di raccomandazione + tipi TypeScript
  hooks/            # React hook (useRecommendation)
public/data/        # JSON statici (gpus.json, models.json)
scripts/            # Script Python per aggiornamento dati (placeholder)
.github/workflows/  # Deploy automatico su GitHub Pages
```

## Come funziona

1. L'utente cerca la propria GPU nel dropdown (o inserisce VRAM manualmente)
2. Sceglie un use case (Chat, Coding, Reasoning, Creative, Vision)
3. Clicca "Find My Models"
4. L'engine client-side filtra i modelli per VRAM, calcola uno score pesato per use case, e mostra i top 10 con comando Ollama

## Aggiornare i dati

I modelli e le GPU sono in `public/data/`. Per aggiungere un modello, editare `models.json` seguendo lo schema esistente. Campi chiave:

- `vram_mb`: VRAM stimata per la quantizzazione
- `benchmarks`: score dai benchmark (null se non disponibile)
- `ollama_tag`: tag esatto per `ollama run`

## Deploy

Il repo ha un workflow GitHub Actions (`.github/workflows/deploy.yml`) che al push su `main`:
1. Builda il sito statico
2. Lo deploya su GitHub Pages

Per attivarlo: repo Settings -> Pages -> Source: **GitHub Actions**.

Il sito sara' su `https://localllm-advisor.github.io/localllm-advisor/`

## Stack

- Next.js 14 (Static Export)
- TypeScript + Tailwind CSS
- Zero backend, tutto client-side
