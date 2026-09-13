# 🧭 IMPLEMENTAZIONE-IA — Sezione apposita per implementare mediante IA

> **Documento operativo per un'Intelligenza Artificiale** (MARKY su Easy-Peasy.AI,
> GitHub Copilot, Claude, ChatGPT, ecc.) o per uno sviluppatore, per **implementare
> mediante IA** le aree chiave di questa app:
>
> 1. **Scattare foto → ritaglio foto → riconoscimento → trascrizione** (OCR delle frazioni)
> 2. **Produzione di mappe concettuali specifiche** (PDF dinamico costruito sull'ESERCIZIO REALE dello studente)
> 3. **Debug del "tremolio"** (iframe che vibrano nell'embed del blog)
> 4. **Il Quaderno PDF** («Matematica Facile», 5 anni, liceo linguistico, obiettivi minimi)
>
> Questo documento è la **sezione approfondita e dedicata**: per l'indice generale
> partire da [`AGENTS.md`](AGENTS.md) e [`GUIDA-IA.md`](GUIDA-IA.md). Tutto il
> descritto qui è verificato sul codice reale della repository (Settembre 2026).
> Le aree 1-3 sono state PORTATE dall'app **EQUAZIONI DI QUARTO GRADO BIQUADRATICHE**
> (https://github.com/andreakeating1982/EQUAZIONI-DI-QUARTO-GRADO-BIQUADRATICHE)
> e adattate alle frazioni.

---

## INDICE

1. [Area 1 — Foto, ritaglio, riconoscimento OCR, trascrizione](#area-1--foto-ritaglio-riconoscimento-ocr-trascrizione)
2. [Area 2 — Produzione di mappe concettuali specifiche](#area-2--produzione-di-mappe-concettuali-specifiche)
3. [Area 3 — Debug del "tremolio"](#area-3--debug-del-tremolio)
4. [Area 4 — Il Quaderno PDF «Matematica Facile»](#area-4--il-quaderno-pdf-matematica-facile)
5. [Regole non negoziabili di queste aree](#regole-non-negoziabili-di-queste-aree)

---

## Area 1 — Foto, ritaglio, riconoscimento OCR, trascrizione

### 1.1 A che serve

Lo studente **non scrive a mano** le frazioni: può **fotografarle** dal libro o dal
quaderno (dal telefono o dal PC), **ritagliare** solo la riga utile, e l'app le
**riconosce** (OCR) e le **trascrive** nei quattro campi NUMERATORE/DENOMINATORE,
pronti da controllare e confermare con **CALCOLA**. È il secondo percorso di input
insieme alla scrittura a mano (ONNX).

### 1.2 La pipeline completa (flow reale del codice)

```
UI box foto (FractionExercises.tsx, fase di input, sopra il pulsante CALCOLA)
  ├─ SCATTA UNA FOTO   → <input type="file" capture="environment"> (fotocamera telefono)
  ├─ CARICA IMMAGINE   → file picker (JPG / PNG / WEBP, max 18 MB)
  ├─ Trascina qui      → drag & drop sull'area (dragOver / onDrop)
  └─ Ctrl+V            → window.addEventListener("paste") (solo in fase "input")
        │
        ▼
normalizePhoto(file)                    [client/src/lib/imagePrep.ts]
  · corregge l'orientamento EXIF (createImageBitmap { imageOrientation: "from-image" })
  · produce PNG lossless "dritto" (MAI JPEG: i blocchi DCT affogano l'OCR)
  · riduce le foto enormi a lato max 2600 px (tempi + memoria)
        │
        ▼
CropDialog { open, imageUrl, onConfirm } [client/src/components/CropDialog.tsx]
  · box di ritaglio LIBERO con 4 bordi + 4 angoli, maniglie DENTRO la foto
  · trascinamento su listener globali (continua anche fuori dalla maniglia)
  · rotazione ±90°, azzera, tastiera (frecce) — onConfirm(croppedFile: File)
        │
        ▼
enhanceForOcr(file)                     [client/src/lib/imagePrep.ts]
  · ingrandimento A PASSI (max ×2 per passo) + maschera di nitidezza
  · lato corto portato a ≥ 1100 px, lato max 2200 px
  · scala di grigi + stiramento del contrasto (pagina gialla, ombre, luci)
        │
        ▼
ocrImageDetailed(file, onProgress)      [client/src/lib/ocr.ts]
  · Tesseract.js worker SELF-HOSTED: /tess/worker.min.js, corePath /tess,
    langPath /tessdata — niente CDN (COOP/COEP richiesti dal server)
  · lingua "eng", OEM 1 (LSTM), PSM.SINGLE_BLOCK,
    preserve_interword_spaces="1", user_defined_dpi="300"
  · restituisce { text, words[] } — le parole con bounding box (GEOMETRIA)
        │
        ▼
normalizeFrazioneOcrSmart(text, words)  [client/src/lib/frazioneOcr.ts]
  · vedi §1.4: RICOSTRUZIONE GEOMETRICA dell'esercizio dalle posizioni
        │
        ▼
TRASCRIZIONE: setNum1/setDen1/setNum2/setDen2 (+ allineamento operatore con
setAddSubOp/setMulDivOp); flag fuzzy → toast di avvertimento; lo studente
controlla e preme CALCOLA.
```

### 1.3 Dettagli critici (perché funziona — NON cambiare alla leggera)

| Dettaglio | Perché è così |
|---|---|
| **PNG lossless** dopo il ritaglio | I blocchi JPEG, dopo l'ingrandimento per l'OCR, diventano rumore che affoga Tesseract (verificato con sonde A/B). |
| **Ingrandimento a passi (max ×2/step) + unsharp** | Un singolo drawImage grande sfuma i dettagli fini (barre di frazione, numeri piccoli). |
| **COOP/COEP + asset self-hosted** | L'app serve header COOP/COEP sui documenti HTML (`server/index.ts`); Tesseract worker/core/`tessdata` sono self-hosted in `client/public/tess/` e `client/public/tessdata/` — **niente CDN**, funziona anche offline e su Render senza config. |
| **Lingua "eng"** | È la voce che riconosce meglio cifre e simboli `+ − =`; le lingue "it" introducono rumore. |
| **PSM.SINGLE_BLOCK + dpi 300** | Una riga di esercizio è un blocco unico; il dpi dichiarato aiuta il motore a calibrare la dimensione dei glifi. |
| **`recognize(img, {}, { text: true, blocks: true })`** | In Tesseract.js v7 le parole con bbox arrivano SOLO richiedendo esplicitamente `blocks: true` — senza, `words` è vuoto e la ricostruzione geometrica non può funzionare. |

### 1.4 La ricostruzione geometrica (`frazioneOcr.ts`) — il cuore dell'area

**STORICO MISURATO**: Tesseract **non legge le barre di frazione orizzontali**
(come non leggeva gli esponenti in apice `x⁴` nell'app biquadratica). L'esercizio
«3/4 + 1/6» scritto con barre orizzontali arriva come testo secco
`"3    1\n+\n4    6"` — sei glifi corretti, ZERO barre. Per questo
`normalizeFrazioneOcrSmart` NON si fida del testo: **ricostruisce per POSIZIONE**:

1. **Classificazione parole** — ogni parola (con bbox da `ocrImageDetailed`) è:
   - *frazione incollata*: «3/4», «3:4», «3?4» (barra inclinata letta come altro
     glifo) → regex `^(\d{1,5})\s*[/:?]\s*(\d{1,5})$`;
   - *operatore*: `+ − × ÷ : · x *` (mappati su `+ - * /`; `:` e `÷` tra due
     frazioni = DIVISIONE, notazione italiana);
   - *numero intero isolato*: cifre sole.
2. **Caso A (frazioni incollate ≥ 2)**: le prime due per x → num/den già pronti.
3. **Caso B (ricostruzione geometrica, LA VIA PRINCIPALE)**: con ≥ 4 numeri e un
   operatore, l'operatore divide la scena; i numeri a SINISTRA formano la prima
   frazione, quelli a DESTRA la seconda; dentro ogni lato il numero con y0
   MINORE è il **numeratore** (in alto), quello con y0 maggiore il
   **denominatore** (in basso).
4. **Operatore mancante**: si divide al massimo vuoto orizzontale tra i numeri
   (`fuzzy = true`).
5. **Fallback**: pattern testuale `a/b op c/d` sul testo secco
   (`normalizeFrazioneOcrDetailed`) per esercizi scritti in linea con «/», poi
   seconda chance geometrica su token sintetici riga-per-riga.
6. **Flag `fuzzy`**: true se l'operatore è stato inferito o ci sono numeri in
   eccesso → la UI lo segnala con un toast («controlla i numeri trascritti»).

**Verifica end-to-end** (console del browser, dev server attivo): disegnare
«3/4 + 1/6» su canvas con barre `fillRect` orizzontali, convertire in File,
eseguire `ocrImageDetailed` + `normalizeFrazioneOcrSmart` → atteso
`{num1:3, den1:4, num2:1, den2:6, op:"+", fuzzy:false}` (verificato: 1,2 s).

### 1.5 Come estendere/modificare questa area (checklist IA)

| Obiettivo | Dove intervenire |
|---|---|
| Migliorare la lettura dei dettagli fini | `client/src/lib/imagePrep.ts` → soglie `MIN_EDGE`/`MAX_EDGE` e la logica di upscale a passi. Modificare solo con test A/B. |
| Terze/quarte frazioni riconosciute | `client/src/lib/frazioneOcr.ts` → il caso B attualmente usa le prime due frazioni (le successive rendono `fuzzy = true`). Estendere il parser e la UI insieme. |
| Nuove forme riconosciute (numeri misti, negativi) | `client/src/lib/frazioneOcr.ts` → aggiungere un ramo dedicato, MAI alterare il comportamento esistente (regressione OCR). |
| Cambiare il motore/la lingua OCR | `client/src/lib/ocr.ts` → `getWorker()` (lang, PSM, paths self-hosted). Se cambi `langPath` devi aggiungere i `.traineddata` in `client/public/tessdata/`. |
| Nuovi modi di inserire la foto | `FractionExercises.tsx` sezione "Foto dell'esercizio" (state/handlers ~riga 160, UI ~riga 840): drag&drop, paste, camera. Tutti i percorsi convergono su `handleOcrFile → normalizePhoto → CropDialog`. |
| Provare la pipeline senza UI (console) | `const {ocrImageDetailed} = await import('/src/lib/ocr'); const {normalizeFrazioneOcrSmart} = await import('/src/lib/frazioneOcr'); …` |

> ⚠️ Dopo QUALSIASI modifica: `pnpm check` + prova con **foto reali difficili**
> (sfocate, inclinate, sfondo scuro, foto da telefono lontane). L'OCR è la parte più
> fragile dell'app: ogni cambiamento va verificato su un set di 5–6 foto reali.

---

### 1.6 La catena di robustezza OCR (sessione «5 tentativi + best-of», MISURATA)

Un solo tentativo OCR non basta: su 9 sonde sintetiche (E1–E9: operatori
`+ − × ÷`, in linea, manoscritto, due cifre, rumore, foto grande con sfondo
beige) il primo tentativo sbagliava o mancava su 5. La catena finale risolve
**8/9** (l'unico fallimento restituisce `null` → errore onesto, MAI un risultato
sbagliato). Struttura in `runOcr` (`FractionExercises.tsx`):

1. **Pass 1** — base (`enhanceForOcr`): grigio → contrasto → **mediano 3×3**
   ALLA RISOLUZIONE ORIGINALE (il despeckle prima dell'upscale: un puntino di
   2px a ×3,4 diventerebbe una macchia da 7px che il mediano non tocca più) →
   scala base (min-edge 1100 / max 2200) → **rimozione barre alla risoluzione
   piena** → unsharp. Il risultato è messo in **cache WeakMap sul Blob**: le
   5 letture condividono lo stesso base (una sola elaborazione pesante).
2. **Pass 2** — PSM SPARSE (numeri sparsi: a volte trova ciò che SINGLE_BLOCK
   non vede; è il pass che legge «7» come «/» e il rescue lo riconverte).
3. **Pass 3** — whitelist `0123456789+-*/:.,()` (i glifi 4→A, 1→l cadono da soli).
4. **Pass 4–5** — **immagine piccola**: `enhanceForOcr(file, { targetHeight: 90 })`
   riduce dal base GIÀ PULITO (barre rimosse, rumore via, contrasto steso) a
   altezza 90px → cifre ~20px a QUALSIASI risoluzione della foto. Tesseract
   legge le cifre delle frazioni MOLTO meglio a 20-30px che a 100-240px (sonde
   A/B: a font 70px «2»→«y» e «5»→«0»; a font 20px legge tutto corretto).
   Pass 5 = piccolo + SPARSE. UN maxEdge fisso NON funziona: su foto grandi
   cancella i gap barra-cifra e le barre sopravvivono → serve l'altezza target.
5. **BEST-OF a 4 livelli** (non «il primo che arriva»): non-fuzzy (3) > fuzzy
   con operatore (2) > fuzzy senza operatore e senza zero (1) > fuzzy con zero
   sospetto (0). Si continua finché il miglior punteggio è < 3. Motivazione
   misurata: E3 pass 1 leggeva i residui «|» delle barre come cifra 1
   (`{2,1,4,1}`) mentre il pass 4 leggeva tutto corretto; E5 pass 1 leggeva
   «5»→«O» mentre il pass 4 leggeva «5» corretto ma senza operatore.

**Dettagli critici della rimozione barre (`eraseFractionBars` in
`imagePrep.ts`), tutti da regressioni reali:**

| Criterio | Valore | Perché |
|---|---|---|
| maggioranza colonne con contenuto sopra E sotto | **≥ 20%** | Nei libri la barra è spesso molto più larga delle cifre (sonda E9: cifra 94px su barra 348px = 27% — con 30% la barra sopravviveva e avvelenava Tesseract: token «—» spurii). |
| gap del contenuto sopra/sotto | **≥ GAP e ≤ lunghezza barra** | Le cifre stanno SUBITO sopra/sotto; le righe di un altro esercizio (foto di pagina intera) stanno molto più lontano → un «−» lungo con testo sopra e sotto non scatta come barra. |
| margine di cancellazione | **±2px** oltre il bbox | I bordi anti-alias sopravvissuti al flood-fill diventano righe sottili che Tesseract legge come «\|» → il parser le scambiava per la cifra 1 (sonda E3). |

**Dettagli critici del contrasto (`contrastStretchGray`):** i percentile 2%/98%
BASTANO su pagine bianche con testo abbondante, ma su foto chiare con poco testo
(ritagli piccoli, cifre grandi: testo < 2% dei pixel) il percentile scuro cade
nel FONDO e lo stiramento esplode (hi−lo ≈ 10 → scala ×25: lo sfondo diventa un
gradiente full-range e Tesseract legge il vuoto — sonda E9, 98% pixel non bianchi).
Fix: mediana = livello dello sfondo; se sfondo ≥ 160 (foto chiare: carta, libri)
`lo = min(lo, bg − 140)` — lo si ancora saldamente SOTTO lo sfondo.

**Dettagli critici del parser (`frazioneOcr.ts`):**

- guardia anti-linea: un token «\|» con bbox più LARGA che alta è un residuo di
  barra, non la cifra 1 → scartato;
- numeratore 0: quasi sempre un «5»/«9» male letto (sonda E8: 12/34 + 5/6 →
  «50» letto «06») → non rifiutato ma `fuzzy = true`, così il best-of continua
  a cercare un passaggio migliore (il denominatore 0 resta rifiutato: divisione
  per zero impossibile);
- il «÷» resta il glifo più fragile (spesso non letto o letto come «/», «,»):
  i numeri vengono comunque letti, l'operatore resta quello scelto nella UI con
  avviso fuzzy — comportamento accettato.

**Suite di verifica end-to-end** (console del browser su `/esercizio`, dev server
attivo — replica ESATTA della catena di `runOcr`): disegnare i 9 casi su canvas
(`fillRect` per le barre), `toBlob('image/png')`, eseguire la catena, confrontare
`[num1, den1, num2, den2]`. Risultato misurato 2026-09-13: E1 ✓ E2 ✓ E3 ✓ E4 ✓
E5 ✓ E6 ✓ E7 ✓ E8 ✓ (8/9; E9 = Georgia 120px «5» letto «0» in tutti i pass →
`null` → errore onesto). Qualsiasi modifica a `imagePrep.ts` / `ocr.ts` /
`frazioneOcr.ts` / `runOcr` DEVE ribattere questa suite.

## Area 2 — Produzione di mappe concettuali specifiche

### 2.1 A che serve

Nella **TERZA PAGINA** dell'app (esercizio guidato, accanto a SCARICA PDF) il pulsante
**🗺️ MAPPA CONCETTUALE** genera un PDF con **DUE sole mappe**, costruite
sull'OPERAZIONE EFFETTIVA inserita dallo studente (stessi numeri esatti, solo i
contenuti del tipo di operazione scelto):

- **MAPPA SVOLTA**: l'esercizio dello studente risolto passo-passo con i SUOI numeri
  (m.c.m. dei suoi denominatori, trasformazioni con i suoi valori, semplificazioni a
  croce con i suoi gcd, suo risultato); box SCRIVO IL RISULTATO e RICORDA LE FORMULE
  (solo le formule dell'operazione in uso).
- **MAPPA CONCETTUALE**: la stessa struttura «da completare» (ex «livello 1»):
  stessi passi guidati visibili, valori puntinati (`\dots` grigi).

Se lo studente ha inserito un'**addizione**, la mappa mostra SOLO l'addizione; una
sottrazione → SOLO la sottrazione; una moltiplicazione → SOLO la moltiplicazione (con
le **DUE FIGURE allegate**: «a croce» nel passo di semplificazione, «in linea» nel
passo di moltiplicazione); una divisione → SOLO la divisione (dopo l'inversione
valgono le figure della moltiplicazione). Per addizione/sottrazione NON compaiono
figure (non c'è un «reparto» opportuno). Numeratori BLU (`#1F4E9C`), denominatori
VERDI (`#2E7D32`), font OpenDyslexic, margini 2,5 cm, alto contrasto.

### 2.2 Le funzioni esportate (`client/src/lib/mappaFrazioniPdf.ts`)

```ts
export interface MappaFrazioneData {
  mode: "addsub" | "muldiv";   // modalità scelta nella prima pagina
  op: "+" | "-" | "*" | "/";   // operazione effettiva dell'utente
  num1: number; den1: number;  // le DUE frazioni inserite dall'utente
  num2: number; den2: number;
  studentLabel?: string;       // riga studente dai parametri URL
}
export function buildMappaFrazioniHtml(d: MappaFrazioneData, mode?: "estimate" | "measure"): string;
// HTML AUTOCONTENUTO delle 2 mappe (KaTeX CSS via CDN + font OpenDyslexic relativi
// a window.location.origin), pronto per essere scritto in una finestra

export async function openMappaFrazioniPdf(d: MappaFrazioneData): Promise<void>;
// apre la finestra SUBITO nel gesto utente (niente popup-blocker), poi misura
// i box nel DOM e scrive l'HTML; window.print(). Le figure sono SVG inline.
```

Il PULSANTE vive in `FractionExercises.tsx` (`handleMappaConcettuale`, accanto a
SCARICA PDF, solo in `phase === "exercise"`) e passa lo stato REALE:
`{ mode, op: addSubOp|mulDivOp, num1, den1, num2, den2, studentLabel }`.

### 2.3 Struttura interna (cosa produce, esattamente)

- **Un builder per famiglia** (`addSubItems` / `mulDivItems`) con parametro
  `level: 0|1` (0 = svolta, 1 = mappa concettuale): lo STESSO contenuto cambia solo
  per i valori (numeri veri dell'utente vs `\dots`).
- **Calcoli interni identici all'app**: `computeAddSub` (lcm, trasformazioni
  `(m:den)×num`, risultato) e `computeMulDiv` (inversione per ÷, gcd a croce
  `g1=gcd(|num1|,den2eff)`, `g2=gcd(den1,num2eff)`, prodotto e risultato semplificato)
  — le stesse formule di `addSubComputed`/`mulDivComputed` in `FractionExercises.tsx`.
- **Le due figure SONO SVG DINAMICI (Settembre 2026, non più PNG)**: `figuraCroce(v,
  svolta, isDivisione)` e `figuraInline(v, svolta, isDivisione)` in
  `mappaFrazioniPdf.ts` disegnano al momento dell'apertura le frecce con i NUMERI
  EFFETTIVI dell'esercizio (da `computeMulDiv`): frazioni reali (numeratori blu
  `#1F4E9C`, denominatori verdi `#2E7D32`, come `fracLatex`), diagonali con
  `MCD = g1/g2` reali e valori semplificati grigi SOLO se quel lato si semplifica
  (MCD > 1); in mappa da completare i risultati diventano puntini `…` e le
  etichette `MCD = …`, mentre le frazioni restano reali. La figura «in linea»
  mostra le frazioni effettivamente moltiplicate al PASSO 3 (semplificate se la
  croce ha prodotto semplificazioni, tramite `mulShown(v)`) con i prodotti reali
  sulle frecce; per la divisione la seconda frazione è già capovolta (e le
  didascalie lo dicono). Le etichette MCD stanno nel segmento ESTERNO inferiore
  della propria diagonale (accanto alla punta) per evitare ambiguità. I PNG
  `mappa-fig-mol-*.png` restano in `client/public/` ma non sono più usati dal codice.
- **Paginazione con misurazione reale**: i box vengono misurati NEL DOM
  (`PAGE_BUDGET ≈ 900 px` utile per pagina, larghezza misura 636,5 px con
  `zoom:0.95`), ogni pagina è piena fino al margine, con fallback prudenziale a
  stima in caso di errore; footer «Pagina N di M» che **riparte da 1 per ogni
  mappa**; margini 2,5 cm su A4 (`@page{size:A4;margin:2.5cm 2.5cm 1cm 2.5cm}`).
- **CSS scoping durante la misura**: `MAPPA_CSS_MEASURE` riscrive `body{` solo come
  selettore completo e usa `:where(#mappa-measure-wrap) *{` (specificità zero).

### 2.4 Personalizzazioni tipiche (checklist IA)

| Obiettivo | Dove intervenire |
|---|---|
| Cambiare testi/istruzioni dei passi | `addSubItems` / `mulDivItems` |
| Cambiare titoli/intestazioni | `buildParti` + i `solidBox` di titolo |
| Cambiare colori per operazione | `opColor` e oggetto `C` in testa al file |
| Sostituire le figure | stessi nomi file in `client/public/` (oppure cambiare `FIG_*_URL`) |
| Nuovi box | SOLO tramite `stepBox/solidBox` nel builder — MAI PDF «a occhio» con stime fisse: la paginazione è a misurazione DOM |
| Estendere a terze/quarte frazioni | aggiungere i campi a `MappaFrazioneData` e gestirli in `computeAddSub`/`computeMulDiv` + builder |

---

## Area 3 — Debug del "tremolio"

### 3.1 Sintomo e cause (diagnosi storica, misurata)

**Sintomo**: l'app incorporata nel blog (iframe con altezza automatica) vibra
continuamente di pochi pixel; la pagina "respira" senza che l'utente tocchi nulla.

**Cause trovate e misurate** (Settembre 2026, strumento §3.2):

1. **L'app rinviava l'altezza a OGNI tick** — ResizeObserver + evento resize + risposta
   al ping (ogni 3 s), senza arrotondamento né filtri: **58 messaggi in 82 s** con
   l'iframe che si allungava a scalini di +1…+6 px senza mai fermarsi.
2. **Cornici embed con `transition: height` + applicazione immediata** (versioni vecchie
   lite/base64/universale): durante l'animazione di 0,25 s l'app misura altezze
   **intermedie** e le rinviare → il ciclo si autoalimenta.
3. **Reflow della barra di scorrimento**: se il contenuto sconfinava di mezzo pixel
   (zoom / devicePixelRatio frazionari, altezze intere arrotondate per difetto),
   la scrollbar compariva/spariva → larghezza variabile → ritesti → altezza diversa.

### 3.2 Lo strumento di misura: `client/public/test-tremolio.html`

Pagina di test **già inclusa** nel pacchetto. Serve il dev server attivo
(`pnpm dev`), poi apri:

```
http://localhost:5173/test-tremolio.html?mode=bad   ← replica la cornice VECCHIA
                                                      (transizione + applica ogni
                                                       messaggio, nessun filtro)
http://localhost:5173/test-tremolio.html?mode=v3    ← replica la cornice dedicata v3
                                                      (debounce 200 ms, filtro ±2 px)
```

Nel pannello di destra ogni messaggio è registrato con timestamp. In console:

```js
window.__report()
// → { modalita, messaggi_ricevuti, applicazioni, valori_distinti,
//     ultimi_delta, inversioni_di_direzione, durata_s, ultima_applicata }
```

**Criteri di salute** (dopo il caricamento, a pagina ferma):
`messaggi_ricevuti` stabile (solo i ping a cadenza 3 s se forzati), `ultimi_delta`
tutti a 0, `inversioni_di_direzione` = 0, `valori_distinti` fermo su 1–3 valori di
caricamento. Prima del fix: 58 messaggi/82 s con crescendo continuo; dopo il fix:
silenzio totale dopo il caricamento, e i cambiamenti veri sono seguiti subito
(+300 px seguiti in <1 s; ritorno e micro-cambiamenti +10 px inclusi).

### 3.3 Le contromisure già implementate (NON rimuoverle)

**Lato app — `client/src/lib/heightSync.ts`** (versione v3, funzionano con QUALSIASI cornice):

1. **Arrotondamento per eccesso** (`Math.ceil`) su una misura **frazionaria** (max fra
   `getBoundingClientRect().height`, `scrollHeight`, `offsetHeight` di body e
   documentElement): dopo l'applicazione il contenuto non sconfinerà MAI dall'iframe →
   niente scrollbar → nessun reflow → il ciclo non riparte.
2. **Isteresi 3 px** (`ISTERESI_PX`): differenze minori non vengono inviate.
3. **Silenzio post-invio 400 ms** (`SILENZIO_MS`): le rimisure intermedie sono scartate
   (copre le transizioni CSS ~250 ms); un salto VERO (≥ 30 px, `SALTO_LIBERO_PX`)
   passa comunque subito.
4. **Coalescenza rAF** del ResizeObserver + trailing settle a ~460 ms che conferma il
   valore stabile.
5. **Il ping risponde SEMPRE** (`pushHeight({force:true})`): è la rete di recovery se
   un messaggio cade nella finestra di mute della cornice (senza il ping, l'isteresi
   bloccherebbe il reinvio e l'altezza resterebbe disallineata).

**Lato cornice — `cornice-dinamica/`**:

- lite / base64 / universale: **NESSUNA `transition: height`**, applicazione con
  **debounce 200 ms** + filtro ±2 px + clamp 100–15000 px (prima applicavano ogni
  messaggio subito, alimentando il tremolio).
- dedicata (v3 impermeabile): debounce + anti-loop già presenti, più **silenzio
  post-applicazione 300 ms** (ignora le rimisure ravvicinate salvo salti ≥ 30 px) e
  **ping ogni 3 s** come recovery.

### 3.4 Procedura diagnostica per un'IA (quando l'utente dice "trema")

1. Riprodurre in locale: `pnpm dev` → aprire `test-tremolio.html?mode=bad` →
   `window.__report()` dopo 30–60 s a pagina ferma. Se `messaggi_ricevuti` cresce o
   `ultimi_delta` non sono tutti 0 → il tremolio è riprodotto.
2. Se in `mode=bad` trema ma in `mode=v3` no → problema **lato cornice** (l'utente
   usa una cornice vecchia nel blog): ripubblicare l'embed aggiornato da
   `cornice-dinamica/`.
3. Se trema anche in `mode=v3` → problema **lato app**: verificare che `heightSync.ts`
   contenga le 5 contromisure (§3.3: `ISTERESI_PX`, `SILENZIO_MS`, `SALTO_LIBERO_PX`,
   `Math.ceil`, coalescenza rAF) e che `index.css` mantenga le regole
   `html.lf-embedded` (disattivazione `min-h-screen`/`min-h-dvh` in iframe).
4. Verificare i cambiamenti legittimi NON siano congelati: nella console del test,
   ingrandire il contenuto dell'iframe di 300 px
   (`document.getElementById('lfIframe').contentDocument.body.style.paddingBottom='300px'`)
   → l'altezza deve seguire in ~1 s. Poi rimettere a 0.
5. Dopo ogni fix: ripetere il test in ENTRAMBE le modalità, poi `pnpm check`,
   checkpoint e deploy (preview → conferma → produzione).

### 3.5 Portare l'anti-tremolio su altre app

Copiare **tutto** `client/src/lib/heightSync.ts` (incluse le costanti
`ISTERESI_PX`, `SILENZIO_MS`, `SALTO_LIBERO_PX`), chiamare `initHeightSync()` da
`main.tsx` **prima del render**, copiare le regole `html.lf-embedded` in `index.css`,
e nelle cornici NON usare MAI `transition: height` né applicare l'altezza senza
debounce. Il canale resta `labvisivo:height` / `labvisivo:ping` (condiviso).

---

## Area 4 — Il Quaderno PDF «Matematica Facile»

### 4.1 A che serve

Il pulsante **📜 IL QUADERNO PDF** nell'header apre in una nuova scheda
`/quaderno-matematica-facile-v4.pdf`: il quaderno inclusivo **«Matematica Facile —
Il quaderno di matematica e geometria per il liceo linguistico»**, **53 pagine
PDF/UA-1 a flusso continuo**, obiettivi minimi dei **5 anni** del liceo
linguistico. È uno strumento **già finito**: l'app lo serve così com'è.

### 4.2 Struttura del quaderno

- **Anno 1**: Numeri e prime figure · **Anno 2**: Si completa il calcolo ·
  **Anno 3**: Le equazioni e il piano cartesiano · **Anno 4**: Funzioni, statistica,
  Euclide · **Anno 5**: Consolidamento · **Mappa concettuale** di sintesi finale.
- Codice colore per area (marrone numeri, rosso equazioni, verde geometria, blu
  funzioni, giallo formule, verde acqua statistica, grigio lessico), box IN QUESTA
  SEZIONE / TRUCCO / IN SINTESI, verifiche per anno, illustrazioni in plastilina.
- Accessibilità: font OpenDyslexic, testo 12pt+, spaziatura generosa, PDF/UA-1.

### 4.3 Dove stanno le cose

| Cosa | Dove |
|---|---|
| Il PDF servito dall'app | `client/public/quaderno-matematica-facile-v4.pdf` (1,6 MB) |
| Il pulsante nell'header | `FractionExercises.tsx` — pill `IL QUADERNO PDF` |
| **Sorgenti completi** (ricoscrizione) | `docs/quaderno-matematica/` — 8 sezioni HTML + `styles.css` + `build.py` (WeasyPrint, PDF/UA-1). Rebuild: `pip install weasyprint pymupdf && python3 build.py` |
| Regole di impaginazione (flusso continuo v5) | `docs/quaderno-matematica/README-QUADERNO.md` |

> ⚠️ Il quaderno NON va rigenerato «a occhio»: per modificarlo si editano le sezioni
> HTML in `docs/quaderno-matematica/` e si rigenera con `build.py` rispettando le
> regole non negoziabili del README-QUADERNO (box mai spezzati, banner non orfane,
> numero di pagina nel margine).

---

## Regole non negoziabili di queste aree

1. **OCR**: PNG lossless, upscale a passi, asset Tesseract self-hosted, ricostruzione
   GEOMETRICA dalle bounding box in `frazioneOcr.ts` (le barre di frazione NON sono
   nel testo) — ogni modifica richiede prove su foto reali difficili e il test
   sintetico su canvas (§1.4).
2. **Mappa**: la paginazione è a misurazione DOM con margini 2,5 cm — i nuovi box
   entrano SOLO tramite `stepBox/solidBox` nel builder; i livelli di supporto (0-3)
   cambiano SOLO valori e box mostrati, mai l'ordine.
3. **Tremolio**: MAI rimuovere ceil/isteresi/silenzio/rAF da `heightSync.ts`, MAI
   reintrodurre `transition: height` o l'applicazione immediata nelle cornici, MAI
   cambiare il canale `labvisivo:height`.
4. **Quaderno**: il PDF in `client/public/` si rigenera SOLO da
   `docs/quaderno-matematica/` con `build.py` (flusso continuo, box mai spezzati).
5. Dopo ogni modifica: `pnpm check`, test con `test-tremolio.html`, checkpoint, deploy
   preview e (solo dopo conferma esplicita dell'utente) produzione.

*Documento generato per il pacchetto esportabile — Settembre 2026. Aree 1-3 portate
dall'app EQUAZIONI DI QUARTO GRADO BIQUADRATICHE e adattate alle frazioni.*
