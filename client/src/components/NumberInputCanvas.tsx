import { useCallback, useEffect, useRef, useState } from "react";
import { MathDrawCanvas, type Stroke } from "@/components/MathDrawCanvas";
import { useMathRecognition } from "@/hooks/useMathRecognition";
import { cn } from "@/lib/utils";

interface NumberInputCanvasProps {
  value: number | null;
  onChange: (value: number | null) => void;
  label: string;
  hint?: string;
  colorClass?: string;
  className?: string;
  allowNegative?: boolean;
}

export function NumberInputCanvas({
  value,
  onChange,
  label,
  hint: _hint,
  colorClass = "text-foreground",
  className,
  allowNegative = true,
}: NumberInputCanvasProps) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [recognizedText, setRecognizedText] = useState<string>("");
  const [isRecognizing, setIsRecognizing] = useState(false);
  const { recognize, isModelReady, isLoading } = useMathRecognition();

  // ─── DIGITA IL VALORE state ──────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // ─── Auto-riconoscimento con debounce ─────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  // Tieni traccia dell'ultimo set di strokes già riconosciuto per evitare loop
  const lastRecognizedStrokesRef = useRef<string>("");
  // Aumentato a 2000ms per permettere la scrittura di numeri a più cifre
  const DEBOUNCE_MS = 2000;

  // Aggiorna il ref ogni volta che strokes cambia
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  const handleStrokesChange = useCallback(
    (newStrokes: Stroke[]) => {
      setStrokes(newStrokes);
      if (newStrokes.length === 0) {
        setRecognizedText("");
        lastRecognizedStrokesRef.current = "";
        // Cancella eventuale debounce pendente
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
      } else {
        // L'utente sta aggiungendo nuovi tratti: resetta il flag di riconoscimento
        // così il debounce riparte con TUTTI i tratti (vecchi + nuovi)
        lastRecognizedStrokesRef.current = "";
      }
    },
    [],
  );

  // ─── Auto-riconoscimento: parte dopo 2s di inattività sul canvas ──
  useEffect(() => {
    // Non fare nulla se non ci sono tratti o il modello non è pronto
    if (strokes.length === 0 || !isModelReady || isLoading) return;

    // Salta se questi strokes sono già stati riconosciuti
    const strokesKey = JSON.stringify(strokes.map(s => s.points.length));
    if (strokesKey === lastRecognizedStrokesRef.current) return;

    // Cancella il timer precedente
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Imposta un nuovo timer: dopo 800ms di inattività, fai il riconoscimento
    debounceRef.current = setTimeout(async () => {
      const currentStrokes = strokesRef.current;
      if (currentStrokes.length === 0) return;

      setIsRecognizing(true);

      // Prima prova la modalità "number" (ottimizzata per cifre 0-9)
      let result = await recognize(currentStrokes, "number");
      // Fallback: se "number" non produce risultati, prova "expression"
      if (!result) {
        result = await recognize(currentStrokes, "expression");
      }

      if (result) {
        // 1. Rimuovi spazi bianchi
        let numStr = result.latex.replace(/\s+/g, "");
        // 2. Sostituisci virgole decimali con punti
        numStr = numStr.replace(/,/g, ".");
        // 3. Rimuovi comandi LaTeX e parentesi
        numStr = numStr
          .replace(/\\mathrm\{([^}]*)\}/g, "$1")
          .replace(/\\[a-zA-Z]+(\{[^}]*\})?/g, "")
          .replace(/[{}]/g, "");
        // 4. Tieni solo cifre, punto decimale e segno meno
        if (allowNegative) {
          numStr = numStr.replace(/[^0-9.\-]/g, "");
          const minusCount = (numStr.match(/-/g) || []).length;
          if (minusCount > 1) {
            numStr = "-" + numStr.replace(/-/g, "");
          }
        } else {
          numStr = numStr.replace(/[^0-9.]/g, "");
        }
        // 5. Edge case
        if (!numStr || numStr === "-" || numStr === ".") {
          setRecognizedText("?");
          setIsRecognizing(false);
          return;
        }

        const parsed = parseFloat(numStr);
        if (!isNaN(parsed)) {
          setRecognizedText(parsed.toString());
          onChange(parsed);
          lastRecognizedStrokesRef.current = strokesKey;
          // NON pulire il canvas: così l'utente può aggiungere altre cifre
          // (es. scrivere prima "1", poi "2" → riconosce "12")
        } else {
          setRecognizedText(numStr || "?");
        }
      }

      setIsRecognizing(false);
    }, DEBOUNCE_MS);

    // Cleanup: cancella il timer se il componente viene smontato
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [strokes, isModelReady, isLoading, recognize, onChange, allowNegative]);

  const handleClear = () => {
    setStrokes([]);
    setRecognizedText("");
    lastRecognizedStrokesRef.current = "";
    onChange(null);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  // ─── DIGITA IL VALORE submit ─────────────────────────────────────
  const handleEditSubmit = useCallback(() => {
    const cleaned = editValue.trim().replace(/\s+/g, "").replace(/,/g, ".");
    if (!cleaned) { setIsEditing(false); return; }

    // Supporta frazioni semplici: "3/4" → 0.75
    const fracMatch = cleaned.match(/^(-?)(\d+\.?\d*)\/(\d+\.?\d*)$/);
    if (fracMatch) {
      const sign = fracMatch[1] === "-" ? -1 : 1;
      const num = parseFloat(fracMatch[2]);
      const den = parseFloat(fracMatch[3]);
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        const parsed = sign * (num / den);
        onChange(round2(parsed));
        setRecognizedText(round2(parsed).toString());
      }
    } else {
      let numStr = cleaned.replace(/[^0-9.\-]/g, "");
      if (allowNegative) {
        const minusCount = (numStr.match(/-/g) || []).length;
        if (minusCount > 1) numStr = "-" + numStr.replace(/-/g, "");
      } else {
        numStr = numStr.replace(/[^0-9.]/g, "");
      }
      if (numStr && numStr !== "-" && numStr !== ".") {
        const parsed = parseFloat(numStr);
        if (!isNaN(parsed)) {
          onChange(parsed);
          setRecognizedText(parsed.toString());
        }
      }
    }
    setIsEditing(false);
    setEditValue("");
  }, [editValue, onChange, allowNegative]);

  const displayValue =
    value !== null && !isNaN(value)
      ? value.toString()
      : recognizedText || "";

  const hasContent = strokes.length > 0;

  return (
    <div className={cn("flex items-start gap-2 h-[75px] sm:h-[85px] overflow-visible", className)}>
      {/* Quadratino del canvas */}
      <div className="flex-shrink-0 w-[120px] sm:w-[135px] h-[75px] sm:h-[85px] rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <MathDrawCanvas
          strokes={strokes}
          onStrokesChange={handleStrokesChange}
          tool="write"
          className="border-0 rounded-none shadow-none ring-0"
          disabled={isLoading || isRecognizing}
          hideWatermark
        />
      </div>

      {/* Colonna destra compatta: label + valore + azioni */}
      <div className="flex flex-col items-center gap-0.5 min-w-0">
        {/* Label */}
        <span className={cn(
          "text-[10px] sm:text-[11px] font-bold tracking-widest text-amber-900 leading-tight",
          colorClass,
        )}>
          {label}
        </span>

        {/* Stato riconoscimento */}
        {isRecognizing && (
          <span className="text-[9px] text-muted-foreground animate-pulse tracking-widest leading-tight">
            RICONOSCIMENTO...
          </span>
        )}
        {isLoading && (
          <span className="text-[9px] text-muted-foreground leading-tight">
            CARICAMENTO...
          </span>
        )}

        {/* Valore riconosciuto + cancella */}
        <div className="flex items-center gap-1">
          {displayValue && (
            <span className="inline-block px-1.5 py-0 rounded bg-secondary text-xs font-serif font-bold">
              {displayValue}
            </span>
          )}
          {hasContent && (
            <button
              onClick={handleClear}
              className="text-[10px] text-amber-900 hover:text-amber-700 transition-colors font-bold tracking-widest leading-tight"
            >
              CANCELLA
            </button>
          )}
        </div>

        {/* ─── DIGITA IL VALORE ─────────────────────────────────── */}
        {isEditing ? (
          <div className="flex items-center gap-1 flex-wrap">
            <input
              ref={editInputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleEditSubmit();
                if (e.key === "Escape") { setIsEditing(false); setEditValue(""); }
              }}
              placeholder='es. 7'
              className="h-6 px-2 rounded border-2 border-primary bg-background text-foreground text-[10px] font-mono w-16 text-center focus:outline-none"
              autoFocus
            />
            <button
              onClick={handleEditSubmit}
              className="h-6 px-2 rounded bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold transition-colors"
            >
              OK
            </button>
            <button
              onClick={() => { setIsEditing(false); setEditValue(""); }}
              className="h-6 w-6 rounded bg-secondary hover:bg-secondary/80 text-foreground text-[10px] font-bold transition-colors flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setIsEditing(true); setEditValue(""); }}
            className="text-muted-foreground hover:text-primary transition-colors text-[10px] tracking-wide leading-tight"
            title="Inserisci manualmente il valore"
          >
            ✎ digita il valore
          </button>
        )}
      </div>
    </div>
  );
}

/** Arrotonda a 2 decimali */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
