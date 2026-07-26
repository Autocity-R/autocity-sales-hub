import React, { useCallback, useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { WorkshopPhoto } from "@/components/werkplaats/WorkshopPhoto";
import { Flame, Loader2, PaintBucket, Check, CheckCircle2, Play, Timer } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { differenceInDays } from "date-fns";
import { AsPage, AsCard, AsPill, AsLicensePlate, AsMono, useLiveTimer } from "@/components/aftersales/ui";
import { cn } from "@/lib/utils";

interface WO {
  id: string;
  description: string;
  part: string | null;
  status: string;
  is_rush: boolean;
  sort_order: number;
  photos: string[] | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  assigned_to: string | null;
  vehicle: {
    brand: string; model: string; year: number | null;
    license_number: string | null; vin: string | null;
    mileage: number | null; color: string | null;
  } | null;
}

const SELECT =
  "id, description, part, status, is_rush, sort_order, photos, created_at, started_at, finished_at, assigned_to, vehicle:vehicles!work_orders_vehicle_id_fkey(brand, model, year, license_number, vin, mileage, color)";

const Card: React.FC<{
  w: WO;
  meName: string;
  names: Record<string, string>;
  myId: string | null;
  onStart: (w: WO) => void;
  onDone: (w: WO) => void;
}> = ({ w, names, myId, onStart, onDone }) => {
  const v = w.vehicle;
  const done = w.status === "afgerond";
  const busy = w.status === "bezig";
  const mine = w.assigned_to === myId;
  const timer = useLiveTimer(busy ? w.started_at : null);
  const days = differenceInDays(new Date(), new Date(w.created_at));
  const specs = [
    v?.year ? String(v.year) : null,
    typeof v?.mileage === "number" ? `${v.mileage.toLocaleString("nl-NL")} km` : null,
    v?.color || null,
  ].filter(Boolean) as string[];

  return (
    <AsCard className={cn("p-4 md:p-5", done && "bg-slate-50 border-slate-200 opacity-70")}>
      <div className="flex items-start gap-4">
        <div className="pt-0.5"><AsLicensePlate value={v?.license_number} size="lg" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[15px] font-bold tracking-tight text-slate-900 truncate">
                {v?.brand} {v?.model}
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                {specs.join(" · ")}
                {v?.vin && <> · <AsMono>{v.vin.slice(-8)}</AsMono></>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {w.is_rush && !done && <AsPill tone="red"><Flame className="h-3 w-3" />Spoed</AsPill>}
              {done
                ? <AsPill tone="green"><CheckCircle2 className="h-3 w-3" />Vandaag afgerond</AsPill>
                : <AsPill tone={days > 3 ? "red" : days > 1 ? "amber" : "slate"}>{days}d open</AsPill>}
            </div>
          </div>

          {w.part && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[12.5px] font-semibold">
              {w.part}
            </div>
          )}
          <div className="mt-2 text-[13px] text-slate-700">{w.description}</div>

          {w.photos && w.photos.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {w.photos.map((p, i) => <WorkshopPhoto key={i} path={p} className="w-20 h-20" />)}
            </div>
          )}

          {busy && (
            <div className="mt-3 flex items-center gap-2 text-[12.5px]">
              <AsPill tone="amber"><Timer className="h-3 w-3" />{timer}</AsPill>
              <span className="text-slate-600 font-medium">
                Bezig — {mine ? "jij" : (w.assigned_to ? names[w.assigned_to] || "collega" : "collega")}
              </span>
            </div>
          )}

          {!done && (
            <div className="mt-4">
              {!busy ? (
                <Button
                  size="lg"
                  className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => onStart(w)}
                >
                  <Play className="h-4 w-4 mr-1" /> Start
                </Button>
              ) : mine ? (
                <Button
                  size="lg"
                  className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => onDone(w)}
                >
                  <Check className="h-4 w-4 mr-1" /> Klaar
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </AsCard>
  );
};

const WerkplaatsSchadeherstel: React.FC = () => {
  const [rows, setRows] = useState<WO[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: userRes } = await supabase.auth.getUser();
    setMyId(userRes.user?.id ?? null);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [openRes, doneRes] = await Promise.all([
      supabase.from("work_orders").select(SELECT)
        .eq("discipline", "spuit")
        .in("status", ["aangevraagd", "ingepland", "bezig"])
        .order("is_rush", { ascending: false })
        .order("sort_order", { ascending: true }),
      supabase.from("work_orders").select(SELECT)
        .eq("discipline", "spuit")
        .eq("status", "afgerond")
        .gte("finished_at", since)
        .order("finished_at", { ascending: false }),
    ]);

    const all = [...((openRes.data as any[]) || []), ...((doneRes.data as any[]) || [])] as WO[];
    setRows(all);

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
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) return;
    const { error } = await supabase.from("work_orders")
      .update({ assigned_to: uid, status: "bezig", started_at: new Date().toISOString() })
      .eq("id", w.id)
      .is("assigned_to", null);
    if (error) { toast({ title: "Fout", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Gestart" });
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
    load();
  };

  const open = rows.filter(r => r.status !== "afgerond");
  const done = rows.filter(r => r.status === "afgerond");

  return (
    <DashboardLayout>
      <AsPage>
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Schadeherstel</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Start een auto zodat collega's zien dat je ermee bezig bent. Afgeronde auto's blijven 24 uur zichtbaar.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 py-10"><Loader2 className="h-4 w-4 animate-spin" /> Laden…</div>
        ) : rows.length === 0 ? (
          <AsCard className="p-10 text-center text-slate-400 text-[13px]">
            <PaintBucket className="h-5 w-5 mx-auto mb-2 text-slate-300" />Geen schadeherstel-taken.
          </AsCard>
        ) : (
          <div className="space-y-3">
            {open.map(w => (
              <Card key={w.id} w={w} meName="" names={names} myId={myId} onStart={handleStart} onDone={handleDone} />
            ))}
            {done.map(w => (
              <Card key={w.id} w={w} meName="" names={names} myId={myId} onStart={handleStart} onDone={handleDone} />
            ))}
          </div>
        )}
      </AsPage>
    </DashboardLayout>
  );
};

export default WerkplaatsSchadeherstel;
