import { useCallback, useEffect, useRef, useState } from "react";
import { MathDrawCanvas, type Stroke } from "@/components/MathDrawCanvas";
import { useMathRecognition } from "@/hooks/useMathRecognition";
import { cn } from "@/lib/utils";
import { Eraser, Check, Loader2, Pencil, Search } from "lucide-react";

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
  const [justRecognized, setJustRecognized] = useState(false);
  const { recognize, isModelReady, isLoading } = useMathRecognition();

  const handleStrokesChange = useCallback(
    (newStrokes: Stroke[]) => {
      setStrokes(newStrokes);
      setJustRecognized(false);

      if (newStrokes.length === 0) {
        setRecognizedText("");
      }
    },
    [],
  );

  // Manual recognition
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
        setJustRecognized(true);
        setTimeout(() => {
          setStrokes([]);
        }, 1500);
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
    setJustRecognized(false);
  };

  const displayValue =
    value !== null && !isNaN(value)
      ? value.toString()
      : recognizedText || "";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {/* Label */}
      <div className="flex items-center justify-center">
        <span className={cn("text-xs font-semibold uppercase tracking-wide", colorClass)}>
          {label}
        </span>
        {hint && (
          <span className="text-[10px] text-muted-foreground ml-2">{hint}</span>
        )}
      </div>

      {/* Canvas area */}
      <div className="relative">
        <MathDrawCanvas
          strokes={strokes}
          onStrokesChange={handleStrokesChange}
          tool="write"
          height={90}
          className="rounded-lg border-2 border-border"
          disabled={isLoading}
          hideWatermark
        />

        {/* Overlay: recognized number */}
        <div className="absolute top-0 right-0 flex items-center gap-1.5 p-2 z-10">
          {isRecognizing && (
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
          )}
          {!isRecognizing && displayValue && (
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/15 border border-primary/30 backdrop-blur-sm transition-all duration-300",
                justRecognized && "animate-pulse",
              )}
            >
              <Check className="w-3 h-3 text-primary" />
              <span className={cn("text-sm font-bold font-mono", colorClass)}>
                {displayValue}
              </span>
            </div>
          )}
        </div>

        {/* Empty state watermark */}
        {strokes.length === 0 && !value && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <div className="text-center opacity-25">
              <Pencil className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Scrivi il numero</span>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-2">
        {/* Manual recognize button */}
        <button
          onClick={handleManualRecognize}
          disabled={strokes.length === 0 || !isModelReady || isRecognizing}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-sm font-semibold transition-all duration-200 shadow-md shadow-primary/20"
        >
          {isRecognizing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
          <span>Riconosci</span>
        </button>

        {/* Clear button */}
        {strokes.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all duration-200 border border-border"
          >
            <Eraser className="w-3 h-3" />
            <span>Cancella</span>
          </button>
        )}
      </div>

      {/* Model loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
          <span>Caricamento AI...</span>
        </div>
      )}
    </div>
  );
}
