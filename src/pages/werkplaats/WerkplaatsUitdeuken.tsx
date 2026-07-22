import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentBranch, applyBranchFilter } from "@/contexts/BranchContext";
import BranchFilter from "@/components/reports/BranchFilter";
import { WorkshopPhoto } from "@/components/werkplaats/WorkshopPhoto";
import { Flame, Loader2, Hammer } from "lucide-react";
import { AsPage, AsCard, AsCardHead } from "@/components/aftersales/ui";

interface WO {
  id: string; description: string; status: string; is_rush: boolean; sort_order: number;
  photos: string[] | null; branch: string | null;
  vehicle: { brand: string; model: string; license_number: string | null } | null;
}

const statusLabel = (s: string) => s === "ingepland" ? "Open bij uitdeuker" : s === "afgerond" ? "Afgevinkt — controleer" : s;

const WerkplaatsUitdeuken: React.FC = () => {
  const { branchFilter } = useCurrentBranch();
  const [rows, setRows] = useState<WO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let q = supabase.from("work_orders")
        .select("id, description, status, is_rush, sort_order, photos, branch, vehicle:vehicles!work_orders_vehicle_id_fkey(brand, model, license_number)")
        .eq("discipline", "uitdeuk")
        .not("status", "in", "(geannuleerd,goedgekeurd)")
        .order("is_rush", { ascending: false })
        .order("sort_order", { ascending: true });
      q = applyBranchFilter(q as any, branchFilter);
      const { data } = await q;
      setRows((data as any) || []);
      setLoading(false);
    };
    load();
  }, [branchFilter]);

  return (
    <DashboardLayout>
      <AsPage>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Uitdeuken (extern)</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">Werkorders bij externe uitdeuk-partner.</p>
          </div>
          <BranchFilter />
        </div>

        <AsCard className="overflow-hidden">
          <AsCardHead
            tone="amber"
            icon={<Hammer className="h-4 w-4" />}
            title="Open uitdeuk-orders"
            subtitle="Volgorde = prioriteit"
            count={rows.length}
          />
          {loading ? (
            <div className="flex items-center gap-2 text-slate-500 p-6 border-t border-slate-100"><Loader2 className="h-4 w-4 animate-spin" /> Laden…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-[13px] border-t border-slate-100">Geen open uitdeuk-taken.</div>
          ) : (
            <div className="border-t border-slate-100">
              {rows.map((w, idx) => (
                <div key={w.id} className="flex items-start gap-4 px-5 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                  <div className="text-xl font-black text-slate-300 w-8 text-center tabular-nums">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-slate-900">{w.vehicle?.brand} {w.vehicle?.model} · <span className="font-mono text-slate-600">{w.vehicle?.license_number || "—"}</span></div>
                    <div className="text-sm text-slate-600 mt-1">{w.description}</div>
                    {w.photos && w.photos.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {w.photos.map((p, i) => <WorkshopPhoto key={i} path={p} className="w-20 h-20" />)}
                      </div>
                    )}
                    <div className="flex gap-1 mt-2">
                      {w.is_rush && <Badge className="bg-red-500 text-white"><Flame className="h-3 w-3 mr-1" />Spoed</Badge>}
                      <Badge variant="outline">{statusLabel(w.status)}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AsCard>
      </AsPage>
    </DashboardLayout>
  );
};

export default WerkplaatsUitdeuken;