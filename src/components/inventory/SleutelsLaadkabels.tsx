import React from "react";
import { cn } from "@/lib/utils";
import { formatSleutelsLaadkabels } from "@/lib/innameRegistratie";

/** Compact "🔑 2 · 🔌 1" op kaarten/lijsten; leeg = niets tonen. Gebruikt alleen al geladen velden. */
export const SleutelsLaadkabels: React.FC<{ sleutels?: number | null; laadkabels?: number | null; className?: string }> = ({
  sleutels, laadkabels, className,
}) => {
  const tekst = formatSleutelsLaadkabels(sleutels, laadkabels);
  if (!tekst) return null;
  return (
    <span className={cn("inline-flex items-center text-xs text-muted-foreground whitespace-nowrap", className)}
      title="Sleutels · laadkabels bij inname">
      {tekst}
    </span>
  );
};
