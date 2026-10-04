import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CheckCircle2, XCircle, Loader2, Wrench } from "lucide-react";
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
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [{ data: v }, { data: wo }] = await Promise.all([
        supabase.from("vehicles").select("details").eq("id", vehicleId).maybeSingle(),
        supabase.from("work_orders")
          .select("id, discipline, part, parts, description, status, assigned_to, approved_by, created_at, finished_at, approved_at")
          .eq("vehicle_id", vehicleId).neq("status", "geannuleerd")
          .order("created_at", { ascending: true }),
      ]);
      if (!alive) return;
      setChecklist((v as any)?.details?.preDeliveryChecklist ?? null);
      const d = deliveredAt ? new Date(deliveredAt).getTime() : Infinity;
      const before = ((wo as any[]) || []).filter(o => new Date(o.created_at).getTime() <= d);
      setOrders(before);
      const ids = Array.from(new Set(before.flatMap(o => [o.assigned_to, o.approved_by]).filter(Boolean)));
      if (ids.length) {
        const { data: ps } = await supabase.from("profiles").select("id, first_name, last_name").in("id", ids);
        const m: Record<string, string> = {};
        (ps || []).forEach((p: any) => { m[p.id] = [p.first_name, p.last_name].filter(Boolean).join(" ") || "Medewerker"; });
        if (alive) setNames(m);
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [vehicleId, deliveredAt]);

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

      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Wrench className="h-4 w-4" /> Werkorders vóór aflevering</h3>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen werkorders.</p>
        ) : (
          <ul className="space-y-2">
            {orders.map(o => (
              <li key={o.id} className="rounded-md border p-3 text-sm">
                <div className="font-medium">
                  {DISCIPLINE_LABELS[o.discipline as WorkOrderDiscipline] || o.discipline}
                  {getWorkOrderParts(o).length > 0 && <> · {getWorkOrderParts(o).join(", ")}</>}
                  <span className="text-muted-foreground font-normal"> · {o.status}</span>
                </div>
                {o.description && <div className="text-muted-foreground break-words">{o.description}</div>}
                <div className="text-xs text-muted-foreground mt-1">
                  Door: {o.assigned_to ? names[o.assigned_to] || "Medewerker" : "—"} · Afgerond: {fmt(o.finished_at)} · Goedgekeurd: {fmt(o.approved_at)}{o.approved_by ? ` (${names[o.approved_by] || "Medewerker"})` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
