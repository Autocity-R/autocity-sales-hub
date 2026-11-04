import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2, Ban, ChevronDown, ChevronRight, Undo2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { featureAccess } from "@/lib/routeAccess";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { AsLicensePlate } from "@/components/aftersales/ui";
import WorkshopInvoiceDialog from "@/components/werkplaats/WorkshopInvoiceDialog";
import { DISCIPLINE_LABELS, WorkOrderDiscipline } from "@/components/werkplaats/workOrderTypes";
import { externOrdersZonderFactuur, externInvoiceDraft, FACTUUR_NIET_NODIG_REDENEN } from "@/lib/externFactuur";
import type { InvoiceDraft } from "@/services/workshopInvoiceService";

interface OpenOrder {
  id: string; approved_at: string | null; approved_by: string | null; discipline: string | null;
  description: string | null; part: string | null; parts: string[] | null;
  origin: string | null; external_customer: any; branch: string | null;
  vehicle: { brand: string; model: string; license_number: string | null; vin: string | null } | null;
  goedgekeurd_door: string | null;
}

interface GemarkeerdeOrder extends OpenOrder {
  factuur_niet_nodig_reden: string | null;
  factuur_niet_nodig_op: string | null;
  gemarkeerd_door: string | null;
}

const dagenOpen = (approvedAt: string | null) =>
  approvedAt ? Math.max(0, Math.floor((Date.now() - +new Date(approvedAt)) / 86400000)) : null;

const fmtDatum = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("nl-NL") : "—");

/**
 * "Nog te factureren (extern)" — goedgekeurde externe klussen zonder factuur (BOUWSTAP 13B).
 * Knoppen alleen voor owner/admin/aftersales_manager; OD en werkplaats_chef zien alleen-lezen.
 */
export const NogTeFacturerenExtern: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const { userRole, isAdmin } = useAuth();
  const mayEdit = isAdmin || featureAccess["handmatige-facturen"](userRole);

  const [open, setOpen] = useState<OpenOrder[]>([]);
  const [gemarkeerd, setGemarkeerd] = useState<GemarkeerdeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceDraft | null>(null);
  const [markeren, setMarkeren] = useState<OpenOrder | null>(null);
  const [reden, setReden] = useState("");
  const [toelichting, setToelichting] = useState("");
  const [bezig, setBezig] = useState(false);
  const [toonGemarkeerd, setToonGemarkeerd] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const select =
        "id, approved_at, approved_by, discipline, description, part, parts, origin, external_customer, branch," +
        " factuur_niet_nodig, factuur_niet_nodig_reden, factuur_niet_nodig_op, factuur_niet_nodig_door," +
        " vehicle:vehicles!work_orders_vehicle_id_fkey(brand, model, license_number, vin)";
      const [orders, invoices, profiles] = await Promise.all([
        fetchAllPages<any>((a, b) => (supabase as any).from("work_orders").select(select)
          .eq("status", "goedgekeurd").or("origin.eq.extern,external_customer.not.is.null").order("approved_at").range(a, b)),
        fetchAllPages<any>((a, b) => (supabase as any).from("workshop_invoices").select("id,work_order_id,source_work_order_ids").order("id").range(a, b)),
        fetchAllPages<any>((a, b) => supabase.from("profiles").select("id,first_name,last_name").order("id").range(a, b)),
      ]);
      const naam = new Map(profiles.map((p: any) => [p.id, [p.first_name, p.last_name].filter(Boolean).join(" ") || null]));
      const verrijk = (o: any) => ({
        ...o,
        goedgekeurd_door: o.approved_by ? naam.get(o.approved_by) || null : null,
        gemarkeerd_door: o.factuur_niet_nodig_door ? naam.get(o.factuur_niet_nodig_door) || null : null,
      });
      const openRows = externOrdersZonderFactuur(orders, invoices).map(verrijk);
      const gemarkeerdRows = orders.filter((o: any) => o.factuur_niet_nodig).map(verrijk);
      setOpen(openRows);
      setGemarkeerd(gemarkeerdRows);
    } catch (e: any) {
      toast({ title: "Laden mislukt", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-line */ }, []);

  const markeer = async () => {
    if (!markeren || !reden) return;
    setBezig(true);
    const { error } = await (supabase as any).rpc("werkorder_factuur_niet_nodig", {
      p_work_order_id: markeren.id,
      p_reden: reden,
      p_toelichting: toelichting || null,
    });
    setBezig(false);
    if (error) toast({ title: "Markeren mislukt", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Gemarkeerd als geen factuur nodig" });
      setMarkeren(null); setReden(""); setToelichting("");
      load(); onChanged?.();
    }
  };

  const tochFactureren = async (o: GemarkeerdeOrder) => {
    const { error } = await (supabase as any).rpc("werkorder_toch_factureren", { p_work_order_id: o.id });
    if (error) toast({ title: "Terugdraaien mislukt", description: error.message, variant: "destructive" });
    else { toast({ title: "Order staat weer in nog te factureren" }); load(); onChanged?.(); }
  };

  const klantNaam = (o: OpenOrder) => o.external_customer?.name || o.external_customer?.company || "—";

  const rij = (o: OpenOrder) => (
    <div key={o.id} className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 md:gap-3 px-4 py-3">
      <div className="flex items-center gap-2 md:contents">
        <AsLicensePlate value={o.vehicle?.license_number} size="sm" />
        <div className="md:w-[150px] text-[13px] text-slate-800 truncate">{o.vehicle?.brand} {o.vehicle?.model}</div>
      </div>
      <div className="md:w-[150px] text-[13px] text-slate-800 truncate">{klantNaam(o)}</div>
      <div className="md:flex-1 md:min-w-[160px] text-[12.5px] text-slate-600 truncate">{o.description || "—"}</div>
      <div className="flex items-center gap-2 md:contents">
        <Badge variant="outline">{DISCIPLINE_LABELS[o.discipline as WorkOrderDiscipline] || o.discipline}</Badge>
        <div className="md:w-[150px] text-[12px] text-slate-500">
          {fmtDatum(o.approved_at)}{o.goedgekeurd_door ? ` · ${o.goedgekeurd_door}` : ""}
        </div>
        <div className="md:w-[70px] text-[12px] text-slate-500 tabular-nums">
          {dagenOpen(o.approved_at) !== null ? `${dagenOpen(o.approved_at)} dagen` : "—"}
        </div>
      </div>
      {mayEdit && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setInvoice(externInvoiceDraft(o))}>
            <FileText className="h-3.5 w-3.5 mr-1" />Factuur opmaken
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setMarkeren(o); setReden(""); setToelichting(""); }}>
            <Ban className="h-3.5 w-3.5 mr-1" />Geen factuur nodig
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/40">
      <div className="px-4 py-3 border-b border-amber-200 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Nog te factureren (extern)</h2>
        <Badge variant="secondary">{open.length}</Badge>
      </div>

      {loading ? (
        <div className="p-6 flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Laden…</div>
      ) : open.length === 0 ? (
        <div className="p-4 text-[13px] text-slate-500">Geen externe klussen zonder factuur.</div>
      ) : (
        <div className="divide-y divide-amber-100">{open.map(rij)}</div>
      )}

      {gemarkeerd.length > 0 && (
        <div className="border-t border-amber-200">
          <button
            type="button"
            className="w-full px-4 py-2 flex items-center gap-1.5 text-[12.5px] text-slate-600 hover:text-slate-900"
            onClick={() => setToonGemarkeerd(v => !v)}
          >
            {toonGemarkeerd ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Geen factuur nodig ({gemarkeerd.length})
          </button>
          {toonGemarkeerd && (
            <div className="divide-y divide-amber-100 border-t border-amber-100">
              {gemarkeerd.map(o => (
                <div key={o.id} className="flex flex-col md:flex-row md:items-center gap-2 px-4 py-2.5 text-[12.5px]">
                  <div className="flex items-center gap-2">
                    <AsLicensePlate value={o.vehicle?.license_number} size="sm" />
                    <span className="text-slate-800">{o.vehicle?.brand} {o.vehicle?.model}</span>
                  </div>
                  <span className="text-slate-500 md:flex-1">
                    {o.factuur_niet_nodig_reden || "—"}
                    {o.gemarkeerd_door ? ` · door ${o.gemarkeerd_door}` : ""}
                    {o.factuur_niet_nodig_op ? ` · ${fmtDatum(o.factuur_niet_nodig_op)}` : ""}
                  </span>
                  {mayEdit && (
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

      {/* Factuur-dialoog: exact dezelfde als bij goedkeuren */}
      <WorkshopInvoiceDialog
        open={!!invoice}
        onOpenChange={(v) => !v && setInvoice(null)}
        initial={invoice}
        onSaved={() => { setInvoice(null); load(); onChanged?.(); }}
      />

      {/* Geen factuur nodig */}
      <Dialog open={!!markeren} onOpenChange={(v) => !v && setMarkeren(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Geen factuur nodig</DialogTitle>
            <DialogDescription>
              {markeren?.vehicle?.license_number} · {klantNaam(markeren || ({} as OpenOrder))} — kies een verplichte reden.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={reden} onValueChange={setReden}>
              <SelectTrigger><SelectValue placeholder="Kies een reden…" /></SelectTrigger>
              <SelectContent>
                {FACTUUR_NIET_NODIG_REDENEN.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Toelichting (optioneel)"
              value={toelichting}
              onChange={e => setToelichting(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setMarkeren(null)}>Annuleren</Button>
              <Button disabled={!reden || bezig} onClick={markeer}>
                {bezig && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Markeren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NogTeFacturerenExtern;
