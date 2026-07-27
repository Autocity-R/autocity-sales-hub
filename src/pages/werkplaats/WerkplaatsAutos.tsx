import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentBranch, applyBranchFilter } from "@/contexts/BranchContext";
import BranchFilter from "@/components/reports/BranchFilter";
import { AddWorkOrderDialog } from "@/components/werkplaats/AddWorkOrderDialog";
import { DISCIPLINE_ICON, DISCIPLINE_LABELS, STATUS_COLORS, WorkOrderDiscipline, WorkOrderStatus } from "@/components/werkplaats/workOrderTypes";
import { Car, Loader2, Plus } from "lucide-react";

type TabKey = "voorraad" | "verkocht_b2c" | "afgeleverd";

interface Row {
  id: string;
  brand: string;
  model: string;
  license_number: string | null;
  status: string;
  branch: string | null;
  delivery_date: string | null;
  main_photo?: string | null;
  work_orders: { id: string; discipline: string; status: string; warranty_claim_id: string | null }[];
}

const WerkplaatsAutos: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const initial = (params.get("tab") as TabKey) || "voorraad";
  const [tab, setTab] = useState<TabKey>(initial);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const { branchFilter } = useCurrentBranch();
  const [addFor, setAddFor] = useState<Row | null>(null);

  useEffect(() => { setParams({ tab }, { replace: true }); }, [tab]);

  const load = async () => {
    setLoading(true);
    try {
      const statusFilter: string[] = tab === "voorraad"
        ? ["voorraad", "onderweg", "transport"]
        : tab === "verkocht_b2c" ? ["verkocht_b2c"] : ["afgeleverd"];

      let q1 = supabase
        .from("vehicles")
        .select("id, brand, model, license_number, status, branch, delivery_date, details")
        .in("status", statusFilter)
        .order("created_at", { ascending: false })
        .limit(300);
      q1 = applyBranchFilter(q1, branchFilter);
      const { data: vehs, error } = await q1;
      if (error) throw error;

      const ids = ((vehs as any[]) || []).map(v => v.id);
      let wos: any[] = [];
      if (ids.length) {
        const { data } = await supabase
          .from("work_orders")
          .select("id, discipline, status, warranty_claim_id, vehicle_id")
          .in("vehicle_id", ids)
          .not("status", "in", "(goedgekeurd,geannuleerd)");
        wos = data || [];
      }
      const grouped: Record<string, any[]> = {};
      for (const w of wos) (grouped[w.vehicle_id] ||= []).push(w);

      setRows(((vehs as any[]) || []).map(v => ({
        id: v.id, brand: v.brand, model: v.model,
        license_number: v.license_number, status: v.status, branch: v.branch,
        delivery_date: v.delivery_date, main_photo: v.details?.mainPhoto ?? null,
        work_orders: grouped[v.id] || [],
      })));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, [tab, branchFilter]);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const s = q.toLowerCase();
    return rows.filter(r =>
      r.brand?.toLowerCase().includes(s) || r.model?.toLowerCase().includes(s) ||
      r.license_number?.toLowerCase().includes(s)
    );
  }, [rows, q]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Auto's</h1>
        <BranchFilter />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="mb-4">
        <TabsList>
          <TabsTrigger value="voorraad">Voorraad</TabsTrigger>
          <TabsTrigger value="verkocht_b2c">Verkocht B2C</TabsTrigger>
          <TabsTrigger value="afgeleverd">Afgeleverd</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-4 max-w-sm">
        <Input placeholder="Zoek op merk, model of kenteken…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Laden…</div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">Geen voertuigen gevonden.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(v => (
            <Card key={v.id}>
              <CardContent className="p-3 flex items-center gap-4">
                <div className="w-16 h-12 rounded bg-muted overflow-hidden flex items-center justify-center">
                  {v.main_photo ? <img src={v.main_photo} alt="" className="w-full h-full object-cover" /> : <Car className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{v.brand} {v.model}</div>
                  <div className="text-xs text-muted-foreground">
                    {v.license_number || "—"} {v.delivery_date ? `· Aflevering ${new Date(v.delivery_date).toLocaleDateString("nl-NL")}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-wrap justify-end max-w-[45%]">
                  {v.work_orders.length === 0 && <span className="text-xs text-muted-foreground">Geen open taken</span>}
                  {v.work_orders.map(w => (
                    <Badge key={w.id} variant="outline" className={STATUS_COLORS[w.status as WorkOrderStatus] || ""}>
                      {DISCIPLINE_ICON[w.discipline as WorkOrderDiscipline] || "•"} {DISCIPLINE_LABELS[w.discipline as WorkOrderDiscipline] || w.discipline} · {w.status}
                      {w.warranty_claim_id ? " · 🛡" : ""}
                    </Badge>
                  ))}
                </div>
                <Button size="sm" onClick={() => setAddFor(v)}>
                  <Plus className="h-4 w-4 mr-1" /> Taak toewijzen
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {addFor && (
        <AddWorkOrderDialog
          open
          onOpenChange={(v) => { if (!v) setAddFor(null); }}
          vehicleId={addFor.id}
          vehicleLabel={`${addFor.brand} ${addFor.model} · ${addFor.license_number || ""}`}
          branch={addFor.branch}
          onCreated={load}
        />
      )}
    </DashboardLayout>
  );
};

export default WerkplaatsAutos;