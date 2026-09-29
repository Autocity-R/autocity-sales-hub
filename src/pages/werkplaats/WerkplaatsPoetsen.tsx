import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentBranch, applyBranchFilter } from "@/contexts/BranchContext";
import BranchFilter from "@/components/reports/BranchFilter";
import { toast } from "@/hooks/use-toast";
import { Loader2, Truck, Home, CheckCircle2, Sparkles, Search, X, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, isToday, isPast, isTomorrow } from "date-fns";
import { nl } from "date-fns/locale";
import { AsPage, AsCard, AsCardHead, AsLicensePlate, AsMono, useLiveTimer } from "@/components/aftersales/ui";
import { TaskDetailSheet } from "@/components/werkplaats/TaskDetailSheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { Play, Timer, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { buildHaystack, matchesSearch } from "@/lib/searchNormalize";
import { useDeliveryMoments, DeliveryMoment } from "@/components/werkplaats/deliveryAppointment";
import { splitPoetsRows, poetsDeadline } from "@/components/werkplaats/poetsDeadline";
import { CalendarClock, Pause } from "lucide-react";
import { PauseTaskDialog } from "@/components/werkplaats/PauseTaskDialog";
import { pauseWorkOrder, resumeFields, totalWorkSeconds, poetserMayTogglePause } from "@/components/werkplaats/workOrderPause";

interface PoetsWO {
  id: string;
  description: string;
  status: string;
  poets_type: string | null;
  due_date: string | null;
  created_at: string;
  started_at: string | null;
  paused_seconds?: number | null;
  pause_reason?: string | null;
  assigned_to: string | null;
  origin?: string | null;
  vehicle: {
    id: string;
    brand: string;
    model: string;
    license_number: string | null;
    year: number | null;
    mileage: number | null;
    color: string | null;
    vin: string | null;
    status?: string | null;
  } | null;
}

const hay = (w: PoetsWO) =>
  buildHaystack([
    w.vehicle?.license_number, w.vehicle?.brand, w.vehicle?.model, w.vehicle?.vin,
    w.vehicle?.year, w.vehicle?.color, w.description, w.poets_type,
  ]);

const fmtSeconds = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const hh = Math.floor(s / 3600), mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0"), ss = String(s % 60).padStart(2, "0");
  return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
};

const deadlineTone = (due: string | null): "red" | "amber" | "slate" => {
  if (!due) return "slate";
  const d = new Date(due);
  if (isPast(d) && !isToday(d)) return "red";
  if (isToday(d)) return "red";
  if (isTomorrow(d)) return "amber";
  return "slate";
};

const PoetsCard: React.FC<{
  w: PoetsWO;
  onStart: (w: PoetsWO) => void;
  onDone: (w: PoetsWO) => void;
  onPause: (w: PoetsWO) => void;
  onResume: (w: PoetsWO) => void;
  onDelete?: (w: PoetsWO) => void;
  showDeadline: boolean;
  onOpen?: (w: PoetsWO) => void;
  workerName?: string | null;
  delivery?: DeliveryMoment | null;
}> = ({ w, onStart, onDone, onPause, onResume, onDelete, showDeadline, onOpen, workerName, delivery }) => {
  const { isDirectieReadOnly } = useRoleAccess();
  const readOnly = isDirectieReadOnly();
  const tone = deadlineTone(w.due_date);
  const deadline = poetsDeadline(w, delivery ?? undefined);
  const { user, userRole } = useAuth();
  const canToggle = userRole !== "poetser" || poetserMayTogglePause(userRole, w, user?.id);
  const canDelete = !!onDelete && !readOnly && ["owner", "admin", "manager", "aftersales_manager", "werkplaats_chef"].includes(userRole || "");
  const paused = w.status === "gepauzeerd";
  const liveFrom = w.status === "bezig" && w.started_at
    ? new Date(new Date(w.started_at).getTime() - Number(w.paused_seconds || 0) * 1000).toISOString() : null;
  const live = useLiveTimer(liveFrom);
  const timer = paused ? fmtSeconds(Number(w.paused_seconds || 0)) : live;
  const toneCls =
    tone === "red" ? "bg-red-50 text-red-700 border-red-200"
    : tone === "amber" ? "bg-amber-50 text-amber-800 border-amber-200"
    : "bg-slate-50 text-slate-600 border-slate-200";
  const specs = [
    w.vehicle?.year ? String(w.vehicle.year) : null,
    typeof w.vehicle?.mileage === "number" ? `${w.vehicle.mileage.toLocaleString("nl-NL")} km` : null,
    w.vehicle?.color || null,
  ].filter(Boolean) as string[];
  return (
    <div
      onClick={onOpen ? () => onOpen(w) : undefined}
      className={cn("bg-white rounded-[12px] border border-slate-200 shadow-sm p-4 flex flex-col gap-3", onOpen && "cursor-pointer")}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <AsLicensePlate value={w.vehicle?.license_number} size="sm" />
        <span className="text-[14px] font-bold text-slate-900 truncate">{w.vehicle?.brand} {w.vehicle?.model}</span>
        {canDelete && (
          <button
            type="button"
            aria-label="Poets-taak verwijderen"
            onClick={(e) => { e.stopPropagation(); onDelete!(w); }}
            className="ml-auto p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="-mt-1.5">
        <div className="text-[12.5px] text-slate-600">{specs.length ? specs.join(" · ") : "—"}</div>
        <AsMono className="block mt-0.5">{w.vehicle?.vin || "VIN onbekend"}</AsMono>
      </div>
      {delivery && (
        <div
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[13px] font-bold",
            delivery.isUrgent
              ? "bg-red-50 text-red-700 border-red-300"
              : "bg-amber-50 text-amber-800 border-amber-200",
          )}
        >
          <CalendarClock className="h-4 w-4 shrink-0" />
          <span>Aflevering: {delivery.label}</span>
        </div>
      )}
      {showDeadline && deadline && (
        <div className={cn(
          "inline-flex self-start items-center gap-1.5 px-2.5 py-1 rounded-md border text-[12.5px] font-semibold",
          deadline.urgent ? "bg-red-50 text-red-700 border-red-300" : toneCls,
        )}>
          Klaar vóór {deadline.label}
        </div>
      )}
      <div className="text-[13px] text-slate-700 whitespace-pre-wrap">{w.description || "—"}</div>
      {paused && w.pause_reason && (
        <div className="text-[12.5px] text-amber-800">Pauze: {w.pause_reason}</div>
      )}
      {w.status !== "ingepland" && (
        <div className="flex flex-wrap items-center gap-2">
          <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[13px] font-semibold tabular-nums",
            paused ? "border-amber-200 bg-amber-50 text-amber-800" : "border-violet-200 bg-violet-50 text-violet-700")}>
            {paused ? <Pause className="h-4 w-4" /> : <Timer className="h-4 w-4" />} {timer ?? "00:00"}{paused && " · Gepauzeerd"}
          </div>
          {workerName && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 text-slate-700 text-[13px] font-semibold">
              <UserIcon className="h-4 w-4" /> {workerName}
            </div>
          )}
        </div>
      )}
      <div onClick={(e) => e.stopPropagation()} className="contents">
      {readOnly ? null : w.status === "ingepland" ? (
        <Button
          onClick={() => onStart(w)}
          className="h-12 w-full bg-blue-600 hover:bg-blue-700 text-white text-[15px] font-semibold"
        >
          <Play className="h-5 w-5 mr-2" /> Gestart
        </Button>
      ) : (
        <div className={cn("grid gap-2", canToggle ? "grid-cols-2" : "grid-cols-1")}>
          {!canToggle ? null : paused ? (
            <Button onClick={() => onResume(w)}
              className="h-12 w-full bg-blue-600 hover:bg-blue-700 text-white text-[15px] font-semibold">
              <Play className="h-5 w-5 mr-2" /> Hervatten
            </Button>
          ) : (
            <Button onClick={() => onPause(w)} variant="outline"
              className="h-12 w-full border-amber-300 text-amber-800 hover:bg-amber-50 text-[15px] font-semibold">
              <Pause className="h-5 w-5 mr-2" /> Pauze
            </Button>
          )}
          <Button
            onClick={() => onDone(w)}
            className="h-12 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[15px] font-semibold"
          >
            <CheckCircle2 className="h-5 w-5 mr-2" /> Schoon
          </Button>
        </div>
      )}
      </div>
    </div>
  );
};

const WerkplaatsPoetsen: React.FC = () => {
  const { isDirectieReadOnly } = useRoleAccess();
  const readOnly = isDirectieReadOnly();
  const { branchFilter } = useCurrentBranch();
  const { user } = useAuth();
  const [names, setNames] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<PoetsWO[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PoetsWO | null>(null);
  const [q, setQ] = useState("");
  const [pauseTarget, setPauseTarget] = useState<PoetsWO | null>(null);
  const [pauseBusy, setPauseBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PoetsWO | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("work_orders")
      .select("id, description, status, poets_type, due_date, created_at, started_at, paused_seconds, pause_reason, assigned_to, origin, vehicle:vehicles!work_orders_vehicle_id_fkey(id, brand, model, license_number, year, mileage, color, vin, status)")
      .eq("discipline", "poets")
      .in("status", ["ingepland", "bezig", "gepauzeerd"]);
    q = applyBranchFilter(q as any, branchFilter);
    const { data, error } = await q;
    if (error) toast({ title: "Fout bij laden", description: error.message, variant: "destructive" });
    const list = ((data as any) || []) as PoetsWO[];
    setRows(list);
    const ids = Array.from(new Set(list.map(r => r.assigned_to).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, first_name, last_name").in("id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((pf: any) => {
        map[pf.id] = `${pf.first_name || ""} ${pf.last_name || ""}`.trim() || "Poetser";
      });
      setNames(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, [branchFilter]);

  // Aflevermoment uit appointments (alleen lezen) voor álle voertuigen in de lijst
  const vehicleIds = useMemo(
    () => rows.map(r => r.vehicle?.id).filter(Boolean) as string[],
    [rows],
  );
  const deliveryMoments = useDeliveryMoments(vehicleIds);

  const { afleveringen, showroom } = useMemo(() => {
    const filtered = q.trim() ? rows.filter(r => matchesSearch(hay(r), q)) : rows;
    const { afleveringen: afl, showroom: sh } = splitPoetsRows(filtered, deliveryMoments);
    return { afleveringen: afl, showroom: sh };
  }, [rows, q, deliveryMoments]);

  const markDone = async (w: PoetsWO) => {
    // zelfde regel als andere disciplines: eerder opgebouwde tijd + lopende sessie (pauzes tellen niet)
    const workSeconds = totalWorkSeconds(w) || null;
    setRows(prev => prev.filter(r => r.id !== w.id));
    const { error } = await supabase.from("work_orders")
      .update({
        status: "goedgekeurd",
        assigned_to: w.assigned_to || user?.id || null,
        finished_at: new Date().toISOString(),
        approved_at: new Date().toISOString(),
        work_seconds: workSeconds,
        paused_at: null,
      } as any)
      .eq("id", w.id);
    if (error) {
      toast({ title: "Kon niet opslaan", description: error.message, variant: "destructive" });
      load();
      return;
    }
    toast({ title: "✓ Schoon", description: `${w.vehicle?.brand ?? ""} ${w.vehicle?.model ?? ""}`.trim() });
  };

  const markStarted = async (w: PoetsWO) => {
    const startedAt = new Date().toISOString();
    const mine = user?.id || w.assigned_to || null;
    setRows(prev => prev.map(r => (r.id === w.id ? { ...r, status: "bezig", started_at: startedAt, assigned_to: mine } : r)));
    const { error } = await supabase.from("work_orders")
      .update({ status: "bezig", started_at: startedAt, assigned_to: mine })
      .eq("id", w.id);
    if (error) {
      toast({ title: "Kon niet starten", description: error.message, variant: "destructive" });
      load();
    }
  };

  const confirmPause = async (reason: string) => {
    const w = pauseTarget;
    if (!w) return;
    setPauseBusy(true);
    const mine = w.assigned_to || user?.id || null;
    const secs = totalWorkSeconds(w);
    setRows(prev => prev.map(r => (r.id === w.id ? { ...r, status: "gepauzeerd", started_at: null, paused_seconds: secs, pause_reason: reason.trim() || null } : r)));
    const { error } = await pauseWorkOrder({ ...w, assigned_to: mine } as any, reason);
    setPauseBusy(false);
    setPauseTarget(null);
    if (error) { toast({ title: "Kon niet pauzeren", description: error.message, variant: "destructive" }); load(); return; }
    toast({ title: "Gepauzeerd", description: "De gewerkte tijd is bewaard." });
  };

  const markResumed = async (w: PoetsWO) => {
    const fields = resumeFields();
    setRows(prev => prev.map(r => (r.id === w.id ? { ...r, status: "bezig", started_at: fields.started_at } : r)));
    const { error } = await supabase.from("work_orders").update(fields).eq("id", w.id);
    if (error) { toast({ title: "Kon niet hervatten", description: error.message, variant: "destructive" }); load(); }
  };

  const confirmDelete = async () => {
    const w = deleteTarget;
    if (!w) return;
    setDeleteBusy(true);
    const { error } = await supabase.from("work_orders").delete().eq("id", w.id);
    setDeleteBusy(false);
    setDeleteTarget(null);
    if (error) {
      toast({ title: "Kon niet verwijderen", description: error.message, variant: "destructive" });
      return;
    }
    setRows(prev => prev.filter(r => r.id !== w.id));
    toast({ title: "Poets-taak verwijderd", description: `${w.vehicle?.brand ?? ""} ${w.vehicle?.model ?? ""}`.trim() });
  };

  return (
    <DashboardLayout>
      <AsPage>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Poetsen</h1>
            <p className="text-[13px] text-slate-500 mt-1">Tik op ✓ Schoon zodra de auto klaar is</p>
          </div>
          <BranchFilter />
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Zoek op kenteken, merk, model, VIN, kleur of omschrijving…"
            className="pl-9 pr-9 h-11"
          />
          {q && (
            <button
              type="button"
              aria-label="Zoekopdracht wissen"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600"
              onClick={() => setQ("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 py-16 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Laden…
          </div>
        ) : rows.length === 0 ? (
          <AsCard className="p-12 text-center">
            <Sparkles className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
            <div className="text-[16px] font-semibold text-slate-800">Alles schoon 💪</div>
            <div className="text-[13px] text-slate-500 mt-1">Geen open poets-taken.</div>
          </AsCard>
        ) : afleveringen.length === 0 && showroom.length === 0 ? (
          <AsCard className="p-12 text-center text-slate-400 text-[13px]">
            <Search className="h-5 w-5 mx-auto mb-2 text-slate-300" />
            Geen poets-taken gevonden voor deze zoekopdracht.
          </AsCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AsCard className="flex flex-col">
              <AsCardHead
                tone="blue"
                icon={<Truck className="h-4 w-4" />}
                title="Afleveringen"
                subtitle="Op deadline"
                count={afleveringen.length}
              />
              <div className="flex flex-col gap-3 p-3">
                {afleveringen.length === 0 ? (
                  <div className="text-[12.5px] text-slate-400 px-1 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                    Geen afleveringen.
                  </div>
                ) : afleveringen.map(w => (
                  <PoetsCard key={w.id} w={w} onStart={markStarted} onDone={markDone} onPause={setPauseTarget} onResume={markResumed} showDeadline onOpen={setDetail} workerName={w.assigned_to ? names[w.assigned_to] : null} delivery={w.vehicle?.id ? deliveryMoments[w.vehicle.id] : null} />
                ))}
              </div>
            </AsCard>

            <AsCard className="flex flex-col">
              <AsCardHead
                tone="slate"
                icon={<Home className="h-4 w-4" />}
                title="Showroom"
                subtitle="Op ouderdom"
                count={showroom.length}
              />
              <div className="flex flex-col gap-3 p-3">
                {showroom.length === 0 ? (
                  <div className="text-[12.5px] text-slate-400 px-1 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                    Geen showroom-taken.
                  </div>
                ) : showroom.map(w => (
                  <PoetsCard key={w.id} w={w} onStart={markStarted} onDone={markDone} onPause={setPauseTarget} onResume={markResumed} showDeadline={false} onOpen={setDetail} workerName={w.assigned_to ? names[w.assigned_to] : null} delivery={w.vehicle?.id ? deliveryMoments[w.vehicle.id] : null} />
                ))}
              </div>
            </AsCard>
          </div>
        )}

        <PauseTaskDialog open={!!pauseTarget} onOpenChange={(v) => !v && setPauseTarget(null)} onConfirm={confirmPause} busy={pauseBusy} />

        <TaskDetailSheet
          open={!!detail}
          onOpenChange={(v) => !v && setDetail(null)}
          workOrder={detail as any}
          actions={detail && !readOnly ? (
            detail.status === "ingepland" ? (
              <Button onClick={() => { markStarted(detail); setDetail(null); }}
                className="h-12 w-full bg-blue-600 hover:bg-blue-700 text-white text-[15px] font-semibold">
                <Play className="h-5 w-5 mr-2" /> Gestart
              </Button>
            ) : detail.status === "gepauzeerd" ? (
              <Button onClick={() => { markResumed(detail); setDetail(null); }}
                className="h-12 w-full bg-blue-600 hover:bg-blue-700 text-white text-[15px] font-semibold">
                <Play className="h-5 w-5 mr-2" /> Hervatten
              </Button>
            ) : (
              <Button onClick={() => { markDone(detail); setDetail(null); }}
                className="h-12 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[15px] font-semibold">
                <CheckCircle2 className="h-5 w-5 mr-2" /> Schoon
              </Button>
            )
          ) : null}
        />
      </AsPage>
    </DashboardLayout>
  );
};

export default WerkplaatsPoetsen;