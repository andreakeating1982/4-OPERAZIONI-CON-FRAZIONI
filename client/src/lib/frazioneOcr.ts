/**
 * Ricostruzione dell'esercizio di frazioni dal testo OCR (Tesseract).
 *
 * Tesseract legge bene cifre e segni, ma la barra di frazione «/» a volte
 * viene scambiata per «?» o «:», e i simboli × ÷ arrivano come «x», «*»,
 * «·», «:». Questo modulo NON fa un semplice cleanup: RICOSTRUISCE
 * l'esercizio «a/b op c/d»:
 *
 *  1. normalizza i simboli (unicode minus → «-», ÷ ∶ → divisione, × · x → «*»,
 *     «?» → «/» perché è il misread più frequente della barra);
 *  2. trova le frazioni con la regex (\d+)\s*[/:?]\s*(\d+) — la barra può
 *     arrivare come «/», «:» o «?»;
 *  3. l'OPERATORE è il primo segno tra la prima e la seconda frazione
 *     (+ − × · * x / ÷ : ∶) — «:» e «÷» tra due frazioni significano DIVISIONE
 *     (notazione italiana «3/4 : 2/5»), quindi mappati su op = "/";
 *  4. se trova più di due frazioni (esercizi da 3-4 frazioni) usa le prime due
 *     e alza il flag fuzzy;
 *  5. se l'operatore manca (ritaglio troppo stretto) op = null e fuzzy = true:
 *     la UI tiene i numeri e lascia l'operazione scelta dallo studente.
 *
 * Limiti v1 (documentati): segni negativi attaccati al numeratore non sono
 * interpretati (le frazioni dell'app sono positivamente impostate); den = 0
 * → risultato rifiutato.
 */

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

/** Pulizia dei simboli conosciuti di Tesseract */
function cleanRaw(raw: string): string {
  return raw
    .replace(/[\u2212\u2012\u2013\u2014]/g, "-") // unicode minus e trattini → -
    .replace(/[?]/g, "/") // la barra di frazione letta come «?»
    .replace(/[\u2236\u00F7]/g, "\u0001") // ∶ ÷ → segnaposto divisione
    .replace(/[\u00B7\u22C5\u2217\u2715\u2716\u00D7*]/g, "*") // · ⋅ ∗ ✕ ✖ × * → *
    .replace(/[xX](?=\s*[\d(\u0001])/g, "*") // «x» tra numeri → moltiplicazione
    .replace(/:/g, "\u0002"); // : → segnaposto (barra O divisione, v sotto)
}

/** Match di frazione: cifra/segnaposto-barra/cifra (con spazi) */
const FRAC_RE = /(\d{1,5})\s*([/\u0001\u0002])\s*(\d{1,5})/g;

/**
 * Riconosce l'esercizio di frazioni dal testo OCR.
 * Ritorna null se non trova almeno due frazioni valide.
 */
export function normalizeFrazioneOcrDetailed(raw: string): FrazioneOcrResult | null {
  if (!raw) return null;
  const s = cleanRaw(raw);

  const matches: { num: number; den: number; start: number; end: number }[] = [];
  FRAC_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = FRAC_RE.exec(s)) !== null) {
    const num = Number(m[1]);
    const den = Number(m[3]);
    matches.push({ num, den, start: m.index, end: m.index + m[0].length });
  }

  if (matches.length < 2) return null;

  const f1 = matches[0];
  const f2 = matches[1];

  // Denominatori a zero o valori assurdi → rifiuto (l'app non divide per 0)
  if (f1.den <= 0 || f2.den <= 0) return null;
  if (f1.num > MAX_VAL || f1.den > MAX_VAL || f2.num > MAX_VAL || f2.den > MAX_VAL) return null;

  // Operatore: primo segno riconoscibile tra la prima e la seconda frazione
  const between = s.slice(f1.end, f2.start);
  let op: FrazioneOp | null = null;
  const opMatch = between.match(/[+\-*\u0001\u0002/xX]/);
  if (opMatch) {
    const ch = opMatch[0];
    if (ch === "+") op = "+";
    else if (ch === "-") op = "-";
    else if (ch === "*") op = "*";
    else op = "/"; // / ÷ : ∶ tra due frazioni → divisione
  }

  // fuzzy: operatore mancante oppure più di due frazioni nel testo
  const fuzzy = op === null || matches.length > 2;

  return { num1: f1.num, den1: f1.den, num2: f2.num, den2: f2.den, op, fuzzy };
}
