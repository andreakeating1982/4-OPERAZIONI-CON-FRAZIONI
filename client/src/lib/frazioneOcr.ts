/**
 * Ricostruzione dell'esercizio di frazioni dal risultato OCR (Tesseract).
 *
 * STORICO (misurato, come per gli apici x⁴ nell'app biquadratica): Tesseract
 * NON legge le barre di frazione ORIZZONTALI — «3 sopra 4» arriva come due
 * numeri separati («3» e «4»), e la barra sparisce del tutto. Il testo secco
 * («3 1\n+\n4 6») non basta: serve la RICOSTRUZIONE GEOMETRICA dalle bounding
 * box delle parole (ocrImageDetailed):
 *
 *  1. ogni parola viene classificata: numero intero (con CORREZIONE DELLE
 *     CONFUSIONI O→0, l/I→1, Z→2, A→4, S→5, b/G→6, T→7, B→8, g/q→9 — senza
 *     questa tabella una sola cifra letta come lettera manda in fallo TUTTO),
 *     frazione «incollata» («3/4», «3:4», «3?4» o «3-4» quando la barra è
 *     stata letta come un meno), o operatore (+ − × ÷ : · x);
 *  2. se ci sono almeno due frazioni incollate → si usa quelle (mix: una
 *     incollata + una impilata è gestito dal CASO MISTO);
 *  3. altrimenti, con ≥ 4 numeri, l'OPERATORE SCELTO non è il primo arrivato
 *     ma quello che separa davvero i numeri in due gruppi da ≥ 2 per lato
 *     (così un meno finto — la barra della prima frazione letta come «-» —
 *     viene scartato in favore del vero operatore);
 *  4. se l'operatore manca del tutto, si provano i candidati ambigui (token
 *     di 1 carattere non classificati, es. «+» letto come «t») usando la
 *     MODALITÀ SELEZIONATA nell'app come suggerimento (addsub → «+», muldiv
 *     → «×»), sempre con fuzzy = true; ultima spiaggia: divisione al massimo
 *     vuoto orizzontale tra i numeri;
 *  5. fallback finale: pattern testuale «a/b op c/d» sul testo secco.
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
type OpTok = { op: FrazioneOp; cx: number; y0: number };
type AmbTok = { cx: number; y0: number; y1: number };

/**
 * Confusioni tipiche di Tesseract su cifre stampate/scritte (sonde A/B):
 * una sola cifra letta come lettera buttava via TUTTO il token e, se era
 * una delle quattro della frazione, anche l'intera ricostruzione.
 */
const DIGIT_FROM_CHAR: Record<string, string> = {
  O: "0", o: "0", Q: "0",
  I: "1", i: "1", l: "1", L: "1", "|": "1", "!": "1",
  Z: "2", z: "2",
  A: "4",
  S: "5", s: "5",
  G: "6", b: "6",
  T: "7",
  B: "8",
  g: "9", q: "9",
};

/** Token di 1 carattere spesso LETTO AL POSTO dell'operatore (es. «+»→«t») */
const AMBIGUOUS_OP_CHARS = new Set([".", ",", "~", "^", "t", "f", "J", "y", "%"]);

/** Converte un token in numero applicando la tabella di confusione.
 *  Accetta: cifre pure («34»), misti cifra+lettera («3A»→34, «l5»→15) e
 *  solo-lettere di 1-2 caratteri tutte mappabili («O»→0, «lB»→18). */
function parseNumberToken(t: string): number | null {
  if (/^\d{1,5}$/.test(t)) return Number(t);
  if (!/^[\dA-Za-z|!]{1,4}$/.test(t)) return null;
  let out = "";
  let digits = 0;
  for (const ch of t) {
    if (ch >= "0" && ch <= "9") {
      out += ch;
      digits++;
      continue;
    }
    const d = DIGIT_FROM_CHAR[ch];
    if (!d) return null;
    out += d;
  }
  if (digits === 0 && t.length > 2) return null; // «AI» sì, «ABC» no
  if (out.length === 0 || out.length > 5) return null;
  const v = Number(out);
  if (!Number.isFinite(v) || v > MAX_VAL) return null;
  return v;
}

function parseOpWord(t: string): FrazioneOp | null {
  const s = cleanRaw(t);
  if (/^\+$/.test(s)) return "+";
  if (/^-+$/.test(s)) return "-";
  if (/^\*+$/.test(s)) return "*";
  if (/^[/\u0002]+$/.test(s)) return "/";
  if (/^:$/.test(s)) return "/"; // «:» tra i numeri = divisione (o barra incollata)
  // Glifi che cleanRaw non trasforma: × e varianti → moltiplicazione.
  // FIX BUG: ÷ NON sta qui — è una DIVISIONE (prima finiva in questa classe
  // e veniva restituito «*», trasformando le divisioni in moltiplicazioni).
  if (/^[×✕⨯∗xX·⋅]$/.test(t)) return "*";
  if (/^[÷∶]$/.test(t)) return "/";
  return null;
}

/**
 * Sceglie tra gli operatori trovati quello che separa davvero i numeri in
 * due gruppi da ≥ 2 per lato. Il primo operatore per cx può essere un FALSO
 * operatore (la barra di una frazione letta come «-», spesso appena spostata
 * dalla sua colonna): tra i candidati validi si sceglie il più BILANCIATO,
 * cioè quello con distanze simili dal gruppo di sinistra e da quello di
 * destra — il vero operatore sta a metà strada tra le due colonne, la barra
 * di una frazione no (test E2E: «SE - SE» su frazioni impilate).
 */
function pickSplitOp(
  ops: OpTok[],
  xs: number[]
): { op: FrazioneOp | null; splitX: number | null; fuzzy: boolean } {
  const sorted = [...ops].sort((a, b) => a.cx - b.cx);
  let best: { op: FrazioneOp; splitX: number; score: number } | null = null;
  for (const o of sorted) {
    const leftXs = xs.filter((x) => x < o.cx);
    const rightXs = xs.filter((x) => x >= o.cx);
    if (leftXs.length < 2 || rightXs.length < 2) continue;
    const g1 = o.cx - Math.max(...leftXs);
    const g2 = Math.min(...rightXs) - o.cx;
    const score = Math.abs(g1 - g2); // 0 = perfettamente in mezzo
    if (!best || score < best.score) {
      best = { op: o.op, splitX: o.cx, score };
    }
  }
  if (best) return { op: best.op, splitX: best.splitX, fuzzy: false };
  return { op: null, splitX: null, fuzzy: true };
}

/** Massimo vuoto orizzontale tra numeri ordinati per cx (senza operatore). */
function splitByBiggestGap(nums: NumTok[]): number | null {
  const byX = [...nums].sort((a, b) => a.cx - b.cx);
  let bestGap = -1;
  let splitX: number | null = null;
  for (let i = 1; i < byX.length; i++) {
    const gap = byX[i].cx - byX[i - 1].cx;
    if (gap > bestGap) {
      bestGap = gap;
      splitX = (byX[i].cx + byX[i - 1].cx) / 2;
    }
  }
  return splitX;
}

/**
 * Ricostruisce l'esercizio dalle parole con posizione.
 * `modeHint` è la modalità selezionata nell'app ("addsub" | "muldiv"):
 * serve SOLO a scegliere il segno quando l'operatore è stato letto come un
 * carattere qualunque (es. «+» → «t»): addsub → «+», muldiv → «×».
 * Ritorna null se non riesce a formare due frazioni valide.
 */
export function normalizeFrazioneOcrFromWords(
  words: OcrWord[],
  modeHint?: "addsub" | "muldiv"
): FrazioneOcrResult | null {
  const nums: NumTok[] = [];
  const fracs: FracTok[] = [];
  const ops: OpTok[] = [];
  const ambigs: AmbTok[] = [];

  for (const w of words) {
    const t = w.text.trim();
    if (!t) continue;
    // Linea orizzontale letta come «|» (residuo di barra o filetto del libro):
    // un «|» con bbox PIÙ LARGA che alta non è una cifra 1 — si butta
    if (t === "|" && w.x1 - w.x0 > (w.y1 - w.y0) * 1.5) continue;
    // frazione incollata: «3/4», «3:4», «3?4» e «3-4» (barra letta come meno)
    const glued = t.match(/^(\d{1,5})\s*[/:\-?]\s*(\d{1,5})$/);
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
      ops.push({ op, cx: (w.x0 + w.x1) / 2, y0: w.y0 });
      continue;
    }
    // numero intero (con correzione delle confusioni lettera→cifra)
    const v = parseNumberToken(t);
    if (v !== null) {
      nums.push({ v, cx: (w.x0 + w.x1) / 2, y0: w.y0 });
      continue;
    }
    // candidato operatore ambiguo: 1 carattere, vicino al centro verticale
    if (t.length === 1 && AMBIGUOUS_OP_CHARS.has(t)) {
      ambigs.push({ cx: (w.x0 + w.x1) / 2, y0: w.y0, y1: w.y1 });
    }
  }

  // Operatore da suggerimento di modalità (solo per gli ambigui)
  const hintOp: FrazioneOp | null =
    modeHint === "addsub" ? "+" : modeHint === "muldiv" ? "*" : null;

  // Caso A: due frazioni incollate
  if (fracs.length >= 2) {
    const sorted = [...fracs].sort((a, b) => a.cx - b.cx);
    const lo = sorted[0].cx;
    const hi = sorted[1].cx;
    const between = ops
      .filter((o) => o.cx > lo && o.cx < hi)
      .sort((a, b) => a.cx - b.cx);
    const chosen = between.length > 0 ? between[0] : [...ops].sort((a, b) => a.cx - b.cx)[0];
    return {
      num1: sorted[0].n,
      den1: sorted[0].d,
      num2: sorted[1].n,
      den2: sorted[1].d,
      op: chosen ? chosen.op : null,
      fuzzy: !chosen || fracs.length > 2,
    };
  }

  // SOCORSO «7 letto /»: con 3 numeri e un operatore «/» isolato, quel
  // «/» è quasi certamente una SETTE tagliata in verticale (sonda E2E: «7/8»
  // impilato → Tesseract legge «/» al posto del «7»). Lo convertiamo in
  // cifra e proseguiamo, sempre con fuzzy = true.
  let rescued = false;
  if (nums.length === 3 && ops.length > 0) {
    const slash = [...ops].sort((a, b) => a.cx - b.cx).find((o) => o.op === "/");
    if (slash) {
      nums.push({ v: 7, cx: slash.cx, y0: slash.y0 });
      ops.splice(ops.indexOf(slash), 1);
      rescued = true;
    }
  }

  // Caso B: ricostruzione per posizione (barre di frazione non lette)
  if (nums.length >= 4) {
    const xs = nums.map((n) => n.cx);
    let op: FrazioneOp | null = null;
    let splitX: number | null = null;
    let fuzzy = false;

    const picked = pickSplitOp(ops, xs);
    if (picked.op !== null && picked.splitX !== null) {
      op = picked.op;
      splitX = picked.splitX;
    } else {
      // Nessun operatore che separa: provo i candidati ambigui tra i gruppi
      const amb = ambigs
        .filter((a) => xs.filter((x) => x < a.cx).length >= 2 && xs.filter((x) => x >= a.cx).length >= 2)
        .sort((a, b) => a.cx - b.cx)[0];
      if (amb && hintOp) {
        op = hintOp;
        splitX = amb.cx;
        fuzzy = true;
      } else {
        // Ultima spiaggia: divisione al massimo vuoto orizzontale
        splitX = splitByBiggestGap(nums);
        fuzzy = true;
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
    return { num1, den1, num2, den2, op, fuzzy: fuzzy || rescued };
  }

  // CASO MISTO: una frazione incollata + una impilata (due numeri in colonna)
  if (fracs.length === 1 && nums.length >= 2) {
    // Cerca la coppia di numeri più «impilata»: quasi stessa x, y molto diversi
    let best: [NumTok, NumTok] | null = null;
    let bestScore = Infinity;
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const a = nums[i];
        const b = nums[j];
        const dx = Math.abs(a.cx - b.cx);
        const dy = Math.abs(a.y0 - b.y0);
        if (dy > 8 && dx < 0.8 * dy && dx + dy / 4 < bestScore) {
          bestScore = dx + dy / 4;
          best = [a, b];
        }
      }
    }
    if (!best) return null;
    const colCx = (best[0].cx + best[1].cx) / 2;
    const colNums = [...best].sort((a, b) => a.y0 - b.y0);
    const stacked: FracTok = { n: colNums[0].v, d: colNums[1].v, cx: colCx };
    const f = fracs[0];
    const first = f.cx <= stacked.cx ? f : stacked;
    const second = f.cx <= stacked.cx ? stacked : f;
    // Operatore: vero op tra i due, altrimenti ambiguo, altrimenti null
    const lo = Math.min(f.cx, stacked.cx);
    const hi = Math.max(f.cx, stacked.cx);
    const between = ops.filter((o) => o.cx > lo && o.cx < hi).sort((a, b) => a.cx - b.cx);
    const ambBetween = ambigs
      .filter((a) => a.cx > lo && a.cx < hi)
      .sort((a, b) => a.cx - b.cx)[0];
    const chosen = between.length > 0 ? between[0] : null;
    return {
      num1: first.n,
      den1: first.d,
      num2: second.n,
      den2: second.d,
      op: chosen ? chosen.op : ambBetween && hintOp ? hintOp : null,
      fuzzy: !chosen || nums.length > 2,
    };
  }

  return null;
}

/**
 * Via principale: prova prima la ricostruzione geometrica (barre orizzontali
 * NON lette da Tesseract), poi quella incollata, infine il fallback testuale.
 * `modeHint`: modalità selezionata nell'app (aiuta a recuperare l'operatore
 * letto come carattere qualunque — vedi normalizeFrazioneOcrFromWords).
 */
function normalizeFrazioneOcrSmartInner(
  rawText: string,
  words: OcrWord[],
  modeHint?: "addsub" | "muldiv"
): FrazioneOcrResult | null {
  const geo = normalizeFrazioneOcrFromWords(words, modeHint);
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
  return normalizeFrazioneOcrFromWords(synthetic, modeHint);
}

/**
 * Wrapper pubblico: uno 0 come numeratore è quasi sempre un «5» o «9» male
 * letto (sonda E8: 12/34 + 5/6 → «50» letto «06»); non lo rifiutiamo del
 * tutto (0/4 esiste) ma abbassiamo la fiducia, così la catena best-of di
 * runOcr continua a cercare un passaggio più pulito.
 */
export function normalizeFrazioneOcrSmart(
  rawText: string,
  words: OcrWord[],
  modeHint?: "addsub" | "muldiv"
): FrazioneOcrResult | null {
  const res = normalizeFrazioneOcrSmartInner(rawText, words, modeHint);
  if (res && !res.fuzzy && (res.num1 === 0 || res.num2 === 0)) {
    return { ...res, fuzzy: true };
  }
  return res;
}
