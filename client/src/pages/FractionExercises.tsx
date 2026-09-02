import React, { useState, useCallback, useEffect, useMemo, useRef } from"react";
import { NumberInputCanvas } from"@/components/NumberInputCanvas";
import { FractionDisplay } from"@/components/FractionDisplay";
import { cn } from"@/lib/utils";

/** Estrae i parametri studente dalla URL (supporta path e hash routing) */
function getStudentSearchParams(): URLSearchParams | null {
  if (window.location.search) {
    return new URLSearchParams(window.location.search);
  }
  const hash = window.location.hash;
  const qIdx = hash.indexOf('?');
  if (qIdx !== -1) {
    return new URLSearchParams(hash.slice(qIdx + 1));
  }
  return null;
}

// ─── Math utilities ───────────────────────────────────────────────
function gcd(a: number, b: number): number {
 const _a = Math.abs(a), _b = Math.abs(b);
 if (_b === 0) return _a;
 return gcd(_b, _a % _b);
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

function lcm(a: number, b: number): number {
 if (a === 0 || b === 0) return 0;
 const result = Math.abs(a * b) / gcd(Math.abs(a), Math.abs(b));
 return round2(result);
}

function semplificaFrazione(num: number, den: number): { num: number; den: number } {
 if (den === 0) return { num, den: 0 };
 if (num === 0) return { num: 0, den: 1 };
 const c = gcd(Math.abs(num), Math.abs(den));
 let sn = round2(num / c);
 let sd = round2(den / c);
 if (sd < 0) { sn = -sn; sd = -sd; }
 return { num: sn, den: sd };
}

function fattorizzazionePrimi(n: number): Record<number, number> {
 if (n === 1) return { 1: 1 };
 const fattori: Record<number, number> = {};
 let d = 2;
 let temp = n;
 while (d * d <= temp) {
  while (temp % d === 0) {
   fattori[d] = (fattori[d] || 0) + 1;
   temp /= d;
  }
  d++;
 }
 if (temp > 1) fattori[temp] = (fattori[temp] || 0) + 1;
 return fattori;
}

// Converte un numero in apice Unicode (es. 2 → ², 12 → ¹²)
function toSuperscript(n: number): string {
 const superscriptMap: Record<string, string> = {
 "0":"\u2070","1":"\u00B9","2":"\u00B2","3":"\u00B3",
 "4":"\u2074","5":"\u2075","6":"\u2076","7":"\u2077",
 "8":"\u2078","9":"\u2079",
 };
 return String(n).split("").map(c => superscriptMap[c] || c).join("");
}

function formatFattori(num: number, fattori: Record<number, number>): string {
 if (num === 1 && fattori[1] === 1) {
  return"Scomposizione in fattori primi di 1 = 1";
 }
 const parts: string[] = [];
 for (const [f, exp] of Object.entries(fattori)) {
  parts.push(exp === 1 ? f : `${f}${toSuperscript(exp)}`);
 }
 return `Scomposizione in fattori primi di ${num} = ${parts.join("·")}`;
}

function trovaDivisoriComuni(a: number, b: number): number | null {
 const primi = [2, 3, 5, 7, 11];
 for (const p of primi) {
  if (a % p === 0 && b % p === 0) return p;
 }
 return null;
}

// ─── Main component ────────────────────────────────────────────────

type OperationMode ="addsub"|"muldiv";

export default function FractionExercises() {
 // ─── Auto-resize postMessage for embed ─────────────────────────────
 const containerRef = useRef<HTMLDivElement>(null);
 useEffect(() => {
  const sendHeight = () => {
   const height = document.body.scrollHeight;
   if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'labvisivo:height', height }, '*');
   }
  };
  sendHeight();
  const observer = new ResizeObserver(() => sendHeight());
  observer.observe(document.body);
  // Also observe mutations for dynamic content changes
  const mutationObserver = new MutationObserver(() => sendHeight());
  mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
  return () => {
   observer.disconnect();
   mutationObserver.disconnect();
  };
 }, []);

 // ─── PDF generation ────────────────────────────────────────────────
 const [generatingPdf, setGeneratingPdf] = useState(false);

 // ─── Student info from URL ─────────────────────────────────────────
 const studentInfo = useMemo(() => {
  const params = getStudentSearchParams();
  if (!params) return null;
  const cognome = params.get('cognome')?.trim() || '';
  const nome = params.get('nome')?.trim() || '';
  const data = params.get('data')?.trim() || '';
  const classe = params.get('classe')?.trim() || '';
  if (!cognome && !nome && !data && !classe) return null;
  return { cognome, nome, data, classe };
 }, []);

 const studentLabel = useMemo(() => {
  if (!studentInfo) return '';
  const parts: string[] = [];
  const nomeCompleto = [studentInfo.cognome, studentInfo.nome].filter(Boolean).join(' ');
  if (nomeCompleto) parts.push(nomeCompleto);
  if (studentInfo.classe) parts.push(`CLASSE ${studentInfo.classe}`);
  if (studentInfo.data) parts.push(studentInfo.data);
  return parts.join(' — ');
 }, [studentInfo]);

 // ─── Mode ──────────────────────────────────────────────────────────
 const [mode, setMode] = useState<OperationMode>("addsub");
 const [addSubOp, setAddSubOp] = useState<"+"|"-">("+");
 const [mulDivOp, setMulDivOp] = useState<"*"|"/">("*");

 // ─── Fraction inputs (handwriting) ─────────────────────────────────
 const [num1, setNum1] = useState<number | null>(null);
 const [den1, setDen1] = useState<number | null>(null);
 const [num2, setNum2] = useState<number | null>(null);
 const [den2, setDen2] = useState<number | null>(null);
 const [showThirdFraction, setShowThirdFraction] = useState(false);
 const [num3, setNum3] = useState<number | null>(null);
 const [den3, setDen3] = useState<number | null>(null);
 const [showFourthFraction, setShowFourthFraction] = useState(false);
 const [num4, setNum4] = useState<number | null>(null);
 const [den4, setDen4] = useState<number | null>(null);

 // ─── Phase tracking ────────────────────────────────────────────────
 const [phase, setPhase] = useState<"input"|"exercise">("input");
 const [submitted, setSubmitted] = useState(false);

 // ─── Exercise state (common) ───────────────────────────────────────
 // Add/Sub exercise fields
 const [mcmUtente, setMcmUtente] = useState<number | null>(null);
 const [risultato1Utente, setRisultato1Utente] = useState<number | null>(null);
 const [risultato2Utente, setRisultato2Utente] = useState<number | null>(null);
 const [risultato3Utente, setRisultato3Utente] = useState<number | null>(null);
 const [risultato4Utente, setRisultato4Utente] = useState<number | null>(null);
 const [risultatoFinaleUtente, setRisultatoFinaleUtente] = useState<string>("");
 const [feedbackFinale, setFeedbackFinale] = useState<{ testo: string; corretto: boolean } | null>(null);

 // Mul/Div exercise fields
 const [num1Semplificato, setNum1Semplificato] = useState<number | null>(null);
 const [den2Semplificato, setDen2Semplificato] = useState<number | null>(null);
 const [den1Semplificato, setDen1Semplificato] = useState<number | null>(null);
 const [num2Semplificato, setNum2Semplificato] = useState<number | null>(null);
 const [num3Semplificato, setNum3Semplificato] = useState<number | null>(null);
 const [den4Semplificato, setDen4Semplificato] = useState<number | null>(null);
 const [den3Semplificato, setDen3Semplificato] = useState<number | null>(null);
 const [num4Semplificato, setNum4Semplificato] = useState<number | null>(null);
const [den2Sempl2, setDen2Sempl2] = useState<number | null>(null);
const [num1IntS, setNum1IntS] = useState<number | null>(null);
const [den1IntS, setDen1IntS] = useState<number | null>(null);
const [num2IntS, setNum2IntS] = useState<number | null>(null);
const [den2IntS, setDen2IntS] = useState<number | null>(null);
const [num3IntS, setNum3IntS] = useState<number | null>(null);
const [den3IntS, setDen3IntS] = useState<number | null>(null);
const [num4IntS, setNum4IntS] = useState<number | null>(null);
const [den4IntS, setDen4IntS] = useState<number | null>(null);
const [num2Sempl2, setNum2Sempl2] = useState<number | null>(null);
const [den3Sempl2, setDen3Sempl2] = useState<number | null>(null);
const [num3Sempl2, setNum3Sempl2] = useState<number | null>(null);
 const [numeratoreFinaleUtente, setNumeratoreFinaleUtente] = useState<number | null>(null);
 const [denominatoreFinaleUtente, setDenominatoreFinaleUtente] = useState<number | null>(null);

 // ─── Derived calculations ──────────────────────────────────────────

 // Add/Sub computed values (supporta 2, 3 o 4 frazioni)
 const addSubComputed = useMemo(() => {
  if (num1 === null || num2 === null) return null;

  const dn1 = den1 ?? 1;
  const dn2 = den2 ?? 1;
  if (dn1 < 1 || dn2 < 1) return null;
  const nd1 = Math.abs(dn1);
  const nd2 = Math.abs(dn2);

  const hasThird = showThirdFraction && num3 !== null;
  const dn3 = hasThird ? (den3 ?? 1) : 1;
  const nd3 = hasThird ? Math.abs(dn3) : 1;
  const hasFourth = showFourthFraction && num4 !== null;
  const dn4 = hasFourth ? (den4 ?? 1) : 1;
  const nd4 = hasFourth ? Math.abs(dn4) : 1;

  const mcmCorretto = hasFourth
   ? lcm(lcm(lcm(nd1, nd2), nd3), nd4)
   : hasThird ? lcm(lcm(nd1, nd2), nd3) : lcm(nd1, nd2);

  const fattori1 = fattorizzazionePrimi(nd1);
  const fattori2 = fattorizzazionePrimi(nd2);
  const fattori3 = hasThird ? fattorizzazionePrimi(nd3) : {};
  const fattori4 = hasFourth ? fattorizzazionePrimi(nd4) : {};

  let mcmFattori: Record<number, number> = {};
  for (const [f, e] of Object.entries(fattori1)) mcmFattori[+f] = Math.max(mcmFattori[+f] || 0, e);
  for (const [f, e] of Object.entries(fattori2)) mcmFattori[+f] = Math.max(mcmFattori[+f] || 0, e);
  if (hasThird) for (const [f, e] of Object.entries(fattori3)) mcmFattori[+f] = Math.max(mcmFattori[+f] || 0, e);
  if (hasFourth) for (const [f, e] of Object.entries(fattori4)) mcmFattori[+f] = Math.max(mcmFattori[+f] || 0, e);

  const mcmFormulaParts: string[] = [];
  for (const [f, e] of Object.entries(mcmFattori)) {
   mcmFormulaParts.push(e === 1 ? f : `${f}${toSuperscript(e)}`);
  }

  const effNum1 = num1 * (dn1 < 0 ? -1 : 1);
  const effNum2 = num2 * (dn2 < 0 ? -1 : 1);
  const effNum3 = hasThird ? num3! * (dn3 < 0 ? -1 : 1) : 0;
  const effNum4 = hasFourth ? num4! * (dn4 < 0 ? -1 : 1) : 0;
  const val1Corretto = round2((mcmCorretto / nd1) * effNum1);
  const val2Corretto = round2((mcmCorretto / nd2) * effNum2);
  const val3Corretto = hasThird ? round2((mcmCorretto / nd3) * effNum3) : 0;
  const val4Corretto = hasFourth ? round2((mcmCorretto / nd4) * effNum4) : 0;

  let numFinaleRaw = round2(addSubOp === "+" ? val1Corretto + val2Corretto : val1Corretto - val2Corretto);
  if (hasThird) numFinaleRaw = round2(addSubOp === "+" ? numFinaleRaw + val3Corretto : numFinaleRaw - val3Corretto);
  if (hasFourth) numFinaleRaw = round2(addSubOp === "+" ? numFinaleRaw + val4Corretto : numFinaleRaw - val4Corretto);

  const denFinaleRaw = mcmCorretto;
  const sempl = semplificaFrazione(numFinaleRaw, mcmCorretto);

  return {
   mcmCorretto,
   val1Corretto,
   val2Corretto,
   val3Corretto,
   val4Corretto,
   numFinaleRaw,
   denFinaleRaw,
   numFinaleCorretto: sempl.num,
   denFinaleCorretto: sempl.den,
   fattori1,
   fattori2,
   fattori3,
   fattori4,
   mcmFormulaParts,
   nd1,
   nd2,
   nd3,
   nd4,
   effNum1,
   effNum2,
   effNum3,
   effNum4,
   hasThird,
   hasFourth,
   mcmFormula: mcmFormulaParts.join("·"),
  };
 }, [num1, den1, num2, den2, num3, den3, num4, den4, showThirdFraction, showFourthFraction, addSubOp]);

 // Mul/Div computed values (supporta 2, 3 o 4 frazioni)
 const mulDivComputed = useMemo(() => {
  if (num1 === null || num2 === null) return null;

  const dn1 = den1 ?? 1;
  const dn2 = den2 ?? 1;
  if (dn1 < 1 || dn2 < 1) return null;
  const nd1 = Math.abs(dn1);
  const nd2 = Math.abs(dn2);

  const hasThird = showThirdFraction && num3 !== null;
  const dn3 = hasThird ? (den3 ?? 1) : 1;
  const nd3 = hasThird ? Math.abs(dn3) : 1;
  const hasFourth = showFourthFraction && num4 !== null;
  const dn4 = hasFourth ? (den4 ?? 1) : 1;
  const nd4 = hasFourth ? Math.abs(dn4) : 1;

  const invert = mulDivOp ==="/";

  // Seconda frazione
  let actualNum2: number;
  let actualDen2: number;
  let displayNum2: number;
  let displayDen2: number;
  if (invert) {
   actualNum2 = nd2;
   actualDen2 = Math.abs(num2);
   displayNum2 = nd2;
   displayDen2 = Math.abs(num2);
   if (num2 < 0) displayNum2 = -displayNum2;
  } else {
   actualNum2 = num2;
   actualDen2 = nd2;
   displayNum2 = num2;
   displayDen2 = nd2;
  }

  // Terza frazione
  let actualNum3 = 1, actualDen3 = 1, displayNum3: number | null = null, displayDen3: number | null = null;
  if (hasThird) {
   if (invert) {
    actualNum3 = nd3;
    actualDen3 = Math.abs(num3!);
    displayNum3 = nd3;
    displayDen3 = Math.abs(num3!);
    if (num3! < 0) displayNum3 = -displayNum3;
   } else {
    actualNum3 = num3!;
    actualDen3 = nd3;
    displayNum3 = num3!;
    displayDen3 = nd3;
   }
  }

  // Quarta frazione
  let actualNum4 = 1, actualDen4 = 1, displayNum4: number | null = null, displayDen4: number | null = null;
  if (hasFourth) {
   if (invert) {
    actualNum4 = nd4;
    actualDen4 = Math.abs(num4!);
    displayNum4 = nd4;
    displayDen4 = Math.abs(num4!);
    if (num4! < 0) displayNum4 = -displayNum4;
   } else {
    actualNum4 = num4!;
    actualDen4 = nd4;
    displayNum4 = num4!;
    displayDen4 = nd4;
   }
  }

  const divCom1 = gcd(Math.abs(num1), actualDen2);
  const divCom2 = gcd(nd1, Math.abs(actualNum2));
  const divCom3 = hasThird ? gcd(nd1, Math.abs(actualNum3)) : 0;
  const divCom4 = hasFourth ? gcd(nd1, Math.abs(actualNum4)) : 0;

  const numFinaleRaw = round2(num1 * actualNum2 * (hasThird ? actualNum3 : 1) * (hasFourth ? actualNum4 : 1));
  const denFinaleRaw = round2(nd1 * actualDen2 * (hasThird ? actualDen3 : 1) * (hasFourth ? actualDen4 : 1));
  const sempl = semplificaFrazione(numFinaleRaw, denFinaleRaw);

  return {
   actualNum2,
   actualDen2,
   actualNum3,
   actualDen3,
   actualNum4,
   actualDen4,
   displayNum2,
   displayDen2,
   displayNum3,
   displayDen3,
   displayNum4,
   displayDen4,
   divCom1,
   divCom2,
   divCom3,
   divCom4,
   numFinaleRaw,
   denFinaleRaw,
   numFinaleCorretto: sempl.num,
   denFinaleCorretto: sempl.den,
   hasThird,
   hasFourth,
   nd3,
   nd4,
  };
 }, [num1, den1, num2, den2, num3, den3, num4, den4, showThirdFraction, showFourthFraction, mulDivOp]);

 // ─── Handlers ──────────────────────────────────────────────────────

 const resetExercise = useCallback(() => {
  setMcmUtente(null);
  setRisultato1Utente(null);
  setRisultato2Utente(null);
  setRisultato3Utente(null);
  setRisultato4Utente(null);
  setRisultatoFinaleUtente("");
  setFeedbackFinale(null);
  setNum1Semplificato(null);
  setDen2Semplificato(null);
  setDen1Semplificato(null);
  setNum2Semplificato(null);
  setNum3Semplificato(null);
  setDen4Semplificato(null);
  setDen3Semplificato(null);
  setNum4Semplificato(null);
  setDen2Sempl2(null);
  setNum2Sempl2(null);
  setDen3Sempl2(null);
  setNum3Sempl2(null);
  setNum1IntS(null);
  setDen1IntS(null);
  setNum2IntS(null);
  setDen2IntS(null);
  setNum3IntS(null);
  setDen3IntS(null);
  setNum4IntS(null);
  setDen4IntS(null);
  setNumeratoreFinaleUtente(null);
  setDenominatoreFinaleUtente(null);
 }, []);

 const handleCalculate = () => {
  if (num1 === null || num2 === null) return;
  const d1 = den1 ?? 1;
  const d2 = den2 ?? 1;
  if (d1 < 1 || d2 < 1) return;
  if (showThirdFraction && num3 !== null) {
   const d3 = den3 ?? 1;
   if (d3 < 1) return;
  }
  if (showFourthFraction && num4 !== null) {
   const d4 = den4 ?? 1;
   if (d4 < 1) return;
  }
  setSubmitted(true);
  setPhase("exercise");
  resetExercise();
 };

 const handleNewExercise = () => {
  setNum1(null);
  setDen1(null);
  setNum2(null);
  setDen2(null);
  setNum3(null);
  setDen3(null);
  setShowThirdFraction(false);
  setNum4(null);
  setDen4(null);
  setShowFourthFraction(false);
  setPhase("input");
  setSubmitted(false);
  resetExercise();
 };

 // ─── PDF download ─────────────────────────────────────────────────
 const handleScaricaPdf = useCallback(() => {
  setGeneratingPdf(true);
  setTimeout(() => {
   const notebookContents = document.querySelectorAll('.notebook-content');
   if (notebookContents.length === 0) { setGeneratingPdf(false); return; }

   // Legge i dati studente dalla URL per il PDF
   let siCognome = ''; let siNome = ''; let siClasse = ''; let siData = '';
   try {
    const params = getStudentSearchParams();
    if (params) {
     siCognome = params.get('cognome')?.trim() || '';
     siNome = params.get('nome')?.trim() || '';
     siClasse = params.get('classe')?.trim() || '';
     siData = params.get('data')?.trim() || '';
    }
   } catch { /* ignora */ }

   let bodyHtml = '';
   // Intestazione studente nel PDF
   if (siCognome || siNome || siClasse || siData) {
    bodyHtml += `<div style="text-align:center;margin-bottom:20px;font-family:'Cambria Math',Cambria,serif;border-bottom:1px solid #e5e0d8;padding-bottom:12px">`;
    const nomeCompleto = [siCognome, siNome].filter(Boolean).join(' ');
    if (nomeCompleto) {
     bodyHtml += `<div style="font-size:15px;color:#2B2421;font-weight:bold">${nomeCompleto}</div>`;
    }
    if (siClasse) {
     bodyHtml += `<div style="font-size:13px;color:#7A6A61;margin-top:2px">Classe ${siClasse}</div>`;
    }
    if (siData) {
     bodyHtml += `<div style="font-size:12px;color:#7A6A61;margin-top:1px">${siData}</div>`;
    }
    bodyHtml += `</div>`;
   }
   notebookContents.forEach((el) => {
    bodyHtml += `<div style="margin-bottom:24px;text-align:center;page-break-inside:avoid">${el.innerHTML}</div>`;
   });

   // Copia TUTTI i fogli di stile dalla pagina corrente
   let stylesHtml = '';
   document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    stylesHtml += link.outerHTML;
   });
   document.querySelectorAll('style').forEach((style) => {
    const text = style.textContent || '';
    if (text.includes('__vite') || text.length > 200000) return;
    stylesHtml += `<style>${text}</style>`;
   });

   const printHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><base href="${window.location.origin}/"><title>Quaderno — Operazioni con le Frazioni</title>
${stylesHtml}
<style>
@font-face{font-family:'OpenDyslexic';src:url('/fonts/OpenDyslexic-Regular.ttf') format('truetype');font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:'OpenDyslexic';src:url('/fonts/OpenDyslexic-Bold.ttf') format('truetype');font-weight:700;font-style:normal;font-display:swap}
*{box-sizing:border-box}
body{font-family:'OpenDyslexic','Cambria Math',Cambria,serif!important;font-size:12pt!important;color:#1a1a1a;max-width:100%;margin:0 auto;text-align:center;line-height:1.6;background:#fff}
/* Forza OpenDyslexic (fallback Cambria Math) 12pt su OGNI elemento testuale */
*,*::before,*::after{font-family:'OpenDyslexic','Cambria Math',Cambria,serif!important}
body,body *,p,span,div,h1,h2,h3,h4,h5,h6,li,td,th,a,button,label,strong,em,b,i,u,small,sup,sub,code,pre,blockquote{font-size:12pt!important;line-height:1.55!important}
/* Preserva la dimensione delle linee di frazione (non testuali) */
.fraction-line,.frac-line,[class*="h-["]{font-size:inherit!important}
@media print{body{padding:0!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}@page{size:A4;margin:2.5cm 2cm 2cm 2cm}}
</style></head>
<body>${bodyHtml}<script>window.onload=function(){window.print()}<\/script></body></html>`;

   const w = window.open('', '_blank');
   if (w) { w.document.write(printHtml); w.document.close(); }
   setGeneratingPdf(false);
  }, 400);
 }, []);

 // ─── Add/Sub verification ─────────────────────────────────────────
 const verificaAddSub = (valore: string) => {
  if (!addSubComputed) return;
  setRisultatoFinaleUtente(valore);
  if (!valore.trim()) return;

  let numU: number, denU: number;
  if (valore.includes("/")) {
   const [n, d] = valore.split("/");
   numU = parseFloat(n);
   denU = parseFloat(d);
   if (isNaN(numU) || isNaN(denU) || denU === 0) {
    setFeedbackFinale({ testo:"Formato non valido. Usa N/D o un intero.", corretto: false });
    return;
   }
  } else {
   numU = parseFloat(valore);
   denU = 1;
   if (isNaN(numU)) {
    setFeedbackFinale({ testo:"Inserisci un numero valido.", corretto: false });
    return;
   }
  }

  const u = semplificaFrazione(numU, denU);
  const uStr = u.den === 1 ? `${u.num}` : `${u.num}/${u.den}`;
  const cStr = addSubComputed.denFinaleCorretto === 1
   ? `${addSubComputed.numFinaleCorretto}`
   : `${addSubComputed.numFinaleCorretto}/${addSubComputed.denFinaleCorretto}`;

  if (uStr === cStr) {
   setFeedbackFinale({ testo:"Il risultato è corretto! ✅", corretto: true });
  } else {
   setFeedbackFinale({ testo: `RISULTATO SBAGLIATO. CALCOLA DI NUOVO`, corretto: false });
  }
 };

 // ─── Mul/Div verification ─────────────────────────────────────────
 const verificaMulDiv = (valore: string) => {
  setRisultatoFinaleUtente(valore);
  if (!valore.trim()) return;
  if (!mulDivComputed) return;

  let numU: number, denU: number;
  let isFraction = false;
  if (valore.includes("/")) {
   const [n, d] = valore.split("/");
   numU = parseFloat(n);
   denU = parseFloat(d);
   isFraction = true;
   if (isNaN(numU) || isNaN(denU) || denU === 0) {
    setFeedbackFinale({ testo:"Formato non valido.", corretto: false });
    return;
   }
  } else {
   numU = parseFloat(valore);
   denU = 1;
   if (isNaN(numU)) {
    setFeedbackFinale({ testo:"Inserisci un numero valido.", corretto: false });
    return;
   }
  }

  const u = semplificaFrazione(numU, denU);
  const cStr = mulDivComputed.denFinaleCorretto === 1
   ? `${mulDivComputed.numFinaleCorretto}`
   : `${mulDivComputed.numFinaleCorretto}/${mulDivComputed.denFinaleCorretto}`;
  const valDecimaleCorretto = mulDivComputed.numFinaleCorretto / mulDivComputed.denFinaleCorretto;

  let isCorrect = (u.num === mulDivComputed.numFinaleCorretto && u.den === mulDivComputed.denFinaleCorretto);
  if (!isCorrect) {
   const userDec = numU / denU;
   if (Math.abs(userDec - valDecimaleCorretto) < 0.0000001) isCorrect = true;
  }

  if (isCorrect) {
   setFeedbackFinale({ testo:"Il risultato è corretto! ✅", corretto: true });
  } else {
   setFeedbackFinale({ testo: `RISULTATO SBAGLIATO. CALCOLA DI NUOVO`, corretto: false });
  }
 };

 // ─── Render ────────────────────────────────────────────────────────

 const allFilled = num1 !== null && num2 !== null && (!showThirdFraction || num3 !== null) && (!showFourthFraction || num4 !== null);

 return (
  <div ref={containerRef} className="min-h-screen bg-background paper-grain flex flex-col">
   {/* Header */}
   <header className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6 sm:pt-9">
    <h1 className="text-base sm:text-lg font-bold leading-tight text-foreground text-center">
     OPERAZIONI CON LE FRAZIONI
    </h1>
    {studentLabel && (
     <p className="text-sm text-muted-foreground mt-2 mb-1 text-center font-[Cambria,Georgia,serif]">
      {studentLabel}
     </p>
    )}
    <div className="text-center mt-3 mb-5">
     <a
      href="/"
      className="inline-block text-xs text-muted-foreground hover:text-foreground transition-colors font-[Cambria,Georgia,serif]"
     >
      ← TORNA ALLA HOME
     </a>
    </div>
   </header>
   <main className="flex-1 w-full px-3 sm:px-4 pb-4" style={{maxWidth:'100%'}}>
    {/* Mode selector */}
    <div className="flex gap-1 p-1 bg-card/60 backdrop-blur-sm rounded-xl border border-border mb-4 max-w-md mx-auto">
     <button
      onClick={() => { setMode("addsub"); handleNewExercise(); }}
      className={cn(
      "flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-lg text-sm font-bold transition-all duration-200 gap-0.5",
       mode ==="addsub"
        ?"bg-primary text-primary-foreground shadow-md"
        :"text-muted-foreground hover:text-foreground hover:bg-secondary",
      )}
     >
      <span className="text-base leading-none">+ / &minus;</span>
      <span className="text-[10px] tracking-wide">ADDIZIONE E SOTTRAZIONE</span>
     </button>
     <button
      onClick={() => { setMode("muldiv"); handleNewExercise(); }}
      className={cn(
      "flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-lg text-sm font-bold transition-all duration-200 gap-0.5",
       mode ==="muldiv"
        ?"bg-primary text-primary-foreground shadow-md"
        :"text-muted-foreground hover:text-foreground hover:bg-secondary",
      )}
     >
      <span className="text-base leading-none">&times; / &divide;</span>
      <span className="text-[10px] tracking-wide">MOLTIPLICAZIONE E DIVISIONE</span>
     </button>
    </div>

    {/* Input phase */}
    {phase ==="input"&& (
     <div className="space-y-4">
      {/* Suggerimento */}
      <div className="text-center">
       <span className="text-xs text-amber-900 tracking-widest font-medium">
        SCRIVI IL NUMERO NEL RIQUADRO
       </span>
      </div>

      {/* Operation selector */}
      <div className="flex items-center justify-center gap-2">
       <label className="text-base font-bold tracking-wider">OPERAZIONE:</label>
       {mode ==="addsub"? (
        <select
         value={addSubOp}
         onChange={(e) => setAddSubOp(e.target.value as"+"|"-")}
         className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-base font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
        >
         <option value="+">ADDIZIONE (+)</option>
         <option value="-">SOTTRAZIONE (&minus;)</option>
        </select>
       ) : (
        <select
         value={mulDivOp}
         onChange={(e) => setMulDivOp(e.target.value as"*"|"/")}
         className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-base font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
        >
         <option value="*">MOLTIPLICAZIONE (&times;)</option>
         <option value="/">DIVISIONE (&divide;)</option>
        </select>
       )}
      </div>

      {/* Fraction cards — horizontal, signs aligned with fraction lines */}
      <div className={`flex flex-row items-stretch gap-1 sm:gap-1.5 overflow-x-auto pb-2 pl-2 sm:pl-0 justify-start sm:justify-center`} style={{flexWrap:'nowrap'}}>
       {/* ── PRIMA FRAZIONE ── */}
       <div className="rounded-xl border border-border bg-card overflow-hidden animate-pop-in flex-shrink-0 min-w-[185px] sm:min-w-[200px]">
        <div className="py-1.5 border-b border-border bg-secondary/50">
         <span className="text-xs font-bold tracking-widest">PRIMA FRAZIONE</span>
        </div>
        <div className="px-2 py-2">
         <NumberInputCanvas value={num1} onChange={setNum1} label="NUMERATORE" allowNegative labelOnTop />
         <div className="w-[120px] sm:w-[135px] h-[2px] bg-foreground/80 my-1.5 mx-auto"/>
         <NumberInputCanvas value={den1} onChange={setDen1} label="DENOMINATORE" labelOnBottom />
        </div>
       </div>

       {/* ── SEGNO OPERAZIONE ── */}
       <SegnoOperazione op={mode ==="addsub"? (addSubOp ==="+"?"+":"\u2212") : (mulDivOp ==="*"?"\u00d7":"\u00f7")} />

       {/* ── SECONDA FRAZIONE ── */}
       <div className="rounded-xl border border-border bg-card overflow-hidden animate-pop-in flex-shrink-0 min-w-[185px] sm:min-w-[200px]">
        <div className="py-1.5 border-b border-border bg-secondary/50">
         <span className="text-xs font-bold tracking-widest">SECONDA FRAZIONE</span>
        </div>
        <div className="px-2 py-2">
         <NumberInputCanvas value={num2} onChange={setNum2} label="NUMERATORE" allowNegative labelOnTop />
         <div className="w-[120px] sm:w-[135px] h-[2px] bg-foreground/80 my-1.5 mx-auto"/>
         <NumberInputCanvas value={den2} onChange={setDen2} label="DENOMINATORE" labelOnBottom />
        </div>
       </div>

       {/* ── TERZA FRAZIONE (solo AddSub) ── */}
       {(mode ==="addsub" || mode ==="muldiv") && !showThirdFraction && (
        <div className="flex items-center flex-shrink-0">
         <button
          onClick={() => setShowThirdFraction(true)}
          className="w-8 h-8 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
          title="Aggiungi una terza frazione"
         >
          <span className="text-lg font-bold">+</span>
         </button>
        </div>
       )}
       {(mode ==="addsub" || mode ==="muldiv") && showThirdFraction && (
        <>
         <SegnoOperazione op={mode ==="addsub" ? (addSubOp ==="+" ? "+" : "\u2212") : (mulDivOp ==="*" ? "\u00d7" : "\u00f7")} />
         <div className="rounded-xl border border-border bg-card overflow-hidden animate-pop-in flex-shrink-0 min-w-[185px] sm:min-w-[200px]">
          <div className="py-1.5 border-b border-border bg-secondary/50 flex items-center px-2 relative">
           <span className="text-xs font-bold tracking-widest flex-1 text-center">TERZA FRAZIONE</span>
           <button
            onClick={() => { setShowThirdFraction(false); setNum3(null); setDen3(null); }}
            className="text-base text-muted-foreground hover:text-destructive transition-colors font-bold leading-none absolute right-2"
           >
            ✕
           </button>
          </div>
          <div className="px-2 py-2">
           <NumberInputCanvas value={num3} onChange={setNum3} label="NUMERATORE" allowNegative labelOnTop />
           <div className="w-[120px] sm:w-[135px] h-[2px] bg-foreground/80 my-1.5 mx-auto"/>
           <NumberInputCanvas value={den3} onChange={setDen3} label="DENOMINATORE" labelOnBottom />
          </div>
         </div>
        </>
       )}

       {/* ── QUARTA FRAZIONE ── */}
       {(mode ==="addsub" || mode ==="muldiv") && showThirdFraction && !showFourthFraction && (
        <div className="flex items-center flex-shrink-0">
         <button
          onClick={() => setShowFourthFraction(true)}
          className="w-8 h-8 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
          title="Aggiungi una quarta frazione"
         >
          <span className="text-lg font-bold">+</span>
         </button>
        </div>
       )}
       {(mode ==="addsub" || mode ==="muldiv") && showFourthFraction && (
        <>
         <SegnoOperazione op={mode ==="addsub" ? (addSubOp ==="+" ? "+" : "\u2212") : (mulDivOp ==="*" ? "\u00d7" : "\u00f7")} />
         <div className="rounded-xl border border-border bg-card overflow-hidden animate-pop-in flex-shrink-0 min-w-[185px] sm:min-w-[200px]">
          <div className="py-1.5 border-b border-border bg-secondary/50 flex items-center px-2 relative">
           <span className="text-xs font-bold tracking-widest flex-1 text-center">QUARTA FRAZIONE</span>
           <button
            onClick={() => { setShowFourthFraction(false); setNum4(null); setDen4(null); }}
            className="text-base text-muted-foreground hover:text-destructive transition-colors font-bold leading-none absolute right-2"
           >
            ✕
           </button>
          </div>
          <div className="px-2 py-2">
           <NumberInputCanvas value={num4} onChange={setNum4} label="NUMERATORE" allowNegative labelOnTop />
           <div className="w-[120px] sm:w-[135px] h-[2px] bg-foreground/80 my-1.5 mx-auto"/>
           <NumberInputCanvas value={den4} onChange={setDen4} label="DENOMINATORE" labelOnBottom />
          </div>
         </div>
        </>
       )}
      </div>

      {/* Anteprima espressione inserita */}
      {allFilled && (
       <div className="flex items-center justify-center gap-3 py-2 animate-pop-in flex-wrap">
        <div className="flex flex-col items-center">
         <span className="text-base font-bold font-serif">{num1}</span>
         {(den1 !== null && den1 !== 1) && (<div className="w-10 h-[2px] bg-foreground/70 my-0.5"/>)}
         {(den1 !== null && den1 !== 1) && (<span className="text-base font-bold font-serif">{den1}</span>)}
        </div>
        <span className="text-lg font-bold text-primary">{mode ==="addsub"? (addSubOp ==="+"?"+":"\u2212") : (mulDivOp ==="*"?"\u00d7":"\u00f7")}</span>
        <div className="flex flex-col items-center">
         <span className="text-base font-bold font-serif">{num2}</span>
         {(den2 !== null && den2 !== 1) && (<div className="w-10 h-[2px] bg-foreground/70 my-0.5"/>)}
         {(den2 !== null && den2 !== 1) && (<span className="text-base font-bold font-serif">{den2}</span>)}
        </div>
        {showThirdFraction && num3 !== null && (
         <>
          <span className="text-lg font-bold text-primary">{mode ==="addsub" ? (addSubOp ==="+" ? "+" : "\u2212") : (mulDivOp ==="*" ? "\u00d7" : "\u00f7")}</span>
          <div className="flex flex-col items-center">
           <span className="text-base font-bold font-serif">{num3}</span>
           {(den3 !== null && den3 !== 1) && (<div className="w-10 h-[2px] bg-foreground/70 my-0.5"/>)}
           {(den3 !== null && den3 !== 1) && (<span className="text-base font-bold font-serif">{den3}</span>)}
          </div>
         </>
        )}
        {showFourthFraction && num4 !== null && (
         <>
          <span className="text-lg font-bold text-primary">{mode ==="addsub" ? (addSubOp ==="+" ? "+" : "\u2212") : (mulDivOp ==="*" ? "\u00d7" : "\u00f7")}</span>
          <div className="flex flex-col items-center">
           <span className="text-base font-bold font-serif">{num4}</span>
           {(den4 !== null && den4 !== 1) && (<div className="w-10 h-[2px] bg-foreground/70 my-0.5"/>)}
           {(den4 !== null && den4 !== 1) && (<span className="text-base font-bold font-serif">{den4}</span>)}
          </div>
         </>
        )}
       </div>
      )}

      {/* Calculate button */}
      <button
       onClick={handleCalculate}
       disabled={!allFilled}
       className="max-w-xs mx-auto w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed text-primary-foreground font-bold text-base tracking-widest transition-all duration-200 shadow-md"
      >
       CALCOLA
      </button>
     </div>
    )}

    {/* Exercise phase */}
    {phase ==="exercise"&& submitted && (
     <div className="space-y-5">
      {/* --- ADD/SUB EXERCISE --- */}
      {mode ==="addsub"&& addSubComputed && (
       <AddSubExercise
        num1={num1!}
        den1={den1!}
        num2={num2!}
        den2={den2!}
        op={addSubOp}
        computed={addSubComputed}
        mcmUtente={mcmUtente}
        setMcmUtente={setMcmUtente}
        risultato1Utente={risultato1Utente}
        setRisultato1Utente={setRisultato1Utente}
        risultato2Utente={risultato2Utente}
        setRisultato2Utente={setRisultato2Utente}
        risultato3Utente={risultato3Utente}
        setRisultato3Utente={setRisultato3Utente}
        risultato4Utente={risultato4Utente}
        setRisultato4Utente={setRisultato4Utente}
        risultatoFinaleUtente={risultatoFinaleUtente}
        setRisultatoFinaleUtente={setRisultatoFinaleUtente}
        feedbackFinale={feedbackFinale}
        verificaFinale={verificaAddSub}
        onNew={handleNewExercise}
        generatingPdf={generatingPdf}
       />
      )}

      {/* --- MUL/DIV EXERCISE --- */}
      {mode ==="muldiv"&& mulDivComputed && (
       <MulDivExercise
        num1={num1!}
        den1={den1!}
        num2={num2!}
        den2={den2!}
        num3={num3}
        den3={den3}
        num4={num4}
        den4={den4}
        showThirdFraction={showThirdFraction}
        showFourthFraction={showFourthFraction}
        op={mulDivOp}
        computed={mulDivComputed}
        num1Semplificato={num1Semplificato}
        setNum1Semplificato={setNum1Semplificato}
        den2Semplificato={den2Semplificato}
        setDen2Semplificato={setDen2Semplificato}
        den1Semplificato={den1Semplificato}
        setDen1Semplificato={setDen1Semplificato}
        num2Semplificato={num2Semplificato}
        setNum2Semplificato={setNum2Semplificato}
        num3Semplificato={num3Semplificato}
        setNum3Semplificato={setNum3Semplificato}
        den4Semplificato={den4Semplificato}
        setDen4Semplificato={setDen4Semplificato}
        den3Semplificato={den3Semplificato}
        setDen3Semplificato={setDen3Semplificato}
        num4Semplificato={num4Semplificato}
        setNum4Semplificato={setNum4Semplificato}
        den2Sempl2={den2Sempl2}
        setDen2Sempl2={setDen2Sempl2}
        num2Sempl2={num2Sempl2}
        setNum2Sempl2={setNum2Sempl2}
        den3Sempl2={den3Sempl2}
        setDen3Sempl2={setDen3Sempl2}
        num3Sempl2={num3Sempl2}
        setNum3Sempl2={setNum3Sempl2}
        num1IntS={num1IntS}
        setNum1IntS={setNum1IntS}
        den1IntS={den1IntS}
        setDen1IntS={setDen1IntS}
        num2IntS={num2IntS}
        setNum2IntS={setNum2IntS}
        den2IntS={den2IntS}
        setDen2IntS={setDen2IntS}
        num3IntS={num3IntS}
        setNum3IntS={setNum3IntS}
        den3IntS={den3IntS}
        setDen3IntS={setDen3IntS}
        num4IntS={num4IntS}
        setNum4IntS={setNum4IntS}
        den4IntS={den4IntS}
        setDen4IntS={setDen4IntS}
        numeratoreFinaleUtente={numeratoreFinaleUtente}
        setNumeratoreFinaleUtente={setNumeratoreFinaleUtente}
        denominatoreFinaleUtente={denominatoreFinaleUtente}
        setDenominatoreFinaleUtente={setDenominatoreFinaleUtente}
        risultatoFinaleUtente={risultatoFinaleUtente}
        feedbackFinale={feedbackFinale}
        verificaFinale={verificaMulDiv}
        onNew={handleNewExercise}
        generatingPdf={generatingPdf}
       />
      )}
     </div>
    )}

    {/* SCARICA PDF button */}
    {phase === "exercise" && (
     <div className="flex justify-center pt-4 pb-2">
      <button
       onClick={handleScaricaPdf}
       className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 font-bold text-base tracking-widest transition-all shadow-sm"
      >
       📄 SCARICA PDF
      </button>
     </div>
    )}
   </main>

   {/* Footer */}
   <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
    Realizzato da Andrea Centinaro
   </footer>
  </div>
 );
}

// ─── NOTEBOOK GUIDE COMPONENT ──────────────────────────────────────

function NotebookGuide({
 title,
 defaultOpen = false,
 forceOpen = false,
 visible = true,
 children,
}: {
 title: string;
 defaultOpen?: boolean;
 forceOpen?: boolean;
 visible?: boolean;
 children: React.ReactNode;
}) {
 const [isOpen, setIsOpen] = useState(defaultOpen);

 if (!visible) return null;

 const open = forceOpen || isOpen;

 return (
  <div className="rounded-xl border border-primary/25 bg-primary/5 overflow-hidden">
   <button
    onClick={() => setIsOpen(!isOpen)}
    className="w-full flex items-center justify-center px-4 py-2.5 hover:bg-primary/10 transition-colors relative"
   >
    <span className="text-base font-bold text-primary text-center">{title}</span>
    <span className={cn(
    "text-primary/60 text-base transition-transform duration-300 absolute right-4",
     open &&"rotate-180",
    )}>{open ?"▲":"▼"}</span>
   </button>
   {open && (
    <div className="px-4 pb-4 pt-1">
     <div className="notebook-content rounded-lg bg-card border border-border p-3.5 space-y-2 text-base leading-loose text-foreground text-center">
      {/* Notebook lines */}
      <div
       className="relative"
       style={{
        backgroundImage:
        "repeating-linear-gradient(transparent, transparent 1.55rem, rgba(139,92,62,0.06) 1.55rem, rgba(139,92,62,0.06) 1.6rem)",
       }}
      >
       {children}
      </div>
     </div>
    </div>
   )}
  </div>
 );
}

// ─── SEGNO OPERAZIONE ALLINEATO CON LINEA DI FRAZIONE ──────────────

/**
 * Renderizza il segno dell'operazione allineato verticalmente
 * con la linea di frazione delle card adiacenti.
 * La struttura ricalca quella di una card frazione:
 *  - header invisibile (stessa altezza del header card)
 *  - body con flex-1 suddiviso in spazio numeratore + segno + spazio denominatore
 */
function SegnoOperazione({ op }: { op: string }) {
 return (
  <div className="flex flex-col flex-shrink-0">
   {/* Header invisibile — stessa altezza di py-1.5 + text-sm */}
   <div className="py-1.5 border-b border-transparent">
    <span className="text-sm font-bold tracking-widest invisible">H</span>
   </div>
   {/* Body con flex-1 — il segno cade a metà */}
   <div className="flex-1 flex flex-col items-center justify-center px-1 py-2">
    <div className="flex-1" />
    <span className="text-xl font-bold text-primary leading-none">{op}</span>
    <div className="flex-1" />
   </div>
  </div>
 );
}

// ─── ADD/SUB EXERCISE SUB-COMPONENT ─────────────────────────────────

interface AddSubExerciseProps {
 num1: number; den1: number; num2: number; den2: number; op:"+"|"-";
 computed: any;
 mcmUtente: number | null; setMcmUtente: (v: number | null) => void;
 risultato1Utente: number | null; setRisultato1Utente: (v: number | null) => void;
 risultato2Utente: number | null; setRisultato2Utente: (v: number | null) => void;
 risultato3Utente: number | null; setRisultato3Utente: (v: number | null) => void;
 risultato4Utente: number | null; setRisultato4Utente: (v: number | null) => void;
 risultatoFinaleUtente: string; setRisultatoFinaleUtente: (v: string) => void;
 feedbackFinale: { testo: string; corretto: boolean } | null;
 verificaFinale: (v: string) => void;
 onNew: () => void;
 generatingPdf: boolean;
}

function AddSubExercise({
 num1, den1, num2, den2, op, computed,
 mcmUtente, setMcmUtente,
 risultato1Utente, setRisultato1Utente,
 risultato2Utente, setRisultato2Utente,
 risultato3Utente, setRisultato3Utente,
 risultato4Utente, setRisultato4Utente,
 risultatoFinaleUtente, setRisultatoFinaleUtente,
 feedbackFinale, verificaFinale, onNew, generatingPdf,
}: AddSubExerciseProps) {
 const [showStep3Guide, setShowStep3Guide] = useState(false);
 const [finalNumUtente, setFinalNumUtente] = useState<number | null>(null);
 const [finalDenUtente, setFinalDenUtente] = useState<number | null>(null);
 
 const mcmDisplay = mcmUtente ??"MCM";
 const r1Display = risultato1Utente !== null ? risultato1Utente :"...";
 const r2Display = risultato2Utente !== null ? risultato2Utente :"...";
 const r3Display = risultato3Utente !== null ? risultato3Utente :"...";
 const r4Display = risultato4Utente !== null ? risultato4Utente :"...";
 const nd1 = Math.abs(den1 ?? 1);
 const nd2 = Math.abs(den2 ?? 1);
 const effNum1 = num1 * ((den1 ?? 1) < 0 ? -1 : 1);
 const effNum2 = num2 * ((den2 ?? 1) < 0 ? -1 : 1);
 
 const handleFinalVerify = () => {
  if (finalNumUtente !== null) {
   const denVal = finalDenUtente ?? 1;
   const resultStr = denVal === 1 ? String(finalNumUtente) : `${finalNumUtente}/${denVal}`;
   verificaFinale(resultStr);
   setShowStep3Guide(true);
  }
 };

 return (
  <div className="space-y-5 max-w-2xl mx-auto">
   {/* Step 1: MCM */}
   <div className="p-4 rounded-xl bg-card/40 border border-border space-y-6 leading-loose">
    <p className="text-base font-bold text-primary">1. Calcolo del m.c.m. tra i denominatori</p>

    {/* Notebook Guide: Step 1 */}
    <div className="space-y-3 text-base">
     <p className="font-bold">1.1 Scomposizione in fattori primi dei denominatori:</p>
     <p className="font-normal text-base text-amber-900">DENOMINATORE DELLA PRIMA FRAZIONE: {formatFattori(nd1, computed.fattori1)}</p>
     <p className="font-normal text-base text-amber-900">DENOMINATORE DELLA SECONDA FRAZIONE: {formatFattori(nd2, computed.fattori2)}</p>
     {computed.hasThird && (
     <p className="font-normal text-base text-amber-900">DENOMINATORE DELLA TERZA FRAZIONE: {formatFattori(computed.nd3, computed.fattori3)}</p>
     )}
     {computed.hasFourth && (
     <p className="font-normal text-base text-amber-900">DENOMINATORE DELLA QUARTA FRAZIONE: {formatFattori(computed.nd4, computed.fattori4)}</p>
     )}
     <p className="font-semibold mt-8">1.2 Calcolo del minimo comune multiplo:</p>
     {nd1 === nd2 ? (
      <p className="font-mono text-base opacity-80">
       Il m.c.m. tra {nd1} e {nd2} è il numero stesso, cioè...
      </p>
     ) : (
      <p className="font-mono text-base opacity-80">
       Il m.c.m. tra {nd1} e {nd2} è {computed.mcmFormula}, cioè...
      </p>
     )}
    </div>

    <div className="flex flex-col items-center">
     <NumberInputCanvas
      value={mcmUtente}
      onChange={setMcmUtente}
      label="Inserisci il tuo risultato (m.c.m.):"
      colorClass="text-primary"
      labelOnTop
     />
    </div>
    {mcmUtente !== null && (
     <p className={cn(
     "text-base font-bold text-center mt-3",
      mcmUtente === computed.mcmCorretto ?"text-success":"text-destructive",
     )}>
      {mcmUtente === computed.mcmCorretto ?"CORRETTO": `RISULTATO SBAGLIATO. CALCOLA DI NUOVO`}
     </p>
    )}

    {/* MCM fraction preview */}
    <div className="flex justify-center mt-4">
     <span className="inline-flex flex-col items-center align-middle mx-1 text-base min-w-[40px]">
      <span className="block text-center px-1 whitespace-nowrap">
       <span className="text-red-400">({mcmDisplay} : {nd1}) · {effNum1 < 0 ? `(${effNum1})` : effNum1}</span>
       {' '}{op}{' '}
       <span className="text-orange-400">({mcmDisplay} : {nd2}) · {effNum2 < 0 ? `(${effNum2})` : effNum2}</span>
       {computed.hasThird && (<>{' '}{op}{' '}<span className="text-blue-400">({mcmDisplay} : {computed.nd3}) · {computed.effNum3 < 0 ? `(${computed.effNum3})` : computed.effNum3}</span></>)}
       {computed.hasFourth && (<>{' '}{op}{' '}<span className="text-blue-500">({mcmDisplay} : {computed.nd4}) · {computed.effNum4 < 0 ? `(${computed.effNum4})` : computed.effNum4}</span></>)}
      </span>
      <span className="block w-full border-t border-black my-0.5" />
      <span className="block text-center px-1">{mcmDisplay}</span>
     </span>
    </div>
    <NotebookGuide title="RICOPIA SUL QUADERNO:"visible={mcmUtente === computed.mcmCorretto} forceOpen={generatingPdf}>
     <div className="flex justify-center my-2">
      <div className="flex items-center gap-3 text-base font-mono bg-muted px-3.5 py-2 rounded-lg">
       <FractionDisplay numerator={num1} denominator={den1} size="xs"/>
       <span className="text-base font-bold">{op}</span>
       <FractionDisplay numerator={num2} denominator={den2} size="xs"/>
       {computed.hasThird && (
       <>
        <span className="text-base font-bold">{op}</span>
        <FractionDisplay numerator={computed.effNum3} denominator={computed.nd3} size="xs"/>
       </>
       )}
       {computed.hasFourth && (
       <>
        <span className="text-base font-bold">{op}</span>
        <FractionDisplay numerator={computed.effNum4} denominator={computed.nd4} size="xs"/>
       </>
       )}
      </div>
     </div>
     {nd1 !== nd2 && (
     <>
     <p className="font-mono text-base text-center text-primary mt-3">SCOMPOSIZIONE IN FATTORI PRIMI</p>
     <p className="font-mono text-base">
      {nd1} = {computed.fattori1[1] === 1 ?"1": Object.entries(computed.fattori1).map(([f, e]) => (e as number) === 1 ? f : `${f}${toSuperscript(e as number)}`).join("·")}<br />
      {nd2} = {computed.fattori2[1] === 1 ?"1": Object.entries(computed.fattori2).map(([f, e]) => (e as number) === 1 ? f : `${f}${toSuperscript(e as number)}`).join("·")}<br />
      {computed.hasThird && (<>{computed.nd3} = {computed.fattori3[1] === 1 ?"1": Object.entries(computed.fattori3).map(([f, e]) => (e as number) === 1 ? f : `${f}${toSuperscript(e as number)}`).join("·")}<br /></>)}
      {computed.hasFourth && (<>{computed.nd4} = {computed.fattori4[1] === 1 ?"1": Object.entries(computed.fattori4).map(([f, e]) => (e as number) === 1 ? f : `${f}${toSuperscript(e as number)}`).join("·")}<br /></>)}
     </p>
     <p className="font-mono text-base text-primary mt-4">
      m.c.m.({nd1}, {nd2}{computed.hasThird ? `, ${computed.nd3}` : ""}{computed.hasFourth ? `, ${computed.nd4}` : ""}) = {computed.mcmFormula} = {computed.mcmCorretto}
     </p>
     </>
     )}
     <div className="flex justify-center my-2">
      <div className="font-mono text-base text-center bg-muted px-4 py-2 rounded-lg">
       <span className="text-red-400">({computed.mcmCorretto} : {nd1}) · {effNum1 < 0 ? `(${effNum1})` : effNum1}</span> {op} <span className="text-orange-400">({computed.mcmCorretto} : {nd2}) · {effNum2 < 0 ? `(${effNum2})` : effNum2}</span>{computed.hasThird ? <> {op} <span className="text-blue-400">({computed.mcmCorretto} : {computed.nd3}) · {computed.effNum3 < 0 ? `(${computed.effNum3})` : computed.effNum3}</span></> : ""}{computed.hasFourth ? <> {op} <span className="text-blue-500">({computed.mcmCorretto} : {computed.nd4}) · {computed.effNum4 < 0 ? `(${computed.effNum4})` : computed.effNum4}</span></> : ""}<br />
       <span className="border-t border-black block mt-1 pt-1">{computed.mcmCorretto}</span>
      </div>
     </div>
    </NotebookGuide>

   </div>

   {/* Step 2: Division and multiplication */}
   <div className="p-4 rounded-xl bg-card/40 border border-border space-y-6 leading-loose">
    <p className="text-base font-bold text-primary">2. Divisione del denominatore col m.c.m. e moltiplicazione col numeratore</p>

    {/* Notebook Guide: Step 2 */}
    <div className="space-y-3">
     <p className="text-base">
      ({mcmDisplay} : {nd1}) · {effNum1 < 0 ? `(${effNum1})` : effNum1} = <span className="font-bold text-orange-400 text-sm">RISULTATO 1</span>
     </p>
     <div className="flex flex-col items-center">
      <NumberInputCanvas
       value={risultato1Utente}
       onChange={setRisultato1Utente}
       label="RISULTATO 1"
       colorClass="text-orange-400"
       allowNegative
       labelOnTop
      />
     </div>
     {risultato1Utente !== null && (
      <p className={cn(
      "text-base font-bold text-center",
       risultato1Utente === computed.val1Corretto ?"text-success":"text-destructive",
      )}>
       {risultato1Utente === computed.val1Corretto ?"CORRETTO": `RISULTATO SBAGLIATO. CALCOLA DI NUOVO`}
      </p>
     )}

     <p className="text-base">
      ({mcmDisplay} : {nd2}) · {effNum2 < 0 ? `(${effNum2})` : effNum2} = <span className="font-bold text-red-400 text-sm">RISULTATO 2</span>
     </p>
     <div className="flex flex-col items-center">
      <NumberInputCanvas
       value={risultato2Utente}
       onChange={setRisultato2Utente}
       label="RISULTATO 2"
       colorClass="text-red-400"
       allowNegative
       labelOnTop
      />
     </div>
     {risultato2Utente !== null && (
      <p className={cn(
      "text-base font-bold text-center",
       risultato2Utente === computed.val2Corretto ?"text-success":"text-destructive",
      )}>
       {risultato2Utente === computed.val2Corretto ?"CORRETTO": `RISULTATO SBAGLIATO. CALCOLA DI NUOVO`}
      </p>
     )}

     {computed.hasThird && (
     <>
     <p className="text-base">
      ({mcmDisplay} : {computed.nd3}) · {computed.effNum3 < 0 ? `(${computed.effNum3})` : computed.effNum3} = <span className="font-bold text-blue-400 text-sm">RISULTATO 3</span>
     </p>
     <div className="flex flex-col items-center">
      <NumberInputCanvas
       value={risultato3Utente}
       onChange={setRisultato3Utente}
       label="RISULTATO 3"
       colorClass="text-blue-400"
       allowNegative
       labelOnTop
      />
     </div>
     {risultato3Utente !== null && (
      <p className={cn(
      "text-base font-bold text-center",
       risultato3Utente === computed.val3Corretto ?"text-success":"text-destructive",
      )}>
       {risultato3Utente === computed.val3Corretto ?"CORRETTO": `RISULTATO SBAGLIATO. CALCOLA DI NUOVO`}
      </p>
     )}
     </>
     )}
     {computed.hasFourth && (
     <>
     <p className="text-base">
      ({mcmDisplay} : {computed.nd4}) · {computed.effNum4 < 0 ? `(${computed.effNum4})` : computed.effNum4} = <span className="font-bold text-blue-500 text-sm">RISULTATO 4</span>
     </p>
     <div className="flex flex-col items-center">
      <NumberInputCanvas
       value={risultato4Utente}
       onChange={setRisultato4Utente}
       label="RISULTATO 4"
       colorClass="text-blue-500"
       allowNegative
       labelOnTop
      />
     </div>
     {risultato4Utente !== null && (
      <p className={cn(
      "text-base font-bold text-center",
       risultato4Utente === computed.val4Corretto ?"text-success":"text-destructive",
      )}>
       {risultato4Utente === computed.val4Corretto ?"CORRETTO": `RISULTATO SBAGLIATO. CALCOLA DI NUOVO`}
      </p>
     )}
     </>
     )}
    </div>
    <NotebookGuide title="RICOPIA SUL QUADERNO:"visible={risultato1Utente === computed.val1Corretto && risultato2Utente === computed.val2Corretto && (!computed.hasThird || risultato3Utente === computed.val3Corretto) && (!computed.hasFourth || risultato4Utente === computed.val4Corretto)} forceOpen={generatingPdf}>
     <p className="font-mono text-base">
      <span className="text-red-400">({computed.mcmCorretto} : {nd1}) · {effNum1 < 0 ? `(${effNum1})` : effNum1} = {round2(computed.mcmCorretto / nd1)} · {effNum1 < 0 ? `(${effNum1})` : effNum1} = {computed.val1Corretto}</span>
     </p>
     <p className="font-mono text-base">
      <span className="text-orange-400">({computed.mcmCorretto} : {nd2}) · {effNum2 < 0 ? `(${effNum2})` : effNum2} = {round2(computed.mcmCorretto / nd2)} · {effNum2 < 0 ? `(${effNum2})` : effNum2} = {computed.val2Corretto}</span>
     </p>
     {computed.hasThird && (
     <p className="font-mono text-base">
      <span className="text-blue-400">({computed.mcmCorretto} : {computed.nd3}) · {computed.effNum3 < 0 ? `(${computed.effNum3})` : computed.effNum3} = {round2(computed.mcmCorretto / computed.nd3)} · {computed.effNum3 < 0 ? `(${computed.effNum3})` : computed.effNum3} = {computed.val3Corretto}</span>
     </p>
     )}
     {computed.hasFourth && (
     <p className="font-mono text-base">
      <span className="text-blue-500">({computed.mcmCorretto} : {computed.nd4}) · {computed.effNum4 < 0 ? `(${computed.effNum4})` : computed.effNum4} = {round2(computed.mcmCorretto / computed.nd4)} · {computed.effNum4 < 0 ? `(${computed.effNum4})` : computed.effNum4} = {computed.val4Corretto}</span>
     </p>
     )}
     <div className="flex justify-center my-2">
      <div className="font-mono text-base text-center bg-muted px-4 py-2 rounded-lg">
       <span className="font-bold text-red-400">{computed.val1Corretto}</span> {op} {computed.val2Corretto < 0 && '('}<span className="font-bold text-orange-400">{computed.val2Corretto}</span>{computed.val2Corretto < 0 && ')'}{computed.hasThird ? <> {op} <span className="font-bold text-blue-400">{computed.val3Corretto < 0 ? `(${computed.val3Corretto})` : computed.val3Corretto}</span></> : ""}{computed.hasFourth ? <> {op} <span className="font-bold text-blue-500">{computed.val4Corretto < 0 ? `(${computed.val4Corretto})` : computed.val4Corretto}</span></> : ""}<br />
       <span className="border-t border-black block mt-1 pt-1">{computed.mcmCorretto}</span>
      </div>
     </div>
    </NotebookGuide>

   </div>

   {/* Step 3: Final sum */}
   <div className="p-4 rounded-xl bg-card/40 border border-border space-y-6 leading-loose">
    <p className="text-base font-bold text-primary">3. Somma algebrica finale</p>

    {/* Notebook Guide: Step 3 */}
    <div className="flex justify-center">
     <span className="inline-flex flex-col items-center align-middle mx-1 text-xl min-w-[56px]">
      <span className="block text-center px-1 whitespace-nowrap">
       <span className="text-red-400">{r1Display}</span>
       {' '}{op}{' '}
       <span className="text-orange-400">{risultato2Utente !== null && risultato2Utente < 0 ? `(${r2Display})` : r2Display}</span>
       {computed.hasThird && (<>{' '}{op}{' '}<span className="text-blue-400">{risultato3Utente !== null && risultato3Utente < 0 ? `(${r3Display})` : r3Display}</span></>)}
       {computed.hasFourth && (<>{' '}{op}{' '}<span className="text-blue-500">{risultato4Utente !== null && risultato4Utente < 0 ? `(${r4Display})` : r4Display}</span></>)}
      </span>
      <span className="block w-full border-t border-black my-0.5" />
      <span className="block text-center px-1">{mcmDisplay}</span>
     </span>
    </div>

    {/* Final result handwriting input */}
    <div className="space-y-3 pt-2">
     <p className="text-base font-semibold text-foreground">
      Scrivi il risultato finale:
     </p>
     <div className="rounded-xl border border-border bg-card/60 p-3 flex flex-col items-center gap-1">
      <NumberInputCanvas
       value={finalNumUtente}
       onChange={(v) => {
        setFinalNumUtente(v);
        const denVal = finalDenUtente ?? 1;
        const resultStr = denVal === 1 ? String(v ?? "?") : `${v ?? "?"}/${denVal}`;
        verificaFinale(resultStr);
        setShowStep3Guide(true);
       }}
       label="NUMERATORE"
       allowNegative
       labelOnTop
      />
      {/* Linea di frazione — nascosta se denominatore è 1 */}
      {computed.denFinaleRaw !== 1 && (
      <div className="w-[120px] sm:w-[135px] h-[2px] bg-foreground/80 my-1.5 mx-auto"/>
      )}
      {computed.denFinaleRaw !== 1 && (
      <NumberInputCanvas
       value={finalDenUtente}
       onChange={(v) => {
        setFinalDenUtente(v);
        if (finalNumUtente !== null) {
         const resultStr = (v ?? 1) === 1 ? String(finalNumUtente) : `${finalNumUtente}/${v}`;
         verificaFinale(resultStr);
         setShowStep3Guide(true);
        }
       }}
       label="DENOMINATORE"
       labelOnBottom
      />
      )}
     </div>
     {/* Preview */}
     {finalNumUtente !== null && (
      <div className="flex justify-center">
       <div className="flex flex-col items-center">
        <span className="text-lg font-bold font-serif">{finalNumUtente}</span>
        {(finalDenUtente ?? 1) !== 1 && (
        <div className="w-12 h-[2px] bg-foreground/60 my-0.5"/>
        )}
        {(finalDenUtente ?? 1) !== 1 && (
        <span className="text-lg font-bold font-serif">{finalDenUtente}</span>
        )}
       </div>
      </div>
     )}
    </div>

    {feedbackFinale && (
     <div className={cn(
     "p-3 rounded-lg text-base font-semibold text-center",
      feedbackFinale.corretto
       ?"bg-success/10 text-success border border-success/30"
       :"bg-destructive/10 text-destructive border border-destructive/20",
     )}>
      <span>{feedbackFinale.testo}</span>
     </div>
    )}
    <NotebookGuide title="RICOPIA SUL QUADERNO:"visible={feedbackFinale?.corretto === true} forceOpen={feedbackFinale?.corretto === true || generatingPdf}>
     {(() => {{
      const numRaw = computed.val1Corretto + computed.val2Corretto + (computed.hasThird ? computed.val3Corretto : 0) + (computed.hasFourth ? computed.val4Corretto : 0);
      const denRaw = computed.mcmCorretto;
      const mcd = gcd(Math.abs(numRaw), denRaw);
      const numCorr = Math.round(numRaw / mcd);
      const denCorr = Math.round(denRaw / mcd);
      return (<>
       <p className="font-mono text-base">
        {computed.val1Corretto} {op} {computed.val2Corretto < 0 ? `(${computed.val2Corretto})` : computed.val2Corretto}{computed.hasThird ? ` ${op} ${computed.val3Corretto < 0 ? `(${computed.val3Corretto})` : computed.val3Corretto}` : ""}{computed.hasFourth ? ` ${op} ${computed.val4Corretto < 0 ? `(${computed.val4Corretto})` : computed.val4Corretto}` : ""} = {numRaw}
       </p>
       <div className="flex justify-center my-2">
        <div className="font-mono text-base text-center bg-muted px-4 py-2 rounded-lg">
         {denRaw === 1 ? (
          <span className="font-bold">{numRaw}</span>
         ) : (
          <>
           <span className="font-bold">{numRaw}</span><br />
           <span className="border-t border-black block mt-1 pt-1">{denRaw}</span>
          </>
         )}
        </div>
       </div>
       {(numRaw !== numCorr || denRaw !== denCorr) && (
        <p className="text-base text-center flex items-center justify-center gap-2 flex-wrap">
         <FractionDisplay numerator={numRaw} denominator={denRaw} size="sm" />
         <span className="font-bold">=</span>
         <FractionDisplay numerator={numCorr} denominator={denCorr} size="sm" />
        </p>
       )}
      </>);
     }})()}
     </NotebookGuide>

   </div>

   {/* New exercise */}
   <button
    onClick={onNew}
    className="max-w-xs mx-auto w-full py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-base font-bold tracking-widest transition-all duration-200"
   >
    NUOVO ESERCIZIO
   </button>
  </div>
 );
}

// ─── MUL/DIV EXERCISE SUB-COMPONENT ─────────────────────────────────

interface MulDivExerciseProps {
 num1: number; den1: number; num2: number; den2: number;
 num3: number | null; den3: number | null; num4: number | null; den4: number | null;
 showThirdFraction: boolean; showFourthFraction: boolean;
 op:"*"|"/";
 computed: any;
 num1Semplificato: number | null; setNum1Semplificato: (v: number | null) => void;
 den2Semplificato: number | null; setDen2Semplificato: (v: number | null) => void;
 den1Semplificato: number | null; setDen1Semplificato: (v: number | null) => void;
 num2Semplificato: number | null; setNum2Semplificato: (v: number | null) => void;
 num3Semplificato: number | null; setNum3Semplificato: (v: number | null) => void;
 den4Semplificato: number | null; setDen4Semplificato: (v: number | null) => void;
 den3Semplificato: number | null; setDen3Semplificato: (v: number | null) => void;
 num4Semplificato: number | null; setNum4Semplificato: (v: number | null) => void;
 den2Sempl2: number | null; setDen2Sempl2: (v: number | null) => void;
 num2Sempl2: number | null; setNum2Sempl2: (v: number | null) => void;
 den3Sempl2: number | null; setDen3Sempl2: (v: number | null) => void;
 num3Sempl2: number | null; setNum3Sempl2: (v: number | null) => void;
 num1IntS: number | null; setNum1IntS: (v: number | null) => void;
 den1IntS: number | null; setDen1IntS: (v: number | null) => void;
 num2IntS: number | null; setNum2IntS: (v: number | null) => void;
 den2IntS: number | null; setDen2IntS: (v: number | null) => void;
 num3IntS: number | null; setNum3IntS: (v: number | null) => void;
 den3IntS: number | null; setDen3IntS: (v: number | null) => void;
 num4IntS: number | null; setNum4IntS: (v: number | null) => void;
 den4IntS: number | null; setDen4IntS: (v: number | null) => void;
 numeratoreFinaleUtente: number | null; setNumeratoreFinaleUtente: (v: number | null) => void;
 denominatoreFinaleUtente: number | null; setDenominatoreFinaleUtente: (v: number | null) => void;
 risultatoFinaleUtente: string; feedbackFinale: { testo: string; corretto: boolean } | null;
 verificaFinale: (v: string) => void;
 onNew: () => void;
 generatingPdf: boolean;
}

function MulDivExercise({
 num1, den1, num2, den2, num3, den3, num4, den4, showThirdFraction, showFourthFraction,
 op, computed,
 num1Semplificato, setNum1Semplificato,
 den2Semplificato, setDen2Semplificato,
 den1Semplificato, setDen1Semplificato,
 num2Semplificato, setNum2Semplificato,
 num3Semplificato, setNum3Semplificato,
 den4Semplificato, setDen4Semplificato,
 den3Semplificato, setDen3Semplificato,
 num4Semplificato, setNum4Semplificato,
 den2Sempl2, setDen2Sempl2,
 num2Sempl2, setNum2Sempl2,
 den3Sempl2, setDen3Sempl2,
 num3Sempl2, setNum3Sempl2,
 num1IntS, setNum1IntS,
 den1IntS, setDen1IntS,
 num2IntS, setNum2IntS,
 den2IntS, setDen2IntS,
 num3IntS, setNum3IntS,
 den3IntS, setDen3IntS,
 num4IntS, setNum4IntS,
 den4IntS, setDen4IntS,
 numeratoreFinaleUtente, setNumeratoreFinaleUtente,
 denominatoreFinaleUtente, setDenominatoreFinaleUtente,
 risultatoFinaleUtente, feedbackFinale, verificaFinale, onNew, generatingPdf,
}: MulDivExerciseProps) {
 const nd1 = Math.abs(den1 ?? 1);
 const nd2 = Math.abs(den2 ?? 1);

 const dNum1S = num1IntS ?? (num1Semplificato !== null ? num1Semplificato :"...");
 const dDen2S = den2IntS ?? den2Sempl2 ?? (den2Semplificato !== null ? den2Semplificato :"...");
 const dDen1S = den1IntS ?? (den1Semplificato !== null ? den1Semplificato :"...");
 const dNum2S = num2IntS ?? num2Sempl2 ?? (num2Semplificato !== null ? num2Semplificato :"...");
 const dNum3S = num3IntS ?? num3Sempl2 ?? (num3Semplificato !== null ? num3Semplificato :"...");
 const dDen4S = den4IntS ?? (den4Semplificato !== null ? den4Semplificato :"...");
 const dDen3S = den3IntS ?? den3Sempl2 ?? (den3Semplificato !== null ? den3Semplificato :"...");
 const dNum4S = num4IntS ?? (num4Semplificato !== null ? num4Semplificato :"...");
 // Most up-to-date den1 value after sequential simplifications
 const dDen1Final = dDen1S;
const dDen4S_final = den4IntS ?? (den4Semplificato !== null ? den4Semplificato : "...");

 // Display the initial operation with colors
 const displayNum2 = computed.displayNum2;
 const displayDen2 = computed.displayDen2;
 const wrapParens = num2 < 0 && op ==="/";

 // ═══ Valori corretti — SEMPLIFICAZIONE A CROCE A COPPIE ═══
 // Pair 1 (1st ↔ 2nd): S1 = num1↔den2, S2 = den1↔num2
 const mcd1 = computed.divCom1;
 const num1Correct = mcd1 > 1 ? Math.round(Math.abs(num1) / mcd1) * (num1 < 0 ? -1 : 1) : num1;
 const den2Correct = mcd1 > 1 ? Math.round(Math.abs(computed.actualDen2) / mcd1) : Math.abs(computed.actualDen2);
 const mcd2 = computed.divCom2;
 const den1Correct = mcd2 > 1 ? Math.round(nd1 / mcd2) : nd1;
 const num2Correct = mcd2 > 1 ? Math.round(Math.abs(computed.actualNum2) / mcd2) * (computed.actualNum2 < 0 ? -1 : 1) : computed.actualNum2;
 const s12Correct = num1Semplificato === num1Correct && den2Semplificato === den2Correct && den1Semplificato === den1Correct && num2Semplificato === num2Correct;

 // Pair 2 (2nd ↔ 3rd): S3 = num3↔den2S, S4 = den3↔num2S
 const den2S = den2Semplificato ?? computed.actualDen2;
 const mcd3 = computed.hasThird ? gcd(Math.abs(computed.actualNum3), Math.abs(den2S)) : 0;
 const num3Correct = mcd3 > 1 ? Math.round(Math.abs(computed.actualNum3) / mcd3) * (computed.actualNum3 < 0 ? -1 : 1) : computed.actualNum3;
 const den2S2Correct = mcd3 > 1 ? Math.round(Math.abs(den2S) / mcd3) : Math.abs(den2S);
 const num2S = num2Semplificato ?? computed.actualNum2;
 const mcd4 = computed.hasThird ? gcd(Math.abs(computed.actualDen3), Math.abs(num2S)) : 0;
 const den3Correct = mcd4 > 1 ? Math.round(Math.abs(computed.actualDen3) / mcd4) : Math.abs(computed.actualDen3);
 const num2S2Correct = mcd4 > 1 ? Math.round(Math.abs(num2S) / mcd4) * (num2S < 0 ? -1 : 1) : num2S;
 const s34Correct = computed.hasThird ? num3Semplificato === num3Correct && den2Sempl2 === den2S2Correct && den3Semplificato === den3Correct && num2Sempl2 === num2S2Correct : false;
 const showPair2 = computed.hasThird && s12Correct;

 // Pair 3 (3rd ↔ 4th): S5 = num4↔den3S, S6 = den4↔num3S
 const den3S = den3Semplificato ?? computed.displayDen3;
 const mcd5 = computed.hasFourth ? gcd(Math.abs(computed.actualNum4), Math.abs(den3S)) : 0;
 const num4Correct = mcd5 > 1 ? Math.round(Math.abs(computed.actualNum4) / mcd5) * (computed.actualNum4 < 0 ? -1 : 1) : computed.actualNum4;
 const den3S2Correct = mcd5 > 1 ? Math.round(Math.abs(den3S) / mcd5) : Math.abs(den3S);
 const num3S = num3Semplificato ?? computed.actualNum3;
 const mcd6 = computed.hasFourth ? gcd(Math.abs(computed.actualDen4), Math.abs(num3S)) : 0;
 const den4Correct = mcd6 > 1 ? Math.round(Math.abs(computed.actualDen4) / mcd6) : Math.abs(computed.actualDen4);
 const num3S2Correct = mcd6 > 1 ? Math.round(Math.abs(num3S) / mcd6) * (num3S < 0 ? -1 : 1) : num3S;
 const s56Correct = computed.hasFourth ? num4Semplificato === num4Correct && den3Sempl2 === den3S2Correct && den4Semplificato === den4Correct && num3Sempl2 === num3S2Correct : false;
 const showPair3 = computed.hasFourth && s12Correct && s34Correct;

 // Internal (within-fraction) simplification
 const allCrossDone = s12Correct && (!computed.hasThird || s34Correct) && (!computed.hasFourth || s56Correct);
 const n1cross = num1Semplificato ?? num1;
 const d1cross = den1Semplificato ?? nd1;
 const n2cross = num2Sempl2 ?? num2Semplificato ?? computed.actualNum2;
 const d2cross = den2Sempl2 ?? den2Semplificato ?? computed.actualDen2;
 const n3cross = computed.hasThird ? (num3Sempl2 ?? num3Semplificato ?? computed.actualNum3) : 1;
 const d3cross = computed.hasThird ? (den3Sempl2 ?? den3Semplificato ?? computed.displayDen3) : 1;
 const n4cross = computed.hasFourth ? (num4Semplificato ?? computed.actualNum4) : 1;
 const d4cross = computed.hasFourth ? (den4Semplificato ?? computed.displayDen4) : 1;
 const gcdInt1 = gcd(Math.abs(n1cross), Math.abs(d1cross));
 const gcdInt2 = gcd(Math.abs(n2cross), Math.abs(d2cross));
 const gcdInt3 = computed.hasThird ? gcd(Math.abs(n3cross), Math.abs(d3cross)) : 0;
 const gcdInt4 = computed.hasFourth ? gcd(Math.abs(n4cross), Math.abs(d4cross)) : 0;
 const anyInternal = gcdInt1 > 1 || gcdInt2 > 1 || gcdInt3 > 1 || gcdInt4 > 1;
 const showInternal = allCrossDone && anyInternal;
 const n1IntCorrect = gcdInt1 > 1 ? Math.round(Math.abs(n1cross) / gcdInt1) * (n1cross < 0 ? -1 : 1) : n1cross;
 const d1IntCorrect = gcdInt1 > 1 ? Math.round(Math.abs(d1cross) / gcdInt1) : d1cross;
 const n2IntCorrect = gcdInt2 > 1 ? Math.round(Math.abs(n2cross) / gcdInt2) * (n2cross < 0 ? -1 : 1) : n2cross;
 const d2IntCorrect = gcdInt2 > 1 ? Math.round(Math.abs(d2cross) / gcdInt2) : d2cross;
 const n3IntCorrect = gcdInt3 > 1 ? Math.round(Math.abs(n3cross) / gcdInt3) * (n3cross < 0 ? -1 : 1) : n3cross;
 const d3IntCorrect = gcdInt3 > 1 ? Math.round(Math.abs(d3cross) / gcdInt3) : d3cross;
 const n4IntCorrect = gcdInt4 > 1 ? Math.round(Math.abs(n4cross) / gcdInt4) * (n4cross < 0 ? -1 : 1) : n4cross;
 const d4IntCorrect = gcdInt4 > 1 ? Math.round(Math.abs(d4cross) / gcdInt4) : d4cross;
 const int1Done = gcdInt1 > 1 ? (num1IntS === n1IntCorrect && den1IntS === d1IntCorrect) : true;
 const int2Done = gcdInt2 > 1 ? (num2IntS === n2IntCorrect && den2IntS === d2IntCorrect) : true;
 const int3Done = gcdInt3 > 1 ? (num3IntS === n3IntCorrect && den3IntS === d3IntCorrect) : true;
 const int4Done = gcdInt4 > 1 ? (num4IntS === n4IntCorrect && den4IntS === d4IntCorrect) : true;
 const allInternalDone = int1Done && int2Done && int3Done && int4Done;

 // Auto-verifica: quando entrambi i valori sono inseriti, determina automaticamente il risultato
 const lastVerifiedRef = useRef<string>("");
 useEffect(() => {
  if (numeratoreFinaleUtente !== null && denominatoreFinaleUtente !== null) {
   const n = numeratoreFinaleUtente;
   const d = denominatoreFinaleUtente ?? 1;
   const resultStr = d === 1 ? String(n) : `${n}/${d}`;
   if (resultStr !== lastVerifiedRef.current && !resultStr.includes("?")) {
    lastVerifiedRef.current = resultStr;
    verificaFinale(resultStr);
   }
  }
 }, [numeratoreFinaleUtente, denominatoreFinaleUtente, verificaFinale]);

 const numU = numeratoreFinaleUtente;
 const denU = denominatoreFinaleUtente;

 return (
  <div className="space-y-5 max-w-2xl mx-auto">
   {/* Step 1: Initial multiplication */}
   <div className="p-4 rounded-xl bg-card/40 border border-border space-y-6 leading-loose">
    <p className="text-base font-bold text-primary">1. Moltiplicazione e inversione</p>

    {/* Notebook Guide: Step 1 */}
    <div className="flex justify-center items-center gap-3 text-lg flex-wrap">
     <FractionDisplay numerator={num1} denominator={nd1} numClass="text-orange-400"denClass="text-sky-400"/>
     <span className="text-xl font-bold text-foreground">×</span>
     {wrapParens && <span className="text-xl text-foreground">(</span>}
     <FractionDisplay numerator={displayNum2} denominator={displayDen2} numClass="text-red-400"denClass="text-blue-400"/>
     {wrapParens && <span className="text-xl text-foreground">)</span>}
     {computed.hasThird && (<>
      <span className="text-xl font-bold text-foreground">×</span>
      <FractionDisplay numerator={computed.displayNum3} denominator={computed.displayDen3} numClass="text-green-500"denClass="text-teal-500"/>
     </>)}
     {computed.hasFourth && (<>
      <span className="text-xl font-bold text-foreground">×</span>
      <FractionDisplay numerator={computed.displayNum4} denominator={computed.displayDen4} numClass="text-purple-500"denClass="text-pink-500"/>
     </>)}
    </div>
    <NotebookGuide title="RICOPIA SUL QUADERNO:"visible={true} forceOpen={generatingPdf}>
     {op ==="/"&& (
      <div className="flex justify-center my-2">
       <div className="flex items-center gap-2 text-base font-mono bg-muted px-3.5 py-2 rounded-lg flex-wrap justify-center">
        {/* Frazioni originali con ÷ */}
        <FractionDisplay numerator={num1} denominator={nd1} size="xs"/>
        <span className="text-base">÷</span>
        <FractionDisplay numerator={num2} denominator={nd2} size="xs"/>
        {computed.hasThird && (<>
         <span className="text-base">÷</span>
         <FractionDisplay numerator={num3!} denominator={computed.nd3} size="xs"/>
        </>)}
        {computed.hasFourth && (<>
         <span className="text-base">÷</span>
         <FractionDisplay numerator={num4!} denominator={computed.nd4} size="xs"/>
        </>)}
        <span className="text-base">→</span>
        {/* Frazioni dopo inversione: 1ª invariata, tutte le altre invertite */}
        <FractionDisplay numerator={num1} denominator={nd1} size="xs"/>
        <span className="text-base">×</span>
        <FractionDisplay numerator={displayNum2} denominator={displayDen2} size="xs"/>
        {computed.hasThird && (<>
         <span className="text-base">×</span>
         <FractionDisplay numerator={computed.displayNum3!} denominator={computed.displayDen3!} size="xs"/>
        </>)}
        {computed.hasFourth && (<>
         <span className="text-base">×</span>
         <FractionDisplay numerator={computed.displayNum4!} denominator={computed.displayDen4!} size="xs"/>
        </>)}
       </div>
      </div>
     )}
     <div className="flex justify-center my-2">
      <div className="flex items-center gap-2 text-base bg-muted px-3.5 py-2 rounded-lg flex-wrap justify-center">
       <FractionDisplay numerator={num1} denominator={nd1} numClass="text-orange-400"denClass="text-sky-400"size="xs"/>
       <span className="text-base font-bold">×</span>
       <FractionDisplay numerator={displayNum2} denominator={displayDen2} numClass="text-red-400"denClass="text-blue-400"size="xs"/>
       {computed.hasThird && (<>
        <span className="text-base font-bold">×</span>
        <FractionDisplay numerator={computed.displayNum3} denominator={computed.displayDen3} numClass="text-green-500"denClass="text-teal-500"size="xs"/>
       </>)}
       {computed.hasFourth && (<>
        <span className="text-base font-bold">×</span>
        <FractionDisplay numerator={computed.displayNum4} denominator={computed.displayDen4} numClass="text-purple-500"denClass="text-pink-500"size="xs"/>
       </>)}
      </div>
     </div>
    </NotebookGuide>

   </div>

   {/* Step 2: Cross simplification */}
   <div className="p-4 rounded-xl bg-card/40 border border-border space-y-6 leading-loose">
    <p className="text-base font-bold text-amber-900">2. SEMPLIFICAZIONE TRA FRAZIONI</p>

    {/* ═══ PAIR 1: 1ª frazione ↔ 2ª frazione ═══ */}
    <div className="space-y-2">
     <p className="text-sm font-medium text-amber-900/80">📐 Coppia 1: 1ª frazione ↔ 2ª frazione</p>
     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* S1: num1 ↔ den2 */}
      <div className="bg-orange-50/60 border border-orange-200 rounded-lg p-3">
       <p className="text-xs font-medium text-center mb-2">
        <span className="text-orange-500 font-bold">Num 1ª ({num1})</span>{" "}
        ↔{" "}
        <span className="text-blue-400 font-bold">Den 2ª ({computed.actualDen2})</span>
        {mcd1 > 1 ? <> — MCD <b>{mcd1}</b></> : <> — nessun MCD</>}
       </p>
       <div className="flex gap-2 justify-center flex-wrap">
        <NumberInputCanvas value={num1Semplificato} onChange={setNum1Semplificato} label={mcd1 > 1 ? `${num1} : ${mcd1} = ?` : `Copia ${num1}`} colorClass="text-orange-400" labelOnTop />
        <NumberInputCanvas value={den2Semplificato} onChange={setDen2Semplificato} label={mcd1 > 1 ? `${computed.actualDen2} : ${mcd1} = ?` : `Copia ${computed.actualDen2}`} colorClass="text-blue-400" labelOnTop />
       </div>
       {num1Semplificato !== null && den2Semplificato !== null && (
        <p className={cn("text-xs font-bold text-center mt-1", num1Semplificato === num1Correct && den2Semplificato === den2Correct ? "text-green-600" : "text-red-500")}>
         {num1Semplificato === num1Correct && den2Semplificato === den2Correct ? "✅ CORRETTO" : "❌ RIPROVA"}
        </p>
       )}
      </div>
      {/* S2: den1 ↔ num2 */}
      <div className="bg-red-50/60 border border-red-200 rounded-lg p-3">
       <p className="text-xs font-medium text-center mb-2">
        <span className="text-red-400 font-bold">Num 2ª ({computed.actualNum2})</span>{" "}
        ↔{" "}
        <span className="text-sky-400 font-bold">Den 1ª ({nd1})</span>
        {mcd2 > 1 ? <> — MCD <b>{mcd2}</b></> : <> — nessun MCD</>}
       </p>
       <div className="flex gap-2 justify-center flex-wrap">
        <NumberInputCanvas value={num2Semplificato} onChange={setNum2Semplificato} label={mcd2 > 1 ? `${computed.actualNum2} : ${mcd2} = ?` : `Copia ${computed.actualNum2}`} colorClass="text-red-400" labelOnTop allowNegative />
        <NumberInputCanvas value={den1Semplificato} onChange={setDen1Semplificato} label={mcd2 > 1 ? `${nd1} : ${mcd2} = ?` : `Copia ${nd1}`} colorClass="text-sky-400" labelOnTop />
       </div>
       {num2Semplificato !== null && den1Semplificato !== null && (
        <p className={cn("text-xs font-bold text-center mt-1", num2Semplificato === num2Correct && den1Semplificato === den1Correct ? "text-green-600" : "text-red-500")}>
         {num2Semplificato === num2Correct && den1Semplificato === den1Correct ? "✅ CORRETTO" : "❌ RIPROVA"}
        </p>
       )}
      </div>
     </div>
    </div>

    {/* ═══ PAIR 2: 2ª frazione ↔ 3ª frazione ═══ */}
    {showPair2 && (
     <div className="space-y-2">
      <p className="text-sm font-medium text-amber-900/80">📐 Coppia 2: 2ª frazione (sempl.) ↔ 3ª frazione</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
       {/* S3: num3 ↔ den2S */}
       <div className="bg-green-50/60 border border-green-200 rounded-lg p-3">
        <p className="text-xs font-medium text-center mb-2">
         <span className="text-green-500 font-bold">Num 3ª ({computed.actualNum3})</span>{" "}
         ↔{" "}
         <span className="text-blue-400 font-bold">Den 2ª sempl. ({den2S})</span>
         {mcd3 > 1 ? <> — MCD <b>{mcd3}</b></> : <> — nessun MCD</>}
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
         <NumberInputCanvas value={num3Semplificato} onChange={setNum3Semplificato} label={mcd3 > 1 ? `${computed.actualNum3} : ${mcd3} = ?` : `Copia ${computed.actualNum3}`} colorClass="text-green-500" labelOnTop allowNegative />
         <NumberInputCanvas value={den2Sempl2} onChange={setDen2Sempl2} label={mcd3 > 1 ? `${den2S} : ${mcd3} = ?` : `Copia ${den2S}`} colorClass="text-blue-400" labelOnTop />
        </div>
        {num3Semplificato !== null && den2Sempl2 !== null && (
         <p className={cn("text-xs font-bold text-center mt-1", num3Semplificato === num3Correct && den2Sempl2 === den2S2Correct ? "text-green-600" : "text-red-500")}>
          {num3Semplificato === num3Correct && den2Sempl2 === den2S2Correct ? "✅ CORRETTO" : "❌ RIPROVA"}
         </p>
        )}
       </div>
       {/* S4: den3 ↔ num2S */}
       <div className="bg-teal-50/60 border border-teal-200 rounded-lg p-3">
        <p className="text-xs font-medium text-center mb-2">
         <span className="text-teal-500 font-bold">Den 3ª ({computed.actualDen3})</span>{" "}
         ↔{" "}
         <span className="text-red-400 font-bold">Num 2ª sempl. ({num2S})</span>
         {mcd4 > 1 ? <> — MCD <b>{mcd4}</b></> : <> — nessun MCD</>}
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
         <NumberInputCanvas value={den3Semplificato} onChange={setDen3Semplificato} label={mcd4 > 1 ? `${computed.actualDen3} : ${mcd4} = ?` : `Copia ${computed.actualDen3}`} colorClass="text-teal-500" labelOnTop />
         <NumberInputCanvas value={num2Sempl2} onChange={setNum2Sempl2} label={mcd4 > 1 ? `${num2S} : ${mcd4} = ?` : `Copia ${num2S}`} colorClass="text-red-400" labelOnTop allowNegative />
        </div>
        {den3Semplificato !== null && num2Sempl2 !== null && (
         <p className={cn("text-xs font-bold text-center mt-1", den3Semplificato === den3Correct && num2Sempl2 === num2S2Correct ? "text-green-600" : "text-red-500")}>
          {den3Semplificato === den3Correct && num2Sempl2 === num2S2Correct ? "✅ CORRETTO" : "❌ RIPROVA"}
         </p>
        )}
       </div>
      </div>
     </div>
    )}

    {/* ═══ PAIR 3: 3ª frazione ↔ 4ª frazione ═══ */}
    {showPair3 && (
     <div className="space-y-2">
      <p className="text-sm font-medium text-amber-900/80">📐 Coppia 3: 3ª frazione (sempl.) ↔ 4ª frazione</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
       {/* S5: num4 ↔ den3S */}
       <div className="bg-purple-50/60 border border-purple-200 rounded-lg p-3">
        <p className="text-xs font-medium text-center mb-2">
         <span className="text-purple-500 font-bold">Num 4ª ({computed.actualNum4})</span>{" "}
         ↔{" "}
         <span className="text-teal-500 font-bold">Den 3ª sempl. ({den3S})</span>
         {mcd5 > 1 ? <> — MCD <b>{mcd5}</b></> : <> — nessun MCD</>}
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
         <NumberInputCanvas value={num4Semplificato} onChange={setNum4Semplificato} label={mcd5 > 1 ? `${computed.actualNum4} : ${mcd5} = ?` : `Copia ${computed.actualNum4}`} colorClass="text-purple-500" labelOnTop allowNegative />
         <NumberInputCanvas value={den3Sempl2} onChange={setDen3Sempl2} label={mcd5 > 1 ? `${den3S} : ${mcd5} = ?` : `Copia ${den3S}`} colorClass="text-teal-500" labelOnTop />
        </div>
        {num4Semplificato !== null && den3Sempl2 !== null && (
         <p className={cn("text-xs font-bold text-center mt-1", num4Semplificato === num4Correct && den3Sempl2 === den3S2Correct ? "text-green-600" : "text-red-500")}>
          {num4Semplificato === num4Correct && den3Sempl2 === den3S2Correct ? "✅ CORRETTO" : "❌ RIPROVA"}
         </p>
        )}
       </div>
       {/* S6: den4 ↔ num3S */}
       <div className="bg-pink-50/60 border border-pink-200 rounded-lg p-3">
        <p className="text-xs font-medium text-center mb-2">
         <span className="text-pink-500 font-bold">Den 4ª ({computed.actualDen4})</span>{" "}
         ↔{" "}
         <span className="text-green-500 font-bold">Num 3ª sempl. ({num3S})</span>
         {mcd6 > 1 ? <> — MCD <b>{mcd6}</b></> : <> — nessun MCD</>}
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
         <NumberInputCanvas value={den4Semplificato} onChange={setDen4Semplificato} label={mcd6 > 1 ? `${computed.actualDen4} : ${mcd6} = ?` : `Copia ${computed.actualDen4}`} colorClass="text-pink-500" labelOnTop />
         <NumberInputCanvas value={num3Sempl2} onChange={setNum3Sempl2} label={mcd6 > 1 ? `${num3S} : ${mcd6} = ?` : `Copia ${num3S}`} colorClass="text-green-500" labelOnTop allowNegative />
        </div>
        {den4Semplificato !== null && num3Sempl2 !== null && (
         <p className={cn("text-xs font-bold text-center mt-1", den4Semplificato === den4Correct && num3Sempl2 === num3S2Correct ? "text-green-600" : "text-red-500")}>
          {den4Semplificato === den4Correct && num3Sempl2 === num3S2Correct ? "✅ CORRETTO" : "❌ RIPROVA"}
         </p>
        )}
       </div>
      </div>
     </div>
    )}

    {/* INTERNAL SIMPLIFICATION */}
    {showInternal && (
     <div className="space-y-2 border-2 border-amber-300 rounded-lg p-4 bg-amber-50/40">
      <p className="text-sm font-bold text-amber-900">🔍 SEMPLIFICAZIONE INTERNA DELLE FRAZIONI</p>
      <p className="text-xs text-muted-foreground">Dopo le semplificazioni a croce, alcune frazioni possono ancora essere semplificate tra numeratore e denominatore.</p>
      <div className="flex flex-wrap justify-center gap-3">
       {gcdInt1 > 1 && (
        <div className="bg-orange-50/60 border border-orange-200 rounded-lg p-3">
         <p className="text-xs font-medium text-center mb-2">
          <span className="text-orange-400 font-bold">1ª frazione: {n1cross}/{d1cross}</span> —{" "}
          <span className="font-bold">MCD {gcdInt1}</span>
         </p>
         <div className="flex gap-2 justify-center flex-wrap">
          <NumberInputCanvas value={num1IntS} onChange={setNum1IntS} label={`${n1cross} : ${gcdInt1} = ?`} colorClass="text-orange-400" labelOnTop />
          <NumberInputCanvas value={den1IntS} onChange={setDen1IntS} label={`${d1cross} : ${gcdInt1} = ?`} colorClass="text-sky-400" labelOnTop />
         </div>
         {num1IntS !== null && den1IntS !== null && (
          <p className={cn("text-xs font-bold text-center mt-1", num1IntS === n1IntCorrect && den1IntS === d1IntCorrect ? "text-green-600" : "text-red-500")}>
           {num1IntS === n1IntCorrect && den1IntS === d1IntCorrect ? "✅ CORRETTO" : "❌ RIPROVA"}
          </p>
         )}
        </div>
       )}
       {gcdInt2 > 1 && (
        <div className="bg-red-50/60 border border-red-200 rounded-lg p-3">
         <p className="text-xs font-medium text-center mb-2">
          <span className="text-red-400 font-bold">2ª frazione: {n2cross}/{d2cross}</span> —{" "}
          <span className="font-bold">MCD {gcdInt2}</span>
         </p>
         <div className="flex gap-2 justify-center flex-wrap">
          <NumberInputCanvas value={num2IntS} onChange={setNum2IntS} label={`${n2cross} : ${gcdInt2} = ?`} colorClass="text-red-400" labelOnTop allowNegative />
          <NumberInputCanvas value={den2IntS} onChange={setDen2IntS} label={`${d2cross} : ${gcdInt2} = ?`} colorClass="text-blue-400" labelOnTop />
         </div>
         {num2IntS !== null && den2IntS !== null && (
          <p className={cn("text-xs font-bold text-center mt-1", num2IntS === n2IntCorrect && den2IntS === d2IntCorrect ? "text-green-600" : "text-red-500")}>
           {num2IntS === n2IntCorrect && den2IntS === d2IntCorrect ? "✅ CORRETTO" : "❌ RIPROVA"}
          </p>
         )}
        </div>
       )}
       {computed.hasThird && gcdInt3 > 1 && (
        <div className="bg-green-50/60 border border-green-200 rounded-lg p-3">
         <p className="text-xs font-medium text-center mb-2">
          <span className="text-green-500 font-bold">3ª frazione: {n3cross}/{d3cross}</span> —{" "}
          <span className="font-bold">MCD {gcdInt3}</span>
         </p>
         <div className="flex gap-2 justify-center flex-wrap">
          <NumberInputCanvas value={num3IntS} onChange={setNum3IntS} label={`${n3cross} : ${gcdInt3} = ?`} colorClass="text-green-500" labelOnTop allowNegative />
          <NumberInputCanvas value={den3IntS} onChange={setDen3IntS} label={`${d3cross} : ${gcdInt3} = ?`} colorClass="text-teal-500" labelOnTop />
         </div>
         {num3IntS !== null && den3IntS !== null && (
          <p className={cn("text-xs font-bold text-center mt-1", num3IntS === n3IntCorrect && den3IntS === d3IntCorrect ? "text-green-600" : "text-red-500")}>
           {num3IntS === n3IntCorrect && den3IntS === d3IntCorrect ? "✅ CORRETTO" : "❌ RIPROVA"}
          </p>
         )}
        </div>
       )}
       {computed.hasFourth && gcdInt4 > 1 && (
        <div className="bg-purple-50/60 border border-purple-200 rounded-lg p-3">
         <p className="text-xs font-medium text-center mb-2">
          <span className="text-purple-500 font-bold">4ª frazione: {n4cross}/{d4cross}</span> —{" "}
          <span className="font-bold">MCD {gcdInt4}</span>
         </p>
         <div className="flex gap-2 justify-center flex-wrap">
          <NumberInputCanvas value={num4IntS} onChange={setNum4IntS} label={`${n4cross} : ${gcdInt4} = ?`} colorClass="text-purple-500" labelOnTop allowNegative />
          <NumberInputCanvas value={den4IntS} onChange={setDen4IntS} label={`${d4cross} : ${gcdInt4} = ?`} colorClass="text-pink-500" labelOnTop />
         </div>
         {num4IntS !== null && den4IntS !== null && (
          <p className={cn("text-xs font-bold text-center mt-1", num4IntS === n4IntCorrect && den4IntS === d4IntCorrect ? "text-green-600" : "text-red-500")}>
           {num4IntS === n4IntCorrect && den4IntS === d4IntCorrect ? "✅ CORRETTO" : "❌ RIPROVA"}
          </p>
         )}
        </div>
       )}
      </div>
     </div>
    )}

   </div>

   {/* ═══ RICOPIA SUL QUADERNO — stile penna su carta ═══ */}
    <NotebookGuide title="RICOPIA SUL QUADERNO:"visible={s12Correct && (!computed.hasThird || s34Correct) && (!computed.hasFourth || s56Correct) && (!showInternal || allInternalDone)} forceOpen={generatingPdf}>
     {(!(mcd1 > 1) && !(mcd2 > 1) && !(mcd3 > 1) && !(mcd4 > 1) && !(mcd5 > 1) && !(mcd6 > 1)) ? (
      <p className="text-base text-center text-primary py-1">NESSUNA SEMPLIFICAZIONE DA FARE</p>
     ) : (
      <div className="flex justify-center items-center gap-3 sm:gap-4 my-2 flex-wrap font-serif text-center">
       {/* ── Frazione 1 ── */}
       <div className="flex flex-col items-center">
        {/* Numeratore */}
        <span className="relative inline-flex flex-col items-center">
         {(() => { const f = typeof dNum1S === 'string' ? Number(dNum1S) : dNum1S; const o = num1; return f !== o ? <span className="text-[12px] leading-none text-muted-foreground">{f}</span> : null; })()}
         <span className="relative inline-block">
          <span className="font-bold font-serif text-[22px] text-orange-600">{num1}</span>
          {(() => { const f = typeof dNum1S === 'string' ? Number(dNum1S) : dNum1S; return f !== num1 ? (<svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="4" y1="94" x2="96" y2="6" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" opacity="0.8"/></svg>) : null; })()}
         </span>
        </span>
        {/* Linea di frazione */}
        <div className="w-10 h-[2px] bg-black my-0.5" />
        {/* Denominatore */}
        <span className="relative inline-flex flex-col items-center">
         <span className="relative inline-block">
          <span className="font-bold font-serif text-[22px] text-sky-600">{nd1}</span>
          {(() => { const f = typeof dDen1S === 'string' ? Number(dDen1S) : dDen1S; return f !== nd1 ? (<svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="4" y1="94" x2="96" y2="6" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" opacity="0.8"/></svg>) : null; })()}
         </span>
         {(() => { const f = typeof dDen1S === 'string' ? Number(dDen1S) : dDen1S; return f !== nd1 ? <span className="text-[12px] leading-none text-muted-foreground">{f}</span> : null; })()}
        </span>
       </div>

       <span className="text-[22px] font-bold">×</span>

       {/* ── Frazione 2 ── */}
       <div className="flex flex-col items-center">
        <span className="relative inline-flex flex-col items-center">
         {(() => { const f = typeof dNum2S === 'string' ? Number(dNum2S) : dNum2S; const o = num2; return f !== o ? <span className="text-[12px] leading-none text-muted-foreground">{f}</span> : null; })()}
         <span className="relative inline-block">
          <span className="font-bold font-serif text-[22px] text-red-500">{num2}</span>
          {(() => { const f = typeof dNum2S === 'string' ? Number(dNum2S) : dNum2S; return f !== num2 ? (<svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="4" y1="94" x2="96" y2="6" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" opacity="0.8"/></svg>) : null; })()}
         </span>
        </span>
        <div className="w-10 h-[2px] bg-black my-0.5" />
        <span className="relative inline-flex flex-col items-center">
         <span className="relative inline-block">
          <span className="font-bold font-serif text-[22px] text-blue-500">{nd2}</span>
          {(() => { const f = typeof dDen2S === 'string' ? Number(dDen2S) : dDen2S; return f !== nd2 ? (<svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="4" y1="94" x2="96" y2="6" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" opacity="0.8"/></svg>) : null; })()}
         </span>
         {(() => { const f = typeof dDen2S === 'string' ? Number(dDen2S) : dDen2S; return f !== nd2 ? <span className="text-[12px] leading-none text-muted-foreground">{f}</span> : null; })()}
        </span>
       </div>

       {/* ── Frazione 3 ── */}
       {computed.hasThird && (<>
        <span className="text-[22px] font-bold">×</span>
        <div className="flex flex-col items-center">
         <span className="relative inline-flex flex-col items-center">
          {(() => { const f = typeof dNum3S === 'string' ? Number(dNum3S) : dNum3S; const o = num3 ?? 0; return f !== o ? <span className="text-[12px] leading-none text-muted-foreground">{f}</span> : null; })()}
          <span className="relative inline-block">
           <span className="font-bold font-serif text-[22px] text-green-600">{num3}</span>
           {(() => { const f = typeof dNum3S === 'string' ? Number(dNum3S) : dNum3S; return f !== (num3 ?? 0) ? (<svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="4" y1="94" x2="96" y2="6" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" opacity="0.8"/></svg>) : null; })()}
          </span>
         </span>
         <div className="w-10 h-[2px] bg-black my-0.5" />
         <span className="relative inline-flex flex-col items-center">
          <span className="relative inline-block">
           <span className="font-bold font-serif text-[22px] text-teal-600">{Math.abs(den3 ?? 1)}</span>
           {(() => { const f = typeof dDen3S === 'string' ? Number(dDen3S) : dDen3S; return f !== Math.abs(den3 ?? 1) ? (<svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="4" y1="94" x2="96" y2="6" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" opacity="0.8"/></svg>) : null; })()}
          </span>
          {(() => { const f = typeof dDen3S === 'string' ? Number(dDen3S) : dDen3S; return f !== Math.abs(den3 ?? 1) ? <span className="text-[12px] leading-none text-muted-foreground">{f}</span> : null; })()}
         </span>
        </div>
       </>)}

       {/* ── Frazione 4 ── */}
       {computed.hasFourth && (<>
        <span className="text-[22px] font-bold">×</span>
        <div className="flex flex-col items-center">
         <span className="relative inline-flex flex-col items-center">
          {(() => { const f = typeof dNum4S === 'string' ? Number(dNum4S) : dNum4S; const o = num4 ?? 0; return f !== o ? <span className="text-[12px] leading-none text-muted-foreground">{f}</span> : null; })()}
          <span className="relative inline-block">
           <span className="font-bold font-serif text-[22px] text-purple-600">{num4}</span>
           {(() => { const f = typeof dNum4S === 'string' ? Number(dNum4S) : dNum4S; return f !== (num4 ?? 0) ? (<svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="4" y1="94" x2="96" y2="6" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" opacity="0.8"/></svg>) : null; })()}
          </span>
         </span>
         <div className="w-10 h-[2px] bg-black my-0.5" />
         <span className="relative inline-flex flex-col items-center">
          <span className="relative inline-block">
           <span className="font-bold font-serif text-[22px] text-pink-600">{Math.abs(den4 ?? 1)}</span>
           {(() => { const f = typeof dDen4S === 'string' ? Number(dDen4S) : dDen4S; return f !== Math.abs(den4 ?? 1) ? (<svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="4" y1="94" x2="96" y2="6" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" opacity="0.8"/></svg>) : null; })()}
          </span>
          {(() => { const f = typeof dDen4S === 'string' ? Number(dDen4S) : dDen4S; return f !== Math.abs(den4 ?? 1) ? <span className="text-[12px] leading-none text-muted-foreground">{f}</span> : null; })()}
         </span>
        </div>
       </>)}

       {/* ── Risultato finale rimosso (come da richiesta) ── */}
      </div>
     )}
    </NotebookGuide>

    

    {/* Step 3: Final multiplication */}
   <div className="p-4 rounded-xl bg-card/40 border border-border space-y-6 leading-loose">
    <p className="text-base font-bold text-primary">3. Moltiplicazione finale</p>

    {/* Notebook Guide: Step 3 */}
    <div className="space-y-4">
     <div className="flex flex-col items-center">
      <p className="text-base mb-2">
       <span className="text-amber-900">MOLTIPLICAZIONE NUMERATORI:</span>{" "}
       <span className="text-orange-400 font-bold">{dNum1S}</span> · <span className="text-red-400 font-bold">{dNum2S}</span>{computed.hasThird && (<> · <span className="text-green-500 font-bold">{dNum3S}</span></>)}{computed.hasFourth && (<> · <span className="text-purple-500 font-bold">{dNum4S}</span></>)} = <span>RISULTATO NUMERATORE FINALE</span>
      </p>
      <NumberInputCanvas
       value={numeratoreFinaleUtente}
       onChange={setNumeratoreFinaleUtente}
       label="Risultato numeratore finale:"
       colorClass="text-primary"
       labelOnTop
       allowNegative
      />
     </div>
     <div className="flex flex-col items-center">
      <p className="text-base mb-2">
       <span className="text-amber-900">MOLTIPLICAZIONE DENOMINATORI:</span>{" "}
       <span className="text-sky-400 font-bold">{dDen1S}</span> · <span className="text-blue-400 font-bold">{dDen2S}</span>{computed.hasThird && (<> · <span className="text-teal-500 font-bold">{dDen3S}</span></>)}{computed.hasFourth && (<> · <span className="text-pink-500 font-bold">{dDen4S}</span></>)} = <span>RISULTATO DENOMINATORE FINALE</span>
      </p>
      <NumberInputCanvas
       value={denominatoreFinaleUtente}
       onChange={setDenominatoreFinaleUtente}
       label="Risultato denominatore finale:"
       colorClass="text-primary"
       labelOnTop
      />
     </div>
    </div>

    {numU !== null && denU !== null && (
     <div className="flex justify-center mt-3">
      <div className="px-5 py-3 rounded-xl bg-primary/10 border border-border">
       <FractionDisplay
        numerator={numU! < 0 && denU! < 0 ? Math.abs(numU!) : (denU! < 0 ? -Math.abs(numU!) : numU!)}
        denominator={denU! < 0 ? Math.abs(denU!) : denU!}
        size="lg"
       />
      </div>
     </div>
    )}

    {feedbackFinale && (
     <div className={cn(
     "p-3 rounded-lg text-base font-semibold text-center",
      feedbackFinale.corretto
       ?"bg-success/10 text-success border border-success/30"
       :"bg-destructive/10 text-destructive border border-destructive/20",
     )}>
      <span>{feedbackFinale.testo}</span>
     </div>
    )}
    <NotebookGuide title="RICOPIA SUL QUADERNO:"visible={feedbackFinale?.corretto === true} forceOpen={feedbackFinale?.corretto === true || generatingPdf}>
     {(() => {
      const ns1 = num1IntS ?? num1Semplificato ?? 1;
      const ns2 = num2IntS ?? num2Sempl2 ?? num2Semplificato ?? 1;
      const ds1 = den1IntS ?? den1Semplificato ?? 1;
      const ds2 = den2IntS ?? den2Sempl2 ?? den2Semplificato ?? 1;
      const ns3 = computed.hasThird ? (num3IntS ?? num3Sempl2 ?? num3Semplificato ?? 1) : 1;
      const ns4 = computed.hasFourth ? (num4IntS ?? num4Semplificato ?? 1) : 1;
      const ds3 = computed.hasThird ? (den3IntS ?? den3Sempl2 ?? den3Semplificato ?? computed.displayDen3) : 1;
      const ds4 = computed.hasFourth ? (den4IntS ?? den4Semplificato ?? computed.displayDen4) : 1;
      const numCalc = ns1 * ns2 * ns3 * ns4;
      const denCalc = ds1 * ds2 * ds3 * ds4;
      const allEnt = num1Semplificato !== null && num2Semplificato !== null && (!computed.hasThird || num3Semplificato !== null) && (!computed.hasFourth || num4Semplificato !== null) && den1Semplificato !== null && den2Semplificato !== null && (!computed.hasThird || den3Semplificato !== null) && (!computed.hasFourth || den4Semplificato !== null) && (!showInternal || allInternalDone);
      return (<>
       <p className="font-mono text-base mt-2">
        {allEnt
         ? <span className="font-bold text-primary">Numeratori: {ns1} × {ns2}{computed.hasThird ? ` × ${ns3}` : ''}{computed.hasFourth ? ` × ${ns4}` : ''} = {numCalc}</span>
         : <span className="italic">Completa tutte le semplificazioni...</span>
        }
       </p>
       <p className="font-mono text-base">
        {allEnt
         ? <span className="font-bold text-primary">Denominatori: {ds1} × {ds2}{computed.hasThird ? ` × ${ds3}` : ''}{computed.hasFourth ? ` × ${ds4}` : ''} = {denCalc}</span>
         : <span className="italic">Completa tutte le semplificazioni...</span>
        }
       </p>
       {allEnt && (
       <div className="flex justify-center my-2">
        <div className="font-mono text-base text-center bg-muted px-4 py-2 rounded-lg">
         {denCalc === 1 ? (
          <span className="font-bold">{numCalc}</span>
         ) : (
          <>
           <span className="font-bold">{numCalc}</span><br />
           <span className="border-t border-black block mt-1 pt-1">{denCalc}</span>
          </>
         )}
        </div>
       </div>
       )}
       {allEnt && (numCalc !== computed.numFinaleCorretto || denCalc !== computed.denFinaleCorretto) && (
        <p className="text-base text-center flex items-center justify-center gap-2 flex-wrap">
         <FractionDisplay numerator={numCalc} denominator={denCalc} size="sm" />
         <span className="font-bold">=</span>
         <FractionDisplay numerator={computed.numFinaleCorretto} denominator={computed.denFinaleCorretto} size="sm" />
        </p>
       )}
      </>);
     })()}
    </NotebookGuide>

   </div>

   {/* New exercise */}
   <button
    onClick={onNew}
    className="max-w-xs mx-auto w-full py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-base font-bold tracking-widest transition-all duration-200"
   >
    NUOVO ESERCIZIO
   </button>
  </div>
 );
}
