import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Camera, Flame, Loader2, Wrench, PaintBucket, Hammer } from "lucide-react";
import { DamageDiagram, DamageZone } from "@/components/aftersales/DamageDiagram";
import { ChecklistItem, Vehicle } from "@/types/inventory";

type Discipline = "werkplaats" | "spuit" | "uitdeuk";

interface Profile { id: string; first_name: string | null; last_name: string | null; role: string; }

const ROLE_MAP: Record<Discipline, string[]> = {
  werkplaats: ["monteur", "werkplaats_chef"],
  spuit: ["spuiter", "werkplaats_chef"],
  uitdeuk: ["uitdeuker_extern", "werkplaats_chef"],
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  discipline: Discipline;
  vehicle: Vehicle;
  checklist: ChecklistItem[];
  initialItemId: string;
  onCreated: (result: { workOrderId: string; itemIds: string[]; discipline: Discipline }) => void;
}

export const ChecklistAssignDialog: React.FC<Props> = ({
  open, onOpenChange, discipline, vehicle, checklist, initialItemId, onCreated,
}) => {
  const openItems = useMemo(
    () => checklist.filter(i => !i.completed && !(i as any).linkedWorkOrderId),
    [checklist]
  );
  const initial = checklist.find(i => i.id === initialItemId);

  const [selectedIds, setSelectedIds] = useState<string[]>([initialItemId]);
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("__none__");
  const [isRush, setIsRush] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [zone, setZone] = useState<DamageZone | null>(null);
  const [zones, setZones] = useState<DamageZone[]>([]); // for uitdeuk multi-zone
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [saving, setSaving] = useState(false);

  const needsDiagram = discipline !== "werkplaats";
  const multiZone = discipline === "uitdeuk";

  useEffect(() => {
    if (!open) return;
    setSelectedIds([initialItemId]);
    setDescription(initial?.description || "");
    setAssignedTo("__none__");
    setIsRush(false);
    setFiles([]);
    setZone(null);
    setZones([]);
  }, [open, initialItemId, initial?.description]);

  // Auto-prefill omschrijving vanuit gekozen items (werkplaats: bundeling)
  useEffect(() => {
    if (!open) return;
    if (discipline !== "werkplaats") return;
    const texts = selectedIds
      .map(id => checklist.find(c => c.id === id)?.description || "")
      .filter(Boolean);
    setDescription(texts.join(" + "));
  }, [selectedIds, open, discipline, checklist]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const roles = ROLE_MAP[discipline];
      const { data: roleRows } = await supabase
        .from("user_roles").select("user_id, role").in("role", roles as any);
      const ids = Array.from(new Set(((roleRows as any[]) || []).map(r => r.user_id))) as string[];
      if (ids.length === 0) { setEmployees([]); return; }
      const { data: profs } = await supabase
        .from("profiles").select("id, first_name, last_name").in("id", ids);
      const roleById = new Map<string, string>();
      ((roleRows as any[]) || []).forEach(r => roleById.set(r.user_id, r.role));
      const list = ((profs as any[]) || []).map(p => ({
        id: p.id, first_name: p.first_name, last_name: p.last_name, role: roleById.get(p.id) || "",
      }));
      list.sort((a, b) =>
        `${a.first_name || ""} ${a.last_name || ""}`.localeCompare(`${b.first_name || ""} ${b.last_name || ""}`)
      );
      setEmployees(list);
    })();
  }, [open, discipline]);

  const toggleId = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleZoneClick = (z: DamageZone) => {
    if (multiZone) {
      setZones(prev => prev.some(x => x.id === z.id) ? prev.filter(x => x.id !== z.id) : [...prev, z]);
    } else {
      setZone(z);
    }
  };

  const markers = useMemo(() => {
    if (multiZone) return zones.map((z, i) => ({ index: i + 1, zoneId: z.id }));
    return zone ? [{ index: 1, zoneId: zone.id }] : [];
  }, [zone, zones, multiZone]);

  const submit = async () => {
    if (selectedIds.length === 0) { toast({ title: "Kies minstens één checklist-punt", variant: "destructive" }); return; }
    if (!description.trim()) { toast({ title: "Omschrijving is verplicht", variant: "destructive" }); return; }
    if (needsDiagram) {
      const has = multiZone ? zones.length > 0 : !!zone;
      if (!has) { toast({ title: "Selecteer een plek op het diagram", variant: "destructive" }); return; }
    }
    setSaving(true);
    try {
      // upload photos
      const paths: string[] = [];
      for (const f of files) {
        const path = `${vehicle.id}/checklist/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error } = await supabase.storage.from("workshop-photos").upload(path, f);
        if (error) throw error;
        paths.push(path);
      }

      // sort_order at back
      const { data: bounds } = await supabase.from("work_orders")
        .select("sort_order").eq("discipline", discipline)
        .in("status", ["ingepland", "bezig"])
        .order("sort_order", { ascending: false }).limit(1);
      const nextSort = ((bounds as any)?.[0]?.sort_order ?? 0) + 10;

      const partLabel = needsDiagram
        ? (multiZone ? zones.map(z => z.name).join(", ") : zone?.name || null)
        : null;

      const { data: userRes } = await supabase.auth.getUser();
      const { data: inserted, error: insErr } = await supabase.from("work_orders").insert({
        vehicle_id: vehicle.id,
        discipline,
        part: partLabel,
        description: description.trim(),
        photos: paths,
        status: "ingepland",
        sort_order: nextSort,
        is_rush: isRush,
        source: "checklist",
        branch: (vehicle as any).branch || "rotterdam",
        assigned_to: assignedTo === "__none__" ? null : assignedTo,
        created_by: userRes.user?.id ?? null,
        checklist_items: selectedIds,
      } as any).select("id").single();
      if (insErr) throw insErr;
      const woId = (inserted as any).id as string;

      toast({ title: "Opdracht aangemaakt", description: `${selectedIds.length} checklist-punt(en) gekoppeld.` });
      onCreated({ workOrderId: woId, itemIds: selectedIds, discipline });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Fout", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const title =
    discipline === "werkplaats" ? "Toewijzen aan werkplaats"
    : discipline === "spuit" ? "Toewijzen aan schadeherstel"
    : "Toewijzen aan uitdeuken";
  const Icon =
    discipline === "werkplaats" ? Wrench
    : discipline === "spuit" ? PaintBucket
    : Hammer;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" /> {title}
          </DialogTitle>
          <DialogDescription>
            {discipline === "werkplaats"
              ? "Bundel meerdere checklist-punten in één werkorder (bv. beurt + APK)."
              : "Wijs op het diagram aan wáár het zit en voeg foto's toe."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Checklist-items selectie */}
          <section>
            <Label className="mb-2 block">Checklist-punten</Label>
            <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3 max-h-52 overflow-y-auto">
              {openItems.length === 0 && (
                <div className="text-[12.5px] text-slate-500">Geen open punten meer.</div>
              )}
              {openItems.map(it => (
                <label key={it.id} className="flex items-start gap-2 text-[13px] text-slate-800 cursor-pointer py-0.5">
                  <Checkbox
                    checked={selectedIds.includes(it.id)}
                    onCheckedChange={() => toggleId(it.id)}
                    disabled={discipline !== "werkplaats" && it.id !== initialItemId}
                    className="mt-0.5"
                  />
                  <span className={selectedIds.includes(it.id) ? "font-medium" : ""}>{it.description}</span>
                </label>
              ))}
            </div>
            {discipline !== "werkplaats" && (
              <p className="text-[11.5px] text-slate-500 mt-1.5">
                Voor schadeherstel/uitdeuken maak je per punt één opdracht — bundelen kan alleen bij werkplaats.
              </p>
            )}
          </section>

          {/* Diagram (spuit/uitdeuk) */}
          {needsDiagram && (
            <section>
              <Label className="mb-2 block">
                {multiZone ? "Wijs de deuk(en) aan" : "Wijs op de auto aan"}
                {multiZone && zones.length > 0 && <span className="text-slate-500 font-normal ml-1">· {zones.length} gemarkeerd</span>}
                {!multiZone && zone && <span className="text-slate-500 font-normal ml-1">· {zone.name}</span>}
              </Label>
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <DamageDiagram
                  markers={markers}
                  selectedZoneId={!multiZone ? zone?.id : undefined}
                  onZoneClick={handleZoneClick}
                />
              </div>
            </section>
          )}

          {/* Foto's (spuit/uitdeuk) */}
          {needsDiagram && (
            <section>
              <Label className="mb-2 block">Foto's</Label>
              <label className="flex items-center gap-2 border border-dashed border-slate-300 rounded-lg p-3 cursor-pointer hover:border-slate-400 bg-white">
                <Camera className="h-4 w-4 text-slate-500" />
                <span className="text-[12.5px] text-slate-600 flex-1">
                  {files.length ? `${files.length} foto('s) gekozen` : "Maak of kies foto's"}
                </span>
                <Input type="file" multiple accept="image/*" capture="environment" className="hidden"
                  onChange={(e) => setFiles(Array.from(e.target.files || []))} />
              </label>
            </section>
          )}

          {/* Omschrijving */}
          <section>
            <Label className="mb-2 block">Omschrijving voor de planning</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Wat & hoe? (checklist-punten zelf worden hier niet door gewijzigd)" />
            <p className="text-[11.5px] text-slate-500 mt-1">Deze tekst verschijnt op de taakkaart — de checklist-punten blijven letterlijk staan.</p>
          </section>

          {/* Medewerker + spoed */}
          <section className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">Medewerker</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger><SelectValue placeholder="Kies medewerker" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Niet toegewezen</SelectItem>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {`${e.first_name || ""} ${e.last_name || ""}`.trim() || "Onbekend"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 h-10 w-full">
                <Flame className={`h-4 w-4 ${isRush ? "text-red-500" : "text-slate-400"}`} />
                <Label htmlFor="rush" className="flex-1 cursor-pointer text-[13px]">Spoed</Label>
                <Switch id="rush" checked={isRush} onCheckedChange={setIsRush} />
              </div>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Bezig…</> : "Opdracht aanmaken"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChecklistAssignDialog;