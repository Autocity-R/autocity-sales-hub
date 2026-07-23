import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Check, Loader2, PaintBucket, Hammer, Camera, Plus } from "lucide-react";
import { AsPage, AsCard, AsLicensePlate, AsMono, AsPill } from "@/components/aftersales/ui";
import { WorkshopPhoto } from "@/components/werkplaats/WorkshopPhoto";
import { BODY_PART_GROUPS } from "@/components/werkplaats/bodyParts";
import { cn } from "@/lib/utils";

interface IntakePoint { text: string; photo_paths?: string[]; work_order_id?: string | null; }
interface Intake {
  id: string; vehicle_id: string; branch: string | null; status: string; created_at: string;
  points: IntakePoint[];
  vehicle: {
    id: string; brand: string; model: string; year: number | null; license_number: string | null;
    vin: string | null; mileage: number | null; color: string | null;
  } | null;
}

type Discipline = "spuit" | "uitdeuk";

const SpecCol: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</div>
    <div className="text-[13px] text-slate-800 truncate mt-0.5">{children || "—"}</div>
  </div>
);

const WerkplaatsInnameDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [intake, setIntake] = useState<Intake | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // composer state
  const [discipline, setDiscipline] = useState<Discipline>("spuit");
  const [part, setPart] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase
      .from("vehicle_intakes")
      .select("id, vehicle_id, branch, status, created_at, points, vehicle:vehicles!vehicle_intakes_vehicle_id_fkey(id, brand, model, year, license_number, vin, mileage, color)")
      .eq("id", id).single();
    if (data) setIntake({ ...(data as any), points: Array.isArray((data as any).points) ? (data as any).points : [] });
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-line */ }, [id]);

  const resetComposer = () => {
    setPart(null); setDescription(""); setFiles([]);
  };

  const createOpdracht = async () => {
    if (!intake) return;
    if (!part) { toast({ title: "Kies eerst een onderdeel", variant: "destructive" }); return; }
    if (!description.trim()) { toast({ title: "Omschrijving is verplicht", variant: "destructive" }); return; }
    setSaving(true);
    try {
      // upload photos
      const paths: string[] = [];
      for (const f of files) {
        const path = `${intake.vehicle_id}/intake/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
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

      const { data: userRes } = await supabase.auth.getUser();
      const { data: inserted, error: insErr } = await supabase.from("work_orders").insert({
        vehicle_id: intake.vehicle_id,
        discipline,
        part,
        description: description.trim(),
        photos: paths,
        status: "ingepland",
        sort_order: nextSort,
        source: "inname",
        branch: intake.branch || "rotterdam",
        created_by: userRes.user?.id ?? null,
      }).select("id").single();
      if (insErr) throw insErr;

      // append point + koppel
      const newPoint: IntakePoint = {
        text: `${part} — ${description.trim()}`,
        photo_paths: paths,
        work_order_id: (inserted as any).id,
      };
      const newPoints = [...intake.points, newPoint];
      const { error: upErr } = await supabase.from("vehicle_intakes")
        .update({ points: newPoints as any }).eq("id", intake.id);
      if (upErr) throw upErr;

      toast({ title: "Opdracht aangemaakt", description: `${part}` });
      resetComposer();
      load();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Fout", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const finishIntake = async () => {
    if (!intake) return;
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("vehicle_intakes").update({
      status: "goedgekeurd",
      approved_by: userRes.user?.id ?? null,
      approved_at: new Date().toISOString(),
    }).eq("id", intake.id);
    if (error) { toast({ title: "Fout", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Inname afgerond" });
    navigate("/werkplaats/inname");
  };

  if (loading || !intake) {
    return (
      <DashboardLayout>
        <AsPage>
          <div className="flex items-center gap-2 text-slate-500 py-16 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Inname laden…
          </div>
        </AsPage>
      </DashboardLayout>
    );
  }

  const v = intake.vehicle;

  return (
    <DashboardLayout>
      <AsPage>
        <button onClick={() => navigate("/werkplaats/inname")} className="inline-flex items-center gap-1 text-[13px] text-slate-500 hover:text-slate-800 mb-4">
          <ArrowLeft className="h-4 w-4" /> Terug naar Inname
        </button>

        {/* Voertuig-kop */}
        <AsCard className="p-5 mb-4">
          <div className="flex items-start gap-4">
            <AsLicensePlate value={v?.license_number} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="text-[18px] font-bold text-slate-900 tracking-tight">
                {v?.brand} {v?.model} {v?.year && <span className="text-slate-500 font-semibold">· {v.year}</span>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                <SpecCol label="VIN"><AsMono className="text-slate-800">{v?.vin || "—"}</AsMono></SpecCol>
                <SpecCol label="KM-stand">{v?.mileage ? `${v.mileage.toLocaleString("nl-NL")} km` : "—"}</SpecCol>
                <SpecCol label="Kleur">{v?.color || "—"}</SpecCol>
                <SpecCol label="Vestiging">{intake.branch || "—"}</SpecCol>
              </div>
            </div>
          </div>
        </AsCard>

        {/* Bestaande punten */}
        {intake.points.length > 0 && (
          <AsCard className="p-5 mb-4">
            <div className="text-[13px] font-semibold text-slate-900 mb-3">Geregistreerde schade ({intake.points.length})</div>
            <div className="space-y-2">
              {intake.points.map((p, i) => (
                <div key={i} className="flex items-start gap-3 border border-slate-200 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-slate-900">{p.text}</div>
                    {p.photo_paths && p.photo_paths.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {p.photo_paths.map((path, j) => <WorkshopPhoto key={j} path={path} className="w-16 h-16" />)}
                      </div>
                    )}
                  </div>
                  {p.work_order_id && <AsPill tone="green">Taak aangemaakt</AsPill>}
                </div>
              ))}
            </div>
          </AsCard>
        )}

        {/* Opdracht-maker */}
        <AsCard className="p-5 mb-4">
          <div className="text-[13px] font-semibold text-slate-900 mb-3">Nieuwe opdracht aanmaken</div>

          {/* 1) Type */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {(["spuit", "uitdeuk"] as Discipline[]).map(d => {
              const active = discipline === d;
              const Icon = d === "spuit" ? PaintBucket : Hammer;
              const label = d === "spuit" ? "Schadeherstel" : "Uitdeuken";
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDiscipline(d)}
                  className={cn(
                    "flex items-center gap-3 border rounded-xl px-4 py-3 text-left transition-colors",
                    active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <div>
                    <div className="text-[13px] font-semibold">{label}</div>
                    <div className={cn("text-[11px]", active ? "text-white/70" : "text-slate-500")}>
                      {d === "spuit" ? "spuiterij / plaatwerk" : "extern uitdeuken zonder spuiten"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 2) Onderdeel */}
          <div className="mb-4">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Onderdeel</div>
            <div className="space-y-3">
              {BODY_PART_GROUPS.map(g => (
                <div key={g.label}>
                  <div className="text-[11px] text-slate-500 mb-1.5">{g.label}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.parts.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPart(p)}
                        className={cn(
                          "text-[12px] px-2.5 py-1 rounded-full border transition-colors",
                          part === p
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
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

          {/* 3) Foto's + omschrijving */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Foto's</div>
              <label className="flex items-center gap-2 border border-dashed border-slate-300 rounded-lg p-3 cursor-pointer hover:border-slate-400">
                <Camera className="h-4 w-4 text-slate-500" />
                <span className="text-[12px] text-slate-600">{files.length ? `${files.length} bestand(en) gekozen` : "Kies foto's of maak er direct één"}</span>
                <Input type="file" multiple accept="image/*" className="hidden"
                  onChange={(e) => setFiles(Array.from(e.target.files || []))} />
              </label>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Omschrijving</div>
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={part ? `Wat & hoe met "${part}"?` : "Wat & hoe?"} />
            </div>
          </div>

          {/* 4) Actie */}
          <div className="flex items-center justify-between">
            <div className="text-[12px] text-slate-500">
              {part ? <>Onderdeel: <span className="font-semibold text-slate-800">{part}</span></> : "Kies een onderdeel om verder te gaan"}
            </div>
            <Button onClick={createOpdracht} disabled={saving || !part || !description.trim()}>
              <Plus className="h-4 w-4 mr-1" /> {saving ? "Bezig…" : "Opdracht aanmaken"}
            </Button>
          </div>
        </AsCard>

        {/* Inname afronden */}
        <div className="flex justify-end">
          <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={finishIntake}>
            <Check className="h-4 w-4 mr-1" /> Inname afronden
          </Button>
        </div>
      </AsPage>
    </DashboardLayout>
  );
};

export default WerkplaatsInnameDetail;