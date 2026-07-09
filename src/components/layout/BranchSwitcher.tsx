import React from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BRANCH_LABELS,
  BRANCH_SHORT,
  BRANCH_COLOR_CLASSES,
  useCurrentBranch,
  type BranchFilter,
} from "@/contexts/BranchContext";

interface BranchSwitcherProps {
  compact?: boolean;
  className?: string;
}

/**
 * Segmentknoppen "Alles · Rotterdam · Heerhugowaard" in de header.
 * Zichtbaar voor admin/owner. Voor overige rollen: read-only chip met eigen vestiging.
 */
export const BranchSwitcher: React.FC<BranchSwitcherProps> = ({ compact, className }) => {
  const { branchFilter, setBranchFilter, canSwitchBranch, userBranch, isLoading } =
    useCurrentBranch();

  if (isLoading) return null;

  // Niet-admin: toon vast label van eigen vestiging (geen switch)
  if (!canSwitchBranch) {
    if (!userBranch) return null;
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
          BRANCH_COLOR_CLASSES[userBranch],
          className,
        )}
        title={`Je vestiging: ${BRANCH_LABELS[userBranch]}`}
      >
        <MapPin className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{BRANCH_LABELS[userBranch]}</span>
        <span className="sm:hidden">{BRANCH_SHORT[userBranch]}</span>
      </div>
    );
  }

  const options: { value: BranchFilter; label: string; short: string }[] = [
    { value: "all", label: "Alles", short: "Alles" },
    { value: "rotterdam", label: BRANCH_LABELS.rotterdam, short: BRANCH_SHORT.rotterdam },
    { value: "heerhugowaard", label: BRANCH_LABELS.heerhugowaard, short: BRANCH_SHORT.heerhugowaard },
  ];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border bg-white p-0.5 shadow-sm",
        className,
      )}
      role="group"
      aria-label="Vestiging filter"
    >
      {options.map((opt) => {
        const isActive = branchFilter === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setBranchFilter(opt.value)}
            className={cn(
              "inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {opt.value !== "all" && <MapPin className="h-3 w-3" />}
            <span className={compact ? "hidden md:inline" : "hidden sm:inline"}>{opt.label}</span>
            <span className={compact ? "md:hidden" : "sm:hidden"}>{opt.short}</span>
          </button>
        );
      })}
    </div>
  );
};

/**
 * Kleine, compacte chip om per rij de vestiging aan te duiden (in tabellen).
 */
export const BranchChip: React.FC<{ branch?: string | null; className?: string }> = ({
  branch,
  className,
}) => {
  const code: "rotterdam" | "heerhugowaard" =
    branch === "heerhugowaard" ? "heerhugowaard" : "rotterdam";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        BRANCH_COLOR_CLASSES[code],
        className,
      )}
      title={BRANCH_LABELS[code]}
    >
      {BRANCH_SHORT[code]}
    </span>
  );
};