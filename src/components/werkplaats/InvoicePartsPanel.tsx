import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Plus } from "lucide-react";
import { eur, verkoopprijsUitInkoop } from "@/services/werkplaatsPrijsService";

export interface PartOrderRow {
  id: string;
  part_name: string;
  note: string | null;
  status: string;
  aantal: number | null;
  inkoopprijs_per_stuk: number | null;
  leverancier: string | null;
}

export interface PartAddPayload {
  partOrderId: string;
  description: string;
  qty: number;
  unitPrice: number;
  inkoop: number | null;
}

interface Props {
  vehicleId: string | null;
  margePct: number;
  /** ids die al als factuurregel in dit concept staan */
  usedIds: string[];
  onAdd: (p: PartAddPayload) => void;
}

/**
 * "Bestelde onderdelen voor deze auto" — intern hulpblok in de factuurmaker.
 * Inkoopprijzen en marges zijn uitsluitend hier zichtbaar, nooit op de klant-PDF.
 */
const InvoicePartsPanel: React.FC<Props> = ({ vehicleId, margePct, usedIds, onAdd }) => {
  const [rows, setRows] = useState<PartOrderRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vehicleId) { setRows([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("parts_orders")
        .select("id, part_name, note, status, aantal, inkoopprijs_per_stuk, leverancier")
        .eq("vehicle_id", vehicleId)
        .is("doorbelast_invoice_id", null)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setRows((data as PartOrderRow[]) || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [vehicleId]);

  if (!vehicleId) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-800">
          <Package className="h-3.5 w-3.5" />📦 Bestelde onderdelen voor deze auto
        </div>
        <span className="text-[11px] text-slate-400">marge {margePct}% · intern</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-[12px] text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Laden…
        </div>
      ) : rows.length === 0 ? (
        <div className="py-4 text-center text-[12px] text-slate-400">
          Geen openstaande onderdelen voor deze auto.
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
          {rows.map((r) => {
            const qty = Math.max(1, Number(r.aantal) || 1);
            const inkoop = r.inkoopprijs_per_stuk == null ? null : Number(r.inkoopprijs_per_stuk);
            const verkoop = inkoop == null ? 0 : verkoopprijsUitInkoop(inkoop, margePct);
            const used = usedIds.includes(r.id);
            return (
              <div key={r.id} className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-slate-900 truncate">
                    {r.part_name} <span className="text-slate-500 font-medium">× {qty}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {r.leverancier ? `${r.leverancier} · ` : ""}
                    {inkoop == null
                      ? "inkoopprijs onbekend"
                      : `inkoop ${eur(inkoop)} p/st → voorstel ${eur(verkoop)} p/st`}
                    {` · ${r.status}`}
                  </div>
                </div>
                <Button
                  type="button" size="sm" variant="outline" className="h-8 text-[11.5px] shrink-0"
                  disabled={used}
                  onClick={() => onAdd({
                    partOrderId: r.id,
                    description: r.part_name,
                    qty,
                    unitPrice: verkoop,
                    inkoop,
                  })}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />{used ? "Toegevoegd" : "Doorbelasten"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InvoicePartsPanel;