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
 if (b === 0) return a;
 return gcd(b, a % b);
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

 // Mul/Div computed values
 const mulDivComputed = useMemo(() => {
  if (num1 === null || num2 === null) return null;

  const dn1 = den1 ?? 1;
  const dn2 = den2 ?? 1;
  if (dn1 < 1 || dn2 < 1) return null;
  const nd1 = Math.abs(dn1);
  const nd2 = Math.abs(dn2);

  let actualNum2: number;
  let actualDen2: number;
  let displayNum2: number;
  let displayDen2: number;

  if (mulDivOp ==="/") {
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

  const divCom1 = trovaDivisoriComuni(num1, actualDen2);
  const divCom2 = trovaDivisoriComuni(nd1, actualNum2);

  const numFinaleRaw = round2(num1 * actualNum2);
  const denFinaleRaw = round2(nd1 * actualDen2);
  const sempl = semplificaFrazione(numFinaleRaw, denFinaleRaw);

  return {
   actualNum2,
   actualDen2,
   displayNum2,
   displayDen2,
   divCom1,
   divCom2,
   numFinaleRaw,
   denFinaleRaw,
   numFinaleCorretto: sempl.num,
   denFinaleCorretto: sempl.den,
  };
 }, [num1, den1, num2, den2, mulDivOp]);

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
    bodyHtml += `<div style="margin-bottom:20px;text-align:center;page-break-inside:avoid">${el.innerHTML}</div>`;
   });

   const printHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Quaderno — Operazioni con le Frazioni</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Cambria Math',Cambria,serif;color:#1a1a1a;max-width:100%;margin:0 auto;text-align:center;line-height:1.8}
.text-primary,.text-primary *{color:#92400e!important;font-weight:bold!important}
.text-orange-400,.text-orange-400 *{color:#ea580c!important}
.text-blue-400,.text-blue-400 *{color:#2563eb!important}
.text-sky-400,.text-sky-400 *{color:#0284c7!important}
.text-red-400,.text-red-400 *{color:#dc2626!important}
.text-success{color:#16a34a!important}
.text-destructive,.text-destructive *{color:#dc2626!important}
.text-amber-900,.text-amber-900 *{color:#78350f!important}
.font-bold{font-weight:bold!important}
.font-mono{font-family:'Cambria Math',Cambria,serif!important}
.font-serif{font-family:'Cambria Math',Cambria,serif!important}
.font-semibold{font-weight:600!important}
.bg-muted{background:#f1f5f9!important;padding:8px 14px!important;border-radius:8px!important;display:inline-block!important}
.rounded-lg{border-radius:8px!important}
.flex{display:flex!important;justify-content:center!important}
.inline-flex{display:inline-flex!important}
.items-center{align-items:center!important}
.justify-center{justify-content:center!important}
.flex-col{flex-direction:column!important}
.gap-2{gap:8px!important}.gap-3{gap:12px!important}
.border-t{border-top:1px solid #000!important}
.border-black{border-color:#000!important}
.text-center{text-align:center!important}
.block{display:block!important}
.inline-block{display:inline-block!important}
.mt-0{margin-top:0!important}.mt-1{margin-top:8px!important}.mt-2{margin-top:14px!important}
.pt-1{padding-top:8px!important}
.px-3{padding-left:12px!important;padding-right:12px!important}
.px-4{padding-left:16px!important;padding-right:16px!important}
.py-1{padding-top:8px!important;padding-bottom:8px!important}
.py-2{padding-top:14px!important;padding-bottom:14px!important}
.my-0\.5{margin-top:4px!important;margin-bottom:4px!important}
.my-2{margin-top:14px!important;margin-bottom:14px!important}
.mb-2{margin-bottom:14px!important}.mb-3{margin-bottom:20px!important}
.space-y-1>*+*{margin-top:8px!important}
.space-y-1\.5>*+*{margin-top:12px!important}
.space-y-2>*+*{margin-top:16px!important}
.space-y-4>*+*{margin-top:24px!important}
.leading-loose{line-height:2.5!important}
.leading-relaxed{line-height:2.2!important}
.opacity-80{opacity:.8!important}
.text-sm{font-size:14px!important}
.text-base{font-size:16px!important}
.text-xl{font-size:20px!important}
.text-2xl{font-size:24px!important}
.mx-1{margin-left:4px!important;margin-right:4px!important}
.px-1{padding-left:4px!important;padding-right:4px!important}
.align-middle{vertical-align:middle!important}
.w-full{width:100%!important}
.w-10{width:40px!important}.w-12{width:48px!important}
.h-\[2px\]{height:2px!important}
.min-w-\[32px\]{min-width:32px!important}
.min-w-\[40px\]{min-width:40px!important}
.min-w-\[56px\]{min-width:56px!important}
.min-w-\[72px\]{min-width:72px!important}
.bg-black{background:#000!important}
.bg-foreground\/70{background:rgba(0,0,0,.7)!important}
.px-3\\\\.5{padding-left:14px!important;padding-right:14px!important}
@media print{body{padding:0;font-size:14px;line-height:1.65}@page{size:A4;margin:2.5cm 2cm 2cm 2cm}}
</style></head>
<body>${bodyHtml}<script>window.onload=function(){window.print()}</script></body></html>`;

   const w = window.open('', '_blank');
   if (w) { w.document.write(printHtml); w.document.close(); }
   setGeneratingPdf(false);
  }, 300);
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
      <span class="text-base leading-none">+ / &minus;</span>
      <span class="text-[10px] tracking-wide">ADDIZIONE E SOTTRAZIONE</span>
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
      <span class="text-base leading-none">&times; / &divide;</span>
      <span class="text-[10px] tracking-wide">MOLTIPLICAZIONE E DIVISIONE</span>
     </button>
    </div>

    {/* Input phase */}
    {phase ==="input"&& (
     <div className="space-y-4">
      {/* Suggerimento */}
      <div className="text-center">
       <span className="text-base text-muted-foreground tracking-widest">
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
      <div className={`flex flex-row items-stretch gap-1 sm:gap-1.5 overflow-x-auto pb-2 ${showThirdFraction ? 'justify-start' : 'justify-center'}`} style={{flexWrap:'nowrap'}}>
       {/* ── PRIMA FRAZIONE ── */}
       <div className="rounded-xl border border-border bg-card overflow-hidden animate-pop-in flex-shrink-0 min-w-[200px] sm:min-w-[210px]">
        <div className="py-1.5 border-b border-border bg-secondary/50">
         <span className="text-sm font-bold tracking-widest">PRIMA FRAZIONE</span>
        </div>
        <div className="px-2 py-2">
         <NumberInputCanvas value={num1} onChange={setNum1} label="NUMERATORE" allowNegative />
         <div className="w-[120px] sm:w-[135px] h-[2px] bg-foreground/80 my-2"/>
         <NumberInputCanvas value={den1} onChange={setDen1} label="DENOMINATORE" />
        </div>
       </div>

       {/* ── SEGNO OPERAZIONE ── */}
       <SegnoOperazione op={mode ==="addsub"? (addSubOp ==="+"?"+":"\u2212") : (mulDivOp ==="*"?"\u00d7":"\u00f7")} />

       {/* ── SECONDA FRAZIONE ── */}
       <div className="rounded-xl border border-border bg-card overflow-hidden animate-pop-in flex-shrink-0 min-w-[200px] sm:min-w-[210px]">
        <div className="py-1.5 border-b border-border bg-secondary/50">
         <span className="text-sm font-bold tracking-widest">SECONDA FRAZIONE</span>
        </div>
        <div className="px-2 py-2">
         <NumberInputCanvas value={num2} onChange={setNum2} label="NUMERATORE" allowNegative />
         <div className="w-[120px] sm:w-[135px] h-[2px] bg-foreground/80 my-2"/>
         <NumberInputCanvas value={den2} onChange={setDen2} label="DENOMINATORE" />
        </div>
       </div>

       {/* ── TERZA FRAZIONE (solo AddSub) ── */}
       {mode ==="addsub"&& !showThirdFraction && (
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
       {mode ==="addsub"&& showThirdFraction && (
        <>
         <SegnoOperazione op={addSubOp ==="+"?"+":"\u2212"} />
         <div className="rounded-xl border border-border bg-card overflow-hidden animate-pop-in flex-shrink-0 min-w-[200px] sm:min-w-[210px]">
          <div className="py-1.5 border-b border-border bg-secondary/50 flex items-center px-2 relative">
           <span className="text-sm font-bold tracking-widest flex-1 text-center">TERZA FRAZIONE</span>
           <button
            onClick={() => { setShowThirdFraction(false); setNum3(null); setDen3(null); }}
            className="text-base text-muted-foreground hover:text-destructive transition-colors font-bold leading-none absolute right-2"
           >
            ✕
           </button>
          </div>
          <div className="px-2 py-2">
           <NumberInputCanvas value={num3} onChange={setNum3} label="NUMERATORE" allowNegative />
           <div className="w-[120px] sm:w-[135px] h-[2px] bg-foreground/80 my-2"/>
           <NumberInputCanvas value={den3} onChange={setDen3} label="DENOMINATORE" />
          </div>
         </div>
        </>
       )}

       {/* ── QUARTA FRAZIONE ── */}
       {mode ==="addsub"&& showThirdFraction && !showFourthFraction && (
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
       {mode ==="addsub"&& showFourthFraction && (
        <>
         <SegnoOperazione op={addSubOp ==="+"?"+":"\u2212"} />
         <div className="rounded-xl border border-border bg-card overflow-hidden animate-pop-in flex-shrink-0 min-w-[200px] sm:min-w-[210px]">
          <div className="py-1.5 border-b border-border bg-secondary/50 flex items-center px-2 relative">
           <span className="text-sm font-bold tracking-widest flex-1 text-center">QUARTA FRAZIONE</span>
           <button
            onClick={() => { setShowFourthFraction(false); setNum4(null); setDen4(null); }}
            className="text-base text-muted-foreground hover:text-destructive transition-colors font-bold leading-none absolute right-2"
           >
            ✕
           </button>
          </div>
          <div className="px-2 py-2">
           <NumberInputCanvas value={num4} onChange={setNum4} label="NUMERATORE" allowNegative />
           <div className="w-[120px] sm:w-[135px] h-[2px] bg-foreground/80 my-2"/>
           <NumberInputCanvas value={den4} onChange={setDen4} label="DENOMINATORE" />
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
          <span className="text-lg font-bold text-primary">{addSubOp ==="+"?"+":"\u2212"}</span>
          <div className="flex flex-col items-center">
           <span className="text-base font-bold font-serif">{num3}</span>
           {(den3 !== null && den3 !== 1) && (<div className="w-10 h-[2px] bg-foreground/70 my-0.5"/>)}
           {(den3 !== null && den3 !== 1) && (<span className="text-base font-bold font-serif">{den3}</span>)}
          </div>
         </>
        )}
        {showFourthFraction && num4 !== null && (
         <>
          <span className="text-lg font-bold text-primary">{addSubOp ==="+"?"+":"\u2212"}</span>
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
 computed: NonNullable<ReturnType<typeof useMemo> extends infer U ? U : never>;
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

    <NumberInputCanvas
     value={mcmUtente}
     onChange={setMcmUtente}
     label="Inserisci il tuo risultato (m.c.m.):"
     colorClass="text-primary"
    />
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
     <FractionDisplay
      numerator={`(${mcmDisplay} : ${nd1}) · ${effNum1 < 0 ? `(${effNum1})` : effNum1} ${op} (${mcmDisplay} : ${nd2}) · ${effNum2 < 0 ? `(${effNum2})` : effNum2}`}
      denominator={mcmDisplay}
      size="sm"
     />
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
      {nd1} = {computed.fattori1[1] === 1 ?"1": Object.entries(computed.fattori1).map(([f, e]) => e === 1 ? f : `${f}${toSuperscript(e)}`).join("·")}<br />
      {nd2} = {computed.fattori2[1] === 1 ?"1": Object.entries(computed.fattori2).map(([f, e]) => e === 1 ? f : `${f}${toSuperscript(e)}`).join("·")}
      {computed.hasThird && (<>{computed.nd3} = {computed.fattori3[1] === 1 ?"1": Object.entries(computed.fattori3).map(([f, e]) => e === 1 ? f : `${f}${toSuperscript(e)}`).join("·")}<br /></>)}
      {computed.hasFourth && (<>{computed.nd4} = {computed.fattori4[1] === 1 ?"1": Object.entries(computed.fattori4).map(([f, e]) => e === 1 ? f : `${f}${toSuperscript(e)}`).join("·")}<br /></>)}
     </p>
     <p className="font-mono text-base text-primary mt-4">
      m.c.m.({nd1}, {nd2}{computed.hasThird ? `, ${computed.nd3}` : ""}{computed.hasFourth ? `, ${computed.nd4}` : ""}) = {computed.mcmFormula} = {computed.mcmCorretto}
     </p>
     </>
     )}
     <div className="flex justify-center my-2">
      <div className="font-mono text-base text-center bg-muted px-4 py-2 rounded-lg">
       ({computed.mcmCorretto} : {nd1}) · {effNum1 < 0 ? `(${effNum1})` : effNum1} {op} ({computed.mcmCorretto} : {nd2}) · {effNum2 < 0 ? `(${effNum2})` : effNum2}{computed.hasThird ? ` ${op} (${computed.mcmCorretto} : ${computed.nd3}) · ${computed.effNum3 < 0 ? `(${computed.effNum3})` : computed.effNum3}` : ""}{computed.hasFourth ? ` ${op} (${computed.mcmCorretto} : ${computed.nd4}) · ${computed.effNum4 < 0 ? `(${computed.effNum4})` : computed.effNum4}` : ""}<br />
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
      ({mcmDisplay} : {nd1}) · {effNum1 < 0 ? `(${effNum1})` : effNum1} = <span className="font-bold">Risultato 1</span>
     </p>
     <NumberInputCanvas
      value={risultato1Utente}
      onChange={setRisultato1Utente}
      label="Inserisci risultato 1:"
      colorClass="text-orange-400"
      allowNegative
     />
     {risultato1Utente !== null && (
      <p className={cn(
      "text-base font-bold text-center",
       risultato1Utente === computed.val1Corretto ?"text-success":"text-destructive",
      )}>
       {risultato1Utente === computed.val1Corretto ?"CORRETTO": `RISULTATO SBAGLIATO. CALCOLA DI NUOVO`}
      </p>
     )}

     <p className="text-base">
      ({mcmDisplay} : {nd2}) · {effNum2 < 0 ? `(${effNum2})` : effNum2} = <span className="font-bold">Risultato 2</span>
     </p>
     <NumberInputCanvas
      value={risultato2Utente}
      onChange={setRisultato2Utente}
      label="Inserisci risultato 2:"
      colorClass="text-red-400"
      allowNegative
     />
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
      ({mcmDisplay} : {computed.nd3}) · {computed.effNum3 < 0 ? `(${computed.effNum3})` : computed.effNum3} = <span className="font-bold">Risultato 3</span>
     </p>
     <NumberInputCanvas
      value={risultato3Utente}
      onChange={setRisultato3Utente}
      label="Inserisci risultato 3:"
      colorClass="text-blue-400"
      allowNegative
     />
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
      ({mcmDisplay} : {computed.nd4}) · {computed.effNum4 < 0 ? `(${computed.effNum4})` : computed.effNum4} = <span className="font-bold">Risultato 4</span>
     </p>
     <NumberInputCanvas
      value={risultato4Utente}
      onChange={setRisultato4Utente}
      label="Inserisci risultato 4:"
      colorClass="text-orange-400"
      allowNegative
     />
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
      ({computed.mcmCorretto} : {nd1}) · {effNum1 < 0 ? `(${effNum1})` : effNum1} = {round2(computed.mcmCorretto / nd1)} · {effNum1 < 0 ? `(${effNum1})` : effNum1} = <span className="font-bold text-primary">{computed.val1Corretto}</span>
     </p>
     <p className="font-mono text-base">
      ({computed.mcmCorretto} : {nd2}) · {effNum2 < 0 ? `(${effNum2})` : effNum2} = {round2(computed.mcmCorretto / nd2)} · {effNum2 < 0 ? `(${effNum2})` : effNum2} = <span className="font-bold text-primary">{computed.val2Corretto}</span>
     </p>
     {computed.hasThird && (
     <p className="font-mono text-base">
      ({computed.mcmCorretto} : {computed.nd3}) · {computed.effNum3 < 0 ? `(${computed.effNum3})` : computed.effNum3} = {round2(computed.mcmCorretto / computed.nd3)} · {computed.effNum3 < 0 ? `(${computed.effNum3})` : computed.effNum3} = <span className="font-bold text-primary">{computed.val3Corretto}</span>
     </p>
     )}
     {computed.hasFourth && (
     <p className="font-mono text-base">
      ({computed.mcmCorretto} : {computed.nd4}) · {computed.effNum4 < 0 ? `(${computed.effNum4})` : computed.effNum4} = {round2(computed.mcmCorretto / computed.nd4)} · {computed.effNum4 < 0 ? `(${computed.effNum4})` : computed.effNum4} = <span className="font-bold text-primary">{computed.val4Corretto}</span>
     </p>
     )}
     <div className="flex justify-center my-2">
      <div className="font-mono text-base text-center bg-muted px-4 py-2 rounded-lg">
       <span className="font-bold">{computed.val1Corretto}</span> {op} {computed.val2Corretto < 0 && '('}<span className="font-bold">{computed.val2Corretto}</span>{computed.val2Corretto < 0 && ')'}{computed.hasThird ? ` ${op} ${computed.val3Corretto < 0 ? `(${computed.val3Corretto})` : computed.val3Corretto}` : ""}{computed.hasFourth ? ` ${op} ${computed.val4Corretto < 0 ? `(${computed.val4Corretto})` : computed.val4Corretto}` : ""}<br />
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
     <FractionDisplay
      numerator={`${r1Display} ${op} ${risultato2Utente !== null && risultato2Utente < 0 ? `(${r2Display})` : r2Display}${computed.hasThird ? ` ${op} ${risultato3Utente !== null && risultato3Utente < 0 ? `(${r3Display})` : r3Display}` : ""}${computed.hasFourth ? ` ${op} ${risultato4Utente !== null && risultato4Utente < 0 ? `(${r4Display})` : r4Display}` : ""}`}
      denominator={mcmDisplay}
      size="md"
     />
    </div>

    {/* Final result handwriting input */}
    <div className="space-y-3 pt-2">
     <p className="text-base font-semibold text-foreground">
      Scrivi il risultato finale:
     </p>
     <div className="rounded-xl border border-border bg-card/60 p-3 space-y-1">
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
      />
      {/* Linea di frazione — nascosta se denominatore è 1 */}
      {computed.denFinaleRaw !== 1 && (
      <div className="w-[120px] sm:w-[135px] h-[2px] bg-foreground/80 my-2"/>
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
     <p className="font-mono text-base">
      {computed.val1Corretto} {op} {computed.val2Corretto < 0 ? `(${computed.val2Corretto})` : computed.val2Corretto}{computed.hasThird ? ` ${op} ${computed.val3Corretto < 0 ? `(${computed.val3Corretto})` : computed.val3Corretto}` : ""}{computed.hasFourth ? ` ${op} ${computed.val4Corretto < 0 ? `(${computed.val4Corretto})` : computed.val4Corretto}` : ""} = {computed.numFinaleRaw}
     </p>
     <div className="flex justify-center my-2">
      <div className="font-mono text-base text-center bg-muted px-4 py-2 rounded-lg">
       {computed.denFinaleRaw === 1 ? (
        <span className="font-bold">{computed.numFinaleRaw}</span>
       ) : (
        <>
         <span className="font-bold">{computed.numFinaleRaw}</span><br />
         <span className="border-t border-black block mt-1 pt-1">{computed.denFinaleRaw}</span>
        </>
       )}
      </div>
     </div>
     {(computed.numFinaleRaw !== computed.numFinaleCorretto || computed.denFinaleRaw !== computed.denFinaleCorretto) && (
      <p className="text-base text-center flex items-center justify-center gap-2 flex-wrap">
       <FractionDisplay numerator={computed.numFinaleRaw} denominator={computed.denFinaleRaw} size="sm" />
       <span className="font-bold">=</span>
       <FractionDisplay numerator={computed.numFinaleCorretto} denominator={computed.denFinaleCorretto} size="sm" />
      </p>
     )}
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
 num1: number; den1: number; num2: number; den2: number; op:"*"|"/";
 computed: any;
 num1Semplificato: number | null; setNum1Semplificato: (v: number | null) => void;
 den2Semplificato: number | null; setDen2Semplificato: (v: number | null) => void;
 den1Semplificato: number | null; setDen1Semplificato: (v: number | null) => void;
 num2Semplificato: number | null; setNum2Semplificato: (v: number | null) => void;
 numeratoreFinaleUtente: number | null; setNumeratoreFinaleUtente: (v: number | null) => void;
 denominatoreFinaleUtente: number | null; setDenominatoreFinaleUtente: (v: number | null) => void;
 risultatoFinaleUtente: string; feedbackFinale: { testo: string; corretto: boolean } | null;
 verificaFinale: (v: string) => void;
 onNew: () => void;
 generatingPdf: boolean;
}

function MulDivExercise({
 num1, den1, num2, den2, op, computed,
 num1Semplificato, setNum1Semplificato,
 den2Semplificato, setDen2Semplificato,
 den1Semplificato, setDen1Semplificato,
 num2Semplificato, setNum2Semplificato,
 numeratoreFinaleUtente, setNumeratoreFinaleUtente,
 denominatoreFinaleUtente, setDenominatoreFinaleUtente,
 risultatoFinaleUtente, feedbackFinale, verificaFinale, onNew, generatingPdf,
}: MulDivExerciseProps) {
 const nd1 = Math.abs(den1 ?? 1);
 const nd2 = Math.abs(den2 ?? 1);

 const dNum1S = num1Semplificato !== null ? num1Semplificato :"...";
 const dDen2S = den2Semplificato !== null ? den2Semplificato :"...";
 const dDen1S = den1Semplificato !== null ? den1Semplificato :"...";
 const dNum2S = num2Semplificato !== null ? num2Semplificato :"...";

 // Display the initial operation with colors
 const displayNum2 = computed.displayNum2;
 const displayDen2 = computed.displayDen2;
 const wrapParens = num2 < 0 && op ==="/";

 // Valori corretti per visibilità NotebookGuide (solo quando l'utente inserisce il risultato esatto)
 const num1Correct = computed.divCom1 ? Math.round(Math.abs(num1) / computed.divCom1) * (num1 < 0 ? -1 : 1) : num1;
 const den2Correct = computed.divCom1 ? Math.round(computed.actualDen2 / computed.divCom1) : computed.actualDen2;
 const den1Correct = computed.divCom2 ? Math.round(nd1 / computed.divCom2) : nd1;
 const num2Correct = computed.divCom2 ? Math.round(Math.abs(computed.actualNum2) / computed.divCom2) * (computed.actualNum2 < 0 ? -1 : 1) : computed.actualNum2;

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
   <div className="p-4 rounded-xl bg-card/40 border border-border space-y-6 leading-loose max-w-md mx-auto">
    <p className="text-base font-bold text-primary">1. Moltiplicazione e inversione</p>

    {/* Notebook Guide: Step 1 */}
    <div className="flex justify-center items-center gap-3 text-lg">
     <FractionDisplay numerator={num1} denominator={nd1} numClass="text-orange-400"denClass="text-sky-400"/>
     <span className="text-xl font-bold text-foreground">×</span>
     {wrapParens && <span className="text-xl text-foreground">(</span>}
     <FractionDisplay numerator={displayNum2} denominator={displayDen2} numClass="text-red-400"denClass="text-blue-400"/>
     {wrapParens && <span className="text-xl text-foreground">)</span>}
    </div>
    <NotebookGuide title="RICOPIA SUL QUADERNO:"visible={num1Semplificato === num1Correct && den2Semplificato === den2Correct} forceOpen={generatingPdf}>
     {op ==="/"&& (
      <div className="flex justify-center my-2">
       <div className="flex items-center gap-2 text-base font-mono bg-muted px-3.5 py-2 rounded-lg">
        <FractionDisplay numerator={num1} denominator={nd1} size="xs"/>
        <span className="text-base">÷</span>
        <FractionDisplay numerator={num2} denominator={nd2} size="xs"/>
        <span className="text-base">→</span>
        <FractionDisplay numerator={num1} denominator={nd1} size="xs"/>
        <span className="text-base">×</span>
        <FractionDisplay numerator={displayNum2} denominator={displayDen2} size="xs"/>
       </div>
      </div>
     )}
     <div className="flex justify-center my-2">
      <div className="flex items-center gap-2 text-base bg-muted px-3.5 py-2 rounded-lg">
       <FractionDisplay numerator={num1} denominator={nd1} numClass="text-orange-400"denClass="text-sky-400"size="xs"/>
       <span className="text-base font-bold">×</span>
       <FractionDisplay numerator={displayNum2} denominator={displayDen2} numClass="text-red-400"denClass="text-blue-400"size="xs"/>
      </div>
     </div>
    </NotebookGuide>

   </div>

   {/* Step 2: Cross simplification */}
   <div className="p-4 rounded-xl bg-card/40 border border-border space-y-6 leading-loose">
    <p className="text-base font-bold text-amber-900">2. SEMPLIFICAZIONE tra frazioni</p>

    {/* Notebook Guide: Step 2 */}
    <div className="space-y-4">
     <div>
      <p className="text-base mb-2">
       <span className="text-amber-900 font-bold">SEMPLIFICAZIONE 1:</span>{" "}
       {computed.divCom1
        ? <>divido sia il <span className="text-orange-400 font-bold">numeratore {num1}</span> che il <span className="text-blue-400 font-bold">denominatore {computed.actualDen2}</span> per <span className="font-bold">{computed.divCom1}</span>, cioè <span className="text-orange-400 font-bold">{num1} : {computed.divCom1}</span> e <span className="text-blue-400 font-bold">{computed.actualDen2} : {computed.divCom1}</span></>
        : <>DOVREI DIVIDERE <span className="text-orange-400 font-bold">NUMERATORE {num1}</span> E <span className="text-blue-400 font-bold">DENOMINATORE {computed.actualDen2}</span>. MA NON C'È NESSUN DIVISORE COMUNE TRA {num1} E {computed.actualDen2}. QUINDI RISCRIVO GLI STESSI NUMERI</>
       }
      </p>
      <div className="flex flex-col gap-3">
       <NumberInputCanvas
        value={num1Semplificato}
        onChange={setNum1Semplificato}
        label="Numeratore arancione"
        colorClass="text-orange-400 font-bold"
       />
       {num1Semplificato !== null && (
        <p className={cn(
        "text-base font-bold text-center",
         num1Semplificato === (computed.divCom1 ? Math.round(Math.abs(num1) / computed.divCom1) * (num1 < 0 ? -1 : 1) : num1) ?"text-success":"text-destructive",
        )}>
         {num1Semplificato === (computed.divCom1 ? Math.round(Math.abs(num1) / computed.divCom1) * (num1 < 0 ? -1 : 1) : num1) ?"CORRETTO": `RISULTATO SBAGLIATO. CALCOLA DI NUOVO`}
        </p>
       )}
       {/* Linea di frazione */}
       <div className="w-[120px] sm:w-[135px] h-[2px] bg-foreground/80 my-2"/>
       <NumberInputCanvas
        value={den2Semplificato}
        onChange={setDen2Semplificato}
        label="Denominatore blu"
        colorClass="text-blue-400 font-bold"
       />
       {den2Semplificato !== null && (
        <p className={cn(
        "text-base font-bold text-center",
         (den2Semplificato ?? 1) === (computed.divCom1 ? Math.round(computed.actualDen2 / computed.divCom1) : computed.actualDen2) ?"text-success":"text-destructive",
        )}>
         {(den2Semplificato ?? 1) === (computed.divCom1 ? Math.round(computed.actualDen2 / computed.divCom1) : computed.actualDen2) ?"CORRETTO": `RISULTATO SBAGLIATO. CALCOLA DI NUOVO`}
        </p>
       )}

      </div>
     </div>

     <div>
      <p className="text-base mb-2">
       <span className="text-amber-900 font-bold">SEMPLIFICAZIONE 2:</span>{" "}
       {computed.divCom2
        ? <>divido sia il <span className="text-sky-400 font-bold">denominatore {nd1}</span> che il <span className="text-red-400 font-bold">numeratore {computed.actualNum2}</span> per <span className="font-bold">{computed.divCom2}</span>, cioè <span className="text-sky-400 font-bold">{nd1} : {computed.divCom2}</span> e <span className="text-red-400 font-bold">{computed.actualNum2} : {computed.divCom2}</span></>
        : <>DOVREI DIVIDERE <span className="text-sky-400 font-bold">DENOMINATORE {nd1}</span> E <span className="text-red-400 font-bold">NUMERATORE {computed.actualNum2}</span>. MA NON C'È NESSUN DIVISORE COMUNE TRA {nd1} E {computed.actualNum2}. QUINDI RISCRIVO GLI STESSI NUMERI</>
       }
      </p>
      <div className="flex flex-col gap-3">
       <NumberInputCanvas
        value={den1Semplificato}
        onChange={setDen1Semplificato}
        label="Denominatore azzurro"
        colorClass="text-sky-400 font-bold"
       />
       {den1Semplificato !== null && (
        <p className={cn(
        "text-base font-bold text-center",
         (den1Semplificato ?? 1) === (computed.divCom2 ? Math.round(nd1 / computed.divCom2) : nd1) ?"text-success":"text-destructive",
        )}>
         {(den1Semplificato ?? 1) === (computed.divCom2 ? Math.round(nd1 / computed.divCom2) : nd1) ?"CORRETTO": `RISULTATO SBAGLIATO. CALCOLA DI NUOVO`}
        </p>
       )}
       {/* Linea di frazione */}
       <div className="w-[120px] sm:w-[135px] h-[2px] bg-foreground/80 my-2"/>
       <NumberInputCanvas
        value={num2Semplificato}
        onChange={setNum2Semplificato}
        label="Numeratore rosso"
        colorClass="text-red-400 font-bold"
        allowNegative
       />
       {num2Semplificato !== null && (
        <p className={cn(
        "text-base font-bold text-center",
         num2Semplificato === (computed.divCom2 ? Math.round(Math.abs(computed.actualNum2) / computed.divCom2) * (computed.actualNum2 < 0 ? -1 : 1) : computed.actualNum2) ?"text-success":"text-destructive",
        )}>
         {num2Semplificato === (computed.divCom2 ? Math.round(Math.abs(computed.actualNum2) / computed.divCom2) * (computed.actualNum2 < 0 ? -1 : 1) : computed.actualNum2) ?"CORRETTO": `RISULTATO SBAGLIATO. CALCOLA DI NUOVO`}
        </p>
       )}
      </div>
     </div>
    </div>
    <NotebookGuide title="RICOPIA SUL QUADERNO:"visible={den1Semplificato === den1Correct && num2Semplificato === num2Correct} forceOpen={generatingPdf}>
     {(!computed.divCom1 && !computed.divCom2) ? (
      <p className="text-base text-center text-primary py-1">NESSUNA SEMPLIFICAZIONE DA FARE</p>
     ) : (
      <>
      <div className="flex justify-center my-2">
       <div className="flex items-center gap-2 text-base bg-muted px-3.5 py-2 rounded-lg">
        <div className="flex flex-col items-center">
         <span className="text-orange-400 font-bold font-serif text-base">{dNum1S}</span>
         {(dDen1S !== 1 && dDen1S !=="1") && (
         <>
          <div className="w-10 h-[2px] bg-black my-0.5"/>
          <span className="text-sky-400 font-bold font-serif text-base">{dDen1S}</span>
         </>
         )}
        </div>
        <span className="text-base font-bold">×</span>
        <div className="flex flex-col items-center">
         <span className="text-red-400 font-bold font-serif text-base">{dNum2S}</span>
         {(dDen2S !== 1 && dDen2S !=="1") && (
         <>
          <div className="w-10 h-[2px] bg-black my-0.5"/>
          <span className="text-blue-400 font-bold font-serif text-base">{dDen2S}</span>
         </>
         )}
        </div>
       </div>
      </div>
      </>
     )}
    </NotebookGuide>

   </div>

   {/* Step 3: Final multiplication */}
   <div className="p-4 rounded-xl bg-card/40 border border-border space-y-6 leading-loose">
    <p className="text-base font-bold text-primary">3. Moltiplicazione finale</p>

    {/* Notebook Guide: Step 3 */}
    <div className="space-y-4">
     <div>
      <p className="text-base mb-2">
       <span className="text-amber-900">MOLTIPLICAZIONE NUMERATORI:</span>{" "}
       <span className="text-orange-400 font-bold">{dNum1S}</span> · (<span className="text-red-400 font-bold">{dNum2S}</span>) = <span>RISULTATO NUMERATORE FINALE</span>
      </p>
      <NumberInputCanvas
       value={numeratoreFinaleUtente}
       onChange={setNumeratoreFinaleUtente}
       label="Risultato numeratore finale:"
       colorClass="text-primary"
       allowNegative
      />
     </div>
     <div>
      <p className="text-base mb-2">
       <span className="text-amber-900">MOLTIPLICAZIONE DENOMINATORI:</span>{" "}
       <span className="text-sky-400 font-bold">{dDen1S}</span> · (<span className="text-blue-400 font-bold">{dDen2S}</span>) = <span>RISULTATO DENOMINATORE FINALE</span>
      </p>
      <NumberInputCanvas
       value={denominatoreFinaleUtente}
       onChange={setDenominatoreFinaleUtente}
       label="Risultato denominatore finale:"
       colorClass="text-primary"
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
     <p className="font-mono text-base">
      {num1Semplificato !== null && num2Semplificato !== null
       ? <span className="font-bold text-primary">{num1Semplificato} × {num2Semplificato} = {num1Semplificato * num2Semplificato}</span>
       : <span className="italic">... × ... = ?</span>
      }
     </p>
     <p className="font-mono text-base">
      {den1Semplificato !== null && den2Semplificato !== null
       ? <span className="font-bold text-primary">{den1Semplificato} × {den2Semplificato} = {den1Semplificato * den2Semplificato}</span>
       : <span className="italic">... × ... = ?</span>
      }
     </p>
     <div className="flex justify-center my-2">
      <div className="font-mono text-base text-center bg-muted px-4 py-2 rounded-lg">
       {((den1Semplificato ?? 1) * (den2Semplificato ?? 1)) === 1 ? (
        <span className="font-bold">{(num1Semplificato ?? 1) * (num2Semplificato ?? 1)}</span>
       ) : (
        <>
         <span className="font-bold">{(num1Semplificato ?? 1) * (num2Semplificato ?? 1)}</span><br />
         <span className="border-t border-black block mt-1 pt-1">{(den1Semplificato ?? 1) * (den2Semplificato ?? 1)}</span>
        </>
       )}
      </div>
     </div>
     {((num1Semplificato ?? 1) * (num2Semplificato ?? 1) !== computed.numFinaleCorretto || (den1Semplificato ?? 1) * (den2Semplificato ?? 1) !== computed.denFinaleCorretto) && (
      <p className="text-base text-center flex items-center justify-center gap-2 flex-wrap">
       <FractionDisplay numerator={(num1Semplificato ?? 1) * (num2Semplificato ?? 1)} denominator={(den1Semplificato ?? 1) * (den2Semplificato ?? 1)} size="sm" />
       <span className="font-bold">=</span>
       <FractionDisplay numerator={computed.numFinaleCorretto} denominator={computed.denFinaleCorretto} size="sm" />
      </p>
     )}
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
