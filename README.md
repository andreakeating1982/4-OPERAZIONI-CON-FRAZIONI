# 🧮 Operazioni con le Frazioni — App Interattiva

Un'app didattica interattiva per esercitarsi con le **operazioni tra frazioni** (addizione, sottrazione, moltiplicazione, divisione). L'app guida lo studente passo dopo passo — dal calcolo del m.c.m. alla semplificazione incrociata e al risultato finale — con riconoscimento della scrittura a mano e generazione automatica del quaderno in PDF.

> **Live**: [https://math-input-panel.easy-peasy.site](https://math-input-panel.easy-peasy.site)

---

## 🚀 Deploy su Easy-Peasy.AI (già attivo, 2 minuti)

L'app è già online su Easy-Peasy.AI. Per aggiornarla con tue modifiche:

### 1️⃣ Scarica questo repository su GitHub

1. Vai su [github.com](https://github.com) e crea un nuovo repository **pubblico** (es. `frazioni-operazioni`)
2. Carica tutti i file di questa cartella nel repository (trascina i file su GitHub, oppure usa GitHub Desktop)
3. Assicurati che il repository sia pubblico

### 2️⃣ Collega il dominio Easy-Peasy.AI

L'URL di produzione è già attivo: **[https://math-input-panel.easy-peasy.site](https://math-input-panel.easy-peasy.site)**

Se vuoi il tuo dominio personale, contatta il supporto Easy-Peasy.AI.

---

## 🖼️ Come incorporare l'app nel tuo blog (Blogger)

Copia e incolla il codice qui sotto in modalità HTML su Blogger. L'iframe si auto-ridimensiona in base all'altezza del contenuto.

> **File**: apri `embed.html` per il codice completo già pronto.

```html
<!--OPERAZIONI CON LE FRAZIONI-->
<div style="background: rgb(250, 248, 245); border-radius: 16px; box-shadow: rgba(0, 0, 0, 0.08) 0px 4px 20px; font-family: system-ui, -apple-system, sans-serif; margin: 0px auto; max-width: 800px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, rgb(210, 195, 170) 0%, rgb(235, 220, 200) 100%); padding: 16px 20px; text-align: center;">
    <span style="color: #3d2b1f; font-family: 'Cambria Math','Cambria','Hoefler Text','Times New Roman',serif; font-size: 15px; font-weight: 600; letter-spacing: 1px;">OPERAZIONI CON LE FRAZIONI</span>
  </div>
  <iframe id="frazioniAppIframe" loading="lazy" src="https://math-input-panel.easy-peasy.site/" style="border: none; display: block; height: 600px; min-width: 100%; transition: height 0.2s ease; width: 1px;" title="Operazioni con le Frazioni">
  </iframe>
</div>

<script>
(function() {
  var iframe = document.getElementById('frazioniAppIframe');
  if (!iframe) return;
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'labvisivo:height' && typeof e.data.height === 'number') {
      if (e.data.height > 100) iframe.style.height = e.data.height + 'px';
    }
  });
})();
</script><br /><br />
```

---

## 📱 Come si usa

### Per lo studente

1. **Scegli la modalità**: Addizione/Sottrazione oppure Moltiplicazione/Divisione
2. **Scrivi le frazioni**: Usa il dito o il mouse per scrivere numeratore e denominatore di entrambe le frazioni nei riquadri. Il riconoscimento automatico converte la scrittura in cifre.
3. **Avvia l'esercizio**: Clicca su "INIZIA ESERCIZIO" per cominciare.
4. **Segui i passi guidati**:
   - **Addizione/Sottrazione**: calcola il m.c.m., dividi per ogni denominatore e moltiplica per il numeratore, somma/sottrai, semplifica il risultato
   - **Moltiplicazione/Divisione**: trasforma la divisione in moltiplicazione, semplifica in croce, moltiplica numeratori e denominatori, semplifica il risultato
5. **Scrivi i risultati** in ogni passaggio nei riquadri dedicati
6. **Feedback immediato**: ogni risposta viene corretta in tempo reale
7. **Quaderno**: ogni passaggio viene aggiunto a un riquadro "RICOPIA SUL QUADERNO" visibile quando la risposta è corretta
8. **Scarica il PDF**: clicca su "SCARICA PDF" in fondo per salvare tutto il quaderno

---

## 🔧 Personalizzare l'app

### Struttura dei file principali

```
frazioni-operazioni/
├── README.md
├── embed.html              ← Codice embed per Blogger
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
├── client/
│   ├── index.html
│   ├── public/
│   │   └── models/comer/   ← Modelli ONNX per riconoscimento scrittura
│   └── src/
│       ├── App.tsx          ← Router principale
│       ├── main.tsx         ← Entry point React
│       ├── index.css        ← Stili globali e tema
│       ├── pages/
│       │   └── FractionExercises.tsx  ← ⭐ COMPONENTE PRINCIPALE
│       ├── components/
│       │   ├── FractionDisplay.tsx    ← Visualizzazione frazioni
│       │   ├── NumberInputCanvas.tsx  ← Input scrittura a mano
│       │   └── ui/                   ← UI shadcn/ui
│       ├── hooks/
│       └── lib/
├── server/
│   └── index.ts            ← Server Express
└── shared/
    └── const.ts
```

### Il file principale: `FractionExercises.tsx`

Tutta la logica dell'app risiede in **`client/src/pages/FractionExercises.tsx`** (~1400 righe). Qui trovi:

| Sezione | Righe | Descrizione |
|---|---|---|
| **Math utilities** | 7–70 | `gcd`, `lcm`, `semplificaFrazione`, `fattorizzazionePrimi`, `round2` |
| **Componente principale** | 80–1405 | State, computed values, render, NotebookGuide, PDF |

#### Funzioni matematiche chiave

```typescript
// Massimo comune divisore
function gcd(a: number, b: number): number

// Minimo comune multiplo
function lcm(a: number, b: number): number

// Semplifica una frazione
function semplificaFrazione(num: number, den: number): { num: number; den: number }

// Scomposizione in fattori primi
function fattorizzazionePrimi(n: number): Record<number, number>

// Arrotonda a 2 decimali
function round2(n: number): number
```

#### Computed values (useMemo)

- **`addSubComputed`** (riga ~115): calcola m.c.m., valori intermedi, risultato finale per addizione/sottrazione
- **`mulDivComputed`** (riga ~165): calcola semplificazione incrociata, risultato finale per moltiplicazione/divisione

#### PDF generato

La funzione `handleScaricaPdf` (~riga 260) raccoglie tutti i contenuti `.notebook-content` e li stampa in un nuovo documento HTML con:
- Font **Cambria Math** per tutto il testo
- Allineamento centrato
- Spaziatura aumentata tra i blocchi
- Barre di frazione visibili
- Nessuna intestazione, numerazione o linea separatrice

---

## 🏗️ Sviluppo in locale

### Prerequisiti

- **Node.js** 18+ e **pnpm** installato

### Avvio

```bash
# Installa le dipendenze
pnpm install

# Avvia il server di sviluppo
pnpm dev

# L'app sarà su http://localhost:3000
```

### Build di produzione

```bash
pnpm build
pnpm start   # Avvia il server di produzione su http://localhost:3000
```

---

## ⚙️ Deploy manuale (alternativo)

### Su qualsiasi hosting Node.js

```bash
pnpm build
# Carica la cartella `dist/` sul tuo server
# Avvia con: NODE_ENV=production node dist/index.js
```

### Su Vercel / Netlify

```bash
pnpm build
# La cartella `dist/` contiene il bundle pronto
```

---

## 🎨 Dettagli tecnici

### Stack

| Tecnologia | Uso |
|---|---|
| **React 19** | UI framework |
| **TypeScript** | Type safety |
| **Tailwind CSS 4** | Stili |
| **Vite 7** | Build tool |
| **Wouter** | Routing client-side |
| **ONNX Runtime** (`ink-on`) | Riconoscimento scrittura a mano |
| **KaTeX** (`katex`) | Rendering formule matematiche |
| **Express** | Server di produzione |
| **shadcn/ui** | Componenti UI |

### Riconoscimento scrittura a mano

L'app usa modelli ONNX (`client/public/models/comer/`) per riconoscere cifre scritte a mano tramite il componente `NumberInputCanvas`. Il modello `ink-on` carica i file `.onnx` e processa i tratti disegnati sul canvas.

### Auto-ridimensionamento iframe

L'app invia messaggi `postMessage` con `{ type: 'labvisivo:height', height }` al genitore ogni volta che l'altezza del contenuto cambia (via `ResizeObserver` + `MutationObserver`). Il codice embed ascolta questi messaggi e adatta l'altezza dell'iframe.

---

## 📄 Licenza

MIT — libero di usare, modificare e condividere.

---

## 🔗 Link

- **App live**: [https://math-input-panel.easy-peasy.site](https://math-input-panel.easy-peasy.site)
- **Repository**: [https://github.com/andreakeating1982/frazioni-operazioni](https://github.com/andreakeating1982/frazioni-operazioni)
- **Blogger**: incolla `embed.html` nel tuo blog
