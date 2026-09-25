import { supabase } from "@/integrations/supabase/client";

/**
 * Leenauto-uitleenregistratie ("wie reed er?").
 * Schrijven gaat UITSLUITEND via de RPC's; de database weigert overlap
 * en inleveren vóór uitgifte, en logt iedere correctie.
 */

export type LeenReden = "garantie" | "werkplaats" | "personeel" | "overig";

export const REDEN_LABELS: Record<LeenReden, string> = {
  garantie: "Garantie",
  werkplaats: "Werkplaats",
  personeel: "Personeel",
  overig: "Overig",
};

export interface Uitlening {
  id: string;
  loan_car_id: string;
  vehicle_id: string | null;
  contact_id: string | null;
  klant_naam: string;
  klant_telefoon: string | null;
  klant_email: string | null;
  klant_adres: string | null;
  klant_postcode: string | null;
  klant_plaats: string | null;
  warranty_claim_id: string | null;
  reden: LeenReden;
  uitgeleend_op: string;
  verwacht_terug_op: string | null;
  ingeleverd_op: string | null;
  uitgeleend_door: string | null;
  ingenomen_door: string | null;
  notities: string | null;
  created_at: string;
  kenteken?: string;
  merk?: string;
  model?: string;
  uitgeleend_door_naam?: string | null;
  ingenomen_door_naam?: string | null;
}

export interface UitleenInput {
  loanCarId: string;
  contactId?: string | null;
  klantNaam?: string;
  klantTelefoon?: string;
  klantEmail?: string;
  klantAdres?: string;
  klantPostcode?: string;
  klantPlaats?: string;
  warrantyClaimId?: string | null;
  reden: LeenReden;
  uitgeleendOp: Date;
  verwachtTerugOp?: Date | null;
  notities?: string;
}

const db = supabase as any;

const cleanError = (e: any): Error => {
  const msg = String(e?.message || e || "Onbekende fout");
  return new Error(msg.replace(/^.*?ERROR:\s*/i, ""));
};

export const isTeLaat = (u: Pick<Uitlening, "verwacht_terug_op" | "ingeleverd_op">, now = new Date()) =>
  !u.ingeleverd_op && !!u.verwacht_terug_op && new Date(u.verwacht_terug_op).getTime() < now.getTime();

export const plateKey = (v: string | null | undefined) =>
  String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export const leenautoUitlenen = async (i: UitleenInput): Promise<string> => {
  const { data, error } = await db.rpc("leenauto_uitlenen", {
    p_loan_car_id: i.loanCarId,
    p_contact_id: i.contactId || null,
    p_klant_naam: i.klantNaam || null,
    p_klant_telefoon: i.klantTelefoon || null,
    p_klant_email: i.klantEmail || null,
    p_klant_adres: i.klantAdres || null,
    p_klant_postcode: i.klantPostcode || null,
    p_klant_plaats: i.klantPlaats || null,
    p_warranty_claim_id: i.warrantyClaimId || null,
    p_reden: i.reden,
    p_uitgeleend_op: i.uitgeleendOp.toISOString(),
    p_verwacht_terug_op: i.verwachtTerugOp ? i.verwachtTerugOp.toISOString() : null,
    p_notities: i.notities || null,
  });
  if (error) throw cleanError(error);
  return data as string;
};

export const leenautoInnemen = async (uitleningId: string, ingeleverdOp: Date, notities?: string) => {
  const { error } = await db.rpc("leenauto_innemen", {
    p_uitlening_id: uitleningId,
    p_ingeleverd_op: ingeleverdOp.toISOString(),
    p_notities: notities || null,
  });
  if (error) throw cleanError(error);
};

export const leenautoVrijgevenZonderRegistratie = async (loanCarId: string) => {
  const { error } = await db.rpc("leenauto_vrijgeven_zonder_registratie", { p_loan_car_id: loanCarId });
  if (error) throw cleanError(error);
};

export const leenautoWieReed = async (kenteken: string, moment: Date): Promise<Uitlening[]> => {
  const { data, error } = await db.rpc("leenauto_wie_reed", {
    p_kenteken: kenteken,
    p_moment: moment.toISOString(),
  });
  if (error) throw cleanError(error);
  return (data || []).map((r: any) => ({ ...r, id: r.uitlening_id }));
};

/** Alle uitleningen incl. kenteken en namen van uitgever/innemer. */
export const fetchUitleningen = async (loanCarId?: string): Promise<Uitlening[]> => {
  let q = db
    .from("leenauto_uitleningen")
    .select("*, loan_cars(vehicle_id, vehicles!loan_cars_vehicle_id_fkey(license_number, brand, model))")
    .order("uitgeleend_op", { ascending: false })
    .limit(1000);
  if (loanCarId) q = q.eq("loan_car_id", loanCarId);
  const { data, error } = await q;
  if (error) throw cleanError(error);
  const rows = (data || []) as any[];
  const ids = Array.from(new Set(rows.flatMap((r) => [r.uitgeleend_door, r.ingenomen_door]).filter(Boolean)));
  const names: Record<string, string> = {};
  if (ids.length) {
    const { data: profs } = await supabase.from("profiles").select("id, first_name, last_name").in("id", ids);
    (profs || []).forEach((p: any) => {
      names[p.id] = `${p.first_name || ""} ${p.last_name || ""}`.trim();
    });
  }
  return rows.map((r) => ({
    ...r,
    kenteken: r.loan_cars?.vehicles?.license_number || "",
    merk: r.loan_cars?.vehicles?.brand || "",
    model: r.loan_cars?.vehicles?.model || "",
    uitgeleend_door_naam: r.uitgeleend_door ? names[r.uitgeleend_door] || null : null,
    ingenomen_door_naam: r.ingenomen_door ? names[r.ingenomen_door] || null : null,
  }));
};

/** Open uitlening voor een claim (via claim-id óf via de gekoppelde leenauto). */
export const fetchOpenUitleningVoorClaim = async (
  claimId: string,
  loanCarId?: string | null,
): Promise<Uitlening | null> => {
  const { data } = await db
    .from("leenauto_uitleningen")
    .select("*, loan_cars(vehicles!loan_cars_vehicle_id_fkey(license_number))")
    .is("ingeleverd_op", null)
    .eq("warranty_claim_id", claimId)
    .limit(1);
  let row = data?.[0];
  if (!row && loanCarId) {
    const r2 = await db
      .from("leenauto_uitleningen")
      .select("*, loan_cars(vehicles!loan_cars_vehicle_id_fkey(license_number))")
      .is("ingeleverd_op", null)
      .eq("loan_car_id", loanCarId)
      .limit(1);
    row = r2.data?.[0];
  }
  if (!row) return null;
  return { ...row, kenteken: row.loan_cars?.vehicles?.license_number || "" };
};

export const formatNL = (iso: string | Date | null | undefined) => {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

/** Waarde voor <input type="datetime-local"> in NL-tijd. */
export const toLocalInput = (d: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value || "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
};

/** Interpreteer "YYYY-MM-DDTHH:mm" als NL-tijd (Europe/Amsterdam). */
export const fromLocalInput = (v: string): Date | null => {
  if (!v) return null;
  const [date, time = "00:00"] = v.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm, ss = 0] = time.split(":").map(Number);
  if (!y || !m || !d) return null;
  const guess = Date.UTC(y, m - 1, d, hh, mm, ss);
  // offset bepalen voor Amsterdam op dat moment
  const asAms = new Date(
    new Date(guess).toLocaleString("en-US", { timeZone: "Europe/Amsterdam" }),
  ).getTime();
  const asUtc = new Date(new Date(guess).toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  return new Date(guess - (asAms - asUtc));
};
