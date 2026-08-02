import { supabase } from "@/integrations/supabase/client";

/* ================= Tarieven (instellingen) ================= */

export interface WerkplaatsTarieven {
  id?: string;
  uurtarief_ex_btw: number;
  klein_materiaal_enabled: boolean;
  klein_materiaal_pct: number;
  milieukosten_enabled: boolean;
  milieukosten_bedrag: number;
}

export const DEFAULT_TARIEVEN: WerkplaatsTarieven = {
  uurtarief_ex_btw: 85,
  klein_materiaal_enabled: true,
  klein_materiaal_pct: 3,
  milieukosten_enabled: true,
  milieukosten_bedrag: 7.5,
};

export const VAT_RATE = 0.21;

/** Eén rij met de bedrijfsbrede werkplaats-tarieven. Valt terug op de defaults. */
export const fetchTarieven = async (): Promise<WerkplaatsTarieven> => {
  const { data, error } = await (supabase as any)
    .from("werkplaats_tarieven")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data) return { ...DEFAULT_TARIEVEN };
  return {
    id: data.id,
    uurtarief_ex_btw: Number(data.uurtarief_ex_btw) || DEFAULT_TARIEVEN.uurtarief_ex_btw,
    klein_materiaal_enabled: !!data.klein_materiaal_enabled,
    klein_materiaal_pct: Number(data.klein_materiaal_pct) || 0,
    milieukosten_enabled: !!data.milieukosten_enabled,
    milieukosten_bedrag: Number(data.milieukosten_bedrag) || 0,
  };
};

export const saveTarieven = async (t: WerkplaatsTarieven): Promise<void> => {
  const row = {
    uurtarief_ex_btw: t.uurtarief_ex_btw,
    klein_materiaal_enabled: t.klein_materiaal_enabled,
    klein_materiaal_pct: t.klein_materiaal_pct,
    milieukosten_enabled: t.milieukosten_enabled,
    milieukosten_bedrag: t.milieukosten_bedrag,
  };
  if (t.id) {
    const { error } = await (supabase as any).from("werkplaats_tarieven").update(row).eq("id", t.id);
    if (error) throw error;
    return;
  }
  const { error } = await (supabase as any).from("werkplaats_tarieven").insert(row);
  if (error) throw error;
};

/* ================= Prijsdatabase ================= */

export interface Reparatie {
  id: string;
  code: string;
  categorie: string;
  reparatie: string;
  uren_laag: number;
  uren_standaard: number;
  uren_hoog: number;
}

export interface WerkplaatsModel {
  id: string;
  merk: string;
  model: string;
  merk_factor: number;
}

export type Niveau = "laag" | "standaard" | "hoog";

export const fetchReparaties = async (): Promise<Reparatie[]> => {
  const { data, error } = await (supabase as any)
    .from("werkplaats_reparaties")
    .select("id, code, categorie, reparatie, uren_laag, uren_standaard, uren_hoog")
    .eq("actief", true)
    .order("categorie", { ascending: true })
    .order("reparatie", { ascending: true });
  if (error) throw error;
  return (data as Reparatie[]) || [];
};

export const fetchModellen = async (): Promise<WerkplaatsModel[]> => {
  const { data, error } = await (supabase as any)
    .from("werkplaats_modellen")
    .select("id, merk, model, merk_factor")
    .order("merk", { ascending: true })
    .order("model", { ascending: true });
  if (error) throw error;
  return (data as WerkplaatsModel[]) || [];
};

/** Zoekt de merkfactor voor merk/model; 1.00 als er geen match is. */
export const findMerkFactor = (
  modellen: WerkplaatsModel[],
  merk?: string | null,
  model?: string | null,
): number => {
  if (!merk) return 1;
  const m = String(merk).trim().toLowerCase();
  const mod = String(model ?? "").trim().toLowerCase();
  const exact = modellen.find(
    (x) => x.merk.toLowerCase() === m && mod && x.model.toLowerCase() === mod,
  );
  if (exact) return Number(exact.merk_factor) || 1;
  const partial = modellen.find(
    (x) => x.merk.toLowerCase() === m && mod && (mod.includes(x.model.toLowerCase()) || x.model.toLowerCase().includes(mod)),
  );
  if (partial) return Number(partial.merk_factor) || 1;
  const brandOnly = modellen.filter((x) => x.merk.toLowerCase() === m);
  if (brandOnly.length) {
    const avg = brandOnly.reduce((s, x) => s + (Number(x.merk_factor) || 1), 0) / brandOnly.length;
    return Math.round(avg * 100) / 100;
  }
  return 1;
};

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** PRIJSFORMULE: arbeid = uren × uurtarief (ex btw) × merk_factor. */
export const berekenArbeid = (uren: number, uurtarief: number, merkFactor: number): number =>
  round2((Number(uren) || 0) * (Number(uurtarief) || 0) * (Number(merkFactor) || 1));

export const inclBtw = (exBtw: number): number => round2((Number(exBtw) || 0) * (1 + VAT_RATE));

export const urenVoorNiveau = (r: Reparatie, niveau: Niveau): number =>
  niveau === "laag" ? Number(r.uren_laag) : niveau === "hoog" ? Number(r.uren_hoog) : Number(r.uren_standaard);

export const eur = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n) || 0);

export const uren = (n: number) => `${(Number(n) || 0).toFixed(2).replace(".", ",")} u`;

/** Regel die vanuit de prijschecker meegaat naar een handmatige factuur. */
export interface PrefillArbeidLine {
  description: string;
  amount: number;
  uren: number;
  tarief: number;
  merk_factor: number;
  merk?: string | null;
  model?: string | null;
  niveau: Niveau;
}
