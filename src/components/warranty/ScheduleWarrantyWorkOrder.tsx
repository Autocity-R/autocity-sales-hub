import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Wrench, CalendarClock, Loader2, CarFront, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { AsLicensePlate } from "@/components/aftersales/ui";
import { syncWorkOrderToWerkplaatsCalendar } from "@/services/werkplaatsCalendarService";

interface ClaimRow {
  id: string;
  description: string | null;
  vehicle_id: string | null;
  branch: string | null;
  loan_car_id: string | null;
  manual_license_number: string | null;
  manual_vehicle_brand: string | null;
  manual_vehicle_model: string | null;
  manual_customer_name: string | null;
  vehicles?: { id: string; brand: string | null; model: string | null; license_number: string | null; year: number | null; branch: string | null } | null;
}

export interface LinkedWorkOrder {
  id: string;
  planned_at: string | null;
  status: string;
  description: string | null;
  assigned_to: string | null;
  is_rush: boolean;
  branch: string | null;
}

/** Haal de gekoppelde (niet-geannuleerde) werkplaats-order van een claim op. */
export async function fetchLinkedWorkOrder(claimId: string): Promise<LinkedWorkOrder | null> {
  const { data } = await supabase
    .from("work_orders")
    .select("id, planned_at, status, description, assigned_to, is_rush, branch")
    .eq("warranty_claim_id", claimId)
    .neq("status", "geannuleerd")
    .order("created_at", { ascending: false })
    .limit(1);
  return ((data as any[]) || [])[0] ?? null;
}

const toLocalInput = (iso: string | null) =>
  iso ? format(new Date(iso), "yyyy-MM-dd'T'HH:mm") : "";

/* ───────────────────────── Modal ───────────────────────── */

export const ScheduleWarrantyDialog: React.FC<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  claimId: string;
  existing?: LinkedWorkOrder | null;
  onSaved?: () => void;
}> = ({ open, onOpenChange, claimId, existing = null, onSaved }) => {
  const [claim, setClaim] = useState<ClaimRow | null>(null);
  const [loanCar, setLoanCar] = useState<string | null>(null);
  const [mechanics, setMechanics] = useState<{ id: string; name: string }[]>([]);
  const [description, setDescription] = useState("");
  const [plannedAt, setPlannedAt] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [isRush, setIsRush] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const { data: c } = await supabase
        .from("warranty_claims")
        .select("id, description, vehicle_id, branch, loan_car_id, manual_license_number, manual_vehicle_brand, manual_vehicle_model, manual_customer_name, vehicles:vehicle_id(id, brand, model, license_number, year, branch)")
        .eq("id", claimId)
        .maybeSingle();
      const row = (c as any as ClaimRow) || null;
      setClaim(row);
      setDescription(existing?.description ?? row?.description ?? "");
      setPlannedAt(toLocalInput(existing?.planned_at ?? null));
      setAssignedTo(existing?.assigned_to ?? "");
      setIsRush(!!existing?.is_rush);

      if (row?.loan_car_id) {
        const { data: lc } = await supabase
          .from("loan_cars")
          .select("id, vehicles:vehicle_id(brand, model, license_number)")
          .eq("id", row.loan_car_id)
          .maybeSingle();
        const v = (lc as any)?.vehicles;
        setLoanCar(v ? [v.brand, v.model, v.license_number].filter(Boolean).join(" · ") : "Leenauto toegewezen");
      } else {
        setLoanCar(null);
      }

      const { data: ur } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["monteur", "werkplaats_chef"] as any);
      const ids = Array.from(new Set(((ur as any[]) || []).map(r => r.user_id)));
      if (ids.length) {
        const { data: ps } = await supabase.from("profiles").select("id, first_name, last_name").in("id", ids);
        setMechanics(((ps as any[]) || []).map(p => ({
          id: p.id,
          name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Onbekend",
        })).sort((a, b) => a.name.localeCompare(b.name)));
      } else setMechanics([]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, claimId, existing?.id]);

  const plate = claim?.vehicles?.license_number || claim?.manual_license_number || null;
  const brandModel = [
    claim?.vehicles?.brand || claim?.manual_vehicle_brand,
    claim?.vehicles?.model || claim?.manual_vehicle_model,
  ].filter(Boolean).join(" ");
  const branch = claim?.branch || claim?.vehicles?.branch || "rotterdam";

  const submit = async () => {
    if (!plannedAt) { toast({ title: "Datum & tijd verplicht", variant: "destructive" }); return; }
    if (!description.trim()) { toast({ title: "Werkzaamheden verplicht", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      let workOrderId = existing?.id ?? null;

      if (workOrderId) {
        const { error } = await supabase.from("work_orders").update({
          description: description.trim(),
          planned_at: new Date(plannedAt).toISOString(),
          assigned_to: assignedTo || null,
          is_rush: isRush,
        } as any).eq("id", workOrderId);
        if (error) throw error;
      } else {
        const { data: bounds } = await supabase.from("work_orders")
          .select("sort_order").eq("discipline", "werkplaats")
          .in("status", ["ingepland", "bezig"])
          .order("sort_order", { ascending: isRush ? true : false }).limit(1);
        const base = ((bounds as any)?.[0]?.sort_order ?? 0);
        const nextSort = isRush ? base - 10 : base + 10;

        const { data: created, error } = await supabase.from("work_orders").insert({
          vehicle_id: claim?.vehicle_id || null,
          discipline: "werkplaats",
          description: description.trim(),
          status: "ingepland",
          sort_order: nextSort,
          source: "garantie",
          origin: "intern",
          warranty_claim_id: claimId,
          planned_at: new Date(plannedAt).toISOString(),
          assigned_to: assignedTo || null,
          is_rush: isRush,
          branch,
          created_by: userRes.user?.id ?? null,
        } as any).select("id").single();
        if (error) throw error;
        workOrderId = (created as any).id;
      }

      if (workOrderId) syncWorkOrderToWerkplaatsCalendar(workOrderId, branch);
      toast({ title: existing ? "Afspraak verzet" : "Garantieclaim ingepland" });
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Opslaan mislukt", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <span className="h-7 w-7 rounded-lg bg-violet-50 text-violet-600 ring-1 ring-violet-100 flex items-center justify-center">
              <Wrench className="h-4 w-4" />
            </span>
            {existing ? "Garantieclaim verzetten" : "Garantieclaim inplannen"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Laden…
          </div>
        ) : (
          <div className="space-y-4">
            {/* Voertuigblok (read-only) */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 flex-wrap">
                {plate ? <AsLicensePlate value={plate} size="sm" /> : <span className="text-[12px] text-slate-400 italic">Geen kenteken</span>}
                <span className="text-[13px] font-bold text-slate-900">{brandModel || "Onbekend voertuig"}</span>
                {claim?.vehicles?.year && <span className="text-[12px] text-slate-500">· {claim.vehicles.year}</span>}
              </div>
              {claim?.manual_customer_name && (
                <div className="text-[12px] text-slate-600 mt-1">Klant: {claim.manual_customer_name}</div>
              )}
              {loanCar && (
                <div className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-violet-700 bg-violet-50 border border-violet-100 rounded-md px-2 py-1">
                  <CarFront className="h-3.5 w-3.5" /> Leenauto: {loanCar}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs">Werkzaamheden</Label>
              <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Wat moet er gebeuren?" className="mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Datum & tijd *</Label>
                <Input type="datetime-local" className="mt-1" value={plannedAt} onChange={(e) => setPlannedAt(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Monteur</Label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Niet toegewezen (iedereen ziet het)</option>
                  {mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            <label className={cn("flex items-center gap-2 cursor-pointer rounded-md border p-2.5",
              isRush ? "border-red-300 bg-red-50" : "border-slate-200")}>
              <Checkbox checked={isRush} onCheckedChange={(v) => setIsRush(Boolean(v))} />
              <span className="text-sm font-medium inline-flex items-center gap-1.5">
                <Flame className={cn("h-4 w-4", isRush ? "text-red-500" : "text-slate-400")} /> Spoed
              </span>
            </label>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuleren</Button>
          <Button onClick={submit} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {existing ? "Opslaan & verzetten" : "Inplannen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ─────────────── Knop / chip voor claimkaarten ─────────────── */

export const WarrantyScheduleAction: React.FC<{
  claimId: string;
  className?: string;
  size?: "sm" | "default";
}> = ({ claimId, className, size = "sm" }) => {
  const navigate = useNavigate();
  const { hasWerkplaatsAccess } = useRoleAccess();
  const [wo, setWo] = useState<LinkedWorkOrder | null>(null);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refresh = async () => {
    setWo(await fetchLinkedWorkOrder(claimId));
    setLoaded(true);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [claimId]);

  if (!hasWerkplaatsAccess()) return null;
  if (!loaded) return null;

  return (
    <>
      {wo ? (
        <div className={cn("inline-flex items-center gap-1.5", className)} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => navigate("/werkplaats/planning")}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100"
            title="Bekijk in planning"
          >
            <CalendarClock className="h-3 w-3" />
            Ingepland{wo.planned_at ? ` — ${format(new Date(wo.planned_at), "d MMM HH:mm", { locale: nl })}` : ""}
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-[11px] text-slate-500 underline underline-offset-2 hover:text-slate-800"
          >
            Verzetten
          </button>
        </div>
      ) : (
        <Button
          size={size}
          variant="outline"
          className={cn("gap-1.5", className)}
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        >
          🔧 Inplannen
        </Button>
      )}
      <ScheduleWarrantyDialog
        open={open}
        onOpenChange={setOpen}
        claimId={claimId}
        existing={wo}
        onSaved={refresh}
      />
    </>
  );
};
