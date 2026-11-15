import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AFRONDEN_LABEL, werkplaatsStatus, type ClaimWerkorder, type WerkplaatsSoort } from "@/lib/claimWerkplaatsStatus";
import type { WarrantyClaim } from "@/types/warranty";

const TONE: Record<WerkplaatsSoort, string> = {
  geen: "",
  niet_ingepland: "bg-muted text-muted-foreground border-border",
  ingepland: "bg-violet-50 text-violet-700 border-violet-200",
  bezig: "bg-amber-50 text-amber-800 border-amber-200",
  gepauzeerd: "bg-orange-50 text-orange-800 border-orange-200",
  afgerond: "bg-sky-50 text-sky-800 border-sky-200",
  goedgekeurd: "bg-green-50 text-green-800 border-green-200",
};

export const isClaimOpen = (c: Pick<WarrantyClaim, "status">) => c.status !== "opgelost" && c.status !== "vervallen";

/** Live werkplaatsstatus + (bij open claim met goedgekeurd werk) het signaal "claim afronden?". */
export const ClaimWerkplaatsBadge: React.FC<{
  order: ClaimWerkorder | null | undefined;
  claimOpen: boolean;
  className?: string;
}> = ({ order, claimOpen, className }) => {
  const s = werkplaatsStatus(order, claimOpen);
  if (s.soort === "geen") return null;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      <Badge variant="outline" className={cn("font-medium whitespace-nowrap", TONE[s.soort], s.teLaat && "bg-red-50 text-red-700 border-red-200")}>
        {s.label}
      </Badge>
      {s.afrondenSignaal && (
        <Badge variant="outline" className="font-semibold whitespace-nowrap bg-green-600 text-white border-green-700">
          {AFRONDEN_LABEL}
        </Badge>
      )}
    </span>
  );
};
