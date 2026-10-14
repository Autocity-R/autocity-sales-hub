import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CheckCircle2, XCircle, Loader2, Wrench, ShieldCheck, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { STATUS_LABELS, WorkOrderStatus } from "@/components/werkplaats/workOrderTypes";
import {
  splitWorkOrdersByDelivery, sortAfter, sourceLabel, claimStatusLabel, isOpenClaim, fmtHours, OPEN_STATUSES,
} from "@/lib/workHistory";
import { supabase } from "@/integrations/supabase/client";
import { checklistHistory } from "@/lib/deliveryChecklistHistory";
import { DISCIPLINE_LABELS, WorkOrderDiscipline } from "@/components/werkplaats/workOrderTypes";
import { getWorkOrderParts } from "@/components/werkplaats/workOrderParts";
import { cn } from "@/lib/utils";

const fmt = (s?: string | null) => (s ? format(new Date(s), "d MMM yyyy HH:mm", { locale: nl }) : "—");

/** Alleen-lezen: aflever-checklist + werkorders vóór aflevering (voor garantie-terugzoeken). */
export const DeliveryChecklistHistory: React.FC<{ vehicleId: string; deliveredAt?: string | Date | null }> = ({ vehicleId, deliveredAt }) => {
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<unknown>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [showCancelled, setShowCancelled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      // Twee queries: checklist + volledige werkhistorie (RPC, RLS van de gebruiker blijft gelden)
      const [{ data: v }, { data: h, error: hErr }] = await Promise.all([
        supabase.from("vehicles").select("details").eq("id", vehicleId).maybeSingle(),
        supabase.rpc("voertuig_werkhistorie" as any, { p_vehicle_id: vehicleId } as any),
      ]);
      if (!alive) return;
      setChecklist((v as any)?.details?.preDeliveryChecklist ?? null);
      // Geen leesrecht of fout → dat deel gewoon leeg laten
      setOrders(hErr ? [] : ((h as any)?.orders || []));
      setClaims(hErr ? [] : ((h as any)?.claims || []));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [vehicleId]);

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checklist laden…</div>;

  const { rows, percentAtDelivery, totalAtDelivery } = checklistHistory(checklist, deliveredAt ?? null);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <h3 className="text-lg font-semibold">Aflever-checklist</h3>
          {percentAtDelivery !== null && (
            <span className={cn("text-sm font-semibold px-2 py-0.5 rounded-md border",
              percentAtDelivery === 100 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200")}>
              {percentAtDelivery}% afgevinkt bij aflevering ({totalAtDelivery} punten)
            </span>
          )}
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen checklist vastgelegd.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map(r => {
              const missed = r.existedAtDelivery && !r.doneAtDelivery;
              return (
                <li key={r.id} className={cn("rounded-md border p-3 text-sm", missed ? "border-red-300 bg-red-50" : "border-border")}>
                  <div className="flex items-start gap-2">
                    {r.completed
                      ? <CheckCircle2 className={cn("h-4 w-4 mt-0.5 shrink-0", missed ? "text-red-600" : "text-emerald-600")} />
                      : <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />}
                    <div className="min-w-0 flex-1">
                      <div className={cn("font-medium break-words", missed && "text-red-800")}>{r.description}</div>
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        <div>Afgevinkt: {r.completed ? `ja — ${r.completedByName || "onbekend"} · ${fmt(r.completedAt)}` : "nee"}</div>
                        <div>Toegevoegd: {r.createdByName || "onbekend"} · {fmt(r.createdAt)}</div>
                        {missed && <div className="font-semibold text-red-700">Niet afgevinkt bij aflevering{r.completed ? " (pas later afgevinkt)" : ""}</div>}
                        {!r.existedAtDelivery && <div>Na aflevering toegevoegd</div>}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <WorkOrderHistory
        orders={orders} claims={claims} deliveredAt={deliveredAt ?? null}
        showCancelled={showCancelled} setShowCancelled={setShowCancelled}
        onOpenClaim={(id) => navigate(`/warranty?claim=${id}`)}
      />
    </div>
  );
};

const statusLabel = (s: string) => STATUS_LABELS[s as WorkOrderStatus] || s;
const name = (n?: string | null, actief?: boolean | null) => (n ? `${n}${actief === false ? " · uit dienst" : ""}` : "—");
const day = (s?: string | null) => (s ? format(new Date(s), "d MMM yyyy", { locale: nl }) : "—");

const OrderCard: React.FC<{ o: any; after?: boolean; onOpenClaim: (id: string) => void }> = ({ o, after, onOpenClaim }) => {
  const open = OPEN_STATUSES.includes(o.status);
  const garantie = o.source === "garantie" || !!o.warranty_claim_id;
  const parts = getWorkOrderParts(o);
  return (
    <li className={cn("rounded-md border p-3 text-sm", open && after && "border-amber-300 bg-amber-50/50", o.status === "geannuleerd" && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-1.5 font-medium">
        {after && <span className="text-muted-foreground font-normal">{day(o.created_at)} ·</span>}
        <span>{DISCIPLINE_LABELS[o.discipline as WorkOrderDiscipline] || o.discipline}</span>
        {parts.length > 0 && <span>· {parts.join(", ")}</span>}
        <span className={cn("text-xs px-1.5 py-0.5 rounded border font-normal", open ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-muted text-muted-foreground border-border")}>
          {open ? `Open · ${statusLabel(o.status)}` : statusLabel(o.status)}
        </span>
        {after && o.source && <span className="text-xs text-muted-foreground font-normal">Bron: {sourceLabel(o.source)}</span>}
        {garantie && (
          <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border bg-blue-50 text-blue-800 border-blue-200 font-normal">
            <ShieldCheck className="h-3 w-3" />Garantie{o.warranty_claim_id ? ` · ${claimStatusLabel(o.claim_status)}` : ""}
          </span>
        )}
        {o.via_ander_record && (
          <span className="text-xs px-1.5 py-0.5 rounded border bg-slate-50 text-slate-600 border-slate-200 font-normal">via ander record (status {o.record_status || "?"})</span>
        )}
      </div>
      {o.description && <div className="text-muted-foreground break-words">{o.description}</div>}
      <div className="text-xs text-muted-foreground mt-1">
        Door: {name(o.assigned_name, o.assigned_actief)}
        {after && o.started_at && <> · Gestart: {fmt(o.started_at)}</>}
        {" "}· Afgerond: {fmt(o.finished_at)} · Goedgekeurd: {fmt(o.approved_at)}{o.approved_name ? ` (${o.approved_name})` : ""}
        {after && <> · Gewerkt: {fmtHours(o.work_seconds)} u</>}
        {after && !o.started_at && o.planned_at && <> · Ingepland: {fmt(o.planned_at)}</>}
      </div>
      {o.warranty_claim_id && (
        <button type="button" onClick={() => onOpenClaim(o.warranty_claim_id)} className="mt-1 inline-flex items-center gap-1 text-xs text-blue-700 hover:underline">
          <ExternalLink className="h-3 w-3" />Open claim in garantiemenu
        </button>
      )}
    </li>
  );
};

const WorkOrderHistory: React.FC<{
  orders: any[]; claims: any[]; deliveredAt: string | Date | null;
  showCancelled: boolean; setShowCancelled: (v: boolean) => void; onOpenClaim: (id: string) => void;
}> = ({ orders, claims, deliveredAt, showCancelled, setShowCancelled, onOpenClaim }) => {
  const visible = orders.filter(o => showCancelled || o.status !== "geannuleerd");
  const { before, after: afterRaw } = splitWorkOrdersByDelivery(visible, deliveredAt);
  const after = sortAfter(afterRaw);
  const hasCancelled = orders.some(o => o.status === "geannuleerd");
  const linked = new Set(orders.map(o => o.warranty_claim_id).filter(Boolean));
  const looseClaims = claims.filter(c => !linked.has(c.id));
  const openClaims = claims.filter(c => isOpenClaim(c.claim_status)).length;
  const garantieCount = after.filter(o => o.source === "garantie" || o.warranty_claim_id).length;
  const lastDates = [...after.map(o => o.created_at), ...claims.map(c => c.created_at)].sort();
  const last = lastDates[lastDates.length - 1];

  const summary = after.length === 0 && claims.length === 0
    ? "Na aflevering is er nog niets aan deze auto gedaan."
    : [
        `Na aflevering: ${after.length} werkorder${after.length === 1 ? "" : "s"}${garantieCount ? ` (${garantieCount} garantie)` : ""}`,
        claims.length ? `${claims.length} claim${claims.length === 1 ? "" : "s"}${openClaims ? ` (${openClaims} open)` : ""}` : null,
        last ? `laatst op ${day(last)}` : null,
      ].filter(Boolean).join(", ");

  return (
    <>
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Wrench className="h-4 w-4" /> Werkorders vóór aflevering</h3>
        {before.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen werkorders.</p>
        ) : (
          <ul className="space-y-2">{before.map(o => <OrderCard key={o.id} o={o} onOpenClaim={onOpenClaim} />)}</ul>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
          <h3 className="text-lg font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Na aflevering (garantie &amp; nazorg)</h3>
          {hasCancelled && (
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
              toon geannuleerd
            </label>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-2" data-testid="nazorg-samenvatting">{summary}</p>
        {after.length > 0 && (
          <ul className="space-y-2" data-testid="na-aflevering">{after.map(o => <OrderCard key={o.id} o={o} after onOpenClaim={onOpenClaim} />)}</ul>
        )}
        {looseClaims.length > 0 && (
          <div className="mt-3">
            <div className="text-sm font-semibold mb-1">Garantieclaims</div>
            <ul className="space-y-2" data-testid="claims">
              {looseClaims.map(c => (
                <li key={c.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-1.5 font-medium">
                    <span className="text-muted-foreground font-normal">{day(c.created_at)} ·</span>
                    <span className={cn("text-xs px-1.5 py-0.5 rounded border font-normal", isOpenClaim(c.claim_status) ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-muted text-muted-foreground border-border")}>
                      {claimStatusLabel(c.claim_status)}
                    </span>
                    {c.kosten_totaal != null && <span className="text-xs font-normal">Kosten: €{Number(c.kosten_totaal).toLocaleString("nl-NL")}</span>}
                    <span className="text-xs text-muted-foreground font-normal">Geen werkorder</span>
                    {!c.vehicle_id && <span className="text-xs text-muted-foreground font-normal">(op kenteken {c.manual_license_number})</span>}
                  </div>
                  {c.description && <div className="text-muted-foreground break-words">{c.description}</div>}
                  <button type="button" onClick={() => onOpenClaim(c.id)} className="mt-1 inline-flex items-center gap-1 text-xs text-blue-700 hover:underline">
                    <ExternalLink className="h-3 w-3" />Open claim in garantiemenu
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
};
