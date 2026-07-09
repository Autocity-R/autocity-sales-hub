import React from "react";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import {
  useCurrentBranch,
  BRANCH_LABELS,
  BRANCH_COLOR_CLASSES,
  type BranchFilter as BranchFilterValue,
} from "@/contexts/BranchContext";
import { cn } from "@/lib/utils";

interface BranchFilterProps {
  className?: string;
}

/**
 * Herbruikbaar segment: Alles · Rotterdam · Heerhugowaard.
 * Voor admin/owner: klikbare knoppen (gekoppeld aan globale BranchContext).
 * Voor overige rollen: read-only chip met eigen vestiging (RLS/hard filter).
 */
export const BranchFilter: React.FC<BranchFilterProps> = ({ className }) => {
  const { branchFilter, setBranchFilter, canSwitchBranch, userBranch } =
    useCurrentBranch();

  if (!canSwitchBranch) {
    const b = userBranch ?? "rotterdam";
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm",
          className,
        )}
      >
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Vestiging:</span>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-xs font-medium",
            BRANCH_COLOR_CLASSES[b],
          )}
        >
          {BRANCH_LABELS[b]}
        </span>
      </div>
    );
  }

  const options: { value: BranchFilterValue; label: string }[] = [
    { value: "all", label: "Alles" },
    { value: "rotterdam", label: "Rotterdam" },
    { value: "heerhugowaard", label: "Heerhugowaard" },
  ];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border bg-card p-1",
        className,
      )}
    >
      <Building2 className="ml-2 h-4 w-4 text-muted-foreground" />
      {options.map((opt) => {
        const active = branchFilter === opt.value;
        return (
          <Button
            key={opt.value}
            size="sm"
            variant={active ? "default" : "ghost"}
            onClick={() => setBranchFilter(opt.value)}
            className={cn(
              "h-8 px-3 text-xs",
              active && opt.value !== "all" && BRANCH_COLOR_CLASSES[opt.value as "rotterdam" | "heerhugowaard"],
            )}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
};

export default BranchFilter;