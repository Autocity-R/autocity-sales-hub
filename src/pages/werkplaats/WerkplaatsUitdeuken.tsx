import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentBranch, applyBranchFilter } from "@/contexts/BranchContext";
import BranchFilter from "@/components/reports/BranchFilter";
import { WorkshopPhoto } from "@/components/werkplaats/WorkshopPhoto";
import { Flame, Loader2 } from "lucide-react";

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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Uitdeuken (extern)</h1>
        <BranchFilter />
      </div>
      {loading ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Laden…</div>
        : rows.length === 0 ? <p className="text-muted-foreground">Geen open uitdeuk-taken.</p>
          : (
            <div className="space-y-2">
              {rows.map((w, idx) => (
                <Card key={w.id}>
                  <CardContent className="p-3 flex items-start gap-4">
                    <div className="text-2xl font-black text-muted-foreground w-8 text-center">{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{w.vehicle?.brand} {w.vehicle?.model} · {w.vehicle?.license_number || "—"}</div>
                      <div className="text-sm mt-1">{w.description}</div>
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
    </DashboardLayout>
  );
};

export default WerkplaatsUitdeuken;