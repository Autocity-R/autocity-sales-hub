import React, { useState } from "react";
import { Loader2, ShieldCheck, History, User, Timer } from "lucide-react";
import { AsLicensePlate, AsPill } from "@/components/aftersales/ui";
import { PartChips } from "@/components/werkplaats/workOrderParts";
import { DISCIPLINE_LABELS, STATUS_LABELS, type WorkOrderDiscipline, type WorkOrderStatus } from "@/components/werkplaats/workOrderTypes";
import { fmtUren } from "@/lib/tijdregels";
import { bronLabel, fmtNlDatumTijd, urenPerPersoon, voertuigStatusLabel, type WerkorderDetail } from "@/lib/factuurWerkorders";

const Omschrijving: React.FC<{ tekst: string | null }> = ({ tekst }) => {
  const [open, setOpen] = useState(false);
  const t = (tekst || "").trim();
  if (!t) return <div className="text-slate-400">Geen omschrijving</div>;
  const lang = t.length > 160 || t.includes("\n");
  return (
    <div className="text-slate-800">
      <div className={open ? "whitespace-pre-wrap" : "line-clamp-2"}>{t}</div>
      {lang && (
        <button type="button" className="text-[11.5px] text-primary hover:underline" onClick={() => setOpen(v => !v)}>
          {open ? "Minder" : "Volledige omschrijving"}
        </button>
      )}
    </div>
  );
};

const Stap: React.FC<{ label: string; iso: string | null; door?: string | null }> = ({ label, iso, door }) => (
  <div>
    <div className="text-[10.5px] uppercase tracking-wide text-slate-500 font-semibold">{label}</div>
    <div className="tabular-nums">{fmtNlDatumTijd(iso)}</div>
    {door && <div className="text-[11.5px] text-slate-500 truncate">door {door}</div>}
  </div>
);

/** Gekoppelde werkorders van één factuur (BOUWSTAP 19A). Alleen weergave. */
export const GekoppeldeWerkorders: React.FC<{
  orderIds: string[];
  details: Map<string, WerkorderDetail>;
  loading: boolean;
  onOpenVehicle: (vehicleId: string, label: string) => void;
  onOpenClaim: (claimId: string) => void;
  extra?: React.ReactNode;
}> = ({ orderIds, details, loading, onOpenVehicle, onOpenClaim, extra }) => {
  const orders = orderIds.map(id => details.get(id)).filter(Boolean) as WerkorderDetail[];
  const onzichtbaar = orderIds.length - orders.length;
  return (
    <div className="w-full mt-1 rounded-md border border-slate-200 bg-slate-50/70 p-3 space-y-3 text-[12.5px]">
      {extra}
      {orderIds.length === 0 ? (
        <div className="text-slate-500">Geen werkorder gekoppeld</div>
      ) : loading && orders.length === 0 ? (
        <div className="flex items-center gap-2 text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Werkorders laden…</div>
      ) : (
        <>
          {orders.map(o => {
            const naam = (id: string | null) => (id ? o.namen?.[id] || "Onbekend" : null);
            const uren = urenPerPersoon(o);
            const auto = [o.vehicle?.brand, o.vehicle?.model].filter(Boolean).join(" ");
            return (
              <div key={o.id} className="rounded-md border border-slate-200 bg-background p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-slate-900">{DISCIPLINE_LABELS[o.discipline as WorkOrderDiscipline] || o.discipline || "Werkorder"}</span>
                  <AsPill tone="blue">{bronLabel(o)}</AsPill>
                  {o.claim_nummer && o.warranty_claim_id && (
                    <button type="button" className="inline-flex items-center gap-1 text-primary hover:underline" onClick={() => onOpenClaim(o.warranty_claim_id as string)}>
                      <ShieldCheck className="h-3.5 w-3.5" />{o.claim_nummer}
                    </button>
                  )}
                  <AsPill tone="slate">{STATUS_LABELS[o.status as WorkOrderStatus] || o.status}</AsPill>
                  {o.factuur_niet_nodig && <AsPill tone="amber">Geen factuur nodig{o.factuur_niet_nodig_reden ? `: ${o.factuur_niet_nodig_reden}` : ""}</AsPill>}
                </div>
                <Omschrijving tekst={o.description} />
                <PartChips workOrder={o as any} size="sm" />
                <div className="flex flex-wrap items-center gap-2">
                  {o.vehicle ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 hover:underline"
                      onClick={() => onOpenVehicle(o.vehicle!.id, `${o.vehicle!.license_number || ""} ${auto}`.trim())}
                    >
                      <AsLicensePlate value={o.vehicle.license_number} size="sm" />
                      <span className="text-slate-800">{auto || "Auto"}</span>
                      <History className="h-3.5 w-3.5 text-slate-500" />
                    </button>
                  ) : <span className="text-slate-400">Auto niet zichtbaar</span>}
                  {o.vehicle && <span className="text-slate-500">· {voertuigStatusLabel(o.vehicle.status)}</span>}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-700">
                  {uren.regels.map((r, i) => (
                    <span key={i} className="inline-flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-slate-400" />{naam(r.persoon) || "Niet toegewezen"}
                      <Timer className="h-3.5 w-3.5 text-slate-400 ml-1" /><span className="tabular-nums">{fmtUren(r.seconden)}</span>
                    </span>
                  ))}
                  {!uren.perTijdregel && <span className="text-slate-400">(totale werktijd van de order)</span>}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-700">
                  <Stap label="Aangemaakt" iso={o.created_at} door={naam(o.created_by)} />
                  <Stap label="Gestart" iso={o.started_at} />
                  <Stap label="Afgerond" iso={o.finished_at} />
                  <Stap label="Goedgekeurd" iso={o.approved_at} door={naam(o.approved_by)} />
                </div>
              </div>
            );
          })}
          {onzichtbaar > 0 && !loading && (
            <div className="text-slate-500">{onzichtbaar} gekoppelde werkorder(s) niet zichtbaar voor jouw rol of verwijderd.</div>
          )}
        </>
      )}
    </div>
  );
};

export default GekoppeldeWerkorders;
