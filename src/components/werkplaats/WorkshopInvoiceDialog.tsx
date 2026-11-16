import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsCard, AsCardHead } from "@/components/aftersales/ui";
import { FileText, Plus, Trash2, Send, Save, Loader2, User, Car, Check, Ban } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InterneFactuurInfo } from "@/components/werkplaats/InterneFactuurInfo";
import type { WerkorderDetail } from "@/lib/factuurWerkorders";
import {
  INTERNE_KLANT, GEEN_KOSTEN_REDENEN, geenKostenReden, valideerInternKeuze, type InterneRegel,
} from "@/lib/interneFactuur";
import { goedkeurenMetFactuur, type GoedkeurResultaat } from "@/services/werkorderDetailsService";
import { toast } from "@/hooks/use-toast";
import {
  InvoiceDraft, calcTotals, eur, renderInvoiceHtml, saveWorkshopInvoice,
} from "@/services/workshopInvoiceService";

export interface WorkshopInvoiceDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: InvoiceDraft | null;
  onSaved?: () => void;
  /**
   * Interne werkplaatsfactuur (BOUWSTAP 19B): vaste klant Autocity Automotive Group, opslaan via de RPC
   * werkorder_goedkeuren_met_factuur (factuur + goedkeuren in één handeling, of "Geen kosten" met reden).
   */
  intern?: { detail: WerkorderDetail | null; modus: "goedkeuren" | "factureren"; onDone?: (r: GoedkeurResultaat) => void } | null;
}

export const WorkshopInvoiceDialog: React.FC<WorkshopInvoiceDialogProps> = ({ open, onOpenChange, initial, onSaved, intern }) => {
  const [customer, setCustomer] = useState({
    name: "", address: "", street: "", house_number: "", postal_code: "", city: "", email: "", phone: "",
  });
  const [vehicle, setVehicle] = useState({ brand: "", model: "", license_number: "", vin: "", mileage: "", year: "" });
  const [lines, setLines] = useState<InterneRegel[]>([{ description: "", amount: 0 }]);
  const [busy, setBusy] = useState<null | "concept" | "send" | "intern">(null);
  const [geenKosten, setGeenKosten] = useState(false);
  const [gkKeuze, setGkKeuze] = useState("");
  const [gkToelichting, setGkToelichting] = useState("");
  const isIntern = !!intern;
  const isGarantie = intern?.detail?.source === "garantie";

  useEffect(() => {
    if (!open || !initial) return;
    setCustomer({
      name: initial.customer?.name || "",
      address: initial.customer?.address || "",
      street: initial.customer?.street || "",
      house_number: initial.customer?.house_number || "",
      postal_code: initial.customer?.postal_code || "",
      city: initial.customer?.city || "",
      email: initial.customer?.email || "",
      phone: initial.customer?.phone || "",
    });
    setVehicle({
      brand: initial.vehicle?.brand || "",
      model: initial.vehicle?.model || "",
      license_number: initial.vehicle?.license_number || "",
      vin: initial.vehicle?.vin || "",
      mileage: initial.vehicle?.mileage != null ? String(initial.vehicle.mileage) : "",
      year: initial.vehicle?.year != null ? String(initial.vehicle.year) : "",
    });
    setLines(initial.lines?.length ? initial.lines : [{ description: "", amount: 0 }]);
    setGeenKosten(false); setGkKeuze(""); setGkToelichting("");
  }, [open, initial]);

  const draft: InvoiceDraft = useMemo(() => ({
    id: initial?.id ?? null,
    work_order_id: initial?.work_order_id ?? null,
    invoice_number: initial?.invoice_number ?? null,
    branch: initial?.branch ?? "rotterdam",
    customer: isIntern ? { ...INTERNE_KLANT } : customer,
    vehicle,
    lines,
  }), [initial, customer, vehicle, lines, isIntern]);

  const totals = calcTotals(lines);
  const previewHtml = useMemo(() => renderInvoiceHtml(draft), [draft]);

  const setLine = (i: number, patch: Partial<InterneRegel>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const saveIntern = async () => {
    if (!intern?.detail) return;
    const reden = geenKostenReden(gkKeuze, gkToelichting);
    const fout = valideerInternKeuze(geenKosten ? { soort: "geen_kosten", reden } : { soort: "factuur", regels: lines });
    if (fout) { toast({ title: fout, variant: "destructive" }); return; }
    setBusy("intern");
    try {
      const res = await goedkeurenMetFactuur(intern.detail.id, geenKosten ? { geenKostenReden: reden } : { regels: lines });
      toast({
        title: res.geen_kosten
          ? (res.goedgekeurd ? "Goedgekeurd zonder kosten" : "Gemarkeerd: geen kosten")
          : `${res.goedgekeurd ? "Goedgekeurd · " : ""}interne factuur ${res.invoice_number} gemaakt`,
        description: res.claimkosten_ingevuld ? "De kosten staan nu ook in de garantieclaim." : undefined,
      });
      intern.onDone?.(res);
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Niet gelukt", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const save = async (send: boolean) => {
    if (!customer.name.trim()) { toast({ title: "Klantnaam is verplicht", variant: "destructive" }); return; }
    if (send && !lines.some((l) => l.description.trim() && Number(l.amount) > 0)) {
      toast({ title: "Minimaal één factuurregel met bedrag", variant: "destructive" }); return;
    }
    setBusy(send ? "send" : "concept");
    try {
      const res = await saveWorkshopInvoice(draft, { send });
      toast({ title: send ? `Factuur ${res.invoiceNumber} verstuurd` : "Concept opgeslagen" });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Fout", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] w-[97vw] max-h-[92vh] overflow-y-auto p-0 bg-[#e7eaef]">
        <div className="p-4 md:p-5 space-y-4">
          <div>
            <h2 className="text-[18px] font-semibold tracking-tight text-slate-900">
              {isIntern ? (intern?.modus === "goedkeuren" ? "Goedkeuren met interne factuur" : "Interne factuur opmaken") : "Factuur opmaken"}
            </h2>
            <p className="text-[12.5px] text-slate-500">
              {isIntern
                ? intern?.modus === "goedkeuren"
                  ? "De order wordt pas goedgekeurd als de factuur is opgeslagen. Annuleren = de order blijft wachten op goedkeuring."
                  : "Interne werkplaatsfactuur aan Autocity Automotive Group · gaat via de administratie."
                : "Externe werkplaatsopdracht · factuurnummer wordt toegekend bij versturen."}
            </p>
          </div>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {/* Formulier */}
            <div className="space-y-4 min-w-0">
              {isIntern ? (
                <AsCard>
                  <AsCardHead icon={<User className="h-4 w-4" />} tone="blue" title="Klant" subtitle="Interne factuur · tak werkplaats" />
                  <div className="p-4 text-[13px] text-slate-800">
                    <div className="font-medium">{INTERNE_KLANT.name}</div>
                    <div className="text-slate-500">{INTERNE_KLANT.street} {INTERNE_KLANT.house_number} · {INTERNE_KLANT.postal_code} {INTERNE_KLANT.city}</div>
                  </div>
                </AsCard>
              ) : (
              <AsCard>
                <AsCardHead icon={<User className="h-4 w-4" />} tone="blue" title="Klantgegevens" subtitle="Vooringevuld uit de opdracht" />
                <div className="p-4 grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label className="text-[12px]">Naam</Label>
                    <Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2 grid grid-cols-[1fr_90px] gap-3">
                    <div>
                      <Label className="text-[12px]">Straat</Label>
                      <Input value={customer.street} onChange={(e) => setCustomer({ ...customer, street: e.target.value })} placeholder="Thurledeweg" />
                    </div>
                    <div>
                      <Label className="text-[12px]">Huisnr.</Label>
                      <Input value={customer.house_number} onChange={(e) => setCustomer({ ...customer, house_number: e.target.value })} placeholder="61-a" />
                    </div>
                  </div>
                  <div className="sm:col-span-2 grid grid-cols-[120px_1fr] gap-3">
                    <div>
                      <Label className="text-[12px]">Postcode</Label>
                      <Input value={customer.postal_code} onChange={(e) => setCustomer({ ...customer, postal_code: e.target.value })} placeholder="3044 ER" />
                    </div>
                    <div>
                      <Label className="text-[12px]">Plaats</Label>
                      <Input value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} placeholder="Rotterdam" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[12px]">E-mail</Label>
                    <Input value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-[12px]">Telefoon</Label>
                    <Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
                  </div>
                </div>
              </AsCard>
              )}

              {isIntern && <InterneFactuurInfo detail={intern?.detail ?? null} />}

              <AsCard>
                <AsCardHead icon={<Car className="h-4 w-4" />} tone="slate" title="Voertuig" />
                <div className="p-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label className="text-[12px]">Merk</Label>
                    <Input readOnly={isIntern} value={vehicle.brand} onChange={(e) => setVehicle({ ...vehicle, brand: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-[12px]">Model</Label>
                    <Input readOnly={isIntern} value={vehicle.model} onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-[12px]">Kenteken</Label>
                    <Input readOnly={isIntern} value={vehicle.license_number} onChange={(e) => setVehicle({ ...vehicle, license_number: e.target.value.toUpperCase() })} />
                  </div>
                  <div>
                    <Label className="text-[12px]">Km-stand</Label>
                    <Input readOnly={isIntern} value={vehicle.mileage} onChange={(e) => setVehicle({ ...vehicle, mileage: e.target.value })} placeholder="84120" />
                  </div>
                </div>
              </AsCard>

              <AsCard>
                <AsCardHead
                  icon={<FileText className="h-4 w-4" />} tone="teal" title="Factuurregels" subtitle="Bedragen exclusief btw"
                  right={
                    <Button size="sm" variant="outline" onClick={() => setLines([...lines, { description: "", amount: 0 }])}>
                      <Plus className="h-3.5 w-3.5 mr-1" />Regel
                    </Button>
                  }
                />
                <div className="p-4 space-y-2">
                  {lines.map((l, i) => (
                    <div key={i} className={`flex gap-2 items-center ${isIntern && isGarantie ? "flex-wrap sm:flex-nowrap" : ""}`}>
                      <Input
                        className={`flex-1 ${isIntern && isGarantie ? "min-w-full sm:min-w-0" : ""}`} placeholder="Omschrijving"
                        value={l.description} onChange={(e) => setLine(i, { description: e.target.value })}
                      />
                      {isIntern && isGarantie && (
                        <Select value={l.soort || "arbeid"} onValueChange={(v) => setLine(i, { soort: v as InterneRegel["soort"] })}>
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="arbeid">Arbeid</SelectItem>
                            <SelectItem value="onderdelen">Onderdelen</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      <Input
                        className="w-32" type="number" step="0.01" min="0" placeholder="0,00" disabled={geenKosten}
                        value={l.amount === 0 ? "" : String(l.amount)}
                        onChange={(e) => setLine(i, { amount: parseFloat(e.target.value) || 0 })}
                      />
                      <Button
                        size="icon" variant="ghost" className="text-slate-400 hover:text-red-600 shrink-0"
                        onClick={() => setLines(lines.length > 1 ? lines.filter((_, idx) => idx !== i) : [{ description: "", amount: 0 }])}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="pt-3 mt-2 border-t border-slate-100 space-y-1 text-[13px]">
                    <div className="flex justify-between text-slate-600"><span>Subtotaal</span><span className="tabular-nums">{eur(totals.subtotal)}</span></div>
                    <div className="flex justify-between text-slate-600"><span>BTW 21%</span><span className="tabular-nums">{eur(totals.vat)}</span></div>
                    <div className="flex justify-between font-bold text-slate-900 text-[15px]"><span>Totaal</span><span className="tabular-nums">{eur(totals.total)}</span></div>
                  </div>
                </div>
              </AsCard>

              {isIntern && (
                <AsCard>
                  <div className="p-4 space-y-3">
                    <label className="flex items-center gap-2 text-[13px] text-slate-800 cursor-pointer">
                      <input type="checkbox" checked={geenKosten} onChange={(e) => setGeenKosten(e.target.checked)} />
                      Geen kosten (geen factuur) — reden verplicht
                    </label>
                    {geenKosten && (
                      <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
                        <Select value={gkKeuze} onValueChange={setGkKeuze}>
                          <SelectTrigger><SelectValue placeholder="Kies een reden…" /></SelectTrigger>
                          <SelectContent>
                            {GEEN_KOSTEN_REDENEN.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder={gkKeuze === "Anders" ? "Toelichting (verplicht)" : "Toelichting (optioneel)"}
                          value={gkToelichting} onChange={(e) => setGkToelichting(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </AsCard>
              )}

              {isIntern ? (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={saveIntern} disabled={!!busy || !intern?.detail}>
                    {busy === "intern" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : geenKosten ? <Ban className="h-4 w-4 mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                    {intern?.modus === "goedkeuren"
                      ? geenKosten ? "Goedkeuren zonder kosten" : "Factuur opslaan en goedkeuren"
                      : geenKosten ? "Geen kosten vastleggen" : "Factuur opslaan"}
                  </Button>
                  <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={!!busy}>Annuleren</Button>
                </div>
              ) : (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => save(true)} disabled={!!busy}>
                  {busy === "send" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                  Versturen
                </Button>
                <Button variant="outline" onClick={() => save(false)} disabled={!!busy}>
                  {busy === "concept" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Opslaan als concept
                </Button>
                <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={!!busy}>Annuleren</Button>
              </div>
              )}
            </div>

            {/* Live preview */}
            <AsCard className="self-start lg:sticky lg:top-2 min-w-0">
              <AsCardHead icon={<FileText className="h-4 w-4" />} tone="violet" title="Voorbeeld" subtitle="Zo wordt de factuur verstuurd" />
              <div className="p-3 bg-slate-100 overflow-x-auto">
                <div
                  className="origin-top-left"
                  style={{ transform: "scale(0.68)", width: 794, height: 1123 * 0.68 }}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </AsCard>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkshopInvoiceDialog;