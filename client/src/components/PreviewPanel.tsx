import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { renderLatex } from "@/hooks/useMathRecognition";
import { LaTeXEditor } from "./LaTeXEditor";
import { Copy, Check, Loader2, Sparkles, Eye, Download, Share2 } from "lucide-react";

interface PreviewPanelProps {
  latex: string | null;
  isRecognizing: boolean;
  onLatexChange?: (latex: string) => void;
}

export function PreviewPanel({
  latex,
  isRecognizing,
  onLatexChange,
}: PreviewPanelProps) {
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

  const handleExportPng = async () => {
    if (!renderedHtml) return;
    // Create a temporary container with the rendered math
    const temp = document.createElement("div");
    temp.innerHTML = renderedHtml;
    temp.style.position = "absolute";
    temp.style.left = "-9999px";
    temp.style.top = "-9999px";
    temp.style.padding = "20px";
    temp.style.backgroundColor = "#1a2332";
    temp.style.borderRadius = "8px";
    document.body.appendChild(temp);

    try {
      // Use html-to-image or canvas approach
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(temp, { backgroundColor: "#1a2332" });

      // Trigger download
      const link = document.createElement("a");
      link.download = "math-expression.png";
      link.href = dataUrl;
      link.click();
    } catch {
      // Fallback: use canvas
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = temp.offsetWidth * 2;
      canvas.height = temp.offsetHeight * 2;
      ctx.scale(2, 2);
      ctx.fillStyle = "#1a2332";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Simple text rendering fallback
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "24px 'Fira Code'";
      ctx.fillText(latex || "", 20, 50);
      const link = document.createElement("a");
      link.download = "math-expression.png";
      link.href = canvas.toDataURL();
      link.click();
    }

    document.body.removeChild(temp);
  };

  const handleShare = async () => {
    if (!latex) return;
    try {
      await navigator.share({
        title: "Espressione Matematica",
        text: latex,
      });
    } catch {
      handleCopy();
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
              Scrivi un'espressione matematica nell'area di scrittura
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Il riconoscimento partirà automaticamente
            </p>
          </div>
        )}

        {latex && !isRecognizing && (
          <div
            className="math-preview w-full overflow-x-auto flex justify-center"
            dangerouslySetInnerHTML={{ __html: renderedHtml || latex }}
          />
        )}
      </div>

      {/* LaTeX editor and actions */}
      {latex && !isRecognizing && (
        <>
          {/* LaTeX code editor */}
          <LaTeXEditor
            latex={latex}
            onLatexChange={(newLatex) => onLatexChange?.(newLatex)}
          />

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm font-medium transition-all duration-200"
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
            <div className="flex gap-1 ml-auto">
              <button
                onClick={handleExportPng}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all duration-200"
                title="Esporta come PNG"
              >
                <Download className="w-4 h-4" />
              </button>
              {typeof navigator.share === "function" && (
                <button
                  onClick={handleShare}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all duration-200"
                  title="Condividi"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
