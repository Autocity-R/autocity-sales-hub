import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { syncWorkOrderToWerkplaatsCalendar } from "@/services/werkplaatsCalendarService";
import { AsLicensePlate } from "@/components/aftersales/ui";
import { DamageDiagram, DAMAGE_ZONES, DamageZone } from "@/components/aftersales/DamageDiagram";
import { Search, X, Car, Loader2, Plus, PaintBucket, Wrench, Hammer, Sparkles, Camera, Flame, AlertTriangle, Home, Truck, Building2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkOrderDiscipline } from "@/components/werkplaats/workOrderTypes";
import { buildLmsSignatureHtml, profileFullName } from "@/utils/lmsSignature";

export interface AddTaskVehicle {
  id: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  license_number: string | null;
  vin: string | null;
  mileage?: number | null;
  color?: string | null;
  branch?: string | null;
  delivery_date?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  discipline: WorkOrderDiscipline;
  presetVehicle?: AddTaskVehicle | null;
  onCreated?: () => void;
}

const DISCIPLINE_META: Record<WorkOrderDiscipline, {
  title: string;
  icon: React.ReactNode;
  accent: string; // tailwind text
  bar: string;    // tailwind bg for header
  roles: string[];
  needsDiagram?: boolean;
  multiZone?: boolean;
  freeText?: boolean;
  showPhotos?: boolean;
  showWarranty?: boolean;
}> = {
  spuit: {
    title: "Nieuwe schadeherstel-taak",
    icon: <PaintBucket className="h-4 w-4" />,
    accent: "text-orange-600",
    bar: "bg-orange-50 border-orange-200",
    roles: ["schadeherstel"],
    needsDiagram: true,
    multiZone: false,
    showPhotos: true,
  },
  werkplaats: {
    title: "Nieuwe werkplaats-taak",
    icon: <Wrench className="h-4 w-4" />,
    accent: "text-blue-600",
    bar: "bg-blue-50 border-blue-200",
    roles: ["monteur", "werkplaats_chef"],
    freeText: true,
    showWarranty: true,
  },
  uitdeuk: {
    title: "Nieuwe uitdeuk-taak",
    icon: <Hammer className="h-4 w-4" />,
    accent: "text-slate-700",
    bar: "bg-slate-50 border-slate-200",
    roles: ["uitdeuker_extern"],
    needsDiagram: true,
    multiZone: true,
    showPhotos: true,
  },
  poets: {
    title: "Nieuwe poets-taak",
    icon: <Sparkles className="h-4 w-4" />,
    accent: "text-emerald-600",
    bar: "bg-emerald-50 border-emerald-200",
    roles: ["poetser"],
    freeText: true,
  },
};

export const AddTaskDialog: React.FC<Props> = ({ open, onOpenChange, discipline, presetVehicle, onCreated }) => {
  const meta = DISCIPLINE_META[discipline];
  const [vehicle, setVehicle] = useState<AddTaskVehicle | null>(presetVehicle ?? null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AddTaskVehicle[]>([]);
  const [searching, setSearching] = useState(false);
  const [description, setDescription] = useState("");
  const [zoneIds, setZoneIds] = useState<string[]>([]);
  const [zoneNotes, setZoneNotes] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [isRush, setIsRush] = useState(false);
  const [warrantyClaimId, setWarrantyClaimId] = useState<string>("");
  const [warrantyClaims, setWarrantyClaims] = useState<Array<{ id: string; description: string | null }>>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [poetsType, setPoetsType] = useState<"showroom" | "aflevering">("showroom");
  const [saving, setSaving] = useState(false);
  const searchTimer = useRef<number | null>(null);

  // Extern (werkplaats + schadeherstel)
  const externAllowed = discipline === "werkplaats" || discipline === "spuit";
  const [mode, setMode] = useState<"intern" | "extern">("intern");
  const [custMode, setCustMode] = useState<"bestaand" | "nieuw">("nieuw");
  const [custQuery, setCustQuery] = useState("");
  const [custResults, setCustResults] = useState<Array<any>>([]);
  const [custSearching, setCustSearching] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [ext, setExt] = useState({
    brand: "", model: "", plate: "", name: "",
    street: "", house_number: "", postal_code: "", city: "",
    email: "", phone: "",
  });
  const [plannedAt, setPlannedAt] = useState<string>("");
  const custTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setVehicle(presetVehicle ?? null);
    setQuery(""); setResults([]);
    setDescription(""); setZoneIds([]); setZoneNotes({}); setFiles([]);
    setAssignedTo(""); setDueDate(""); setIsRush(false); setWarrantyClaimId("");
    setPoetsType("showroom");
    setMode("intern");
    setCustMode("nieuw");
    setCustQuery(""); setCustResults([]); setSelectedContactId(null);
    setSendConfirmation(true);
    setExt({
      brand: "", model: "", plate: "", name: "",
      street: "", house_number: "", postal_code: "", city: "",
      email: "", phone: "",
    });
    setPlannedAt("");
  }, [open, presetVehicle, discipline]);

  // Bij poets/aflevering: due_date default op afleverdatum van auto
  useEffect(() => {
    if (discipline !== "poets") return;
    if (poetsType !== "aflevering") return;
    if (!vehicle?.delivery_date) return;
    if (dueDate) return;
    setDueDate(vehicle.delivery_date.slice(0, 10));
  }, [discipline, poetsType, vehicle, dueDate]);

  // Load employees by role for this discipline
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: ur } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", meta.roles as any);
      const ids = Array.from(new Set(((ur as any[]) || []).map(r => r.user_id)));
      if (!ids.length) { setEmployees([]); return; }
      const { data: ps } = await supabase.from("profiles").select("id, first_name, last_name").in("id", ids);
      setEmployees(((ps as any[]) || []).map(p => ({
        id: p.id,
        name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Onbekend",
      })).sort((a, b) => a.name.localeCompare(b.name)));
    })();
  }, [open, discipline]);

  // Warranty claims for vehicle (werkplaats only)
  useEffect(() => {
    if (!open || !meta.showWarranty || !vehicle) { setWarrantyClaims([]); return; }
    (async () => {
      const { data } = await supabase
        .from("warranty_claims")
        .select("id, description")
        .eq("vehicle_id", vehicle.id)
        .in("claim_status", ["pending", "actief", "in_behandeling", "open"])
        .order("created_at", { ascending: false });
      setWarrantyClaims((data as any) || []);
    })();
  }, [open, vehicle, meta.showWarranty]);

  // Live klant-zoeker (bestaande klant bij externe order)
  useEffect(() => {
    if (!open || mode !== "extern" || custMode !== "bestaand") return;
    if (custTimer.current) window.clearTimeout(custTimer.current);
    const q = custQuery.trim();
    if (q.length < 2) { setCustResults([]); return; }
    custTimer.current = window.setTimeout(async () => {
      setCustSearching(true);
      const { data } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, company_name, email, phone, address_street, address_number, address_postal_code, address_city")
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,company_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(10);
      setCustResults((data as any[]) || []);
      setCustSearching(false);
    }, 220);
  }, [custQuery, custMode, mode, open]);

  const pickContact = (c: any) => {
    setSelectedContactId(c.id);
    setCustResults([]);
    setCustQuery("");
    setExt(prev => ({
      ...prev,
      name: c.company_name || `${c.first_name || ""} ${c.last_name || ""}`.trim(),
      email: c.email && !String(c.email).endsWith("@werkplaats.local") ? c.email : "",
      phone: c.phone || "",
      street: c.address_street || "",
      house_number: c.address_number || "",
      postal_code: c.address_postal_code || "",
      city: c.address_city || "",
    }));
  };

  // Live search
  useEffect(() => {
    if (vehicle) return;
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    searchTimer.current = window.setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase.from("vehicles")
        .select("id, brand, model, year, license_number, vin, mileage, color, branch, delivery_date")
        .or(`license_number.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%,vin.ilike.%${q}%`)
        .limit(12);
      setResults((data as any) || []);
      setSearching(false);
    }, 220);
  }, [query, vehicle]);

  const toggleZone = (z: DamageZone) => {
    if (meta.multiZone) {
      setZoneIds(prev => prev.includes(z.id) ? prev.filter(x => x !== z.id) : [...prev, z.id]);
    } else {
      setZoneIds([z.id]);
    }
  };

  const zoneNames = zoneIds
    .map(id => DAMAGE_ZONES.find(z => z.id === id)?.name)
    .filter(Boolean) as string[];

  const canSave = useMemo(() => {
    if (saving) return false;
    if (externAllowed && mode === "extern") {
      return !!(ext.brand.trim() && ext.model.trim() && ext.plate.trim() && ext.name.trim()
        && plannedAt && description.trim());
    }
    if (!vehicle) return false;
    if (meta.needsDiagram && zoneIds.length === 0) return false;
    if (!description.trim() && !meta.needsDiagram) return false;
    if (meta.needsDiagram && zoneIds.length === 1 && !description.trim()) return false;
    if (discipline === "poets" && poetsType === "aflevering" && !dueDate) return false;
    return !saving;
  }, [vehicle, zoneIds, description, saving, meta, discipline, poetsType, dueDate, externAllowed, mode, ext, plannedAt]);

  const hasDeliveryConflict = !!vehicle?.delivery_date && !!dueDate && new Date(dueDate) > new Date(vehicle.delivery_date);

  const submit = async () => {
    if (externAllowed && mode === "extern") return submitExtern();
    if (!vehicle) return;
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();

      // sort_order: front bij spoed, achteraan anders
      const { data: bounds } = await supabase.from("work_orders")
        .select("sort_order").eq("discipline", discipline)
        .in("status", ["ingepland", "bezig"])
        .order("sort_order", { ascending: isRush ? true : false }).limit(1);
      const base = ((bounds as any)?.[0]?.sort_order ?? 0);
      const nextSort = isRush ? base - 10 : base + 10;

      // Foto's uploaden
      const uploadPhotos = async (): Promise<string[]> => {
        const paths: string[] = [];
        for (const f of files) {
          const path = `${vehicle.id}/task/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          const { error } = await supabase.storage.from("workshop-photos").upload(path, f);
          if (error) throw error;
          paths.push(path);
        }
        return paths;
      };

      if (meta.multiZone && zoneIds.length > 1) {
        // Uitdeuk: één work_order per zone
        const photos = await uploadPhotos();
        let cursor = nextSort;
        for (const zid of zoneIds) {
          const zone = DAMAGE_ZONES.find(z => z.id === zid)!;
          const desc = (zoneNotes[zid] || description).trim() || zone.name;
          const { error } = await supabase.from("work_orders").insert({
            vehicle_id: vehicle.id,
            discipline, part: zone.name, description: desc,
            photos, status: "ingepland", sort_order: cursor,
            source: "aftersales", branch: vehicle.branch || "rotterdam",
            assigned_to: assignedTo || null,
            is_rush: isRush,
            due_date: dueDate || null,
            created_by: userRes.user?.id ?? null,
          } as any);
          if (error) throw error;
          cursor += isRush ? -1 : 10;
        }
      } else {
        const photos = await uploadPhotos();
        const zone = zoneIds[0] ? DAMAGE_ZONES.find(z => z.id === zoneIds[0]) : null;
        const desc = description.trim() || (zone?.name ?? "");
        const { error } = await supabase.from("work_orders").insert({
          vehicle_id: vehicle.id,
          discipline,
          part: zone?.name || null,
          description: desc,
          photos, status: "ingepland", sort_order: nextSort,
          source: "aftersales", branch: vehicle.branch || "rotterdam",
          assigned_to: assignedTo || null,
          is_rush: isRush,
          warranty_claim_id: warrantyClaimId || null,
          due_date: dueDate || null,
          poets_type: discipline === "poets" ? poetsType : null,
          created_by: userRes.user?.id ?? null,
        } as any);
        if (error) throw error;
      }

      toast({ title: "Taak aangemaakt" });
      onCreated?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Fout", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  /** Externe klant + licht voertuig + werkorder aanmaken. */
  const submitExtern = async () => {
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();

      // (a) klant opzoeken op e-mail/telefoon, anders aanmaken
      let customerId: string | null = null;
      const email = ext.email.trim();
      const phone = ext.phone.trim();
      if (email || phone) {
        const filters: string[] = [];
        if (email) filters.push(`email.ilike.${email}`);
        if (phone) filters.push(`phone.eq.${phone}`);
        const { data: found } = await supabase.from("contacts").select("id").or(filters.join(",")).limit(1);
        customerId = (found as any)?.[0]?.id ?? null;
      }
      if (!customerId) {
        const parts = ext.name.trim().split(/\s+/);
        const first = parts[0] || ext.name.trim();
        const last = parts.slice(1).join(" ") || "-";
        const { data: created, error: cErr } = await supabase.from("contacts").insert({
          first_name: first,
          last_name: last,
          email: email || `extern-${Date.now()}@werkplaats.local`,
          phone: phone || null,
          address_street: ext.street.trim() || null,
          address_number: ext.house_number.trim() || null,
          address_postal_code: ext.postal_code.trim() || null,
          address_city: ext.city.trim() || null,
          type: "b2c",
        } as any).select("id").single();
        if (cErr) throw cErr;
        customerId = (created as any).id;
      }

      // (b) licht extern voertuig — status 'extern' zodat het NOOIT in voorraad/verkoop verschijnt.
      //     Bestaat het kenteken al als extern voertuig? Dan hergebruiken (geen duplicaten).
      const plate = ext.plate.trim().toUpperCase();
      let extVehicle: { id: string; branch: string | null } | null = null;
      if (plate) {
        const { data: existing } = await supabase
          .from("vehicles")
          .select("id, branch")
          .eq("status", "extern")
          .ilike("license_number", plate)
          .limit(1);
        extVehicle = ((existing as any)?.[0] as any) ?? null;
        if (extVehicle) {
          await supabase.from("vehicles").update({ customer_id: customerId }).eq("id", extVehicle.id);
        }
      }
      if (!extVehicle) {
        const { data: createdVeh, error: vErr } = await supabase.from("vehicles").insert({
          brand: ext.brand.trim(),
          model: ext.model.trim(),
          license_number: plate,
          status: "extern",
          customer_id: customerId,
          details: { externalWorkshop: true, excludeFromStock: true, customerName: ext.name.trim() } as any,
        } as any).select("id, branch").single();
        if (vErr) throw vErr;
        extVehicle = createdVeh as any;
      }

      // (c) werkorder
      const { data: bounds } = await supabase.from("work_orders")
        .select("sort_order").eq("discipline", discipline)
        .in("status", ["ingepland", "bezig"])
        .order("sort_order", { ascending: isRush ? true : false }).limit(1);
      const base = ((bounds as any)?.[0]?.sort_order ?? 0);
      const nextSort = isRush ? base - 10 : base + 10;

      const { data: createdWo, error: wErr } = await supabase.from("work_orders").insert({
        vehicle_id: (extVehicle as any).id,
        discipline,
        description: description.trim(),
        status: "ingepland",
        sort_order: nextSort,
        source: "extern",
        origin: "extern",
        planned_at: new Date(plannedAt).toISOString(),
        external_customer: {
          name: ext.name.trim(),
          street: ext.street.trim() || null,
          house_number: ext.house_number.trim() || null,
          postal_code: ext.postal_code.trim() || null,
          city: ext.city.trim() || null,
          address: [
            [ext.street.trim(), ext.house_number.trim()].filter(Boolean).join(" "),
            [ext.postal_code.trim(), ext.city.trim()].filter(Boolean).join(" "),
          ].filter(Boolean).join(", ") || null,
          email: email || null,
          phone: phone || null,
          customer_id: customerId,
        } as any,
        branch: (extVehicle as any).branch || "rotterdam",
        assigned_to: assignedTo || null,
        is_rush: isRush,
        due_date: dueDate || null,
        warranty_claim_id: warrantyClaimId || null,
        created_by: userRes.user?.id ?? null,
      } as any).select("id, branch").single();
      if (wErr) throw wErr;

      // Werkplaats-agenda (eigen spoor, faalt nooit blokkerend)
      if ((createdWo as any)?.id) {
        syncWorkOrderToWerkplaatsCalendar((createdWo as any).id, (createdWo as any).branch || "rotterdam");
      }

      toast({ title: "Externe opdracht ingepland" });
      onCreated?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Fout", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] max-h-[92vh] overflow-y-auto p-0">
        {/* Kop-balk in stijl van de rest */}
        <div className={cn("flex items-center gap-3 px-5 py-3 border-b", meta.bar)}>
          <div className={cn("h-8 w-8 rounded-lg bg-white/70 flex items-center justify-center", meta.accent)}>
            {meta.icon}
          </div>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-slate-900">{meta.title}</div>
            <div className="text-[11.5px] text-slate-500">Vul de gegevens in — één kolom van boven naar beneden.</div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Intern | Extern */}
          {externAllowed && (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setMode("intern")}
                className={cn("flex items-center justify-center gap-2 py-3 rounded-lg border text-[13px] font-semibold transition",
                  mode === "intern" ? "bg-blue-50 border-blue-300 text-blue-800 ring-2 ring-blue-200" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}>
                <Car className="h-4 w-4" /> Intern
              </button>
              <button type="button" onClick={() => setMode("extern")}
                className={cn("flex items-center justify-center gap-2 py-3 rounded-lg border text-[13px] font-semibold transition",
                  mode === "extern" ? "bg-indigo-50 border-indigo-300 text-indigo-800 ring-2 ring-indigo-200" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}>
                <Building2 className="h-4 w-4" /> Extern
              </button>
            </div>
          )}

          {externAllowed && mode === "extern" ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-2 text-[12px] text-indigo-800 flex items-center gap-2">
                <UserRound className="h-3.5 w-3.5" /> Externe klantauto — komt niet in de voorraad of verkoopcijfers.
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[12px] font-semibold text-slate-700">Merk <span className="text-red-500">*</span></Label>
                  <Input className="mt-1.5" value={ext.brand} onChange={(e) => setExt({ ...ext, brand: e.target.value })} placeholder="Volkswagen" />
                </div>
                <div>
                  <Label className="text-[12px] font-semibold text-slate-700">Model <span className="text-red-500">*</span></Label>
                  <Input className="mt-1.5" value={ext.model} onChange={(e) => setExt({ ...ext, model: e.target.value })} placeholder="Golf" />
                </div>
                <div>
                  <Label className="text-[12px] font-semibold text-slate-700">Kenteken <span className="text-red-500">*</span></Label>
                  <Input className="mt-1.5 uppercase" value={ext.plate} onChange={(e) => setExt({ ...ext, plate: e.target.value })} placeholder="XX-123-X" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[12px] font-semibold text-slate-700">Klantnaam <span className="text-red-500">*</span></Label>
                  <Input className="mt-1.5" value={ext.name} onChange={(e) => setExt({ ...ext, name: e.target.value })} placeholder="Naam klant" />
                </div>
                <div className="grid grid-cols-[1fr_80px] gap-2">
                  <div>
                    <Label className="text-[12px] font-semibold text-slate-700">Straat</Label>
                    <Input className="mt-1.5" value={ext.street} onChange={(e) => setExt({ ...ext, street: e.target.value })} placeholder="Thurledeweg" />
                  </div>
                  <div>
                    <Label className="text-[12px] font-semibold text-slate-700">Huisnr.</Label>
                    <Input className="mt-1.5" value={ext.house_number} onChange={(e) => setExt({ ...ext, house_number: e.target.value })} placeholder="61-a" />
                  </div>
                </div>
                <div className="grid grid-cols-[110px_1fr] gap-2">
                  <div>
                    <Label className="text-[12px] font-semibold text-slate-700">Postcode</Label>
                    <Input className="mt-1.5" value={ext.postal_code} onChange={(e) => setExt({ ...ext, postal_code: e.target.value })} placeholder="3044 ER" />
                  </div>
                  <div>
                    <Label className="text-[12px] font-semibold text-slate-700">Plaats</Label>
                    <Input className="mt-1.5" value={ext.city} onChange={(e) => setExt({ ...ext, city: e.target.value })} placeholder="Rotterdam" />
                  </div>
                </div>
                <div>
                  <Label className="text-[12px] font-semibold text-slate-700">E-mail</Label>
                  <Input className="mt-1.5" type="email" value={ext.email} onChange={(e) => setExt({ ...ext, email: e.target.value })} placeholder="klant@mail.nl" />
                </div>
                <div>
                  <Label className="text-[12px] font-semibold text-slate-700">Telefoonnummer</Label>
                  <Input className="mt-1.5" value={ext.phone} onChange={(e) => setExt({ ...ext, phone: e.target.value })} placeholder="06…" />
                </div>
              </div>
              <div>
                <Label className="text-[12px] font-semibold text-slate-700">Datum + tijdstip <span className="text-red-500">*</span></Label>
                <Input className="mt-1.5" type="datetime-local" value={plannedAt} onChange={(e) => setPlannedAt(e.target.value)} />
                <p className="text-[11px] text-slate-500 mt-1">Verschijnt in de sectie “Gepland” en komt 1 dag vóór de afspraak bovenaan de planning.</p>
              </div>
            </div>
          ) : (
          <div>
            <Label className="text-[12px] font-semibold text-slate-700">
              Voertuig <span className="text-red-500">*</span>
            </Label>
            {vehicle ? (
              <div className="mt-1.5 flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-2.5">
                <AsLicensePlate value={vehicle.license_number} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-slate-900 truncate">
                    {vehicle.brand} {vehicle.model}
                    {vehicle.year && <span className="text-slate-500 font-medium"> · {vehicle.year}</span>}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {[vehicle.mileage ? `${vehicle.mileage.toLocaleString("nl-NL")} km` : null,
                      vehicle.color,
                      vehicle.vin ? `VIN ${vehicle.vin.slice(-8)}` : null].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setVehicle(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="mt-1.5 relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
                       placeholder="Zoek op kenteken, merk, model of VIN…" className="pl-8" />
                {query.trim().length >= 2 && (
                  <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                    {searching && <div className="flex items-center gap-2 p-3 text-[12px] text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Zoeken…</div>}
                    {!searching && results.length === 0 && <div className="p-3 text-[12px] text-slate-400">Geen resultaten</div>}
                    {!searching && results.map((v) => (
                      <button key={v.id} type="button" onClick={() => setVehicle(v)}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 text-left">
                        <AsLicensePlate value={v.license_number} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] font-semibold text-slate-900 truncate">
                            {v.brand} {v.model}{v.year && <span className="text-slate-500 font-medium"> · {v.year}</span>}
                          </div>
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

          {/* Poets TYPE toggle */}
          {discipline === "poets" && (
            <div>
              <Label className="text-[12px] font-semibold text-slate-700">
                Type <span className="text-red-500">*</span>
              </Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPoetsType("showroom")}
                  className={cn(
                    "flex items-center justify-center gap-2 py-3 rounded-lg border text-[13px] font-semibold transition",
                    poetsType === "showroom"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-200"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                  )}
                >
                  <Home className="h-4 w-4" /> Showroom
                </button>
                <button
                  type="button"
                  onClick={() => setPoetsType("aflevering")}
                  className={cn(
                    "flex items-center justify-center gap-2 py-3 rounded-lg border text-[13px] font-semibold transition",
                    poetsType === "aflevering"
                      ? "bg-blue-50 border-blue-300 text-blue-800 ring-2 ring-blue-200"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                  )}
                >
                  <Truck className="h-4 w-4" /> Aflevering
                </button>
              </div>
            </div>
          )}

          {/* Diagram — schadeherstel/uitdeuk */}
          {meta.needsDiagram && (
            <div>
              <Label className="text-[12px] font-semibold text-slate-700">
                Waar zit {discipline === "uitdeuk" ? "de deuk" : "de schade"}? <span className="text-red-500">*</span>
                {zoneNames.length > 0 && (
                  <span className="ml-2 text-blue-600 font-semibold">{zoneNames.join(", ")}</span>
                )}
              </Label>
              <div className="mt-2 bg-white border border-slate-200 rounded-lg p-3">
                <div className="mx-auto max-w-[640px]">
                  <DamageDiagram
                    markers={zoneIds.map((id, i) => ({ index: i + 1, zoneId: id }))}
                    selectedZoneId={zoneIds[zoneIds.length - 1] || null}
                    onZoneClick={toggleZone}
                  />
                </div>
                {meta.multiZone && (
                  <p className="text-[11px] text-slate-400 mt-2 text-center">Klik meerdere zones aan — per zone wordt één taak aangemaakt.</p>
                )}
              </div>
            </div>
          )}

          {/* Beschrijving */}
          <div>
            <Label className="text-[12px] font-semibold text-slate-700">
              {discipline === "werkplaats"
                ? <>Werkzaamheden <span className="text-red-500">*</span></>
                : discipline === "poets"
                  ? <>Wat moet er gepoetst worden? <span className="text-red-500">*</span></>
                  : "Omschrijving"}
            </Label>
            <Textarea rows={discipline === "werkplaats" ? 5 : 3}
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder={discipline === "werkplaats"
                ? "Typ vrij wat er moet gebeuren (bijv. Grote beurt · APK · nieuwe accu)…"
                : discipline === "poets"
                  ? "Bijv. Compleet showroom-klaar (interieur + exterieur)."
                  : "Wat en hoe? (specifieke instructies voor de uitvoerder)"}
              className="mt-1.5"
            />
          </div>

          {/* Warranty toggle (werkplaats only) */}
          {meta.showWarranty && warrantyClaims.length > 0 && (
            <div>
              <Label className="text-[12px] font-semibold text-slate-700">Koppel garantieclaim (optioneel)</Label>
              <select value={warrantyClaimId} onChange={(e) => setWarrantyClaimId(e.target.value)}
                className="mt-1.5 w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-[13px]">
                <option value="">— Geen —</option>
                {warrantyClaims.map(c => (
                  <option key={c.id} value={c.id}>{(c.description || "(zonder omschrijving)").slice(0, 60)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Foto's */}
          {meta.showPhotos && (
            <div>
              <Label className="text-[12px] font-semibold text-slate-700">Foto's (optioneel)</Label>
              <label className="mt-1.5 flex items-center gap-2 border border-dashed border-slate-300 rounded-lg p-3 cursor-pointer hover:border-slate-400 bg-white">
                <Camera className="h-4 w-4 text-slate-500" />
                <span className="text-[12.5px] text-slate-600 flex-1">
                  {files.length ? `${files.length} foto('s) gekozen` : "Maak of kies foto's"}
                </span>
                <Input type="file" multiple accept="image/*" capture="environment" className="hidden"
                  onChange={(e) => setFiles(Array.from(e.target.files || []))} />
              </label>
            </div>
          )}

          {/* Medewerker + Deadline + Prioriteit */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-[12px] font-semibold text-slate-700">Medewerker</Label>
              <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}
                className="mt-1.5 w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-[13px]">
                <option value="">— Niet toegewezen —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-slate-700">
                Klaar vóór{discipline === "poets" && poetsType === "aflevering" && <span className="text-red-500"> *</span>}
              </Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                     className={cn(
                       "mt-1.5",
                       hasDeliveryConflict && "border-red-400",
                       discipline === "poets" && poetsType === "aflevering" && dueDate && "text-red-600 font-semibold border-red-300",
                     )} />
              {hasDeliveryConflict && (
                <div className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Aflevering staat op {new Date(vehicle!.delivery_date!).toLocaleDateString("nl-NL")}
                </div>
              )}
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-slate-700">Prioriteit</Label>
              <div className="mt-1.5 inline-flex bg-slate-100 rounded-md p-0.5 w-full">
                <button type="button" onClick={() => setIsRush(false)}
                  className={cn("flex-1 text-[12px] font-medium py-1.5 rounded transition",
                    !isRush ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>Normaal</button>
                <button type="button" onClick={() => setIsRush(true)}
                  className={cn("flex-1 text-[12px] font-semibold py-1.5 rounded transition inline-flex items-center justify-center gap-1",
                    isRush ? "bg-red-500 text-white shadow-sm" : "text-slate-500")}>
                  <Flame className="h-3 w-3" /> SPOED
                </button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t bg-slate-50">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuleren</Button>
          <Button onClick={submit} disabled={!canSave} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            Taak aanmaken
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ============= Balk met vier knoppen ============= */

export const AddTaskBar: React.FC<{ onCreated?: () => void; presetVehicle?: AddTaskVehicle | null }> = ({
  onCreated, presetVehicle,
}) => {
  const [open, setOpen] = useState<WorkOrderDiscipline | null>(null);
  const buttons: Array<{ d: WorkOrderDiscipline; label: string; icon: React.ReactNode; className: string }> = [
    { d: "spuit", label: "Schadeherstel", icon: <PaintBucket className="h-5 w-5" />,
      className: "bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700" },
    { d: "werkplaats", label: "Werkplaats", icon: <Wrench className="h-5 w-5" />,
      className: "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700" },
    { d: "uitdeuk", label: "Uitdeuken", icon: <Hammer className="h-5 w-5" />,
      className: "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800" },
    { d: "poets", label: "Poetsen", icon: <Sparkles className="h-5 w-5" />,
      className: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700" },
  ];

  return (
    <>
      <div className="bg-white rounded-[14px] border border-[#dfe3ea] overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_22px_-16px_rgba(15,23,42,0.14)] mb-4">
        <div className="flex items-center gap-3 px-4 py-3 bg-[#f4f6f9] border-b border-[#e2e6ec]">
          <div className="h-[30px] w-[30px] rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100 flex items-center justify-center">
            <Plus className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-slate-900">Taak toevoegen</div>
            <div className="text-[11.5px] text-slate-500">Kies de discipline — zoek de auto, vul in, klaar.</div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
          {buttons.map(b => (
            <button key={b.d} onClick={() => setOpen(b.d)}
              className={cn("flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors font-semibold text-[13.5px]", b.className)}>
              <div className="h-9 w-9 rounded-lg bg-white/70 flex items-center justify-center">{b.icon}</div>
              <span>{b.label}</span>
            </button>
          ))}
        </div>
      </div>

      {open && (
        <AddTaskDialog
          open={!!open}
          onOpenChange={(v) => { if (!v) setOpen(null); }}
          discipline={open}
          presetVehicle={presetVehicle}
          onCreated={onCreated}
        />
      )}
    </>
  );
};

export default AddTaskDialog;