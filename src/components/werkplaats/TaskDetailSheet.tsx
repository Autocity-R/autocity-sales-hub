import React, { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { AsLicensePlate, AsMono, AsPill } from "@/components/aftersales/ui";
import { DamageDiagram, findZoneByName, DamageMarker } from "@/components/aftersales/DamageDiagram";
import { Loader2, Phone, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PartChips, getWorkOrderParts } from "@/components/werkplaats/workOrderParts";

/** Read-only taakdetail voor uitvoerende rollen (schadeherstel, uitdeuk, monteur, poetser). */

interface Vehicle {
  id?: string; brand?: string | null; model?: string | null; year?: number | null;
  license_number?: string | null; vin?: string | null; mileage?: number | null; color?: string | null;
}

export interface TaskDetailWorkOrder {
  id: string;
  description?: string | null;
  part?: string | null;
  parts?: string[] | null;
  status?: string | null;
  discipline?: string | null;
  is_rush?: boolean | null;
  photos?: string[] | null;
  origin?: string | null;
  warranty_claim_id?: string | null;
  external_customer?: any;
  vehicle_id?: string | null;
  vehicle?: Vehicle | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workOrder: TaskDetailWorkOrder | null;
  /** Actieknop(pen) onderaan — dezelfde als op de card. */
  actions?: React.ReactNode;
}

interface IntakePoint { text: string; photo_paths?: string[] }

/** Signed url voor een pad in workshop-photos. */
const useSignedUrls = (paths: string[]) => {
  const key = paths.join("|");
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancel = false;
    if (!paths.length) { setUrls({}); return; }
    supabase.storage.from("workshop-photos").createSignedUrls(paths, 3600).then(({ data }) => {
      if (cancel || !data) return;
      const map: Record<string, string> = {};
      data.forEach((d: any) => { if (d.signedUrl && d.path) map[d.path] = d.signedUrl; });
      setUrls(map);
    });
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return urls;
};

const Lightbox: React.FC<{ urls: string[]; index: number; onClose: () => void; onIndex: (i: number) => void }> = ({
  urls, index, onClose, onIndex,
}) => {
  const [zoom, setZoom] = useState(false);
  useEffect(() => { setZoom(false); }, [index]);
  if (index < 0) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white/80 p-2" aria-label="Sluiten">
        <X className="h-6 w-6" />
      </button>
      {urls.length > 1 && (
        <>
          <button
            className="absolute left-2 text-white/80 p-3"
            aria-label="Vorige"
            onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + urls.length) % urls.length); }}
          ><ChevronLeft className="h-8 w-8" /></button>
          <button
            className="absolute right-2 text-white/80 p-3"
            aria-label="Volgende"
            onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % urls.length); }}
          ><ChevronRight className="h-8 w-8" /></button>
        </>
      )}
      <img
        src={urls[index]}
        alt=""
        onClick={(e) => { e.stopPropagation(); setZoom(z => !z); }}
        className={cn("max-h-[88vh] max-w-[94vw] object-contain transition-transform duration-200",
          zoom && "scale-[2] cursor-zoom-out", !zoom && "cursor-zoom-in")}
      />
      <div className="absolute bottom-4 text-white/70 text-[12px]">{index + 1} / {urls.length}</div>
    </div>
  );
};

export const TaskDetailSheet: React.FC<Props> = ({ open, onOpenChange, workOrder, actions }) => {
  const [points, setPoints] = useState<IntakePoint[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [lightbox, setLightbox] = useState(-1);

  const vehicleId = workOrder?.vehicle?.id || workOrder?.vehicle_id || null;

  useEffect(() => {
    let cancel = false;
    if (!open || !workOrder) return;
    setVehicle(workOrder.vehicle || null);
    setPoints([]);
    if (!vehicleId) return;
    setLoading(true);
    (async () => {
      const [vRes, iRes] = await Promise.all([
        supabase.from("vehicles")
          .select("id, brand, model, year, license_number, vin, mileage, color")
          .eq("id", vehicleId).maybeSingle(),
        supabase.from("vehicle_intakes")
          .select("points, created_at").eq("vehicle_id", vehicleId)
          .order("created_at", { ascending: false }).limit(1),
      ]);
      if (cancel) return;
      if (vRes.data) setVehicle(vRes.data as any);
      const raw = (iRes.data as any)?.[0]?.points;
      setPoints(Array.isArray(raw) ? raw : []);
      setLoading(false);
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, workOrder?.id, vehicleId]);

  const partZoneIds = useMemo(
    () => getWorkOrderParts(workOrder).map(p => findZoneByName(p)?.id).filter(Boolean) as string[],
    [workOrder?.part, (workOrder as any)?.parts],
  );

  const markers: DamageMarker[] = useMemo(() => {
    const out: DamageMarker[] = [];
    points.forEach((p, i) => {
      const partName = (p.text || "").split("—")[0].trim();
      const z = findZoneByName(partName);
      if (z) out.push({ index: i + 1, zoneId: z.id });
    });
    return out;
  }, [points]);

  const photoPaths = useMemo(() => {
    const list: string[] = [...((workOrder?.photos as string[]) || [])];
    points.forEach(p => (p.photo_paths || []).forEach(x => list.push(x)));
    return Array.from(new Set(list.filter(Boolean)));
  }, [workOrder?.photos, points]);

  const urlMap = useSignedUrls(photoPaths);
  const urls = photoPaths.map(p => urlMap[p]).filter(Boolean) as string[];

  if (!workOrder) return null;
  const v = vehicle;
  const ext = (workOrder.external_customer || {}) as any;
  const isExtern = workOrder.origin === "extern";
  const phone: string | null = ext.phone || ext.telephone || null;
  /** Werkplaats-orders (onderhoud/APK) hebben geen schade-locatie: geen diagram. */
  const isWerkplaats = (workOrder.discipline || "") === "werkplaats";
  const showDiagram = !isWerkplaats && (markers.length > 0 || partZoneIds.length > 0);

  const specs = [
    typeof v?.mileage === "number" ? `${v.mileage.toLocaleString("nl-NL")} km` : null,
    v?.color || null,
  ].filter(Boolean) as string[];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[95vh] p-0 overflow-y-auto rounded-t-2xl">
          {/* Voertuigkop */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-start gap-3">
            <AsLicensePlate value={v?.license_number} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold tracking-tight text-slate-900 truncate">
                {[v?.brand, v?.model].filter(Boolean).join(" ") || "Voertuig"}
                {v?.year ? <span className="text-slate-500 font-semibold"> · {v.year}</span> : null}
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                {specs.join(" · ")}
                {v?.vin && <> {specs.length ? "· " : ""}<AsMono>{v.vin}</AsMono></>}
              </div>
            </div>
          </div>

          <div className="px-4 py-4 space-y-5 pb-28">
            {/* Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {workOrder.is_rush && <AsPill tone="red">⚡ SPOED</AsPill>}
              {workOrder.warranty_claim_id && <AsPill tone="violet">🛡️ GARANTIE</AsPill>}
              {isExtern && <AsPill tone="amber">EXTERN{ext.name ? ` · ${ext.name}` : ""}</AsPill>}
              {workOrder.status && <AsPill tone="slate">{workOrder.status}</AsPill>}
            </div>
            {isExtern && phone && (
              <a href={`tel:${String(phone).replace(/\s/g, "")}`}
                 className="inline-flex items-center gap-1.5 text-[13px] font-medium text-blue-600">
                <Phone className="h-3.5 w-3.5" /> {phone}
              </a>
            )}

            {/* Werkzaamheden */}
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-2">Werkzaamheden</div>
              <PartChips workOrder={workOrder} className="mb-2" />
              <div className="text-[13.5px] text-slate-800 whitespace-pre-wrap">{workOrder.description || "—"}</div>
            </div>

            {/* Schadediagram */}
            {loading ? (
              <div className="flex items-center gap-2 text-slate-500 text-[13px] py-6 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Laden…
              </div>
            ) : showDiagram ? (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-2">Schade-locatie</div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-center">
                  <DamageDiagram
                    markers={markers}
                    selectedZoneIds={partZoneIds}
                    interactive={false}
                    className="max-w-[320px]"
                  />
                </div>
                {points.length > 0 && (
                  <ol className="mt-3 space-y-1.5">
                    {points.map((p, i) => (
                      <li key={i} className="flex gap-2 text-[13px] text-slate-700">
                        <span className="h-5 w-5 shrink-0 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="min-w-0">{p.text}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ) : null}

            {/* Foto's */}
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-2">Foto's</div>
              {urls.length === 0 ? (
                <div className="text-[12.5px] text-slate-400">Geen foto's beschikbaar</div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {urls.map((u, i) => (
                    <button key={i} onClick={() => setLightbox(i)} className="block">
                      <img src={u} alt="" className="w-full aspect-square object-cover rounded-lg border border-slate-200" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {actions && (
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-4 py-3">
              {actions}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {lightbox >= 0 && urls.length > 0 && (
        <Lightbox urls={urls} index={Math.min(lightbox, urls.length - 1)} onClose={() => setLightbox(-1)} onIndex={setLightbox} />
      )}
    </>
  );
};

export default TaskDetailSheet;
