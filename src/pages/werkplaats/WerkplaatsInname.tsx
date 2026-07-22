import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentBranch, applyBranchFilter } from "@/contexts/BranchContext";
import BranchFilter from "@/components/reports/BranchFilter";
import { WorkshopPhoto } from "@/components/werkplaats/WorkshopPhoto";
import { AddWorkOrderDialog } from "@/components/werkplaats/AddWorkOrderDialog";
import { Loader2, Plus, Check, Car } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface IntakePoint { text: string; photo_paths?: string[]; work_order_id?: string | null; }
interface Intake {
  id: string; vehicle_id: string; status: string; branch: string | null; note: string | null; points: IntakePoint[];
  vehicle: { id: string; brand: string; model: string; license_number: string | null } | null;
}

const WerkplaatsInname: React.FC = () => {
  const { branchFilter } = useCurrentBranch();
  const [rows, setRows] = useState<Intake[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleResults, setVehicleResults] = useState<any[]>([]);
  const [addTask, setAddTask] = useState<{ intake: Intake; pointIndex: number } | null>(null);

  // Per-intake input
  const [pointText, setPointText] = useState<Record<string, string>>({});
  const [pointFiles, setPointFiles] = useState<Record<string, File[]>>({});

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("vehicle_intakes")
      .select("id, vehicle_id, status, branch, note, points, vehicle:vehicles!vehicle_intakes_vehicle_id_fkey(id, brand, model, license_number)")
      .eq("status", "open")
      .order("created_at", { ascending: false });
    q = applyBranchFilter(q as any, branchFilter);
    const { data } = await q;
    setRows(((data as any) || []).map((r: any) => ({ ...r, points: Array.isArray(r.points) ? r.points : [] })));
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-line */ }, [branchFilter]);

  const searchVehicles = async (s: string) => {
    setVehicleSearch(s);
    if (s.length < 2) { setVehicleResults([]); return; }
    let q = supabase.from("vehicles").select("id, brand, model, license_number, branch").limit(15)
      .or(`brand.ilike.%${s}%,model.ilike.%${s}%,license_number.ilike.%${s}%`);
    q = applyBranchFilter(q, branchFilter);
    const { data } = await q;
    setVehicleResults((data as any) || []);
  };

  const createIntake = async (vehicleId: string, branch: string | null) => {
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("vehicle_intakes").insert({
      vehicle_id: vehicleId, status: "open", branch: branch || "rotterdam",
      created_by: userRes.user?.id ?? null, points: [],
    });
    if (error) toast({ title: "Fout", description: error.message, variant: "destructive" });
    else { toast({ title: "Inname aangemaakt" }); setNewOpen(false); load(); }
  };

  const addPoint = async (intake: Intake) => {
    const text = (pointText[intake.id] || "").trim();
    if (!text) return;
    const files = pointFiles[intake.id] || [];
    const paths: string[] = [];
    for (const f of files) {
      const path = `${intake.vehicle_id}/intake/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("workshop-photos").upload(path, f);
      if (error) { toast({ title: "Upload fout", description: error.message, variant: "destructive" }); return; }
      paths.push(path);
    }
    const newPoints = [...intake.points, { text, photo_paths: paths, work_order_id: null }];
    const { error } = await supabase.from("vehicle_intakes").update({ points: newPoints as any }).eq("id", intake.id);
    if (error) { toast({ title: "Fout", description: error.message, variant: "destructive" }); return; }
    setPointText(p => ({ ...p, [intake.id]: "" })); setPointFiles(p => ({ ...p, [intake.id]: [] }));
    load();
  };

  const approve = async (intake: Intake) => {
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("vehicle_intakes").update({
      status: "goedgekeurd", approved_by: userRes.user?.id ?? null, approved_at: new Date().toISOString(),
    }).eq("id", intake.id);
    if (error) toast({ title: "Fout", description: error.message, variant: "destructive" });
    else { toast({ title: "Inname goedgekeurd" }); load(); }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Inname</h1>
        <div className="flex items-center gap-2">
          <BranchFilter />
          <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" />Nieuwe inname</Button>
        </div>
      </div>

      {loading ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Laden…</div>
        : rows.length === 0 ? <p className="text-muted-foreground">Geen open innames.</p>
          : (
            <div className="space-y-4">
              {rows.map(intake => (
                <Card key={intake.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-lg">{intake.vehicle?.brand} {intake.vehicle?.model}</div>
                        <div className="text-xs text-muted-foreground">{intake.vehicle?.license_number || "—"}</div>
                      </div>
                      <Button variant="default" onClick={() => approve(intake)}><Check className="h-4 w-4 mr-1" />Inname goedkeuren</Button>
                    </div>

                    <div className="space-y-2">
                      {intake.points.length === 0 && <p className="text-sm text-muted-foreground">Nog geen punten toegevoegd.</p>}
                      {intake.points.map((p, idx) => (
                        <div key={idx} className="border rounded p-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="text-sm">{p.text}</div>
                              {p.photo_paths && p.photo_paths.length > 0 && (
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  {p.photo_paths.map((path, i) => <WorkshopPhoto key={i} path={path} className="w-16 h-16" />)}
                                </div>
                              )}
                            </div>
                            {p.work_order_id
                              ? <Badge className="bg-emerald-500 text-white">Taak aangemaakt</Badge>
                              : <Button size="sm" variant="outline" onClick={() => setAddTask({ intake, pointIndex: idx })}>→ Taak toewijzen</Button>}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-3 space-y-2">
                      <Textarea placeholder="Nieuw inname-punt…" value={pointText[intake.id] || ""} onChange={(e) => setPointText(p => ({ ...p, [intake.id]: e.target.value }))} />
                      <Input type="file" multiple accept="image/*" onChange={(e) => setPointFiles(p => ({ ...p, [intake.id]: Array.from(e.target.files || []) }))} />
                      <Button size="sm" onClick={() => addPoint(intake)}>Punt toevoegen</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nieuwe inname</DialogTitle></DialogHeader>
          <Input placeholder="Zoek voertuig…" value={vehicleSearch} onChange={(e) => searchVehicles(e.target.value)} />
          <div className="max-h-64 overflow-auto space-y-1 mt-2">
            {vehicleResults.map(v => (
              <button key={v.id} className="w-full flex items-center gap-2 p-2 hover:bg-muted rounded text-left" onClick={() => createIntake(v.id, v.branch)}>
                <Car className="h-4 w-4" />
                <span className="flex-1">{v.brand} {v.model} · {v.license_number || "—"}</span>
              </button>
            ))}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setNewOpen(false)}>Sluiten</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {addTask && (
        <AddWorkOrderDialog
          open
          onOpenChange={(v) => { if (!v) setAddTask(null); }}
          vehicleId={addTask.intake.vehicle_id}
          vehicleLabel={`${addTask.intake.vehicle?.brand} ${addTask.intake.vehicle?.model}`}
          branch={addTask.intake.branch}
          source="inname"
          intakePointRef={{ intakeId: addTask.intake.id, pointIndex: addTask.pointIndex }}
          onCreated={load}
        />
      )}
    </DashboardLayout>
  );
};

export default WerkplaatsInname;