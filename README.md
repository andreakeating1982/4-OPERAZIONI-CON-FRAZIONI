# 🧮 Operazioni con le Frazioni

Un'app didattica interattiva per esercitarsi con le **operazioni tra frazioni** (addizione, sottrazione, moltiplicazione, divisione). L'app guida lo studente passo dopo passo — dal calcolo del m.c.m. alla semplificazione incrociata e al risultato finale — con riconoscimento della scrittura a mano e generazione automatica del quaderno in PDF. Approccio metacognitivo, adatto anche ad alunni **BES e DSA**.

> **Live**: [https://math-input-panel.easy-peasy.site](https://math-input-panel.easy-peasy.site)

---

## 📚 Documentazione inclusa (leggi prima questi file)

| File | Descrizione |
|---|---|
| **`GUIDA-IA.md`** | 🤖 Guida per l'**intelligenza artificiale**: come ricostruire e variare l'app partendo da GitHub |
| **`DEPLOY-RENDER.md`** | 🚀 Come trasferire l'app su **Render** via GitHub (Blueprint `render.yaml`) |
| **`ACCESSIBILITA.md`** | ♿ **SEZIONE ACCESSIBILITÀ**: tutte le misure BES/DSA (OpenDyslexic, ecc.) portabili su altre app |
| **`ISTRUZIONI-GITHUB.txt`** | Riepilogo rapido: da dove cominciare |
| **`cornice-dinamica/README.md`** | 🖼️ La cornice dinamica (embed Blogger a altezza automatica) |

---

## ♿ Accessibilità e inclusione (BES/DSA)

L'app include una **barra di accessibilità** con 5 moduli — **Font** (A−/A+), **Interlinea**, **Righello**, **Modalità** (alto contrasto), **Ascolto** (lettura ad alta voce in italiano) — oltre a **font OpenDyslexic** auto-ospitato, **focus visibile**, **`prefers-reduced-motion`**, **PDF in OpenDyslexic** e **preferenze persistenti**.

> **Sezione completa**: **[`ACCESSIBILITA.md`](ACCESSIBILITA.md)** — con la tabella delle 14 misure e le istruzioni per portarle su altre app simili.

---

## 🖼️ Cornice dinamica (embed Blogger)

La cartella **`cornice-dinamica/`** contiene il blocco HTML da incollare su Blogger (o qualsiasi sito) per mostrare l'app in un **iframe a altezza automatica**, con font OpenDyslexic, **Schermo intero**, **Ricarica** e **isolamento multi-embed (impermeabile, v3)**.

- ⭐ **`embed-frazioni-dedicata.html`** — versione consigliata (v3 impermeabile + anti-loop)
- **`embed-frazioni-lite.html`** — versione minima riutilizzabile (`?app=URL`)
- **`embed-universale.html`** — template universale per altre app
- **`embed-frazioni.html`** — versione autosufficiente (font in base64)

> Il protocollo altezza dinamica è implementato in `client/src/lib/heightSync.ts`
> (inizializzato da `client/src/main.tsx`).

---

## 🚀 Deploy su Easy-Peasy.AI (già attivo)

L'app è già online su Easy-Peasy.AI: **[https://math-input-panel.easy-peasy.site](https://math-input-panel.easy-peasy.site)**.

Per trasferirla su **Render** (o un altro host) via GitHub, segui **[`DEPLOY-RENDER.md`](DEPLOY-RENDER.md)** — il pacchetto include già `render.yaml` (Blueprint) e la CI GitHub (`.github/workflows/ci.yml`).

---

## 📱 Come si usa

1. **Scegli la modalità**: Addizione e Sottrazione oppure Moltiplicazione e Divisione
2. **Scrivi le frazioni**: a mano libera nei canvas (riconoscimento ONNX) oppure con **✎ digita il valore** (tastiera)
3. **Avvia l'esercizio**: clicca su «CALCOLA»
4. **Segui i passi guidati** con feedback immediato a ogni risposta
5. **Scarica il PDF** del quaderno completo

---

## 🔧 Struttura del progetto

```
math-input-panel/
├── README.md
├── GUIDA-IA.md                  ← Guida per l'IA (ricostruzione e varianti)
├── DEPLOY-RENDER.md             ← Trasferimento su Render via GitHub
├── ACCESSIBILITA.md             ← ♿ Sezione accessibilità (14 misure)
├── ISTRUZIONI-GITHUB.txt        ← Riepilogo rapido
├── render.yaml                  ← Blueprint Render
├── .github/workflows/ci.yml     ← CI GitHub (check + build)
├── embed.html                   ← Codice embed per Blogger
├── post-blog.html               ← Testo del post di presentazione
├── cornice-dinamica/            ← Cornice dinamica (embed v3 impermeabile)
├── package.json
├── vite.config.ts
├── client/
│   ├── index.html
│   ├── public/
│   │   ├── fonts/               ← Font OpenDyslexic
│   │   └── models/comer/        ← Modelli ONNX
│   └── src/
│       ├── App.tsx
│       ├── main.tsx             ← initHeightSync() (cornice dinamica)
│       ├── index.css            ← Tema + accessibilità + lf-embedded
│       ├── pages/
│       │   ├── WelcomePage.tsx
│       │   ├── FractionExercises.tsx  ← ⭐ Componente principale
│       │   └── Home.tsx
│       ├── components/
│       │   ├── AccessibilityToolbar.tsx  ← Barra di accessibilità
│       │   ├── FractionDisplay.tsx
│       │   ├── MathDrawCanvas.tsx
│       │   └── NumberInputCanvas.tsx     ← Input + riconoscimento + digita il valore
│       ├── contexts/
│       │   └── AccessibilityContext.tsx
│       ├── hooks/
│       │   └── useReadAloud.ts           ← Lettura ad alta voce (TTS)
│       └── lib/
│           └── heightSync.ts             ← Cornice dinamica
├── server/
│   └── index.ts                 ← Express + COOP/COEP + CORS /fonts
└── shared/
    └── const.ts
```

---

## 🏗️ Sviluppo locale

```bash
pnpm install
pnpm check       # type-check TypeScript
pnpm dev         # http://localhost:5173
pnpm build       # build di produzione (client + server)
pnpm start       # server produzione
```

---

## 🎨 Stack

| Tecnologia | Uso |
|---|---|
| React 19 / TypeScript | UI |
| Tailwind CSS 4 | Stili |
| Vite 7 | Build |
| Wouter | Routing |
| ONNX Runtime (`ink-on`) | Riconoscimento scrittura |
| KaTeX | Formule matematiche |
| Express | Server produzione |
| shadcn/ui | Componenti |

---

## 📄 Licenza

MIT
