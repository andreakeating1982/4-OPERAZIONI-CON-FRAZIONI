import { useCallback, useEffect, useRef, useState } from "react";
import { MathDrawCanvas, type Stroke } from "@/components/MathDrawCanvas";
import { PreviewPanel } from "@/components/PreviewPanel";
import { Toolbar, type ToolType } from "@/components/Toolbar";
import {
  useMathRecognition,
  type RecognitionMode,
} from "@/hooks/useMathRecognition";
import { cn } from "@/lib/utils";
import {
  Brain,
  Clock,
  Zap,
  ToggleLeft,
  ToggleRight,
  Loader2,
  AlertCircle,
  SquareFunction,
} from "lucide-react";

export default function Home() {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>("write");
  const [recognizedLatex, setRecognizedLatex] = useState<string | null>(null);
  const [realtimeMode, setRealtimeMode] = useState(true);
  const [recognitionMode, setRecognitionMode] = useState<RecognitionMode>("auto");
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [stats, setStats] = useState<{
    totalMs: number;
    encoderMs: number;
  } | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { recognize, isLoading, loadError, isModelReady } = useMathRecognition();

  // Handle stroke changes
  const handleStrokesChange = useCallback(
    (newStrokes: Stroke[]) => {
      setStrokes(newStrokes);

      if (realtimeMode && newStrokes.length > 0) {
        // Debounce recognition: wait 800ms after last stroke
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(async () => {
          if (!isModelReady) return;
          setIsRecognizing(true);
          const result = await recognize(newStrokes, recognitionMode);
          if (result) {
            setRecognizedLatex(result.latex);
            setStats({ totalMs: result.totalMs, encoderMs: result.encoderMs });
          }
          setIsRecognizing(false);
        }, 800);
      }
    },
    [realtimeMode, recognitionMode, recognize, isModelReady],
  );

  // Manual recognition trigger
  const handleManualRecognize = useCallback(async () => {
    if (strokes.length === 0 || !isModelReady) return;
    setIsRecognizing(true);
    const result = await recognize(strokes, recognitionMode);
    if (result) {
      setRecognizedLatex(result.latex);
      setStats({ totalMs: result.totalMs, encoderMs: result.encoderMs });
    }
    setIsRecognizing(false);
  }, [strokes, recognitionMode, recognize, isModelReady]);

  // Undo last stroke
  const handleUndo = () => {
    setStrokes((prev) => {
      const next = prev.slice(0, -1);
      if (next.length === 0) setRecognizedLatex(null);
      return next;
    });
  };

  // Clear all
  const handleClear = () => {
    setStrokes([]);
    setRecognizedLatex(null);
    setStats(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "z":
            e.preventDefault();
            handleUndo();
            break;
          case "w":
            e.preventDefault();
            setActiveTool("write");
            break;
          case "e":
            e.preventDefault();
            setActiveTool("erase");
            break;
          case "s":
            e.preventDefault();
            setActiveTool("select");
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
              <SquareFunction className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground leading-tight">
                Math Input Panel
              </h1>
              <p className="text-xs text-muted-foreground leading-tight">
                Riconoscimento scrittura matematica
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Real-time toggle */}
            <button
              onClick={() => setRealtimeMode(!realtimeMode)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              title={
                realtimeMode
                  ? "Riconoscimento in tempo reale"
                  : "Riconoscimento manuale"
              }
            >
              {realtimeMode ? (
                <ToggleRight className="w-5 h-5 text-primary" />
              ) : (
                <ToggleLeft className="w-5 h-5" />
              )}
              <span className="hidden sm:inline">
                {realtimeMode ? "Tempo reale" : "Manuale"}
              </span>
            </button>

            {/* Mode selector */}
            <select
              value={recognitionMode}
              onChange={(e) =>
                setRecognitionMode(e.target.value as RecognitionMode)
              }
              className="text-xs bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="auto">Auto</option>
              <option value="number">Numeri</option>
              <option value="expression">Espressioni</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col lg:flex-row gap-4 max-w-5xl mx-auto w-full p-3 sm:p-4">
        {/* Left panel: canvas area */}
        <div className="flex-1 flex flex-col gap-2 sm:gap-3 min-w-0">
          {/* Toolbar */}
          <Toolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            onUndo={handleUndo}
            onClear={handleClear}
            canUndo={strokes.length > 0}
            canClear={strokes.length > 0}
            isRecognizing={isRecognizing}
          />

          {/* Canvas */}
          <MathDrawCanvas
            strokes={strokes}
            onStrokesChange={handleStrokesChange}
            tool={activeTool}
            disabled={isLoading}
          />

          {/* Manual recognize button */}
          {!realtimeMode && (
            <button
              onClick={handleManualRecognize}
              disabled={strokes.length === 0 || !isModelReady || isRecognizing}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground font-semibold transition-all duration-200 shadow-lg shadow-primary/20"
            >
              {isRecognizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Riconoscimento in corso...</span>
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  <span>Converti formula</span>
                </>
              )}
            </button>
          )}

          {/* Status info */}
          <div className="flex items-center gap-2 sm:gap-4 text-xs text-muted-foreground flex-wrap">
            {isLoading && (
              <div className="flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Caricamento modello AI...</span>
              </div>
            )}
            {loadError && (
              <div className="flex items-center gap-1.5 text-destructive">
                <AlertCircle className="w-3 h-3" />
                <span>{loadError}</span>
              </div>
            )}
            {isModelReady && !isLoading && (
              <div className="flex items-center gap-1.5 text-green-400">
                <Zap className="w-3 h-3" />
                <span>Modello AI pronto</span>
              </div>
            )}
            {stats && (
              <div className="flex items-center gap-1.5 ml-auto">
                <Clock className="w-3 h-3" />
                <span>{stats.totalMs}ms</span>
              </div>
            )}
          </div>
        </div>

        {/* Right panel: preview */}
        <div className="lg:w-96 flex-shrink-0 mt-4 lg:mt-0">
          <div className="lg:sticky lg:top-20">
            <PreviewPanel
              latex={recognizedLatex}
              isRecognizing={isRecognizing}
              onLatexChange={(newLatex) => setRecognizedLatex(newLatex)}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-3 mt-auto">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-muted-foreground text-center sm:text-left">
          <span>
            Basato su CoMER (ECCV 2022) — Riconoscimento 100% nel browser
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400/70"></span>
            Nessun dato inviato a server esterni
          </span>
        </div>
      </footer>
    </div>
  );
}
