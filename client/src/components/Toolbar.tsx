import { cn } from "@/lib/utils";
import {
  Baseline,
  Eraser,
  MousePointer2,
  Pen,
  RotateCcw,
  Trash2,
} from "lucide-react";

export type ToolType = "write" | "erase" | "select";

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onUndo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canClear: boolean;
  isRecognizing: boolean;
}

const tools: { id: ToolType; label: string; icon: typeof Pen; shortcut: string }[] = [
  { id: "write", label: "Scrivi", icon: Pen, shortcut: "W" },
  { id: "erase", label: "Cancella", icon: Eraser, shortcut: "E" },
  { id: "select", label: "Seleziona e correggi", icon: MousePointer2, shortcut: "S" },
];

export function Toolbar({
  activeTool,
  onToolChange,
  onUndo,
  onClear,
  canUndo,
  canClear,
  isRecognizing,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-1 p-1.5 bg-card/80 backdrop-blur-sm rounded-xl border border-border shadow-lg">
      {/* Drawing tools */}
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            disabled={isRecognizing}
            className={cn(
              "relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              isActive
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/80",
            )}
            title={`${tool.label} (${tool.shortcut})`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tool.label}</span>
          </button>
        );
      })}

      {/* Separator */}
      <div className="w-px h-6 bg-border mx-1" />

      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={!canUndo || isRecognizing}
        className={cn(
          "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          canUndo && !isRecognizing
            ? "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            : "text-muted-foreground/40",
        )}
        title="Annulla ultimo tratto (Ctrl+Z)"
      >
        <RotateCcw className="w-4 h-4" />
        <span className="hidden sm:inline">Annulla</span>
      </button>

      {/* Delete/Clear */}
      <button
        onClick={onClear}
        disabled={!canClear || isRecognizing}
        className={cn(
          "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          canClear && !isRecognizing
            ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            : "text-muted-foreground/40",
        )}
        title="Elimina tutto"
      >
        <Trash2 className="w-4 h-4" />
        <span className="hidden sm:inline">Elimina</span>
      </button>
    </div>
  );
}
