import { useCallback, useState } from "react";
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

  const handleStrokesChange = useCallback(
    (newStrokes: Stroke[]) => {
      setStrokes(newStrokes);
      if (newStrokes.length === 0) {
        setRecognizedText("");
      }
    },
    [],
  );

  const handleManualRecognize = useCallback(async () => {
    if (strokes.length === 0 || !isModelReady) return;
    setIsRecognizing(true);
    const result = await recognize(strokes, "number");
    if (result) {
      let numStr = result.latex
        .replace(/\\mathrm\{([^}]*)\}/g, "$1")
        .replace(/[{}]/g, "")
        .trim();

      if (!allowNegative) {
        numStr = numStr.replace(/^-/, "");
      }

      const parsed = parseFloat(numStr);
      if (!isNaN(parsed)) {
        setRecognizedText(numStr);
        onChange(parsed);
        setTimeout(() => setStrokes([]), 1200);
      } else {
        setRecognizedText(numStr || "?");
      }
    }
    setIsRecognizing(false);
  }, [strokes, recognize, isModelReady, onChange, allowNegative]);

  const handleClear = () => {
    setStrokes([]);
    setRecognizedText("");
    onChange(null);
  };

  const displayValue =
    value !== null && !isNaN(value)
      ? value.toString()
      : recognizedText || "";

  const hasContent = strokes.length > 0;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Quadratino del canvas */}
      <div className="flex-shrink-0 w-[100px] h-[85px] rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <MathDrawCanvas
          strokes={strokes}
          onStrokesChange={handleStrokesChange}
          tool="write"
          height={85}
          className="border-0 rounded-none shadow-none ring-0"
          disabled={isLoading || isRecognizing}
          hideWatermark
        />
      </div>

      {/* Colonna destra: label + Riconosci + valore */}
      <div className="flex flex-col items-center gap-1.5 flex-1">
        {/* Label sopra il pulsante */}
        <span className={cn(
          "text-xs font-bold tracking-widest",
          colorClass,
        )}>
          {label}
        </span>

        {/* Pulsante Riconosci */}
        <button
          onClick={handleManualRecognize}
          disabled={!hasContent || !isModelReady || isRecognizing}
          className="h-9 px-5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-xs font-bold tracking-widest transition-all shadow-sm w-full"
        >
          {isRecognizing ? "..." : "RICONOSCI"}
        </button>

        {/* Valore riconosciuto + cancella */}
        <div className="flex items-center gap-2">
          {displayValue && (
            <span className="inline-block px-2.5 py-0.5 rounded-lg bg-secondary text-sm font-serif font-bold">
              {displayValue}
            </span>
          )}
          {hasContent && (
            <button
              onClick={handleClear}
              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors font-bold tracking-widest"
            >
              CANCELLA
            </button>
          )}
        </div>

        {/* Caricamento AI */}
        {isLoading && (
          <span className="text-[10px] text-muted-foreground">
            CARICAMENTO...
          </span>
        )}
      </div>
    </div>
  );
}
