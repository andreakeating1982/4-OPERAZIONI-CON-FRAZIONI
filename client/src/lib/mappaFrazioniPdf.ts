/**
 * MAPPA CONCETTUALE — PDF dinamico per l'app «Operazioni con le Frazioni».
 *
 * Replica la mappa allegata di riferimento («Le regole per le operazioni con
 * le frazioni», 12 pagine) con QUATTRO parti, numerazione pagine che riparte
 * da 1 per ogni parte:
 *
 *  - PARTE A — MAPPA SVOLTA: i tre percorsi (addizione/sottrazione,
 *    moltiplicazione, divisione) completamente risolti sugli esempi
 *    3/4 + 1/6, 2/3 × 4/5, 3/4 ÷ 2/5.
 *  - MAPPA LIVELLO 1 · SUPPORTO MASSIMO — da completare: stessa struttura,
 *    valori puntinati, guide testuali visibili.
 *  - MAPPA LIVELLO 2 · SUPPORTO MEDIO — titoli e regole visibili, passaggi
 *    intermedi ridotti al minimo.
 *  - MAPPA LIVELLO 3 · SUPPORTO MINIMO — solo i banner dei percorsi, gli
 *    esercizi e i riquadri vuoti da compilare in autonomia.
 *
 * Architettura (portata dall'app Equazioni Biquadratiche, mappaPdf.ts):
 * impaginazione a MISURAZIONE REALE NEL DOM (PAGE_BUDGET ≈ 900 px visuali),
 * margini 2,5 cm su A4, piè di pagina «Pagina N di M» dentro la pagina,
 * font OpenDyslexic, KaTeX per le frazioni. NON scrivere box «a occhio»:
 * ogni box passa da stepBox/solidBox per essere paginato correttamente.
 */
import katex from "katex";

// ─── Formattazione ────────────────────────────────────────────────

/** Frazione colorata come nell'allegato: numeratore BLU, denominatore VERDE */
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

// ─── Box della mappa ──────────────────────────────────────────────

const C = {
  title: "#5C35A6",      // viola (titolo, risultato)
  percorso1: "#1F65C1",  // blu (addizione/sottrazione)
  percorso2: "#328236",  // verde (moltiplicazione)
  percorso3: "#D97706",  // arancio (divisione)
  passo1: "#1F65C1",
  passo2: "#328236",
  passo3: "#A75D2A",     // marrone
  ricorda: "#1E3A8A",    // blu notte
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

/** Box «RICORDA LE FORMULE» (condiviso da tutte le parti) */
function formuleBox(): string {
  return `<div class="formule">
    <p class="formule-title">RICORDA LE FORMULE</p>
    ${katexBlock(`+ \\; \\text{e} \\; - \\;\\rightarrow\\; \\text{stesso denominatore (m.c.m.)} \\;\\rightarrow\\; \\text{sommo/sottraggo SOLO i numeratori}`)}
    ${katexBlock(`\\times \\;\\rightarrow\\; \\text{in linea:} \\; ${fracLatex("a", "b")} \\times ${fracLatex("c", "d")} = ${fracLatex("a \\times c", "b \\times d")} \\;\\; (\\text{semplifico a croce se posso})`)}
    ${katexBlock(`\\div \\;\\rightarrow\\; \\text{CAPOVOLGO la seconda e moltiplico:} \\; ${fracLatex("a", "b")} \\div ${fracLatex("c", "d")} = ${fracLatex("a", "b")} \\times ${fracLatex("d", "c")}`)}
  </div>`;
}

// ─── CSS della mappa (condiviso tra documento stampato e misurazione) ──
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
.risultato-blank{max-width:720px;margin:0 auto 10px;border:2.5px dashed #5C35A6;border-radius:12px;height:56px;page-break-inside:avoid;break-inside:avoid}
.formule{max-width:720px;margin:0 auto 10px;border:2.5px solid #0E7490;border-radius:12px;overflow:hidden;page-break-inside:avoid;break-inside:avoid}
.formule-title{background:#0E7490;color:#fff;font-weight:bold;padding:7px 12px;font-size:13.5px;letter-spacing:.4px}
.formule .katex-display{margin:8px 0 4px}
.katex-display{margin:6px 0}
.katex{font-size:1.06em}
@media print{body{zoom:0.95}@page{size:A4;margin:2.5cm 2.5cm 1cm 2.5cm}}`;

// ─── Paginazione esplicita (numeri di pagina per parte) ───────────

const PAGE_BUDGET = 900;

/** Stima prudenziale dell'altezza di un box dal suo HTML */
function estimateHeight(html: string): number {
  const displays = (html.match(/class="katex-display"/g) || []).length;
  const paras = (html.match(/<p[\s>]/g) || []).length;
  return 60 + displays * 60 + paras * 22;
}

// ─── Misurazione reale dei box (pagine piene) ─────────────────────

const MEASURE_W = 636.5; // larghezza specificata → 604,7 px visuali (area 16 cm)
const MARGIN_ITEM = 10;  // margin-bottom di ogni box (margin:0 auto 10px)
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

// ─── Contenuto dei tre percorsi (level 0 = svolta, 1..3 = da completare) ──

/**
 * @param level 0 = mappa svolta (numeri veri); 1 = supporto massimo (tutti i
 *              passi, valori puntinati); 2 = supporto medio (solo passi e
 *              risultati, niente guide intermedie); 3 = supporto minimo
 *              (solo esercizi e riquadri vuoti).
 */
function percorso1Items(level: 0 | 1 | 2 | 3): string[] {
  const items: string[] = [];
  const b = blank();
  const svolta = level === 0;
  items.push(solidBox(`PERCORSO 1 · ADDIZIONE E SOTTRAZIONE`, C.percorso1));
  items.push(`<div class="eq-banner">L'esercizio guida:${katexBlock(`${fracLatex(3, 4)} + ${fracLatex(1, 6)} = \\;${svolta ? fracLatex(11, 12) : b}`)}</div>`);
  if (level >= 3) return items;

  items.push(stepBox(
    "REGOLA",
    `<p>Per <b>+</b> e <b>−</b> serve lo <b>STESSO DENOMINATORE</b>: prima rendo le frazioni «simili».</p>`,
    C.passo1
  ));

  // PASSO 1 · m.c.m.
  const mcmBody = svolta
    ? `${katexBlock(`\\text{m.c.m.}(4,\\;6) = 12`)}
       <div class="guida">
        <p>1. Multipli di 4: 4, 8, <b>12</b>, 16, …</p>
        <p>2. Multipli di 6: 6, <b>12</b>, 18, …</p>
        <p>3. Il primo numero in comune è <b>12</b>.</p>
       </div>`
    : level === 1
      ? `${katexBlock(`\\text{m.c.m.}(4,\\;6) = ${b}`)}
         <div class="guida">
          <p>1. Multipli di 4: 4, 8, …</p>
          <p>2. Multipli di 6: 6, …</p>
          <p>3. Cerco il primo numero in comune.</p>
         </div>`
      : katexBlock(`\\text{m.c.m.}(4,\\;6) = ${b}`);
  items.push(stepBox("① PASSO 1 · CALCOLO IL m.c.m. TRA I DENOMINATORI", mcmBody, C.passo1, !svolta));

  // PASSO 2 · trasformazione
  if (level <= 1) {
    const trBody = svolta
      ? `${katexBlock(`(12 : 4) \\times 3 = 9 \\qquad (12 : 6) \\times 1 = 2`)}
         ${katexBlock(`${fracLatex(3, 4)} = ${fracLatex(9, 12)} \\qquad ${fracLatex(1, 6)} = ${fracLatex(2, 12)}`)}
         <p class="note">(m.c.m. : denominatore) × numeratore</p>`
      : `${katexBlock(`(\\dots : \\dots) \\times \\dots = ${b} \\qquad (\\dots : \\dots) \\times \\dots = ${b}`)}
         ${katexBlock(`${fracLatex(3, 4)} = ${fracLatex(b, 12)} \\qquad ${fracLatex(1, 6)} = ${fracLatex(b, 12)}`)}
         <p class="note">(m.c.m. : denominatore) × numeratore</p>`;
    items.push(stepBox("② PASSO 2 · TRASFORMO LE FRAZIONI", trBody, C.passo2, !svolta));
  } else {
    items.push(stepBox(
      "② PASSO 2 · TRASFORMO LE FRAZIONI",
      katexBlock(`${fracLatex(3, 4)} = ${fracLatex(b, b)} \\qquad ${fracLatex(1, 6)} = ${fracLatex(b, b)}`),
      C.passo2,
      true
    ));
  }

  // PASSO 3 · somma
  items.push(stepBox(
    "③ PASSO 3 · SOMMO (O SOTTRAGGO) SOLO I NUMERATORI",
    svolta
      ? `${katexBlock(`${fracLatex(9, 12)} + ${fracLatex(2, 12)} = ${fracLatex(9 + 2, 12)} = ${fracLatex(11, 12)}`)}
         <p class="note">Il denominatore resta <b>12</b>: NON lo sommo!</p>`
      : `${katexBlock(`${fracLatex(b, 12)} + ${fracLatex(b, 12)} = ${fracLatex(b, 12)}`)}
         <p class="note">Il denominatore resta lo stesso: NON lo sommo!</p>`,
    C.passo3,
    !svolta
  ));

  return items;
}

function percorso2Items(level: 0 | 1 | 2 | 3): string[] {
  const items: string[] = [];
  const b = blank();
  const svolta = level === 0;
  items.push(solidBox(`PERCORSO 2 · MOLTIPLICAZIONE`, C.percorso2));
  items.push(`<div class="eq-banner">L'esercizio guida:${katexBlock(`${fracLatex(2, 3)} \\times ${fracLatex(4, 5)} = \\;${svolta ? fracLatex(8, 15) : b}`)}</div>`);
  if (level >= 3) return items;

  items.push(stepBox(
    "REGOLA",
    `<p>Per <b>×</b> moltiplico <b>IN LINEA</b>: numeratore × numeratore, denominatore × denominatore. Non serve lo stesso denominatore!</p>`,
    C.percorso2
  ));

  items.push(stepBox(
    "① PASSO 1 · LASCIO COSÌ LE FRAZIONI",
    `<p>Con la moltiplicazione <b>nessuna frazione si capovolge</b> e non serve il m.c.m.</p>`,
    C.percorso2
  ));

  // PASSO 2 · semplificazione a croce (solo livello 0-1)
  if (level <= 1) {
    const croceBody = svolta
      ? `<div class="guida">
          <p>■ Controllo in diagonale: <b>2</b> e <b>5</b> → nessun divisore comune.</p>
          <p>■ Controllo nell'altra diagonale: <b>4</b> e <b>3</b> → nessun divisore comune.</p>
          <p>→ In questo esercizio <b>non c'è niente da semplificare</b>: procedo così.</p>
         </div>`
      : `<div class="guida">
          <p>■ Controllo in diagonale: <b>2</b> e <b>5</b> → divisore comune? ${b}</p>
          <p>■ Controllo nell'altra diagonale: <b>4</b> e <b>3</b> → divisore comune? ${b}</p>
          <p>→ Se c'è, semplifico prima di moltiplicare.</p>
         </div>`;
    items.push(stepBox("② PASSO 2 · SEMPLIFICAZIONE A CROCE (se posso)", croceBody, C.passo2, !svolta));
  }

  // PASSO 3 · prodotto
  items.push(stepBox(
    "③ PASSO 3 · MOLTIPLICO IN LINEA",
    svolta
      ? `${katexBlock(`${fracLatex(2, 3)} \\times ${fracLatex(4, 5)} = ${fracLatex("2 \\times 4", "3 \\times 5")} = ${fracLatex(8, 15)}`)}`
      : katexBlock(`${fracLatex(2, 3)} \\times ${fracLatex(4, 5)} = ${fracLatex(`${b} \\times ${b}`, `${b} \\times ${b}`)} = ${fracLatex(b, b)}`),
    C.passo3,
    !svolta
  ));

  return items;
}

function percorso3Items(level: 0 | 1 | 2 | 3): string[] {
  const items: string[] = [];
  const b = blank();
  const svolta = level === 0;
  items.push(solidBox(`PERCORSO 3 · DIVISIONE`, C.percorso3));
  items.push(`<div class="eq-banner">L'esercizio guida:${katexBlock(`${fracLatex(3, 4)} \\div ${fracLatex(2, 5)} = \\;${svolta ? fracLatex(15, 8) : b}`)}</div>`);
  if (level >= 3) return items;

  items.push(stepBox(
    "REGOLA",
    `<p>Per <b>÷</b> <b>CAPOVOLGO</b> la seconda frazione e <b>MOLTIPLICO</b>.</p>`,
    C.percorso3
  ));

  // PASSO 1 · inversione
  items.push(stepBox(
    "① PASSO 1 · CAPOVOLGO LA SECONDA FRAZIONE",
    svolta
      ? `${katexBlock(`${fracLatex(3, 4)} \\div ${fracLatex(2, 5)} = ${fracLatex(3, 4)} \\times ${fracLatex(5, 2)}`)}
         <div class="guida">
          <p>■ La <b>prima</b> frazione NON si tocca: resta ${katexInline(fracLatex(3, 4))}.</p>
          <p>■ La <b>seconda</b> si capovolge: ${katexInline(fracLatex(2, 5))} diventa ${katexInline(fracLatex(5, 2))}.</p>
          <p>■ Il segno <b>÷</b> diventa <b>×</b>.</p>
         </div>`
      : katexBlock(`${fracLatex(3, 4)} \\div ${fracLatex(2, 5)} = ${fracLatex(3, 4)} \\times ${fracLatex(b, b)}`),
    C.percorso3,
    !svolta
  ));

  // PASSO 2 · come la moltiplicazione
  if (level <= 1) {
    const croceBody = svolta
      ? `<div class="guida">
          <p>■ Diagonale 1: <b>3</b> e <b>2</b> → nessun divisore comune.</p>
          <p>■ Diagonale 2: <b>4</b> e <b>5</b> → nessun divisore comune.</p>
          <p>→ Niente da semplificare: moltiplico in linea.</p>
         </div>`
      : `<div class="guida">
          <p>■ Diagonale 1: <b>3</b> e <b>2</b> → divisore comune? ${b}</p>
          <p>■ Diagonale 2: <b>4</b> e <b>5</b> → divisore comune? ${b}</p>
         </div>`;
    items.push(stepBox("② PASSO 2 · COME LA MOLTIPLICAZIONE (semplifico a croce se posso)", croceBody, C.passo2, !svolta));
  }

  // PASSO 3 · prodotto finale
  items.push(stepBox(
    "③ PASSO 3 · MOLTIPLICO",
    svolta
      ? katexBlock(`${fracLatex(3, 4)} \\times ${fracLatex(5, 2)} = ${fracLatex("3 \\times 5", "4 \\times 2")} = ${fracLatex(15, 8)}`)
      : katexBlock(`${fracLatex(3, 4)} \\times ${fracLatex(5, 2)} = ${fracLatex(`${b} \\times ${b}`, `${b} \\times ${b}`)} = ${fracLatex(b, b)}`),
    C.passo3,
    !svolta
  ));

  return items;
}

// ─── Le quattro parti ─────────────────────────────────────────────

type Parte = { label: string; items: string[] };

function buildParti(studentLabel: string): Parte[] {
  // ── PARTE A — mappa svolta ──
  const a: string[] = [];
  if (studentLabel) {
    a.push(`<div class="student">Studente: <b>${studentLabel}</b></div>`);
  }
  a.push(solidBox(`MAPPA · LE REGOLE PER LE OPERAZIONI CON LE FRAZIONI`, C.title, "title-box"));
  a.push(...percorso1Items(0));
  a.push(...percorso2Items(0));
  a.push(...percorso3Items(0));
  a.push(stepBox(
    "✓ SCRIVO I RISULTATI",
    katexBlock(`${fracLatex(3, 4)} + ${fracLatex(1, 6)} = ${fracLatex(11, 12)} \\qquad ${fracLatex(2, 3)} \\times ${fracLatex(4, 5)} = ${fracLatex(8, 15)} \\qquad ${fracLatex(3, 4)} \\div ${fracLatex(2, 5)} = ${fracLatex(15, 8)}`),
    C.title
  ));
  a.push(formuleBox());
  a.push(solidBox(`✓ HO CONTROLLATO — prima la regola, poi i passi in ordine, alla fine il controllo.`, C.controllo));

  // ── LIVELLI 1-3 — mappe da completare ──
  const livelli: { n: 1 | 2 | 3; nome: string }[] = [
    { n: 1, nome: "SUPPORTO MASSIMO — tutti i passi guidati, i valori sono puntinati" },
    { n: 2, nome: "SUPPORTO MEDIO — solo i passi principali, sviluppa tu i calcoli" },
    { n: 3, nome: "SUPPORTO MINIMO — completa tutto in autonomia" },
  ];
  const parti: Parte[] = [{ label: "PARTE A · MAPPA SVOLTA", items: a }];

  for (const { n, nome } of livelli) {
    const items: string[] = [];
    items.push(solidBox(`MAPPA DA COMPLETARE · LIVELLO ${n}`, C.title, "title-box"));
    items.push(`<div class="eq-banner">${nome}</div>`);
    items.push(...percorso1Items(n));
    items.push(...percorso2Items(n));
    items.push(...percorso3Items(n));
    items.push(stepBox(
      "✓ SCRIVO I RISULTATI",
      katexBlock(
        `${fracLatex(3, 4)} + ${fracLatex(1, 6)} = ${blank()} \\qquad ${fracLatex(2, 3)} \u00d7 ${fracLatex(4, 5)} = ${blank()} \\qquad ${fracLatex(3, 4)} \u00f7 ${fracLatex(2, 5)} = ${blank()}`
      ),
      C.title,
      true
    ));
    if (n === 1) items.push(formuleBox());
    items.push(`<div class="risultato-blank"></div>`);
    parti.push({ label: `MAPPA LIVELLO ${n} · ${nome.split("—")[0].trim()}`, items });
  }
  return parti;
}

// ─── Documento completo ───────────────────────────────────────────

export function buildMappaFrazioniHtml(
  studentLabel = "",
  mode?: "estimate" | "measure"
): string {
  const parti = buildParti(studentLabel);

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

  // L'etichetta di parte è il PRIMO box della parte (come in mappaPdf.ts):
  // così inizia sempre una nuova pagina insieme al suo contenuto.
  const rendered = parti
    .map((p, idx) => {
      const items = [`<div class="part-label">${p.label}</div>`, ...p.items];
      const pages = paginate(items, hFn);
      return renderPages(pages, idx === parti.length - 1);
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8"><base href="${typeof window !== "undefined" ? window.location.origin : ""}/">
<title>Mappa Concettuale — Le regole per le operazioni con le frazioni</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<style>
${MAPPA_CSS}
</style></head>
<body>
${rendered}
<script>window.onload=function(){window.print()}</script>
</body></html>`;
}

/** Apre la finestra di stampa con la mappa (stesso flusso del quaderno PDF).
 * La finestra vuota viene aperta SUBITO nel gesto utente (niente popup-blocker);
 * poi i box vengono MISURATI realmente nel DOM e il documento viene scritto
 * con le pagine PIENE. Se la misura fallisce si ricade sulla stima prudenziale. */
export function openMappaFrazioniPdf(studentLabel = ""): void {
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
    let html: string;
    try {
      await ensureMeasureFonts();
      html = withMeasureStyles(() => buildMappaFrazioniHtml(studentLabel, "measure"));
    } catch {
      html = buildMappaFrazioniHtml(studentLabel);
    }
    write(html);
  };
  void go();
}
