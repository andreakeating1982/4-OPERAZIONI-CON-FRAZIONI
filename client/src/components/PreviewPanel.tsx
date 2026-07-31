import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { renderLatex } from "@/hooks/useMathRecognition";
import { Copy, Check, Loader2, Sparkles, Eye } from "lucide-react";

interface PreviewPanelProps {
  latex: string | null;
  isRecognizing: boolean;
}

export function PreviewPanel({ latex, isRecognizing }: PreviewPanelProps) {
  const [renderedHtml, setRenderedHtml] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (latex) {
      renderLatex(latex).then(setRenderedHtml).catch(() => setRenderedHtml(""));
    } else {
      setRenderedHtml("");
    }
  }, [latex]);

  const handleCopy = async () => {
    if (!latex) return;
    try {
      await navigator.clipboard.writeText(latex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = latex;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInsert = async () => {
    if (!latex) return;
    try {
      await navigator.clipboard.writeText(latex);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = latex;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Preview label */}
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Anteprima
        </span>
        {isRecognizing && (
          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin ml-auto" />
        )}
      </div>

      {/* Preview box */}
      <div
        ref={containerRef}
        className={cn(
          "relative min-h-[80px] rounded-xl border bg-card/60 backdrop-blur-sm p-4 flex items-center justify-center transition-all duration-300",
          latex
            ? "border-primary/30 shadow-lg shadow-primary/5"
            : "border-border",
        )}
      >
        {isRecognizing && !latex && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-sm">Riconoscimento in corso...</span>
          </div>
        )}

        {!isRecognizing && !latex && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Scrivi un'espressione matematica nell'area gialla
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Il riconoscimento partirà automaticamente
            </p>
          </div>
        )}

        {latex && !isRecognizing && (
          <div
            className="math-preview w-full overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: renderedHtml || latex }}
          />
        )}
      </div>

      {/* Action buttons */}
      {latex && !isRecognizing && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm font-medium transition-all duration-200"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-green-400">Copiato!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copia LaTeX</span>
              </>
            )}
          </button>
          <button
            onClick={handleInsert}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-all duration-200 shadow-md shadow-primary/20"
          >
            <span>Inserisci</span>
          </button>
        </div>
      )}

      {/* Raw LaTeX display */}
      {latex && !isRecognizing && (
        <div className="px-3 py-2 rounded-lg bg-muted/50 border border-border">
          <code className="text-xs font-mono text-muted-foreground break-all">
            {latex}
          </code>
        </div>
      )}
    </div>
  );
}
