import { cn } from "@/lib/utils";

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

const tools: { id: ToolType; label: string; shortcut: string }[] = [
  { id: "write", label: "Scrivi", shortcut: "W" },
  { id: "erase", label: "Cancella", shortcut: "E" },
  { id: "select", label: "Seleziona", shortcut: "S" },
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
    <div className="flex items-center gap-1 p-1 sm:p-1.5 bg-card/80 backdrop-blur-sm rounded-xl border border-border shadow-lg shadow-black/5">
      {tools.map((tool) => {
        const isActive = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            disabled={isRecognizing}
            className={cn(
              "relative flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-200",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              isActive
                ? "bg-[#b05f3c] text-white shadow-md"
                : "text-[#55483d] hover:text-[#221b16] hover:bg-[#f3eee4] active:scale-95",
            )}
            title={`${tool.label} (${tool.shortcut})`}
          >
            {tool.label}
          </button>
        );
      })}

      <div className="w-px h-5 sm:h-6 bg-border mx-0.5 sm:mx-1" />

      <button
        onClick={onUndo}
        disabled={!canUndo || isRecognizing}
        className={cn(
          "flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-200",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          canUndo && !isRecognizing
            ? "text-[#55483d] hover:text-[#221b16] hover:bg-[#f3eee4] active:scale-95"
            : "text-[#55483d]/40",
        )}
        title="Annulla ultimo tratto (Ctrl+Z)"
      >
        Annulla
      </button>

      <button
        onClick={onClear}
        disabled={!canClear || isRecognizing}
        className={cn(
          "flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-200",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          canClear && !isRecognizing
            ? "text-[#55483d] hover:text-red-600 hover:bg-red-50 active:scale-95"
            : "text-[#55483d]/40",
        )}
        title="Elimina tutto"
      >
        Elimina
      </button>
    </div>
  );
}
