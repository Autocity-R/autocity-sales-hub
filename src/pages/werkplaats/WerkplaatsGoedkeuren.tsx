import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentBranch, applyBranchFilter } from "@/contexts/BranchContext";
import BranchFilter from "@/components/reports/BranchFilter";
import { WorkshopPhoto } from "@/components/werkplaats/WorkshopPhoto";
import { DISCIPLINE_LABELS, WorkOrderDiscipline } from "@/components/werkplaats/workOrderTypes";
import { Check, Loader2, Undo2, Timer } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface WO {
  id: string; discipline: string; description: string; is_rush: boolean;
  photos: string[] | null; result_photos: string[] | null;
  work_seconds: number | null; finish_note: string | null; branch: string | null;
  vehicle: { brand: string; model: string; license_number: string | null } | null;
}

const fmtSec = (s: number | null) => {
  if (!s || s <= 0) return "—";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}u ${m}m` : `${m} min`;
};

const WerkplaatsGoedkeuren: React.FC = () => {
  const { branchFilter } = useCurrentBranch();
  const [rows, setRows] = useState<WO[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("work_orders")
      .select("id, discipline, description, is_rush, photos, result_photos, work_seconds, finish_note, branch, vehicle:vehicles!work_orders_vehicle_id_fkey(brand, model, license_number)")
      .eq("status", "afgerond")
      .order("finished_at", { ascending: true });
    q = applyBranchFilter(q as any, branchFilter);
    const { data } = await q;
    setRows((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-line */ }, [branchFilter]);

  const approve = async (w: WO) => {
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("work_orders").update({
      status: "goedgekeurd", approved_by: userRes.user?.id ?? null, approved_at: new Date().toISOString(),
    }).eq("id", w.id);
    if (error) toast({ title: "Fout", description: error.message, variant: "destructive" });
    else { toast({ title: "Goedgekeurd" }); load(); }
  };

  const reject = async (w: WO) => {
    const note = window.prompt("Waarom terugsturen?");
    if (!note) return;
    const { data: bounds } = await supabase.from("work_orders")
      .select("sort_order").eq("discipline", w.discipline).in("status", ["ingepland", "bezig"])
      .order("sort_order", { ascending: true }).limit(1);
    const minSort = ((bounds as any)?.[0]?.sort_order ?? 10) - 10;

    const { data: cur } = await supabase.from("work_orders").select("rejected_count").eq("id", w.id).single();
    const { error } = await supabase.from("work_orders").update({
      status: "ingepland", sort_order: minSort, reject_note: note,
      rejected_count: ((cur as any)?.rejected_count ?? 0) + 1,
    }).eq("id", w.id);
    if (error) toast({ title: "Fout", description: error.message, variant: "destructive" });
    else { toast({ title: "Teruggestuurd" }); load(); }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold">Goedkeuren <Badge className="ml-2">{rows.length}</Badge></h1>
          <p className="text-muted-foreground">Afgeronde werkorders controleren en akkoord geven.</p>
        </div>
        <BranchFilter />
      </div>

      {loading ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Laden…</div>
        : rows.length === 0 ? <p className="text-muted-foreground">Geen orders wachten op goedkeuring.</p>
          : (
            <div className="space-y-3">
              {rows.map(w => (
                <Card key={w.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-lg">{w.vehicle?.brand} {w.vehicle?.model} · {w.vehicle?.license_number || "—"}</div>
                        <div className="text-sm text-muted-foreground">{DISCIPLINE_LABELS[w.discipline as WorkOrderDiscipline] || w.discipline}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="default" onClick={() => approve(w)}><Check className="h-4 w-4 mr-1" />Goedkeuren</Button>
                        <Button variant="outline" onClick={() => reject(w)}><Undo2 className="h-4 w-4 mr-1" />Terugsturen</Button>
                      </div>
                    </div>
                    <div className="text-sm">{w.description}</div>
                    {w.finish_note && <div className="text-sm italic text-muted-foreground">Notitie: {w.finish_note}</div>}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Timer className="h-4 w-4" /> Werktijd: {fmtSec(w.work_seconds)}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-xs uppercase tracking-wide mb-1">Opdracht-foto's</div>
                        <div className="flex flex-wrap gap-2">
                          {(w.photos || []).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                          {(w.photos || []).map((p, i) => <WorkshopPhoto key={i} path={p} className="w-24 h-24" />)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide mb-1">Resultaat-foto's</div>
                        <div className="flex flex-wrap gap-2">
                          {(w.result_photos || []).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                          {(w.result_photos || []).map((p, i) => <WorkshopPhoto key={i} path={p} className="w-24 h-24" />)}
                        </div>
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

export default WerkplaatsGoedkeuren;