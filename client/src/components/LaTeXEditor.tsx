import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Check, Edit3, X } from "lucide-react";

interface LaTeXEditorProps {
  latex: string;
  onLatexChange: (latex: string) => void;
  className?: string;
}

export function LaTeXEditor({ latex, onLatexChange, className }: LaTeXEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(latex);

  const handleStartEdit = () => {
    setEditValue(latex);
    setIsEditing(true);
  };

  const handleSave = () => {
    onLatexChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(latex);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Edit3 className="w-3 h-3" />
          <span>Modifica LaTeX — premi Enter per salvare, Esc per annullare</span>
        </div>
        <div className="flex gap-2">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-h-[60px] px-3 py-2 rounded-lg bg-background border border-border text-base font-mono text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            autoFocus
            rows={2}
          />
          <div className="flex flex-col gap-1">
            <button
              onClick={handleSave}
              className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              title="Salva (Enter)"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
              title="Annulla (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleStartEdit}
      className={cn(
        "w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-left transition-all duration-200",
        "hover:bg-muted hover:border-primary/30 group",
        className,
      )}
      title="Clicca per modificare il LaTeX"
    >
      <div className="flex items-center gap-2">
        <code className="flex-1 text-sm font-mono text-muted-foreground break-all line-clamp-2 group-hover:text-foreground transition-colors">
          {latex}
        </code>
        <Edit3 className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
    </button>
  );
}
