import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DamageDiagram, findZoneByName } from "./DamageDiagram";
import { AsLicensePlate, AsMono, AsPill } from "./ui";
import { WorkshopPhoto } from "@/components/werkplaats/WorkshopPhoto";

export interface DamageReportPayload {
  part?: string | null;
  description?: string | null;
  photos?: string[] | null;
  result_photos?: string[] | null;
  discipline?: string | null;
  status?: string | null;
  finish_note?: string | null;
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
}

const disciplineLabel = (d?: string | null) => {
  if (d === "spuit") return "🎨 Schadeherstel";
  if (d === "uitdeuk") return "🔨 Uitdeuken";
  if (d === "werkplaats") return "🔧 Werkplaats";
  return d || "";
};

export const DamageReportDialog: React.FC<Props> = ({ open, onOpenChange, report }) => {
  if (!report) return null;
  const v = report.vehicle;
  const zone = findZoneByName(report.part);
  const marker = zone ? [{ index: 1, zoneId: zone.id }] : [];

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

        <div className="grid md:grid-cols-[220px_1fr] gap-5 px-5 pb-5 pt-2">
          <div className="flex justify-center bg-slate-50 rounded-xl border border-slate-200 py-3">
            <DamageDiagram markers={marker} interactive={false} className="max-w-[160px]" />
          </div>
          <div className="min-w-0 space-y-3">
            {report.part && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[12.5px] font-semibold">
                {report.part}
              </div>
            )}
            {report.description && <div className="text-[13.5px] text-slate-800">{report.description}</div>}
            {report.finish_note && <div className="text-[12.5px] italic text-slate-500">Notitie: {report.finish_note}</div>}
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
          {(!report.photos || report.photos.length === 0) && (!report.result_photos || report.result_photos.length === 0) && (
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