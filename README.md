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
```

> **Nota**: In sviluppo il sito è su `http://localhost:3000`. In produzione (GitHub Pages) è sotto `/localllm-advisor`.

### Build statica (come in produzione)

```bash
npm run build && npx serve out
# Il sito sarà su http://localhost:3000/localllm-advisor
```

## Struttura progetto

```
src/
  app/              # Page e layout Next.js
  components/       # Componenti React (GpuSelector, ModelCard, ecc.)
  lib/              # Engine di raccomandazione + tipi TypeScript
  hooks/            # React hook (useRecommendation)
public/data/        # JSON statici (gpus.json, models.json)
scripts/            # Script Python per aggiornamento dati
.github/workflows/  # Deploy automatico su GitHub Pages
```

## Come funziona

1. L'utente cerca la propria GPU nel dropdown (o inserisce VRAM manualmente)
2. Sceglie un use case (Chat, Coding, Reasoning, Creative, Vision)
3. Clicca "Find My Models"
4. L'engine client-side filtra i modelli per VRAM, calcola uno score pesato per use case, e mostra i top 10 con comando Ollama

## Aggiornare i dati

I dati sono in `public/data/`:
- `models.json` - modelli LLM con benchmark e quantizzazioni
- `gpus.json` - GPU con VRAM e bandwidth

### Script automatico (modelli)

```bash
python scripts/update_models.py
```

Lo script:
1. Carica la lista curata di modelli da `MODEL_CONFIGS`
2. Recupera benchmark da HuggingFace API (se disponibili)
3. Calcola VRAM stimata per ogni quantizzazione
4. Preserva i benchmark esistenti se già presenti

Per aggiungere un nuovo modello, modificare `MODEL_CONFIGS` in `scripts/update_models.py`.

### Modifica manuale

I campi chiave in `models.json`:
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
