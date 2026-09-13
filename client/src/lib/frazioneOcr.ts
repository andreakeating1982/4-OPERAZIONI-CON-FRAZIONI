/**
 * Ricostruzione dell'esercizio di frazioni dal risultato OCR (Tesseract).
 *
 * STORICO (misurato, come per gli apici x⁴ nell'app biquadratica): Tesseract
 * NON legge le barre di frazione ORIZZONTALI — «3 sopra 4» arriva come due
 * numeri separati («3» e «4»), e la barra sparisce del tutto. Il testo secco
 * («3 1
+
4 6») non basta: serve la RICOSTRUZIONE GEOMETRICA dalle bounding
 * box delle parole (ocrImageDetailed):
 *
 *  1. ogni parola viene classificata: numero intero, frazione «incollata»
 *     (es. «3/4» quando la barra era una linea inclinata o un «:»), o
 *     operatore (+ − × ÷ : · x);
 *  2. se ci sono almeno due frazioni incollate → si usa quelle;
 *  3. altrimenti, con ≥ 4 numeri e un operatore, i numeri a SINISTRA
 *     dell'operatore formano la prima frazione (il più ALTO è il numeratore,
 *     il più BASSO il denominatore), quelli a DESTRA la seconda;
 *  4. se l'operatore manca, si divide al massimo vuoto orizzontale tra i
 *     numeri (fuzzy = true);
 *  5. fallback finale: pattern testuale «a/b op c/d» sul testo secco
 *     (normalizeFrazioneOcrDetailed), per esercizi scritti in linea con «/».
 *
 * Limiti v1 (documentati): due frazioni per esercizio; frazioni negative non
 * interpretate; den = 0 → rifiuto.
 */

import type { OcrWord } from "@/lib/ocr";

export type FrazioneOp = "+" | "-" | "*" | "/";

export interface FrazioneOcrResult {
  num1: number;
  den1: number;
  num2: number;
  den2: number;
  /** Operatore riconosciuto; null = non trovato con certezza */
  op: FrazioneOp | null;
  /** true se la ricostruzione è andata in inferenza (controllare a schermo) */
  fuzzy: boolean;
}

/** Massimo valore accettabile per numeratori e denominatori */
const MAX_VAL = 9999;

function cleanRaw(raw: string): string {
  return raw
    .replace(/[\u2212\u2012\u2013\u2014]/g, "-")
    .replace(/[?]/g, "/")
    .replace(/[\u2236\u00F7]/g, "/")
    .replace(/[\u00B7\u22C5\u2217\u2715\u2716\u00D7*]/g, "*")
    .replace(/[xX](?=\s*[\d(/])/g, "*");
}

/** Pattern testuale di fallback: «a/b op c/d» scritto in linea */
export function normalizeFrazioneOcrDetailed(raw: string): FrazioneOcrResult | null {
  if (!raw) return null;
  const s = cleanRaw(raw);
  const FRAC_RE = /(\d{1,5})\s*([/:])\s*(\d{1,5})/g;
  const matches: { num: number; den: number; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = FRAC_RE.exec(s)) !== null) {
    matches.push({ num: Number(m[1]), den: Number(m[3]), start: m.index, end: m.index + m[0].length });
  }
  if (matches.length < 2) return null;
  const f1 = matches[0];
  const f2 = matches[1];
  if (f1.den <= 0 || f2.den <= 0) return null;
  if ([f1.num, f1.den, f2.num, f2.den].some((v) => v > MAX_VAL)) return null;
  const between = s.slice(f1.end, f2.start);
  const opMatch = between.match(/[+\-*/]/);
  const op: FrazioneOp | null = opMatch
    ? opMatch[0] === "+"
      ? "+"
      : opMatch[0] === "-"
        ? "-"
        : opMatch[0] === "*"
          ? "*"
          : "/"
    : null;
  return { num1: f1.num, den1: f1.den, num2: f2.num, den2: f2.den, op, fuzzy: op === null || matches.length > 2 };
}

// ─── Ricostruzione geometrica (la via principale) ─────────────────

type NumTok = { v: number; cx: number; y0: number };
type FracTok = { n: number; d: number; cx: number };
type OpTok = { op: FrazioneOp; cx: number };

function parseOpWord(t: string): FrazioneOp | null {
  const s = cleanRaw(t);
  if (/^\+$/.test(s)) return "+";
  if (/^-+$/.test(s)) return "-";
  if (/^[*]+$/.test(s)) return "*";
  if (/^[/\u0002]+$/.test(s)) return "/";
  if (/^[×÷∶xX·⋅]$/.test(t)) return "*";
  return null;
}

/**
 * Ricostruisce l'esercizio dalle parole con posizione.
 * Ritorna null se non riesce a formare due frazioni valide.
 */
export function normalizeFrazioneOcrFromWords(words: OcrWord[]): FrazioneOcrResult | null {
  const nums: NumTok[] = [];
  const fracs: FracTok[] = [];
  const ops: OpTok[] = [];

  for (const w of words) {
    const t = w.text.trim();
    if (!t) continue;
    // frazione incollata: «3/4», «3:4», «3?4» (la barra letta come altro glifo)
    const glued = t.match(/^(\d{1,5})\s*[/:?]\s*(\d{1,5})$/);
    if (glued) {
      const n = Number(glued[1]);
      const d = Number(glued[2]);
      if (d > 0 && n <= MAX_VAL && d <= MAX_VAL) {
        fracs.push({ n, d, cx: (w.x0 + w.x1) / 2 });
      }
      continue;
    }
    // operatore
    const op = parseOpWord(t);
    if (op !== null) {
      ops.push({ op, cx: (w.x0 + w.x1) / 2 });
      continue;
    }
    // numero intero isolato
    const num = t.match(/^(\d{1,5})$/);
    if (num) {
      const v = Number(num[1]);
      if (v <= MAX_VAL) nums.push({ v, cx: (w.x0 + w.x1) / 2, y0: w.y0 });
    }
  }

  // Caso A: due frazioni incollate
  if (fracs.length >= 2) {
    const sorted = [...fracs].sort((a, b) => a.cx - b.cx);
    const op = ops.length > 0 ? ops.sort((a, b) => a.cx - b.cx)[0].op : null;
    return { num1: sorted[0].n, den1: sorted[0].d, num2: sorted[1].n, den2: sorted[1].d, op, fuzzy: op === null };
  }

  // Caso B: ricostruzione per posizione (barre di frazione non lette)
  if (nums.length >= 4) {
    let splitX: number | null = null;
    let op: FrazioneOp | null = null;
    if (ops.length > 0) {
      const first = ops.sort((a, b) => a.cx - b.cx)[0];
      op = first.op;
      splitX = first.cx;
    } else {
      // Nessun operatore: divide al massimo vuoto orizzontale tra i numeri
      const byX = [...nums].sort((a, b) => a.cx - b.cx);
      let bestGap = -1;
      for (let i = 1; i < byX.length; i++) {
        const gap = byX[i].cx - byX[i - 1].cx;
        if (gap > bestGap) {
          bestGap = gap;
          splitX = (byX[i].cx + byX[i - 1].cx) / 2;
        }
      }
    }
    if (splitX === null) return null;

    const left = nums.filter((n) => n.cx < splitX).sort((a, b) => a.y0 - b.y0);
    const right = nums.filter((n) => n.cx >= splitX).sort((a, b) => a.y0 - b.y0);
    if (left.length < 2 || right.length < 2) return null;

    const num1 = left[0].v;
    const den1 = left[1].v;
    const num2 = right[0].v;
    const den2 = right[1].v;
    if (den1 <= 0 || den2 <= 0) return null;
    if (left.length > 2 || right.length > 2) {
      // numeri in eccesso (terza/quarta frazione o rumore): prime due per lato
      return { num1, den1, num2, den2, op, fuzzy: true };
    }
    return { num1, den1, num2, den2, op, fuzzy: op === null };
  }

  return null;
}

/**
 *Via principale: prova prima la ricostruzione geometrica (barre orizzontali
 * NON lette da Tesseract), poi quella incollata, infine il fallback testuale.
 */
export function normalizeFrazioneOcrSmart(
  rawText: string,
  words: OcrWord[]
): FrazioneOcrResult | null {
  const geo = normalizeFrazioneOcrFromWords(words);
  if (geo) return geo;
  const text = normalizeFrazioneOcrDetailed(rawText);
  if (text) return text;
  // Seconda chance: ricostruzione geometrica sul solo testo numerico
  const synthetic: OcrWord[] = [];
  const lines = rawText.split(/\n+/);
  lines.forEach((line, li) => {
    const tokens = line.trim().split(/\s+/).filter(Boolean);
    tokens.forEach((tk, ti) => {
      synthetic.push({ text: tk, x0: ti * 100, y0: li * 100, x1: ti * 100 + 80, y1: li * 100 + 80 });
    });
  });
  return normalizeFrazioneOcrFromWords(synthetic);
}
