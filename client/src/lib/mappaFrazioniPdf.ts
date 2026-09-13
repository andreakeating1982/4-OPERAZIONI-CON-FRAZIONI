/**
 * MAPPA CONCETTUALE — PDF dinamico basato sull'ESERCIZIO REALE dello studente.
 *
 * Il PDF contiene DUE sole mappe, costruite sull'operazione effettiva inserita
 * dall'utente (stessi numeri esatti, solo i contenuti del tipo di operazione):
 *
 *  - MAPPA SVOLTA — l'operazione dell'utente risolta passo-passo con i suoi
 *    numeri (m.c.m., trasformazioni, semplificazioni a croce, risultato).
 *  - MAPPA CONCETTUALE — la stessa struttura «da completare»: stessi passi
 *    guidati, valori puntinati (\dots), figure visibili (ex «livello 1»).
 *
 * Se l'utente ha inserito un'addizione, la mappa mostra SOLO l'addizione;
 * se una sottrazione, SOLO la sottrazione; se una moltiplicazione, SOLO la
 * moltiplicazione (con le DUE FIGURE allegate: «a croce» nel passo di
 * semplificazione, «in linea» nel passo di moltiplicazione); se una divisione,
 * SOLO la divisione (dopo l'inversione valgono le figure della moltiplicazione).
 *
 * Le due figure (client/public/mappa-fig-mol-in-linea.png e
 * client/public/mappa-fig-mol-a-croce.png) vengono incorporate come data URI
 * base64 al momento dell'apertura: il PDF resta AUTOCONTENUTO.
 *
 * Architettura (da Equazioni Biquadratiche, mappaPdf.ts): impaginazione a
 * MISURAZIONE REALE NEL DOM (PAGE_BUDGET ≈ 900 px visuali), margini 2,5 cm
 * su A4, piè di pagina «Pagina N di M» che riparte da 1 per ogni mappa,
 * font OpenDyslexic, KaTeX per le frazioni. NON scrivere box «a occhio»:
 * ogni box passa da stepBox/solidBox per essere paginato correttamente.
 */
import katex from "katex";

// ─── Dati in ingresso ─────────────────────────────────────────────

export type MappaOp = "+" | "-" | "*" | "/";

export interface MappaFrazioneData {
  /** modalità scelta nella prima pagina */
  mode: "addsub" | "muldiv";
  /** operazione effettiva inserita dall'utente: + − × ÷ */
  op: MappaOp;
  /** le due frazioni inserite dall'utente */
  num1: number;
  den1: number;
  num2: number;
  den2: number;
  /** riga studente (opzionale, dai parametri URL) */
  studentLabel?: string;
}

export interface MappaFigures {
  /** data URI della figura «moltiplicazione in linea» (frecce orizzontali) */
  inline?: string;
  /** data URI della figura «semplificazione a croce» (frecce incrociate) */
  croce?: string;
}

const FIG_INLINE_URL = "/mappa-fig-mol-in-linea.png";
const FIG_CROCE_URL = "/mappa-fig-mol-a-croce.png";

// ─── Formattazione ────────────────────────────────────────────────

/** Frazione colorata: numeratore BLU, denominatore VERDE */
function fracLatex(num: number | string, den: number | string): string {
  const n = typeof num === "number" ? String(num) : num;
  const d = typeof den === "number" ? String(den) : den;
  return `\\dfrac{\\textcolor{#1F4E9C}{${n}}}{\\textcolor{#2E7D32}{${d}}}`;
}

/** Campo da completare: puntini grigi ben visibili */
function blank(): string {
  return "\\textcolor{#9CA3AF}{\\dots}";
}

function katexBlock(latex: string): string {
  try {
    return katex.renderToString(latex, { displayMode: true, throwOnError: false, strict: false });
  } catch { return latex; }
}

function katexInline(latex: string): string {
  try {
    return katex.renderToString(latex, { displayMode: false, throwOnError: false, strict: false });
  } catch { return latex; }
}

function opSymbol(op: MappaOp): string {
  return op === "*" ? "\\times" : op === "/" ? "\\div" : op;
}

function opWord(op: MappaOp): string {
  return op === "+" ? "addizione" : op === "-" ? "sottrazione" : op === "*" ? "moltiplicazione" : "divisione";
}

/** Nome con articolo per i titoli: L'ADDIZIONE, LA SOTTRAZIONE… */
function opTitle(op: MappaOp): string {
  return op === "+" ? "L'ADDIZIONE" : op === "-" ? "LA SOTTRAZIONE" : op === "*" ? "LA MOLTIPLICAZIONE" : "LA DIVISIONE";
}

/** Nome senza articolo per i banner: ADDIZIONE, MOLTIPLICAZIONE… */
function opName(op: MappaOp): string {
  return op === "+" ? "ADDIZIONE" : op === "-" ? "SOTTRAZIONE" : op === "*" ? "MOLTIPLICAZIONE" : "DIVISIONE";
}

function opColor(op: MappaOp): string {
  return op === "+" ? "#1F65C1" : op === "-" ? "#A75D2A" : op === "*" ? "#328236" : "#D97706";
}

// ─── Matematica (stesse regole dell'app: gcd/lcm, semplificazione a croce) ──

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a || 1;
}

function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

// ─── Box della mappa ──────────────────────────────────────────────

const C = {
  title: "#5C35A6",      // viola (titolo, risultato)
  passo1: "#1F65C1",     // blu
  passo2: "#328236",     // verde
  passo3: "#A75D2A",     // marrone
  formule: "#0E7490",    // celeste scuro
  controllo: "#16A34A",  // verde controllo
};

function stepBox(title: string, body: string, color: string, blankStyle = false): string {
  const cls = blankStyle ? "step-body step-body--blank" : "step-body";
  return `<div class="box"><div class="step-title" style="background:${color}">${title}</div><div class="${cls}" style="border-color:${color}">${body}</div></div>`;
}

function solidBox(text: string, color: string, extraClass = ""): string {
  return `<div class="solid ${extraClass}" style="background:${color}">${text}</div>`;
}

/** Figura incorporata (data URI) con didascalia */
function figura(src: string | undefined, alt: string, cap: string): string {
  if (!src) return "";
  return `<img class="fig" src="${src}" alt="${alt}"><p class="fig-cap">${cap}</p>`;
}

function formuleAddSub(): string {
  return `<div class="formule">
    <p class="formule-title">RICORDA LE FORMULE</p>
    ${katexBlock(`+ \\; \\text{e} \\; - \\;\\rightarrow\\; \\text{stesso denominatore (m.c.m.)} \\;\\rightarrow\\; \\text{sommo/sottraggo SOLO i numeratori}`)}
    ${katexBlock(`${fracLatex("a", "b")} \\pm ${fracLatex("c", "d")} = ${fracLatex("a \\cdot (\\text{m.c.m.}:b) \\pm c \\cdot (\\text{m.c.m.}:d)", "\\text{m.c.m.}")}`)}
  </div>`;
}

function formuleMul(): string {
  return `<div class="formule">
    <p class="formule-title">RICORDA LE FORMULE</p>
    ${katexBlock(`\\times \\;\\rightarrow\\; \\text{in linea:} \\; ${fracLatex("a", "b")} \\times ${fracLatex("c", "d")} = ${fracLatex("a \\times c", "b \\times d")}`)}
    <p class="note" style="margin:4px 10px 8px">Prima semplifico a croce (se posso), poi moltiplico in linea.</p>
  </div>`;
}

function formuleDiv(): string {
  return `<div class="formule">
    <p class="formule-title">RICORDA LE FORMULE</p>
    ${katexBlock(`\\div \\;\\rightarrow\\; \\text{CAPOVOLGO la seconda e moltiplico:} \\; ${fracLatex("a", "b")} \\div ${fracLatex("c", "d")} = ${fracLatex("a", "b")} \\times ${fracLatex("d", "c")}`)}
    <p class="note" style="margin:4px 10px 8px">Poi vale tutto della moltiplicazione: in linea, semplifico a croce se posso.</p>
  </div>`;
}

// ─── CSS della mappa (documento stampato + misurazione) ───────────
const MAPPA_CSS = `@font-face{font-family:'OpenDyslexic';src:url('fonts/OpenDyslexic-Regular.ttf') format('truetype');font-weight:400;font-style:normal}
@font-face{font-family:'OpenDyslexic';src:url('fonts/OpenDyslexic-Bold.ttf') format('truetype');font-weight:700;font-style:normal}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'OpenDyslexic','Cambria Math',Cambria,serif;color:#1a1a1a;background:#fff;padding:0;max-width:780px;margin:0 auto;text-align:center;line-height:1.55;font-size:13.5px}
.page{position:relative;height:27cm;padding-bottom:1.5cm;page-break-after:always;break-after:page}
.page--last{page-break-after:auto;break-after:auto}
.page-foot{position:absolute;left:0;right:0;bottom:0.15cm;color:#6b7280;font-size:11.5px;letter-spacing:.5px;text-align:center}
@media screen{body{padding:14px 16px}.page{outline:1px dashed #ddd;margin-bottom:14px}}
.solid{color:#fff;font-weight:bold;padding:10px 14px;border-radius:12px;font-size:14.5px;letter-spacing:.4px;margin:0 auto 10px;max-width:720px;line-height:1.5}
.title-box{font-size:15.5px;padding:12px 14px}
.student{max-width:720px;margin:0 auto 10px;padding:7px 10px;border-bottom:1px solid #e5e0d8;color:#2B2421;font-size:13px;text-align:center}
.eq-banner{max-width:720px;margin:0 auto 10px;padding:8px 10px;border:2px dashed #5C35A6;border-radius:12px;background:#faf7ff}
.part-label{max-width:720px;margin:14px auto 8px;color:#6b7280;font-size:11.5px;text-align:left;letter-spacing:1px;font-weight:bold}
.box{max-width:720px;margin:0 auto 10px;page-break-inside:avoid;break-inside:avoid}
.step-title{color:#fff;font-weight:bold;font-size:13.5px;padding:7px 12px;border-radius:12px 12px 0 0;letter-spacing:.4px;text-align:left}
.step-body{border:2.5px solid;border-top:none;border-radius:0 0 12px 12px;padding:8px 12px;background:#fff;text-align:center}
.step-body--blank{background:#fffdf5}
.note{font-size:12.5px;color:#444;margin-top:2px}
.guida{margin:4px auto 2px;max-width:560px;text-align:left;font-size:13px}
.guida p{margin:2px 0}
.fig{display:block;max-width:360px;width:82%;height:auto;margin:8px auto 2px;border-radius:8px}
.fig-cap{font-size:11.5px;color:#6b7280;margin:0 0 4px}
.risultato-blank{max-width:720px;margin:0 auto 10px;border:2.5px dashed #5C35A6;border-radius:12px;height:56px;page-break-inside:avoid;break-inside:avoid}
.formule{max-width:720px;margin:0 auto 10px;border:2.5px solid #0E7490;border-radius:12px;overflow:hidden;page-break-inside:avoid;break-inside:avoid}
.formule-title{background:#0E7490;color:#fff;font-weight:bold;padding:7px 12px;font-size:13.5px;letter-spacing:.4px}
.formule .katex-display{margin:8px 0 4px}
.katex-display{margin:6px 0}
.katex{font-size:1.06em}
@media print{body{zoom:0.95}@page{size:A4;margin:2.5cm 2.5cm 1cm 2.5cm}}`;

// ─── Paginazione esplicita (numeri di pagina per mappa) ───────────

const PAGE_BUDGET = 900;

/** Stima prudenziale dell'altezza di un box dal suo HTML */
function estimateHeight(html: string): number {
  const displays = (html.match(/class="katex-display"/g) || []).length;
  const paras = (html.match(/<p[\s>]/g) || []).length;
  const imgs = (html.match(/<img /g) || []).length;
  return 60 + displays * 60 + paras * 22 + imgs * 210;
}

// ─── Misurazione reale dei box (pagine piene) ─────────────────────

const MEASURE_W = 636.5; // larghezza specificata → 604,7 px visuali (area 16 cm)
const MARGIN_ITEM = 10;
const heightCache = new Map<string, number>();
let measureWrap: HTMLDivElement | null = null;

const MAPPA_CSS_MEASURE = MAPPA_CSS
  .replace(/([{};\s])body\{/g, "$1#mappa-measure-wrap{")
  .replace(/\*\{/g, ":where(#mappa-measure-wrap) *{");

function getMeasureWrap(): HTMLDivElement {
  if (measureWrap) return measureWrap;
  const wrap = document.createElement("div");
  wrap.id = "mappa-measure-wrap";
  wrap.setAttribute("aria-hidden", "true");
  wrap.style.cssText =
    `position:absolute;left:-99999px;top:0;width:${MEASURE_W}px;zoom:0.95;` +
    "padding:0;margin:0;max-width:none;visibility:hidden";
  document.body.appendChild(wrap);
  measureWrap = wrap;
  return wrap;
}

function measureItem(html: string): number {
  const cached = heightCache.get(html);
  if (cached !== undefined) return cached;
  const host = document.createElement("div");
  host.innerHTML = html.trim();
  const el = host.firstElementChild as HTMLElement | null;
  if (!el) {
    heightCache.set(html, 0);
    return 0;
  }
  const wrap = getMeasureWrap();
  wrap.appendChild(el);
  const h = el.getBoundingClientRect().height + MARGIN_ITEM;
  wrap.removeChild(el);
  heightCache.set(html, h);
  return h;
}

async function ensureMeasureFonts(): Promise<void> {
  const f = (document as any).fonts;
  if (!f) return;
  const specs = [
    "13.5px OpenDyslexic",
    "700 13.5px OpenDyslexic",
    "20px KaTeX_Main",
    "italic 20px KaTeX_Math",
  ];
  const jobs = specs.map((s) => f.load(s).catch(() => undefined));
  await Promise.race([
    Promise.allSettled(jobs),
    new Promise((r) => setTimeout(r, 1500)),
  ]);
  try {
    await Promise.race([f.ready, new Promise((r) => setTimeout(r, 800))]);
  } catch {
    /* font non disponibili: si misura con i fallback */
  }
}

function withMeasureStyles<T>(fn: () => T): T {
  const style = document.createElement("style");
  style.textContent = MAPPA_CSS_MEASURE;
  document.head.appendChild(style);
  try {
    return fn();
  } finally {
    style.remove();
  }
}

function paginate(items: string[], hFn: (html: string) => number): string[][] {
  const pages: string[][] = [];
  let cur: string[] = [];
  let curH = 0;
  for (const it of items) {
    const h = hFn(it);
    if (cur.length > 0 && curH + h > PAGE_BUDGET) {
      pages.push(cur);
      cur = [];
      curH = 0;
    }
    cur.push(it);
    curH += h;
  }
  if (cur.length > 0) pages.push(cur);
  while (pages.length >= 2) {
    const lastPg = pages[pages.length - 1];
    const prevPg = pages[pages.length - 2];
    const lastH = lastPg.reduce((s, it) => s + hFn(it), 0);
    if (lastH >= 320 || prevPg.length <= 1) break;
    lastPg.unshift(prevPg.pop() as string);
  }
  return pages;
}

function renderPages(pages: string[][], isLastPart: boolean): string {
  return pages
    .map((items, i) => {
      const isLast = isLastPart && i === pages.length - 1;
      return `<div class="page${isLast ? " page--last" : ""}">${items.join("")}<div class="page-foot">Pagina ${i + 1} di ${pages.length}</div></div>`;
    })
    .join("");
}

// ─── Calcoli sull'operazione REALE dell'utente ────────────────────

interface AddSubVals {
  nd1: number; nd2: number;       // denominatori in valore assoluto
  n1: number; n2: number;         // numeratori effettivi (segno da denominatore negativo)
  m: number;                      // m.c.m.
  t1: number; t2: number;         // numeratori trasformati
  res: number;                    // risultato (numeratore), denominatore = m
}

function computeAddSub(d: MappaFrazioneData): AddSubVals {
  const nd1 = Math.abs(d.den1);
  const nd2 = Math.abs(d.den2);
  const n1 = d.num1 * (d.den1 < 0 ? -1 : 1);
  const n2 = d.num2 * (d.den2 < 0 ? -1 : 1);
  const m = lcm(nd1, nd2);
  const t1 = (m / nd1) * n1;
  const t2 = (m / nd2) * n2;
  return { nd1, nd2, n1, n2, m, t1, t2, res: d.op === "+" ? t1 + t2 : t1 - t2 };
}

interface MulDivVals {
  invert: boolean;
  nd1: number; nd2: number;
  n1: number;                     // numeratore effettivo della prima frazione
  invNum: number; invDen: number; // seconda frazione DOPO l'eventuale inversione
  g1: number; g2: number;         // gcd a croce: (|n1|, invDen) e (nd1, invNum)
  s1n: number; s1d: number;       // prima frazione semplificata a croce
  s2n: number; s2d: number;       // seconda frazione semplificata a croce
  numFin: number; denFin: number; // prodotto (con segno)
  finN: number; finD: number;     // risultato finale semplificato
  croceFatta: boolean;
}

function computeMulDiv(d: MappaFrazioneData): MulDivVals {
  const invert = d.op === "/";
  const nd1 = Math.abs(d.den1);
  const nd2 = Math.abs(d.den2);
  const n1 = d.num1 * (d.den1 < 0 ? -1 : 1);
  const invNum = invert ? nd2 : d.num2;
  const invDen = invert ? Math.abs(d.num2) : nd2;
  const g1 = gcd(Math.abs(n1), invDen);
  const g2 = gcd(nd1, invNum);
  const s1n = Math.abs(n1) / g1;
  const s1d = nd1 / g2;
  const s2n = invNum / g2;
  const s2d = invDen / g1;
  const numFin = n1 * invNum;
  const denFin = nd1 * invDen;
  const gFin = gcd(Math.abs(numFin), denFin);
  return {
    invert, nd1, nd2, n1, invNum, invDen, g1, g2,
    s1n, s1d, s2n, s2d, numFin, denFin,
    finN: numFin / gFin, finD: denFin / gFin,
    croceFatta: g1 > 1 || g2 > 1,
  };
}

/** Elenco HTML dei multipli di n fino a m (m in grassetto).
 *  Nella mappa da completare si fermano a due multipli + puntini. */
function multipliList(n: number, m: number, svolta: boolean): string {
  if (!svolta) return `${n}, ${2 * n}, …`;
  const k = Math.round(m / n);
  if (k <= 6) {
    const arr: string[] = [];
    for (let i = 1; i <= k; i++) arr.push(i * n === m ? `<b>${i * n}</b>` : `${i * n}`);
    return arr.join(", ");
  }
  return `${n}, ${2 * n}, ${3 * n}, …, <b>${m}</b>`;
}

// ─── ADDIZIONE / SOTTRAZIONE (solo questi contenuti, numeri reali) ──

function addSubItems(level: 0 | 1, d: MappaFrazioneData): string[] {
  const v = computeAddSub(d);
  const svolta = level === 0;
  const b = blank();
  const color = opColor(d.op);
  const sommaParola = d.op === "+" ? "SOMMO" : "SOTTRAGGO";
  const items: string[] = [];

  items.push(solidBox(`PERCORSO · ${opName(d.op)}`, color));
  items.push(
    `<div class="eq-banner">L'esercizio di ${opWord(d.op)}:${katexBlock(
      `${fracLatex(d.num1, d.den1)} ${opSymbol(d.op)} ${fracLatex(d.num2, d.den2)} = ${svolta ? fracLatex(v.res, v.m) : b}`
    )}</div>`
  );

  items.push(
    stepBox(
      "REGOLA",
      `<p>Per <b>+</b> e <b>−</b> serve lo <b>STESSO DENOMINATORE</b>: prima rendo le frazioni «simili».</p>`,
      color
    )
  );

  // PASSO 1 · m.c.m.
  const mcmBody = svolta
    ? `${katexBlock(`\\text{m.c.m.}(${v.nd1},\\;${v.nd2}) = ${v.m}`)}
       <div class="guida">
        <p>1. Multipli di ${v.nd1}: ${multipliList(v.nd1, v.m, true)}</p>
        <p>2. Multipli di ${v.nd2}: ${multipliList(v.nd2, v.m, true)}</p>
        <p>3. Il primo numero in comune è <b>${v.m}</b>.</p>
       </div>`
    : `${katexBlock(`\\text{m.c.m.}(${v.nd1},\\;${v.nd2}) = ${b}`)}
       <div class="guida">
        <p>1. Multipli di ${v.nd1}: ${multipliList(v.nd1, v.m, false)}</p>
        <p>2. Multipli di ${v.nd2}: ${multipliList(v.nd2, v.m, false)}</p>
        <p>3. Cerco il primo numero in comune.</p>
       </div>`;
  items.push(stepBox("① PASSO 1 · CALCOLO IL m.c.m. TRA I DENOMINATORI", mcmBody, C.passo1, !svolta));

  // PASSO 2 · trasformazione
  const trBody = svolta
    ? `${katexBlock(`(${v.m} : ${v.nd1}) \\times ${v.n1} = ${v.t1} \\qquad (${v.m} : ${v.nd2}) \\times ${v.n2} = ${v.t2}`)}
       ${katexBlock(`${fracLatex(d.num1, d.den1)} = ${fracLatex(v.t1, v.m)} \\qquad ${fracLatex(d.num2, d.den2)} = ${fracLatex(v.t2, v.m)}`)}
       <p class="note">(m.c.m. : denominatore) × numeratore</p>`
    : `${katexBlock(`(${b} : ${v.nd1}) \\times ${v.n1} = ${b} \\qquad (${b} : ${v.nd2}) \\times ${v.n2} = ${b}`)}
       ${katexBlock(`${fracLatex(d.num1, d.den1)} = ${fracLatex(b, v.m)} \\qquad ${fracLatex(d.num2, d.den2)} = ${fracLatex(b, v.m)}`)}
       <p class="note">(m.c.m. : denominatore) × numeratore</p>`;
  items.push(stepBox("② PASSO 2 · TRASFORMO LE FRAZIONI", trBody, C.passo2, !svolta));

  // PASSO 3 · somma/sottrazione
  items.push(
    stepBox(
      `③ PASSO 3 · ${sommaParola} SOLO I NUMERATORI`,
      svolta
        ? `${katexBlock(`${fracLatex(v.t1, v.m)} ${opSymbol(d.op)} ${fracLatex(v.t2, v.m)} = ${fracLatex(v.res, v.m)}`)}
           <p class="note">Il denominatore resta <b>${v.m}</b>: NON lo ${d.op === "+" ? "sommo" : "cambio"}!</p>`
        : `${katexBlock(`${fracLatex(b, v.m)} ${opSymbol(d.op)} ${fracLatex(b, v.m)} = ${fracLatex(b, v.m)}`)}
           <p class="note">Il denominatore resta lo stesso: NON si somma!</p>`,
      C.passo3,
      !svolta
    )
  );

  items.push(
    stepBox(
      "✓ SCRIVO IL RISULTATO",
      katexBlock(`${fracLatex(d.num1, d.den1)} ${opSymbol(d.op)} ${fracLatex(d.num2, d.den2)} = ${svolta ? fracLatex(v.res, v.m) : b}`),
      C.title,
      !svolta
    )
  );
  items.push(formuleAddSub());
  if (svolta) items.push(solidBox(`✓ HO CONTROLLATO — prima la regola, poi i passi in ordine, alla fine il controllo.`, C.controllo));
  return items;
}

// ─── MOLTIPLICAZIONE / DIVISIONE (con le due figure allegate) ─────

function mulDivItems(level: 0 | 1, d: MappaFrazioneData, figs: MappaFigures): string[] {
  const v = computeMulDiv(d);
  const svolta = level === 0;
  const b = blank();
  const color = opColor(d.op);
  const items: string[] = [];
  const eMoltiplicazione = d.op === "*";

  items.push(solidBox(`PERCORSO · ${opName(d.op)}`, color));
  items.push(
    `<div class="eq-banner">L'esercizio di ${opWord(d.op)}:${katexBlock(
      `${fracLatex(d.num1, d.den1)} ${opSymbol(d.op)} ${fracLatex(d.num2, d.den2)} = ${svolta ? fracLatex(v.finN, v.finD) : b}`
    )}</div>`
  );

  if (eMoltiplicazione) {
    items.push(
      stepBox(
        "REGOLA",
        `<p>Per <b>×</b> moltiplico <b>IN LINEA</b>: numeratore × numeratore, denominatore × denominatore. Non serve lo stesso denominatore!</p>`,
        color
      )
    );
    items.push(
      stepBox(
        "① PASSO 1 · LASCIO COSÌ LE FRAZIONI",
        `<p>Con la moltiplicazione <b>nessuna frazione si capovolge</b> e non serve il m.c.m.</p>`,
        C.passo1
      )
    );
  } else {
    items.push(stepBox("REGOLA", `<p>Per <b>÷</b> <b>CAPOVOLGO</b> la seconda frazione e <b>MOLTIPLICO</b>.</p>`, color));
    const invBody = svolta
      ? `${katexBlock(`${fracLatex(d.num1, d.den1)} \\div ${fracLatex(d.num2, d.den2)} = ${fracLatex(v.n1, v.nd1)} \\times ${fracLatex(v.invNum, v.invDen)}`)}
         <div class="guida">
          <p>■ La <b>prima</b> frazione NON si tocca: resta ${katexInline(fracLatex(v.n1, v.nd1))}.</p>
          <p>■ La <b>seconda</b> si capovolge: ${katexInline(fracLatex(d.num2, d.den2))} diventa ${katexInline(fracLatex(v.invNum, v.invDen))}.</p>
          <p>■ Il segno <b>÷</b> diventa <b>×</b>.</p>
         </div>`
      : `${katexBlock(`${fracLatex(d.num1, d.den1)} \\div ${fracLatex(d.num2, d.den2)} = ${fracLatex(v.n1, v.nd1)} \\times ${fracLatex(b, b)}`)}
         <div class="guida">
          <p>■ La <b>prima</b> frazione NON si tocca.</p>
          <p>■ La <b>seconda</b> si capovolge; il segno <b>÷</b> diventa <b>×</b>.</p>
         </div>`;
    items.push(stepBox("① PASSO 1 · CAPOVOLGO LA SECONDA FRAZIONE", invBody, C.passo1, !svolta));
  }

  // PASSO 2 · semplificazione a croce (+ figura «a croce»)
  const diag1a = Math.abs(v.n1), diag1b = v.invDen, diag2a = v.nd1, diag2b = v.invNum;
  const diag1 = svolta
    ? (v.g1 > 1
        ? `divisore comune <b>${v.g1}</b>: ${diag1a} : ${v.g1} = <b>${v.s1n}</b> e ${diag1b} : ${v.g1} = <b>${v.s2d}</b>`
        : "nessun divisore comune")
    : `divisore comune? ${b}`;
  const diag2 = svolta
    ? (v.g2 > 1
        ? `divisore comune <b>${v.g2}</b>: ${diag2a} : ${v.g2} = <b>${v.s1d}</b> e ${diag2b} : ${v.g2} = <b>${v.s2n}</b>`
        : "nessun divisore comune")
    : `divisore comune? ${b}`;
  const croceConclusion = svolta
    ? (v.croceFatta ? "Ho semplificato in croce PRIMA di moltiplicare." : "In questo esercizio non c'è niente da semplificare: procedo così.")
    : "Se c'è, semplifico PRIMA di moltiplicare.";
  items.push(
    stepBox(
      eMoltiplicazione ? "② PASSO 2 · SEMPLIFICAZIONE A CROCE (se posso)" : "② PASSO 2 · COME LA MOLTIPLICAZIONE (semplifico a croce se posso)",
      `<div class="guida">
        <p>■ Diagonale 1: <b>${diag1a}</b> e <b>${diag1b}</b> → ${diag1}</p>
        <p>■ Diagonale 2: <b>${diag2a}</b> e <b>${diag2b}</b> → ${diag2}</p>
        <p>→ ${croceConclusion}</p>
       </div>
       ${figura(figs.croce, "Schema della semplificazione a croce: frecce incrociate tra numeratori e denominatori delle due frazioni", "La semplificazione a croce (frecce in diagonale)")}`,
      C.passo2,
      !svolta
    )
  );

  // PASSO 3 · moltiplicazione in linea (+ figura «in linea»)
  const mN1 = v.g1 > 1 ? v.s1n : Math.abs(v.n1);
  const mD2 = v.g1 > 1 ? v.s2d : v.invDen;
  const mD1 = v.g2 > 1 ? v.s1d : v.nd1;
  const mN2 = v.g2 > 1 ? v.s2n : v.invNum;
  const finaleDisplay = v.finN !== v.numFin || v.finD !== v.denFin ? ` = ${fracLatex(v.finN, v.finD)}` : "";
  const linBody = svolta
    ? `${katexBlock(`${fracLatex(mN1, mD1)} \\times ${fracLatex(mN2, mD2)} = ${fracLatex(`${mN1} \\times ${mN2}`, `${mD1} \\times ${mD2}`)} = ${fracLatex(v.numFin, v.denFin)}${finaleDisplay}`)}
       <p class="note">Numeratore × numeratore, denominatore × denominatore.</p>
       ${figura(figs.inline, "Schema della moltiplicazione in linea: frecce orizzontali che attraversano i numeratori e i denominatori", "La moltiplicazione in linea (frecce orizzontali)")}`
    : `${katexBlock(`${fracLatex(d.num1, d.den1)} \\times ${fracLatex(b, b)} = ${fracLatex(`${b} \\times ${b}`, `${b} \\times ${b}`)} = ${fracLatex(b, b)}`)}
       ${figura(figs.inline, "Schema della moltiplicazione in linea: frecce orizzontali che attraversano i numeratori e i denominatori", "La moltiplicazione in linea (frecce orizzontali)")}`;
  items.push(
    stepBox(eMoltiplicazione ? "③ PASSO 3 · MOLTIPLICO IN LINEA" : "③ PASSO 3 · MOLTIPLICO", linBody, C.passo3, !svolta)
  );

  items.push(
    stepBox(
      "✓ SCRIVO IL RISULTATO",
      katexBlock(`${fracLatex(d.num1, d.den1)} ${opSymbol(d.op)} ${fracLatex(d.num2, d.den2)} = ${svolta ? fracLatex(v.finN, v.finD) : b}`),
      C.title,
      !svolta
    )
  );
  items.push(eMoltiplicazione ? formuleMul() : formuleDiv());
  if (svolta) items.push(solidBox(`✓ HO CONTROLLATO — prima la regola, poi i passi in ordine, alla fine il controllo.`, C.controllo));
  return items;
}

// ─── Le DUE mappe del PDF ─────────────────────────────────────────

type Parte = { label: string; items: string[] };

function buildParti(d: MappaFrazioneData, figs: MappaFigures): Parte[] {
  const builder = d.mode === "addsub" ? addSubItems : mulDivItems;

  // MAPPA SVOLTA — l'esercizio dell'utente risolto con i suoi numeri
  const a: string[] = [];
  if (d.studentLabel) a.push(`<div class="student">Studente: <b>${d.studentLabel}</b></div>`);
  a.push(solidBox(`MAPPA · ${opTitle(d.op)} TRA FRAZIONI`, C.title, "title-box"));
  a.push(...builder(0, d, figs));

  // MAPPA CONCETTUALE — la stessa mappa da completare (ex livello 1)
  const c: string[] = [];
  c.push(solidBox(`MAPPA CONCETTUALE`, C.title, "title-box"));
  c.push(`<div class="eq-banner">Completa i puntini con i valori del tuo esercizio di ${opWord(d.op)}.</div>`);
  c.push(...builder(1, d, figs));
  c.push(`<div class="risultato-blank"></div>`);

  return [
    { label: "MAPPA SVOLTA · TUTTI I PASSI RISOLTI", items: a },
    { label: "MAPPA CONCETTUALE · DA COMPLETARE", items: c },
  ];
}

// ─── Documento completo ───────────────────────────────────────────

export function buildMappaFrazioniHtml(
  d: MappaFrazioneData,
  figs: MappaFigures = {},
  mode?: "estimate" | "measure"
): string {
  const parti = buildParti(d, figs);

  const hFn =
    mode === "measure" && typeof document !== "undefined"
      ? (html: string): number => {
          try {
            const m = measureItem(html);
            if (m > 0) return m;
          } catch {
            /* misura non disponibile: resta la stima */
          }
          return estimateHeight(html) * 0.95;
        }
      : (html: string): number => estimateHeight(html) * 0.95;

  // L'etichetta di mappa è il PRIMO box della parte (così apre una pagina nuova)
  const rendered = parti
    .map((p, idx) => {
      const items = [`<div class="part-label">${p.label}</div>`, ...p.items];
      const pages = paginate(items, hFn);
      return renderPages(pages, idx === parti.length - 1);
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8"><base href="${typeof window !== "undefined" ? window.location.origin : ""}/">
<title>Mappa Concettuale — ${opWord(d.op)} tra frazioni</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<style>
${MAPPA_CSS}
</style></head>
<body>
${rendered}
<script>window.onload=function(){window.print()}</script>
</body></html>`;
}

/** Converte una immagine dell'app in data URI base64 (per il PDF autocontenuto) */
async function fileToDataUri(url: string): Promise<string | undefined> {
  try {
    const r = await fetch(url);
    if (!r.ok) return undefined;
    const blob = await r.blob();
    return await new Promise<string | undefined>((res) => {
      const fr = new FileReader();
      fr.onload = () => res(typeof fr.result === "string" ? fr.result : undefined);
      fr.onerror = () => res(undefined);
      fr.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

/** Apre la finestra di stampa con la mappa costruita sull'esercizio reale.
 * La finestra vuota viene aperta SUBITO nel gesto utente (niente popup-blocker);
 * poi le figure vengono caricate come data URI, i box MISURATI nel DOM e il
 * documento scritto con le pagine PIENE. Se la misura fallisce si ricade sulla
 * stima prudenziale; se una figura non carica, la mappa resta valida senza. */
export async function openMappaFrazioniPdf(d: MappaFrazioneData): Promise<void> {
  let w: Window | null = null;
  try {
    w = window.open("", "_blank");
  } catch {
    w = null;
  }
  const write = (html: string) => {
    let target = w && !w.closed ? w : null;
    if (!target) {
      try {
        target = window.open("", "_blank");
      } catch {
        target = null;
      }
    }
    if (target) {
      target.document.write(html);
      target.document.close();
    }
  };
  const go = async () => {
    const [inline, croce] = await Promise.all([
      fileToDataUri(FIG_INLINE_URL),
      fileToDataUri(FIG_CROCE_URL),
    ]);
    const figs: MappaFigures = { inline, croce };
    let html: string;
    try {
      await ensureMeasureFonts();
      html = withMeasureStyles(() => buildMappaFrazioniHtml(d, figs, "measure"));
    } catch {
      html = buildMappaFrazioniHtml(d, figs);
    }
    write(html);
  };
  void go();
}
