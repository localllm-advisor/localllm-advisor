# TODO

Problemi da risolvere in ordine di priorità.

---

## ✅ Completati

- [x] **Database modelli espanso** - 84 modelli da 23 provider
- [x] **Auto-detect GPU** - WebGL detection funzionante
- [x] **Auto-detect CPU** - Thread count e Apple Silicon
- [x] **Filtri avanzati** - Context, quant, size, speed, benchmarks
- [x] **Hardware Recipe** - Sistema completo per raccomandazioni hardware
- [x] **Multi-GPU** - Configurazioni 2x, 4x, 8x con scaling
- [x] **Cloud alternatives** - RunPod, Vast.ai, Lambda
- [x] **GPU price scraper** - Prezzi USD da Newegg

---

## 🔴 Priorità Alta

### 1. Mobile responsive

**Problema:** Il sito non è ottimizzato per mobile.

**Cosa controllare:**
- [ ] Homepage form
- [ ] Hardware selector dropdowns
- [ ] Results cards
- [ ] Hardware Recipe cards
- [ ] Navigation header

**Come testare:**
Chrome DevTools → Toggle device toolbar (Ctrl+Shift+M)

---

### 2. Validazione con benchmark reali

**Problema:** Le stime sono teoriche. Serve validazione con dati reali.

**Soluzione:**
- [ ] Creare `public/data/real-benchmarks.json`
- [ ] Raccogliere dati da Reddit/YouTube/Discord
- [ ] Mostrare range "stimato vs reale"

**Esempio:**
```json
{
  "model": "llama3.1:70b-q4",
  "gpu": "RTX 4090",
  "estimated_toks": 45,
  "actual_toks": 42,
  "source": "reddit.com/r/LocalLLaMA/xxx"
}
```

---

### 3. Prezzi EUR

**Problema:** Attualmente solo USD (Newegg). Geizhals/Idealo bloccano scraping.

**Opzioni:**
- [ ] Usare Playwright per bypass anti-bot
- [ ] API ufficiali (se esistono)
- [ ] Conversione USD→EUR con tasso fisso
- [ ] Input manuale prezzi EUR

---

## 🟡 Priorità Media

### 4. SEO e meta tags

- [ ] Meta description per ogni pagina
- [ ] Open Graph tags per social sharing
- [ ] Sitemap.xml
- [ ] Schema.org markup per GPU/Model data

**Pagine da creare (SEO):**
- "Best GPU for Llama 3.1 70B"
- "RTX 4090 vs RTX 5090 for LLM"
- "How much VRAM for DeepSeek V3"

---

### 5. Share configuration via URL

**Esempio:**
```
/localllm-advisor?gpu=rtx4090&model=llama3.1-70b&quant=q4
```

Permette di condividere "guarda cosa mi serve per far girare X".

---

### 6. Cost comparison: Buy vs Rent

**Problema:** Hardware Recipe mostra GPU a $3000 e cloud a $2/hr, ma non calcola il break-even.

**Soluzione:**
```
RTX 4090: $1,800
Cloud equivalent: $0.69/hr (RunPod)
Break-even: 2,609 ore (~109 giorni 24/7)

Se usi <4 ore/giorno → Cloud conviene
Se usi >4 ore/giorno → Compra GPU
```

---

### 7. Affiliate links

- [ ] Amazon affiliate tag per link GPU
- [ ] Tracking click per analytics
- [ ] Disclosure "affiliate link" visibile

---

### 8. Export risultati

- [ ] Export JSON dei risultati
- [ ] Export CSV per spreadsheet
- [ ] Screenshot/immagine condivisibile

---

## 🟢 Priorità Bassa

### 9. Dark/Light mode toggle

Attualmente solo dark. Alcuni preferiscono light.

---

### 10. PWA (Progressive Web App)

- [ ] manifest.json
- [ ] Service worker per offline
- [ ] Install prompt

---

### 11. Model comparison

Seleziona 2-3 modelli e confronta side-by-side:
- Benchmark scores
- VRAM requirements
- Speed estimates

---

### 12. Ollama command in Hardware Recipe

Dopo aver mostrato l'hardware consigliato, mostrare:
```bash
# Installa Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Scarica il modello
ollama pull llama3.1:70b-q4_K_M

# Esegui
ollama run llama3.1:70b-q4_K_M
```

---

### 13. Più cloud provider

Aggiungere:
- [ ] Together.ai
- [ ] Replicate
- [ ] Modal
- [ ] Paperspace
- [ ] CoreWeave

---

### 14. GPU usate

Database prezzi per GPU usate (eBay, r/hardwareswap):
- RTX 3090 usata ~$700
- RTX 4090 usata ~$1400

---

## 📊 Analytics da tracciare

1. **GPU più cercate** → focus documentazione
2. **Modelli più cercati** → priorità aggiornamenti
3. **Click su "Buy on Amazon"** → revenue potenziale
4. **Click su cloud providers** → partnership?
5. **Bounce rate per device** → mobile problems

---

## 🚀 Per lanciare

1. [ ] Mobile responsive testato
2. [ ] Almeno 5 benchmark reali verificati
3. [ ] Post r/LocalLLaMA preparato
4. [ ] README con screenshot
5. [ ] Video demo (optional)

---

## Note tecniche

### Perché Geizhals blocca?
Geizhals ha protezione anti-bot aggressiva (403 Forbidden). Opzioni:
1. Playwright con headless browser (richiede più risorse)
2. Proxy rotation (costoso)
3. Rispettare robots.txt e non scrapare

### Rate limiting Newegg
Attualmente 1-2 sec delay tra richieste. Se iniziano a bloccare:
1. Aumentare delay a 3-5 sec
2. Aggiungere retry con exponential backoff
3. Caching più aggressivo (24h invece di on-demand)

---

## Domande?

Apri una issue su GitHub.
