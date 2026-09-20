import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Flame, Loader2 } from "lucide-react";
import { BODY_PART_GROUPS } from "@/components/werkplaats/bodyParts";
import { getWorkOrderParts } from "@/components/werkplaats/workOrderParts";
import { syncWorkOrderToWerkplaatsCalendar } from "@/services/werkplaatsCalendarService";

export interface EditableWorkOrder {
  id: string;
  discipline: string;
  description: string | null;
  planned_at: string | null;
  assigned_to: string | null;
  is_rush: boolean;
  branch?: string | null;
  part?: string | null;
  parts?: any;
  vehicle?: { brand?: string; model?: string; license_number?: string | null } | null;
}

const ROLES_FOR_DISCIPLINE: Record<string, string[]> = {
  werkplaats: ["monteur", "werkplaats_chef"],
  spuit: ["schadeherstel"],
  uitdeuk: ["uitdeuker_extern"],
  poets: ["poetser"],
};

/** Geplande taak achteraf aanpassen: omschrijving, tijd, monteur, spoed en panelen. */
export const EditWorkOrderDialog: React.FC<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workOrder: EditableWorkOrder | null;
  onSaved?: () => void;
}> = ({ open, onOpenChange, workOrder, onSaved }) => {
  const [description, setDescription] = useState("");
  const [plannedAt, setPlannedAt] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [isRush, setIsRush] = useState(false);
  const [parts, setParts] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [saving, setSaving] = useState(false);

  const needsParts = workOrder?.discipline === "spuit" || workOrder?.discipline === "uitdeuk";

  useEffect(() => {
    if (!open || !workOrder) return;
    setDescription(workOrder.description || "");
    setPlannedAt(workOrder.planned_at ? format(new Date(workOrder.planned_at), "yyyy-MM-dd'T'HH:mm") : "");
    setAssignedTo(workOrder.assigned_to || "");
    setIsRush(!!workOrder.is_rush);
    setParts(getWorkOrderParts(workOrder as any));
  }, [open, workOrder]);

  useEffect(() => {
    if (!open || !workOrder) return;
    const roles = ROLES_FOR_DISCIPLINE[workOrder.discipline] || ["monteur"];
    (async () => {
      const { data: ur } = await supabase.from("user_roles").select("user_id, role").in("role", roles as any);
      const ids = Array.from(new Set(((ur as any[]) || []).map(r => r.user_id)));
      if (!ids.length) { setEmployees([]); return; }
      const { data: ps } = await supabase.from("profiles").select("id, first_name, last_name").in("id", ids);
      setEmployees(((ps as any[]) || []).map(p => ({
        id: p.id,
        name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Onbekend",
      })).sort((a, b) => a.name.localeCompare(b.name)));
    })();
  }, [open, workOrder?.discipline]);

  const togglePart = (p: string) =>
    setParts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const save = async () => {
    if (!workOrder) return;
    if (!description.trim()) {
      toast({ title: "Omschrijving verplicht", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const oldIso = workOrder.planned_at;
      const newIso = plannedAt ? new Date(plannedAt).toISOString() : null;
      const plannedChanged = (oldIso || null) !== (newIso || null);

      let desc = description.trim();
      if (plannedChanged && newIso) {
        const note = oldIso
          ? `\n[verzet van ${format(new Date(oldIso), "EEE d/M HH:mm", { locale: nl })} → ${format(new Date(newIso), "EEE d/M HH:mm", { locale: nl })}]`
          : `\n[ingepland op ${format(new Date(newIso), "EEE d/M HH:mm", { locale: nl })}]`;
        desc = `${desc}${note}`;
      }

      const patch: Record<string, any> = {
        description: desc,
        planned_at: newIso,
        assigned_to: assignedTo || null,
        is_rush: isRush,
      };
      if (needsParts) {
        patch.parts = parts;
        patch.part = parts[0] || null;
      }

      const { data, error } = await supabase
        .from("work_orders")
        .update(patch)
        .eq("id", workOrder.id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Je hebt geen rechten om deze taak aan te passen.");
      }

      if (plannedChanged) {
        syncWorkOrderToWerkplaatsCalendar(workOrder.id, workOrder.branch || "rotterdam");
      }

      toast({ title: "Taak bijgewerkt" });
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast({ title: "Opslaan mislukt", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Taak bewerken</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-[13px] text-slate-600">
            {workOrder?.vehicle?.brand} {workOrder?.vehicle?.model}
            {workOrder?.vehicle?.license_number ? ` · ${workOrder.vehicle.license_number}` : ""}
          </div>

          <div>
            <Label className="text-[12px] font-semibold text-slate-700">Omschrijving</Label>
            <Textarea className="mt-1.5" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-[12px] font-semibold text-slate-700">Geplande datum + tijd</Label>
              <Input className="mt-1.5" type="datetime-local" value={plannedAt} onChange={(e) => setPlannedAt(e.target.value)} />
              <p className="text-[11px] text-slate-500 mt-1">Leeg laten = geen vaste afspraak.</p>
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-slate-700">Medewerker</Label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="mt-1.5 w-full h-10 rounded-md border border-slate-200 bg-white px-2 text-[13px]"
              >
                <option value="">— Niet toegewezen —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>

          {needsParts && (
            <div>
              <Label className="text-[12px] font-semibold text-slate-700">Panelen</Label>
              <div className="mt-1.5 space-y-2">
                {BODY_PART_GROUPS.map(g => (
                  <div key={g.label}>
                    <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">{g.label}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {g.parts.map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => togglePart(p)}
                          className={cn(
                            "px-2.5 py-1.5 rounded-md border text-[12px] font-medium transition",
                            parts.includes(p)
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsRush(!isRush)}
            className={cn(
              "flex items-center gap-2 w-full rounded-lg border px-3 py-3 text-[13px] font-semibold transition",
              isRush ? "bg-red-50 border-red-300 text-red-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
            )}
          >
            <Flame className="h-4 w-4" /> Spoed {isRush ? "aan" : "uit"}
          </button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuleren</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
