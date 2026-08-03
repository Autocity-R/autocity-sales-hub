import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentBranch } from "@/contexts/BranchContext";
import { featureAccess } from "@/lib/routeAccess";
import { AsPage, AsCard, AsCardHead } from "@/components/aftersales/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Copy, ExternalLink, FileText, Loader2, Mail, Package,
  PenLine, Plus, Save, Search, Trash2, Wrench,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import InvoicePricePanel, { PriceAddPayload } from "@/components/werkplaats/InvoicePricePanel";
import InvoicePartsPanel, { PartAddPayload } from "@/components/werkplaats/InvoicePartsPanel";
import {
  InvoiceLine, calcTotals, eur, getInvoiceSignedUrl, mailInvoiceTo,
  renderInvoiceHtml, saveManualInvoice,
} from "@/services/workshopInvoiceService";
import {
  DEFAULT_TARIEVEN, Reparatie, WerkplaatsModel, WerkplaatsTarieven,
  berekenArbeid, fetchModellen, fetchReparaties, fetchTarieven, findMerkFactor, round2,
} from "@/services/werkplaatsPrijsService";

/* ------------------------------- types ------------------------------- */

type LineKind = "arbeid" | "onderdeel" | "vrij";

export interface EditLine {
  id: string;
  kind: LineKind;
  description: string;
  /** arbeid */
  uren?: number;
  tarief?: number;
  factor?: number;
  /** onderdelen */
  qty?: number;
  unitPrice?: number;
  /** intern: herkomst en inkoopprijs voor marge-inzicht (nooit op de PDF) */
  partOrderId?: string;
  inkoopPerStuk?: number | null;
  amount: number;
}

interface CustomerForm {
  name: string; street: string; house_number: string; postal_code: string;
  city: string; email: string; phone: string;
}
interface VehicleForm { brand: string; model: string; license_number: string; mileage: string }

const emptyCustomer: CustomerForm = { name: "", street: "", house_number: "", postal_code: "", city: "", email: "", phone: "" };
const emptyVehicle: VehicleForm = { brand: "", model: "", license_number: "", mileage: "" };

const INTERN_CUSTOMER: CustomerForm = {
  name: "Autocity Automotive Group B.V.",
  street: "Thurledeweg",
  house_number: "61-a",
  postal_code: "3044 ER",
  city: "Rotterdam",
  email: "administratie@auto-city.nl",
  phone: "",
};

let seq = 0;
const newId = () => `l${Date.now().toString(36)}${(seq += 1).toString(36)}`;

/* --------------------------- subcomponenten ---------------------------
   Bewust op moduleniveau gedefinieerd: componenten die binnen de render
   van de pagina worden gedeclareerd krijgen elke state-update een nieuw
   componenttype, waardoor React de subtree unmountt en de focus uit het
   invoerveld verdwijnt (de "één letter per klik"-bug).                  */

const Section: React.FC<{ icon: React.ReactNode; title: string; right?: React.ReactNode; children: React.ReactNode }> =
  ({ icon, title, right, children }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-800">{icon}{title}</div>
        {right}
      </div>
      {children}
    </div>
  );

export const Field: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; type?: string; invalid?: boolean;
}> = ({ label, value, onChange, placeholder, required, type, invalid }) => (
  <div className="space-y-1">
    <Label className="text-[11px] text-slate-500">{label}{required ? " *" : ""}</Label>
    <Input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={invalid ? "border-red-400 focus-visible:ring-red-300" : undefined}
    />
  </div>
);

export interface LineRowProps {
  line: EditLine;
  onPatch: (id: string, patch: Partial<EditLine>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export const LineRow: React.FC<LineRowProps> = ({ line, onPatch, onRemove, onDuplicate }) => (
  <div className="px-3 py-2.5">
    <div className="flex items-start gap-2">
      <Input
        value={line.description}
        placeholder="Omschrijving"
        onChange={(e) => onPatch(line.id, { description: e.target.value })}
        className="flex-1 h-9 text-[12.5px]"
      />
      <Input
        type="number"
        step="0.01"
        value={line.amount}
        onChange={(e) => onPatch(line.id, { amount: round2(Number(e.target.value)) })}
        className="w-[110px] h-9 text-[12.5px] text-right tabular-nums"
      />
      <Button type="button" size="icon" variant="ghost" className="h-9 w-9" title="Dupliceren" onClick={() => onDuplicate(line.id)}>
        <Copy className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" size="icon" variant="ghost" className="h-9 w-9" title="Verwijderen" onClick={() => onRemove(line.id)}>
        <Trash2 className="h-3.5 w-3.5 text-red-500" />
      </Button>
    </div>

    {line.kind === "arbeid" && (
      <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-0.5">
        <span className="text-[11px] text-slate-500">Uren</span>
        <Input
          type="number" step="0.1"
          value={line.uren ?? 0}
          onChange={(e) => {
            const u = Number(e.target.value);
            onPatch(line.id, { uren: u, amount: berekenArbeid(u, line.tarief ?? 0, line.factor ?? 1) });
          }}
          className="w-[86px] h-8 text-[12px] text-right tabular-nums"
        />
        <span className="text-[11px] text-slate-500">× tarief</span>
        <Input
          type="number" step="0.01"
          value={line.tarief ?? 0}
          onChange={(e) => {
            const t = Number(e.target.value);
            onPatch(line.id, { tarief: t, amount: berekenArbeid(line.uren ?? 0, t, line.factor ?? 1) });
          }}
          className="w-[96px] h-8 text-[12px] text-right tabular-nums"
        />
        <span className="text-[11px] text-slate-500">× factor {(line.factor ?? 1).toFixed(2)}</span>
      </div>
    )}

    {line.kind === "onderdeel" && (
      <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-0.5">
        <span className="text-[11px] text-slate-500">Aantal</span>
        <Input
          type="number" step="1" min="1"
          value={line.qty ?? 1}
          onChange={(e) => {
            const q = Number(e.target.value);
            onPatch(line.id, { qty: q, amount: round2(q * (line.unitPrice ?? 0)) });
          }}
          className="w-[80px] h-8 text-[12px] text-right tabular-nums"
        />
        <span className="text-[11px] text-slate-500">× stukprijs ex btw</span>
        <Input
          type="number" step="0.01"
          value={line.unitPrice ?? 0}
          onChange={(e) => {
            const p = Number(e.target.value);
            onPatch(line.id, { unitPrice: p, amount: round2((line.qty ?? 1) * p) });
          }}
          className="w-[100px] h-8 text-[12px] text-right tabular-nums"
        />
      </div>
    )}

    {line.kind === "onderdeel" && line.inkoopPerStuk != null && (
      <div className="mt-1 pl-0.5 text-[11px] text-slate-500">
        Intern: inkoop {eur(line.inkoopPerStuk)} p/st ·{" "}
        marge {eur(round2(((line.unitPrice ?? 0) - line.inkoopPerStuk) * (line.qty ?? 1)))}
        {line.inkoopPerStuk > 0 &&
          ` (${Math.round((((line.unitPrice ?? 0) - line.inkoopPerStuk) / line.inkoopPerStuk) * 100)}%)`}
        <span className="text-slate-400"> — niet zichtbaar voor de klant</span>
      </div>
    )}
  </div>
);

const InvoicePreview: React.FC<{ html: string }> = ({ html }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, (el.clientWidth - 2) / 794));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="bg-slate-100 p-2 rounded-lg overflow-hidden">
      {/* zoom (i.p.v. transform) zodat de containerhoogte meekrimpt */}
      <div style={{ zoom: scale }} className="bg-white shadow-sm">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
};

/* ------------------------------- pagina ------------------------------- */

const WerkplaatsFactuurNieuw: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, isAdmin } = useAuth();
  const { userBranch } = useCurrentBranch();
  const mayCreate = isAdmin || featureAccess["handmatige-facturen"](userRole);

  const [kind, setKind] = useState<"extern" | "intern">("extern");
  const [customer, setCustomer] = useState<CustomerForm>({ ...emptyCustomer });
  const [vehicle, setVehicle] = useState<VehicleForm>({ ...emptyVehicle });
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [lines, setLines] = useState<EditLine[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [mobileTab, setMobileTab] = useState<"form" | "preview">("form");

  const [tarieven, setTarieven] = useState<WerkplaatsTarieven>(DEFAULT_TARIEVEN);
  const [reparaties, setReparaties] = useState<Reparatie[]>([]);
  const [modellen, setModellen] = useState<WerkplaatsModel[]>([]);
  const [useKleinMateriaal, setUseKleinMateriaal] = useState(true);
  const [useMilieu, setUseMilieu] = useState(true);

  const [custQuery, setCustQuery] = useState("");
  const [custResults, setCustResults] = useState<any[]>([]);
  const [vehQuery, setVehQuery] = useState("");
  const [vehResults, setVehResults] = useState<any[]>([]);

  const [panelMerk, setPanelMerk] = useState("");
  const [panelModel, setPanelModel] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ id: string; invoiceNumber: string; pdfPath: string; total: number } | null>(null);
  const [mailCustomer, setMailCustomer] = useState(true);
  const [mailAdmin, setMailAdmin] = useState(true);
  const [mailing, setMailing] = useState(false);

  /* eenmalig laden — geen afhankelijkheden, dus het formulier reset nooit tijdens typen */
  useEffect(() => {
    (async () => {
      try {
        const [t, r, m] = await Promise.all([fetchTarieven(), fetchReparaties(), fetchModellen()]);
        setTarieven(t); setReparaties(r); setModellen(m);
        setUseKleinMateriaal(t.klein_materiaal_enabled);
        setUseMilieu(t.milieukosten_enabled);
      } catch (e: any) {
        toast({ title: "Prijsdatabase laden mislukt", description: e.message, variant: "destructive" });
      }
    })();
  }, []);

  /* prefill vanuit de Prijslijst-pagina — precies één keer */
  const prefillDone = useRef(false);
  useEffect(() => {
    if (prefillDone.current) return;
    const p = (location.state as any)?.prefillLine;
    if (!p) return;
    prefillDone.current = true;
    setLines([{
      id: newId(),
      kind: "arbeid",
      description: String(p.description ?? "Arbeid"),
      uren: Number(p.uren) || 0,
      tarief: Number(p.tarief) || DEFAULT_TARIEVEN.uurtarief_ex_btw,
      factor: Number(p.merk_factor) || 1,
      amount: round2(Number(p.amount) || 0),
    }]);
    if (p.merk) setPanelMerk(String(p.merk));
    if (p.model) setPanelModel(String(p.model));
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  const setKindAndCustomer = (k: "extern" | "intern") => {
    setKind(k);
    if (k === "intern") setCustomer({ ...INTERN_CUSTOMER });
  };

  const merkFactor = useMemo(
    () => findMerkFactor(modellen, panelMerk || vehicle.brand, panelModel || vehicle.model),
    [modellen, panelMerk, panelModel, vehicle.brand, vehicle.model],
  );

  const patchLine = useCallback((id: string, patch: Partial<EditLine>) => {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }, []);
  const removeLine = useCallback((id: string) => setLines((ls) => ls.filter((l) => l.id !== id)), []);
  const duplicateLine = useCallback((id: string) => {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.id === id);
      if (i < 0) return ls;
      const copy = { ...ls[i], id: newId() };
      return [...ls.slice(0, i + 1), copy, ...ls.slice(i + 1)];
    });
  }, []);

  const addFromPanel = useCallback((p: PriceAddPayload) => {
    const label = `${p.reparatie.reparatie}${panelMerk ? ` — ${panelMerk}${panelModel ? ` ${panelModel}` : ""}` : ""}`;
    setLines((ls) => [...ls, {
      id: newId(),
      kind: "arbeid",
      description: label,
      uren: p.uren,
      tarief: p.tarief,
      factor: p.factor,
      amount: berekenArbeid(p.uren, p.tarief, p.factor),
    }]);
    toast({ title: `${p.reparatie.reparatie} toegevoegd`, description: `Niveau ${p.niveau}` });
  }, [panelMerk, panelModel]);

  const addBlank = (k: LineKind) => setLines((ls) => [...ls, {
    id: newId(),
    kind: k,
    description: "",
    amount: 0,
    ...(k === "arbeid" ? { uren: 1, tarief: tarieven.uurtarief_ex_btw, factor: merkFactor, amount: berekenArbeid(1, tarieven.uurtarief_ex_btw, merkFactor) } : {}),
    ...(k === "onderdeel" ? { qty: 1, unitPrice: 0 } : {}),
  }]);

  const searchCustomers = async () => {
    const s = custQuery.trim();
    if (!s) return;
    const { data } = await (supabase as any)
      .from("contacts")
      .select("id, first_name, last_name, company_name, email, phone, address_street, address_number, address_postal_code, address_city")
      .or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,company_name.ilike.%${s}%,email.ilike.%${s}%`)
      .limit(8);
    setCustResults(data || []);
  };

  const pickCustomer = (c: any) => {
    setCustomer({
      name: c.company_name || `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(),
      street: c.address_street || "",
      house_number: c.address_number || "",
      postal_code: c.address_postal_code || "",
      city: c.address_city || "",
      email: c.email || "",
      phone: c.phone || "",
    });
    setCustResults([]);
    setCustQuery("");
  };

  const searchVehicles = async () => {
    const s = vehQuery.trim();
    if (!s) return;
    const { data } = await (supabase as any)
      .from("vehicles")
      .select("id, brand, model, license_number, mileage, vin")
      .or(`license_number.ilike.%${s}%,brand.ilike.%${s}%,model.ilike.%${s}%`)
      .limit(8);
    setVehResults(data || []);
  };

  const pickVehicle = (v: any) => {
    setVehicle({
      brand: v.brand || "",
      model: v.model || "",
      license_number: v.license_number || "",
      mileage: v.mileage ? String(v.mileage) : "",
    });
    setVehicleId(v.id);
    setVehResults([]);
    setVehQuery("");
    // merk/model automatisch overnemen in het spiek-paneel
    const brandMatch = modellen.find((m) => m.merk.toLowerCase() === String(v.brand ?? "").toLowerCase());
    if (brandMatch) {
      setPanelMerk(brandMatch.merk);
      const mod = modellen.find(
        (m) => m.merk === brandMatch.merk &&
          (m.model.toLowerCase() === String(v.model ?? "").toLowerCase() ||
            String(v.model ?? "").toLowerCase().includes(m.model.toLowerCase())),
      );
      setPanelModel(mod ? mod.model : "");
    }
  };

  const labourTotal = useMemo(
    () => round2(lines.filter((l) => l.kind === "arbeid").reduce((s, l) => s + (Number(l.amount) || 0), 0)),
    [lines],
  );

  const surcharges: InvoiceLine[] = useMemo(() => {
    const out: InvoiceLine[] = [];
    if (useKleinMateriaal && tarieven.klein_materiaal_pct > 0 && labourTotal > 0) {
      out.push({
        description: `Klein materiaal / verbruiksmateriaal (${tarieven.klein_materiaal_pct}% van arbeid)`,
        amount: round2((labourTotal * tarieven.klein_materiaal_pct) / 100),
      });
    }
    if (useMilieu && tarieven.milieukosten_bedrag > 0) {
      out.push({ description: "Milieu-/afvoerkosten", amount: round2(tarieven.milieukosten_bedrag) });
    }
    return out;
  }, [useKleinMateriaal, useMilieu, tarieven, labourTotal]);

  const invoiceLines: InvoiceLine[] = useMemo(() => [
    ...lines.map((l) => ({
      description: l.kind === "onderdeel" && (l.qty ?? 1) > 1
        ? `${l.description} (${l.qty} × ${eur(l.unitPrice ?? 0)})`
        : l.description,
      amount: round2(l.amount),
    })),
    ...surcharges,
  ], [lines, surcharges]);

  const totals = useMemo(() => calcTotals(invoiceLines), [invoiceLines]);

  const previewHtml = useMemo(() => renderInvoiceHtml({
    invoice_number: null,
    customer: { ...customer, name: customer.name || "Nog geen klant" },
    vehicle,
    lines: invoiceLines,
    branch: userBranch,
  }), [customer, vehicle, invoiceLines, userBranch]);

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!customer.name.trim()) e.push("Vul een klantnaam in.");
    if (!invoiceLines.some((l) => l.description.trim() || l.amount)) e.push("Voeg minimaal één factuurregel toe.");
    if (lines.some((l) => !l.description.trim())) e.push("Elke factuurregel heeft een omschrijving nodig.");
    return e;
  }, [customer.name, invoiceLines, lines]);

  const save = async () => {
    if (errors.length) {
      setShowErrors(true);
      toast({ title: "Factuur niet compleet", description: errors[0], variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await saveManualInvoice({
        invoice_kind: kind,
        customer,
        vehicle,
        lines: invoiceLines,
        branch: userBranch || "rotterdam",
        vehicle_id: vehicleId,
      });
      setSaved(res);
      toast({ title: `Factuur ${res.invoiceNumber} opgeslagen` });
    } catch (e: any) {
      toast({ title: "Opslaan mislukt", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const doMail = async () => {
    if (!saved) return;
    const to: string[] = [];
    if (mailCustomer && customer.email) to.push(customer.email);
    if (mailAdmin) to.push("administratie@auto-city.nl");
    if (!to.length) { toast({ title: "Geen ontvangers", variant: "destructive" }); return; }
    setMailing(true);
    try {
      await mailInvoiceTo({
        to,
        invoiceNumber: saved.invoiceNumber,
        customerName: customer.name,
        plate: vehicle.license_number,
        total: saved.total,
        pdfPath: saved.pdfPath,
      });
      toast({ title: "Factuur in de mailwachtrij geplaatst", description: to.join(", ") });
    } catch (e: any) {
      toast({ title: "Mailen mislukt", description: e.message, variant: "destructive" });
    } finally {
      setMailing(false);
    }
  };

  const openPdf = async () => {
    if (!saved) return;
    const url = await getInvoiceSignedUrl(saved.pdfPath);
    if (url) window.open(url, "_blank");
  };

  if (!mayCreate) {
    return (
      <DashboardLayout>
        <AsPage>
          <AsCard className="p-8 text-center text-[13px] text-slate-500">
            Je hebt geen rechten om handmatige facturen op te maken.
          </AsCard>
        </AsPage>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <AsPage>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => navigate("/werkplaats/facturen")}>
              <ArrowLeft className="h-4 w-4 mr-1" />Facturen
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Nieuwe factuur</h1>
              <p className="text-[13px] text-slate-500 mt-0.5">
                Handmatige werkplaatsfactuur — nummer komt uit de bestaande reeks.
              </p>
            </div>
          </div>
          <div className="flex lg:hidden gap-2">
            <Button size="sm" variant={mobileTab === "form" ? "default" : "outline"} onClick={() => setMobileTab("form")}>Formulier</Button>
            <Button size="sm" variant={mobileTab === "preview" ? "default" : "outline"} onClick={() => setMobileTab("preview")}>Voorbeeld</Button>
          </div>
        </div>

        {saved ? (
          <AsCard className="p-5 space-y-4 max-w-2xl">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-[13px] text-emerald-900">
              Factuur <strong>{saved.invoiceNumber}</strong> staat in het archief ({kind}) — totaal {eur(saved.total)} incl. btw.
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-[13px]">
                <Switch checked={mailCustomer} onCheckedChange={setMailCustomer} disabled={!customer.email} />
                Klant {customer.email ? `(${customer.email})` : "(geen e-mail)"}
              </label>
              <label className="flex items-center gap-2 text-[13px]">
                <Switch checked={mailAdmin} onCheckedChange={setMailAdmin} /> administratie@auto-city.nl
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={doMail} disabled={mailing}>
                {mailing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                Factuur mailen
              </Button>
              <Button variant="outline" onClick={openPdf}><ExternalLink className="h-4 w-4 mr-2" />PDF openen</Button>
              <Button variant="ghost" onClick={() => navigate("/werkplaats/facturen")}>Naar archief</Button>
            </div>
          </AsCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-4 items-start">
            {/* ---------------- formulier ---------------- */}
            <div className={`space-y-3 ${mobileTab === "preview" ? "hidden lg:block" : ""}`}>
              <div className="flex gap-2">
                <Button size="sm" variant={kind === "extern" ? "default" : "outline"} onClick={() => setKindAndCustomer("extern")}>
                  Extern (klantfactuur)
                </Button>
                <Button size="sm" variant={kind === "intern" ? "default" : "outline"} onClick={() => setKindAndCustomer("intern")}>
                  Intern (tussen BV's)
                </Button>
              </div>

              <Section icon={<Search className="h-3.5 w-3.5" />} title="Klant">
                <div className="flex gap-2 mb-2.5">
                  <Input
                    placeholder="Zoek klant in database…"
                    value={custQuery}
                    onChange={(e) => setCustQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchCustomers(); } }}
                  />
                  <Button type="button" variant="outline" onClick={searchCustomers}><Search className="h-4 w-4" /></Button>
                </div>
                {custResults.length > 0 && (
                  <div className="mb-2.5 rounded-md border border-slate-200 divide-y">
                    {custResults.map((c) => (
                      <button type="button" key={c.id} onClick={() => pickCustomer(c)} className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-slate-50">
                        {c.company_name || `${c.first_name ?? ""} ${c.last_name ?? ""}`} · {c.email || "—"}
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Field label="Naam" required value={customer.name} invalid={showErrors && !customer.name.trim()}
                    onChange={(v) => setCustomer((c) => ({ ...c, name: v }))} />
                  <Field label="E-mail" value={customer.email} onChange={(v) => setCustomer((c) => ({ ...c, email: v }))} />
                  <Field label="Straat" value={customer.street} onChange={(v) => setCustomer((c) => ({ ...c, street: v }))} />
                  <Field label="Huisnummer" value={customer.house_number} onChange={(v) => setCustomer((c) => ({ ...c, house_number: v }))} />
                  <Field label="Postcode" value={customer.postal_code} onChange={(v) => setCustomer((c) => ({ ...c, postal_code: v }))} />
                  <Field label="Plaats" value={customer.city} onChange={(v) => setCustomer((c) => ({ ...c, city: v }))} />
                  <Field label="Telefoon" value={customer.phone} onChange={(v) => setCustomer((c) => ({ ...c, phone: v }))} />
                </div>
              </Section>

              <Section icon={<Search className="h-3.5 w-3.5" />} title="Auto">
                <div className="flex gap-2 mb-2.5">
                  <Input
                    placeholder="Zoek auto (kenteken/merk)…"
                    value={vehQuery}
                    onChange={(e) => setVehQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchVehicles(); } }}
                  />
                  <Button type="button" variant="outline" onClick={searchVehicles}><Search className="h-4 w-4" /></Button>
                </div>
                {vehResults.length > 0 && (
                  <div className="mb-2.5 rounded-md border border-slate-200 divide-y">
                    {vehResults.map((v) => (
                      <button type="button" key={v.id} onClick={() => pickVehicle(v)} className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-slate-50">
                        {v.license_number || "—"} · {v.brand} {v.model}
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <Field label="Merk" value={vehicle.brand} onChange={(v) => setVehicle((x) => ({ ...x, brand: v }))} />
                  <Field label="Model" value={vehicle.model} onChange={(v) => setVehicle((x) => ({ ...x, model: v }))} />
                  <Field label="Kenteken" value={vehicle.license_number} onChange={(v) => setVehicle((x) => ({ ...x, license_number: v }))} />
                  <Field label="Km-stand" value={vehicle.mileage} onChange={(v) => setVehicle((x) => ({ ...x, mileage: v }))} />
                </div>
              </Section>

              <InvoicePricePanel
                reparaties={reparaties}
                modellen={modellen}
                merk={panelMerk}
                model={panelModel}
                onMerkChange={setPanelMerk}
                onModelChange={setPanelModel}
                merkFactor={merkFactor}
                uurtarief={tarieven.uurtarief_ex_btw}
                onAdd={addFromPanel}
              />

              <Section
                icon={<FileText className="h-3.5 w-3.5" />}
                title="Factuurregels"
                right={
                  <div className="flex gap-1.5">
                    <Button type="button" size="sm" variant="outline" className="h-8 text-[11.5px]" onClick={() => addBlank("arbeid")}>
                      <Wrench className="h-3.5 w-3.5 mr-1" />Arbeid
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-8 text-[11.5px]" onClick={() => addBlank("onderdeel")}>
                      <Package className="h-3.5 w-3.5 mr-1" />Onderdeel
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-8 text-[11.5px]" onClick={() => addBlank("vrij")}>
                      <PenLine className="h-3.5 w-3.5 mr-1" />Vrij / korting
                    </Button>
                  </div>
                }
              >
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  {lines.length === 0 ? (
                    <div className="px-3 py-8 text-center text-[12.5px] text-slate-400">
                      Nog geen regels. Gebruik het prijslijst-paneel of voeg handmatig een regel toe.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {lines.map((l) => (
                        <LineRow key={l.id} line={l} onPatch={patchLine} onRemove={removeLine} onDuplicate={duplicateLine} />
                      ))}
                    </div>
                  )}
                  <div className="px-3 py-2.5 border-t border-slate-200 bg-slate-50 space-y-2">
                    <label className="flex items-center justify-between text-[12.5px]">
                      <span>Klein materiaal ({tarieven.klein_materiaal_pct}% van arbeid)</span>
                      <Switch checked={useKleinMateriaal} onCheckedChange={setUseKleinMateriaal} />
                    </label>
                    <label className="flex items-center justify-between text-[12.5px]">
                      <span>Milieu-/afvoerkosten ({eur(tarieven.milieukosten_bedrag)})</span>
                      <Switch checked={useMilieu} onCheckedChange={setUseMilieu} />
                    </label>
                    {surcharges.map((s) => (
                      <div key={s.description} className="flex justify-between text-[12px] text-slate-500">
                        <span>{s.description}</span><span className="tabular-nums">{eur(s.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>

              {showErrors && errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12.5px] text-red-800">
                  <ul className="list-disc pl-4 space-y-0.5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
                </div>
              )}
            </div>

            {/* ---------------- preview + sticky totalen ---------------- */}
            <div className={`lg:sticky lg:top-4 space-y-3 ${mobileTab === "form" ? "hidden lg:block" : ""}`}>
              <AsCard>
                <div className="px-4 py-3 border-b border-slate-100 space-y-1">
                  <div className="flex justify-between text-[12.5px]"><span className="text-slate-500">Subtotaal ex btw</span><span className="tabular-nums font-medium">{eur(totals.subtotal)}</span></div>
                  <div className="flex justify-between text-[12.5px]"><span className="text-slate-500">BTW 21%</span><span className="tabular-nums font-medium">{eur(totals.vat)}</span></div>
                  <div className="flex justify-between text-[14px] font-bold pt-1 border-t border-slate-100"><span>Totaal incl. btw</span><span className="tabular-nums">{eur(totals.total)}</span></div>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-2">
                  <Badge variant="secondary">{kind === "intern" ? "Betaalstatus n.v.t." : "Betaalstatus: open"}</Badge>
                  <Button onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Factuur opslaan
                  </Button>
                </div>
              </AsCard>

              <AsCard>
                <AsCardHead icon={<FileText className="h-4 w-4" />} tone="teal" title="Voorbeeld" subtitle="Live — zelfde opmaak als de PDF" />
                <div className="p-3 max-h-[70vh] overflow-y-auto">
                  <InvoicePreview html={previewHtml} />
                </div>
              </AsCard>
            </div>
          </div>
        )}
      </AsPage>
    </DashboardLayout>
  );
};

export default WerkplaatsFactuurNieuw;