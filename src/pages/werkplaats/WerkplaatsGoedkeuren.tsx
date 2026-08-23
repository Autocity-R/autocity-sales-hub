import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentBranch, applyBranchFilter } from "@/contexts/BranchContext";
import BranchFilter from "@/components/reports/BranchFilter";
import { WorkshopPhoto } from "@/components/werkplaats/WorkshopPhoto";
import { DISCIPLINE_LABELS, WorkOrderDiscipline } from "@/components/werkplaats/workOrderTypes";
import { Check, Loader2, Undo2, Timer, ClipboardCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { removeWorkOrderFromWerkplaatsCalendar } from "@/services/werkplaatsCalendarService";
import { AsPage, AsCard, AsCardHead, AsLicensePlate } from "@/components/aftersales/ui";
import { DamageReportDialog, DamageReportPayload } from "@/components/aftersales/DamageReportDialog";
import { AsPill } from "@/components/aftersales/ui";
import WorkshopInvoiceDialog from "@/components/werkplaats/WorkshopInvoiceDialog";
import { InvoiceDraft, dispatchPendingInternalInvoices } from "@/services/workshopInvoiceService";
import { FileText } from "lucide-react";
import { PartChips, getWorkOrderParts } from "@/components/werkplaats/workOrderParts";
import { isExternUitvoering } from "@/components/werkplaats/SchadeherstelCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface WO {
  id: string; vehicle_id: string; discipline: string; description: string; part: string | null; parts?: string[] | null; is_rush: boolean;
  photos: string[] | null; result_photos: string[] | null;
  work_seconds: number | null; finish_note: string | null; branch: string | null;
  origin: string | null; external_customer: any | null;
  uitvoering?: string | null; extern_party?: string | null;
  extern_dropped_at?: string | null; extern_returned_at?: string | null; extern_cost?: number | null;
  vehicle: { brand: string; model: string; year: number | null; license_number: string | null; vin?: string | null } | null;
}

const fmtSec = (s: number | null) => {
  if (!s || s <= 0) return "—";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}u ${m}m` : `${m} min`;
};

const WerkplaatsGoedkeuren: React.FC = () => {
  const { branchFilter } = useCurrentBranch();
  const [rows, setRows] = useState<WO[]>([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<DamageReportPayload | null>(null);
  const [invoice, setInvoice] = useState<InvoiceDraft | null>(null);
  const [externCosts, setExternCosts] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    let q = supabase.from("work_orders")
      .select("id, vehicle_id, discipline, description, part, parts, is_rush, photos, result_photos, work_seconds, finish_note, branch, origin, external_customer, uitvoering, extern_party, extern_dropped_at, extern_returned_at, extern_cost, vehicle:vehicles!work_orders_vehicle_id_fkey(brand, model, year, license_number, vin)")
      .eq("status", "afgerond")
      .neq("discipline", "uitdeuk")
      .order("finished_at", { ascending: true });
    q = applyBranchFilter(q as any, branchFilter);
    const { data } = await q;
    setRows((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-line */ }, [branchFilter]);

  const isExtern = (w: WO) => w.origin === "extern";

  const invoiceDraftFor = (w: WO): InvoiceDraft => {
    const c = (w.external_customer as any) || {};
    return {
      work_order_id: w.id,
      branch: w.branch || "rotterdam",
      customer: {
        name: c.name || "",
        address: c.address || "",
        street: c.street || "",
        house_number: c.house_number || "",
        postal_code: c.postal_code || "",
        city: c.city || "",
        email: c.email || "",
        phone: c.phone || "",
      },
      vehicle: {
        brand: w.vehicle?.brand || "", model: w.vehicle?.model || "",
        license_number: w.vehicle?.license_number || "", vin: w.vehicle?.vin || null,
      },
      lines: [{ description: [getWorkOrderParts(w).join(" · ") || null, w.description].filter(Boolean).join(" — "), amount: 0 }],
    };
  };

  const approve = async (w: WO) => {
    const uitbesteed = isExternUitvoering(w);
    let cost: number | null = null;
    let costTouched = false;
    if (uitbesteed) {
      const raw = (externCosts[w.id] ?? (w.extern_cost != null ? String(w.extern_cost) : "")).replace(",", ".").trim();
      if (raw !== "") {
        cost = Number(raw);
        if (!isFinite(cost) || cost < 0) {
          toast({ title: "Ongeldig bedrag", description: "Vul een geldig factuurbedrag in, of laat het veld leeg.", variant: "destructive" });
          return;
        }
        costTouched = true;
      } else {
        toast({
          title: "Goedgekeurd zonder factuurbedrag",
          description: "Bedrag later bekend? Vul het dan hier alsnog in via de werkorder-details.",
        });
      }
    }
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("work_orders").update({
      status: "goedgekeurd", approved_by: userRes.user?.id ?? null, approved_at: new Date().toISOString(),
      ...(uitbesteed && costTouched ? { extern_cost: cost } : {}),
    }).eq("id", w.id);

    if (error) toast({ title: "Fout", description: error.message, variant: "destructive" });
    else {
      removeWorkOrderFromWerkplaatsCalendar(w.id, (w as any).branch || "rotterdam");
      toast({ title: "Goedgekeurd" });
      if (["spuit", "uitdeuk"].includes(w.discipline)) {
        const { count } = await supabase.from("work_orders")
          .select("id", { count: "exact", head: true })
          .eq("vehicle_id", w.vehicle_id)
          .in("discipline", ["spuit", "uitdeuk"])
          .not("status", "in", "(goedgekeurd,geannuleerd)");
        if ((count ?? 0) === 0) {
          const { count: poetsCount } = await supabase.from("work_orders")
            .select("id", { count: "exact", head: true })
            .eq("vehicle_id", w.vehicle_id)
            .eq("discipline", "poets")
            .not("status", "in", "(goedgekeurd,geannuleerd)");
          if ((poetsCount ?? 0) > 0) toast({ title: "Auto doorgezet naar Poetsen" });
        }
      }
      if (isExtern(w)) setInvoice(invoiceDraftFor(w));
      // interne facturatie tussen de BV's: de DB maakt de factuur aan, hier alleen PDF + mail
      if (!isExtern(w) && !uitbesteed && ["werkplaats", "spuit"].includes(w.discipline)) {
        dispatchPendingInternalInvoices()
          .then((n) => { if (n > 0) toast({ title: "Interne factuur verstuurd naar administratie" }); })
          .catch(() => toast({ title: "Interne factuur staat klaar als concept", description: "Mailen is niet gelukt, probeer het later opnieuw vanuit Facturen." }));
      }
      load();
    }
  };

  const reject = async (w: WO) => {
    const note = window.prompt("Waarom terugsturen?");
    if (!note) return;
    const { data: bounds } = await supabase.from("work_orders")
      .select("sort_order").eq("discipline", w.discipline).in("status", ["ingepland", "bezig"])
      .order("sort_order", { ascending: true }).limit(1);
    const minSort = ((bounds as any)?.[0]?.sort_order ?? 10) - 10;

    const { data: cur } = await supabase.from("work_orders").select("rejected_count").eq("id", w.id).single();
    const { error } = await supabase.from("work_orders").update({
      status: "ingepland", sort_order: minSort, reject_note: note,
      rejected_count: ((cur as any)?.rejected_count ?? 0) + 1,
    }).eq("id", w.id);
    if (error) toast({ title: "Fout", description: error.message, variant: "destructive" });
    else { toast({ title: "Teruggestuurd" }); load(); }
  };

  return (
    <DashboardLayout>
      <AsPage>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Goedkeuren</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">Afgeronde werkorders controleren en akkoord geven.</p>
          </div>
          <BranchFilter />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Laden…</div>
        ) : rows.length === 0 ? (
          <AsCard className="p-10 text-center text-slate-400 text-[13px]">Geen orders wachten op goedkeuring.</AsCard>
        ) : (
          <div className="space-y-4">
            {rows.map(w => (
              <AsCard
                key={w.id}
                className="overflow-hidden cursor-pointer"
                onClick={() => setReport({
                  id: w.id, part: w.part, parts: (w as any).parts, description: w.description, photos: w.photos, result_photos: w.result_photos,
                  discipline: w.discipline, status: "afgerond", finish_note: w.finish_note, vehicle: w.vehicle as any,
                  uitvoering: w.uitvoering, extern_party: w.extern_party, extern_cost: w.extern_cost ?? null,
                })}

              >
                <AsCardHead
                  tone="teal"
                  icon={<ClipboardCheck className="h-4 w-4" />}
                  title={
                    <span className="flex items-center gap-2">
                      <AsLicensePlate value={w.vehicle?.license_number} size="sm" />
                      <span>{w.vehicle?.brand} {w.vehicle?.model}{w.vehicle?.year ? ` · ${w.vehicle.year}` : ""}</span>
                      {isExtern(w) && (
                        <>
                          <AsPill tone="blue">EXTERN · {w.external_customer?.name || "klant"}</AsPill>
                          <AsPill tone="amber">Factuur nodig</AsPill>
                        </>
                      )}
                      {isExternUitvoering(w) && (
                        <AsPill tone="blue">
                          <Truck className="h-3 w-3" />Uitbesteed{w.extern_party ? ` · ${w.extern_party}` : ""}
                        </AsPill>
                      )}
                    </span>
                  }
                  subtitle={DISCIPLINE_LABELS[w.discipline as WorkOrderDiscipline] || w.discipline}
                  right={
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      {isExtern(w) && (
                        <Button size="sm" variant="outline" onClick={() => setInvoice(invoiceDraftFor(w))}>
                          <FileText className="h-4 w-4 mr-1" />Factuur opmaken
                        </Button>
                      )}
                      <Button size="sm" onClick={() => approve(w)}><Check className="h-4 w-4 mr-1" />Goedkeuren</Button>
                      <Button size="sm" variant="outline" onClick={() => reject(w)}><Undo2 className="h-4 w-4 mr-1" />Terugsturen</Button>
                    </div>
                  }
                />
                <div className="px-5 pb-4 pt-4 border-t border-slate-100 space-y-3">
                  <PartChips workOrder={w as any} />
                  <div className="text-sm text-slate-800">{w.description}</div>
                  {w.finish_note && <div className="text-sm italic text-slate-500">Notitie: {w.finish_note}</div>}
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Timer className="h-4 w-4" /> Werktijd: {fmtSec(w.work_seconds)}
                  </div>
                  {isExternUitvoering(w) && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3" onClick={(e) => e.stopPropagation()}>
                      <div className="text-[12.5px] text-blue-900 font-medium flex flex-wrap items-center gap-x-2">
                        Uitbesteed aan {w.extern_party || "externe partij"}
                        {w.extern_dropped_at && <span className="text-blue-700/80">· weggebracht {format(new Date(w.extern_dropped_at), "d MMM", { locale: nl })}</span>}
                        {w.extern_returned_at && <span className="text-blue-700/80">· terug {format(new Date(w.extern_returned_at), "d MMM", { locale: nl })}</span>}
                      </div>
                      <div className="mt-2 max-w-xs">
                        <Label className="text-[12px] font-semibold text-blue-900">Kosten externe partij (excl. btw) — optioneel</Label>
                        <Input
                          className="mt-1.5 bg-white"
                          type="number" step="0.01" min="0" inputMode="decimal"
                          placeholder="0,00"
                          value={externCosts[w.id] ?? (w.extern_cost != null ? String(w.extern_cost) : "")}
                          onChange={(e) => setExternCosts((prev) => ({ ...prev, [w.id]: e.target.value }))}
                        />
                        <p className="text-[11px] text-blue-700/80 mt-1">
                          Bedrag later bekend? Vul het dan hier alsnog in — je kunt gewoon goedkeuren zonder bedrag.
                          Geen interne doorbelasting van €300; dit bedrag telt als werkelijke kostprijs bij de auto.
                        </p>

                      </div>
                    </div>
                  )}
                  {w.discipline !== "werkplaats" && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide mb-1 text-slate-500 font-semibold">Opdracht-foto's</div>
                      <div className="flex flex-wrap gap-2">
                        {(w.photos || []).length === 0 && <span className="text-xs text-slate-400">—</span>}
                        {(w.photos || []).map((p, i) => <WorkshopPhoto key={i} path={p} className="w-24 h-24" />)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide mb-1 text-slate-500 font-semibold">Resultaat-foto's</div>
                      <div className="flex flex-wrap gap-2">
                        {(w.result_photos || []).length === 0 && <span className="text-xs text-slate-400">—</span>}
                        {(w.result_photos || []).map((p, i) => <WorkshopPhoto key={i} path={p} className="w-24 h-24" />)}
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              </AsCard>
            ))}
          </div>
        )}
        <DamageReportDialog open={!!report} onOpenChange={(v) => !v && setReport(null)} report={report} onCostSaved={load} />
        <WorkshopInvoiceDialog open={!!invoice} onOpenChange={(v) => !v && setInvoice(null)} initial={invoice} />
      </AsPage>
    </DashboardLayout>
  );
};

export default WerkplaatsGoedkeuren;