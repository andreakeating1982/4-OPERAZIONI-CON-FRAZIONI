import { cn } from "@/lib/utils";

interface FractionDisplayProps {
  numerator: number | string;
  denominator: number | string;
  numClass?: string;
  denClass?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "text-base min-w-[40px]",
  md: "text-xl min-w-[56px]",
  lg: "text-2xl min-w-[72px]",
};

export function FractionDisplay({
  numerator,
  denominator,
  numClass = "",
  denClass = "",
  className,
  size = "md",
}: FractionDisplayProps) {
  return (
    <span className={cn("inline-flex flex-col items-center align-middle mx-1", sizeMap[size], className)}>
      <span className={cn("block text-center px-1", numClass)}>{numerator}</span>
      <span className="block w-full border-t border-foreground/60 my-0.5" />
      <span className={cn("block text-center px-1", denClass)}>{denominator}</span>
    </span>
  );
}
