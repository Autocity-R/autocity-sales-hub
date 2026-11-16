import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2, Ban, ChevronDown, ChevronRight, Undo2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { linkedOrderIds } from "@/lib/omzet";
import { AsLicensePlate } from "@/components/aftersales/ui";
import WorkshopInvoiceDialog from "@/components/werkplaats/WorkshopInvoiceDialog";
import { bronLabel, type WerkorderDetail } from "@/lib/factuurWerkorders";
import {
  interneOrdersZonderFactuur, internInvoiceDraft, GEEN_KOSTEN_REDENEN, geenKostenReden, isInternWerkplaats,
} from "@/lib/interneFactuur";
import { fetchWerkorderDetails, goedkeurenMetFactuur, dispatchNaInterneFactuur } from "@/services/werkorderDetailsService";
import type { InvoiceDraft } from "@/services/workshopInvoiceService";

interface Order {
  id: string; status: string; approved_at: string | null; approved_by: string | null; discipline: string | null;
  source: string | null; origin: string | null; external_customer: any; branch: string | null;
  description: string | null; part: string | null; parts: string[] | null;
  factuur_niet_nodig: boolean | null; factuur_niet_nodig_reden: string | null; factuur_niet_nodig_op: string | null; factuur_niet_nodig_door: string | null;
  vehicle: { brand: string; model: string; license_number: string | null; vin: string | null } | null;
}

const fmtDatum = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" }) : "—");

/**
 * "Nog te factureren (intern)" — vangnet (BOUWSTAP 19B): goedgekeurde interne werkplaatsorders zonder factuur
 * en zonder "geen factuur nodig", vanaf de livegang. Knoppen voor iedereen die werkorders mag goedkeuren.
 */
export const NogTeFacturerenIntern: React.FC<{ onChanged?: () => void; refreshKey?: number }> = ({ onChanged, refreshKey }) => {
  const { canApproveWorkOrders } = useRoleAccess();
  const mayAct = canApproveWorkOrders();
  const [open, setOpen] = useState<Order[]>([]);
  const [gemarkeerd, setGemarkeerd] = useState<Order[]>([]);
  const [namen, setNamen] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [toon, setToon] = useState(false);
  const [factuur, setFactuur] = useState<{ draft: InvoiceDraft; detail: WerkorderDetail | null } | null>(null);
  const [geenFactuur, setGeenFactuur] = useState<Order | null>(null);
  const [keuze, setKeuze] = useState("");
  const [toelichting, setToelichting] = useState("");
  const [bezig, setBezig] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: vanaf } = await (supabase as any).rpc("interne_factuur_vangnet_vanaf");
      const vanafIso = vanaf ? new Date(vanaf).toISOString() : new Date().toISOString();
      const select =
        "id, status, approved_at, approved_by, discipline, source, origin, external_customer, branch, description, part, parts," +
        " factuur_niet_nodig, factuur_niet_nodig_reden, factuur_niet_nodig_op, factuur_niet_nodig_door," +
        " vehicle:vehicles!work_orders_vehicle_id_fkey(brand, model, license_number, vin)";
      const [orders, invoices, profiles] = await Promise.all([
        fetchAllPages<Order>((a, b) => (supabase as any).from("work_orders").select(select)
          .eq("status", "goedgekeurd").eq("discipline", "werkplaats").eq("origin", "intern").is("external_customer", null)
          .or(`approved_at.gte.${vanafIso},factuur_niet_nodig.eq.true`).order("approved_at").range(a, b)),
        fetchAllPages<any>((a, b) => (supabase as any).from("workshop_invoices")
          .select("id,work_order_id,source_work_order_ids,document_type").eq("document_type", "factuur").order("id").range(a, b)),
        fetchAllPages<any>((a, b) => supabase.from("profiles").select("id,first_name,last_name").order("id").range(a, b)),
      ]);
      const gekoppeld = new Set<string>();
      invoices.forEach((i: any) => linkedOrderIds(i.source_work_order_ids, i.work_order_id).forEach(id => gekoppeld.add(id)));
      setNamen(new Map(profiles.map((p: any) => [p.id, [p.first_name, p.last_name].filter(Boolean).join(" ") || "Onbekend"])));
      setOpen(interneOrdersZonderFactuur(orders, gekoppeld, vanafIso));
      setGemarkeerd(orders.filter(o => o.factuur_niet_nodig && isInternWerkplaats(o) && !gekoppeld.has(o.id)));
    } catch (e: any) {
      toast({ title: "Laden mislukt", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-line */ }, [refreshKey]);

  const klaar = () => { load(); onChanged?.(); };

  const openFactuur = async (o: Order) => {
    setBezig(o.id);
    try {
      const detail = (await fetchWerkorderDetails([o.id])).get(o.id) || null;
      setFactuur({ draft: internInvoiceDraft({ ...o, claim_nummer: detail?.claim_nummer }), detail });
    } catch (e: any) {
      toast({ title: "Order laden mislukt", description: e.message, variant: "destructive" });
    }
    setBezig(null);
  };

  const geenKosten = async () => {
    if (!geenFactuur) return;
    const reden = geenKostenReden(keuze, toelichting);
    if (!reden) { toast({ title: "Kies een reden", variant: "destructive" }); return; }
    setBezig(geenFactuur.id);
    try {
      await goedkeurenMetFactuur(geenFactuur.id, { geenKostenReden: reden });
      toast({ title: "Gemarkeerd als geen factuur nodig" });
      setGeenFactuur(null); setKeuze(""); setToelichting("");
      klaar();
    } catch (e: any) {
      toast({ title: "Markeren mislukt", description: e.message, variant: "destructive" });
    }
    setBezig(null);
  };

  const tochFactureren = async (o: Order) => {
    const { error } = await (supabase as any).rpc("werkorder_toch_factureren", { p_work_order_id: o.id });
    if (error) toast({ title: "Terugdraaien mislukt", description: error.message, variant: "destructive" });
    else { toast({ title: "Order staat weer in nog te factureren (intern)" }); klaar(); }
  };

  const rij = (o: Order) => (
    <div key={o.id} className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 md:gap-3 px-4 py-3">
      <div className="flex items-center gap-2 md:contents">
        <AsLicensePlate value={o.vehicle?.license_number} size="sm" />
        <div className="md:w-[150px] text-[13px] text-slate-800 truncate">{o.vehicle?.brand} {o.vehicle?.model}</div>
      </div>
      <Badge variant="outline">{bronLabel(o)}</Badge>
      <div className="md:flex-1 md:min-w-[160px] text-[12.5px] text-slate-600 truncate">{o.description || "—"}</div>
      <div className="md:w-[170px] text-[12px] text-slate-500">
        {fmtDatum(o.approved_at)}{o.approved_by ? ` · ${namen.get(o.approved_by) || ""}` : ""}
      </div>
      {mayAct && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => openFactuur(o)} disabled={bezig === o.id}>
            {bezig === o.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileText className="h-3.5 w-3.5 mr-1" />}Factuur opmaken
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setGeenFactuur(o); setKeuze(""); setToelichting(""); }}>
            <Ban className="h-3.5 w-3.5 mr-1" />Geen factuur nodig
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/40">
      <div className="px-4 py-3 border-b border-amber-200 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Nog te factureren (intern)</h2>
        <Badge variant="secondary">{open.length}</Badge>
      </div>
      {loading ? (
        <div className="p-6 flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Laden…</div>
      ) : open.length === 0 ? (
        <div className="p-4 text-[13px] text-slate-500">Geen interne werkplaatsorders zonder factuur.</div>
      ) : (
        <div className="divide-y divide-amber-100">{open.map(rij)}</div>
      )}

      {gemarkeerd.length > 0 && (
        <div className="border-t border-amber-200">
          <button type="button" className="w-full px-4 py-2 flex items-center gap-1.5 text-[12.5px] text-slate-600 hover:text-slate-900" onClick={() => setToon(v => !v)}>
            {toon ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Valt onder rijklaar / geen factuur nodig ({gemarkeerd.length})
          </button>
          {toon && (
            <div className="divide-y divide-amber-100 border-t border-amber-100">
              {gemarkeerd.map(o => (
                <div key={o.id} className="flex flex-col md:flex-row md:items-center gap-2 px-4 py-2.5 text-[12.5px]">
                  <div className="flex items-center gap-2">
                    <AsLicensePlate value={o.vehicle?.license_number} size="sm" />
                    <span className="text-slate-800">{o.vehicle?.brand} {o.vehicle?.model}</span>
                  </div>
                  <span className="text-slate-500 md:flex-1">
                    {o.factuur_niet_nodig_reden || "—"}
                    {` · door ${o.factuur_niet_nodig_door ? namen.get(o.factuur_niet_nodig_door) || "onbekend" : "systeem"}`}
                    {o.factuur_niet_nodig_op ? ` · ${fmtDatum(o.factuur_niet_nodig_op)}` : ""}
                  </span>
                  {mayAct && (
                    <Button size="sm" variant="ghost" onClick={() => tochFactureren(o)}>
                      <Undo2 className="h-3.5 w-3.5 mr-1" />Toch factureren
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <WorkshopInvoiceDialog
        open={!!factuur}
        onOpenChange={(v) => !v && setFactuur(null)}
        initial={factuur?.draft ?? null}
        intern={factuur ? { detail: factuur.detail, modus: "factureren", onDone: (r) => { if (!r.geen_kosten) dispatchNaInterneFactuur(); } } : null}
        onSaved={() => { setFactuur(null); klaar(); }}
      />

      <Dialog open={!!geenFactuur} onOpenChange={(v) => !v && setGeenFactuur(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Geen factuur nodig</DialogTitle>
            <DialogDescription>
              {geenFactuur?.vehicle?.license_number || "Werkorder"} — kies een verplichte reden. Dit telt niet als omzet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={keuze} onValueChange={setKeuze}>
              <SelectTrigger><SelectValue placeholder="Kies een reden…" /></SelectTrigger>
              <SelectContent>{GEEN_KOSTEN_REDENEN.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder={keuze === "Anders" ? "Toelichting (verplicht)" : "Toelichting (optioneel)"} value={toelichting} onChange={e => setToelichting(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setGeenFactuur(null)}>Annuleren</Button>
              <Button disabled={!geenKostenReden(keuze, toelichting) || !!bezig} onClick={geenKosten}>
                {bezig && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Markeren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NogTeFacturerenIntern;
