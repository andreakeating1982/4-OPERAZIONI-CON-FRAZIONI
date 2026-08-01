import React, { useState, useCallback, useMemo } from"react";
import { NumberInputCanvas } from"@/components/NumberInputCanvas";
import { FractionDisplay } from"@/components/FractionDisplay";
import { cn } from"@/lib/utils";
// No icon imports — testo semplice come da foto

// ─── Math utilities ───────────────────────────────────────────────
function gcd(a: number, b: number): number {
 if (b === 0) return a;
 return gcd(b, a % b);
}

function lcm(a: number, b: number): number {
 if (a === 0 || b === 0) return 0;
 return Math.abs(a * b) / gcd(Math.abs(a), Math.abs(b));
}

function semplificaFrazione(num: number, den: number): { num: number; den: number } {
 if (den === 0) return { num, den: 0 };
 if (num === 0) return { num: 0, den: 1 };
 const c = gcd(Math.abs(num), Math.abs(den));
 let sn = num / c;
 let sd = den / c;
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
 // ─── Mode ──────────────────────────────────────────────────────────
 const [mode, setMode] = useState<OperationMode>("addsub");
 const [addSubOp, setAddSubOp] = useState<"+"|"-">("+");
 const [mulDivOp, setMulDivOp] = useState<"*"|"/">("*");

 // ─── Fraction inputs (handwriting) ─────────────────────────────────
 const [num1, setNum1] = useState<number | null>(null);
 const [den1, setDen1] = useState<number | null>(null);
 const [num2, setNum2] = useState<number | null>(null);
 const [den2, setDen2] = useState<number | null>(null);

 // ─── Phase tracking ────────────────────────────────────────────────
 const [phase, setPhase] = useState<"input"|"exercise">("input");
 const [submitted, setSubmitted] = useState(false);

 // ─── Exercise state (common) ───────────────────────────────────────
 // Add/Sub exercise fields
 const [mcmUtente, setMcmUtente] = useState<number | null>(null);
 const [risultato1Utente, setRisultato1Utente] = useState<number | null>(null);
 const [risultato2Utente, setRisultato2Utente] = useState<number | null>(null);
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

 // Add/Sub computed values
 const addSubComputed = useMemo(() => {
  if (num1 === null || num2 === null) return null;

  const dn1 = den1 ?? 1;
  const dn2 = den2 ?? 1;
  if (dn1 < 1 || dn2 < 1) return null;
  const nd1 = Math.abs(dn1);
  const nd2 = Math.abs(dn2);
  const mcmCorretto = lcm(nd1, nd2);

  const fattori1 = fattorizzazionePrimi(nd1);
  const fattori2 = fattorizzazionePrimi(nd2);

  let mcmFattori: Record<number, number> = {};
  for (const [f, e] of Object.entries(fattori1)) mcmFattori[+f] = Math.max(mcmFattori[+f] || 0, e);
  for (const [f, e] of Object.entries(fattori2)) mcmFattori[+f] = Math.max(mcmFattori[+f] || 0, e);

  const mcmFormulaParts: string[] = [];
  for (const [f, e] of Object.entries(mcmFattori)) {
   mcmFormulaParts.push(e === 1 ? f : `${f}${toSuperscript(e)}`);
  }

  const effNum1 = num1 * (dn1 < 0 ? -1 : 1);
  const effNum2 = num2 * (dn2 < 0 ? -1 : 1);
  const val1Corretto = (mcmCorretto / nd1) * effNum1;
  const val2Corretto = (mcmCorretto / nd2) * effNum2;

  const numFinaleCorretto = addSubOp ==="+"? val1Corretto + val2Corretto : val1Corretto - val2Corretto;
  const sempl = semplificaFrazione(numFinaleCorretto, mcmCorretto);

  return {
   mcmCorretto,
   val1Corretto,
   val2Corretto,
   numFinaleCorretto: sempl.num,
   denFinaleCorretto: sempl.den,
   fattori1,
   fattori2,
   mcmFormulaParts,
   nd1,
   nd2,
   effNum1,
   effNum2,
   mcmFormula: mcmFormulaParts.join("·"),
  };
 }, [num1, den1, num2, den2, addSubOp]);

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

  const numFinaleCorretto = num1 * actualNum2;
  const denFinaleCorretto = nd1 * actualDen2;
  const sempl = semplificaFrazione(numFinaleCorretto, denFinaleCorretto);

  return {
   actualNum2,
   actualDen2,
   displayNum2,
   displayDen2,
   divCom1,
   divCom2,
   numFinaleCorretto: sempl.num,
   denFinaleCorretto: sempl.den,
  };
 }, [num1, den1, num2, den2, mulDivOp]);

 // ─── Handlers ──────────────────────────────────────────────────────

 const resetExercise = useCallback(() => {
  setMcmUtente(null);
  setRisultato1Utente(null);
  setRisultato2Utente(null);
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
  setSubmitted(true);
  setPhase("exercise");
  resetExercise();
 };

 const handleNewExercise = () => {
  setNum1(null);
  setDen1(null);
  setNum2(null);
  setDen2(null);
  setPhase("input");
  setSubmitted(false);
  resetExercise();
 };

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

 const allFilled = num1 !== null && num2 !== null;

 return (
  <div className="min-h-screen bg-background flex flex-col">
   <main className="flex-1 max-w-2xl mx-auto w-full p-3 sm:p-4 pt-4">
    {/* Mode selector */}
    <div className="flex gap-1 p-1 bg-card/60 backdrop-blur-sm rounded-xl border border-border mb-4">
     <button
      onClick={() => { setMode("addsub"); handleNewExercise(); }}
      className={cn(
      "flex-1 flex items-center justify-center py-2.5 px-4 rounded-lg text-base font-bold transition-all duration-200",
       mode ==="addsub"
        ?"bg-primary text-primary-foreground shadow-md"
        :"text-muted-foreground hover:text-foreground hover:bg-secondary",
      )}
     >
      + / &minus; ADDIZIONE / SOTTRAZIONE
     </button>
     <button
      onClick={() => { setMode("muldiv"); handleNewExercise(); }}
      className={cn(
      "flex-1 flex items-center justify-center py-2.5 px-4 rounded-lg text-base font-bold transition-all duration-200",
       mode ==="muldiv"
        ?"bg-primary text-primary-foreground shadow-md"
        :"text-muted-foreground hover:text-foreground hover:bg-secondary",
      )}
     >
      &times; / &divide; MOLTIPLICAZIONE / DIVISIONE
     </button>
    </div>

    {/* Input phase */}
    {phase ==="input"&& (
     <div className="space-y-6">
      {/* Suggerimento */}
      <div className="text-center">
       <span className="text-base text-muted-foreground tracking-widest font-semibold">
        SCRIVI IL NUMERO NEL RIQUADRO
       </span>
      </div>

      {/* Operation selector */}
      <div className="flex items-center justify-center gap-3">
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

      {/* Prima frazione */}
      <div className="rounded-xl border border-border bg-card overflow-hidden animate-pop-in max-w-xs mx-auto w-full">
       <div className="py-2.5 border-b border-border bg-secondary/50">
        <span className="text-base font-bold tracking-widest">
         PRIMA FRAZIONE
        </span>
       </div>
       <div className="p-4 space-y-1">
        <NumberInputCanvas
         value={num1}
         onChange={setNum1}
         label="NUMERATORE"
         allowNegative
        />
        {/* Linea di frazione — larga 100px, allineata sotto il quadratino */}
        <div className="flex justify-start py-1">
         <div className="w-[100px] h-[2.5px] bg-foreground/80"/>
        </div>
        <NumberInputCanvas
         value={den1}
         onChange={setDen1}
         label="DENOMINATORE"
        />
       </div>
      </div>

      {/* Segno dell'operazione tra le due frazioni */}
      <div className="flex items-center justify-center py-1">
       <span className="text-2xl font-bold text-primary">
        {mode ==="addsub"? (addSubOp ==="+"?"+":"\u2212") : (mulDivOp ==="*"?"\u00d7":"\u00f7")}
       </span>
      </div>

      {/* Seconda frazione */}
      <div className="rounded-xl border border-border bg-card overflow-hidden animate-pop-in max-w-xs mx-auto w-full">
       <div className="py-2.5 border-b border-border bg-secondary/50">
        <span className="text-base font-bold tracking-widest">
         SECONDA FRAZIONE
        </span>
       </div>
       <div className="p-4 space-y-1">
        <NumberInputCanvas
         value={num2}
         onChange={setNum2}
         label="NUMERATORE"
         allowNegative
        />
        {/* Linea di frazione — larga 100px, allineata sotto il quadratino */}
        <div className="flex justify-start py-1">
         <div className="w-[100px] h-[2.5px] bg-foreground/80"/>
        </div>
        <NumberInputCanvas
         value={den2}
         onChange={setDen2}
         label="DENOMINATORE"
        />
       </div>
      </div>

      {/* Anteprima espressione inserita */}
      {allFilled && (
       <div className="flex items-center justify-center gap-3 py-2 animate-pop-in">
        {/* Prima frazione */}
        <div className="flex flex-col items-center">
         <span className="text-lg font-bold font-serif">{num1}</span>
         {(den1 !== null && den1 !== 1) && (
         <div className="w-12 h-[2px] bg-foreground/70 my-0.5"/>
         )}
         {(den1 !== null && den1 !== 1) && (
         <span className="text-lg font-bold font-serif">{den1}</span>
         )}
        </div>
        {/* Segno operazione */}
        <span className="text-xl font-bold text-primary">
         {mode ==="addsub"? (addSubOp ==="+"?"+":"\u2212") : (mulDivOp ==="*"?"\u00d7":"\u00f7")}
        </span>
        {/* Seconda frazione */}
        <div className="flex flex-col items-center">
         <span className="text-lg font-bold font-serif">{num2}</span>
         {(den2 !== null && den2 !== 1) && (
         <div className="w-12 h-[2px] bg-foreground/70 my-0.5"/>
         )}
         {(den2 !== null && den2 !== 1) && (
         <span className="text-lg font-bold font-serif">{den2}</span>
         )}
        </div>
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
        risultatoFinaleUtente={risultatoFinaleUtente}
        setRisultatoFinaleUtente={setRisultatoFinaleUtente}
        feedbackFinale={feedbackFinale}
        verificaFinale={verificaAddSub}
        onNew={handleNewExercise}
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
       />
      )}
     </div>
    )}
   </main>
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

// ─── ADD/SUB EXERCISE SUB-COMPONENT ─────────────────────────────────

interface AddSubExerciseProps {
 num1: number; den1: number; num2: number; den2: number; op:"+"|"-";
 computed: NonNullable<ReturnType<typeof useMemo> extends infer U ? U : never>;
 mcmUtente: number | null; setMcmUtente: (v: number | null) => void;
 risultato1Utente: number | null; setRisultato1Utente: (v: number | null) => void;
 risultato2Utente: number | null; setRisultato2Utente: (v: number | null) => void;
 risultatoFinaleUtente: string; setRisultatoFinaleUtente: (v: string) => void;
 feedbackFinale: { testo: string; corretto: boolean } | null;
 verificaFinale: (v: string) => void;
 onNew: () => void;
}

function AddSubExercise({
 num1, den1, num2, den2, op, computed,
 mcmUtente, setMcmUtente,
 risultato1Utente, setRisultato1Utente,
 risultato2Utente, setRisultato2Utente,
 risultatoFinaleUtente, setRisultatoFinaleUtente,
 feedbackFinale, verificaFinale, onNew,
}: AddSubExerciseProps) {
 const [showStep3Guide, setShowStep3Guide] = useState(false);
 const [finalNumUtente, setFinalNumUtente] = useState<number | null>(null);
 const [finalDenUtente, setFinalDenUtente] = useState<number | null>(null);
 
 const mcmDisplay = mcmUtente ??"MCM";
 const r1Display = risultato1Utente !== null ? risultato1Utente :"...";
 const r2Display = risultato2Utente !== null ? risultato2Utente :"...";
 const nd1 = Math.abs(den1);
 const nd2 = Math.abs(den2);
 const effNum1 = num1 * (den1 < 0 ? -1 : 1);
 const effNum2 = num2 * (den2 < 0 ? -1 : 1);
 
 const handleFinalVerify = () => {
  if (finalNumUtente !== null) {
   const denVal = finalDenUtente ?? 1;
   const resultStr = denVal === 1 ? String(finalNumUtente) : `${finalNumUtente}/${denVal}`;
   verificaFinale(resultStr);
   setShowStep3Guide(true);
  }
 };

 return (
  <div className="space-y-5">
   {/* Step 1: MCM */}
   <div className="p-4 rounded-xl bg-card/40 border border-border space-y-4 leading-relaxed">
    <p className="text-base font-bold text-primary">1. Calcolo del m.c.m. tra i denominatori</p>

    {/* Notebook Guide: Step 1 */}
    <div className="space-y-1.5 text-base">
     <p className="font-semibold">1.1 Scomposizione in fattori primi dei denominatori:</p>
     <p className="font-mono text-base opacity-80">Denominatore 1ª fraz. ({nd1}): {formatFattori(nd1, computed.fattori1)}</p>
     <p className="font-mono text-base opacity-80">Denominatore 2ª fraz. ({nd2}): {formatFattori(nd2, computed.fattori2)}</p>
     <p className="font-semibold mt-2">1.2 Calcolo del minimo comune multiplo:</p>
     <p className="font-mono text-base opacity-80">
      Il m.c.m. tra {nd1} e {nd2} è uguale a {computed.mcmFormula}, cioè...
     </p>
    </div>

    <NumberInputCanvas
     value={mcmUtente}
     onChange={setMcmUtente}
     label="Inserisci il tuo risultato (m.c.m.):"
     colorClass="text-primary"
    />
    {mcmUtente !== null && (
     <p className={cn(
     "text-base font-bold text-center mt-1",
      mcmUtente === computed.mcmCorretto ?"text-success":"text-destructive",
     )}>
      {mcmUtente === computed.mcmCorretto ?"CORRETTO": `RISULTATO SBAGLIATO. CALCOLA DI NUOVO`}
     </p>
    )}

    {/* MCM fraction preview */}
    <div className="flex justify-center mt-2">
     <FractionDisplay
      numerator={`(${mcmDisplay} : ${nd1}) · (${effNum1}) ${op} (${mcmDisplay} : ${nd2}) · (${effNum2})`}
      denominator={mcmDisplay}
      size="sm"
     />
    </div>
    {/* Equal denominators message — outside dropdown, always visible when correct */}
    {nd1 === nd2 && mcmUtente === computed.mcmCorretto && (
     <p className="font-mono text-base text-center mt-2">
      Il m.c.m tra {nd1} e {nd2} corrisponde al numero stesso, cioè {nd1}
     </p>
    )}
    <NotebookGuide title="RICOPIA SUL QUADERNO:"visible={mcmUtente === computed.mcmCorretto}>
     <div className="flex justify-center my-2">
      <div className="flex items-center gap-4 text-base font-mono bg-muted px-4 py-2 rounded-lg">
       <FractionDisplay numerator={num1} denominator={den1} size="md"/>
       <span className="text-base font-bold">{op}</span>
       <FractionDisplay numerator={num2} denominator={den2} size="md"/>
      </div>
     </div>
     {nd1 !== nd2 && (
     <>
     <p className="font-mono text-base">
      {nd1} = {computed.fattori1[1] === 1 ?"1": Object.entries(computed.fattori1).map(([f, e]) => e === 1 ? f : `${f}${toSuperscript(e)}`).join("·")}<br />
      {nd2} = {computed.fattori2[1] === 1 ?"1": Object.entries(computed.fattori2).map(([f, e]) => e === 1 ? f : `${f}${toSuperscript(e)}`).join("·")}
     </p>
     <p className="font-mono text-base">
      m.c.m.({nd1}, {nd2}) = {computed.mcmFormula} = {computed.mcmCorretto}
     </p>
     </>
     )}
     <div className="flex justify-center my-2">
      <div className="font-mono text-base text-center bg-muted px-4 py-2 rounded-lg">
       ({computed.mcmCorretto} : {nd1}) · ({effNum1}) {op} ({computed.mcmCorretto} : {nd2}) · ({effNum2})<br />
       <span className="border-t border-border block mt-1 pt-1">{computed.mcmCorretto}</span>
      </div>
     </div>
    </NotebookGuide>

   </div>

   {/* Step 2: Division and multiplication */}
   <div className="p-4 rounded-xl bg-card/40 border border-border space-y-4 leading-relaxed">
    <p className="text-base font-bold text-primary">2. Divisione del denominatore col m.c.m. e moltiplicazione col numeratore</p>

    {/* Notebook Guide: Step 2 */}
    <div className="space-y-3">
     <p className="text-base">
      ({mcmDisplay} : {nd1}) · ({effNum1}) = <span className="font-bold">Risultato 1</span>
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
      ({mcmDisplay} : {nd2}) · ({effNum2}) = <span className="font-bold">Risultato 2</span>
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
    </div>
    <NotebookGuide title="RICOPIA SUL QUADERNO:"visible={risultato1Utente === computed.val1Corretto && risultato2Utente === computed.val2Corretto}>
     <p className="font-mono text-base">
      ({computed.mcmCorretto} : {nd1}) · ({effNum1}) = {computed.mcmCorretto / nd1} · ({effNum1}) = <span className="font-bold text-primary">{computed.val1Corretto}</span>
     </p>
     <p className="font-mono text-base">
      ({computed.mcmCorretto} : {nd2}) · ({effNum2}) = {computed.mcmCorretto / nd2} · ({effNum2}) = <span className="font-bold text-primary">{computed.val2Corretto}</span>
     </p>
     <div className="flex justify-center my-2">
      <div className="font-mono text-base text-center bg-muted px-4 py-2 rounded-lg">
       <span className="font-bold">{computed.val1Corretto}</span> {op} (<span className="font-bold">{computed.val2Corretto}</span>)<br />
       <span className="border-t border-border block mt-1 pt-1">{computed.mcmCorretto}</span>
      </div>
     </div>
    </NotebookGuide>

   </div>

   {/* Step 3: Final sum */}
   <div className="p-4 rounded-xl bg-card/40 border border-border space-y-4 leading-relaxed">
    <p className="text-base font-bold text-primary">3. Somma algebrica finale</p>

    {/* Notebook Guide: Step 3 */}
    <div className="flex justify-center">
     <FractionDisplay
      numerator={`${r1Display} ${op} (${r2Display})`}
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
       colorClass="text-primary"
       allowNegative
      />
      {/* Linea di frazione — nascosta se denominatore è 1 */}
      {computed.denFinaleCorretto !== 1 && (
      <div className="flex items-center">
       <div className="w-[100px] h-[2.5px] bg-foreground/80"/>
      </div>
      )}
      {computed.denFinaleCorretto !== 1 && (
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
       colorClass="text-primary"
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
    <NotebookGuide title="RICOPIA SUL QUADERNO:"visible={feedbackFinale?.corretto === true} forceOpen={feedbackFinale?.corretto === true}>
     <p className="font-mono text-base">
      {computed.val1Corretto} {op} ({computed.val2Corretto}) = {computed.numFinaleCorretto}
     </p>
     <div className="flex justify-center my-2">
      <div className="font-mono text-base text-center bg-muted px-4 py-2 rounded-lg">
       {computed.denFinaleCorretto === 1 ? (
        <span className="font-bold">{computed.numFinaleCorretto}</span>
       ) : (
        <>
         <span className="font-bold">{computed.numFinaleCorretto}</span><br />
         <span className="border-t border-border block mt-1 pt-1">{computed.denFinaleCorretto}</span>
        </>
       )}
      </div>
     </div>
     {(() => {
      const absNum = Math.abs(computed.numFinaleCorretto);
      if (absNum > computed.denFinaleCorretto) {
       const intero = Math.floor(absNum / computed.denFinaleCorretto);
       const resto = absNum % computed.denFinaleCorretto;
       return (
        <p className="font-mono text-base">
         {computed.denFinaleCorretto === 1 ? computed.numFinaleCorretto : `${computed.numFinaleCorretto}/${computed.denFinaleCorretto}`} = {computed.numFinaleCorretto < 0 ?"−":""}{intero} + {resto}/{computed.denFinaleCorretto}
        </p>
       );
      }
      return null;
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
}

function MulDivExercise({
 num1, den1, num2, den2, op, computed,
 num1Semplificato, setNum1Semplificato,
 den2Semplificato, setDen2Semplificato,
 den1Semplificato, setDen1Semplificato,
 num2Semplificato, setNum2Semplificato,
 numeratoreFinaleUtente, setNumeratoreFinaleUtente,
 denominatoreFinaleUtente, setDenominatoreFinaleUtente,
 risultatoFinaleUtente, feedbackFinale, verificaFinale, onNew,
}: MulDivExerciseProps) {
 const [showStep3Guide, setShowStep3Guide] = useState(false);
 const [finalNumUtente, setFinalNumUtente] = useState<number | null>(null);
 const [finalDenUtente, setFinalDenUtente] = useState<number | null>(null);
 const nd1 = Math.abs(den1);
 const nd2 = Math.abs(den2);

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

 const numU = numeratoreFinaleUtente;
 const denU = denominatoreFinaleUtente;

 // Build frazione finale display
 let frazFinaleHTML ="";
 if (numU !== null && denU !== null && !isNaN(numU) && !isNaN(denU)) {
  let dn = numU;
  let dd = denU;
  if (dn < 0 && dd < 0) { dn = Math.abs(dn); dd = Math.abs(dd); }
  else if (dd < 0) { dn = -dn; dd = Math.abs(dd); }
  frazFinaleHTML = `${dn} / ${dd}`;
 }

 return (
  <div className="space-y-5">
   {/* Step 1: Initial multiplication */}
   <div className="p-4 rounded-xl bg-card/40 border border-border space-y-4 leading-relaxed">
    <p className="text-base font-bold text-primary">1. Moltiplicazione e inversione</p>

    {/* Notebook Guide: Step 1 */}
    <div className="flex justify-center items-center gap-3 text-lg">
     <FractionDisplay numerator={num1} denominator={nd1} numClass="text-orange-400"denClass="text-sky-400"/>
     <span className="text-xl font-bold text-foreground">×</span>
     {wrapParens && <span className="text-xl text-foreground">(</span>}
     <FractionDisplay numerator={displayNum2} denominator={displayDen2} numClass="text-red-400"denClass="text-blue-400"/>
     {wrapParens && <span className="text-xl text-foreground">)</span>}
    </div>
    <NotebookGuide title="RICOPIA SUL QUADERNO:"visible={num1Semplificato === num1Correct && den2Semplificato === den2Correct}>
     {op ==="/"&& (
      <div className="flex justify-center my-2">
       <div className="flex items-center gap-3 text-base font-mono bg-muted px-4 py-2 rounded-lg">
        <FractionDisplay numerator={num1} denominator={nd1} size="sm"/>
        <span className="text-base">÷</span>
        <FractionDisplay numerator={num2} denominator={nd2} size="sm"/>
        <span className="text-base">→</span>
        <FractionDisplay numerator={num1} denominator={nd1} size="sm"/>
        <span className="text-base">×</span>
        <FractionDisplay numerator={displayNum2} denominator={displayDen2} size="sm"/>
       </div>
      </div>
     )}
     <div className="flex justify-center my-2">
      <div className="flex items-center gap-3 text-base bg-muted px-4 py-2 rounded-lg">
       <FractionDisplay numerator={num1} denominator={nd1} numClass="text-orange-400"denClass="text-sky-400"size="sm"/>
       <span className="text-base font-bold">×</span>
       <FractionDisplay numerator={displayNum2} denominator={displayDen2} numClass="text-red-400"denClass="text-blue-400"size="sm"/>
      </div>
     </div>
    </NotebookGuide>

   </div>

   {/* Step 2: Cross simplification */}
   <div className="p-4 rounded-xl bg-card/40 border border-border space-y-4 leading-relaxed">
    <p className="text-base font-bold text-amber-900">2. SEMPLIFICAZIONE tra frazioni</p>

    {/* Notebook Guide: Step 2 */}
    <div className="space-y-4">
     <div>
      <p className="text-base mb-2">
       <span className="text-amber-900 font-bold">SEMPLIFICAZIONE 1:</span>{" "}
       {computed.divCom1
        ? <>divido sia il <span className="text-orange-400 font-bold">numeratore {num1}</span> che il <span className="text-blue-400 font-bold">denominatore {computed.actualDen2}</span> per <span className="font-bold">{computed.divCom1}</span></>
        : <>DOVREI DIVIDERE NUMERATORE ({num1}) E DENOMINATORE ({computed.actualDen2}). MA NON C'È NESSUN DIVISORE COMUNE TRA {num1} E {computed.actualDen2}. QUINDI RISCRIVO GLI STESSI NUMERI</>
       }
      </p>
      <div className="flex flex-col gap-3">
       <NumberInputCanvas
        value={num1Semplificato}
        onChange={setNum1Semplificato}
        label="Numeratore arancione"
        colorClass="text-orange-400"
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
       <div className="flex justify-start py-1">
        <div className="w-[100px] h-[2.5px] bg-foreground/80"/>
       </div>
       <NumberInputCanvas
        value={den2Semplificato}
        onChange={setDen2Semplificato}
        label="Denominatore blu"
        colorClass="text-blue-400"
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
        ? <>divido sia il <span className="text-sky-400 font-bold">denominatore {nd1}</span> che il <span className="text-red-400 font-bold">numeratore {computed.actualNum2}</span> per <span className="font-bold">{computed.divCom2}</span></>
        : <>DOVREI DIVIDERE DENOMINATORE ({nd1}) E NUMERATORE ({computed.actualNum2}). MA NON C'È NESSUN DIVISORE COMUNE TRA {nd1} E {computed.actualNum2}. QUINDI RISCRIVO GLI STESSI NUMERI</>
       }
      </p>
      <div className="flex flex-col gap-3">
       <NumberInputCanvas
        value={den1Semplificato}
        onChange={setDen1Semplificato}
        label="Denominatore azzurro"
        colorClass="text-sky-400"
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
       <div className="flex justify-start py-1">
        <div className="w-[100px] h-[2.5px] bg-foreground/80"/>
       </div>
       <NumberInputCanvas
        value={num2Semplificato}
        onChange={setNum2Semplificato}
        label="Numeratore rosso"
        colorClass="text-red-400"
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
    <NotebookGuide title="RICOPIA SUL QUADERNO:"visible={den1Semplificato === den1Correct && num2Semplificato === num2Correct}>
     {(!computed.divCom1 && !computed.divCom2) ? (
      <p className="text-base text-center font-bold py-2">NESSUNA SEMPLIFICAZIONE DA FARE</p>
     ) : (
      <>
      {op === "/"&& (
       <div className="flex justify-center my-2">
        <div className="flex items-center gap-3 text-base bg-muted px-4 py-2 rounded-lg">
         <FractionDisplay numerator={num1} denominator={nd1} size="sm"/>
         <span className="text-base">÷</span>
         <FractionDisplay numerator={num2} denominator={nd2} size="sm"/>
         <span className="text-base">→</span>
         <FractionDisplay numerator={num1} denominator={nd1} size="sm"/>
         <span className="text-base">×</span>
         <FractionDisplay numerator={displayNum2} denominator={displayDen2} size="sm"/>
        </div>
       </div>
      )}
      <div className="flex justify-center my-2">
       <div className="flex items-center gap-3 text-base bg-muted px-4 py-2 rounded-lg">
        <div className="flex flex-col items-center">
         <span className="text-orange-400 font-bold font-serif text-base">{dNum1S}</span>
         {(dDen1S !== 1 && dDen1S !=="1") && (
         <>
          <div className="w-10 h-[2px] bg-foreground/70 my-0.5"/>
          <span className="text-sky-400 font-bold font-serif text-base">{dDen1S}</span>
         </>
         )}
        </div>
        <span className="text-base font-bold">×</span>
        <div className="flex flex-col items-center">
         <span className="text-red-400 font-bold font-serif text-base">{dNum2S}</span>
         {(dDen2S !== 1 && dDen2S !=="1") && (
         <>
          <div className="w-10 h-[2px] bg-foreground/70 my-0.5"/>
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
   <div className="p-4 rounded-xl bg-card/40 border border-border space-y-4 leading-relaxed">
    <p className="text-base font-bold text-primary">3. Moltiplicazione finale</p>

    {/* Notebook Guide: Step 3 */}
    <div className="space-y-4">
     <div>
      <p className="text-base mb-2">
       Moltiplicazione numeratori:{""}
       <span className="text-orange-400 font-bold">{dNum1S}</span> · (<span className="text-red-400 font-bold">{dNum2S}</span>) = <span className="font-bold">Risultato numeratore finale</span>
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
       Moltiplicazione denominatori:{""}
       <span className="text-sky-400 font-bold">{dDen1S}</span> · (<span className="text-blue-400 font-bold">{dDen2S}</span>) = <span className="font-bold">Risultato denominatore finale</span>
      </p>
      <NumberInputCanvas
       value={denominatoreFinaleUtente}
       onChange={setDenominatoreFinaleUtente}
       label="Risultato denominatore finale:"
       colorClass="text-primary"
      />
     </div>
    </div>

    {/* Frazione finale display */}
    {frazFinaleHTML && (
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

    {/* Final verification with handwriting */}
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
       colorClass="text-primary"
       allowNegative
      />
      {/* Linea di frazione — nascosta se denominatore è 1 */}
      {computed.denFinaleCorretto !== 1 && (
      <div className="flex items-center">
       <div className="w-[100px] h-[2.5px] bg-foreground/80"/>
      </div>
      )}
      {computed.denFinaleCorretto !== 1 && (
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
       colorClass="text-primary"
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
    <NotebookGuide title="RICOPIA SUL QUADERNO:"visible={feedbackFinale?.corretto === true} forceOpen={feedbackFinale?.corretto === true}>
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
       {computed.denFinaleCorretto === 1 ? (
        <span className="font-bold">{computed.numFinaleCorretto}</span>
       ) : (
        <>
         <span className="font-bold">{computed.numFinaleCorretto}</span><br />
         <span className="border-t border-border block mt-1 pt-1">{computed.denFinaleCorretto}</span>
        </>
       )}
      </div>
     </div>
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
