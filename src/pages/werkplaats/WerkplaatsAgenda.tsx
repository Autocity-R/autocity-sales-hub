import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { AsPage, AsCard, AsPill, AsLicensePlate } from "@/components/aftersales/ui";
import { Button } from "@/components/ui/button";
import BranchFilter from "@/components/reports/BranchFilter";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentBranch, applyBranchFilter } from "@/contexts/BranchContext";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import WerkplaatsAgendaSettingsDialog from "@/components/werkplaats/WerkplaatsAgendaSettingsDialog";
import { cn } from "@/lib/utils";
import {
  addDays, addWeeks, endOfWeek, format, getISOWeek, isSameDay, startOfDay, startOfWeek,
} from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Settings as SettingsIcon, Loader2, Flame, Shield, Building2, User } from "lucide-react";

interface AgendaWO {
  id: string;
  discipline: string;
  description: string;
  part: string | null;
  status: string;
  is_rush: boolean;
  planned_at: string;
  branch: string | null;
  assigned_to: string | null;
  warranty_claim_id: string | null;
  origin: string | null;
  external_customer: any | null;
  vehicle: {
    id: string; brand: string; model: string; license_number: string | null; year: number | null;
  } | null;
}
interface Profile { id: string; first_name: string | null; last_name: string | null; }

const HOUR_START = 7;
const HOUR_END = 19;
const ROW_H = 44; // px per uur
const DUR_HOURS = 2;

type Kind = "garantie" | "extern" | "werkplaats";
const kindOf = (w: AgendaWO): Kind =>
  w.warranty_claim_id ? "garantie" : w.origin === "extern" ? "extern" : "werkplaats";

const KIND_BLOCK: Record<Kind, string> = {
  werkplaats: "bg-blue-50 border-blue-300 text-blue-900 hover:bg-blue-100",
  garantie: "bg-violet-50 border-violet-300 text-violet-900 hover:bg-violet-100",
  extern: "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100",
};

const nameOf = (p?: Profile) => p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Onbekend" : "Niet toegewezen";
const externalName = (w: AgendaWO): string | null => {
  const c = w.external_customer;
  if (!c) return null;
  if (typeof c === "string") return c;
  return c.name || [c.first_name, c.last_name].filter(Boolean).join(" ") || null;
};

const WerkplaatsAgenda: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { branchFilter } = useCurrentBranch();
  const { isMonteur, canManageWorkOrders, userRole } = useRoleAccess();
  const readOnly = isMonteur();

  const [anchor, setAnchor] = useState<Date>(new Date());
  const [rows, setRows] = useState<AgendaWO[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileDay, setMobileDay] = useState<Date>(startOfDay(new Date()));

  const weekStart = useMemo(() => startOfWeek(anchor, { weekStartsOn: 1 }), [anchor]);
  const weekEnd = useMemo(() => endOfWeek(anchor, { weekStartsOn: 1 }), [anchor]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const hours = useMemo(
    () => Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i),
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const select =
      "id, discipline, description, part, status, is_rush, planned_at, branch, assigned_to, warranty_claim_id, origin, external_customer, vehicle:vehicles!work_orders_vehicle_id_fkey(id, brand, model, license_number, year)";

    // ruime marge zodat "vandaag" ook zichtbaar blijft als je door de weken bladert
    const from = startOfDay(addDays(weekStart, -1));
    const to = addDays(weekEnd, 2);

    let q = supabase
      .from("work_orders")
      .select(select)
      .not("planned_at", "is", null)
      .neq("status", "geannuleerd")
      .gte("planned_at", from.toISOString())
      .lte("planned_at", to.toISOString())
      .order("planned_at", { ascending: true });
    q = applyBranchFilter(q as any, branchFilter);

    const { data, error } = await q;
    if (error) {
      toast({ title: "Fout bij laden agenda", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const list = ((data as any) || []) as AgendaWO[];
    setRows(list);

    const ids = Array.from(new Set(list.map(r => r.assigned_to).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, first_name, last_name").in("id", ids);
      setProfiles(new Map(((ps as any[]) || []).map(p => [p.id, p as Profile])));
    } else {
      setProfiles(new Map());
    }
    setLoading(false);
  }, [weekStart, weekEnd, branchFilter]);

  useEffect(() => { load(); }, [load]);

  // Realtime + refetch bij focus
  useEffect(() => {
    const channel = supabase
      .channel("werkplaats-agenda")
      .on("postgres_changes", { event: "*", schema: "public", table: "work_orders" }, () => load())
      .subscribe();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const today = startOfDay(new Date());
  const todayItems = useMemo(
    () => rows
      .filter(r => isSameDay(new Date(r.planned_at), today))
      .sort((a, b) => new Date(a.planned_at).getTime() - new Date(b.planned_at).getTime()),
    [rows, today],
  );

  const itemsForDay = (d: Date) =>
    rows.filter(r => isSameDay(new Date(r.planned_at), d));

  const openItem = (w: AgendaWO) => {
    if (w.warranty_claim_id) navigate("/warranty");
    else navigate("/werkplaats/planning");
  };

  const Badges: React.FC<{ w: AgendaWO }> = ({ w }) => {
    const ext = externalName(w);
    return (
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {w.is_rush && <AsPill tone="red"><Flame className="h-3 w-3" />⚡ SPOED</AsPill>}
        {w.warranty_claim_id && <AsPill tone="violet"><Shield className="h-3 w-3" />🛡️ GARANTIE</AsPill>}
        {w.origin === "extern" && (
          <AsPill tone="amber"><Building2 className="h-3 w-3" />EXTERN{ext ? ` · ${ext}` : ""}</AsPill>
        )}
      </div>
    );
  };

  const TodayCard: React.FC<{ w: AgendaWO }> = ({ w }) => {
    const p = w.assigned_to ? profiles.get(w.assigned_to) : undefined;
    const mine = readOnly && !!w.assigned_to && w.assigned_to === (undefined as any);
    return (
      <AsCard interactive onClick={() => openItem(w)} className={cn("p-3", mine && "ring-2 ring-blue-300")}>
        <div className="flex items-start gap-3">
          <div className="text-[20px] font-bold text-slate-900 tabular-nums leading-none pt-0.5 w-[52px] shrink-0">
            {format(new Date(w.planned_at), "HH:mm")}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <AsLicensePlate value={w.vehicle?.license_number} size="sm" />
              <span className="text-[13px] font-bold text-slate-900 truncate">
                {w.vehicle?.brand} {w.vehicle?.model}
              </span>
            </div>
            <div className="mt-1 text-[12px] text-slate-600 line-clamp-2">
              {w.part ? `${w.part} · ` : ""}{w.description}
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11.5px] font-semibold text-slate-700">
              <User className="h-3 w-3" />{nameOf(p)}
            </div>
            <Badges w={w} />
          </div>
        </div>
      </AsCard>
    );
  };

  const EventBlock: React.FC<{ w: AgendaWO }> = ({ w }) => {
    const d = new Date(w.planned_at);
    const minutes = (d.getHours() - HOUR_START) * 60 + d.getMinutes();
    const top = Math.max(0, (minutes / 60) * ROW_H);
    const height = DUR_HOURS * ROW_H - 4;
    if (d.getHours() >= HOUR_END || d.getHours() < HOUR_START - 1) return null;
    return (
      <button
        type="button"
        onClick={() => openItem(w)}
        style={{ top, height }}
        className={cn(
          "absolute left-1 right-1 rounded-md border px-1.5 py-1 text-left overflow-hidden transition-colors",
          KIND_BLOCK[kindOf(w)],
        )}
      >
        <div className="text-[10.5px] font-black tracking-wide truncate">
          {w.vehicle?.license_number || "—"}
        </div>
        <div className="text-[10.5px] font-semibold truncate">
          {w.vehicle?.brand} {w.vehicle?.model}
        </div>
        <div className="text-[10px] opacity-75 tabular-nums">
          {format(d, "HH:mm")}–{format(addDays(d, 0).setHours(d.getHours() + DUR_HOURS) && new Date(d.getTime() + DUR_HOURS * 3600000), "HH:mm")}
        </div>
      </button>
    );
  };

  const DayColumn: React.FC<{ d: Date }> = ({ d }) => {
    const isTodayCol = isSameDay(d, today);
    return (
      <div className={cn("relative border-l border-slate-200", isTodayCol && "bg-blue-50/40")}>
        {hours.map((h) => (
          <div key={h} className="border-b border-slate-100" style={{ height: ROW_H }} />
        ))}
        <div className="absolute inset-0">
          {itemsForDay(d).map((w) => <EventBlock key={w.id} w={w} />)}
        </div>
      </div>
    );
  };

  const gridDays = isMobile ? [mobileDay] : days;

  return (
    <DashboardLayout>
      <AsPage>
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[19px] font-bold text-slate-900 leading-tight">Werkplaats agenda</h1>
              <p className="text-[12.5px] text-slate-500">
                Week {getISOWeek(weekStart)} · {format(weekStart, "d MMM", { locale: nl })} – {format(weekEnd, "d MMM yyyy", { locale: nl })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => { setAnchor(addWeeks(anchor, -1)); setMobileDay(addDays(mobileDay, -1)); }}>
                <ChevronLeft className="h-4 w-4" /> Vorige
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setAnchor(new Date()); setMobileDay(startOfDay(new Date())); }}>
                Vandaag
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setAnchor(addWeeks(anchor, 1)); setMobileDay(addDays(mobileDay, 1)); }}>
                Volgende <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <BranchFilter />
            {!readOnly && canManageWorkOrders() && (
              <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} aria-label="Agenda-instellingen">
                <SettingsIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 items-start">
          {/* VANDAAG */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-bold tracking-wider text-slate-500">VANDAAG</h2>
              <span className="text-[12px] text-slate-500">{format(today, "EEEE d MMM", { locale: nl })}</span>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Laden…
              </div>
            ) : todayItems.length === 0 ? (
              <AsCard className="p-6 text-center text-[13px] text-slate-500">Geen afspraken vandaag</AsCard>
            ) : (
              todayItems.map((w) => <TodayCard key={w.id} w={w} />)
            )}
          </div>

          {/* WEEKKALENDER */}
          <AsCard className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#f4f6f9] border-b border-[#e2e6ec]">
              <span className="text-[12.5px] font-semibold text-slate-700">
                {isMobile ? format(mobileDay, "EEEE d MMMM", { locale: nl }) : "Weekoverzicht"}
              </span>
              <div className="flex items-center gap-2 text-[10.5px]">
                <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-blue-300 inline-block" />Werkplaats</span>
                <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-violet-300 inline-block" />Garantie</span>
                <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-amber-300 inline-block" />Extern</span>
              </div>
            </div>

            {isMobile && (
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                <Button variant="ghost" size="sm" onClick={() => setMobileDay(addDays(mobileDay, -1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-[12px] font-semibold text-slate-700">{format(mobileDay, "EEEE d MMM", { locale: nl })}</span>
                <Button variant="ghost" size="sm" onClick={() => setMobileDay(addDays(mobileDay, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="overflow-x-auto">
              <div className="min-w-[640px] lg:min-w-0">
                {/* dagkoppen */}
                <div
                  className="grid border-b border-slate-200 bg-white"
                  style={{ gridTemplateColumns: `56px repeat(${gridDays.length}, minmax(0,1fr))` }}
                >
                  <div />
                  {gridDays.map((d) => (
                    <div
                      key={d.toISOString()}
                      className={cn(
                        "px-2 py-2 text-center border-l border-slate-200",
                        isSameDay(d, today) && "bg-blue-50",
                      )}
                    >
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">{format(d, "EEE", { locale: nl })}</div>
                      <div className={cn("text-[14px] font-bold", isSameDay(d, today) ? "text-blue-700" : "text-slate-800")}>
                        {format(d, "d")}
                      </div>
                    </div>
                  ))}
                </div>

                {/* raster */}
                <div className="grid" style={{ gridTemplateColumns: `56px repeat(${gridDays.length}, minmax(0,1fr))` }}>
                  <div>
                    {hours.map((h) => (
                      <div key={h} className="border-b border-slate-100 text-[10.5px] text-slate-400 pr-2 text-right tabular-nums" style={{ height: ROW_H }}>
                        {String(h).padStart(2, "0")}:00
                      </div>
                    ))}
                  </div>
                  {gridDays.map((d) => <DayColumn key={d.toISOString()} d={d} />)}
                </div>
              </div>
            </div>
          </AsCard>
        </div>

        <WerkplaatsAgendaSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </AsPage>
    </DashboardLayout>
  );
};

export default WerkplaatsAgenda;
