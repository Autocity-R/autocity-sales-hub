import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Search, Trash2, Wrench, Package, PenLine, Mail, Save, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBranch } from "@/contexts/BranchContext";
import {
  InvoiceLine, calcTotals, eur, saveManualInvoice, mailInvoiceTo, getInvoiceSignedUrl,
} from "@/services/workshopInvoiceService";
import {
  DEFAULT_TARIEVEN, Niveau, Reparatie, WerkplaatsModel, WerkplaatsTarieven,
  berekenArbeid, fetchModellen, fetchReparaties, fetchTarieven, round2, urenVoorNiveau,
} from "@/services/werkplaatsPrijsService";

export interface ManualInvoicePrefill {
  description: string;
  amount: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefillLine?: ManualInvoicePrefill | null;
  onSaved?: () => void;
}

const emptyCustomer = { name: "", street: "", house_number: "", postal_code: "", city: "", email: "", phone: "" };
const emptyVehicle = { brand: "", model: "", license_number: "", mileage: "" };

const INTERN_CUSTOMER = {
  name: "Autocity Automotive Group B.V.",
  street: "Thurledeweg",
  house_number: "61-a",
  postal_code: "3044 ER",
  city: "Rotterdam",
  email: "administratie@auto-city.nl",
  phone: "",
};

const ManualInvoiceDialog: React.FC<Props> = ({ open, onOpenChange, prefillLine, onSaved }) => {
  const { currentBranch } = useBranch() as any;
  const [kind, setKind] = useState<"extern" | "intern">("extern");
  const [customer, setCustomer] = useState({ ...emptyCustomer });
  const [vehicle, setVehicle] = useState({ ...emptyVehicle });
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [labourTotal, setLabourTotal] = useState(0);

  const [tarieven, setTarieven] = useState<WerkplaatsTarieven>(DEFAULT_TARIEVEN);
  const [reparaties, setReparaties] = useState<Reparatie[]>([]);
  const [modellen, setModellen] = useState<WerkplaatsModel[]>([]);
  const [useKleinMateriaal, setUseKleinMateriaal] = useState(true);
  const [useMilieu, setUseMilieu] = useState(true);

  const [custQuery, setCustQuery] = useState("");
  const [custResults, setCustResults] = useState<any[]>([]);
  const [vehQuery, setVehQuery] = useState("");
  const [vehResults, setVehResults] = useState<any[]>([]);

  // arbeid-regel bouwer
  const [aMerk, setAMerk] = useState("");
  const [aModel, setAModel] = useState("");
  const [aRep, setARep] = useState("");
  const [aNiveau, setANiveau] = useState<Niveau>("standaard");
  const [aUren, setAUren] = useState<number>(0);
  const [aTarief, setATarief] = useState<number>(85);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ id: string; invoiceNumber: string; pdfPath: string; total: number } | null>(null);
  const [mailCustomer, setMailCustomer] = useState(true);
  const [mailAdmin, setMailAdmin] = useState(true);
  const [mailing, setMailing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSaved(null);
    (async () => {
      const [t, r, m] = await Promise.all([fetchTarieven(), fetchReparaties(), fetchModellen()]);
      setTarieven(t); setReparaties(r); setModellen(m);
      setATarief(t.uurtarief_ex_btw);
      setUseKleinMateriaal(t.klein_materiaal_enabled);
      setUseMilieu(t.milieukosten_enabled);
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (prefillLine) {
      setLines([{ description: prefillLine.description, amount: prefillLine.amount }]);
      setLabourTotal(round2(prefillLine.amount));
    } else {
      setLines([]);
      setLabourTotal(0);
    }
  }, [open, prefillLine]);

  useEffect(() => {
    if (kind === "intern") setCustomer({ ...INTERN_CUSTOMER });
  }, [kind]);

  const merken = useMemo(
    () => Array.from(new Set(modellen.map((m) => m.merk))).sort((a, b) => a.localeCompare(b)),
    [modellen],
  );
  const aFactor = useMemo(() => {
    const m = modellen.find((x) => x.merk === aMerk && x.model === aModel);
    return m ? Number(m.merk_factor) || 1 : 1;
  }, [modellen, aMerk, aModel]);

  useEffect(() => {
    const r = reparaties.find((x) => x.id === aRep);
    if (r) setAUren(urenVoorNiveau(r, aNiveau));
  }, [aRep, aNiveau, reparaties]);

  const searchCustomers = async () => {
    const s = custQuery.trim();
    if (!s) return;
    const { data } = await (supabase as any)
      .from("contacts")
      .select("id, first_name, last_name, company_name, email, phone, address, zip_code, city")
      .or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,company_name.ilike.%${s}%,email.ilike.%${s}%`)
      .limit(8);
    setCustResults(data || []);
  };

  const pickCustomer = (c: any) => {
    setCustomer({
      name: c.company_name || `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(),
      street: c.address || "",
      house_number: "",
      postal_code: c.zip_code || "",
      city: c.city || "",
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
  };

  const addArbeid = () => {
    const r = reparaties.find((x) => x.id === aRep);
    const amount = berekenArbeid(aUren, aTarief, aFactor);
    if (!amount) { toast({ title: "Vul uren en tarief in", variant: "destructive" }); return; }
    const label = r
      ? `${r.reparatie}${aMerk ? ` — ${aMerk}${aModel ? ` ${aModel}` : ""}` : ""} (${aUren.toFixed(2).replace(".", ",")} u × ${eur(aTarief)}${aFactor !== 1 ? ` × ${aFactor.toFixed(2)}` : ""})`
      : `Arbeid ${aUren.toFixed(2).replace(".", ",")} u × ${eur(aTarief)}`;
    setLines((l) => [...l, { description: label, amount }]);
    setLabourTotal((v) => round2(v + amount));
  };

  const [pDesc, setPDesc] = useState("");
  const [pQty, setPQty] = useState<number>(1);
  const [pPrice, setPPrice] = useState<number>(0);
  const addOnderdeel = () => {
    if (!pDesc.trim() || !pPrice) { toast({ title: "Vul omschrijving en stukprijs in", variant: "destructive" }); return; }
    const amount = round2(pQty * pPrice);
    setLines((l) => [...l, { description: `${pDesc.trim()} (${pQty} × ${eur(pPrice)})`, amount }]);
    setPDesc(""); setPQty(1); setPPrice(0);
  };

  const [fDesc, setFDesc] = useState("");
  const [fAmount, setFAmount] = useState<number>(0);
  const addVrij = () => {
    if (!fDesc.trim()) { toast({ title: "Vul een omschrijving in", variant: "destructive" }); return; }
    setLines((l) => [...l, { description: fDesc.trim(), amount: round2(fAmount) }]);
    setFDesc(""); setFAmount(0);
  };

  const removeLine = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));

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

  const allLines = useMemo(() => [...lines, ...surcharges], [lines, surcharges]);
  const totals = useMemo(() => calcTotals(allLines), [allLines]);

  const save = async () => {
    if (!customer.name.trim()) { toast({ title: "Vul een klantnaam in", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await saveManualInvoice({
        invoice_kind: kind,
        customer,
        vehicle,
        lines: allLines,
        branch: currentBranch || "rotterdam",
        vehicle_id: vehicleId,
      });
      setSaved(res);
      toast({ title: `Factuur ${res.invoiceNumber} opgeslagen` });
      onSaved?.();
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

  const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-800 mb-2.5">{icon}{title}</div>
      {children}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nieuwe factuur</DialogTitle>
          <DialogDescription>
            Handmatige werkplaatsfactuur. Nummer komt uit de bestaande reeks; automatische facturatie blijft ongewijzigd.
          </DialogDescription>
        </DialogHeader>

        {saved ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-[13px] text-emerald-900">
                Factuur <strong>{saved.invoiceNumber}</strong> staat in het archief ({kind}) — totaal {eur(saved.total)} incl. btw.
              </div>
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
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Sluiten</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button size="sm" variant={kind === "extern" ? "default" : "outline"} onClick={() => setKind("extern")}>Extern (klantfactuur)</Button>
              <Button size="sm" variant={kind === "intern" ? "default" : "outline"} onClick={() => setKind("intern")}>Intern (tussen BV's)</Button>
            </div>

            <Section icon={<Search className="h-3.5 w-3.5" />} title="Klant">
              <div className="flex gap-2 mb-2">
                <Input placeholder="Zoek klant in database…" value={custQuery}
                  onChange={(e) => setCustQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchCustomers()} />
                <Button variant="outline" onClick={searchCustomers}><Search className="h-4 w-4" /></Button>
              </div>
              {custResults.length > 0 && (
                <div className="mb-2 rounded-md border border-slate-200 divide-y">
                  {custResults.map((c) => (
                    <button key={c.id} onClick={() => pickCustomer(c)} className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-slate-50">
                      {c.company_name || `${c.first_name ?? ""} ${c.last_name ?? ""}`} · {c.email || "—"}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input placeholder="Naam *" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
                <Input placeholder="E-mail" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
                <Input placeholder="Straat" value={customer.street} onChange={(e) => setCustomer({ ...customer, street: e.target.value })} />
                <Input placeholder="Huisnummer" value={customer.house_number} onChange={(e) => setCustomer({ ...customer, house_number: e.target.value })} />
                <Input placeholder="Postcode" value={customer.postal_code} onChange={(e) => setCustomer({ ...customer, postal_code: e.target.value })} />
                <Input placeholder="Plaats" value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} />
                <Input placeholder="Telefoon" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
              </div>
            </Section>

            <Section icon={<Search className="h-3.5 w-3.5" />} title="Auto">
              <div className="flex gap-2 mb-2">
                <Input placeholder="Zoek auto (kenteken/merk)…" value={vehQuery}
                  onChange={(e) => setVehQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchVehicles()} />
                <Button variant="outline" onClick={searchVehicles}><Search className="h-4 w-4" /></Button>
              </div>
              {vehResults.length > 0 && (
                <div className="mb-2 rounded-md border border-slate-200 divide-y">
                  {vehResults.map((v) => (
                    <button key={v.id} onClick={() => pickVehicle(v)} className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-slate-50">
                      {v.license_number || "—"} · {v.brand} {v.model}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Input placeholder="Merk" value={vehicle.brand} onChange={(e) => setVehicle({ ...vehicle, brand: e.target.value })} />
                <Input placeholder="Model" value={vehicle.model} onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })} />
                <Input placeholder="Kenteken" value={vehicle.license_number} onChange={(e) => setVehicle({ ...vehicle, license_number: e.target.value })} />
                <Input placeholder="Km-stand" value={vehicle.mileage} onChange={(e) => setVehicle({ ...vehicle, mileage: e.target.value })} />
              </div>
            </Section>

            <Section icon={<Wrench className="h-3.5 w-3.5" />} title="Arbeid uit de prijsdatabase">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                <Select value={aMerk} onValueChange={(v) => { setAMerk(v); setAModel(""); }}>
                  <SelectTrigger><SelectValue placeholder="Merk" /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {merken.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={aModel} onValueChange={setAModel} disabled={!aMerk}>
                  <SelectTrigger><SelectValue placeholder="Model" /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {modellen.filter((m) => m.merk === aMerk).map((m) => (
                      <SelectItem key={m.id} value={m.model}>{m.model} · ×{Number(m.merk_factor).toFixed(2)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={aRep} onValueChange={setARep}>
                  <SelectTrigger><SelectValue placeholder="Reparatie" /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {reparaties.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.reparatie} ({r.categorie})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={aNiveau} onValueChange={(v) => setANiveau(v as Niveau)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laag">Laag</SelectItem>
                    <SelectItem value="standaard">Standaard</SelectItem>
                    <SelectItem value="hoog">Hoog</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-[11px]">Uren</Label>
                  <Input type="number" step="0.1" value={aUren} onChange={(e) => setAUren(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Tarief ex btw</Label>
                  <Input type="number" step="0.01" value={aTarief} onChange={(e) => setATarief(Number(e.target.value))} />
                </div>
                <Button variant="outline" onClick={addArbeid}><Plus className="h-4 w-4 mr-1" />{eur(berekenArbeid(aUren, aTarief, aFactor))}</Button>
              </div>
            </Section>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Section icon={<Package className="h-3.5 w-3.5" />} title="Onderdelen">
                <div className="space-y-2">
                  <Input placeholder="Omschrijving" value={pDesc} onChange={(e) => setPDesc(e.target.value)} />
                  <div className="grid grid-cols-3 gap-2">
                    <Input type="number" step="1" min="1" placeholder="Aantal" value={pQty} onChange={(e) => setPQty(Number(e.target.value))} />
                    <Input type="number" step="0.01" placeholder="Stukprijs ex" value={pPrice} onChange={(e) => setPPrice(Number(e.target.value))} />
                    <Button variant="outline" onClick={addOnderdeel}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
              </Section>
              <Section icon={<PenLine className="h-3.5 w-3.5" />} title="Vrije regel / korting">
                <div className="space-y-2">
                  <Input placeholder="Omschrijving" value={fDesc} onChange={(e) => setFDesc(e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" step="0.01" placeholder="Bedrag ex (mag negatief)" value={fAmount} onChange={(e) => setFAmount(Number(e.target.value))} />
                    <Button variant="outline" onClick={addVrij}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
              </Section>
            </div>

            <div className="rounded-lg border border-slate-200">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[12.5px] font-semibold text-slate-800">Factuurregels</div>
              {lines.length === 0 ? (
                <div className="px-3 py-6 text-center text-[12.5px] text-slate-400">Nog geen regels toegevoegd.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {lines.map((l, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2">
                      <div className="flex-1 text-[12.5px] text-slate-800">{l.description}</div>
                      <div className="text-[12.5px] font-semibold tabular-nums">{eur(l.amount)}</div>
                      <Button size="icon" variant="ghost" onClick={() => removeLine(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-3 py-2 border-t border-slate-200 space-y-2">
                <label className="flex items-center justify-between text-[12.5px]">
                  <span>Klein materiaal ({tarieven.klein_materiaal_pct}% van arbeid)</span>
                  <Switch checked={useKleinMateriaal} onCheckedChange={setUseKleinMateriaal} />
                </label>
                <label className="flex items-center justify-between text-[12.5px]">
                  <span>Milieu-/afvoerkosten ({eur(tarieven.milieukosten_bedrag)})</span>
                  <Switch checked={useMilieu} onCheckedChange={setUseMilieu} />
                </label>
                {surcharges.map((s, i) => (
                  <div key={i} className="flex justify-between text-[12px] text-slate-500">
                    <span>{s.description}</span><span className="tabular-nums">{eur(s.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="px-3 py-2 border-t border-slate-200 bg-slate-50 space-y-1">
                <div className="flex justify-between text-[12.5px]"><span>Subtotaal ex btw</span><span className="tabular-nums">{eur(totals.subtotal)}</span></div>
                <div className="flex justify-between text-[12.5px]"><span>BTW 21%</span><span className="tabular-nums">{eur(totals.vat)}</span></div>
                <div className="flex justify-between text-[13.5px] font-bold"><span>Totaal incl. btw</span><span className="tabular-nums">{eur(totals.total)}</span></div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary">{kind === "intern" ? "Betaalstatus n.v.t." : "Betaalstatus: open"}</Badge>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuleren</Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Factuur opslaan
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ManualInvoiceDialog;
