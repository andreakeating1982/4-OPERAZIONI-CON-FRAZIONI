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
  hint,
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
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Etichetta */}
      <span className={cn(
        "text-xs font-semibold uppercase tracking-wider text-center",
        colorClass,
      )}>
        {label}
      </span>

      {/* Card con canvas e pulsanti affiancati */}
      <div className="flex gap-3 items-stretch">
        {/* Canvas quadrato piccolo */}
        <div className="flex-shrink-0 w-[120px] h-[100px] rounded-lg border-2 border-[#e2dac9] bg-white shadow-sm overflow-hidden">
          <MathDrawCanvas
            strokes={strokes}
            onStrokesChange={handleStrokesChange}
            tool="write"
            height={100}
            className="border-0 rounded-none shadow-none ring-0"
            disabled={isLoading || isRecognizing}
            hideWatermark
          />
        </div>

        {/* Pulsanti a destra */}
        <div className="flex flex-col justify-center gap-1.5">
          <button
            onClick={handleManualRecognize}
            disabled={!hasContent || !isModelReady || isRecognizing}
            className="px-3 py-1.5 rounded-md bg-[#b05f3c] hover:bg-[#964f32] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold uppercase tracking-wider transition-colors min-w-[90px]"
          >
            {isRecognizing ? "..." : "RICONOSCI"}
          </button>
          {hasContent && (
            <button
              onClick={handleClear}
              className="px-3 py-1 rounded-md text-xs text-[#55483d] hover:text-red-600 hover:bg-red-50 transition-colors uppercase tracking-wider"
            >
              Cancella
            </button>
          )}
        </div>
      </div>

      {/* Valore riconosciuto */}
      {displayValue && (
        <div className="text-center">
          <span className={cn(
            "inline-block px-2.5 py-0.5 rounded-md bg-[#f3eee4] text-sm font-bold font-mono",
            colorClass,
          )}>
            {displayValue}
          </span>
        </div>
      )}

      {/* Caricamento modello AI */}
      {isLoading && (
        <div className="text-center text-[10px] text-[#55483d]">
          Caricamento AI in corso...
        </div>
      )}
    </div>
  );
}
