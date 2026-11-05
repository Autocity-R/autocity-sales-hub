/**
 * Leenauto-weergave bij een garantieclaim.
 * Uitsluitend gebaseerd op leenauto_uitleningen met warranty_claim_id = claim.id.
 * loan_cars zijn pool-auto's: de huidige lener/status van claim.loan_car_id zegt
 * niets over déze claim en wordt dus nooit getoond.
 */

export interface ClaimUitleningLite {
  id: string;
  warranty_claim_id: string | null;
  uitgeleend_op: string;
  ingeleverd_op: string | null;
  kenteken?: string;
}

export type ClaimLeenautoSamenvatting<U extends ClaimUitleningLite = ClaimUitleningLite> =
  | { soort: "open"; open: U; gesloten: U[]; label: string }
  | { soort: "gehad"; gesloten: U[]; label: string }
  | { soort: "oud"; kenteken: string; label: string }
  | { soort: "geen"; label: string };

/** Uitleningen van precies deze claim, nieuwste bovenaan, gesplitst in open/gesloten. */
export const mapClaimUitleningen = <U extends ClaimUitleningLite>(
  claimId: string,
  uitleningen: U[],
  oud?: { loanCarId?: string | null; loanCarAssigned?: boolean; kenteken?: string | null },
): ClaimLeenautoSamenvatting<U> => {
  const eigen = uitleningen
    .filter((u) => u.warranty_claim_id === claimId)
    .sort((a, b) => new Date(b.uitgeleend_op).getTime() - new Date(a.uitgeleend_op).getTime());
  const open = eigen.find((u) => !u.ingeleverd_op);
  const gesloten = eigen.filter((u) => !!u.ingeleverd_op);
  if (open) return { soort: "open", open, gesloten, label: `Uitgeleend · ${open.kenteken || ""}`.trim() };
  if (gesloten.length) return { soort: "gehad", gesloten, label: `Gehad · ${gesloten[0].kenteken || ""}`.trim() };
  if (oud?.loanCarId || oud?.loanCarAssigned) {
    const k = oud.kenteken || "";
    return { soort: "oud", kenteken: k, label: k ? `${k} (oud)` : "Leenauto (oud)" };
  }
  return { soort: "geen", label: "Geen" };
};

/** Mag deze uitlening vanuit deze claim worden ingenomen? */
export const magInnemenVanuitClaim = (
  uitlening: Pick<ClaimUitleningLite, "warranty_claim_id"> | null | undefined,
  claimId: string,
) => !!uitlening && !!claimId && uitlening.warranty_claim_id === claimId;

/** Alleen de bewerkbare velden van "Bewerken"; nooit leenautovelden. */
export const claimBewerkPatch = <T extends Record<string, any>>(origineel: T, bewerkt: T) => {
  const velden = ["problemDescription", "status", "priority", "additionalNotes", "estimatedCost"] as const;
  const patch: Record<string, any> = {};
  for (const v of velden) if (bewerkt[v] !== origineel[v]) patch[v] = bewerkt[v];
  return patch as Partial<T>;
};
