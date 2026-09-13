# 🤖 GUIDA-IA — Ricostruzione e variazione di "Operazioni con le Frazioni"

> **Documento operativo per un'Intelligenza Artificiale** (MARKY su Easy-Peasy.AI,
> GitHub Copilot, Claude, ChatGPT, ecc.) o per uno sviluppatore, per **ricostruire**,
> **clonare** e **variare** questa app partendo dalla repository GitHub.
>
> **App**: OPERAZIONI CON LE FRAZIONI (ex "Math Input Panel")
> **Stack**: Vite + React 19 + TypeScript + TailwindCSS 4 + shadcn/ui + KaTeX + ONNX (ink-on)
> **Nessun backend, nessun database**: tutta la logica (m.c.m., fattorizzazione,
> semplificazione incrociata, verifica, PDF) è lato client. Il server Express serve
> solo i file statici.

---

## INDICE

1. [Che cos'è l'app](#1-che-cosè-lapp)
2. [Architettura e file critici](#2-architettura-e-file-critici)
3. [Ricostruire l'app da GitHub](#3-ricostruire-lapp-da-github)
4. [Variante A — cambiare / aggiungere operazioni](#4-variante-a--cambiare--aggiungere-operazioni)
5. [Variante B — cambiare la lingua](#5-variante-b--cambiare-la-lingua)
6. [Variante C — quiz con set di domande](#6-variante-c--quiz-con-set-di-domande)
7. [Build, verifica e deploy](#7-build-verifica-e-deploy)
8. [Trasferimento su Render (via GitHub)](#8-trasferimento-su-render-via-github)
9. [ACCESSIBILITÀ (sezione portabile)](#9-accessibilità-sezione-portabile)
10. [Regole d'oro](#10-regole-doro)
11. [Cornice dinamica (embed per il blog)](#11-cornice-dinamica-embed-per-il-blog)

---

## 1. Che cos'è l'app

L'app guida uno studente nella risoluzione di **operazioni tra frazioni** in due modalità:

- **Addizione / Sottrazione**: calcolo del **m.c.m.** (minimo comune multiplo) con
  **scomposizione in fattori primi**, frazioni equivalenti, somma algebrica e
  semplificazione finale.
- **Moltiplicazione / Divisione**: **semplificazione incrociata** (penna su carta) e,
  nella divisione, **inversione di tutte le frazioni tranne la prima**.

L'input avviene tramite **canvas di scrittura a mano** (riconoscimento ONNX via ink-on),
con alternativa da tastiera **"✎ digita il valore"**. Ogni passo è accompagnato da un box
**"RICOPIA SUL QUADERNO"** e, al termine, da un **PDF scaricabile**.

Il flusso didattico (Addizione/Sottrazione):
1. Inserimento frazioni (numeratore/denominatore a mano o da tastiera)
2. Scomposizione in fattori primi e calcolo del m.c.m.
3. Frazioni equivalenti (denominatore comune)
4. Somma/differenza dei numeratori
5. Risultato e semplificazione finale

Il flusso didattico (Moltiplicazione/Divisione):
1. Inserimento frazioni
2. Inversione (solo divisione: tutte le frazioni tranne la prima)
3. Semplificazione incrociata (penna su carta con barrature)
4. Prodotto dei numeratori e dei denominatori
5. Risultato e semplificazione finale

Tutto è pensato per studenti con **BES/DSA**: pochi passi chiari, colori, box da copiare,
feedback immediato CORRETTO/SBAGLIATO, PDF finale.

---

## 2. Architettura e file critici

| File | Ruolo |
|------|-------|
| `client/src/pages/FractionExercises.tsx` | **Tutta l'app**: state, computed values, passi guidati, NotebookGuide, PDF, RICOPIA SUL QUADERNO (~2178 righe) |
| `client/src/pages/WelcomePage.tsx` | Schermata iniziale (Cognome, Nome, Data, Classe) + scelta modalità. Layout **compatto** (card subito sotto la barra, niente vuoto), aggiunge la classe `lf-welcome-top` su `<html>` quando `window.self === window.top` |
| `client/src/pages/Home.tsx` | Pannello (informazioni sul progetto) |
| `client/src/components/NumberInputCanvas.tsx` | Canvas input con riconoscimento ONNX + alternativa "✎ digita il valore" |
| `client/src/components/MathDrawCanvas.tsx` | Canvas disegno puro (penna, gomma), ResizeObserver, rendering stroke |
| `client/src/components/FractionDisplay.tsx` | Badge visualizzazione frazione riconosciuta |
| `client/src/contexts/AccessibilityContext.tsx` | Accessibilità: provider font/interlinea/righello/contrasto, localStorage `wms_access` |
| `client/src/components/AccessibilityToolbar.tsx` | Accessibilità: barra UI (Font A−/A+, Interlinea, Righello, Modalità, Ascolto) |
| `client/src/hooks/useReadAloud.ts` | **Lettura ad alta voce** (TTS italiano, converte formule KaTeX e MAIUSCOLE) |
| `client/src/lib/heightSync.ts` | Cornice dinamica: sincronizzazione altezza iframe (`labvisivo:height`) |
| `client/src/main.tsx` | Chiama `initHeightSync()` PRIMA del render |
| `client/public/fonts/` | **Font OpenDyslexic** (TTF/OTF/WOFF2) per dislessia/ipovedenti |
| `client/public/models/comer/` | Modelli ONNX (encoder/decoder int8) + `vocab.json` |
| `client/src/index.css` | Tema Tailwind, `@font-face` OpenDyslexic, stili accessibilità, `lf-embedded` |
| `server/index.ts` | Server Express: serving statico + header COOP/COEP + CORS `/fonts` |
| `ACCESSIBILITA.md` | Documentazione completa delle misure di accessibilità |
| `cornice-dinamica/` | Embed Blogger (dedicata, lite, universale, autosufficiente) |

### Funzioni matematiche (in `FractionExercises.tsx`, ~righe 7-70)

- `gcd(a, b)` — massimo comune divisore (Euclide ricorsivo)
- `lcm(a, b)` — minimo comune multiplo, output già arrotondato via `round2()`
- `semplificaFrazione(num, den)` — restituisce `{ num, den }` semplificati
- `fattorizzazionePrimi(n)` — scomposizione in fattori primi (`Record<numero, esponente>`)
- `round2(n)` — arrotonda a 2 decimali: `Math.round(n * 100) / 100`

### Computed values (`useMemo`)

- `addSubComputed` (~riga 115): m.c.m., fattorizzazione, frazioni equivalenti, risultato.
- `mulDivComputed` (~riga 200): inversione (divisione), semplificazione incrociata, risultato.

**Regola divisione**: nella divisione si invertono TUTTE le frazioni eccetto la prima
(non solo la seconda).

### Pipeline del riconoscimento scrittura (ONNX)

```
User scrive sul canvas → MathDrawCanvas (stroke)
  → NumberInputCanvas.handleManualRecognize
    → riconoscimento ONNX COMER (encoder_int8.onnx + decoder_int8.onnx)
      → LaTeX → valore numerico → display frazione
```

---

## 3. Ricostruire l'app da GitHub

### 3.1 Localmente (qualsiasi macchina)

```bash
git clone https://github.com/<utente>/<repo>.git
cd <repo>            # se l'app è in una subfolder: cd <subfolder>
pnpm install
pnpm check           # type-check TypeScript — MAI saltare
pnpm dev             # avvia il dev server (http://localhost:5173)
```

### 3.2 Su Easy-Peasy.AI (MARKY)

Caricare la cartella nel sandbox e chiedere a MARKY di fare build, preview e deploy.
Oppure inizializzare un nuovo progetto `web-static` e copiare dentro i file `client/`,
`server/`, `shared/`, `package.json`, `tsconfig*.json`, `vite.config.ts`, `patches/`.

> **Nota**: lo scaffold è **`web-static`** (NON `web-db-user`). Non c'è database né
> autenticazione: non serve alcuna chiave API.

---

## 4. Variante A — cambiare / aggiungere operazioni

La logica matematica è concentrata in `FractionExercises.tsx`. Per aggiungere una nuova
operazione (es. potenze di frazioni, radici, percentuali, numeri decimali → frazioni):

1. Aggiungere le **funzioni matematiche** necessarie accanto a `gcd`/`lcm`
   (es. `pow`, `sqrt`, `decimalToFraction`).
2. Aggiungere un **nuovo blocco `useMemo`** (come `addSubComputed` / `mulDivComputed`)
   con i passi, i risultati attesi e i valori arrotondati con `round2()`.
3. Aggiungere la **UI dei passi** con `NotebookGuide` e i box "RICOPIA SUL QUADERNO",
   riusando `FractionDisplay` per le frazioni.
4. Aggiungere i **feedback** CORRETTO/SBAGLIATO confrontando le risposte studente con
   i valori attesi.
5. Aggiungere il pulsante della nuova modalità in `WelcomePage.tsx` (accanto a
   "Addizione e Sottrazione" e "Moltiplicazione e Divisione").

> ⚠️ **Regola**: MAI fare replace globale dei numeri `2`/`4` — romperebbe `4ac`, i
> coefficienti, i denominatori. Sostituire solo i **token specifici** della logica.

---

## 5. Variante B — cambiare la lingua

La logica matematica **non dipende dalla lingua**: per ottenere un'app per lo studio
dell'**inglese**, dello **spagnolo** o del **francese** cambiano solo i **testi**
dell'interfaccia, la **voce della lettura ad alta voce** (TTS) e i **formati** di
numeri/date.

1. `client/index.html`: `lang="it"` → `en` / `es` / `fr` + `<title>` tradotto.
2. `WelcomePage.tsx` e `FractionExercises.tsx`: traduci le **stringhe** (titoli,
   consegne, box "RICOPIA SUL QUADERNO", pulsanti, testi del PDF). **Non** rinominare
   variabili, chiavi di stato o ID.
3. `useReadAloud.ts`: imposta la voce TTS della lingua (`it-IT` → `en-US`/`en-GB`,
   `es-ES`, `fr-FR`) e traduci le etichette lette ad alta voce.
4. `AccessibilityToolbar.tsx`: traduci le etichette della barra e le `aria-label`.

> Le formule KaTeX (`fratto`, `√`, esponenti) **NON si traducono**: sono universali.
> Cambiano solo le parole attorno alle formule.

---

## 6. Variante C — quiz con set di domande

Per ricostruire un **quiz** (con dashboard docente, codici classe, sessioni, contatore
studenti e report PDF con punteggio) si parte dalle app quiz della stessa famiglia
(Shakespeare Quiz / Bécquer Quiz) e si cambia **solo il set di domande** tramite un
**JSON**: contenuto, numero di domande, tipologia **VERO/FALSO** (2 opzioni) oppure a
**3 o 4 opzioni**.

| Obiettivo | Cosa fare |
|---|---|
| Contenuto diverso | modifica `testo` e `opzioni` di ogni domanda |
| Numero diverso | aggiungi/rimuovi oggetti nell'array `domande` |
| Tipologia diversa | `vero_falso` (2 opzioni), `multipla_3` (3), `multipla_4` (4) |
| Tema/lingua diverso | traduci `testo`/`opzioni` (vedi Variante B) |

---

## 7. Build, verifica e deploy

```bash
pnpm install                 # dipendenze (usa pnpm-lock.yaml)
pnpm check                   # type-check — MAI saltare prima del deploy
pnpm build                   # vite build + esbuild del server → dist/
pnpm dev                     # dev server locale
pnpm start                   # server di produzione (NODE_ENV=production node dist/index.js)
```

Su Easy-Peasy.AI:
- **Preview**: `webdev_deploy mode="preview" project_dir="<cartella>"`
- **Produzione**: prima `webdev_save_checkpoint`, poi (solo dopo conferma esplicita
  dell'utente) `webdev_deploy mode="production"`.

---

## 8. Trasferimento su Render (via GitHub)

Il progetto include già:
- **`render.yaml`** — Blueprint Render: crea il Web Service con un clic (Node 22,
  `pnpm install --frozen-lockfile && pnpm build`, `pnpm start`).
- **`.github/workflows/ci.yml`** — CI su ogni push (install → check → test → build).

Procedura completa passo-passo: **[`DEPLOY-RENDER.md`](DEPLOY-RENDER.md)**.

In sintesi:
1. Carica questa cartella su un repository GitHub (root del repo).
2. Su [render.com](https://render.com) → **New → Blueprint** → collega il repo.
3. Render legge `render.yaml` e crea il Web Service automaticamente.

> L'app NON ha database né chiavi API: il server Express serve solo i file statici +
> gli header COOP/COEP (richiesti da ONNX Runtime Web) + CORS su `/fonts` (per l'embed
> cross-origin). Non serve configurare nulla oltre a `NODE_VERSION`.

---

## 9. ACCESSIBILITÀ (sezione portabile)

> ⚠️ **SEZIONE ACCESSIBILITÀ** — questa è la sezione che riassume TUTTE le misure di
> accessibilità dell'app. Le stesse misure possono essere **portate su altre app simili**
> copiando i file indicati. Il dettaglio completo è in **[`ACCESSIBILITA.md`](ACCESSIBILITA.md)**.

### Misure implementate (riepilogo)

| # | Misura | File da copiare su altre app |
|---|--------|------------------------------|
| 1 | **Font OpenDyslexic** auto-ospitato | `client/public/fonts/` + `@font-face` in `client/src/index.css` |
| 2 | **Barra di accessibilità** (Font, Interlinea, Righello, Modalità, Ascolto) | `client/src/components/AccessibilityToolbar.tsx` |
| 3 | **Dimensione testo regolabile** 80%–160% | `client/src/contexts/AccessibilityContext.tsx` → `--lf-scale` |
| 4 | **Interlinea regolabile** 1.65 / 1.9 / 2.2 / 2.6 | `AccessibilityContext.tsx` → `--lf-lh` |
| 5 | **Righello di lettura** | `index.css` (`.lf-ruler-band`) |
| 6 | **Modalità ad alto contrasto** | `index.css` (`html.lf-hc`) |
| 7 | **Focus visibile** (`:focus-visible`) | `index.css` |
| 8 | **`prefers-reduced-motion`** rispettato | `index.css` |
| 9 | **Testo base 18px + selezione ad alto contrasto** | `index.css` |
| 10 | **ARIA / tastiera / input alternativo** (`role="toolbar"`, `aria-live`, "✎ digita il valore") | `AccessibilityToolbar.tsx`, `WelcomePage.tsx`, `NumberInputCanvas.tsx` |
| 11 | **PDF esportato in OpenDyslexic** | `client/src/pages/FractionExercises.tsx` (`handleScaricaPdf`) |
| 12 | **Preferenze persistenti** (`localStorage` `wms_access`) | `AccessibilityContext.tsx` |
| 13 | **CORS sui font** (embed cross-origin) | `server/index.ts` |
| 14 | **Lettura ad alta voce** (TTS italiano) | `client/src/hooks/useReadAloud.ts` + pulsante "Ascolto" |

### Come portare l'accessibilità su un'altra app

1. Copiare `client/public/fonts/` (OpenDyslexic).
2. Copiare in `index.css`: i 4 `@font-face`, le classi `.lf-ruler-band`, `html.lf-hc`,
   `:focus-visible`, `::selection`, `@media (prefers-reduced-motion: reduce)`, e le
   variabili `--lf-scale` / `--lf-lh`.
3. Copiare `AccessibilityContext.tsx` + `AccessibilityToolbar.tsx` e montarli in `App.tsx`
   dentro un `<AccessibilityProvider>`, **prima** del router.
4. Copiare `useReadAloud.ts` per la lettura ad alta voce (voce italiana, converte formule
   ed esponenti in linguaggio naturale).
5. Aggiungere `aria-label` ai campi di input, il pulsante **✎ digita il valore** accanto
   ai canvas, e `role="toolbar"` / `aria-live` alla barra.
6. Nel PDF: usare OpenDyslexic con `@font-face` inline nel documento di stampa.

**Dettaglio completo**: **[`ACCESSIBILITA.md`](ACCESSIBILITA.md)** (con checklist di
verifica rapida).

---

## 10. Regole d'oro

1. **MAI saltare `pnpm check`** prima del deploy — gli errori TypeScript bloccano la build.
2. **Non fare replace globale delle cifre** quando si cambia la logica: sostituire solo i
   **token specifici** dell'operazione.
3. **Nella divisione si invertono TUTTE le frazioni eccetto la prima** (non solo la seconda).
4. **I segni `×` usano `items-center`** (NON `items-end` + margini negativi) per restare
   allineati alla linea di frazione.
5. **Il canale postMessage è `'labvisivo:height'`** (condiviso): NON cambiarlo negli embed.
6. **Le barrature della semplificazione incrociata sono SVG** con `stroke="#000"`.
7. **Il PDF forza OpenDyslexic (fallback Cambria Math) 12pt** e copia tutti i fogli di stile.
8. **Decimali con virgola `,`** (formato italiano), interi senza decimali (via `round2`).
9. **Font OpenDyslexic su `html, body, #root` e `.font-sans/.font-serif/.font-mono`**, ma
   **NON** su `.katex` (le formule restano in KaTeX).
10. **Prima del deploy produzione**: sempre `webdev_save_checkpoint` con descrizione.

## 11. Cornice dinamica (embed per il blog)

Il pacchetto include la **cornice dinamica** in `cornice-dinamica/`: un blocco HTML
autonomo da incollare su Blogger (o qualsiasi sito) che mostra l'app in un iframe con
**altezza automatica**, **font OpenDyslexic**, **Schermo intero**, **Ricarica** e
**isolamento multi-embed (impermeabile, v3)**.

| File | Uso |
|------|-----|
| `cornice-dinamica/embed-frazioni-dedicata.html` | ⭐ **Versione dedicata (v3 impermeabile)**: titolo **e pulsanti sulla stessa riga, tutti centrati**; Schermo intero, Ricarica, spinner, stato online/errore con **Riprova** (timeout 15 s), ping periodico (3 s), altezza al resize e **isolamento multi-embed** (scoping DOM, id con token, filtro `e.source`) e **anti-loop mobile** (debounce + clamp + conferma salti + congelamento). **Da incollare nel post.** |
| `cornice-dinamica/embed-frazioni-lite.html` | Versione minima (~5 KB) riutilizzabile: cambia `APP_URL` (o passa `?app=URL`) |
| `cornice-dinamica/embed-universale.html` | Template universale con URL segnaposto, per altre app |
| `cornice-dinamica/embed-frazioni.html` | Versione autosufficiente (~110 KB, font in base64) |
| `cornice-dinamica/test-dedicata.html` | Pagina di test locale (simula un post Blogger) |
| `cornice-dinamica/test-impermeabile.html` | Pagina di test multi-embed: 2 cornici + un «intruso» che tenta il furto dell'iframe |
| `cornice-dinamica/README.md` | Documentazione completa della cornice |

### Protocollo altezza dinamica

- L'app (in `client/src/lib/heightSync.ts`, inizializzato da `client/src/main.tsx`)
  misura la propria altezza e la invia al genitore con
  `{ type: "labvisivo:height", height }`.
- La cornice ascolta i messaggi `message` e imposta `iframe.style.height`.
- La cornice invia `{ type: "labvisivo:ping", cornice: <token> }`; l'app risponde con la sua altezza **rispecchiando il token** (`heightSync.ts` legge `?cornice=<token>` dall'URL).
- **Fix anti-loop**: quando l'app è dentro un iframe aggiunge la classe `lf-embedded` a
  `<html>` e il CSS disattiva `min-h-screen`/`min-h-dvh` (vedi `client/src/index.css`),
  così l'altezza misurata non dipende dall'altezza dell'iframe.
- **Fix misura altezza (`currentHeight` in `heightSync.ts`)** ⚠️ CRITICO: NON usare
  `documentElement.scrollHeight` come riferimento assoluto — quando il contenuto è più
  corto dell'iframe resta gonfiato all'altezza del viewport e la cornice NON si restringe
  mai. Usare `body.scrollHeight`/`body.offsetHeight` + `documentElement.offsetHeight`, e
  aggiungere `documentElement.scrollHeight` SOLO se supera `window.innerHeight`.
- **Prima pagina (WelcomePage) — layout compatto e margini simmetrici**: il `<main>` usa
  `lf-welcome flex flex-col items-center` con un inner wrapper `pt-4 sm:pt-8` (NON
  `min-h-[calc(100dvh-…)]` + `items-center justify-center`, che crea il grande vuoto sopra
  la card). Dentro l'iframe `html.lf-embedded .lf-welcome` applica
  `padding-top: 20px; padding-bottom: 24px` (con l'`mb-1` della barra = 24px simmetrici
  sopra/sotto) e `html.lf-embedded .lf-welcome > div:first-child { padding-top: 0 }` azzera
  il `pt-*` dell'inner wrapper. In vista autonoma `html.lf-welcome-top body` è bianco con
  dissolvenza crema→bianco sotto la card (`html.lf-welcome-top .lf-welcome::after`).

### Adattare la cornice a un'altra app

1. **Versione universale/lite**: cambia la riga `APP_URL` nella sezione `⚙️ CONFIGURAZIONE`;
   oppure passa `?app=URL&title=NOME` come parametri della pagina.
2. **Versione dedicata**: cambia `APP_URL` + i due URL `@font-face` + il testo del titolo.
3. Le app devono servire i font su `/fonts/*` con CORS (`server/index.ts`).

Per i dettagli completi (Schermo intero, stato, ping, mobile, accessibilità) leggi
`cornice-dinamica/README.md`.

---

## 12. Aree avanzate

Le **quattro aree avanzate** (foto/OCR con ricostruzione geometrica, mappa concettuale
PDF a 4 livelli, debug del tremolio con `test-tremolio.html`, Quaderno «Matematica
Facile») sono documentate passo-passo, con le regole non negoziabili e le checklist di
modifica, nel documento dedicato **[`IMPLEMENTAZIONE-IA.md`](IMPLEMENTAZIONE-IA.md)**:
leggerlo PRIMA di toccare `CropDialog.tsx`, `imagePrep.ts`, `ocr.ts`, `frazioneOcr.ts`,
`mappaFrazioniPdf.ts`, `heightSync.ts`, `client/public/tess*` o
`docs/quaderno-matematica/`.

---

*Documento generato per il pacchetto esportabile di "Operazioni con le Frazioni" — Settembre 2026.*
