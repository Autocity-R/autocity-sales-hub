import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { WorkOrderDiscipline, DISCIPLINE_LABELS } from "./workOrderTypes";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicleId: string;
  vehicleLabel?: string;
  branch?: string | null;
  onCreated?: () => void;
  defaultDiscipline?: WorkOrderDiscipline;
  source?: string;
  warrantyClaimId?: string | null;
  intakePointRef?: { intakeId: string; pointIndex: number } | null;
}

export const AddWorkOrderDialog: React.FC<Props> = ({
  open, onOpenChange, vehicleId, vehicleLabel, branch,
  onCreated, defaultDiscipline = "werkplaats", source = "aftersales",
  warrantyClaimId = null, intakePointRef = null,
}) => {
  const [discipline, setDiscipline] = useState<WorkOrderDiscipline>(defaultDiscipline);
  const [description, setDescription] = useState("");
  const [isRush, setIsRush] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setDiscipline(defaultDiscipline);
    setDescription(""); setIsRush(false); setFiles([]);
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({ title: "Omschrijving verplicht", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // upload photos
      const photoPaths: string[] = [];
      for (const f of files) {
        const path = `${vehicleId}/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage
          .from("workshop-photos").upload(path, f, { upsert: false });
        if (upErr) throw upErr;
        photoPaths.push(path);
      }

      // sort_order: min-10 for rush, else max+10
      const { data: bounds } = await supabase
        .from("work_orders")
        .select("sort_order")
        .eq("discipline", discipline)
        .in("status", ["ingepland", "bezig"])
        .order("sort_order", { ascending: true });
      const orders = (bounds || []).map((r: any) => Number(r.sort_order) || 0);
      const nextSort = isRush
        ? (orders.length ? Math.min(...orders) - 10 : -10)
        : (orders.length ? Math.max(...orders) + 10 : 10);

      const { data: userRes } = await supabase.auth.getUser();

      const { data: inserted, error: insErr } = await supabase
        .from("work_orders")
        .insert({
          vehicle_id: vehicleId,
          discipline,
          description: description.trim(),
          is_rush: isRush,
          photos: photoPaths,
          status: "ingepland",
          sort_order: nextSort,
          source,
          warranty_claim_id: warrantyClaimId,
          branch: branch || "rotterdam",
          created_by: userRes.user?.id ?? null,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      // koppel aan inname-punt
      if (intakePointRef && inserted?.id) {
        const { data: intake } = await supabase
          .from("vehicle_intakes")
          .select("points")
          .eq("id", intakePointRef.intakeId)
          .single();
        const points = Array.isArray((intake as any)?.points) ? [...(intake as any).points] : [];
        if (points[intakePointRef.pointIndex]) {
          points[intakePointRef.pointIndex] = {
            ...points[intakePointRef.pointIndex],
            work_order_id: inserted.id,
          };
          await supabase.from("vehicle_intakes")
            .update({ points })
            .eq("id", intakePointRef.intakeId);
        }
      }

      toast({ title: "Taak aangemaakt", description: vehicleLabel ?? "" });
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Fout bij opslaan", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>+ Taak toewijzen{vehicleLabel ? ` — ${vehicleLabel}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Discipline</Label>
            <Select value={discipline} onValueChange={(v) => setDiscipline(v as WorkOrderDiscipline)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["spuit", "werkplaats", "uitdeuk", "poets"] as WorkOrderDiscipline[]).map(d => (
                  <SelectItem key={d} value={d}>{DISCIPLINE_LABELS[d]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Omschrijving</Label>
            <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Wat & waar?" />
          </div>
          <div>
            <Label>Foto's</Label>
            <Input type="file" multiple accept="image/*" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            {files.length > 0 && <p className="text-xs text-muted-foreground mt-1">{files.length} bestand(en) geselecteerd</p>}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={isRush} onCheckedChange={(v) => setIsRush(Boolean(v))} />
            <span className="text-sm font-medium">🔥 Spoed</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuleren</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "Opslaan..." : "Taak aanmaken"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};