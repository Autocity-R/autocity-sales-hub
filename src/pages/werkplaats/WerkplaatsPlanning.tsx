import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentBranch, applyBranchFilter } from "@/contexts/BranchContext";
import BranchFilter from "@/components/reports/BranchFilter";
import { toast } from "@/hooks/use-toast";
import { Loader2, Flame, Shield, ArrowUp, ArrowDown, Plus, GripVertical, Wrench, PaintBucket, CheckCircle2, ClipboardCheck } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { nl } from "date-fns/locale";
import { AsPage, AsCard, AsPill, AsVehicleThumb, AsMono, useLiveTimer } from "@/components/aftersales/ui";
import { cn } from "@/lib/utils";

type Discipline = "werkplaats" | "spuit";

interface WO {
  id: string;
  discipline: string;
  description: string;
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

const TaskCard: React.FC<{
  w: WO;
  index: number;
  onReorder: (id: string, dir: -1 | 1) => void;
  onToggleRush: (w: WO) => void;
  onDragStart: (id: string) => void;
  onDrop: (targetId: string) => void;
}> = ({ w, index, onReorder, onToggleRush, onDragStart, onDrop }) => {
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
      className={cn(
        "bg-white rounded-[12px] border border-slate-200 shadow-sm hover:shadow transition p-3 flex gap-3 items-start",
        w.is_rush && "border-red-300 ring-1 ring-red-100"
      )}
    >
      <div className="flex flex-col items-center gap-1 shrink-0 w-8">
        <div className="text-[22px] font-semibold text-slate-300 leading-none tabular-nums">{index + 1}</div>
        <GripVertical className="h-3.5 w-3.5 text-slate-300 cursor-grab" />
      </div>
      <AsVehicleThumb src={v?.showroom_photo_url} className="h-12 w-16" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-slate-900 truncate">
          {v?.brand} {v?.model}
        </div>
        <div className="text-[12px] text-slate-500 truncate flex items-center gap-2">
          {specs}
          {v?.license_number && <AsMono className="text-slate-700">{v.license_number}</AsMono>}
        </div>
        {v?.vin && <div className="mt-0.5"><AsMono>{v.vin}</AsMono></div>}
        <div className="mt-1.5 text-[12px] text-slate-700 line-clamp-2">{w.description}</div>
        <div className="mt-2 flex flex-wrap gap-1.5 items-center">
          {w.is_rush && (
            <AsPill tone="red"><Flame className="h-3 w-3" />Spoed{reason ? ` · ${reason}` : ""}</AsPill>
          )}
          {w.warranty_claim_id && (
            <AsPill tone="pink"><Shield className="h-3 w-3" />Garantie</AsPill>
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
      <div className="flex flex-col gap-1 shrink-0">
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
}> = ({ profile, items, doneTodayCount, onReorder, onToggleRush, onDragStart, onDrop }) => (
  <AsCard className="p-3 flex flex-col gap-3 min-w-[320px]">
    <div className="flex items-center gap-3 px-1">
      <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-600 font-semibold text-[13px] flex items-center justify-center">
        {initialsOf(profile)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-slate-900 truncate">{nameOf(profile)}</div>
        <div className="text-[11px] text-slate-500">Vandaag {doneTodayCount} afgerond · {items.length} in planning</div>
      </div>
    </div>
    <div className="flex flex-col gap-2">
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
        />
      ))}
    </div>
  </AsCard>
);

const DoneTodayColumn: React.FC<{ items: WO[]; nameFor: (uid: string | null) => string }> = ({ items, nameFor }) => (
  <AsCard className="p-3 flex flex-col gap-2 min-w-[280px]">
    <div className="flex items-center gap-2 px-1 py-1">
      <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-4 w-4" /></div>
      <div className="text-[13px] font-semibold text-slate-900">Vandaag afgerond</div>
      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 tabular-nums ml-auto">{items.length}</span>
    </div>
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
  </AsCard>
);

const WerkplaatsPlanning: React.FC = () => {
  const { branchFilter } = useCurrentBranch();
  const navigate = useNavigate();
  const [discipline, setDiscipline] = useState<Discipline>("werkplaats");
  const [rows, setRows] = useState<WO[]>([]);
  const [doneToday, setDoneToday] = useState<WO[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const select = "id, discipline, description, status, is_rush, sort_order, started_at, finished_at, approved_at, warranty_claim_id, source, branch, assigned_to, created_at, vehicle:vehicles!work_orders_vehicle_id_fkey(id, brand, model, license_number, vin, showroom_photo_url, year, mileage, color, delivery_date)";

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
    for (const w of rows) {
      const key = w.assigned_to || "__unassigned__";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(w);
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
    const list = rows.find(r => r.id === id)?.assigned_to || "__unassigned__";
    const sibling = rows.filter(r => (r.assigned_to || "__unassigned__") === list);
    const idx = sibling.findIndex(w => w.id === id);
    const swap = sibling[idx + dir];
    if (!swap) return;
    const a = sibling[idx].sort_order; const b = swap.sort_order;
    await supabase.from("work_orders").update({ sort_order: b }).eq("id", sibling[idx].id);
    await supabase.from("work_orders").update({ sort_order: a }).eq("id", swap.id);
    load();
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
    const updates: any[] = [
      supabase.from("work_orders").update({ sort_order: target.sort_order - 1 }).eq("id", drag.id),
    ];
    if (drag.assigned_to !== target.assigned_to) {
      updates.push(supabase.from("work_orders").update({ assigned_to: target.assigned_to }).eq("id", drag.id));
    }
    await Promise.all(updates);
    load();
  };

  const nameFor = (uid: string | null) => nameOf(uid ? profiles.get(uid) : undefined);

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
            <Button size="sm" className="rounded-full h-9 px-3.5" onClick={() => navigate("/werkplaats/autos")}>
              <Plus className="h-4 w-4 mr-1" /> Taak toevoegen
            </Button>
          </div>
        </div>

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
              />
            ))}
            <DoneTodayColumn items={doneToday} nameFor={nameFor} />
          </div>
        )}
      </AsPage>
    </DashboardLayout>
  );
};

export default WerkplaatsPlanning;
