import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsCard, AsCardHead } from "@/components/aftersales/ui";
import { FileText, Plus, Trash2, Send, Save, Loader2, User, Car } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  InvoiceDraft, InvoiceLine, calcTotals, eur, renderInvoiceHtml, saveWorkshopInvoice,
} from "@/services/workshopInvoiceService";

export interface WorkshopInvoiceDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: InvoiceDraft | null;
  onSaved?: () => void;
}

export const WorkshopInvoiceDialog: React.FC<WorkshopInvoiceDialogProps> = ({ open, onOpenChange, initial, onSaved }) => {
  const [customer, setCustomer] = useState({ name: "", address: "", email: "", phone: "" });
  const [vehicle, setVehicle] = useState({ brand: "", model: "", license_number: "", vin: "" });
  const [lines, setLines] = useState<InvoiceLine[]>([{ description: "", amount: 0 }]);
  const [busy, setBusy] = useState<null | "concept" | "send">(null);

  useEffect(() => {
    if (!open || !initial) return;
    setCustomer({
      name: initial.customer?.name || "",
      address: initial.customer?.address || "",
      email: initial.customer?.email || "",
      phone: initial.customer?.phone || "",
    });
    setVehicle({
      brand: initial.vehicle?.brand || "",
      model: initial.vehicle?.model || "",
      license_number: initial.vehicle?.license_number || "",
      vin: initial.vehicle?.vin || "",
    });
    setLines(initial.lines?.length ? initial.lines : [{ description: "", amount: 0 }]);
  }, [open, initial]);

  const draft: InvoiceDraft = useMemo(() => ({
    id: initial?.id ?? null,
    work_order_id: initial?.work_order_id ?? null,
    invoice_number: initial?.invoice_number ?? null,
    branch: initial?.branch ?? "rotterdam",
    customer,
    vehicle,
    lines,
  }), [initial, customer, vehicle, lines]);

  const totals = calcTotals(lines);
  const previewHtml = useMemo(() => renderInvoiceHtml(draft), [draft]);

  const setLine = (i: number, patch: Partial<InvoiceLine>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

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
            <h2 className="text-[18px] font-semibold tracking-tight text-slate-900">Factuur opmaken</h2>
            <p className="text-[12.5px] text-slate-500">
              Externe werkplaatsopdracht · factuurnummer wordt toegekend bij versturen.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Formulier */}
            <div className="space-y-4">
              <AsCard>
                <AsCardHead icon={<User className="h-4 w-4" />} tone="blue" title="Klantgegevens" subtitle="Vooringevuld uit de opdracht" />
                <div className="p-4 grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label className="text-[12px]">Naam</Label>
                    <Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-[12px]">Adres</Label>
                    <Input value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
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

              <AsCard>
                <AsCardHead icon={<Car className="h-4 w-4" />} tone="slate" title="Voertuig" />
                <div className="p-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label className="text-[12px]">Merk</Label>
                    <Input value={vehicle.brand} onChange={(e) => setVehicle({ ...vehicle, brand: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-[12px]">Model</Label>
                    <Input value={vehicle.model} onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-[12px]">Kenteken</Label>
                    <Input value={vehicle.license_number} onChange={(e) => setVehicle({ ...vehicle, license_number: e.target.value.toUpperCase() })} />
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
                    <div key={i} className="flex gap-2 items-center">
                      <Input
                        className="flex-1" placeholder="Omschrijving"
                        value={l.description} onChange={(e) => setLine(i, { description: e.target.value })}
                      />
                      <Input
                        className="w-32" type="number" step="0.01" placeholder="0,00"
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
            </div>

            {/* Live preview */}
            <AsCard className="self-start lg:sticky lg:top-2">
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