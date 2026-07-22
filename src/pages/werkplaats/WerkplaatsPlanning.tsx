import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentBranch, applyBranchFilter } from "@/contexts/BranchContext";
import BranchFilter from "@/components/reports/BranchFilter";
import { STATUS_COLORS, WorkOrderStatus } from "@/components/werkplaats/workOrderTypes";
import { ArrowUp, ArrowDown, Flame, Loader2, Shield, Timer } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface WO {
  id: string;
  discipline: string;
  description: string;
  status: string;
  is_rush: boolean;
  sort_order: number;
  started_at: string | null;
  warranty_claim_id: string | null;
  source: string | null;
  branch: string | null;
  vehicle: { id: string; brand: string; model: string; license_number: string | null } | null;
}

const formatDuration = (started: string) => {
  const s = Math.floor((Date.now() - new Date(started).getTime()) / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

const Column: React.FC<{
  title: string;
  items: WO[];
  onReorder: (id: string, dir: -1 | 1) => void;
  onToggleRush: (wo: WO) => void;
  onDrop: (dragId: string, targetId: string) => void;
  tick: number;
}> = ({ title, items, onReorder, onToggleRush, onDrop, tick }) => {
  const [dragId, setDragId] = useState<string | null>(null);
  return (
    <div className="flex-1 min-w-0">
      <div className="mb-2 font-semibold text-lg flex items-center gap-2">
        {title} <span className="text-sm text-muted-foreground">({items.length})</span>
      </div>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">Geen open orders.</p>}
        {items.map((w, idx) => (
          <Card
            key={w.id}
            draggable
            onDragStart={() => setDragId(w.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragId && dragId !== w.id) onDrop(dragId, w.id); setDragId(null); }}
            className={`${w.is_rush ? "border-red-400" : ""} cursor-grab`}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="text-3xl font-black text-muted-foreground w-8 text-center">{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    {w.vehicle?.brand} {w.vehicle?.model} · {w.vehicle?.license_number || "—"}
                  </div>
                  <div className="text-sm mt-1">{w.description}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {w.is_rush && <Badge className="bg-red-500 text-white"><Flame className="h-3 w-3 mr-1" />Spoed</Badge>}
                    {w.warranty_claim_id && <Badge className="bg-purple-500 text-white"><Shield className="h-3 w-3 mr-1" />Garantie</Badge>}
                    <Badge variant="outline" className={STATUS_COLORS[w.status as WorkOrderStatus] || ""}>{w.status}</Badge>
                    {w.status === "bezig" && w.started_at && (
                      <Badge variant="outline"><Timer className="h-3 w-3 mr-1" />{formatDuration(w.started_at)}<span className="hidden">{tick}</span></Badge>
                    )}
                    {w.source && <Badge variant="outline">Bron: {w.source}</Badge>}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="icon" variant="outline" onClick={() => onReorder(w.id, -1)} title="Omhoog"><ArrowUp className="h-4 w-4" /></Button>
                  <Button size="icon" variant="outline" onClick={() => onReorder(w.id, 1)} title="Omlaag"><ArrowDown className="h-4 w-4" /></Button>
                  <Button size="icon" variant={w.is_rush ? "default" : "outline"} onClick={() => onToggleRush(w)} title="Spoed"><Flame className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

const WerkplaatsPlanning: React.FC = () => {
  const { branchFilter } = useCurrentBranch();
  const [rows, setRows] = useState<WO[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("work_orders")
      .select("id, discipline, description, status, is_rush, sort_order, started_at, warranty_claim_id, source, branch, vehicle:vehicles!work_orders_vehicle_id_fkey(id, brand, model, license_number)")
      .in("status", ["ingepland", "bezig"])
      .in("discipline", ["spuit", "werkplaats"])
      .order("is_rush", { ascending: false })
      .order("sort_order", { ascending: true });
    q = applyBranchFilter(q as any, branchFilter);
    const { data, error } = await q;
    if (error) { toast({ title: "Fout bij laden", description: error.message, variant: "destructive" }); }
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, [branchFilter]);

  const spuit = rows.filter(r => r.discipline === "spuit");
  const werkplaats = rows.filter(r => r.discipline === "werkplaats");

  const reorder = async (id: string, dir: -1 | 1) => {
    const list = rows.find(r => r.id === id)?.discipline === "spuit" ? spuit : werkplaats;
    const idx = list.findIndex(w => w.id === id);
    const swapWith = list[idx + dir];
    if (!swapWith) return;
    const a = list[idx].sort_order;
    const b = swapWith.sort_order;
    await supabase.from("work_orders").update({ sort_order: b }).eq("id", list[idx].id);
    await supabase.from("work_orders").update({ sort_order: a }).eq("id", swapWith.id);
    load();
  };

  const toggleRush = async (w: WO) => {
    await supabase.from("work_orders").update({ is_rush: !w.is_rush }).eq("id", w.id);
    load();
  };

  const onDrop = async (dragId: string, targetId: string) => {
    const drag = rows.find(r => r.id === dragId);
    const target = rows.find(r => r.id === targetId);
    if (!drag || !target || drag.discipline !== target.discipline) return;
    await supabase.from("work_orders").update({ sort_order: target.sort_order - 1 }).eq("id", dragId);
    load();
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Planning</h1>
        <BranchFilter />
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Laden…</div>
      ) : (
        <div className="flex gap-6 flex-col lg:flex-row">
          <Column title="🎨 Spuiterij" items={spuit} onReorder={reorder} onToggleRush={toggleRush} onDrop={onDrop} tick={tick} />
          <Column title="🔧 Werkplaats" items={werkplaats} onReorder={reorder} onToggleRush={toggleRush} onDrop={onDrop} tick={tick} />
        </div>
      )}
    </DashboardLayout>
  );
};

export default WerkplaatsPlanning;