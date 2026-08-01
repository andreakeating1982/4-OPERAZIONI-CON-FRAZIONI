import React, { useState, useCallback, useMemo } from "react";
import { NumberInputCanvas } from "@/components/NumberInputCanvas";
import { FractionDisplay } from "@/components/FractionDisplay";
import { cn } from "@/lib/utils";
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

function formatFattori(num: number, fattori: Record<number, number>): string {
  if (num === 1 && fattori[1] === 1) {
    return "Scomposizione in fattori primi di 1 = 1";
  }
  const parts: string[] = [];
  for (const [f, exp] of Object.entries(fattori)) {
    parts.push(exp === 1 ? f : `${f}${"^".repeat(0)}${exp}`);
  }
  return `Scomposizione in fattori primi di ${num} = ${parts.join(" · ")}`;
}

function trovaDivisoriComuni(a: number, b: number): number | null {
  const primi = [2, 3, 5, 7, 11];
  for (const p of primi) {
    if (a % p === 0 && b % p === 0) return p;
  }
  return null;
}

// ─── Main component ────────────────────────────────────────────────

type OperationMode = "addsub" | "muldiv";

export default function FractionExercises() {
  // ─── Mode ──────────────────────────────────────────────────────────
  const [mode, setMode] = useState<OperationMode>("addsub");
  const [addSubOp, setAddSubOp] = useState<"+" | "-">("+");
  const [mulDivOp, setMulDivOp] = useState<"*" | "/">("*");

  // ─── Fraction inputs (handwriting) ─────────────────────────────────
  const [num1, setNum1] = useState<number | null>(null);
  const [den1, setDen1] = useState<number | null>(null);
  const [num2, setNum2] = useState<number | null>(null);
  const [den2, setDen2] = useState<number | null>(null);

  // ─── Phase tracking ────────────────────────────────────────────────
  const [phase, setPhase] = useState<"input" | "exercise">("input");
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
    if (num1 === null || den1 === null || num2 === null || den2 === null) return null;
    if (den1 < 1 || den2 < 1) return null;

    const nd1 = Math.abs(den1);
    const nd2 = Math.abs(den2);
    const mcmCorretto = lcm(nd1, nd2);

    const fattori1 = fattorizzazionePrimi(nd1);
    const fattori2 = fattorizzazionePrimi(nd2);

    let mcmFattori: Record<number, number> = {};
    for (const [f, e] of Object.entries(fattori1)) mcmFattori[+f] = Math.max(mcmFattori[+f] || 0, e);
    for (const [f, e] of Object.entries(fattori2)) mcmFattori[+f] = Math.max(mcmFattori[+f] || 0, e);

    const mcmFormulaParts: string[] = [];
    for (const [f, e] of Object.entries(mcmFattori)) {
      mcmFormulaParts.push(e === 1 ? f : `${f}${"^".repeat(0)}${e}`);
    }

    const effNum1 = num1 * (den1 < 0 ? -1 : 1);
    const effNum2 = num2 * (den2 < 0 ? -1 : 1);
    const val1Corretto = (mcmCorretto / nd1) * effNum1;
    const val2Corretto = (mcmCorretto / nd2) * effNum2;

    const numFinaleCorretto = addSubOp === "+" ? val1Corretto + val2Corretto : val1Corretto - val2Corretto;
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
      mcmFormula: mcmFormulaParts.join(" · "),
    };
  }, [num1, den1, num2, den2, addSubOp]);

  // Mul/Div computed values
  const mulDivComputed = useMemo(() => {
    if (num1 === null || den1 === null || num2 === null || den2 === null) return null;
    if (den1 < 1 || den2 < 1) return null;

    const nd1 = Math.abs(den1);
    const nd2 = Math.abs(den2);

    let actualNum2: number;
    let actualDen2: number;
    let displayNum2: number;
    let displayDen2: number;

    if (mulDivOp === "/") {
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
    if (num1 === null || den1 === null || num2 === null || den2 === null) return;
    if (den1 < 1 || den2 < 1) return;
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
        setFeedbackFinale({ testo: "Formato non valido. Usa N/D o un intero.", corretto: false });
        return;
      }
    } else {
      numU = parseFloat(valore);
      denU = 1;
      if (isNaN(numU)) {
        setFeedbackFinale({ testo: "Inserisci un numero valido.", corretto: false });
        return;
      }
    }

    const u = semplificaFrazione(numU, denU);
    const uStr = u.den === 1 ? `${u.num}` : `${u.num}/${u.den}`;
    const cStr = addSubComputed.denFinaleCorretto === 1
      ? `${addSubComputed.numFinaleCorretto}`
      : `${addSubComputed.numFinaleCorretto}/${addSubComputed.denFinaleCorretto}`;

    if (uStr === cStr) {
      setFeedbackFinale({ testo: "Il risultato è corretto! ✅", corretto: true });
    } else {
      setFeedbackFinale({ testo: `Il risultato non è corretto. Il risultato corretto è ${cStr}`, corretto: false });
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
        setFeedbackFinale({ testo: "Formato non valido.", corretto: false });
        return;
      }
    } else {
      numU = parseFloat(valore);
      denU = 1;
      if (isNaN(numU)) {
        setFeedbackFinale({ testo: "Inserisci un numero valido.", corretto: false });
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
      setFeedbackFinale({ testo: "Il risultato è corretto! ✅", corretto: true });
    } else {
      setFeedbackFinale({ testo: `Il risultato non è corretto. Il risultato corretto è ${cStr} (${valDecimaleCorretto.toFixed(1)})`, corretto: false });
    }
  };

  // ─── Render ────────────────────────────────────────────────────────

  const allFilled = num1 !== null && den1 !== null && num2 !== null && den2 !== null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-center">
          <h1 className="text-lg font-bold text-foreground tracking-widest uppercase">OPERAZIONI CON LE FRAZIONI</h1>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full p-3 sm:p-4">
        {/* Mode selector */}
        <div className="flex gap-1 p-1 bg-card/60 backdrop-blur-sm rounded-xl border border-border mb-4">
          <button
            onClick={() => { setMode("addsub"); handleNewExercise(); }}
            className={cn(
              "flex-1 flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-bold transition-all duration-200",
              mode === "addsub"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary",
            )}
          >
            + / &minus; ADDIZIONE / SOTTRAZIONE
          </button>
          <button
            onClick={() => { setMode("muldiv"); handleNewExercise(); }}
            className={cn(
              "flex-1 flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-bold transition-all duration-200",
              mode === "muldiv"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary",
            )}
          >
            &times; / &divide; MOLTIPLICAZIONE / DIVISIONE
          </button>
        </div>

        {/* Input phase */}
        {phase === "input" && (
          <div className="space-y-6">
            {/* Suggerimento */}
            <div className="text-center">
              <span className="text-xs text-muted-foreground tracking-widest font-semibold">
                SCRIVI IL NUMERO NEL RIQUADRO
              </span>
            </div>

            {/* Operation selector */}
            <div className="flex items-center justify-center gap-3">
              <label className="text-sm font-bold tracking-wider">OPERAZIONE:</label>
              {mode === "addsub" ? (
                <select
                  value={addSubOp}
                  onChange={(e) => setAddSubOp(e.target.value as "+" | "-")}
                  className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="+">ADDIZIONE (+)</option>
                  <option value="-">SOTTRAZIONE (&minus;)</option>
                </select>
              ) : (
                <select
                  value={mulDivOp}
                  onChange={(e) => setMulDivOp(e.target.value as "*" | "/")}
                  className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="*">MOLTIPLICAZIONE (&times;)</option>
                  <option value="/">DIVISIONE (&divide;)</option>
                </select>
              )}
            </div>

            {/* Prima frazione */}
            <div className="rounded-xl border border-border bg-card overflow-hidden animate-pop-in max-w-xs mx-auto w-full">
              <div className="py-2.5 border-b border-border bg-secondary/50">
                <span className="text-sm font-bold tracking-widest">
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
                  <div className="w-[100px] h-[2.5px] bg-foreground/80" />
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
                {mode === "addsub" ? (addSubOp === "+" ? "+" : "\u2212") : (mulDivOp === "*" ? "\u00d7" : "\u00f7")}
              </span>
            </div>

            {/* Seconda frazione */}
            <div className="rounded-xl border border-border bg-card overflow-hidden animate-pop-in max-w-xs mx-auto w-full">
              <div className="py-2.5 border-b border-border bg-secondary/50">
                <span className="text-sm font-bold tracking-widest">
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
                  <div className="w-[100px] h-[2.5px] bg-foreground/80" />
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
                  <div className="w-12 h-[2px] bg-foreground/70 my-0.5" />
                  <span className="text-lg font-bold font-serif">{den1}</span>
                </div>
                {/* Segno operazione */}
                <span className="text-xl font-bold text-primary">
                  {mode === "addsub" ? (addSubOp === "+" ? "+" : "\u2212") : (mulDivOp === "*" ? "\u00d7" : "\u00f7")}
                </span>
                {/* Seconda frazione */}
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold font-serif">{num2}</span>
                  <div className="w-12 h-[2px] bg-foreground/70 my-0.5" />
                  <span className="text-lg font-bold font-serif">{den2}</span>
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
        {phase === "exercise" && submitted && (
          <div className="space-y-5">
            {/* --- ADD/SUB EXERCISE --- */}
            {mode === "addsub" && addSubComputed && (
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
            {mode === "muldiv" && mulDivComputed && (
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
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border-2 border-amber-500/30 bg-amber-500/5 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-500/10 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-amber-400 text-base">📓</span>
          <span className="text-sm font-bold text-amber-300">{title}</span>
        </div>
        <span className={cn(
          "text-amber-400 text-sm transition-transform duration-300",
          isOpen && "rotate-180",
        )}>{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1">
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/15 p-3.5 space-y-2.5 text-sm leading-relaxed text-amber-100/90">
            {/* Notebook lines */}
            <div
              className="relative"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(transparent, transparent 1.55rem, rgba(251,191,36,0.08) 1.55rem, rgba(251,191,36,0.08) 1.6rem)",
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
  num1: number; den1: number; num2: number; den2: number; op: "+" | "-";
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
  const mcmDisplay = mcmUtente ?? "MCM";
  const r1Display = risultato1Utente !== null ? risultato1Utente : "...";
  const r2Display = risultato2Utente !== null ? risultato2Utente : "...";
  const nd1 = Math.abs(den1);
  const nd2 = Math.abs(den2);
  const effNum1 = num1 * (den1 < 0 ? -1 : 1);
  const effNum2 = num2 * (den2 < 0 ? -1 : 1);

  return (
    <div className="space-y-5">
      {/* Step 1: MCM */}
      <div className="p-4 rounded-xl bg-card/40 border border-border space-y-3">
        <p className="text-sm font-bold text-foreground">1. Calcolo del m.c.m. tra i denominatori</p>
        <p className="text-xs text-muted-foreground uppercase font-semibold">Copiare</p>

        {/* Notebook Guide: Step 1 */}
        <NotebookGuide title="Cosa scrivere sul quaderno — Passo 1: m.c.m.">
          <p className="font-bold text-amber-200">1.</p>
          <p>Scrivi il titolo dell'esercizio: <span className="font-semibold text-amber-100">«Addizione tra frazioni»</span> (oppure «Sottrazione tra frazioni»).</p>
          <p className="font-bold text-amber-200">2.</p>
          <p>
            Scrivi le due frazioni <span className="italic">una accanto all'altra</span> con il segno{" "}
            <span className="font-mono font-bold text-amber-100">{op}</span> in mezzo, lasciando spazio sotto per i calcoli:
          </p>
          <div className="flex justify-center my-2">
            <div className="flex items-center gap-4 text-base font-mono bg-amber-500/10 px-4 py-2 rounded-lg">
              <FractionDisplay numerator={num1} denominator={den1} size="md" />
              <span className="text-lg font-bold">{op}</span>
              <FractionDisplay numerator={num2} denominator={den2} size="md" />
            </div>
          </div>
          <p className="font-bold text-amber-200">3.</p>
          <p>
            Sotto le frazioni, <span className="italic">scomponi i denominatori in fattori primi</span>:
          </p>
          <p className="font-mono text-xs pl-2 border-l-2 border-amber-500/30 ml-2">
            {nd1} = {computed.fattori1[1] === 1 ? "1" : Object.entries(computed.fattori1).map(([f, e]) => e === 1 ? f : `${f}${String.fromCharCode(0x2074 + e - 4 > 0 ? 0x00B2 + e - 2 : 0)}`).join(" · ")}<br />
            {nd2} = {computed.fattori2[1] === 1 ? "1" : Object.entries(computed.fattori2).map(([f, e]) => e === 1 ? f : `${f}${String.fromCharCode(0x2074 + e - 4 > 0 ? 0x00B2 + e - 2 : 0)}`).join(" · ")}
          </p>
          <p className="font-bold text-amber-200">4.</p>
          <p>
            Calcola il <span className="font-bold text-amber-100">m.c.m.</span>: prendi <span className="italic">tutti</span> i fattori, ciascuno con l'esponente <span className="italic">più alto</span>.
          </p>
          <p className="font-mono text-xs pl-2 border-l-2 border-amber-500/30 ml-2">
            m.c.m.({nd1}, {nd2}) = {computed.mcmFormula} = {computed.mcmCorretto}
          </p>
          <p className="font-bold text-amber-200">5.</p>
          <p>
            Traccia una <span className="italic">linea di frazione lunga</span> e scrivi il m.c.m. come denominatore comune.
            Sopra la linea, scrivi l'espressione con le parentesi vuote:
          </p>
          <div className="flex justify-center my-2">
            <div className="font-mono text-xs text-center bg-amber-500/10 px-4 py-2 rounded-lg">
              ({computed.mcmCorretto} : {nd1}) · ({effNum1}) {op} ({computed.mcmCorretto} : {nd2}) · ({effNum2})<br />
              <span className="border-t border-amber-500/50 block mt-1 pt-1">{computed.mcmCorretto}</span>
            </div>
          </div>
        </NotebookGuide>

        <div className="space-y-1.5 text-sm">
          <p className="font-semibold">1.1 Scomposizione in fattori primi:</p>
          <p className="font-mono text-xs opacity-80">{formatFattori(nd1, computed.fattori1)}</p>
          <p className="font-mono text-xs opacity-80">{formatFattori(nd2, computed.fattori2)}</p>
          <p className="font-semibold mt-2">1.2 Calcolo del minimo comune multiplo:</p>
          <p className="font-mono text-xs opacity-80">
            Il m.c.m. tra {nd1} e {nd2} è uguale a {computed.mcmFormula}, cioè...
          </p>
        </div>

        <NumberInputCanvas
          value={mcmUtente}
          onChange={setMcmUtente}
          label="Inserisci il tuo risultato (m.c.m.):"
          colorClass="text-primary"
        />

        {/* MCM fraction preview */}
        <div className="flex justify-center mt-2">
          <FractionDisplay
            numerator={`(${mcmDisplay} : ${nd1}) · (${effNum1}) ${op} (${mcmDisplay} : ${nd2}) · (${effNum2})`}
            denominator={mcmDisplay}
            size="sm"
          />
        </div>
      </div>

      {/* Step 2: Division and multiplication */}
      <div className="p-4 rounded-xl bg-card/40 border border-border space-y-3">
        <p className="text-sm font-bold text-foreground">2. Divisione del denominatore col m.c.m. e moltiplicazione col numeratore</p>
        <p className="text-xs text-muted-foreground uppercase font-semibold">Calcolare</p>

        {/* Notebook Guide: Step 2 */}
        <NotebookGuide title="Cosa scrivere sul quaderno — Passo 2: Divisione e moltiplicazione">
          <p className="font-bold text-amber-200">1.</p>
          <p>
            Per la <span className="font-bold text-amber-100">prima frazione</span>: dividi il m.c.m. per il denominatore e moltiplica per il numeratore.
          </p>
          <p className="font-mono text-xs pl-2 border-l-2 border-amber-500/30 ml-2">
            ({computed.mcmCorretto} : {nd1}) · ({effNum1}) = {computed.mcmCorretto / nd1} · ({effNum1}) = <span className="font-bold text-amber-100">{computed.val1Corretto}</span>
          </p>
          <p className="font-bold text-amber-200">2.</p>
          <p>
            Per la <span className="font-bold text-amber-100">seconda frazione</span>: stesso procedimento.
          </p>
          <p className="font-mono text-xs pl-2 border-l-2 border-amber-500/30 ml-2">
            ({computed.mcmCorretto} : {nd2}) · ({effNum2}) = {computed.mcmCorretto / nd2} · ({effNum2}) = <span className="font-bold text-amber-100">{computed.val2Corretto}</span>
          </p>
          <p className="font-bold text-amber-200">3.</p>
          <p>
            Riscrivi la frazione con denominatore comune sostituendo i risultati al numeratore:
          </p>
          <div className="flex justify-center my-2">
            <div className="font-mono text-sm text-center bg-amber-500/10 px-4 py-2 rounded-lg">
              <span className="font-bold">{computed.val1Corretto}</span> {op} (<span className="font-bold">{computed.val2Corretto}</span>)<br />
              <span className="border-t border-amber-500/50 block mt-1 pt-1">{computed.mcmCorretto}</span>
            </div>
          </div>
          <p className="font-bold text-amber-200">4.</p>
          <p>
            <span className="italic">Attenzione:</span> se l'operazione è una <span className="font-bold">sottrazione</span>, ricorda che il meno davanti a una parentesi cambia il segno di ciò che sta dentro! Esempio: −(+5) = −5, −(−3) = +3.
          </p>
        </NotebookGuide>

        <div className="space-y-3">
          <p className="text-sm">
            ({mcmDisplay} : {nd1}) · ({effNum1}) = <span className="font-bold">Risultato 1</span>
          </p>
          <NumberInputCanvas
            value={risultato1Utente}
            onChange={setRisultato1Utente}
            label="Inserisci risultato 1:"
            colorClass="text-orange-400"
            allowNegative
          />

          <p className="text-sm">
            ({mcmDisplay} : {nd2}) · ({effNum2}) = <span className="font-bold">Risultato 2</span>
          </p>
          <NumberInputCanvas
            value={risultato2Utente}
            onChange={setRisultato2Utente}
            label="Inserisci risultato 2:"
            colorClass="text-red-400"
            allowNegative
          />
        </div>
      </div>

      {/* Step 3: Final sum */}
      <div className="p-4 rounded-xl bg-card/40 border border-border space-y-3">
        <p className="text-sm font-bold text-foreground">3. Somma algebrica finale</p>
        <p className="text-xs text-muted-foreground uppercase font-semibold">Copiare</p>

        {/* Notebook Guide: Step 3 */}
        <NotebookGuide title="Cosa scrivere sul quaderno — Passo 3: Somma algebrica e risultato">
          <p className="font-bold text-amber-200">1.</p>
          <p>
            Esegui l'operazione al <span className="font-bold text-amber-100">numeratore</span>:
          </p>
          <p className="font-mono text-xs pl-2 border-l-2 border-amber-500/30 ml-2">
            {computed.val1Corretto} {op} ({computed.val2Corretto}) = {computed.numFinaleCorretto}
          </p>
          <p className="font-bold text-amber-200">2.</p>
          <p>
            Scrivi il <span className="font-bold text-amber-100">risultato come frazione</span> (se il numeratore e il denominatore hanno un divisore comune, semplifica):
          </p>
          <div className="flex justify-center my-2">
            <div className="font-mono text-sm text-center bg-amber-500/10 px-4 py-2 rounded-lg">
              <span className="font-bold">{computed.numFinaleCorretto}</span><br />
              <span className="border-t border-amber-500/50 block mt-1 pt-1">{computed.denFinaleCorretto}</span>
            </div>
          </div>
          {computed.denFinaleCorretto !== computed.mcmCorretto && (
            <p className="text-xs text-amber-300/80 italic">
              Nota: la frazione è stata semplificata dividendo numeratore e denominatore per{" "}
              {computed.mcmCorretto / computed.denFinaleCorretto}.
            </p>
          )}
          <p className="font-bold text-amber-200">3.</p>
          <p>
            Se il numeratore è <span className="italic">più grande</span> del denominatore, puoi anche scrivere il <span className="font-bold text-amber-100">numero misto</span>:
          </p>
          {(() => {
            const absNum = Math.abs(computed.numFinaleCorretto);
            if (absNum > computed.denFinaleCorretto) {
              const intero = Math.floor(absNum / computed.denFinaleCorretto);
              const resto = absNum % computed.denFinaleCorretto;
              return (
                <p className="font-mono text-xs pl-2 border-l-2 border-amber-500/30 ml-2">
                  {computed.numFinaleCorretto}/{computed.denFinaleCorretto} = {computed.numFinaleCorretto < 0 ? "−" : ""}{intero} + {resto}/{computed.denFinaleCorretto}
                </p>
              );
            }
            return (
              <p className="text-xs text-amber-300/70 italic">
                Il numeratore è minore del denominatore, quindi la frazione è già nella forma più semplice (frazione propria).
              </p>
            );
          })()}
          <p className="font-bold text-amber-200">4.</p>
          <p>
            <span className="font-bold text-amber-100">Cerchia</span> il risultato finale con un rettangolo o un ovale per evidenziarlo.
          </p>
        </NotebookGuide>

        <div className="flex justify-center">
          <FractionDisplay
            numerator={`${r1Display} ${op} (${r2Display})`}
            denominator={mcmDisplay}
            size="md"
          />
        </div>

        {/* Final result input: text input since it can be a fraction */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Inserisci il tuo risultato finale
          </label>
          <input
            type="text"
            value={risultatoFinaleUtente}
            onChange={(e) => setRisultatoFinaleUtente(e.target.value)}
            placeholder="Es. 2/3 o 5"
            className="w-full px-4 py-2.5 rounded-lg bg-card border border-border text-foreground text-center text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={() => verificaFinale(risultatoFinaleUtente)}
            className="w-full py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-all duration-200"
          >
            Verifica il risultato
          </button>
        </div>

        {feedbackFinale && (
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-lg text-sm font-medium",
            feedbackFinale.corretto
              ? "bg-[#2ecc71]/10 text-[#2ecc71] border border-[#2ecc71]/30"
              : "bg-amber-500/10 text-amber-400 border border-amber-500/20",
          )}>
            {feedbackFinale.corretto
              ? <span className="text-[#2ecc71] text-base font-bold flex-shrink-0">✓</span>
              : <span className="text-red-500 text-base font-bold flex-shrink-0">✗</span>
            }
            <span>{feedbackFinale.testo}</span>
          </div>
        )}
      </div>

      {/* New exercise */}
      <button
        onClick={onNew}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-sm font-semibold transition-all duration-200"
      >
        <span className="text-base font-bold">→</span>
        <span>Nuovo esercizio</span>
      </button>
    </div>
  );
}

// ─── MUL/DIV EXERCISE SUB-COMPONENT ─────────────────────────────────

interface MulDivExerciseProps {
  num1: number; den1: number; num2: number; den2: number; op: "*" | "/";
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
  const nd1 = Math.abs(den1);
  const nd2 = Math.abs(den2);

  const dNum1S = num1Semplificato !== null ? num1Semplificato : "...";
  const dDen2S = den2Semplificato !== null ? den2Semplificato : "...";
  const dDen1S = den1Semplificato !== null ? den1Semplificato : "...";
  const dNum2S = num2Semplificato !== null ? num2Semplificato : "...";

  // Display the initial operation with colors
  const displayNum2 = computed.displayNum2;
  const displayDen2 = computed.displayDen2;
  const wrapParens = num2 < 0 && op === "/";

  const numU = numeratoreFinaleUtente;
  const denU = denominatoreFinaleUtente;

  // Build frazione finale display
  let frazFinaleHTML = "";
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
      <div className="p-4 rounded-xl bg-card/40 border border-border space-y-3">
        <p className="text-sm font-bold text-foreground">1. Moltiplicazione e inversione</p>
        <p className="text-xs text-muted-foreground uppercase font-semibold">Copiare</p>

        {/* Notebook Guide: Step 1 */}
        <NotebookGuide title="Cosa scrivere sul quaderno — Passo 1: Impostazione dell'operazione">
          <p className="font-bold text-amber-200">1.</p>
          <p>Scrivi il titolo: <span className="font-semibold text-amber-100">«{op === "*" ? "Moltiplicazione" : "Divisione"} tra frazioni»</span>.</p>
          {op === "/" && (
            <>
              <p className="font-bold text-amber-200">2.</p>
              <p>
                <span className="font-bold text-amber-100">REGOLA FONDAMENTALE:</span> per dividere due frazioni,{" "}
                <span className="italic">inverti la seconda frazione</span> (scambiando numeratore e denominatore) e{" "}
                <span className="italic">trasforma la divisione in moltiplicazione</span>.
              </p>
              <div className="flex justify-center my-2">
                <div className="flex items-center gap-3 text-sm font-mono bg-amber-500/10 px-4 py-2 rounded-lg">
                  <FractionDisplay numerator={num1} denominator={nd1} size="sm" />
                  <span className="text-lg">÷</span>
                  <FractionDisplay numerator={num2} denominator={nd2} size="sm" />
                  <span className="text-lg">→</span>
                  <FractionDisplay numerator={num1} denominator={nd1} size="sm" />
                  <span className="text-lg">×</span>
                  <FractionDisplay numerator={displayNum2} denominator={displayDen2} size="sm" />
                </div>
              </div>
              <p className="text-xs text-amber-300/80 italic">
                Attenzione: se la seconda frazione ha il segno meno, questo rimane attaccato al numeratore dopo l'inversione.
              </p>
            </>
          )}
          {op === "*" && (
            <>
              <p className="font-bold text-amber-200">2.</p>
              <p>Scrivi le due frazioni una accanto all'altra con il segno <span className="font-mono font-bold text-amber-100">×</span> tra di esse.</p>
            </>
          )}
          <p className="font-bold text-amber-200">{op === "/" ? "3" : "3"}.</p>
          <p>
            Sul quaderno, disponi le frazioni in orizzontale:
          </p>
          <div className="flex justify-center my-2">
            <div className="flex items-center gap-3 text-sm bg-amber-500/10 px-4 py-2 rounded-lg">
              <FractionDisplay numerator={num1} denominator={nd1} numClass="text-orange-400" denClass="text-sky-400" size="sm" />
              <span className="text-lg font-bold">×</span>
              <FractionDisplay numerator={displayNum2} denominator={displayDen2} numClass="text-red-400" denClass="text-blue-400" size="sm" />
            </div>
          </div>
        </NotebookGuide>
        <div className="flex justify-center items-center gap-3 text-lg">
          <FractionDisplay numerator={num1} denominator={nd1} numClass="text-orange-400" denClass="text-sky-400" />
          <span className="text-xl font-bold text-foreground">×</span>
          {wrapParens && <span className="text-xl text-foreground">(</span>}
          <FractionDisplay numerator={displayNum2} denominator={displayDen2} numClass="text-red-400" denClass="text-blue-400" />
          {wrapParens && <span className="text-xl text-foreground">)</span>}
        </div>
      </div>

      {/* Step 2: Cross simplification */}
      <div className="p-4 rounded-xl bg-card/40 border border-border space-y-3">
        <p className="text-sm font-bold text-foreground">2. Semplificazione tra frazioni</p>
        <p className="text-xs text-muted-foreground uppercase font-semibold">Copiare</p>

        {/* Notebook Guide: Step 2 */}
        <NotebookGuide title="Cosa scrivere sul quaderno — Passo 2: Semplificazione incrociata">
          <p className="font-bold text-amber-200">1.</p>
          <p>
            Nella moltiplicazione tra frazioni, puoi <span className="font-bold text-amber-100">semplificare in croce</span>:{" "}
            dividere un numeratore e un denominatore di frazioni <span className="italic">diverse</span> per lo stesso numero.
          </p>
          <p className="font-bold text-amber-200">2.</p>
          <p>
            <span className="font-bold text-amber-100">Primo incrocio:</span> cerca un divisore comune tra il{" "}
            <span className="text-orange-400 font-bold">numeratore 1 ({num1})</span> e il{" "}
            <span className="text-blue-400 font-bold">denominatore 2 ({computed.actualDen2})</span>
            {computed.divCom1 ? (
              <>. Il divisore comune è <span className="font-bold text-amber-100">{computed.divCom1}</span>.</>
            ) : (
              <>. Non c'è nessun divisore comune, quindi <span className="italic">riscrivi gli stessi numeri</span>.</>
            )}
          </p>
          {computed.divCom1 && (
            <p className="font-mono text-xs pl-2 border-l-2 border-amber-500/30 ml-2">
              {num1} : {computed.divCom1} = {Math.abs(num1) / computed.divCom1 * (num1 < 0 ? -1 : 1)}{" "}
              &nbsp;&nbsp;{computed.actualDen2} : {computed.divCom1} = {Math.abs(computed.actualDen2) / computed.divCom1}
            </p>
          )}
          <p className="font-bold text-amber-200">3.</p>
          <p>
            <span className="font-bold text-amber-100">Secondo incrocio:</span> cerca un divisore comune tra il{" "}
            <span className="text-sky-400 font-bold">denominatore 1 ({nd1})</span> e il{" "}
            <span className="text-red-400 font-bold">numeratore 2 ({computed.actualNum2})</span>
            {computed.divCom2 ? (
              <>. Il divisore comune è <span className="font-bold text-amber-100">{computed.divCom2}</span>.</>
            ) : (
              <>. Non c'è nessun divisore comune, quindi <span className="italic">riscrivi gli stessi numeri</span>.</>
            )}
          </p>
          {computed.divCom2 && (
            <p className="font-mono text-xs pl-2 border-l-2 border-amber-500/30 ml-2">
              {nd1} : {computed.divCom2} = {Math.abs(nd1) / computed.divCom2}{" "}
              &nbsp;&nbsp;{computed.actualNum2} : {computed.divCom2} = {Math.abs(computed.actualNum2) / computed.divCom2 * (computed.actualNum2 < 0 ? -1 : 1)}
            </p>
          )}
          <p className="font-bold text-amber-200">4.</p>
          <p>
            <span className="italic">Sul quaderno</span>, barra i numeri originali e scrivi quelli semplificati a fianco:
          </p>
          <div className="flex justify-center my-2">
            <div className="font-mono text-xs text-center bg-amber-500/10 px-4 py-2 rounded-lg leading-relaxed">
              <span className="line-through decoration-red-500/50">{num1}</span>→{num1Semplificato !== null ? num1Semplificato : "?"}{" "}
              &nbsp; &nbsp;
              <span className="line-through decoration-red-500/50">{computed.actualDen2}</span>→{den2Semplificato !== null ? den2Semplificato : "?"}<br />
              <span className="line-through decoration-red-500/50">{nd1}</span>→{den1Semplificato !== null ? den1Semplificato : "?"}{" "}
              &nbsp; &nbsp;
              <span className="line-through decoration-red-500/50">{computed.actualNum2}</span>→{num2Semplificato !== null ? num2Semplificato : "?"}
            </div>
          </div>
        </NotebookGuide>

        <div className="space-y-4">
          <div>
            <p className="text-xs mb-2">
              Semplificazione 1: divido sia il <span className="text-orange-400 font-bold">numeratore {num1}</span> che il <span className="text-blue-400 font-bold">denominatore {computed.actualDen2}</span>
              {" "}{computed.divCom1
                ? <>per <span className="font-bold">{computed.divCom1}</span></>
                : <>. Ma non c'è nessun divisore in comune tra {num1} e {computed.actualDen2}. Riscrivo gli stessi numeri</>
              }
            </p>
            <div className="grid grid-cols-2 gap-3">
              <NumberInputCanvas
                value={num1Semplificato}
                onChange={setNum1Semplificato}
                label="Numeratore arancione"
                colorClass="text-orange-400"
              />
              <NumberInputCanvas
                value={den2Semplificato}
                onChange={setDen2Semplificato}
                label="Denominatore blu"
                colorClass="text-blue-400"
              />
            </div>
          </div>

          <div>
            <p className="text-xs mb-2">
              Semplificazione 2: divido sia il <span className="text-sky-400 font-bold">denominatore {nd1}</span> che il <span className="text-red-400 font-bold">numeratore {computed.actualNum2}</span>
              {" "}{computed.divCom2
                ? <>per <span className="font-bold">{computed.divCom2}</span></>
                : <>. Ma non c'è nessun divisore in comune tra {nd1} e {computed.actualNum2}. Riscrivo gli stessi numeri</>
              }
            </p>
            <div className="grid grid-cols-2 gap-3">
              <NumberInputCanvas
                value={den1Semplificato}
                onChange={setDen1Semplificato}
                label="Denominatore azzurro"
                colorClass="text-sky-400"
              />
              <NumberInputCanvas
                value={num2Semplificato}
                onChange={setNum2Semplificato}
                label="Numeratore rosso"
                colorClass="text-red-400"
                allowNegative
              />
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Final multiplication */}
      <div className="p-4 rounded-xl bg-card/40 border border-border space-y-3">
        <p className="text-sm font-bold text-foreground">3. Moltiplicazione finale</p>
        <p className="text-xs text-muted-foreground uppercase font-semibold">Copiare</p>

        {/* Notebook Guide: Step 3 */}
        <NotebookGuide title="Cosa scrivere sul quaderno — Passo 3: Moltiplicazione e risultato">
          <p className="font-bold text-amber-200">1.</p>
          <p>
            <span className="font-bold text-amber-100">Moltiplica i numeratori</span> tra loro:
          </p>
          <p className="font-mono text-xs pl-2 border-l-2 border-amber-500/30 ml-2">
            (numeratore semplificato 1) × (numeratore semplificato 2) ={" "}
            {num1Semplificato !== null && num2Semplificato !== null
              ? <span className="font-bold text-amber-100">{num1Semplificato} × {num2Semplificato} = {num1Semplificato * num2Semplificato}</span>
              : <span className="italic">... × ... = ?</span>
            }
          </p>
          <p className="font-bold text-amber-200">2.</p>
          <p>
            <span className="font-bold text-amber-100">Moltiplica i denominatori</span> tra loro:
          </p>
          <p className="font-mono text-xs pl-2 border-l-2 border-amber-500/30 ml-2">
            (denominatore semplificato 1) × (denominatore semplificato 2) ={" "}
            {den1Semplificato !== null && den2Semplificato !== null
              ? <span className="font-bold text-amber-100">{den1Semplificato} × {den2Semplificato} = {den1Semplificato * den2Semplificato}</span>
              : <span className="italic">... × ... = ?</span>
            }
          </p>
          <p className="font-bold text-amber-200">3.</p>
          <p>
            Scrivi il <span className="font-bold text-amber-100">risultato come frazione</span> (semplifica se possibile):
          </p>
          <div className="flex justify-center my-2">
            <div className="font-mono text-sm text-center bg-amber-500/10 px-4 py-2 rounded-lg">
              <span className="font-bold">{computed.numFinaleCorretto}</span><br />
              <span className="border-t border-amber-500/50 block mt-1 pt-1">{computed.denFinaleCorretto}</span>
            </div>
          </div>
          {(() => {
            const rawNum = num1 * computed.actualNum2;
            const rawDen = nd1 * computed.actualDen2;
            const gcdVal = gcd(rawNum, rawDen);
            if (gcdVal > 1) {
              return (
                <p className="text-xs text-amber-300/80 italic">
                  Nota: la frazione è stata semplificata. Prodotto iniziale: {rawNum}/{rawDen}{" "}
                  → diviso per {gcdVal} → {computed.numFinaleCorretto}/{computed.denFinaleCorretto}.
                </p>
              );
            }
            return (
              <p className="text-xs text-amber-300/70 italic">
                La frazione è già ridotta ai minimi termini.
              </p>
            );
          })()}
          <p className="font-bold text-amber-200">4.</p>
          <p>
            <span className="font-bold text-amber-100">Cerchia</span> il risultato finale. Se il numeratore è maggiore del denominatore, puoi anche scrivere il numero misto.
          </p>
        </NotebookGuide>

        <div className="space-y-4">
          <div>
            <p className="text-sm mb-2">
              Moltiplicazione numeratori:{" "}
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
            <p className="text-sm mb-2">
              Moltiplicazione denominatori:{" "}
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
            <div className="px-5 py-3 rounded-xl bg-primary/10 border border-primary/20">
              <FractionDisplay
                numerator={numU! < 0 && denU! < 0 ? Math.abs(numU!) : (denU! < 0 ? -Math.abs(numU!) : numU!)}
                denominator={denU! < 0 ? Math.abs(denU!) : denU!}
                size="lg"
              />
            </div>
          </div>
        )}

        {/* Final verification */}
        <div className="space-y-1.5 mt-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Trascrivi qui la frazione che è apparsa sopra
          </label>
          <input
            type="text"
            value={risultatoFinaleUtente}
            onChange={(e) => setRisultatoFinaleUtente(e.target.value)}
            placeholder="Es. 2/3 o 0.66"
            className="w-full px-4 py-2.5 rounded-lg bg-card border border-border text-foreground text-center text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={() => verificaFinale(risultatoFinaleUtente)}
            className="w-full py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-all duration-200"
          >
            Verifica il risultato
          </button>
        </div>

        {feedbackFinale && (
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-lg text-sm font-medium",
            feedbackFinale.corretto
              ? "bg-[#2ecc71]/10 text-[#2ecc71] border border-[#2ecc71]/30"
              : "bg-amber-500/10 text-amber-400 border border-amber-500/20",
          )}>
            {feedbackFinale.corretto
              ? <span className="text-[#2ecc71] text-base font-bold flex-shrink-0">✓</span>
              : <span className="text-red-500 text-base font-bold flex-shrink-0">✗</span>
            }
            <span>{feedbackFinale.testo}</span>
          </div>
        )}
      </div>

      {/* New exercise */}
      <button
        onClick={onNew}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-sm font-semibold transition-all duration-200"
      >
        <span className="text-base font-bold">→</span>
        <span>Nuovo esercizio</span>
      </button>
    </div>
  );
}
