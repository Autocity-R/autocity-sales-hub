import React from "react";
import { cn } from "@/lib/utils";

/**
 * Gebundelde orders: work_orders.parts (jsonb array) is de bron.
 * Oude orders hebben alleen work_orders.part — die blijft als fallback werken.
 */
export const getWorkOrderParts = (wo: { parts?: any; part?: string | null } | null | undefined): string[] => {
  if (!wo) return [];
  const raw = (wo as any).parts;
  if (Array.isArray(raw)) {
    const list = raw.map((x) => (typeof x === "string" ? x : String(x?.name ?? ""))).map(s => s.trim()).filter(Boolean);
    if (list.length > 0) return list;
  }
  return wo.part ? [wo.part] : [];
};

/** Chips-weergave van alle delen van een order. */
export const PartChips: React.FC<{
  workOrder: { parts?: any; part?: string | null } | null | undefined;
  className?: string;
  size?: "sm" | "md";
}> = ({ workOrder, className, size = "md" }) => {
  const parts = getWorkOrderParts(workOrder);
  if (parts.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {parts.map((p, i) => (
        <span
          key={`${p}-${i}`}
          className={cn(
            "inline-flex items-center rounded-md bg-slate-900 text-white font-semibold",
            size === "sm" ? "px-2 py-0.5 text-[11.5px]" : "px-2.5 py-1 text-[12.5px]",
          )}
        >
          {p}
        </span>
      ))}
    </div>
  );
};