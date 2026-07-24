import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { AsPage, AsCard, AsLicensePlate, AsPill } from "@/components/aftersales/ui";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Check, PackageCheck, PackageOpen, Truck, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddPartOrderDialog } from "@/components/aftersales/AddPartOrderDialog";

type Status = "te_bestellen" | "besteld" | "binnen";

interface PartOrder {
  id: string;
  vehicle_id: string;
  part_name: string;
  note: string | null;
  status: Status;
  ordered_at: string | null;
  arrived_at: string | null;
  branch: string;
  created_at: string;
  vehicle?: {
    id: string; brand: string; model: string; year: number | null;
    license_number: string | null; vin: string | null;
  } | null;
}

const STATUS_META: Record<Status, { label: string; tone: any; icon: any }> = {
  te_bestellen: { label: "Nog niet besteld", tone: "amber", icon: PackageOpen },
  besteld:      { label: "Besteld",      tone: "blue",  icon: Truck },
  binnen:       { label: "Binnen",       tone: "green", icon: PackageCheck },
};

const WerkplaatsOnderdelen: React.FC = () => {
  const [orders, setOrders] = useState<PartOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("parts_orders")
      .select("id, vehicle_id, part_name, note, status, ordered_at, arrived_at, branch, created_at, vehicle:vehicles!parts_orders_vehicle_id_fkey(id, brand, model, year, license_number, vin)")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Fout bij laden", description: error.message, variant: "destructive" });
    setOrders((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, next: Status) => {
    setBusy(id);
    const patch: any = { status: next };
    if (next === "besteld") patch.ordered_at = new Date().toISOString();
    if (next === "binnen") patch.arrived_at = new Date().toISOString();
    const { error } = await supabase.from("parts_orders").update(patch).eq("id", id);
    setBusy(null);
    if (error) { toast({ title: "Fout", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Status → ${STATUS_META[next].label}` });
    load();
  };

  const removeOrder = async (id: string) => {
    if (!window.confirm("Onderdeel-bestelling verwijderen?")) return;
    setBusy(id);
    const { error } = await supabase.from("parts_orders").delete().eq("id", id);
    setBusy(null);
    if (error) { toast({ title: "Fout", description: error.message, variant: "destructive" }); return; }
    load();
  };

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q ? orders.filter(o =>
      o.part_name.toLowerCase().includes(q) ||
      (o.vehicle?.brand || "").toLowerCase().includes(q) ||
      (o.vehicle?.model || "").toLowerCase().includes(q) ||
      (o.vehicle?.license_number || "").toLowerCase().includes(q),
    ) : orders;
    return {
      te_bestellen: filtered.filter(o => o.status === "te_bestellen"),
      besteld:      filtered.filter(o => o.status === "besteld"),
      binnen:       filtered.filter(o => o.status === "binnen"),
    };
  }, [orders, filter]);

  const renderCard = (o: PartOrder) => {
    const v = o.vehicle;
    const tone: any = o.status === "binnen" ? "green" : o.status === "besteld" ? "blue" : "amber";
    const statusLabel = STATUS_META[o.status].label;
    return (
      <div key={o.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        <div className="flex items-start gap-2">
          <AsLicensePlate value={v?.license_number} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-slate-900 truncate">
              {v?.brand} {v?.model}
              {v?.year && <span className="text-slate-500 font-medium"> · {v.year}</span>}
            </div>
            {v?.vin && (
              <div className="text-[10.5px] font-mono text-slate-500 truncate">VIN {v.vin}</div>
            )}
            <div className="text-[13px] text-slate-900 mt-1.5">
              <span className="font-bold">{o.part_name}</span>
              {o.note && <span className="text-slate-500 font-normal"> — {o.note}</span>}
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={() => removeOrder(o.id)} className="h-7 w-7 text-slate-400 hover:text-red-600">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-1.5 mt-3">
          <AsPill tone={tone}>{statusLabel}</AsPill>
          <div className="ml-auto flex gap-1.5">
          {o.status === "te_bestellen" && (
            <Button size="sm" className="h-8 text-[12px] bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={busy === o.id} onClick={() => setStatus(o.id, "besteld")}>
              <Truck className="h-3.5 w-3.5 mr-1" /> Markeer besteld
            </Button>
          )}
          {o.status === "besteld" && (
            <Button size="sm" className="h-8 text-[12px] bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={busy === o.id} onClick={() => setStatus(o.id, "binnen")}>
              <Check className="h-3.5 w-3.5 mr-1" /> Binnen
            </Button>
          )}
          {o.status === "binnen" && (
            <div className="text-[11px] text-slate-500">
              Binnen op {o.arrived_at ? new Date(o.arrived_at).toLocaleDateString("nl-NL") : "—"}
            </div>
          )}
          </div>
        </div>
      </div>
    );
  };

  const Column: React.FC<{ status: Status; items: PartOrder[] }> = ({ status, items }) => {
    const meta = STATUS_META[status];
    const Icon = meta.icon;
    return (
      <AsCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="h-4 w-4 text-slate-500" />
          <div className="text-[13px] font-semibold text-slate-900">{meta.label}</div>
          <AsPill tone={meta.tone} className="ml-auto">{items.length}</AsPill>
        </div>
        {items.length === 0 ? (
          <div className="text-[12px] text-slate-400 border border-dashed border-slate-200 rounded-lg p-4 text-center bg-white">
            Leeg
          </div>
        ) : (
          <div className="space-y-2">{items.map(renderCard)}</div>
        )}
      </AsCard>
    );
  };

  return (
    <DashboardLayout>
      <AsPage>
        <div className="flex items-center justify-between mb-4 gap-3">
          <div>
            <div className="text-[18px] font-bold text-slate-900 tracking-tight">Onderdelen</div>
            <div className="text-[12.5px] text-slate-500">Overzicht van bestelde onderdelen per voertuig</div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Zoek op onderdeel, merk, model, kenteken…"
              value={filter} onChange={(e) => setFilter(e.target.value)}
              className="w-72 bg-white"
            />
            <Button onClick={() => setAddOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-1" /> Onderdeel bestellen
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 py-16 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Laden…
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            <Column status="te_bestellen" items={grouped.te_bestellen} />
            <Column status="besteld" items={grouped.besteld} />
            <Column status="binnen" items={grouped.binnen} />
          </div>
        )}

        <AddPartOrderDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          onCreated={() => load()}
        />
      </AsPage>
    </DashboardLayout>
  );
};

export default WerkplaatsOnderdelen;