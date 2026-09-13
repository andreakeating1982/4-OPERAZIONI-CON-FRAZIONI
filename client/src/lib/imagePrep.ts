/**
 * Preparazione delle foto prima del ritaglio e dell'OCR.
 *
 * 1. `normalizePhoto` — corregge l'orientamento EXIF (le foto scattate dal
 *    telefono arrivano spesso ruotate di 90°) e restituisce un PNG "dritto"
 *    lossless (mai JPEG: i suoi artefatti uccidono l'OCR).
 * 2. `enhanceForOcr` — ridimensiona, passa in scala di grigi e stira il
 *    contrasto, così Tesseract legge meglio testo stampato su libro/quaderno
 *    (luci irregolari, pagina gialla, ombre). L'ingrandimento avviene A PASSI
 *    (max ×2 per passo) con una leggera maschera di nitidezza: un singolo
 *    drawImage anche solo ×3–5 sfuma gli esponenti in apice e Tesseract
 *    li massacra (x⁴ → «2x243x»).
 */

const MAX_EDGE = 2200;
/* 1100 px sul lato corto: gli esponenti in apice restano leggibili
   anche nelle foto fatte da lontano */
const MIN_EDGE = 1100;

export async function bitmapFromBlob(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    return await createImageBitmap(blob);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("impossibile generare l'immagine"))), type, quality);
  });
}

/* Le foto più grandi di così vengono ridotte prima del ritaglio: il lato
   corto resta ampiamente sufficiente per una riga di equazione */
const MAX_PHOTO_EDGE = 2600;

/**
 * Foto "dritta" (orientamento EXIF corretto) in PNG lossless, pronta da
 * mostrare nel ritaglio. NIENTE JPEG: i blocchi DCT, dopo l'ingrandimento
 * per l'OCR, diventano rumore che affoga Tesseract (sonde A/B). Le foto
 * enormi vengono ridotte per contenere tempi e memoria.
 */
export async function normalizePhoto(file: File): Promise<File> {
  const bmp = await bitmapFromBlob(file);
  try {
    let w = bmp.width;
    let h = bmp.height;
    const maxEdge = Math.max(w, h);
    if (maxEdge > MAX_PHOTO_EDGE) {
      const s = MAX_PHOTO_EDGE / maxEdge;
      w = Math.max(1, Math.round(w * s));
      h = Math.max(1, Math.round(h * s));
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas non disponibile");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, w, h);
    const blob = await canvasToBlob(canvas, "image/png");
    return new File([blob], "foto.png", { type: "image/png" });
  } finally {
    bmp.close();
  }
}

/**
 * Stira il contrasto in scala di grigi (percentili 2–98) per testo scuro su
 * carta chiara. Non usa una soglia dura: conserva l'antialias delle lettere.
 */
function contrastStretchGray(img: ImageData): void {
  const { data } = img;
  const n = data.length / 4;
  if (n === 0) return;
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const y = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    hist[y]++;
    data[i] = y;
    data[i + 1] = y;
    data[i + 2] = y;
  }
  const loCount = Math.max(1, Math.floor(n * 0.02));
  const hiCount = Math.max(1, Math.floor(n * 0.02));
  let acc = 0;
  let lo = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= loCount) {
      lo = v;
      break;
    }
  }
  acc = 0;
  let hi = 255;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc >= hiCount) {
      hi = v;
      break;
    }
  }
  // Mediana = livello dello sfondo dominante
  acc = 0;
  let bg = 255;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= n / 2) {
      bg = v;
      break;
    }
  }
  // FOTO CHIARE (carta, libri: sfondo ≥ 160): quando il testo occupa meno
  // del 2% dei pixel (ritagli piccoli, cifre grandi) il percentile scuro
  // cade nel FONDO e non nel testo → lo stiramento esplode (hi-lo ≈ 10 →
  // scala ×25: lo sfondo diventa un gradiente full-range e Tesseract legge
  // il vuoto — sonda E9, foto 1600px con gradiente beige). Si ancora lo
  // saldamente SOTTO lo sfondo, mai dentro di esso.
  if (bg >= 160) lo = Math.min(lo, Math.max(0, bg - 140));
  if (hi <= lo) return;
  const scale = 255 / (hi - lo);
  for (let i = 0; i < data.length; i += 4) {
    const y = Math.max(0, Math.min(255, Math.round((data[i] - lo) * scale)));
    data[i] = y;
    data[i + 1] = y;
    data[i + 2] = y;
  }
}

/**
 * Rimozione delle BARRA DI FRAZIONE orizzontali prima dell'OCR.
 *
 * STORICO (sonde A/B su canvas sintetici): le barre lunghe e sottili sono il
 * peggior nemico di Tesseract su una frazione impilata — diventano rumore
 * («SE»), rompono l'analisi di layout (con «÷» il testo arriva quasi vuoto) e
 * corrompono le cifre adiacenti («5» letto «0»). La ricostruzione geometrica
 * (frazioneOcr.ts) NON usa le barre: numeratore = numero più ALTO,
 * denominatore = più BASSO. Rimuoverle dà a Tesseract cifre e operatore puliti.
 *
 * Criterio (inundazione 8-connessa, sull'immagine in grigio già contrastata):
 * un componente viene cancellato SOLO SE
 *   - è LARGO (≥ ~5,5% della larghezza) e SOTTILE (≤ ~3,5% dell'altezza),
 *   - è pieno (riempimento ≥ 55% del bbox — un rettangolo, non una riga di testo),
 *   - almeno il 30% delle sue colonne ha contenuto SIA sopra CHE sotto,
 *     separato da un bordo bianco (la barra sta TRA due cifre).
 *
 * Soglia al 30% e non di più: la barra è spesso PIÙ LARGA della cifra (la
 * «3» di un font 70px copre ~metà della sua barra) — con la maggioranza la
 * barra non veniva mai cancellata (sonda misurata: okCols 50/155). Il segno
 * «−» resta perché sopra di lui non c'è NIENTE (0%); il tratto orizzontale di
 * una cifra resta perché è connesso al glifo (niente bordo bianco) o il
 * componente è troppo alto. «=» può perdere la barra superiore e diventare
 * «-»: il criterio di bilanciamento di pickSplitOp lo scarta come falso
 * operatore; la barra centrale del «÷» resta (sopra c'è solo un puntino,
 * ~10%) ma i suoi puntini e la ricostruzione a colonne bastano.
 */
function eraseFractionBars(img: ImageData): void {
  const w = img.width;
  const h = img.height;
  const n = w * h;
  const { data } = img;
  const dark = new Uint8Array(n);
  for (let p = 0, i = 0; p < n; p++, i += 4) dark[p] = data[i] < 150 ? 1 : 0;
  const MIN_RUN = Math.max(24, Math.round(w * 0.055));
  const MAX_THICK = Math.max(6, Math.round(h * 0.035));
  const GAP = Math.max(3, Math.round(h * 0.006));
  const visited = new Uint8Array(n);
  const stack = new Int32Array(n);
  const comp: number[] = [];

  // Il contenuto sopra/sotto deve essere VICINO: entro la lunghezza della
  // barra stessa. Le cifre di una frazione stanno subito sopra/sotto; le righe
  // di testo di un'altra esercizio (foto di pagina intera) stanno molto più
  // lontano — così un «−» lungo con testo sopra e sotto non scatta come barra
  const colHasDarkAbove = (x: number, yTop: number, maxGap: number): boolean => {
    let gap = 0;
    for (let y = yTop - 1; y >= 0 && yTop - y < Math.round(h * 0.25); y--) {
      if (dark[y * w + x]) return gap >= GAP && gap <= maxGap;
      gap++;
    }
    return false;
  };
  const colHasDarkBelow = (x: number, yBottom: number, maxGap: number): boolean => {
    let gap = 0;
    for (let y = yBottom + 1; y < h && y - yBottom < Math.round(h * 0.25); y++) {
      if (dark[y * w + x]) return gap >= GAP && gap <= maxGap;
      gap++;
    }
    return false;
  };

  for (let p0 = 0; p0 < n; p0++) {
    if (!dark[p0] || visited[p0]) continue;
    comp.length = 0;
    let sp = 0;
    stack[sp++] = p0;
    visited[p0] = 1;
    let minX = w, maxX = -1, minY = h, maxY = -1;
    while (sp > 0) {
      const p = stack[--sp];
      comp.push(p);
      const x = p % w;
      const y = (p - x) / w;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const q = yy * w + xx;
          if (dark[q] && !visited[q]) {
            visited[q] = 1;
            stack[sp++] = q;
          }
        }
      }
      // I componenti ENORMI (testo intero) non possono essere barre: pruning
      if (comp.length > n * 0.2) break;
    }
    const cw = maxX - minX + 1;
    const chh = maxY - minY + 1;
    if (cw < MIN_RUN || chh > MAX_THICK) continue;
    if (comp.length < 0.55 * cw * chh) continue; // non è un rettangolo pieno
 // Almeno il 20% delle colonne con contenuto sopra E sotto (vicino, separato
    // da bianco): la barra di frazione sta tra due cifre, il «−» non ha nulla
    // sopra. SOGLIA BASSA e voluta: nei libri la barra è spesso molto più
    // larga delle cifre (sonda E9: cifra 94px su barra 348px = 27% — con 30%
    // la barra sopravviveva e avvelenava Tesseract)
    let okCols = 0;
    let totCols = 0;
    for (let x = minX; x <= maxX; x += 2) {
      totCols++;
      if (colHasDarkAbove(x, minY, cw) && colHasDarkBelow(x, maxY, cw)) okCols++;
    }
    if (totCols > 0 && okCols / totCols >= 0.20) {
      // Si cancella la barra + un MARGINE di 2px: i bordi anti-alias che
      // sopravvivono al flood-fill diventano righe sottili che Tesseract legge
      // come «|» — e il parser le scambiava per la cifra 1 (sonda E3)
      const yA = Math.max(0, minY - 2);
      const yB = Math.min(h - 1, maxY + 2);
      const xA = Math.max(0, minX - 2);
      const xB = Math.min(w - 1, maxX + 2);
      for (let y = yA; y <= yB; y++) {
        const row = y * w;
        for (let x = xA; x <= xB; x++) {
          const i = (row + x) * 4;
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
        }
      }
    }
  }
}

/**
 * Maschera di nitidezza leggera (unsharp 3×3) sull'immagine già in grigio:
 * recupera i bordi sfumati dall'ingrandimento senza amplificare troppo il
 * rumore della foto.
 */
function unsharpMask(img: ImageData, amount: number): void {
  const w = img.width;
  const h = img.height;
  const { data } = img;
  const n = w * h;
  const gray = new Float32Array(n);
  for (let p = 0, i = 0; p < n; p++, i += 4) gray[p] = data[i];
  const blur = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    const y0 = y > 0 ? y - 1 : 0;
    const y1 = y < h - 1 ? y + 1 : h - 1;
    for (let x = 0; x < w; x++) {
      const x0 = x > 0 ? x - 1 : 0;
      const x1 = x < w - 1 ? x + 1 : w - 1;
      const acc =
        gray[y0 * w + x0] + gray[y0 * w + x] + gray[y0 * w + x1] +
        gray[y * w + x0] + gray[y * w + x] + gray[y * w + x1] +
        gray[y1 * w + x0] + gray[y1 * w + x] + gray[y1 * w + x1];
      blur[y * w + x] = acc / 9;
    }
  }
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const v = Math.max(0, Math.min(255, Math.round(gray[p] + amount * (gray[p] - blur[p]))));
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }
}

/**
 * Ridisegna la sorgente a (dw, dh). Se sta INGRANDENDO usa passi successivi
 * di massimo ×2 (tecnica standard di upscaling: preserva i dettagli fini
 * come gli apici ⁴ ² molto meglio di un unico drawImage) e ogni passaggio
 * usa smoothing di altissima qualità.
 */
function drawScaled(
  source: CanvasImageSource,
  sw: number,
  sh: number,
  dw: number,
  dh: number
): HTMLCanvasElement {
  const draw = (w: number, h: number, src: CanvasImageSource): HTMLCanvasElement => {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const c = cv.getContext("2d");
    if (!c) throw new Error("canvas non disponibile");
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    c.drawImage(src, 0, 0, w, h);
    return cv;
  };
  if (dw <= sw) return draw(dw, dh, source); // downscale: un passaggio basta
  let curW = sw;
  let curH = sh;
  let cur: CanvasImageSource = source;
  while (curW * 2 <= dw) {
    cur = draw(curW * 2, curH * 2, cur);
    curW = curW * 2;
    curH = curH * 2;
  }
  if (curW < dw) cur = draw(dw, dh, cur);
  return cur as HTMLCanvasElement;
}

/** Opzioni di ingrandimento. `targetHeight` è il passaggio «piccolo» della
 *  catena di runOcr: riduce l'immagine GIÀ ELABORATA (barre rimosse) a quella
 *  altezza, perché Tesseract legge le CIFRE delle frazioni molto meglio a
 *  ~20-30px che a 100-240px (sonde A/B su canvas: a font 70px «2»→«y» e
 *  «5»→«0», a font 20px legge tutto corretto). Con targetHeight 90 una
 *  frazione (3 righe: num, barra, den) ha cifre ~20-25px a QUALSIASI
 *  risoluzione della foto — a differenza di un maxEdge fisso, che su foto
 *  grandi cancellava i gap barra-cifra e faceva sopravvivere le barre. */
export interface EnhanceOptions {
  minEdge?: number;
  maxEdge?: number;
  targetHeight?: number;
}

/** Cache dell'elaborazione base (la stessa foto passa 5 volte nella catena
 *  di runOcr: grigio+contrasto+mediano e rimozione barre si fanno UNA volta). */
const baseCache = new WeakMap<Blob, Promise<Blob>>();

/**
 * Filtro mediano 3×3 sul grigio: rimuove il rumore «sale e pepe» (granulosità
 * della carta, polvere, artefatti JPEG) senza sfumare i bordi delle cifre.
 * VA FATTO ALLA RISOLUZIONE ORIGINALE, PRIMA dell'ingrandimento: un puntino
 * di 2px a ×3,4 diventa una macchia da 7px che il mediano non tocca più.
 */
function medianFilter3x3(img: ImageData): void {
  const w = img.width;
  const h = img.height;
  const { data } = img;
  const src = new Uint8ClampedArray(data);
  const win = new Uint8Array(9);
  for (let y = 0; y < h; y++) {
    const y0 = y > 0 ? y - 1 : 0;
    const y2 = y < h - 1 ? y + 1 : h - 1;
    for (let x = 0; x < w; x++) {
      const x0 = x > 0 ? x - 1 : 0;
      const x2 = x < w - 1 ? x + 1 : w - 1;
      win[0] = src[(y0 * w + x0) * 4];
      win[1] = src[(y0 * w + x) * 4];
      win[2] = src[(y0 * w + x2) * 4];
      win[3] = src[(y * w + x0) * 4];
      win[4] = src[(y * w + x) * 4];
      win[5] = src[(y * w + x2) * 4];
      win[6] = src[(y2 * w + x0) * 4];
      win[7] = src[(y2 * w + x) * 4];
      win[8] = src[(y2 * w + x2) * 4];
      for (let i = 1; i < 9; i++) {
        const v = win[i];
        let j = i - 1;
        while (j >= 0 && win[j] > v) {
          win[j + 1] = win[j];
          j--;
        }
        win[j + 1] = v;
      }
      const m = win[4];
      const i4 = (y * w + x) * 4;
      data[i4] = m;
      data[i4 + 1] = m;
      data[i4 + 2] = m;
    }
  }
}

/**
 * Elaborazione base UNICA per la foto (grigio → contrasto → mediano →
 * scala → rimozione barre → nitidezza), in cache sull'oggetto Blob.
 */
function enhanceBaseOcr(file: Blob): Promise<Blob> {
  let p = baseCache.get(file);
  if (p) return p;
  p = (async (): Promise<Blob> => {
    const bmp = await bitmapFromBlob(file);
    try {
      // 1) ALLA RISOLUZIONE ORIGINALE: grigio, contrasto e mediano (despeckle:
      //    il mediano 3×3 toglie solo i puntini; dopo l'upscale sarebbero
      //    macchie troppo grandi e sopravvivrebbero)
      const orig = document.createElement("canvas");
      orig.width = bmp.width;
      orig.height = bmp.height;
      const octx = orig.getContext("2d", { willReadFrequently: true });
      if (!octx) throw new Error("canvas non disponibile");
      octx.drawImage(bmp, 0, 0);
      const oimg = octx.getImageData(0, 0, orig.width, orig.height);
      contrastStretchGray(oimg);
      medianFilter3x3(oimg);
      octx.putImageData(oimg, 0, 0);

      // 2) SCALA BASE: grande se piccola (minEdge 1100, come nell'app
      //    biquadratica), limitata a maxEdge se enorme. Le BARRE si tolgono
      //    QUI, alla risoluzione piena: i gap barra-cifra sono ampi e il
      //    criterio sopra/sotto è affidabile (a scala piccola i gap da 2-3px
      //    facevano sopravvivere le barre)
      const maxEdge = Math.max(bmp.width, bmp.height);
      const minEdge = Math.min(bmp.width, bmp.height);
      let scale = 1;
      if (maxEdge > MAX_EDGE) scale = MAX_EDGE / maxEdge;
      else if (minEdge < MIN_EDGE) scale = MIN_EDGE / minEdge;
      const cw = Math.max(1, Math.round(bmp.width * scale));
      const ch = Math.max(1, Math.round(bmp.height * scale));
      const upscaled = scale > 1.05;
      const canvas = drawScaled(orig, orig.width, orig.height, cw, ch);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("canvas non disponibile");
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      eraseFractionBars(img);
      if (upscaled) unsharpMask(img, 0.4);
      ctx.putImageData(img, 0, 0);
      return await canvasToBlob(canvas, "image/png");
    } finally {
      bmp.close();
    }
  })();
  baseCache.set(file, p);
  return p;
}

/** Immagine ottimizzata per Tesseract (PNG lossless, grigio, contrasto). */
export async function enhanceForOcr(file: Blob, opts: EnhanceOptions = {}): Promise<Blob> {
  // Passaggio «piccolo»: si riduce dall'immagine GIÀ ELABORATA (barre rimosse,
  // rumore pulito, contrasto steso) — MAI dalla foto originale, dove le barre
  // sopravvivrebbero ai gap ridotti e il rumore tornerebbe
  if (opts.targetHeight !== undefined) {
    const base = await enhanceBaseOcr(file);
    const bmp = await bitmapFromBlob(base);
    try {
      const scale = opts.targetHeight / bmp.height;
      const cw = Math.max(1, Math.round(bmp.width * scale));
      const ch = Math.max(1, Math.round(opts.targetHeight));
      const canvas = drawScaled(bmp, bmp.width, bmp.height, cw, ch);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("canvas non disponibile");
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // La riduzione ammorbidisce: una nitidezza leggera richiude i bordi
      unsharpMask(img, 0.3);
      ctx.putImageData(img, 0, 0);
      return await canvasToBlob(canvas, "image/png");
    } finally {
      bmp.close();
    }
  }
  return enhanceBaseOcr(file);
}
