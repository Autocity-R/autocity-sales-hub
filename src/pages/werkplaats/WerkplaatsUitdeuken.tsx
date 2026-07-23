import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentBranch, applyBranchFilter } from "@/contexts/BranchContext";
import BranchFilter from "@/components/reports/BranchFilter";
import { WorkshopPhoto } from "@/components/werkplaats/WorkshopPhoto";
import { Flame, Loader2, Hammer, Check, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { differenceInDays } from "date-fns";
import { AsPage, AsCard, AsPill, AsLicensePlate, AsMono } from "@/components/aftersales/ui";
import { cn } from "@/lib/utils";

interface WO {
  id: string; description: string; part: string | null; status: string; is_rush: boolean; sort_order: number;
  photos: string[] | null; branch: string | null; created_at: string; approved_at: string | null;
  vehicle: { brand: string; model: string; year: number | null; license_number: string | null; vin: string | null; mileage: number | null; color: string | null } | null;
}

const WerkplaatsUitdeuken: React.FC = () => {
  const { branchFilter } = useCurrentBranch();
  const [rows, setRows] = useState<WO[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const select = "id, description, part, status, is_rush, sort_order, photos, branch, created_at, approved_at, vehicle:vehicles!work_orders_vehicle_id_fkey(brand, model, year, license_number, vin, mileage, color)";

    let qOpen = supabase.from("work_orders").select(select)
      .eq("discipline", "uitdeuk")
      .in("status", ["ingepland", "bezig", "afgerond"])
      .order("is_rush", { ascending: false })
      .order("sort_order", { ascending: true });
    qOpen = applyBranchFilter(qOpen as any, branchFilter);

    let qDone = supabase.from("work_orders").select(select)
      .eq("discipline", "uitdeuk")
      .eq("status", "goedgekeurd")
      .gte("approved_at", since)
      .order("approved_at", { ascending: false });
    qDone = applyBranchFilter(qDone as any, branchFilter);

    const [{ data: openData }, { data: doneData }] = await Promise.all([qOpen, qDone]);
    setRows([...(openData as any || []), ...(doneData as any || [])]);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-line */ }, [branchFilter]);

  const markDone = async (w: WO) => {
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("work_orders").update({
      status: "goedgekeurd",
      finished_at: new Date().toISOString(),
      approved_at: new Date().toISOString(),
      approved_by: userRes.user?.id ?? null,
    }).eq("id", w.id);
    if (error) toast({ title: "Fout", description: error.message, variant: "destructive" });
    else { toast({ title: "Uitdeuk-taak gedaan" }); load(); }
  };

  return (
    <DashboardLayout>
      <AsPage>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Uitdeuken (extern)</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">Werkorders bij externe uitdeuk-partner. Afgevinkt = direct gedaan (blijft 24u zichtbaar).</p>
          </div>
          <BranchFilter />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 py-10"><Loader2 className="h-4 w-4 animate-spin" /> Laden…</div>
        ) : rows.length === 0 ? (
          <AsCard className="p-10 text-center text-slate-400 text-[13px]"><Hammer className="h-5 w-5 mx-auto mb-2 text-slate-300" />Geen uitdeuk-taken.</AsCard>
        ) : (
          <div className="space-y-3">
            {rows.map(w => {
              const v = w.vehicle;
              const done = w.status === "goedgekeurd";
              const days = differenceInDays(new Date(), new Date(w.created_at));
              return (
                <AsCard key={w.id} className={cn("p-4 md:p-5", done && "bg-emerald-50/40 border-emerald-100")}>
                  <div className="flex items-start gap-4">
                    <div className="pt-0.5"><AsLicensePlate value={v?.license_number} size="lg" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[15px] font-bold tracking-tight text-slate-900 truncate">
                            {v?.brand} {v?.model} {v?.year && <span className="text-slate-500 font-semibold">· {v.year}</span>}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {[v?.mileage ? `${v.mileage.toLocaleString("nl-NL")} km` : null, v?.color, v?.vin ? <AsMono key="vin">{v.vin.slice(-8)}</AsMono> : null].filter(Boolean).map((x, i) => <span key={i} className="mr-2">{x}</span>)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {w.is_rush && !done && <AsPill tone="red"><Flame className="h-3 w-3" />Spoed</AsPill>}
                          {done
                            ? <AsPill tone="green"><CheckCircle2 className="h-3 w-3" />Gedaan</AsPill>
                            : <AsPill tone={days > 3 ? "red" : days > 1 ? "amber" : "slate"}>{days}d bij uitdeuker</AsPill>}
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

                      {!done && (
                        <div className="flex items-center gap-2 mt-4">
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => markDone(w)}>
                            <Check className="h-4 w-4 mr-1" /> Gedaan
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </AsCard>
              );
            })}
          </div>
        )}
      </AsPage>
    </DashboardLayout>
  );
};

export default WerkplaatsUitdeuken;