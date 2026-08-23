import React from "react";
import { differenceInCalendarDays, differenceInDays, format } from "date-fns";
import { nl } from "date-fns/locale";
import { Flame, CheckCircle2, Timer, Building2, CalendarClock, Undo2, ArrowUp, ArrowDown, X, Truck } from "lucide-react";
import { AsCard, AsPill, AsLicensePlate, AsMono, useLiveTimer } from "@/components/aftersales/ui";
import { WorkshopPhoto } from "@/components/werkplaats/WorkshopPhoto";
import { PartChips } from "@/components/werkplaats/workOrderParts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Eén kaartvorm voor schadeherstel — gebruikt in het Schadeherstel-menu én de Planning. */
export interface SchadeWO {
  id: string;
  description: string;
  part?: string | null;
  parts?: any;
  status: string;
  is_rush: boolean;
  photos?: string[] | null;
  result_photos?: string[] | null;
  created_at: string;
  planned_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  assigned_to?: string | null;
  uitvoering?: string | null;
  extern_party?: string | null;
  extern_dropped_at?: string | null;
  extern_returned_at?: string | null;
  rejected_count?: number | null;
  reject_note?: string | null;
  origin?: string | null;
  external_customer?: any | null;
  vehicle?: {
    brand?: string | null;
    model?: string | null;
    year?: number | null;
    license_number?: string | null;
    vin?: string | null;
    mileage?: number | null;
    color?: string | null;
    showroom_photo_url?: string | null;
  } | null;
}

export const isExternUitvoering = (w: { uitvoering?: string | null } | null | undefined): boolean =>
  (w?.uitvoering ?? "intern") === "extern";

export const externDays = (w: SchadeWO): number | null => {
  if (!w.extern_dropped_at) return null;
  return Math.max(0, differenceInCalendarDays(new Date(), new Date(w.extern_dropped_at)));
};

interface Props {
  w: SchadeWO;
  index?: number;
  assigneeName?: string | null;
  onOpen?: (w: SchadeWO) => void;
  /** Acties van de uitvoerder (Start / Klaar) — onderaan de kaart, volle breedte. */
  actions?: React.ReactNode;
  /** Beheeracties (verzetten, spoed, annuleren) — rechtsboven op de kaart. */
  onReschedule?: (w: SchadeWO) => void;
  onToggleRush?: (w: SchadeWO) => void;
  onCancel?: (w: SchadeWO) => void;
  onMove?: (w: SchadeWO, dir: -1 | 1) => void;
  className?: string;
}

export const SchadeherstelCard: React.FC<Props> = ({
  w, index, assigneeName, onOpen, actions,
  onReschedule, onToggleRush, onCancel, onMove, className,
}) => {
  const v = w.vehicle;
  const extern = isExternUitvoering(w);
  const busy = w.status === "bezig";
  const done = w.status === "afgerond" || w.status === "goedgekeurd";
  const timer = useLiveTimer(busy && !extern ? w.started_at ?? null : null);
  const days = differenceInDays(new Date(), new Date(w.created_at));
  const eDays = externDays(w);
  const specs = [
    v?.year ? String(v.year) : null,
    typeof v?.mileage === "number" ? `${v!.mileage!.toLocaleString("nl-NL")} km` : null,
    v?.color || null,
  ].filter(Boolean) as string[];
  const hasManage = !!(onReschedule || onToggleRush || onCancel || onMove);

  return (
    <AsCard
      onClick={onOpen ? () => onOpen(w) : undefined}
      className={cn("p-3.5 md:p-4", w.is_rush && !done && "border-red-200 ring-1 ring-red-100", className)}
    >
      <div className="flex items-start gap-3">
        {v?.showroom_photo_url ? (
          <img
            src={v.showroom_photo_url}
            alt={`${v?.brand ?? ""} ${v?.model ?? ""}`}
            loading="lazy"
            className="hidden sm:block h-16 w-24 rounded-lg object-cover border border-slate-200 shrink-0"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {typeof index === "number" && (
                  <span className="text-[16px] font-semibold text-slate-300 tabular-nums leading-none">{index + 1}</span>
                )}
                <AsLicensePlate value={v?.license_number} size="sm" />
                <span className="text-[14px] font-bold tracking-tight text-slate-900 truncate">
                  {v?.brand} {v?.model}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                {specs.join(" · ")}
                {v?.vin ? <> · <AsMono>{v.vin.slice(-8)}</AsMono></> : null}
                {assigneeName ? ` · ${assigneeName}` : ""}
              </div>
            </div>
            {hasManage && (
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                {onMove && (
                  <>
                    <Button size="icon" variant="outline" className="h-9 w-9 sm:h-7 sm:w-7" title="Omhoog" onClick={() => onMove(w, -1)}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="outline" className="h-9 w-9 sm:h-7 sm:w-7" title="Omlaag" onClick={() => onMove(w, 1)}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
                {onToggleRush && (
                  <Button
                    size="icon"
                    variant={w.is_rush ? "default" : "outline"}
                    className={cn("h-9 w-9 sm:h-7 sm:w-7", w.is_rush && "bg-red-500 hover:bg-red-600")}
                    title="Spoed"
                    onClick={() => onToggleRush(w)}
                  >
                    <Flame className="h-3.5 w-3.5" />
                  </Button>
                )}
                {onReschedule && (
                  <Button size="icon" variant="outline" className="h-9 w-9 sm:h-7 sm:w-7" title="Verzetten" onClick={() => onReschedule(w)}>
                    <CalendarClock className="h-3.5 w-3.5" />
                  </Button>
                )}
                {onCancel && (
                  <Button size="icon" variant="outline" className="h-9 w-9 sm:h-7 sm:w-7 text-slate-500 hover:text-red-600 hover:border-red-300" title="Annuleren" onClick={() => onCancel(w)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5 items-center">
            {w.is_rush && !done && <AsPill tone="red"><Flame className="h-3 w-3" />Spoed</AsPill>}
            {extern && (
              <AsPill tone="blue">
                <Truck className="h-3 w-3" />
                {w.extern_party
                  ? `Bij ${w.extern_party}${w.extern_dropped_at ? ` sinds ${format(new Date(w.extern_dropped_at), "d MMM", { locale: nl })}` : ""}${eDays !== null ? ` · ${eDays}d` : ""}`
                  : "Uitbesteed — nog wegbrengen"}
              </AsPill>
            )}
            {w.status === "aangevraagd" && <AsPill tone="slate">Aangevraagd</AsPill>}
            {done
              ? <AsPill tone="green"><CheckCircle2 className="h-3 w-3" />{w.status === "goedgekeurd" ? "Goedgekeurd" : "Wacht op controle"}</AsPill>
              : <AsPill tone={days > 3 ? "red" : days > 1 ? "amber" : "slate"}>{days}d open</AsPill>}
            {w.planned_at && (
              <AsPill tone="amber"><CalendarClock className="h-3 w-3" />{format(new Date(w.planned_at), "EEE d MMM · HH:mm", { locale: nl })}</AsPill>
            )}
            {(w.rejected_count ?? 0) > 0 && (
              <AsPill tone="red"><Undo2 className="h-3 w-3" />Afgekeurd — opnieuw ({w.rejected_count})</AsPill>
            )}
            {w.origin === "extern" && (
              <AsPill tone="violet"><Building2 className="h-3 w-3" />Externe klant{w.external_customer?.name ? ` · ${w.external_customer.name}` : ""}</AsPill>
            )}
            {busy && !extern && timer && <AsPill tone="amber"><Timer className="h-3 w-3" />{timer}</AsPill>}
          </div>

          <PartChips workOrder={w as any} size="sm" className="mt-2.5" />
          <div className="mt-2 text-[13px] text-slate-700 whitespace-pre-line">{w.description}</div>
          {w.reject_note && (
            <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-[12px] text-red-700">
              Afgekeurd: {w.reject_note}
            </div>
          )}

          {(w.photos?.length ?? 0) > 0 && (
            <div className="flex gap-2 mt-2.5 flex-wrap">
              {(w.photos || []).map((p, i) => <WorkshopPhoto key={i} path={p} className="w-16 h-16" />)}
            </div>
          )}
          {(w.result_photos?.length ?? 0) > 0 && (
            <>
              <div className="mt-2.5 text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Resultaat</div>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {(w.result_photos || []).map((p, i) => <WorkshopPhoto key={i} path={p} className="w-16 h-16" />)}
              </div>
            </>
          )}

          {actions && (
            <div className="mt-3" onClick={(e) => e.stopPropagation()}>{actions}</div>
          )}
        </div>
      </div>
    </AsCard>
  );
};

export default SchadeherstelCard;
