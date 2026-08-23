import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Check, Loader2, PaintBucket, Hammer, Camera, Plus, Trash2, Package, X } from "lucide-react";
import { AsPage, AsCard, AsLicensePlate, AsMono, AsPill } from "@/components/aftersales/ui";
import { WorkshopPhoto } from "@/components/werkplaats/WorkshopPhoto";
import { DamageDiagram, DAMAGE_ZONES, findZoneByName, DamageZone } from "@/components/aftersales/DamageDiagram";
import { cn } from "@/lib/utils";
import { AddPartOrderDialog } from "@/components/aftersales/AddPartOrderDialog";
import { PhotoPicker } from "@/components/werkplaats/PhotoPicker";

interface IntakePoint { text: string; photo_paths?: string[]; work_order_id?: string | null; }
interface DraftEntry { parts: string[]; description: string; photo_paths: string[]; }
type DraftSelection = Partial<Record<Discipline, DraftEntry>>;
interface Intake {
  id: string; vehicle_id: string; branch: string | null; status: string; created_at: string;
  points: IntakePoint[];
  draft_selection?: DraftSelection | null;
  vehicle: {
    id: string; brand: string; model: string; year: number | null; license_number: string | null;
    vin: string | null; mileage: number | null; color: string | null; status?: string | null;
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

  // composer state — één order per discipline met meerdere delen
  const [discipline, setDiscipline] = useState<Discipline>("spuit");
  const [selection, setSelection] = useState<Record<Discipline, string[]>>({ spuit: [], uitdeuk: [] });
  const [descriptions, setDescriptions] = useState<Record<Discipline, string>>({ spuit: "", uitdeuk: "" });
  const [files, setFiles] = useState<File[]>([]);

  // Onderdelen composer
  const [parts, setParts] = useState<Array<{ id: string; part_name: string; note: string | null; status: string }>>([]);
  const [addPartOpen, setAddPartOpen] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase
      .from("vehicle_intakes")
      .select("id, vehicle_id, branch, status, created_at, points, draft_selection, vehicle:vehicles!vehicle_intakes_vehicle_id_fkey(id, brand, model, year, license_number, vin, mileage, color, status)")
      .eq("id", id).single();
    if (data) {
      const draft = ((data as any).draft_selection || {}) as DraftSelection;
      setIntake({ ...(data as any), points: Array.isArray((data as any).points) ? (data as any).points : [], draft_selection: draft });
      setSelection({
        spuit: draft.spuit?.parts ?? [],
        uitdeuk: draft.uitdeuk?.parts ?? [],
      });
      setDescriptions({
        spuit: draft.spuit?.description ?? "",
        uitdeuk: draft.uitdeuk?.description ?? "",
      });
    }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-line */ }, [id]);

  const loadParts = async (vehicleId: string) => {
    const { data } = await supabase.from("parts_orders")
      .select("id, part_name, note, status")
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false });
    setParts((data as any) || []);
  };
  useEffect(() => { if (intake?.vehicle_id) loadParts(intake.vehicle_id); }, [intake?.vehicle_id]);

  // add-part flow gebruikt gedeeld AddPartOrderDialog

  const selectedParts = selection[discipline];
  const description = descriptions[discipline];
  const setDescription = (v: string) =>
    setDescriptions(prev => ({ ...prev, [discipline]: v }));

  const toggleZone = (zone: DamageZone) => {
    setSelection(prev => {
      const cur = prev[discipline];
      return {
        ...prev,
        [discipline]: cur.includes(zone.name) ? cur.filter(n => n !== zone.name) : [...cur, zone.name],
      };
    });
  };

  const removeSelected = (name: string) =>
    setSelection(prev => ({ ...prev, [discipline]: prev[discipline].filter(n => n !== name) }));

  const selectedZoneIds = selectedParts
    .map(n => findZoneByName(n)?.id)
    .filter(Boolean) as string[];

  const uploadFiles = async (vehicleId: string) => {
    const paths: string[] = [];
    for (const f of files) {
      const path = `${vehicleId}/intake/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("workshop-photos").upload(path, f);
      if (error) throw error;
      paths.push(path);
    }
    return paths;
  };

  /** Selectie (delen + omschrijving + foto's) bewaren als concept — nog géén werkorders. */
  const saveSelection = async () => {
    if (!intake) return;
    if (selectedParts.length === 0) { toast({ title: "Kies minstens één deel op het diagram", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const newPaths = await uploadFiles(intake.vehicle_id);
      const prev = (intake.draft_selection || {}) as DraftSelection;
      const draft: DraftSelection = {
        ...prev,
        [discipline]: {
          parts: [...selectedParts],
          description: description.trim(),
          photo_paths: [...(prev[discipline]?.photo_paths ?? []), ...newPaths],
        },
      };
      const { error } = await supabase.from("vehicle_intakes")
        .update({ draft_selection: draft as any }).eq("id", intake.id);
      if (error) throw error;
      setFiles([]);
      toast({ title: "Selectie opgeslagen", description: "Taken worden aangemaakt bij 'Auto ingenomen'." });
      load();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Fout", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  /** Maakt per discipline één gebundelde order — idempotent (geen dubbele inname-orders). */
  const createOrdersFromDraft = async (draft: DraftSelection) => {
    if (!intake) return 0;
    const { data: userRes } = await supabase.auth.getUser();
    let created = 0;
    const newPoints: IntakePoint[] = [];

    for (const d of ["spuit", "uitdeuk"] as Discipline[]) {
      const entry = draft[d];
      const partList = entry?.parts ?? [];
      if (partList.length === 0) continue;

      // dedupe: bestaat er al een inname-order voor deze auto + discipline?
      const { count } = await supabase.from("work_orders")
        .select("id", { count: "exact", head: true })
        .eq("vehicle_id", intake.vehicle_id)
        .eq("discipline", d)
        .eq("source", "inname")
        .neq("status", "geannuleerd");
      if ((count ?? 0) > 0) continue;

      const { data: bounds } = await supabase.from("work_orders")
        .select("sort_order").eq("discipline", d)
        .in("status", ["ingepland", "bezig"])
        .order("sort_order", { ascending: false }).limit(1);
      const nextSort = ((bounds as any)?.[0]?.sort_order ?? 0) + 10;

      const desc = (entry?.description || "").trim() || partList.join(" · ");
      const photos = entry?.photo_paths ?? [];

      const { data: inserted, error: insErr } = await supabase.from("work_orders").insert({
        vehicle_id: intake.vehicle_id,
        discipline: d,
        part: partList[0],
        parts: partList,
        description: desc,
        photos,
        status: "ingepland",
        sort_order: nextSort,
        source: "inname",
        branch: intake.branch || "rotterdam",
        created_by: userRes.user?.id ?? null,
      }).select("id").single();
      if (insErr) throw insErr;

      created += 1;
      newPoints.push({
        text: `${partList.join(" · ")} — ${desc}`,
        photo_paths: photos,
        work_order_id: (inserted as any).id,
      });
    }

    if (newPoints.length > 0) {
      const { error: upErr } = await supabase.from("vehicle_intakes")
        .update({ points: [...intake.points, ...newPoints] as any }).eq("id", intake.id);
      if (upErr) throw upErr;
    }
    return created;
  };

  const removePoint = async (idx: number) => {
    if (!intake) return;
    const p = intake.points[idx];
    if (!p) return;
    // check status of gekoppelde work_order
    if (p.work_order_id) {
      const { data: wo } = await supabase.from("work_orders")
        .select("status").eq("id", p.work_order_id).single();
      const status = (wo as any)?.status;
      if (status && !["aangevraagd", "ingepland"].includes(status)) {
        toast({ title: "Al in uitvoering", description: "Deze opdracht is al gestart en kan niet meer verwijderd worden.", variant: "destructive" });
        return;
      }
    }
    if (!window.confirm(`Schadepunt "${p.text}" verwijderen?`)) return;
    try {
      if (p.work_order_id) {
        const { error } = await supabase.from("work_orders")
          .update({ status: "geannuleerd" }).eq("id", p.work_order_id)
          .in("status", ["aangevraagd", "ingepland"]);
        if (error) throw error;
      }
      const newPoints = intake.points.filter((_, i) => i !== idx);
      const { error: upErr } = await supabase.from("vehicle_intakes")
        .update({ points: newPoints as any }).eq("id", intake.id);
      if (upErr) throw upErr;
      toast({ title: "Schadepunt verwijderd" });
      load();
    } catch (e: any) {
      toast({ title: "Fout", description: e.message, variant: "destructive" });
    }
  };

  const finishIntake = async () => {
    if (!intake) return;
    if (intake.status === "goedgekeurd") { navigate("/werkplaats/inname"); return; }
    setSaving(true);
    try {
      // 1) huidige (nog niet opgeslagen) selectie meenemen in het concept
      const prev = (intake.draft_selection || {}) as DraftSelection;
      const newPaths = files.length ? await uploadFiles(intake.vehicle_id) : [];
      const draft: DraftSelection = { ...prev };
      for (const d of ["spuit", "uitdeuk"] as Discipline[]) {
        const parts = selection[d];
        if (parts.length === 0) continue;
        draft[d] = {
          parts: [...parts],
          description: (descriptions[d] || "").trim(),
          photo_paths: [
            ...(prev[d]?.photo_paths ?? []),
            ...(d === discipline ? newPaths : []),
          ],
        };
      }

      // 2) gebundelde orders aanmaken (idempotent)
      const created = await createOrdersFromDraft(draft);

      // 3) inname afronden → poets-keten via trigger
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase.from("vehicle_intakes").update({
        status: "goedgekeurd",
        approved_by: userRes.user?.id ?? null,
        approved_at: new Date().toISOString(),
        draft_selection: {} as any,
      }).eq("id", intake.id);
      if (error) throw error;

      const hasSpuit = (draft.spuit?.parts?.length ?? 0) > 0;
      const isB2B = intake.vehicle?.status === "verkocht_b2b";
      toast({
        title: "Auto ingenomen",
        description: `${created > 0 ? `${created} opdracht(en) aangemaakt — ` : ""}${
          isB2B ? "geen poets (B2B)" : hasSpuit ? "poets volgt na goedkeuring schadeherstel" : "poetsen ingepland"
        }`,
      });
      navigate("/werkplaats/inname");
    } catch (e: any) {
      console.error(e);
      toast({ title: "Fout", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
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

  // build markers uit points, gematcht op zone-naam prefix
  const markers = intake.points.flatMap((p, i) =>
    p.text.split(" — ")[0].split(" · ")
      .map(name => findZoneByName(name.trim())?.id || "")
      .filter(Boolean)
      .map(zoneId => ({ index: i + 1, zoneId })),
  );

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

        {/* Schadediagram + puntenlijst */}
        <AsCard className="p-5 mb-4">
          <div className="text-[13px] font-semibold text-slate-900 mb-3">Schaderapport — kies type en tik de delen aan</div>

          {/* Type reparatie */}
          <div className="grid grid-cols-2 gap-2 mb-3 max-w-md">
            {(["spuit", "uitdeuk"] as Discipline[]).map(d => {
              const active = discipline === d;
              const Icon = d === "spuit" ? PaintBucket : Hammer;
              const count = selection[d].length;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDiscipline(d)}
                  className={cn(
                    "flex items-center justify-center gap-2 border rounded-xl px-3 py-3 text-[13px] font-semibold transition-colors",
                    active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {d === "spuit" ? "Schadeherstel" : "Uitdeuken"}
                  {count > 0 && (
                    <span className={cn("ml-1 rounded-full px-1.5 text-[11px]", active ? "bg-white/20" : "bg-slate-100 text-slate-600")}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3 md:p-5">
            <div className="mx-auto w-full max-w-[820px]">
              <DamageDiagram
                markers={markers}
                selectedZoneIds={selectedZoneIds}
                onZoneClick={toggleZone}
                onMarkerClick={(idx) => {
                  const el = document.getElementById(`schade-punt-${idx - 1}`);
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              />
            </div>
          </div>

          {/* Geselecteerde delen + omschrijving */}
          <div className="mt-4">
            {selectedParts.length === 0 ? (
              <div className="text-[12.5px] text-slate-400 border border-dashed border-slate-200 rounded-lg p-3 text-center bg-white">
                Tik op het diagram om delen te selecteren voor {discipline === "spuit" ? "schadeherstel" : "uitdeuken"}.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {selectedParts.map(name => (
                    <span key={name} className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 text-white px-2.5 py-1 text-[12.5px] font-semibold">
                      {name}
                      <button type="button" onClick={() => removeSelected(name)} className="text-white/70 hover:text-white" title="Verwijderen">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="mt-3">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Foto's</div>
                  <PhotoPicker files={files} onChange={setFiles} />
                </div>

                <div className="mt-3">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Werkzaamheden (hele order)</div>
                  <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                    placeholder={`Wat & hoe voor: ${selectedParts.join(" · ")}`} />
                </div>

                <Button className="mt-3 w-full md:w-auto h-11 text-[14px]" onClick={saveSelection} disabled={saving}>
                  <Plus className="h-4 w-4 mr-1" /> {saving ? "Bezig…" : `Selectie opslaan (${selectedParts.length} deel/delen)`}
                </Button>
                <div className="mt-2 text-[12px] text-slate-500">
                  De opdracht(en) worden automatisch aangemaakt zodra je op "Auto ingenomen" klikt.
                </div>
              </>
            )}
          </div>

          <div className="mt-5">
            <div className="text-[12px] text-slate-500 mb-2 font-medium">
              Geregistreerde punten ({intake.points.length})
            </div>
              {intake.points.length === 0 ? (
                <div className="text-[12.5px] text-slate-400 border border-dashed border-slate-200 rounded-lg p-4 text-center bg-white">
                  Nog geen schade geregistreerd. Tik op het diagram om een deel te selecteren.
                </div>
              ) : (
                <div className="space-y-2">
                  {intake.points.map((p, i) => (
                    <div key={i} id={`schade-punt-${i}`} className="flex items-start gap-3 bg-white border border-slate-200 rounded-lg p-3">
                      <div className="h-7 w-7 rounded-full bg-red-500 text-white text-[12px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-slate-900">{p.text}</div>
                        {p.photo_paths && p.photo_paths.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {p.photo_paths.map((path, j) => <WorkshopPhoto key={j} path={path} className="w-14 h-14" />)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {p.work_order_id && <AsPill tone="green">Taak</AsPill>}
                        <Button size="icon" variant="ghost" onClick={() => removePoint(i)} title="Verwijderen"
                          className="h-8 w-8 text-slate-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </AsCard>

        {/* Onderdelen composer */}
        <AsCard className="p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-slate-500" />
            <div className="text-[13px] font-semibold text-slate-900">Onderdelen bestellen</div>
            <AsPill tone="slate" className="ml-auto">{parts.length}</AsPill>
          </div>
          <Button onClick={() => setAddPartOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-1" /> Onderdeel bestellen
          </Button>
          {parts.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {parts.map(p => (
                <div key={p.id} className="flex items-center gap-2 text-[12.5px] bg-white border border-slate-200 rounded-lg px-3 py-2">
                  <span className="font-medium text-slate-900">{p.part_name}</span>
                  {p.note && <span className="text-slate-500 truncate">— {p.note}</span>}
                  <AsPill tone={p.status === "binnen" ? "green" : p.status === "besteld" ? "blue" : "amber"} className="ml-auto">
                    {p.status === "te_bestellen" ? "Nog niet besteld" : p.status === "besteld" ? "Besteld" : "Binnen"}
                  </AsPill>
                </div>
              ))}
            </div>
          )}
        </AsCard>

        <AddPartOrderDialog
          open={addPartOpen}
          onOpenChange={setAddPartOpen}
          presetVehicle={intake?.vehicle ? {
            id: intake.vehicle.id,
            brand: intake.vehicle.brand,
            model: intake.vehicle.model,
            year: intake.vehicle.year,
            license_number: intake.vehicle.license_number,
            vin: intake.vehicle.vin,
            branch: intake.branch,
          } : null}
          onCreated={() => intake?.vehicle_id && loadParts(intake.vehicle_id)}
        />

        {/* Auto ingenomen */}
        <div className="flex items-center justify-end gap-3">
          <span className="text-[12px] text-slate-500">
            {intake.vehicle?.status === "verkocht_b2b"
              ? "→ Geen poets (B2B)"
              : selection.spuit.length > 0 || (intake.draft_selection?.spuit?.parts?.length ?? 0) > 0
                ? "→ Schadeherstel-order, poets na goedkeuring"
                : selection.uitdeuk.length > 0 || (intake.draft_selection?.uitdeuk?.parts?.length ?? 0) > 0
                  ? "→ Uitdeuk-order + direct poetsen"
                  : "→ Poetsen na innemen"}
          </span>
          <Button size="lg" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={finishIntake}>
            <Check className="h-4 w-4 mr-1" /> Auto ingenomen
          </Button>
        </div>

      </AsPage>
    </DashboardLayout>
  );
};

export default WerkplaatsInnameDetail;