import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Truck, Undo2 } from "lucide-react";

export type ExternMode = "uitbesteden" | "wegbrengen" | "terug";

interface WOish {
  id: string;
  extern_party?: string | null;
  extern_dropped_at?: string | null;
  vehicle?: { brand?: string | null; model?: string | null; license_number?: string | null } | null;
}

const localNow = () => format(new Date(), "yyyy-MM-dd'T'HH:mm");

/**
 * Beheerdialoog voor uitbesteed schadeherstel:
 * - uitbesteden: interne order omzetten naar extern (+ direct wegbrengen)
 * - wegbrengen:  externe partij + datum vastleggen
 * - terug:       auto terug van de spuiter → wacht op controle
 */
export const ExternSchadeDialog: React.FC<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: ExternMode;
  workOrder: WOish | null;
  onDone?: () => void;
}> = ({ open, onOpenChange, mode, workOrder, onDone }) => {
  const [party, setParty] = useState("");
  const [when, setWhen] = useState(localNow());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setParty(workOrder?.extern_party || "");
    setWhen(localNow());
  }, [open, workOrder?.id]);

  const label = workOrder
    ? [workOrder.vehicle?.license_number, workOrder.vehicle?.brand, workOrder.vehicle?.model].filter(Boolean).join(" · ")
    : "";

  const save = async () => {
    if (!workOrder) return;
    if (mode !== "terug" && !party.trim()) {
      toast({ title: "Naam externe partij is verplicht", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const iso = new Date(when).toISOString();
      const patch: Record<string, any> =
        mode === "terug"
          ? { extern_returned_at: iso, status: "afgerond", finished_at: iso }
          : {
              uitvoering: "extern",
              extern_party: party.trim(),
              extern_dropped_at: iso,
              status: "bezig",
              assigned_to: null,
              started_at: iso,
            };
      const { error } = await supabase.from("work_orders").update(patch).eq("id", workOrder.id);
      if (error) throw error;
      toast({
        title: mode === "terug" ? "Auto terug van externe partij" : "Weggebracht naar externe partij",
        description: label,
      });
      onOpenChange(false);
      onDone?.();
    } catch (e: any) {
      toast({ title: "Opslaan mislukt", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "terug" ? <Undo2 className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
            {mode === "terug" ? "Terug van externe partij" : mode === "uitbesteden" ? "Uitbesteden aan externe spuiter" : "Wegbrengen naar externe partij"}
          </DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {mode !== "terug" && (
            <div>
              <Label className="text-[12px] font-semibold text-slate-700">Externe partij</Label>
              <Input className="mt-1.5" value={party} onChange={(e) => setParty(e.target.value)} placeholder="Naam spuiter / schadeherstelbedrijf" />
            </div>
          )}
          <div>
            <Label className="text-[12px] font-semibold text-slate-700">
              {mode === "terug" ? "Datum + tijd terug" : "Datum + tijd wegbrengen"}
            </Label>
            <Input className="mt-1.5" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuleren</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Opslaan…" : "Opslaan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExternSchadeDialog;
