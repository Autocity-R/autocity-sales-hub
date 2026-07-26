import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentBranch, applyBranchFilter, BRANCH_LABELS, type BranchFilter } from "@/contexts/BranchContext";
import BranchFilter_UI from "@/components/reports/BranchFilter";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CalendarClock, Wrench, Users, Loader2, Phone, Activity, Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AsPage, AsCard, AsPill, AsCardHead, AsMono, useLiveTimer } from "@/components/aftersales/ui";

/* ============ types ============ */

interface ExternLine {
  id: string;
  when: "vandaag" | "morgen";
  time: string;
  customer: string;
  phone: string | null;
  license: string | null;
  vehicle: string;
  description: string;
  assignee: string | null;
}

interface OpenLine {
  id: string;
  license: string | null;
  vehicle: string;
  description: string;
  status: string;
  rush: boolean;
  warranty: boolean;
  extern: boolean;
  assignee: string | null;
  plannedAt: string | null;
}

interface MonteurCard {
  id: string;
  name: string;
  busy: { license: string | null; startedAt: string | null; description: string } | null;
  doneToday: number;
  secondsToday: number;
  openAssigned: number;
}

interface MonteurTask {
  id: string;
  license: string | null;
  vehicle: string;
  description: string;
  status: string;
  plannedAt: string | null;
}

interface ChefData {
  extern: ExternLine[];
  open: OpenLine[];
  counts: { pot: number; ingepland: number; bezig: number; goedkeuren: number };
  monteurs: MonteurCard[];
}

const OPEN_STATUSES = ["aangevraagd", "ingepland", "bezig"];
const vLabel = (v: any) => (v ? `${v.brand || ""} ${v.model || ""}`.trim() : "Onbekend voertuig");
const fmtDuration = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}u ${String(m).padStart(2, "0")}m` : `${m}m`;
};

async function loadChef(branch: BranchFilter): Promise<ChefData> {
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const endTomorrow = new Date(); endTomorrow.setDate(endTomorrow.getDate() + 1); endTomorrow.setHours(23, 59, 59, 999);
  const todayIso = format(startToday, "yyyy-MM-dd");

  const sel =
    "id, discipline, status, description, is_rush, planned_at, started_at, finished_at, work_seconds, assigned_to, origin, external_customer, warranty_claim_id, vehicle:vehicles!work_orders_vehicle_id_fkey(brand, model, license_number)";

  const base = () => applyBranchFilter(supabase.from("work_orders").select(sel), branch);

  const [externRes, openRes, approvalRes, doneRes, rolesRes] = await Promise.all([
    base()
      .eq("origin", "extern")
      .in("status", ["aangevraagd", "ingepland", "bezig"])
      .gte("planned_at", startToday.toISOString())
      .lte("planned_at", endTomorrow.toISOString())
      .order("planned_at", { ascending: true }),
    base()
      .eq("discipline", "werkplaats")
      .in("status", OPEN_STATUSES)
      .order("is_rush", { ascending: false })
      .order("planned_at", { ascending: true })
      .limit(100),
    base().eq("discipline", "werkplaats").eq("status", "afgerond").limit(100),
    base()
      .eq("discipline", "werkplaats")
      .in("status", ["afgerond", "goedgekeurd"])
      .gte("finished_at", startToday.toISOString())
      .limit(200),
    supabase.from("user_roles").select("user_id, role").in("role", ["monteur", "werkplaats_chef"] as any),
  ]);

  const externRows = (externRes.data as any[]) || [];
  const openRows = (openRes.data as any[]) || [];
  const approvals = (approvalRes.data as any[]) || [];
  const doneRows = (doneRes.data as any[]) || [];
  const monteurIds = Array.from(new Set(((rolesRes.data as any[]) || []).map((r) => r.user_id)));

  const allIds = Array.from(new Set([
    ...monteurIds,
    ...externRows.map((w) => w.assigned_to),
    ...openRows.map((w) => w.assigned_to),
  ].filter(Boolean))) as string[];

  const nameMap = new Map<string, string>();
  if (allIds.length) {
    const { data: ps } = await supabase.from("profiles").select("id, first_name, last_name").in("id", allIds);
    for (const p of ((ps as any[]) || [])) {
      nameMap.set(p.id, `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Onbekend");
    }
  }

  const extern: ExternLine[] = externRows.map((w) => {
    const c = (w.external_customer || {}) as any;
    const d = new Date(w.planned_at);
    return {
      id: w.id,
      when: format(d, "yyyy-MM-dd") === todayIso ? "vandaag" : "morgen",
      time: format(d, "HH:mm"),
      customer: c.name || "Klant",
      phone: c.phone || null,
      license: w.vehicle?.license_number || null,
      vehicle: vLabel(w.vehicle),
      description: w.description || "—",
      assignee: w.assigned_to ? nameMap.get(w.assigned_to) || null : null,
    };
  });

  const open: OpenLine[] = openRows.map((w) => ({
    id: w.id,
    license: w.vehicle?.license_number || null,
    vehicle: vLabel(w.vehicle),
    description: w.description || "—",
    status: w.status,
    rush: !!w.is_rush,
    warranty: !!w.warranty_claim_id,
    extern: w.origin === "extern",
    assignee: w.assigned_to ? nameMap.get(w.assigned_to) || null : null,
    plannedAt: w.planned_at || null,
  }));

  const counts = {
    pot: openRows.filter((w) => !w.assigned_to && w.status !== "bezig").length,
    ingepland: openRows.filter((w) => w.assigned_to && w.status !== "bezig").length,
    bezig: openRows.filter((w) => w.status === "bezig").length,
    goedkeuren: approvals.length,
  };

  const monteurs: MonteurCard[] = monteurIds.map((id) => {
    const busyRow = openRows.find((w) => w.assigned_to === id && w.status === "bezig");
    const doneList = doneRows.filter((w) => w.assigned_to === id);
    return {
      id,
      name: nameMap.get(id) || "Onbekend",
      busy: busyRow
        ? { license: busyRow.vehicle?.license_number || null, startedAt: busyRow.started_at || null, description: busyRow.description || "—" }
        : null,
      doneToday: doneList.length,
      secondsToday: doneList.reduce((s, w) => s + (w.work_seconds || 0), 0),
      openAssigned: openRows.filter((w) => w.assigned_to === id && w.status !== "bezig").length,
    };
  }).sort((a, b) => (b.busy ? 1 : 0) - (a.busy ? 1 : 0) || a.name.localeCompare(b.name));

  return { extern, open, counts, monteurs };
}

/* ============ small pieces ============ */

const BusyTimer: React.FC<{ started?: string | null }> = ({ started }) => {
  const t = useLiveTimer(started);
  if (!t) return null;
  return <AsPill tone="violet"><Activity className="h-3 w-3" />{t}</AsPill>;
};

const Plate: React.FC<{ value?: string | null }> = ({ value }) =>
  value ? (
    <span className="inline-flex items-center rounded-[4px] border border-amber-300 bg-amber-300 px-1.5 py-0.5 text-[11px] font-bold tracking-wider text-slate-900">
      {value}
    </span>
  ) : null;

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="px-4 py-6 text-center text-[12px] text-slate-400">{text}</div>
);

const Counter: React.FC<{ label: string; value: number; tone: string }> = ({ label, value, tone }) => (
  <div className={cn("rounded-xl border px-4 py-3", tone)}>
    <div className="text-[20px] font-extrabold tabular-nums leading-none">{value}</div>
    <div className="text-[11px] uppercase tracking-wide mt-1 opacity-80">{label}</div>
  </div>
);

/* ============ page ============ */

const ChefDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { branchFilter } = useCurrentBranch();
  const [data, setData] = useState<ChefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetFor, setSheetFor] = useState<MonteurCard | null>(null);
  const [sheetTasks, setSheetTasks] = useState<MonteurTask[] | null>(null);

  const refresh = useCallback(() => {
    loadChef(branchFilter)
      .then(setData)
      .finally(() => setLoading(false));
  }, [branchFilter]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  useEffect(() => {
    const channel = supabase
      .channel("chef-dashboard-work-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "work_orders" }, () => refresh())
      .subscribe();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const openMonteur = async (m: MonteurCard) => {
    setSheetFor(m);
    setSheetTasks(null);
    const { data: rows } = await applyBranchFilter(
      supabase
        .from("work_orders")
        .select("id, description, status, planned_at, vehicle:vehicles!work_orders_vehicle_id_fkey(brand, model, license_number)")
        .eq("assigned_to", m.id)
        .in("status", [...OPEN_STATUSES, "afgerond"])
        .order("planned_at", { ascending: true }),
      branchFilter,
    );
    setSheetTasks(((rows as any[]) || []).map((w) => ({
      id: w.id,
      license: w.vehicle?.license_number || null,
      vehicle: vLabel(w.vehicle),
      description: w.description || "—",
      status: w.status,
      plannedAt: w.planned_at || null,
    })));
  };

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Goedemorgen" : h < 18 ? "Goedemiddag" : "Goedenavond";
  }, []);
  const displayName =
    (user?.user_metadata as any)?.first_name || (user?.email || "").split("@")[0] || "chef";
  const branchLabel =
    branchFilter === "all" ? "Alle vestigingen" : BRANCH_LABELS[branchFilter as keyof typeof BRANCH_LABELS];

  const vandaag = data?.extern.filter((e) => e.when === "vandaag") || [];
  const morgen = data?.extern.filter((e) => e.when === "morgen") || [];

  const renderExtern = (list: ExternLine[], title: string) => (
    <div className="flex-1 min-w-0">
      <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-100">
        {title} <span className="tabular-nums">({list.length})</span>
      </div>
      {list.length === 0 ? (
        <Empty text="Geen externe afspraken." />
      ) : (
        list.map((e) => (
          <div key={e.id} className="flex gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0">
            <div className="text-[18px] font-extrabold tabular-nums text-slate-900 w-[52px] shrink-0">{e.time}</div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-slate-900 truncate">{e.customer}</div>
              {e.phone && (
                <a href={`tel:${e.phone}`} className="text-[12px] text-blue-600 hover:underline inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />{e.phone}
                </a>
              )}
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <Plate value={e.license} />
                <span className="text-[12px] text-slate-600 truncate">{e.vehicle}</span>
              </div>
              <div className="text-[12px] text-slate-500 mt-0.5">{e.description}</div>
            </div>
            <div className="shrink-0">
              <AsPill tone={e.assignee ? "blue" : "slate"}>{e.assignee || "Niet toegewezen"}</AsPill>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <AsPage>
        <div className="flex items-start justify-between gap-6 flex-wrap mb-5">
          <div>
            <h1 className="text-2xl md:text-[26px] font-semibold tracking-tight text-slate-900">
              {greeting}, {displayName} <span className="ml-1">🔧</span>
            </h1>
            <p className="text-[13px] text-slate-500 mt-1">
              {format(new Date(), "EEEE d MMMM yyyy", { locale: nl })} · {branchLabel}
            </p>
          </div>
          <BranchFilter_UI />
        </div>

        {loading || !data ? (
          <div className="flex items-center gap-2 text-slate-500 py-16 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Overzicht laden…
          </div>
        ) : (
          <div className="space-y-4">
            {/* 1. Verwacht vandaag / morgen */}
            <AsCard>
              <AsCardHead
                tone="blue"
                icon={<CalendarClock className="h-4 w-4" />}
                title="Verwacht vandaag / morgen"
                subtitle="Externe klanten met een afspraak in de werkplaats"
                count={data.extern.length}
              />
              <div className="flex flex-col md:flex-row md:divide-x divide-slate-100">
                {renderExtern(vandaag, "Vandaag")}
                {renderExtern(morgen, "Morgen")}
              </div>
            </AsCard>

            {/* 2. Openstaand werk */}
            <AsCard>
              <AsCardHead
                tone="amber"
                icon={<Wrench className="h-4 w-4" />}
                title="Openstaand werk"
                subtitle="Werkplaats-orders — spoed bovenaan"
                count={data.open.length}
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
                <Counter label="Open in pot" value={data.counts.pot} tone="bg-slate-50 border-slate-200 text-slate-800" />
                <Counter label="Ingepland" value={data.counts.ingepland} tone="bg-blue-50 border-blue-200 text-blue-800" />
                <Counter label="Bezig" value={data.counts.bezig} tone="bg-violet-50 border-violet-200 text-violet-800" />
                <Counter label="Wacht op goedkeuren" value={data.counts.goedkeuren} tone="bg-emerald-50 border-emerald-200 text-emerald-800" />
              </div>
              <div className="border-t border-slate-100">
                {data.open.length === 0 ? (
                  <Empty text="Geen open werkplaats-orders." />
                ) : (
                  data.open.slice(0, 15).map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => navigate("/werkplaats/planning")}
                      className="w-full text-left flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {o.rush && <AsPill tone="red">SPOED</AsPill>}
                          {o.warranty && <AsPill tone="pink">GARANTIE</AsPill>}
                          {o.extern && <AsPill tone="blue">EXTERN</AsPill>}
                          <Plate value={o.license} />
                          <span className="text-[13px] font-semibold text-slate-900 truncate">{o.vehicle}</span>
                        </div>
                        <div className="text-[12px] text-slate-500 truncate mt-0.5">{o.description}</div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <AsPill tone={o.status === "bezig" ? "violet" : "slate"}>{o.status}</AsPill>
                        <AsPill tone={o.assignee ? "blue" : "amber"}>{o.assignee || "Niet toegewezen"}</AsPill>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </AsCard>

            {/* 3. Monteurs */}
            <AsCard>
              <AsCardHead
                tone="violet"
                icon={<Users className="h-4 w-4" />}
                title="Monteurs"
                subtitle="Status nu · prestaties vandaag"
                count={data.monteurs.length}
              />
              {data.monteurs.length === 0 ? (
                <Empty text="Geen monteurs gevonden." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-4">
                  {data.monteurs.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => openMonteur(m)}
                      className="text-left rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[13px] font-semibold text-slate-900 truncate">{m.name}</div>
                        {m.busy ? <BusyTimer started={m.busy.startedAt} /> : <AsPill tone="green">vrij</AsPill>}
                      </div>
                      <div className="text-[12px] text-slate-600 mt-1.5 truncate">
                        {m.busy ? (
                          <span className="flex items-center gap-1.5">
                            bezig met <Plate value={m.busy.license} />
                            <span className="truncate">{m.busy.description}</span>
                          </span>
                        ) : (
                          "Geen actieve taak"
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-3 text-[12px] text-slate-600 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <AsMono>{fmtDuration(m.secondsToday)}</AsMono> vandaag
                        </span>
                        <span className="tabular-nums">{m.doneToday} afgerond</span>
                        <span className="tabular-nums">{m.openAssigned} open</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </AsCard>
          </div>
        )}

        <Sheet open={!!sheetFor} onOpenChange={(o) => !o && setSheetFor(null)}>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{sheetFor?.name} — taken</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-2">
              {sheetTasks === null ? (
                <div className="flex items-center gap-2 text-slate-500 py-8 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" /> Laden…
                </div>
              ) : sheetTasks.length === 0 ? (
                <Empty text="Geen open taken." />
              ) : (
                sheetTasks.map((t) => (
                  <div key={t.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Plate value={t.license} />
                      <span className="text-[13px] font-semibold text-slate-900 truncate">{t.vehicle}</span>
                      <AsPill tone={t.status === "bezig" ? "violet" : "slate"}>{t.status}</AsPill>
                    </div>
                    <div className="text-[12px] text-slate-600 mt-1">{t.description}</div>
                    {t.plannedAt && (
                      <div className="text-[11px] text-slate-400 mt-1">
                        {format(new Date(t.plannedAt), "EEE d MMM HH:mm", { locale: nl })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      </AsPage>
    </DashboardLayout>
  );
};

export default ChefDashboard;