# 🧮 Operazioni con le Frazioni — Widget Metacognitivo

Un'app didattica interattiva per esercitarsi con le **operazioni tra frazioni** (addizione, sottrazione, moltiplicazione, divisione). L'app guida lo studente passo dopo passo — dal calcolo del m.c.m. alla semplificazione incrociata e al risultato finale — con riconoscimento della scrittura a mano e generazione automatica del quaderno in PDF. Approccio metacognitivo, adatto anche ad alunni BES e DSA.

> **Live**: [https://math-input-panel.easy-peasy.site](https://math-input-panel.easy-peasy.site)

---

## 🚀 Deploy su Easy-Peasy.AI (già attivo)

L'app è già online su Easy-Peasy.AI. Per aggiornarla:

1. Carica questo repository su GitHub (pubblico)
2. Collega il dominio Easy-Peasy.AI: **[https://math-input-panel.easy-peasy.site](https://math-input-panel.easy-peasy.site)**

---

## 🖼️ Embed nel blog (Blogger)

Copia il file `embed.html` e incollalo in modalità HTML su Blogger. L'iframe si auto-ridimensiona via `postMessage` (`labvisivo:height`).

---

## 📱 Come si usa

1. **Scegli la modalità**: Addizione e Sottrazione oppure Moltiplicazione e Divisione (simboli matematici sopra il testo, centrati)
2. **Scrivi le frazioni**: scrivi numeratore e denominatore a mano libera nei canvas; il riconoscimento ONNX converte la scrittura in cifre
3. **Avvia l'esercizio**: clicca su «CALCOLA»
4. **Segui i passi guidati** con feedback immediato a ogni risposta
5. **Scarica il PDF** del quaderno completo

---

## 🎨 Stile e convenzioni

| Elemento | Sezione | Stile |
|---|---|---|
| **Pulsanti modalità** | Tutte | Simboli (`+ / −`, `× / ÷`) in alto, testo sotto (`flex-col`), centrati |
| **Label NUMERATORE/DENOMINATORE** | AddSub | Marrone (`text-amber-900`), no grassetto |
| **Label NUMERATORE/DENOMINATORE** | MulDiv | Arancione/blu, grassetto |
| **Label colorati** (Numeratore arancione, Denominatore blu, Denominatore azzurro, Numeratore rosso) | MulDiv | Colori vivaci, grassetto |
| **Inline span** (NUMERATORE/DENOMINATORE) | MulDiv | Arancione/rosso/blu/azzurro, grassetto |
| **Footer** | Tutte | "Realizzato da Andrea Centinaro" |
| **PDF** | Tutte | Cambria Math, centrato, senza intestazioni, spaziatura aumentata |
| **Decimali** | Tutte | Arrotondati a max 2 decimali via `round2()` |

---

## 🔧 Struttura del progetto

```
math-input-panel/
├── README.md
├── embed.html                  ← Codice embed per Blogger
├── post-blog.html              ← Testo del post di presentazione
├── package.json
├── vite.config.ts
├── client/
│   ├── index.html
│   ├── public/
│   │   └── models/comer/       ← Modelli ONNX
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── index.css            ← Tema globale
│       ├── pages/
│       │   └── FractionExercises.tsx  ← ⭐ Componente principale (~1430 righe)
│       ├── components/
│       │   ├── FractionDisplay.tsx    ← Render frazioni
│       │   ├── MathDrawCanvas.tsx     ← Canvas scrittura
│       │   └── NumberInputCanvas.tsx  ← Input + riconoscimento
│       └── lib/
├── server/
│   └── index.ts
└── shared/
    └── const.ts
```

### Il file principale: `FractionExercises.tsx`

| Sezione | Descrizione |
|---|---|
| **Math utilities** | `gcd`, `lcm`, `semplificaFrazione`, `fattorizzazionePrimi`, `round2` (2 decimali) |
| **Computed values** | `addSubComputed` (m.c.m., fattorizzazione, risultato), `mulDivComputed` (semplificazione incrociata, risultato) |
| **State** | input frazioni, risposte studente, feedback, generazione PDF |
| **PDF** | `handleScaricaPdf` — raccoglie `.notebook-content`, applica Cambria Math, centrato, senza intestazioni |

---

## 🏗️ Sviluppo locale

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # build di produzione
pnpm start      # server produzione
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

---

Realizzato da **Andrea Centinaro**
