import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentBranch, applyBranchFilter } from "@/contexts/BranchContext";
import BranchFilter from "@/components/reports/BranchFilter";
import { Loader2, Plus, Check, Car } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import { nl } from "date-fns/locale";
import { AsPage, AsCard, AsPill, AsLicensePlate, AsMono } from "@/components/aftersales/ui";

interface IntakePoint { text: string; photo_paths?: string[]; work_order_id?: string | null; }
interface Intake {
  id: string; vehicle_id: string; status: string; branch: string | null; created_at: string;
  note: string | null; points: IntakePoint[];
  vehicle: { id: string; brand: string; model: string; year: number | null; license_number: string | null; vin: string | null; mileage: number | null; color: string | null } | null;
}

const fmtIn = (iso: string) => {
  const d = new Date(iso);
  if (isToday(d)) return `Vandaag ${format(d, "HH:mm")}`;
  if (isYesterday(d)) return `Gisteren ${format(d, "HH:mm")}`;
  return format(d, "d MMM · HH:mm", { locale: nl });
};

const SpecCol: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</div>
    <div className="text-[12.5px] text-slate-800 truncate mt-0.5">{children || "—"}</div>
  </div>
);

const WerkplaatsInname: React.FC = () => {
  const { branchFilter } = useCurrentBranch();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Intake[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleResults, setVehicleResults] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("vehicle_intakes")
      .select("id, vehicle_id, status, branch, note, points, created_at, vehicle:vehicles!vehicle_intakes_vehicle_id_fkey(id, brand, model, year, license_number, vin, mileage, color)")
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
    const { data, error } = await supabase.from("vehicle_intakes").insert({
      vehicle_id: vehicleId, status: "open", branch: branch || "rotterdam",
      created_by: userRes.user?.id ?? null, points: [],
    }).select("id").single();
    if (error) { toast({ title: "Fout", description: error.message, variant: "destructive" }); return; }
    setNewOpen(false);
    navigate(`/werkplaats/inname/${(data as any).id}`);
  };

  const approveNoDamage = async (e: React.MouseEvent, intake: Intake) => {
    e.stopPropagation();
    if (intake.points.length > 0) {
      const ok = window.confirm("Er zijn al schadepunten geregistreerd. Toch direct innemen zonder schade?");
      if (!ok) return;
    }
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("vehicle_intakes").update({
      status: "goedgekeurd", approved_by: userRes.user?.id ?? null, approved_at: new Date().toISOString(),
    }).eq("id", intake.id);
    if (error) toast({ title: "Fout", description: error.message, variant: "destructive" });
    else { toast({ title: "Inname goedgekeurd", description: "Geen schade geregistreerd." }); load(); }
  };

  return (
    <DashboardLayout>
      <AsPage>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Inname</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">Binnengekomen auto's — inspecteren, schade vastleggen en innemen.</p>
          </div>
          <div className="flex items-center gap-2">
            <BranchFilter />
            <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" />Nieuwe inname</Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 py-10"><Loader2 className="h-4 w-4 animate-spin" /> Laden…</div>
        ) : rows.length === 0 ? (
          <AsCard className="p-10 text-center text-slate-400 text-[13px]">Geen open innames.</AsCard>
        ) : (
          <div className="space-y-3">
            {rows.map(intake => {
              const v = intake.vehicle;
              const hasTasks = intake.points.some(p => !!p.work_order_id);
              const status = hasTasks
                ? { label: "Ingepland", tone: "blue" as const }
                : { label: "Te inspecteren", tone: "amber" as const };
              return (
                <AsCard
                  key={intake.id}
                  onClick={() => navigate(`/werkplaats/inname/${intake.id}`)}
                  interactive
                  className="p-4 md:p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="pt-0.5"><AsLicensePlate value={v?.license_number} size="lg" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[15px] font-bold tracking-tight text-slate-900 truncate">
                            {v?.brand} {v?.model} {v?.year && <span className="font-semibold text-slate-500 ml-1">· {v.year}</span>}
                          </div>
                        </div>
                        <AsPill tone={status.tone} className="shrink-0">{status.label}</AsPill>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                        <SpecCol label="VIN"><AsMono className="text-slate-800">{v?.vin ? v.vin.slice(-10) : "—"}</AsMono></SpecCol>
                        <SpecCol label="KM-stand">{v?.mileage ? `${v.mileage.toLocaleString("nl-NL")} km` : "—"}</SpecCol>
                        <SpecCol label="Kleur">{v?.color || "—"}</SpecCol>
                        <SpecCol label="Binnengekomen">{fmtIn(intake.created_at)}</SpecCol>
                      </div>
                      {intake.points.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {intake.points.map((p, i) => (
                            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-[11px] font-medium px-2 py-0.5">
                              {p.text}
                              {p.work_order_id && <span className="text-[10px] text-red-500">· taak</span>}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-4">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={(e) => approveNoDamage(e, intake)}
                        >
                          <Check className="h-4 w-4 mr-1" />Innemen — geen schade
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); navigate(`/werkplaats/inname/${intake.id}`); }}
                        >
                          <Plus className="h-4 w-4 mr-1" />Taken toewijzen
                        </Button>
                      </div>
                    </div>
                  </div>
                </AsCard>
              );
            })}
          </div>
        )}
      </AsPage>

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
    </DashboardLayout>
  );
};

export default WerkplaatsInname;