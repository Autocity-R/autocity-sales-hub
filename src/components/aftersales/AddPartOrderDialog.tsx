import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AsLicensePlate } from "@/components/aftersales/ui";
import { Search, X, Car, Loader2, Plus, Save, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PartOrderVehicle {
  id: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  license_number: string | null;
  vin: string | null;
  branch?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  presetVehicle?: PartOrderVehicle | null;
  onCreated?: () => void;
  /** Wanneer gezet: bewerk-modus voor een bestaande bestelling */
  editOrder?: EditOrder | null;
  onUpdated?: () => void;
}

export interface EditOrder {
  id: string;
  vehicle_id: string | null;
  manual_brand?: string | null;
  manual_model?: string | null;
  manual_license?: string | null;
  part_name: string;
  note: string | null;
  aantal: number | null;
  inkoopprijs_per_stuk: number | null;
  leverancier: string | null;
  doorbelast_invoice_id?: string | null;
  vehicle?: PartOrderVehicle | null;
}

const SUGGESTIONS = [
  "Trekhaak", "Distributieriem", "Remschijven + blokken",
  "Accu", "Banden", "Ruitenwissers", "Anders…",
];

export const AddPartOrderDialog: React.FC<Props> = ({ open, onOpenChange, presetVehicle, onCreated, editOrder, onUpdated }) => {
  const isEdit = !!editOrder;
  const locked = !!editOrder?.doorbelast_invoice_id;
  const [vehicle, setVehicle] = useState<PartOrderVehicle | null>(presetVehicle ?? null);
  const [mode, setMode] = useState<"systeem" | "extern">("systeem");
  const [mBrand, setMBrand] = useState("");
  const [mModel, setMModel] = useState("");
  const [mLicense, setMLicense] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PartOrderVehicle[]>([]);
  const [searching, setSearching] = useState(false);
  const [partName, setPartName] = useState("");
  const [note, setNote] = useState("");
  const [aantal, setAantal] = useState("1");
  const [inkoop, setInkoop] = useState("");
  const [leverancier, setLeverancier] = useState("");
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<number | null>(null);

  // reset when dialog opens/closes or preset changes
  useEffect(() => {
    if (open) {
      if (editOrder) {
        const ext = !editOrder.vehicle_id;
        setVehicle(editOrder.vehicle ?? null);
        setMode(ext ? "extern" : "systeem");
        setMBrand(editOrder.manual_brand ?? "");
        setMModel(editOrder.manual_model ?? "");
        setMLicense(editOrder.manual_license ?? "");
        setQuery("");
        setResults([]);
        setPartName(editOrder.part_name ?? "");
        setNote(editOrder.note ?? "");
        setAantal(String(editOrder.aantal ?? 1));
        setInkoop(editOrder.inkoopprijs_per_stuk == null ? "" : String(editOrder.inkoopprijs_per_stuk));
        setLeverancier(editOrder.leverancier ?? "");
        return;
      }
      setVehicle(presetVehicle ?? null);
      setMode("systeem");
      setMBrand("");
      setMModel("");
      setMLicense("");
      setQuery("");
      setResults([]);
      setPartName("");
      setNote("");
      setAantal("1");
      setInkoop("");
      setLeverancier("");
    }
  }, [open, presetVehicle, editOrder]);

  // live search
  useEffect(() => {
    if (vehicle) return; // no search when a vehicle is selected
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("vehicles")
        .select("id, brand, model, year, license_number, vin, branch")
        .or(`license_number.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%,vin.ilike.%${q}%`)
        .limit(12);
      setResults((data as any) || []);
      setSearching(false);
    }, 220);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [query, vehicle]);

  const canSave = useMemo(() => {
    if (saving || locked || partName.trim().length === 0) return false;
    if (mode === "systeem") return !!vehicle;
    return mBrand.trim().length > 0 && mModel.trim().length > 0;
  }, [vehicle, partName, saving, mode, mBrand, mModel, locked]);

  const submitEdit = async () => {
    if (!canSave || !editOrder) return;
    setSaving(true);
    const { error } = await (supabase as any).from("parts_orders").update({
      vehicle_id: mode === "systeem" ? vehicle!.id : null,
      manual_brand: mode === "extern" ? mBrand.trim() : null,
      manual_model: mode === "extern" ? mModel.trim() : null,
      manual_license: mode === "extern" ? (mLicense.trim().toUpperCase() || null) : null,
      part_name: partName.trim(),
      note: note.trim() || null,
      aantal: Math.max(1, Number(aantal) || 1),
      inkoopprijs_per_stuk: inkoop.trim() === "" ? null : Number(inkoop.replace(",", ".")) || 0,
      leverancier: leverancier.trim() || null,
    }).eq("id", editOrder.id);
    setSaving(false);
    if (error) { toast({ title: "Opslaan mislukt", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Bestelling bijgewerkt" });
    onUpdated?.();
    onOpenChange(false);
  };

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("parts_orders").insert({
      vehicle_id: mode === "systeem" ? vehicle!.id : null,
      manual_brand: mode === "extern" ? mBrand.trim() : null,
      manual_model: mode === "extern" ? mModel.trim() : null,
      manual_license: mode === "extern" ? (mLicense.trim().toUpperCase() || null) : null,
      part_name: partName.trim(),
      note: note.trim() || null,
      status: "te_bestellen",
      aantal: Math.max(1, Number(aantal) || 1),
      inkoopprijs_per_stuk: inkoop.trim() === "" ? null : Number(inkoop.replace(",", ".")) || 0,
      leverancier: leverancier.trim() || null,
      branch: (mode === "systeem" ? vehicle?.branch : null) || "rotterdam",
      created_by: userRes.user?.id ?? null,
    });
    setSaving(false);
    if (error) { toast({ title: "Fout", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Bestelling toegevoegd" });
    onCreated?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-[16px]">{isEdit ? "Bestelling aanpassen" : "Onderdeel bestellen"}</DialogTitle>
        </DialogHeader>

        <div className={cn("space-y-4", locked && "opacity-70 pointer-events-none")}>
          {locked && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[12px] text-amber-900">
              <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Al doorbelast op factuur — niet meer aanpasbaar.</span>
            </div>
          )}
          {/* Mode switch */}
          {!presetVehicle && !locked && (
            <div className="flex gap-1.5">
              {([
                { k: "systeem", label: "Auto uit het systeem" },
                { k: "extern", label: "Extern / handmatig" },
              ] as const).map((t) => (
                <button
                  key={t.k}
                  type="button"
                  onClick={() => setMode(t.k)}
                  className={cn(
                    "text-[12px] px-3 py-1.5 rounded-lg border transition-colors",
                    mode === t.k
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {mode === "extern" && !presetVehicle ? (
            <div>
              <Label className="text-[12px] font-semibold text-slate-700">Voertuig (handmatig)</Label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                <Input value={mBrand} onChange={(e) => setMBrand(e.target.value)} placeholder="Merk" />
                <Input value={mModel} onChange={(e) => setMModel(e.target.value)} placeholder="Model" />
                <Input value={mLicense} onChange={(e) => setMLicense(e.target.value)} placeholder="Kenteken (optioneel)" />
              </div>
            </div>
          ) : (
          <div>
            <Label className="text-[12px] font-semibold text-slate-700">Auto koppelen</Label>
            {vehicle ? (
              <div className="mt-1.5 flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2.5">
                <AsLicensePlate value={vehicle.license_number} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-slate-900 truncate">
                    {vehicle.brand} {vehicle.model}
                    {vehicle.year && <span className="text-slate-500 font-medium"> · {vehicle.year}</span>}
                  </div>
                  {vehicle.vin && <div className="text-[11px] text-slate-500 truncate">VIN {vehicle.vin}</div>}
                </div>
                {!presetVehicle && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setVehicle(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="mt-1.5 relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  autoFocus={!isEdit}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Zoek op kenteken, merk, model of VIN…"
                  className="pl-8"
                />
                {(query.trim().length >= 2) && (
                  <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                    {searching && (
                      <div className="flex items-center gap-2 p-3 text-[12px] text-slate-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Zoeken…
                      </div>
                    )}
                    {!searching && results.length === 0 && (
                      <div className="p-3 text-[12px] text-slate-400">Geen resultaten</div>
                    )}
                    {!searching && results.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVehicle(v)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 text-left"
                      >
                        <AsLicensePlate value={v.license_number} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] font-semibold text-slate-900 truncate">
                            {v.brand} {v.model}
                            {v.year && <span className="text-slate-500 font-medium"> · {v.year}</span>}
                          </div>
                          {v.vin && <div className="text-[10.5px] text-slate-500 font-mono truncate">{v.vin}</div>}
                        </div>
                        <Car className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          {/* Part */}
          <div>
            <Label className="text-[12px] font-semibold text-slate-700">Onderdeel</Label>
            <Input
              className="mt-1.5"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              placeholder="Bijv. Distributieriem"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPartName(s === "Anders…" ? "" : s)}
                  className={cn(
                    "text-[11.5px] px-2 py-1 rounded-full border transition-colors",
                    partName === s
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <Label className="text-[12px] font-semibold text-slate-700">
              Aantal, inkoopprijs &amp; leverancier <span className="text-slate-400 font-normal">(optioneel)</span>
            </Label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              <Input
                type="number" min="1" step="1" value={aantal}
                onChange={(e) => setAantal(e.target.value)} placeholder="Aantal"
              />
              <Input
                type="number" step="0.01" min="0" value={inkoop}
                onChange={(e) => setInkoop(e.target.value)} placeholder="Inkoop p/st ex btw"
              />
              <Input
                value={leverancier}
                onChange={(e) => setLeverancier(e.target.value)} placeholder="Leverancier"
              />
            </div>
          </div>

          <div>
            <Label className="text-[12px] font-semibold text-slate-700">Notitie <span className="text-slate-400 font-normal">(optioneel)</span></Label>
            <Textarea
              className="mt-1.5"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Extra info voor de bestelling…"
            />
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{locked ? "Sluiten" : "Annuleren"}</Button>
          {!locked && (
            <Button onClick={isEdit ? submitEdit : submit} disabled={!canSave} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : isEdit ? <Save className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              {isEdit ? "Wijzigingen opslaan" : "Bestelling toevoegen"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddPartOrderDialog;