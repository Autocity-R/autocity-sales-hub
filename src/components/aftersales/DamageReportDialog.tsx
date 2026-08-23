import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DamageDiagram, findZoneByName } from "./DamageDiagram";
import { AsLicensePlate, AsMono, AsPill } from "./ui";
import { WorkshopPhoto } from "@/components/werkplaats/WorkshopPhoto";
import { PartChips, getWorkOrderParts } from "@/components/werkplaats/workOrderParts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useRoleAccess } from "@/hooks/useRoleAccess";

export interface DamageReportPayload {
  id?: string | null;
  part?: string | null;
  parts?: string[] | null;
  description?: string | null;
  photos?: string[] | null;
  result_photos?: string[] | null;
  discipline?: string | null;
  status?: string | null;
  finish_note?: string | null;
  uitvoering?: string | null;
  extern_party?: string | null;
  extern_cost?: number | null;
  vehicle?: {
    brand?: string; model?: string; year?: number | null;
    license_number?: string | null; vin?: string | null;
    mileage?: number | null; color?: string | null;
  } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  report: DamageReportPayload | null;
  /** Wordt aangeroepen nadat het externe factuurbedrag is opgeslagen. */
  onCostSaved?: () => void;
}

const disciplineLabel = (d?: string | null) => {
  if (d === "spuit") return "🎨 Schadeherstel";
  if (d === "uitdeuk") return "🔨 Uitdeuken";
  if (d === "werkplaats") return "🔧 Werkplaats";
  return d || "";
};

/** Klein invulveld voor het factuurbedrag van de externe spuiter (ook ná goedkeuring). */
const ExternCostEditor: React.FC<{ report: DamageReportPayload; onSaved?: () => void }> = ({ report, onSaved }) => {
  const [value, setValue] = React.useState(report.extern_cost != null ? String(report.extern_cost) : "");
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => { setValue(report.extern_cost != null ? String(report.extern_cost) : ""); }, [report.id, report.extern_cost]);

  const save = async () => {
    const raw = value.replace(",", ".").trim();
    const cost = raw === "" ? null : Number(raw);
    if (cost !== null && (!isFinite(cost) || cost < 0)) {
      toast({ title: "Ongeldig bedrag", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("work_orders").update({ extern_cost: cost }).eq("id", report.id!);
    setSaving(false);
    if (error) toast({ title: "Fout", description: error.message, variant: "destructive" });
    else {
      toast({ title: cost === null ? "Bedrag gewist" : "Kosten externe partij opgeslagen" });
      onSaved?.();
    }
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3">
      <div className="text-[12.5px] font-medium text-blue-900 flex items-center gap-1.5">
        <Truck className="h-3.5 w-3.5" />
        Uitbesteed{report.extern_party ? ` aan ${report.extern_party}` : ""}
      </div>
      <div className="mt-2 flex items-end gap-2 max-w-sm">
        <div className="flex-1">
          <Label className="text-[12px] font-semibold text-blue-900">Kosten externe partij invullen (excl. btw)</Label>
          <Input
            className="mt-1.5 bg-white" type="number" step="0.01" min="0" inputMode="decimal"
            placeholder="0,00" value={value} onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={save} disabled={saving}>Opslaan</Button>
      </div>
      <p className="text-[11px] text-blue-700/80 mt-1.5">
        Dit bedrag telt als werkelijke kostprijs bij de auto — geen interne doorbelasting van €300.
      </p>
    </div>
  );
};

export const DamageReportDialog: React.FC<Props> = ({ open, onOpenChange, report, onCostSaved }) => {
  const { canManageWorkOrders } = useRoleAccess();
  if (!report) return null;
  const v = report.vehicle;
  const zoneIds = getWorkOrderParts(report).map(p => findZoneByName(p)?.id).filter(Boolean) as string[];
  const marker = zoneIds.map((zoneId, i) => ({ index: i + 1, zoneId }));
  /** Werkplaats-orders (onderhoud/APK) hebben geen schade-locatie: geen diagram. */
  const isWerkplaats = (report.discipline || "") === "werkplaats";
  const hasPhotos = (report.photos?.length || 0) > 0 || (report.result_photos?.length || 0) > 0;
  const showExternCost = !!report.id && report.uitvoering === "extern" && canManageWorkOrders();


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <AsLicensePlate value={v?.license_number} size="sm" />
            <span>{v?.brand} {v?.model}{v?.year ? ` · ${v.year}` : ""}</span>
            {report.discipline && <AsPill tone="slate" className="ml-1">{disciplineLabel(report.discipline)}</AsPill>}
          </DialogTitle>
        </DialogHeader>

        <div className={isWerkplaats ? "px-5 pb-5 pt-2" : "grid md:grid-cols-[220px_1fr] gap-5 px-5 pb-5 pt-2"}>
          {!isWerkplaats && (
            <div className="flex justify-center bg-slate-50 rounded-xl border border-slate-200 py-3">
              <DamageDiagram markers={marker} selectedZoneIds={zoneIds} interactive={false} className="max-w-[160px]" />
            </div>
          )}
          <div className="min-w-0 space-y-3">
            <PartChips workOrder={report} />
            {report.description && <div className="text-[13.5px] text-slate-800">{report.description}</div>}
            {report.finish_note && <div className="text-[12.5px] italic text-slate-500">Notitie: {report.finish_note}</div>}
            {showExternCost && <ExternCostEditor report={report} onSaved={onCostSaved} />}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <Spec label="VIN"><AsMono>{v?.vin ? v.vin.slice(-10) : "—"}</AsMono></Spec>
              <Spec label="KM-stand">{v?.mileage ? `${v.mileage.toLocaleString("nl-NL")} km` : "—"}</Spec>
              <Spec label="Kleur">{v?.color || "—"}</Spec>
              <Spec label="Status">{report.status || "—"}</Spec>
            </div>
          </div>
        </div>

        <div className="px-5 pb-6 space-y-4">
          {(report.photos && report.photos.length > 0) && (
            <div>
              <div className="text-[11px] uppercase tracking-wide mb-2 text-slate-500 font-semibold">
                {report.result_photos && report.result_photos.length > 0 ? "Vóór" : "Foto's"}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {report.photos.map((p, i) => <WorkshopPhoto key={i} path={p} className="w-full aspect-square" />)}
              </div>
            </div>
          )}
          {report.result_photos && report.result_photos.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wide mb-2 text-slate-500 font-semibold">Na (resultaat)</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {report.result_photos.map((p, i) => <WorkshopPhoto key={i} path={p} className="w-full aspect-square" />)}
              </div>
            </div>
          )}
          {!hasPhotos && !isWerkplaats && (
            <div className="text-[12px] text-slate-400 text-center py-2">Geen foto's toegevoegd.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Spec: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</div>
    <div className="text-[12.5px] text-slate-800 truncate mt-0.5">{children || "—"}</div>
  </div>
);

export default DamageReportDialog;