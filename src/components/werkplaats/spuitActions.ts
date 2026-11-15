/** Welke knop ziet een schadehersteller bij een klus? Spiegel van de RLS op work_orders (spuit). */
export type SpuitAction = "start" | "verder" | "pauze_klaar" | "overnemen" | "geen";

export const spuitActionFor = (
  w: { status: string; assigned_to: string | null },
  myId: string | null,
): SpuitAction => {
  if (!myId || w.status === "afgerond") return "geen";
  const mine = w.assigned_to === myId;
  const free = !w.assigned_to;
  if (w.status === "bezig") return mine ? "pauze_klaar" : "geen";
  if (w.status === "gepauzeerd") return mine ? "verder" : "overnemen";
  return mine || free ? "start" : "geen";
};

/** Wie mag een gepauzeerde klus van een collega overnemen? Spiegel van RPC werkorder_overnemen. */
export const OVERNEMEN_ROLLEN: Record<string, readonly string[]> = {
  spuit: ["schadeherstel", "owner", "admin", "manager", "aftersales_manager", "werkplaats_chef"],
  werkplaats: ["monteur", "werkplaats_chef", "aftersales_manager", "owner", "admin", "manager"],
};

export const mayTakeOver = (role: string | null | undefined, discipline: string | null | undefined): boolean =>
  !!role && (OVERNEMEN_ROLLEN[discipline || ""] || []).includes(role);

/** Generieke knopkeuze (werkplaats én schadeherstel): als spuitActionFor, maar "overnemen" alleen voor rollen die het mogen. */
export const werkorderActionFor = (
  w: { status: string; assigned_to: string | null; discipline?: string | null },
  myId: string | null,
  role: string | null | undefined,
): SpuitAction => {
  const a = spuitActionFor(w, myId);
  return a === "overnemen" && !mayTakeOver(role, w.discipline ?? "spuit") ? "geen" : a;
};
