# TODO

Problemi da risolvere in ordine di priorità.

---

## 🔴 Priorità Alta (senza questi il prodotto non funziona)

### 1. Espandere il database modelli

**Problema:** Abbiamo ~10 modelli. Un tool di raccomandazione con pochi modelli è inutile.

**Obiettivo:** Almeno 40-50 modelli.

**Modelli da aggiungere:**
- Llama 3.1 (8B, 70B, 405B)
- Llama 3.2 (1B, 3B, 11B-Vision, 90B-Vision)
- Mistral (7B, Nemo 12B, Small 22B, Large 123B)
- Mixtral (8x7B, 8x22B)
- Qwen 2.5 (0.5B, 1.5B, 3B, 7B, 14B, 32B, 72B)
- Qwen 2.5 Coder (tutte le size)
- DeepSeek V2, V2.5, Coder
- Phi-3 (mini, small, medium)
- Phi-3.5 (mini, MoE)
- Gemma 2 (2B, 9B, 27B)
- Command-R, Command-R+
- Yi (6B, 9B, 34B)
- InternLM 2.5
- GLM-4

**Come fare:**
1. Esegui `python scripts/update_models.py` (aggiorna OLLAMA_MODELS nello script)
2. Oppure aggiungi manualmente a `public/data/models.json`

**File da modificare:**
- `scripts/update_models.py` (lista OLLAMA_MODELS)
- `public/data/models.json`

---

### 2. Mobile responsive

**Problema:** Il sito probabilmente è inutilizzabile su mobile. Molta gente cerca da telefono.

**Cosa controllare:**
- [ ] Homepage form
- [ ] Hardware selector dropdowns
- [ ] Results cards
- [ ] Comparison table (deve scrollare orizzontalmente)
- [ ] Charts
- [ ] Navigation header

**Come testare:**
1. Chrome DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. Testa su iPhone SE (320px) e iPhone 12 (390px)

**File da modificare:**
- `src/components/HardwareConfig.tsx`
- `src/components/ResultsList.tsx`
- `src/app/page.tsx`

---

### 3. Validazione con dati reali

**Problema:** Diciamo "45 tok/s stimati" ma l'utente non può verificare. Zero credibilità.

**Soluzione:** Aggiungere sezione con benchmark reali della community.

**Opzioni:**
1. **Manuale:** Crea `public/data/real-benchmarks.json` con dati da Reddit/YouTube
2. **Crowdsourced:** Form dove utenti riportano i loro risultati
3. **Link esterni:** Linka a post/video con test reali

**Esempio struttura:**
```json
{
  "model": "llama3:8b-q4",
  "gpu": "RTX 4070 Ti",
  "actual_toks": 52,
  "source": "reddit.com/r/LocalLLaMA/xxx",
  "date": "2024-12"
}
```

---

## 🟡 Priorità Media (migliorano il prodotto)

### 4. SEO e visibilità

**Problema:** Nessuno troverà il sito su Google.

**TODO:**
- [ ] Aggiungere meta tags per ogni pagina
- [ ] Creare sitemap.xml
- [ ] Post su r/LocalLLaMA (non spam, valore genuino)
- [ ] Postare su HackerNews (Show HN)

**Contenuti da creare (per SEO):**
- "Best LLM for RTX 4060" (una pagina per GPU popolare)
- "How much VRAM do I need for Llama 3?"
- "Local LLM speed comparison 2025"

---

### 5. Share configuration

**Problema:** Non puoi condividere "guarda cosa gira sulla mia RTX 4070".

**Soluzione:** Parametri URL.

**Esempio:**
```
/localllm-advisor?gpu=rtx4070ti&usecase=coding&context=8192
```

**File da modificare:**
- `src/app/page.tsx` (leggere query params, settare stato iniziale)

---

### 6. Export risultati

**Problema:** Utente non può salvare/condividere i risultati.

**Soluzione:** Bottone "Export JSON" / "Export CSV".

**File da modificare:**
- `src/components/ResultsList.tsx`

---

## 🟢 Priorità Bassa (nice to have)

### 7. Auto-detect GPU

Usa WebGL per rilevare la GPU automaticamente.

```javascript
const gl = document.createElement('canvas').getContext('webgl');
const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
// renderer = "NVIDIA GeForce RTX 4070 Ti"
```

**Nota:** Funziona solo su desktop, non sempre accurato.

---

### 8. Dark/Light mode toggle

Attualmente solo dark mode. Alcuni preferiscono light.

**File da modificare:**
- `tailwind.config.ts` (aggiungere darkMode: 'class')
- `src/app/layout.tsx` (toggle state)
- Tutti i componenti (aggiungere classi dark:)

---

### 9. PWA (Progressive Web App)

Funziona offline, installabile su telefono.

**Come fare:**
- Aggiungere `manifest.json`
- Aggiungere service worker
- Next.js: usa `next-pwa` package

---

### 10. Filtri avanzati

Filtrare modelli per:
- Famiglia (Llama, Qwen, Mistral...)
- Architettura (dense, MoE)
- Size range (< 10B, 10-30B, > 30B)
- Capabilities (vision, coding)

---

## 📊 Metriche da tracciare (Analytics)

Una volta che GA è configurato, monitora:

1. **Quali GPU vengono cercate di più** → focus su quelle
2. **Quale use case è più popolare** → ottimizza per quello
3. **Bounce rate** → se alto, c'è un problema UX
4. **Tempo sulla pagina** → se basso, non trovano quello che cercano

---

## 🚀 Per lanciare

Prima di annunciare pubblicamente:

1. [ ] Almeno 40 modelli nel database
2. [ ] Mobile funzionante
3. [ ] Testato su 3+ browser (Chrome, Firefox, Safari)
4. [ ] Post preparato per r/LocalLLaMA
5. [ ] README con screenshot/GIF

---

## Domande?

Apri una issue su GitHub.
