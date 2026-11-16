import { supabase } from "@/integrations/supabase/client";
import type { WerkorderDetail } from "@/lib/factuurWerkorders";
import type { InterneRegel } from "@/lib/interneFactuur";
import { regelsVoorRpc } from "@/lib/interneFactuur";
import { dispatchPendingInternalInvoices } from "@/services/workshopInvoiceService";

/** Details van werkorders in één RPC-aanroep (per 200 ids); RLS blijft gelden. */
export async function fetchWerkorderDetails(ids: string[]): Promise<Map<string, WerkorderDetail>> {
  const uniek = Array.from(new Set(ids.filter(Boolean)));
  const out = new Map<string, WerkorderDetail>();
  for (let i = 0; i < uniek.length; i += 200) {
    const { data, error } = await (supabase as any).rpc("werkorder_details", { p_ids: uniek.slice(i, i + 200) });
    if (error) throw error;
    ((data as WerkorderDetail[]) || []).forEach((d) => out.set(d.id, d));
  }
  return out;
}

/** Staat de vlag interne_factuur_handmatig op 'aan'? Fout → false (dan werkt alles zoals vroeger). */
export async function interneFactuurHandmatig(): Promise<boolean> {
  const { data, error } = await (supabase as any).rpc("interne_factuur_handmatig");
  return !error && data === true;
}

export interface GoedkeurResultaat {
  goedgekeurd: boolean; geen_kosten: boolean; invoice_id: string | null; invoice_number: string | null;
  claimkosten_ingevuld?: boolean;
}

/** Interne factuur maken en (indien afgerond) goedkeuren in één transactie, of "Geen kosten" met reden. */
export async function goedkeurenMetFactuur(
  orderId: string, keuze: { regels: InterneRegel[] } | { geenKostenReden: string },
): Promise<GoedkeurResultaat> {
  const { data, error } = await (supabase as any).rpc("werkorder_goedkeuren_met_factuur", {
    p_work_order_id: orderId,
    p_regels: "regels" in keuze ? regelsVoorRpc(keuze.regels) : null,
    p_geen_kosten_reden: "geenKostenReden" in keuze ? keuze.geenKostenReden : null,
  });
  if (error) throw error;
  return data as GoedkeurResultaat;
}

/** Na een nieuwe interne factuur: zoals altijd via de bestaande route (concept → PDF → administratie). */
export function dispatchNaInterneFactuur(): void {
  dispatchPendingInternalInvoices().catch(() => 0);
}
