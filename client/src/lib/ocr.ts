/**
 * Riconoscimento OCR dell'equazione da foto (Tesseract.js).
 *
 * - Lingua «eng»: è quella che riconosce meglio cifre, x e i simboli
 *   + − = presenti in un'equazione di quarto grado trinomia biquadratica.
 * - Worker e core WASM sono SELF-HOSTED in `/tess` e i dati lingua in
 *   `/tessdata`: l'app imposta COOP/COEP sui documenti, quindi niente CDN —
 *   tutto arriva dallo stesso dominio (funziona anche offline dopo il primo
 *   caricamento e su Render senza configurazioni extra).
 * - Il testo grezzo viene poi normalizzato da `normalizeEquationOcr`
 *   (vedi `@/lib/eqOcr`).
 */
import { createWorker, PSM } from "tesseract.js";
import { enhanceForOcr } from "@/lib/imagePrep";

type OcrWorker = Awaited<ReturnType<typeof createWorker>>;

let workerPromise: Promise<OcrWorker> | null = null;
let progressCb: ((p: number) => void) | null = null;

function getWorker(onProgress?: (p: number) => void): Promise<OcrWorker> {
  progressCb = onProgress ?? null;
  if (!workerPromise) {
    workerPromise = createWorker("eng", 1, {
      workerPath: "/tess/worker.min.js",
      corePath: "/tess",
      langPath: "/tessdata",
      logger: (m) => {
        if (m.status === "recognizing text" && progressCb) progressCb(m.progress);
      },
    }).then(async (w) => {
      await w.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });
      return w;
    });
  }
  return workerPromise;
}

/** Parola riconosciuta con la sua posizione (bbox in px sull'immagine). */
export interface OcrWord {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Riconosce il testo in una foto (o nel ritaglio di una foto). */
export async function ocrImage(
  file: File | Blob,
  onProgress?: (p: number) => void
): Promise<string> {
  const { text } = await ocrImageDetailed(file, onProgress);
  return text;
}

/**
 * Riconoscimento con GEOMETRIA: oltre al testo restituisce la bounding box
 * di ogni parola. Serve alla ricostruzione delle frazioni (frazioneOcr.ts):
 * Tesseract NON legge le barre di frazione orizzontali (come non leggeva gli
 * apici x⁴ nell'app biquadratica) — numeratore e denominatore vanno ricostruiti
 * dalla POSIZIONE (numero in alto = numeratore, numero in basso = denominatore).
 */
export async function ocrImageDetailed(
  file: File | Blob,
  onProgress?: (p: number) => void
): Promise<{ text: string; words: OcrWord[] }> {
  onProgress?.(0.05);
  let prepared: Blob = file;
  try {
    prepared = await enhanceForOcr(file);
  } catch {
    prepared = file;
  }
  onProgress?.(0.12);
  const worker = await getWorker(onProgress);
  const { data } = await worker.recognize(prepared, {}, { text: true, blocks: true });
  const words: OcrWord[] = [];
  for (const block of (data as any).blocks ?? []) {
    for (const par of block?.paragraphs ?? []) {
      for (const line of par?.lines ?? []) {
        for (const w of line?.words ?? []) {
          const t = (w?.text ?? "").trim();
          if (t && w?.bbox) {
            words.push({ text: t, x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 });
          }
        }
      }
    }
  }
  return { text: data.text ?? "", words };
}
