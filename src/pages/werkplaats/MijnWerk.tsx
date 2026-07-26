import React, { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, isToday } from "date-fns";
import { nl } from "date-fns/locale";
import {
  AsPage, AsCard, AsPill, AsLicensePlate, useLiveTimer,
} from "@/components/aftersales/ui";
import {
  Loader2, Play, CheckCircle2, Timer, Clock, HandMetal, CalendarDays, Inbox, Phone, Undo2,
  RefreshCw,
} from "lucide-react";
import { TaskDetailSheet } from "@/components/werkplaats/TaskDetailSheet";

interface WorkRow {
  id: string;
  description: string | null;
  part: string | null;
  photos: string[] | null;
  status: string;
  planned_at: string | null;
  started_at: string | null;
  is_rush: boolean;
  assigned_to: string | null;
  origin: string | null;
  warranty_claim_id: string | null;
  external_customer: any;
  branch: string | null;
  vehicle_id: string | null;
  vehicle: {
    brand: string | null; model: string | null; license_number: string | null; year: number | null;
  } | null;
}

const SELECT =
  "id, description, part, photos, status, planned_at, started_at, is_rush, assigned_to, origin, warranty_claim_id, external_customer, branch, vehicle_id, vehicle:vehicles!work_orders_vehicle_id_fkey(brand, model, license_number, year)";

const MijnWerkCard: React.FC<{
  w: WorkRow;
  mine: boolean;
  onStart: (w: WorkRow) => void;
  onDone: (w: WorkRow) => void;
  onClaim: (w: WorkRow) => void;
  onRelease: (w: WorkRow) => void;
  busy: boolean;
  onOpen?: (w: WorkRow) => void;
}> = ({ w, mine, onStart, onDone, onClaim, onRelease, busy, onOpen }) => {
  const timer = useLiveTimer(w.status === "bezig" ? w.started_at : null);
  const ext = (w.external_customer || {}) as any;
  const isExtern = w.origin === "extern";
  const phone: string | null = ext.phone || ext.telephone || null;

  return (
    <div
      onClick={onOpen ? () => onOpen(w) : undefined}
      className={cn("bg-white rounded-[12px] border border-slate-200 shadow-sm p-4 flex flex-col gap-3", onOpen && "cursor-pointer")}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <AsLicensePlate value={w.vehicle?.license_number} size="sm" />
        <span className="text-[15px] font-bold text-slate-900">
          {[w.vehicle?.brand, w.vehicle?.model].filter(Boolean).join(" ") || "Voertuig"}
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {w.planned_at && (
          <AsPill tone="blue">
            <Clock className="h-3 w-3" />
            {format(new Date(w.planned_at), isToday(new Date(w.planned_at)) ? "HH:mm" : "d MMM HH:mm", { locale: nl })}
          </AsPill>
        )}
        {w.is_rush && <AsPill tone="red">⚡ SPOED</AsPill>}
        {w.warranty_claim_id && <AsPill tone="violet">🛡️ GARANTIE</AsPill>}
        {isExtern && <AsPill tone="amber">EXTERN{ext.name ? ` · ${ext.name}` : ""}</AsPill>}
      </div>

      {isExtern && phone && (
        <a href={`tel:${String(phone).replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-blue-600 self-start">
          <Phone className="h-3.5 w-3.5" /> {phone}
        </a>
      )}

      <div className="text-[13.5px] text-slate-700 whitespace-pre-wrap">{w.description || "—"}</div>

      {w.status === "bezig" && (
        <div className="inline-flex self-start items-center gap-1.5 px-2.5 py-1 rounded-md border border-violet-200 bg-violet-50 text-violet-700 text-[13px] font-semibold tabular-nums">
          <Timer className="h-4 w-4" /> {timer ?? "00:00"}
        </div>
      )}

      <div onClick={(e) => e.stopPropagation()} className="contents">
      {!mine ? (
        <Button onClick={() => onClaim(w)} disabled={busy}
          className="h-12 w-full bg-slate-900 hover:bg-slate-800 text-white text-[15px] font-semibold">
          <HandMetal className="h-5 w-5 mr-2" /> Oppakken
        </Button>
      ) : w.status === "bezig" ? (
        <Button onClick={() => onDone(w)} disabled={busy}
          className="h-12 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[15px] font-semibold">
          <CheckCircle2 className="h-5 w-5 mr-2" /> Klaar
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <Button onClick={() => onStart(w)} disabled={busy}
            className="h-12 w-full bg-blue-600 hover:bg-blue-700 text-white text-[15px] font-semibold">
            <Play className="h-5 w-5 mr-2" /> Start
          </Button>
          <Button onClick={() => onRelease(w)} disabled={busy} variant="outline"
            className="h-10 w-full text-[13.5px] font-medium text-slate-600">
            <Undo2 className="h-4 w-4 mr-2" /> Terugleggen
          </Button>
        </div>
      )}
      </div>
    </div>
  );
};

const MijnWerk: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<WorkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<WorkRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;
    setUserId(uid);

    const { data, error } = await supabase
      .from("work_orders")
      .select(SELECT)
      .eq("discipline", "werkplaats")
      .in("status", ["aangevraagd", "ingepland", "bezig"])
      .order("planned_at", { ascending: true, nullsFirst: false });

    if (error) toast({ title: "Fout bij laden", description: error.message, variant: "destructive" });
    setRows(((data as any) || []) as WorkRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime: de open pot moet kloppen als meerdere monteurs tegelijk werken
  useEffect(() => {
    const channel = supabase
      .channel("mijn-werk-work-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "work_orders" }, () => load())
      .subscribe();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const { vandaag, open } = useMemo(() => {
    const mine = rows.filter(r => r.assigned_to && r.assigned_to === userId);
    const vandaagList = [...mine].sort((a, b) =>
      (a.planned_at || "9999").localeCompare(b.planned_at || "9999"));
    // Open pot: alles zonder toewijzing (ook toekomstig gepland)
    const openList = rows
      .filter(r => !r.assigned_to)
      .sort((a, b) =>
        Number(b.is_rush) - Number(a.is_rush) ||
        (a.planned_at || "9999").localeCompare(b.planned_at || "9999"));
    return { vandaag: vandaagList, open: openList };
  }, [rows, userId]);

  const patch = async (id: string, payload: Record<string, any>, optimistic: Partial<WorkRow>) => {
    setBusy(true);
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...optimistic } as WorkRow : r)));
    const { error } = await supabase.from("work_orders").update(payload as any).eq("id", id);
    setBusy(false);
    if (error) {
      toast({ title: "Kon niet opslaan", description: error.message, variant: "destructive" });
      load();
      return false;
    }
    return true;
  };

  const onClaim = async (w: WorkRow) => {
    if (!userId) return;
    setBusy(true);
    setRows(prev => prev.map(r => (r.id === w.id ? { ...r, assigned_to: userId } : r)));
    // Race-bescherming: alleen claimen zolang niemand anders hem heeft
    const { data, error } = await supabase
      .from("work_orders")
      .update({ assigned_to: userId } as any)
      .eq("id", w.id)
      .is("assigned_to", null)
      .select("id, assigned_to");
    setBusy(false);

    if (error) {
      toast({ title: "Kon niet oppakken", description: error.message, variant: "destructive" });
      load();
      return;
    }
    if (!data || data.length === 0) {
      // Iemand anders was sneller — haal de naam op
      const { data: cur } = await supabase
        .from("work_orders").select("assigned_to").eq("id", w.id).maybeSingle();
      let naam = "een collega";
      if (cur?.assigned_to) {
        const { data: p } = await supabase
          .from("profiles").select("first_name, last_name").eq("id", cur.assigned_to).maybeSingle();
        const full = [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim();
        if (full) naam = full;
      }
      toast({ title: "Al opgepakt", description: `Al opgepakt door ${naam}.`, variant: "destructive" });
      load();
      return;
    }
    toast({ title: "Opgepakt", description: "De taak staat nu op jouw naam." });
  };

  const onRelease = async (w: WorkRow) => {
    if (w.status !== "ingepland" && w.status !== "aangevraagd") return;
    if (await patch(w.id, { assigned_to: null }, { assigned_to: null })) {
      toast({ title: "Teruggelegd", description: "De taak staat weer in de open pot." });
    }
  };

  const onStart = async (w: WorkRow) => {
    const startedAt = new Date().toISOString();
    await patch(w.id, { status: "bezig", started_at: startedAt }, { status: "bezig", started_at: startedAt });
    setDetail(null);
  };

  const onDone = async (w: WorkRow) => {
    const started = w.started_at ? new Date(w.started_at).getTime() : null;
    const workSeconds = started ? Math.max(0, Math.round((Date.now() - started) / 1000)) : null;
    setRows(prev => prev.filter(r => r.id !== w.id));
    setDetail(null);
    const { error } = await supabase.from("work_orders").update({
      status: "afgerond",
      finished_at: new Date().toISOString(),
      work_seconds: workSeconds,
    } as any).eq("id", w.id);
    if (error) {
      toast({ title: "Kon niet afronden", description: error.message, variant: "destructive" });
      load();
      return;
    }
    toast({ title: "✓ Klaar", description: "Doorgestuurd naar goedkeuren." });
  };

  const section = (
    title: string, subtitle: string, icon: React.ReactNode, list: WorkRow[], mine: boolean, empty: string,
  ) => (
    <AsCard className="flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <div className={cn("h-[30px] w-[30px] rounded-lg flex items-center justify-center shrink-0",
          mine ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500")}>{icon}</div>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-slate-900">{title}</div>
          <div className="text-[12px] text-slate-500">{subtitle}</div>
        </div>
        <span className="ml-auto text-[13px] font-semibold text-slate-500">{list.length}</span>
      </div>
      <div className="flex flex-col gap-3 p-3">
        {list.length === 0 ? (
          <div className="text-[12.5px] text-slate-400 px-1 py-8 text-center border border-dashed border-slate-200 rounded-lg">
            {empty}
          </div>
        ) : list.map(w => (
          <MijnWerkCard key={w.id} w={w} mine={!!w.assigned_to}
            onStart={onStart} onDone={onDone} onClaim={onClaim} onRelease={onRelease} busy={busy} onOpen={setDetail} />
        ))}
      </div>
    </AsCard>
  );

  return (
    <DashboardLayout>
      <AsPage>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[20px] md:text-2xl font-semibold tracking-tight text-slate-900">Mijn werk</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">Start je klus, tik op ✓ Klaar als je klaar bent</p>
          </div>
          <Button variant="outline" onClick={() => load()} aria-label="Vernieuwen"
            className="h-11 w-11 p-0 shrink-0">
            <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 py-16 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Laden…
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {section("Vandaag", "Jouw klussen", <CalendarDays className="h-4 w-4" />, vandaag, true,
              "Niks ingepland voor vandaag.")}
            {section("🔧 Open taken — vrij op te pakken", "Nog niet toegewezen · pak zelf op",
              <Inbox className="h-4 w-4" />, open, false, "Geen open taken.")}
          </div>
        )}

        <TaskDetailSheet
          open={!!detail}
          onOpenChange={(v) => !v && setDetail(null)}
          workOrder={detail as any}
          actions={detail ? (
            !detail.assigned_to ? (
              <Button onClick={() => { onClaim(detail); setDetail(null); }} disabled={busy}
                className="h-12 w-full bg-slate-900 hover:bg-slate-800 text-white text-[15px] font-semibold">
                <HandMetal className="h-5 w-5 mr-2" /> Oppakken
              </Button>
            ) : detail.status === "bezig" ? (
              <Button onClick={() => onDone(detail)} disabled={busy}
                className="h-12 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[15px] font-semibold">
                <CheckCircle2 className="h-5 w-5 mr-2" /> Klaar
              </Button>
            ) : (
              <Button onClick={() => onStart(detail)} disabled={busy}
                className="h-12 w-full bg-blue-600 hover:bg-blue-700 text-white text-[15px] font-semibold">
                <Play className="h-5 w-5 mr-2" /> Start
              </Button>
            )
          ) : null}
        />
      </AsPage>
    </DashboardLayout>
  );
};

export default MijnWerk;
