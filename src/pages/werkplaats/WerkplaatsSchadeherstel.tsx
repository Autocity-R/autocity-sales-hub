import React, { useCallback, useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, PaintBucket, Check, Play } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AsPage, AsCard } from "@/components/aftersales/ui";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { TaskDetailSheet } from "@/components/werkplaats/TaskDetailSheet";
import { MyPerformanceCard } from "@/components/werkplaats/MyPerformanceCard";
import { isPlannedInFuture, formatPlannedDay } from "@/components/werkplaats/plannedVisibility";
import { SchadeherstelCard, SchadeWO } from "@/components/werkplaats/SchadeherstelCard";
import { useEigenSchadeherstel } from "@/hooks/useEigenSchadeherstel";

type WO = SchadeWO & { vehicle_id: string | null };

const SELECT =
  "id, description, part, parts, status, is_rush, sort_order, photos, result_photos, rejected_count, reject_note, created_at, planned_at, started_at, finished_at, assigned_to, vehicle_id, uitvoering, extern_party, extern_dropped_at, extern_returned_at, origin, external_customer, vehicle:vehicles!work_orders_vehicle_id_fkey(brand, model, year, license_number, vin, mileage, color, showroom_photo_url)";

const WerkplaatsSchadeherstel: React.FC = () => {
  const readOnly = useRoleAccess().isDirectieReadOnly();
  const { eigen } = useEigenSchadeherstel();
  const [rows, setRows] = useState<WO[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [doneTodayCount, setDoneTodayCount] = useState(0);
  const [detail, setDetail] = useState<WO | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: userRes } = await supabase.auth.getUser();
    setMyId(userRes.user?.id ?? null);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const [openRes, doneRes] = await Promise.all([
      supabase.from("work_orders").select(SELECT)
        .eq("discipline", "spuit")
        .eq("uitvoering", "intern")
        .in("status", ["aangevraagd", "ingepland", "bezig"])
        .order("is_rush", { ascending: false })
        .order("sort_order", { ascending: true }),
      supabase.from("work_orders").select("id")
        .eq("discipline", "spuit")
        .eq("uitvoering", "intern")
        .in("status", ["afgerond", "goedgekeurd"])
        .gte("finished_at", todayStart.toISOString()),
    ]);

    const all = ((openRes.data as any[]) || []) as WO[];
    setRows(all);
    setDoneTodayCount(((doneRes.data as any[]) || []).length);

    const ids = Array.from(new Set(all.map(r => r.assigned_to).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, first_name, last_name").in("id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.id] = [p.first_name, p.last_name].filter(Boolean).join(" ") || "collega"; });
      setNames(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStart = async (w: WO) => {
    if (isPlannedInFuture(w.planned_at)) {
      toast({
        title: "Nog niet beschikbaar",
        description: `Deze klus staat gepland voor ${formatPlannedDay(w.planned_at!)} — de auto is er nog niet.`,
        variant: "destructive",
      });
      setDetail(null);
      load();
      return;
    }
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) return;
    const { error } = await supabase.from("work_orders")
      .update({ assigned_to: uid, status: "bezig", started_at: new Date().toISOString() })
      .eq("id", w.id);
    if (error) { toast({ title: "Fout", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Gestart" });
    setDetail(null);
    load();
  };

  const handleDone = async (w: WO) => {
    const startedAt = w.started_at ? new Date(w.started_at).getTime() : null;
    const workSeconds = startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : null;
    const { error } = await supabase.from("work_orders")
      .update({ status: "afgerond", finished_at: new Date().toISOString(), work_seconds: workSeconds })
      .eq("id", w.id);
    if (error) { toast({ title: "Fout", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Klaar gemeld" });
    setDetail(null);
    load();
  };

  // Gepland voor een latere dag = nog niet zichtbaar op de vloer
  const open = rows.filter(r => !isPlannedInFuture(r.planned_at));

  if (eigen === false) {
    return (
      <DashboardLayout>
        <AsPage>
          <AsCard className="p-10 text-center text-slate-500 text-[13px] max-w-lg mx-auto">
            <PaintBucket className="h-5 w-5 mx-auto mb-2 text-slate-300" />
            Deze onderneming heeft geen eigen schadeherstel-afdeling. Schadeherstel wordt uitbesteed en beheerd in de Planning.
          </AsCard>
        </AsPage>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <AsPage>
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Schadeherstel</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Start een auto zodat collega's zien dat je ermee bezig bent.
            {doneTodayCount > 0 ? ` Vandaag al ${doneTodayCount} klus${doneTodayCount === 1 ? "" : "sen"} afgerond.` : ""}
          </p>
        </div>

        <MyPerformanceCard discipline="spuit" variant="schade" />

        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 py-10"><Loader2 className="h-4 w-4 animate-spin" /> Laden…</div>
        ) : open.length === 0 ? (
          <AsCard className="p-10 text-center text-slate-400 text-[13px]">
            <PaintBucket className="h-5 w-5 mx-auto mb-2 text-slate-300" />Geen schadeherstel-taken.
          </AsCard>
        ) : (
          <div className="space-y-3">
            {open.map((w, i) => {
              const busy = w.status === "bezig";
              const mine = w.assigned_to === myId;
              return (
                <SchadeherstelCard
                  key={w.id}
                  w={w}
                  index={i}
                  assigneeName={busy ? (mine ? "jij" : (w.assigned_to ? names[w.assigned_to] || "collega" : null)) : null}
                  onOpen={() => setDetail(w)}
                  actions={!readOnly ? (
                    !busy ? (
                      <Button size="lg" className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => handleStart(w)}>
                        <Play className="h-4 w-4 mr-1" /> Start
                      </Button>
                    ) : mine ? (
                      <Button size="lg" className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleDone(w)}>
                        <Check className="h-4 w-4 mr-1" /> Klaar
                      </Button>
                    ) : undefined
                  ) : undefined}
                />
              );
            })}
          </div>
        )}

        <TaskDetailSheet
          open={!!detail}
          onOpenChange={(v) => !v && setDetail(null)}
          workOrder={detail as any}
          actions={detail && !readOnly && detail.status !== "afgerond" ? (
            detail.status !== "bezig" ? (
              <Button size="lg" className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleStart(detail)}>
                <Play className="h-4 w-4 mr-1" /> Start
              </Button>
            ) : detail.assigned_to === myId ? (
              <Button size="lg" className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleDone(detail)}>
                <Check className="h-4 w-4 mr-1" /> Klaar
              </Button>
            ) : null
          ) : null}
        />
      </AsPage>
    </DashboardLayout>
  );
};

export default WerkplaatsSchadeherstel;
