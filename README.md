# 🧮 Operazioni con le Frazioni

Un'app didattica interattiva per esercitarsi con le **operazioni tra frazioni** (addizione, sottrazione, moltiplicazione, divisione). L'app guida lo studente passo dopo passo — dal calcolo del m.c.m. alla semplificazione incrociata e al risultato finale — con riconoscimento della scrittura a mano e generazione automatica del quaderno in PDF. Approccio metacognitivo, adatto anche ad alunni **BES e DSA**.

> **Live**: [https://math-input-panel.easy-peasy.site](https://math-input-panel.easy-peasy.site)

---

## 📚 Documentazione inclusa (leggi prima questi file)

| File | Descrizione |
|---|---|
| **`AGENTS.md`** | 🤖 Istruzioni rapide per agenti IA (Copilot, Claude, MARKY): comandi, file critici, regole anti-regressione |
| **`GUIDA-IA.md`** | 🤖 Guida per l'**intelligenza artificiale**: come ricostruire e variare l'app partendo da GitHub |
| **`DEPLOY-RENDER.md`** | 🚀 Come trasferire l'app su **Render** via GitHub (Blueprint `render.yaml`) |
| **`ACCESSIBILITA.md`** | ♿ **SEZIONE ACCESSIBILITÀ**: tutte le misure BES/DSA (OpenDyslexic, ecc.) portabili su altre app |
| **`IMPLEMENTAZIONE-IA.md`** | 🧭 Documento operativo per implementare mediante IA le 4 aree chiave (foto/OCR, mappe, tremolio, quaderno) |
| **`ISTRUZIONI-GITHUB.txt`** | Riepilogo rapido: da dove cominciare |
| **`cornice-dinamica/README.md`** | 🖼️ La cornice dinamica (embed Blogger a altezza automatica) |
| **`docs/quaderno-matematica/`** | 📜 Sorgenti del Quaderno «Matematica Facile» (8 sezioni HTML + build.py WeasyPrint) |

---

## 🆕 Foto → ritaglio → riconoscimento → trascrizione (OCR)

Nella fase di input lo studente può **fotografare l'esercizio dal libro** (o caricarlo /
trascinarlo / incollarlo con Ctrl+V), **ritagliarlo** con la finestra libera a 4 bordi +
4 angoli (+ rotazione ±90°), e l'app **riconosce le due frazioni e l'operazione** e le
trascrive nei campi. Il riconoscimento usa Tesseract.js self-hosted (funziona offline e
su Render) con **ricostruzione geometrica dalle bounding box**: le barre di frazione
orizzontali NON sono leggibili dall'OCR, quindi numeratore e denominatore vengono
ricostruiti dalla POSIZIONE (numero in alto = numeratore). Flag fuzzy + toast quando
il riconoscimento è incerto: lo studente controlla sempre prima di premere CALCOLA.

## 🗺️ Mappa concettuale (PDF a 4 livelli di supporto)

Il pulsante **MAPPA CONCETTUALE (PDF)** genera la mappa «Le regole per le operazioni
con le frazioni» in **4 parti** (numerazione pagine riparte da 1 per parte): PARTE A
svolta sui tre percorsi (3/4 + 1/6, 2/3 × 4/5, 3/4 ÷ 2/5) + **LIVELLO 1** supporto
massimo (valori puntinati), **LIVELLO 2** supporto medio, **LIVELLO 3** supporto
minimo — per il fade-out del supporto nella didattica inclusiva BES/DSA. Numeratori
blu, denominatori verdi, OpenDyslexic, paginazione a misurazione DOM reale.

## 📜 Il Quaderno PDF «Matematica Facile»

Il pulsante **IL QUADERNO PDF** apre il quaderno inclusivo **«Matematica Facile»**
(53 pagine PDF/UA-1 a flusso continuo): matematica e geometria per **obiettivi minimi,
5 anni, liceo linguistico** — un anno per capitolo con codice colore, box TRUCCO/IN
SINTESI, verifiche e mappa finale. I sorgenti completi (HTML + build.py WeasyPrint)
sono in `docs/quaderno-matematica/`.

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
