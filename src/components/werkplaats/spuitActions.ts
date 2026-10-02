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
