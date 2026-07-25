import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentBranch, applyBranchFilter } from "@/contexts/BranchContext";
import BranchFilter from "@/components/reports/BranchFilter";
import { toast } from "@/hooks/use-toast";
import { syncWorkOrderToWerkplaatsCalendar, removeWorkOrderFromWerkplaatsCalendar } from "@/services/werkplaatsCalendarService";
import { Loader2, Flame, Shield, ArrowUp, ArrowDown, Plus, GripVertical, Wrench, PaintBucket, CheckCircle2, ClipboardCheck, Trash2, AlertTriangle, CalendarClock, Building2, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { format, isToday, isTomorrow, isPast, addDays, startOfDay, endOfDay } from "date-fns";
import { nl } from "date-fns/locale";
import { AsPage, AsCard, AsCardHead, AsPill, AsMono, AsLicensePlate, AsVehicleThumb, useLiveTimer } from "@/components/aftersales/ui";
import { cn } from "@/lib/utils";
import { DamageReportDialog, DamageReportPayload } from "@/components/aftersales/DamageReportDialog";
import { AddTaskBar } from "@/components/aftersales/AddTaskDialog";

type Discipline = "werkplaats" | "spuit";

interface WO {
  id: string;
  discipline: string;
  description: string;
  part: string | null;
  status: string;
  is_rush: boolean;
  sort_order: number;
  started_at: string | null;
  finished_at: string | null;
  approved_at: string | null;
  warranty_claim_id: string | null;
  source: string | null;
  branch: string | null;
  assigned_to: string | null;
  created_at: string;
  due_date: string | null;
  planned_at: string | null;
  origin: string | null;
  external_customer: any | null;
  vehicle: {
    id: string;
    brand: string;
    model: string;
    license_number: string | null;
    vin: string | null;
    showroom_photo_url: string | null;
    mileage: number | null;
    color: string | null;
    delivery_date: string | null;
    year: number | null;
  } | null;
}

interface Profile { id: string; first_name: string | null; last_name: string | null; }

const nameOf = (p?: Profile) => p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Onbekend" : "Niet toegewezen";
const initialsOf = (p?: Profile) => {
  if (!p) return "?";
  const a = (p.first_name || "").trim()[0] || "";
  const b = (p.last_name || "").trim()[0] || "";
  return (a + b).toUpperCase() || "?";
};

const rushReason = (w: WO): string | null => {
  const d = w.vehicle?.delivery_date;
  if (!d) return null;
  const dd = new Date(d);
  if (isToday(dd)) return `aflevering vandaag${w.vehicle?.license_number ? "" : ""}`;
  if (isTomorrow(dd)) return "aflevering morgen";
  return null;
};

/** Geplande order die binnen 1 dag valt (vandaag of morgen) → hoort in de actieve planning. */
const isNearPlanned = (w: WO): boolean => {
  if (!w.planned_at) return false;
  const d = new Date(w.planned_at);
  return d <= endOfDay(addDays(new Date(), 1));
};
/** Geplande order die verder dan 1 dag in de toekomst ligt → sectie "Gepland". */
const isFuturePlanned = (w: WO): boolean => !!w.planned_at && !isNearPlanned(w);

const plannedLabel = (iso: string): string => {
  const d = new Date(iso);
  const time = format(d, "HH:mm", { locale: nl });
  if (isToday(d)) return `vandaag · ${time}`;
  if (isTomorrow(d)) return `morgen · ${time}`;
  return `${format(d, "EEE d MMM", { locale: nl })} · ${time}`;
};

const ExternBadge: React.FC<{ w: WO }> = ({ w }) => {
  if (w.origin !== "extern") return null;
  const name = (w.external_customer as any)?.name;
  return <AsPill tone="blue"><Building2 className="h-3 w-3" />EXTERN{name ? ` · ${name}` : ""}</AsPill>;
};

const TaskCard: React.FC<{
  w: WO;
  index: number;
  onReorder: (id: string, dir: -1 | 1) => void;
  onToggleRush: (w: WO) => void;
  onDragStart: (id: string) => void;
  onDrop: (targetId: string) => void;
  onOpen: (w: WO) => void;
  onDelete?: (w: WO) => void;
}> = ({ w, index, onReorder, onToggleRush, onDragStart, onDrop, onOpen, onDelete }) => {
  const live = useLiveTimer(w.status === "bezig" ? w.started_at : null);
  const reason = rushReason(w);
  const v = w.vehicle;
  const specs = [v?.year, v?.mileage ? `${v.mileage.toLocaleString("nl-NL")} km` : null, v?.color].filter(Boolean).join(" · ");

  return (
    <div
      draggable
      onDragStart={() => onDragStart(w.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(w.id)}
      onClick={() => onOpen(w)}
      className={cn(
        "bg-white rounded-[12px] border border-slate-200 shadow-sm hover:shadow transition p-3 flex gap-3 items-start cursor-pointer",
        w.is_rush && "border-red-300 ring-1 ring-red-100"
      )}
    >
      <div className="flex flex-col items-center gap-1 shrink-0 w-8">
        <div className="text-[22px] font-semibold text-slate-300 leading-none tabular-nums">{index + 1}</div>
        <GripVertical className="h-3.5 w-3.5 text-slate-300 cursor-grab" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <AsLicensePlate value={v?.license_number} size="sm" />
          <span className="text-[13px] font-bold text-slate-900 truncate">{v?.brand} {v?.model}</span>
          {v?.year && <span className="text-[12px] text-slate-500">· {v.year}</span>}
        </div>
        <div className="text-[11px] text-slate-500 truncate mt-0.5">{specs}</div>
        {w.part && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 text-white text-[11.5px] font-semibold">
            {w.part}
          </div>
        )}
        <div className="mt-1.5 text-[12px] text-slate-700 line-clamp-2">{w.description}</div>
        <div className="mt-2 flex flex-wrap gap-1.5 items-center">
          {w.planned_at && (
            <AsPill tone={isToday(new Date(w.planned_at)) ? "red" : "amber"}>
              <CalendarClock className="h-3 w-3" />{plannedLabel(w.planned_at)}
            </AsPill>
          )}
          <ExternBadge w={w} />
          {w.is_rush && (
            <AsPill tone="red"><Flame className="h-3 w-3" />Spoed{reason ? ` · ${reason}` : ""}</AsPill>
          )}
          {w.due_date && (() => {
            const d = new Date(w.due_date);
            const overdue = isPast(d) && !isToday(d);
            const tone: any = overdue || isToday(d) ? "red" : isTomorrow(d) ? "amber" : "slate";
            return (
              <AsPill tone={tone}>
                Klaar vóór {format(d, "d MMM", { locale: nl })}
              </AsPill>
            );
          })()}
          {w.warranty_claim_id && (
            <>
              <AsPill tone="violet"><Shield className="h-3 w-3" />🛡️ GARANTIE</AsPill>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); window.location.href = "/warranty"; }}
                className="text-[11px] text-violet-600 underline underline-offset-2 hover:text-violet-800"
              >
                Bekijk claim
              </button>
            </>
          )}
          {w.status === "bezig" && live && <AsPill tone="violet">● bezig · {live}</AsPill>}
          {w.source && <AsPill tone="slate">{w.source}</AsPill>}
        </div>
        {(w.started_at || w.source) && (
          <div className="mt-1.5 text-[11px] text-slate-400">
            {w.started_at && `gestart ${format(new Date(w.started_at), "HH:mm", { locale: nl })}`}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => onReorder(w.id, -1)} title="Omhoog"><ArrowUp className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => onReorder(w.id, 1)} title="Omlaag"><ArrowDown className="h-3.5 w-3.5" /></Button>
        <Button
          size="icon"
          variant={w.is_rush ? "default" : "outline"}
          className={cn("h-7 w-7", w.is_rush && "bg-red-500 hover:bg-red-600")}
          onClick={() => onToggleRush(w)}
          title="Spoed"
        >
          <Flame className="h-3.5 w-3.5" />
        </Button>
        {onDelete && (
          <Button
            size="icon"
            variant="outline"
            className="h-7 w-7 text-slate-500 hover:text-red-600 hover:border-red-300"
            onClick={() => onDelete(w)}
            title="Taak verwijderen"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};

const EmployeeColumn: React.FC<{
  profile?: Profile;
  items: WO[];
  doneTodayCount: number;
  onReorder: (id: string, dir: -1 | 1) => void;
  onToggleRush: (w: WO) => void;
  onDragStart: (id: string) => void;
  onDrop: (targetId: string) => void;
  onOpen: (w: WO) => void;
  onDelete?: (w: WO) => void;
}> = ({ profile, items, doneTodayCount, onReorder, onToggleRush, onDragStart, onDrop, onOpen, onDelete }) => (
  <AsCard className="flex flex-col min-w-[320px]">
    <AsCardHead
      tone="slate"
      icon={
        <span className="text-[11px] font-bold">{initialsOf(profile)}</span>
      }
      title={nameOf(profile)}
      subtitle={`Vandaag ${doneTodayCount} afgerond · ${items.length} in planning`}
      count={items.length}
    />
    <div className="flex flex-col gap-2 p-3">
      {items.length === 0 && (
        <div className="text-[12px] text-slate-400 px-1 py-4 text-center border border-dashed border-slate-200 rounded-lg">
          Geen taken in planning
        </div>
      )}
      {items.map((w, i) => (
        <TaskCard
          key={w.id}
          w={w}
          index={i}
          onReorder={onReorder}
          onToggleRush={onToggleRush}
          onDragStart={onDragStart}
          onDrop={onDrop}
          onOpen={onOpen}
          onDelete={onDelete}
        />
      ))}
    </div>
  </AsCard>
);

const DoneTodayColumn: React.FC<{ items: WO[]; nameFor: (uid: string | null) => string }> = ({ items, nameFor }) => (
  <AsCard className="flex flex-col min-w-[280px]">
    <AsCardHead
      tone="green"
      icon={<CheckCircle2 className="h-4 w-4" />}
      title="Vandaag afgerond"
      subtitle="Wachtend op controle · goedgekeurd"
      count={items.length}
    />
    <div className="flex flex-col gap-2 p-3">
    {items.length === 0 ? (
      <div className="text-[12px] text-slate-400 px-1 py-4 text-center">Nog niets afgerond vandaag.</div>
    ) : (
      items.map((w) => {
        const approved = !!w.approved_at;
        return (
          <div key={w.id} className={cn("rounded-lg border border-slate-200 p-2.5 flex items-center gap-2.5 opacity-80", approved && "bg-emerald-50/40 border-emerald-100")}>
            <AsVehicleThumb src={w.vehicle?.showroom_photo_url} className="h-9 w-12" />
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-slate-800 truncate">{w.vehicle?.brand} {w.vehicle?.model}</div>
              <div className="text-[11px] text-slate-500 truncate">{nameFor(w.assigned_to)}</div>
            </div>
            {approved ? (
              <AsPill tone="green"><CheckCircle2 className="h-3 w-3" />goedgekeurd</AsPill>
            ) : (
              <AsPill tone="amber"><ClipboardCheck className="h-3 w-3" />wacht op controle</AsPill>
            )}
          </div>
        );
      })
    )}
    </div>
  </AsCard>
);

const WerkplaatsPlanning: React.FC = () => {
  const { branchFilter } = useCurrentBranch();
  const navigate = useNavigate();
  const { isAftersalesManager, isAdmin } = useRoleAccess() as any;
  const canDelete = (typeof isAftersalesManager === "function" && isAftersalesManager()) || (typeof isAdmin === "function" && isAdmin());
  const [discipline, setDiscipline] = useState<Discipline>("werkplaats");
  const [rows, setRows] = useState<WO[]>([]);
  const [doneToday, setDoneToday] = useState<WO[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [report, setReport] = useState<DamageReportPayload | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<WO | null>(null);
  const [reschedule, setReschedule] = useState<WO | null>(null);
  const [newPlanned, setNewPlanned] = useState<string>("");
  const openReport = (w: WO) => setReport({
    part: w.part, description: w.description, photos: (w as any).photos, discipline: w.discipline, status: w.status, vehicle: w.vehicle as any,
  });

  const load = async () => {
    setLoading(true);
    const select = "id, discipline, description, part, status, is_rush, sort_order, started_at, finished_at, approved_at, warranty_claim_id, source, branch, assigned_to, created_at, due_date, planned_at, origin, external_customer, photos, vehicle:vehicles!work_orders_vehicle_id_fkey(id, brand, model, license_number, vin, showroom_photo_url, year, mileage, color, delivery_date)";

    let q = supabase
      .from("work_orders")
      .select(select)
      .in("status", ["ingepland", "bezig"])
      .eq("discipline", discipline)
      .order("is_rush", { ascending: false })
      .order("sort_order", { ascending: true });
    q = applyBranchFilter(q as any, branchFilter);

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    let dq = supabase
      .from("work_orders")
      .select(select)
      .eq("discipline", discipline)
      .in("status", ["afgerond", "goedgekeurd"])
      .gte("finished_at", todayStart.toISOString())
      .order("finished_at", { ascending: false });
    dq = applyBranchFilter(dq as any, branchFilter);

    const [{ data, error }, { data: done }] = await Promise.all([q, dq]);
    if (error) toast({ title: "Fout bij laden", description: error.message, variant: "destructive" });
    const openRows = ((data as any) || []) as WO[];
    const doneRows = ((done as any) || []) as WO[];

    const ids = Array.from(new Set([...openRows, ...doneRows].map(r => r.assigned_to).filter(Boolean))) as string[];
    let pmap = new Map<string, Profile>();
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, first_name, last_name").in("id", ids);
      pmap = new Map(((ps as any[]) || []).map(p => [p.id, p as Profile]));
    }

    setRows(openRows);
    setDoneToday(doneRows);
    setProfiles(pmap);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, [branchFilter, discipline]);

  const groups = useMemo(() => {
    const m = new Map<string, WO[]>();
    for (const w of rows.filter(r => !isFuturePlanned(r))) {
      const key = w.assigned_to || "__unassigned__";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(w);
    }
    for (const [, items] of m) {
      items.sort((a, b) =>
        (Number(isNearPlanned(b)) - Number(isNearPlanned(a))) ||
        (Number(b.is_rush) - Number(a.is_rush)) ||
        (a.sort_order - b.sort_order));
    }
    return Array.from(m.entries()).sort((a, b) => {
      if (a[0] === "__unassigned__") return 1;
      if (b[0] === "__unassigned__") return -1;
      const na = nameOf(profiles.get(a[0])); const nb = nameOf(profiles.get(b[0]));
      return na.localeCompare(nb);
    });
  }, [rows, profiles]);

  const doneByUser = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of doneToday) {
      const k = d.assigned_to || "__unassigned__";
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [doneToday]);

  const reorder = async (id: string, dir: -1 | 1) => {
    const target = rows.find(r => r.id === id);
    if (!target) return;
    const groupKey = target.assigned_to || "__unassigned__";
    // sorted siblings same as UI: rush desc, sort_order asc
    const sibling = rows
      .filter(r => (r.assigned_to || "__unassigned__") === groupKey)
      .sort((a, b) => (Number(b.is_rush) - Number(a.is_rush)) || (a.sort_order - b.sort_order));
    const idx = sibling.findIndex(w => w.id === id);
    const swap = sibling[idx + dir];
    if (!swap) return;
    if (swap.is_rush !== target.is_rush) {
      toast({ title: "Kan niet verwisselen", description: "Spoed-taken staan altijd bovenaan.", variant: "destructive" });
      return;
    }
    const a = target.sort_order; const b = swap.sort_order;
    // optimistic
    setRows(prev => prev.map(r =>
      r.id === target.id ? { ...r, sort_order: b } :
      r.id === swap.id ? { ...r, sort_order: a } : r
    ));
    try {
      // gebruik tijdelijke waarde om unique-conflicten te vermijden
      const tmp = -Date.now();
      const { error: e1 } = await supabase.from("work_orders").update({ sort_order: tmp }).eq("id", target.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("work_orders").update({ sort_order: a }).eq("id", swap.id);
      if (e2) throw e2;
      const { error: e3 } = await supabase.from("work_orders").update({ sort_order: b }).eq("id", target.id);
      if (e3) throw e3;
    } catch (e: any) {
      toast({ title: "Fout bij volgorde opslaan", description: e.message, variant: "destructive" });
      load();
    }
  };

  const toggleRush = async (w: WO) => {
    await supabase.from("work_orders").update({ is_rush: !w.is_rush }).eq("id", w.id);
    load();
  };

  const onDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId) { setDragId(null); return; }
    const drag = rows.find(r => r.id === dragId);
    const target = rows.find(r => r.id === targetId);
    setDragId(null);
    if (!drag || !target) return;
    const newSort = target.sort_order - 1;
    const newAssigned = drag.assigned_to !== target.assigned_to ? target.assigned_to : drag.assigned_to;
    // optimistic
    setRows(prev => prev.map(r => r.id === drag.id ? { ...r, sort_order: newSort, assigned_to: newAssigned } : r));
    try {
      const patch: any = { sort_order: newSort };
      if (drag.assigned_to !== target.assigned_to) patch.assigned_to = target.assigned_to;
      const { error } = await supabase.from("work_orders").update(patch).eq("id", drag.id);
      if (error) throw error;
      load();
    } catch (e: any) {
      toast({ title: "Fout bij verplaatsen", description: e.message, variant: "destructive" });
      load();
    }
  };

  const doDelete = async (w: WO) => {
    // optimistic verwijder uit lijst
    setRows(prev => prev.filter(r => r.id !== w.id));
    setConfirmDelete(null);
    const { error } = await supabase.from("work_orders")
      .update({ status: "geannuleerd" })
      .eq("id", w.id);
    if (error) {
      toast({ title: "Verwijderen mislukt", description: error.message, variant: "destructive" });
      load();
      return;
    }
    removeWorkOrderFromWerkplaatsCalendar(w.id, (w as any).branch || "rotterdam");
    toast({ title: "Taak verwijderd", description: "Status → geannuleerd." });
  };

  const nameFor = (uid: string | null) => nameOf(uid ? profiles.get(uid) : undefined);

  /** Geplande orders (>1 dag) gegroepeerd per dag. */
  const plannedGroups = useMemo(() => {
    const future = rows.filter(isFuturePlanned)
      .sort((a, b) => new Date(a.planned_at!).getTime() - new Date(b.planned_at!).getTime());
    const m = new Map<string, WO[]>();
    for (const w of future) {
      const key = format(startOfDay(new Date(w.planned_at!)), "yyyy-MM-dd");
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(w);
    }
    return Array.from(m.entries());
  }, [rows]);

  const doReschedule = async () => {
    if (!reschedule || !newPlanned) return;
    const oldIso = reschedule.planned_at;
    const note = oldIso
      ? `\n[verzet van ${format(new Date(oldIso), "EEE d/M HH:mm", { locale: nl })} → ${format(new Date(newPlanned), "EEE d/M HH:mm", { locale: nl })}]`
      : "";
    const { error } = await supabase.from("work_orders").update({
      planned_at: new Date(newPlanned).toISOString(),
      description: `${reschedule.description || ""}${note}`,
    }).eq("id", reschedule.id);
    setReschedule(null); setNewPlanned("");
    if (error) {
      toast({ title: "Verzetten mislukt", description: error.message, variant: "destructive" });
      return;
    }
    syncWorkOrderToWerkplaatsCalendar(reschedule.id, (reschedule as any).branch || "rotterdam");
    toast({ title: "Afspraak verzet" });
    load();
  };

  return (
    <DashboardLayout>
      <AsPage>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Planning</h1>
            <p className="text-[13px] text-slate-500 mt-1">
              {format(new Date(), "EEEE d MMMM yyyy", { locale: nl })} · sleep taken tussen medewerkers om toe te wijzen
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex bg-white border border-slate-200 rounded-full p-1 shadow-sm">
              <button
                onClick={() => setDiscipline("werkplaats")}
                className={cn(
                  "flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full transition-colors",
                  discipline === "werkplaats" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Wrench className="h-3.5 w-3.5" /> Werkplaats
              </button>
              <button
                onClick={() => setDiscipline("spuit")}
                className={cn(
                  "flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full transition-colors",
                  discipline === "spuit" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                )}
              >
                <PaintBucket className="h-3.5 w-3.5" /> Schadeherstel
              </button>
            </div>
            <BranchFilter />
          </div>
        </div>

        {/* Taak toevoegen-balk */}
        <AddTaskBar onCreated={load} />

        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 py-16 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Planning laden…
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {groups.length === 0 && (
              <AsCard className="p-8 text-center text-[13px] text-slate-500 min-w-[320px]">
                Geen open taken voor {discipline === "werkplaats" ? "de werkplaats" : "schadeherstel"}.
              </AsCard>
            )}
            {groups.map(([uid, items]) => (
              <EmployeeColumn
                key={uid}
                profile={uid !== "__unassigned__" ? profiles.get(uid) : undefined}
                items={items}
                doneTodayCount={doneByUser.get(uid) || 0}
                onReorder={reorder}
                onToggleRush={toggleRush}
                onDragStart={setDragId}
                onDrop={onDrop}
                onOpen={openReport}
                onDelete={canDelete ? (w) => setConfirmDelete(w) : undefined}
              />
            ))}
            <DoneTodayColumn items={doneToday} nameFor={nameFor} />
          </div>
        )}

        {/* Gepland (>1 dag in de toekomst) */}
        {!loading && plannedGroups.length > 0 && (
          <AsCard className="mt-4 overflow-hidden">
            <AsCardHead
              tone="blue"
              icon={<CalendarClock className="h-4 w-4" />}
              title="Gepland"
              subtitle="Afspraken verder dan 1 dag vooruit — verschijnen automatisch 1 dag vóór de afspraak in de planning"
              count={plannedGroups.reduce((n, [, items]) => n + items.length, 0)}
            />
            <div className="p-3 space-y-4">
              {plannedGroups.map(([day, items]) => (
                <div key={day}>
                  <div className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    {isTomorrow(new Date(day)) ? "Morgen" : format(new Date(day), "EEE d MMM", { locale: nl })}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                    {items.map((w) => (
                      <div key={w.id} className="bg-white rounded-[12px] border border-slate-200 p-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <AsLicensePlate value={w.vehicle?.license_number} size="sm" />
                          <span className="text-[13px] font-bold text-slate-900 truncate">{w.vehicle?.brand} {w.vehicle?.model}</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                          <AsPill tone="slate"><CalendarClock className="h-3 w-3" />{format(new Date(w.planned_at!), "EEE d MMM · HH:mm", { locale: nl })}</AsPill>
                          <ExternBadge w={w} />
                          {w.warranty_claim_id && <AsPill tone="pink"><Shield className="h-3 w-3" />Garantie</AsPill>}
                          {w.is_rush && <AsPill tone="red"><Flame className="h-3 w-3" />Spoed</AsPill>}
                        </div>
                        <div className="mt-1.5 text-[12px] text-slate-700 line-clamp-3 whitespace-pre-line">{w.description}</div>
                        <div className="mt-2 flex items-center gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-[12px]"
                                  onClick={() => { setReschedule(w); setNewPlanned(w.planned_at ? format(new Date(w.planned_at), "yyyy-MM-dd'T'HH:mm") : ""); }}>
                            Verzetten
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-[12px] text-slate-500 hover:text-red-600"
                                  onClick={() => setConfirmDelete(w)}>
                            <X className="h-3.5 w-3.5 mr-1" />Annuleren
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </AsCard>
        )}

        <Dialog open={!!reschedule} onOpenChange={(v) => { if (!v) { setReschedule(null); setNewPlanned(""); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Afspraak verzetten</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="text-[13px] text-slate-600">
                {reschedule?.vehicle?.brand} {reschedule?.vehicle?.model}
                {reschedule?.planned_at && <> · nu {format(new Date(reschedule.planned_at), "EEE d MMM HH:mm", { locale: nl })}</>}
              </div>
              <div>
                <Label className="text-[12px] font-semibold text-slate-700">Nieuwe datum + tijd</Label>
                <Input className="mt-1.5" type="datetime-local" value={newPlanned} onChange={(e) => setNewPlanned(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setReschedule(null); setNewPlanned(""); }}>Annuleren</Button>
              <Button onClick={doReschedule} disabled={!newPlanned}>Verzetten</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <DamageReportDialog open={!!report} onOpenChange={(v) => !v && setReport(null)} report={report} />
        <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500" /> Taak verwijderen?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <span className="block">
                  {confirmDelete?.vehicle?.brand} {confirmDelete?.vehicle?.model}
                  {confirmDelete?.part ? ` · ${confirmDelete.part}` : ""}
                </span>
                {confirmDelete?.status === "bezig" && (
                  <span className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-[12.5px] text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    Let op: een medewerker is hiermee bezig. Weet je zeker dat je de opdracht wilt annuleren?
                  </span>
                )}
                <span className="block text-[12px] text-slate-500">
                  De taak wordt op status <b>geannuleerd</b> gezet en verdwijnt uit alle lijsten en tellers.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuleren</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => confirmDelete && doDelete(confirmDelete)}
              >
                Verwijderen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AsPage>
    </DashboardLayout>
  );
};

export default WerkplaatsPlanning;
