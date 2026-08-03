import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { AsPage, AsCard, AsCardHead, AsLicensePlate, AsPill } from "@/components/aftersales/ui";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Check, PackageCheck, PackageOpen, Truck, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { AddPartOrderDialog } from "@/components/aftersales/AddPartOrderDialog";
import { eur } from "@/services/werkplaatsPrijsService";

type Status = "te_bestellen" | "besteld" | "binnen";

interface PartOrder {
  id: string;
  vehicle_id: string | null;
  manual_brand?: string | null;
  manual_model?: string | null;
  manual_license?: string | null;
  part_name: string;
  note: string | null;
  status: Status;
  ordered_at: string | null;
  arrived_at: string | null;
  aantal: number | null;
  inkoopprijs_per_stuk: number | null;
  leverancier: string | null;
  doorbelast_invoice_id: string | null;
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

/* Moduleniveau: voorkomt remount (en focusverlies) bij elke toetsaanslag. */
const InkoopEditor: React.FC<{
  order: PartOrder;
  disabled?: boolean;
  onSave: (id: string, patch: { aantal: number; inkoopprijs_per_stuk: number | null; leverancier: string | null }) => void;
}> = ({ order, disabled, onSave }) => {
  const [aantal, setAantal] = useState(String(order.aantal ?? 1));
  const [inkoop, setInkoop] = useState(order.inkoopprijs_per_stuk == null ? "" : String(order.inkoopprijs_per_stuk));
  const [lev, setLev] = useState(order.leverancier ?? "");

  const commit = () => {
    if (disabled) return;
    const next = {
      aantal: Math.max(1, Number(aantal) || 1),
      inkoopprijs_per_stuk: inkoop.trim() === "" ? null : Number(inkoop.replace(",", ".")) || 0,
      leverancier: lev.trim() || null,
    };
    const changed =
      next.aantal !== (order.aantal ?? 1) ||
      next.inkoopprijs_per_stuk !== (order.inkoopprijs_per_stuk == null ? null : Number(order.inkoopprijs_per_stuk)) ||
      next.leverancier !== (order.leverancier ?? null);
    if (changed) onSave(order.id, next);
  };

  return (
    <div className="mt-2 grid grid-cols-3 gap-1.5">
      <Input
        type="number" min="1" step="1" value={aantal} disabled={disabled}
        onChange={(e) => setAantal(e.target.value)} onBlur={commit}
        className="h-8 text-[11.5px] text-right tabular-nums" placeholder="Aantal"
      />
      <Input
        type="number" step="0.01" min="0" value={inkoop} disabled={disabled}
        onChange={(e) => setInkoop(e.target.value)} onBlur={commit}
        className="h-8 text-[11.5px] text-right tabular-nums" placeholder="Inkoop p/st"
      />
      <Input
        value={lev} disabled={disabled}
        onChange={(e) => setLev(e.target.value)} onBlur={commit}
        className="h-8 text-[11.5px]" placeholder="Leverancier"
      />
    </div>
  );
};

const WerkplaatsOnderdelen: React.FC = () => {
  const readOnly = useRoleAccess().isDirectieReadOnly();
  const [orders, setOrders] = useState<PartOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("parts_orders")
      .select("id, vehicle_id, manual_brand, manual_model, manual_license, part_name, note, status, ordered_at, arrived_at, aantal, inkoopprijs_per_stuk, leverancier, doorbelast_invoice_id, branch, created_at, vehicle:vehicles!parts_orders_vehicle_id_fkey(id, brand, model, year, license_number, vin)")
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
    if (readOnly) return;
    if (!window.confirm("Onderdeel-bestelling verwijderen?")) return;
    setBusy(id);
    const { error } = await supabase.from("parts_orders").delete().eq("id", id);
    setBusy(null);
    if (error) { toast({ title: "Fout", description: error.message, variant: "destructive" }); return; }
    load();
  };

  const saveInkoop = async (
    id: string,
    patch: { aantal: number; inkoopprijs_per_stuk: number | null; leverancier: string | null },
  ) => {
    const { error } = await (supabase as any).from("parts_orders").update(patch).eq("id", id);
    if (error) { toast({ title: "Opslaan mislukt", description: error.message, variant: "destructive" }); return; }
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q ? orders.filter(o =>
      o.part_name.toLowerCase().includes(q) ||
      (o.vehicle?.brand || "").toLowerCase().includes(q) ||
      (o.vehicle?.model || "").toLowerCase().includes(q) ||
      (o.vehicle?.license_number || "").toLowerCase().includes(q) ||
      (o.manual_brand || "").toLowerCase().includes(q) ||
      (o.manual_model || "").toLowerCase().includes(q) ||
      (o.manual_license || "").toLowerCase().includes(q),
    ) : orders;
    return {
      te_bestellen: filtered.filter(o => o.status === "te_bestellen"),
      besteld:      filtered.filter(o => o.status === "besteld"),
      binnen:       filtered.filter(o => o.status === "binnen"),
    };
  }, [orders, filter]);

  const renderCard = (o: PartOrder) => {
    const v = o.vehicle;
    const isManual = !o.vehicle_id;
    const tone: any = o.status === "binnen" ? "green" : o.status === "besteld" ? "blue" : "amber";
    const statusLabel = STATUS_META[o.status].label;
    return (
      <div key={o.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        <div className="flex items-start gap-2">
          <AsLicensePlate value={isManual ? o.manual_license : v?.license_number} size="sm" />
          <div className="min-w-0 flex-1">
            {isManual ? (
              <div className="text-[13px] font-semibold text-slate-900 truncate flex items-center gap-1.5">
                <span className="truncate">{o.manual_brand} {o.manual_model}</span>
                <AsPill tone="slate">extern</AsPill>
              </div>
            ) : (
              <div className="text-[13px] font-semibold text-slate-900 truncate">
                {v?.brand} {v?.model}
                {v?.year && <span className="text-slate-500 font-medium"> · {v.year}</span>}
              </div>
            )}
            {!isManual && v?.vin && (
              <div className="text-[10.5px] font-mono text-slate-500 truncate">VIN {v.vin}</div>
            )}
            <div className="text-[13px] text-slate-900 mt-1.5">
              <span className="font-bold">{o.part_name}</span>
              {(o.aantal ?? 1) > 1 && <span className="text-slate-500 font-medium"> × {o.aantal}</span>}
              {o.note && <span className="text-slate-500 font-normal"> — {o.note}</span>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
              {o.inkoopprijs_per_stuk != null
                ? <span>Inkoop {eur(Number(o.inkoopprijs_per_stuk))} p/st ex btw</span>
                : <span className="text-slate-400">Inkoopprijs onbekend</span>}
              {o.leverancier && <span>· {o.leverancier}</span>}
              {o.doorbelast_invoice_id && <AsPill tone="green">Doorbelast</AsPill>}
            </div>
            <InkoopEditor order={o} disabled={readOnly} onSave={saveInkoop} />
          </div>
          {!readOnly && <Button size="icon" variant="ghost" onClick={() => removeOrder(o.id)} className="h-7 w-7 text-slate-400 hover:text-red-600">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>}
        </div>
        <div className="flex items-center gap-1.5 mt-3">
          <AsPill tone={tone}>{statusLabel}</AsPill>
          <div className="ml-auto flex gap-1.5">
          {!readOnly && o.status === "te_bestellen" && (
            <Button size="sm" className="h-8 text-[12px] bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={busy === o.id} onClick={() => setStatus(o.id, "besteld")}>
              <Truck className="h-3.5 w-3.5 mr-1" /> Markeer besteld
            </Button>
          )}
          {!readOnly && o.status === "besteld" && (
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
    const tone: any = status === "binnen" ? "green" : status === "besteld" ? "blue" : "amber";
    return (
      <AsCard>
        <AsCardHead
          tone={tone}
          icon={<Icon className="h-4 w-4" />}
          title={meta.label}
          subtitle={status === "te_bestellen" ? "Nog niet besteld" : status === "besteld" ? "Onderweg" : "Binnengekomen"}
          count={items.length}
        />
        <div className="p-4">
        {items.length === 0 ? (
          <div className="text-[12px] text-slate-400 border border-dashed border-slate-200 rounded-lg p-4 text-center bg-white">
            Leeg
          </div>
        ) : (
          <div className="space-y-2">{items.map(renderCard)}</div>
        )}
        </div>
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
            {!readOnly && (
              <Button onClick={() => setAddOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-1" /> Onderdeel bestellen
              </Button>
            )}
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