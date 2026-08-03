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
  vehicle_id?: string | null;
  manual_brand?: string | null;
  manual_model?: string | null;
  manual_license?: string | null;
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
  /** kenteken uit de factuur (ook bij handmatige auto) — matcht op manual_license */
  licensePlate?: string | null;
  margePct: number;
  /** ids die al als factuurregel in dit concept staan */
  usedIds: string[];
  onAdd: (p: PartAddPayload) => void;
}

const plateKey = (v?: string | null) => (v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * "Bestelde onderdelen voor deze auto" — intern hulpblok in de factuurmaker.
 * Inkoopprijzen en marges zijn uitsluitend hier zichtbaar, nooit op de klant-PDF.
 */
const InvoicePartsPanel: React.FC<Props> = ({ vehicleId, licensePlate, margePct, usedIds, onAdd }) => {
  const [rows, setRows] = useState<PartOrderRow[]>([]);
  const [loading, setLoading] = useState(false);

  const plate = plateKey(licensePlate);

  useEffect(() => {
    if (!vehicleId && plate.length < 4) { setRows([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const base = () => (supabase as any)
        .from("parts_orders")
        .select("id, part_name, note, status, aantal, inkoopprijs_per_stuk, leverancier, vehicle_id, manual_brand, manual_model, manual_license")
        .is("doorbelast_invoice_id", null)
        .order("created_at", { ascending: false });

      const collected: PartOrderRow[] = [];
      if (vehicleId) {
        const { data } = await base().eq("vehicle_id", vehicleId);
        collected.push(...((data as PartOrderRow[]) || []));
      }
      if (plate.length >= 4) {
        const { data } = await base().is("vehicle_id", null).not("manual_license", "is", null);
        const manual = ((data as PartOrderRow[]) || []).filter((r) => plateKey(r.manual_license) === plate);
        collected.push(...manual);
      }
      const seen = new Set<string>();
      const unique = collected.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
      if (cancelled) return;
      setRows(unique);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [vehicleId, plate]);

  if (!vehicleId && plate.length < 4) return null;

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
                    {!r.vehicle_id && r.manual_license ? `extern ${r.manual_license} · ` : ""}
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