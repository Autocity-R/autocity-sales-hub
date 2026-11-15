import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Download, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { parseBedrag, type CreditInfo } from "@/lib/creditfactuur";
import {
  eur, crediteerFactuur, saveCreditPdf, dispatchPendingInternalInvoices,
  type CreditModus, type CreditRequest, type CreditResult,
} from "@/services/workshopInvoiceService";

export interface CreditableInvoice {
  id: string; invoice_number: string | null; created_at: string; invoice_kind: string | null;
  lines: any; subtotal: number | null; vat?: number | null; total: number;
  customer: any; vehicle: any; vehicle_id?: string | null; work_order_id: string | null;
  tak: string | null; branch: string | null; payment_status: string | null;
}

interface Props {
  invoice: CreditableInvoice | null;
  info: CreditInfo | null;
  /** rollen die handmatige facturen mogen maken → "Crediteren en opnieuw factureren" */
  mayReinvoice: boolean;
  /** mag interne creditfacturen direct naar de administratie sturen (niet voor alleen-lezen rollen) */
  mayDispatch: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}

type RegelSel = Record<number, { on: boolean; bedrag: string }>;

const MODI: { k: CreditModus; label: string }[] = [
  { k: "volledig", label: "Hele factuur" },
  { k: "regels", label: "Regels kiezen" },
  { k: "bedrag", label: "Bedrag" },
];

const CrediteerFactuurDialog: React.FC<Props> = ({ invoice, info, mayReinvoice, mayDispatch, onOpenChange, onDone }) => {
  const navigate = useNavigate();
  const [modus, setModus] = useState<CreditModus>("volledig");
  const [reden, setReden] = useState("");
  const [bedrag, setBedrag] = useState("");
  const [sel, setSel] = useState<RegelSel>({});
  const [preview, setPreview] = useState<CreditResult | null>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ result: CreditResult; pdfUrl: string | null } | null>(null);

  const lines: { description: string; amount: number }[] = Array.isArray(invoice?.lines) ? invoice!.lines : [];
  const isIntern = invoice?.invoice_kind === "intern" || invoice?.invoice_kind === "poets_intern";
  const canReinvoice = mayReinvoice && (invoice?.invoice_kind === "extern" || invoice?.invoice_kind === "intern");

  // reset bij openen van een andere factuur
  useEffect(() => {
    setModus(info && info.n > 0 ? "bedrag" : "volledig");
    setReden(""); setBedrag(""); setSel({}); setPreview(null); setPreviewErr(null); setDone(null);
  }, [invoice?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const request = useMemo((): CreditRequest | null => {
    if (!invoice) return null;
    const base = { invoiceId: invoice.id, modus, reden: reden.trim() || "(voorbeeld)" };
    if (modus === "volledig") return base;
    if (modus === "bedrag") {
      const b = parseBedrag(bedrag);
      return b && b > 0 ? { ...base, bedragExcl: b } : null;
    }
    const regels = Object.entries(sel).filter(([, v]) => v.on).map(([k, v]) => {
      const b = parseBedrag(v.bedrag);
      return b != null ? { index: Number(k), bedrag: b } : { index: Number(k) };
    });
    return regels.length ? { ...base, regels } : null;
  }, [invoice, modus, reden, bedrag, sel]);

  // live preview via dry-run (geen nummer, niets opgeslagen)
  useEffect(() => {
    if (!request || done) { setPreview(null); setPreviewErr(null); return; }
    let stop = false;
    setPreviewing(true);
    const t = setTimeout(async () => {
      try {
        const r = await crediteerFactuur(request, true);
        if (!stop) { setPreview(r); setPreviewErr(null); }
      } catch (e: any) {
        if (!stop) { setPreview(null); setPreviewErr(e.message || "Berekenen mislukt"); }
      } finally {
        if (!stop) setPreviewing(false);
      }
    }, 350);
    return () => { stop = true; clearTimeout(t); };
  }, [request, done]);

  const submit = async (reinvoice: boolean) => {
    if (!invoice || !request) return;
    if (!reden.trim()) { toast({ title: "Reden is verplicht", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const r = await crediteerFactuur({ ...request, reden: reden.trim() }, false);
      let pdfUrl: string | null = null;
      if (r.status === "definitief" && r.invoice_number) {
        try {
          const { blob } = await saveCreditPdf({
            invoice_number: r.invoice_number, customer: invoice.customer || { name: "" }, vehicle: invoice.vehicle || {},
            lines: r.regels, subtotal: r.subtotal, vat: r.vat, total: r.total, branch: invoice.branch,
            credit_tekst: r.document_tekst,
          });
          pdfUrl = URL.createObjectURL(blob);
        } catch (e: any) {
          toast({ title: "Creditfactuur aangemaakt, PDF opslaan mislukt", description: "Open de PDF later via de lijst; hij wordt dan opnieuw gemaakt.", variant: "destructive" });
        }
        toast({ title: `Creditfactuur ${r.invoice_number} aangemaakt — mail hem zelf naar de klant` });
      } else {
        toast({ title: `Creditfactuur ${r.invoice_number} aangemaakt`, description: "Wordt naar de administratie gestuurd." });
        if (mayDispatch) {
          dispatchPendingInternalInvoices().catch(() => undefined).then(() => onDone());
        }
      }
      onDone();
      if (reinvoice) {
        onOpenChange(false);
        navigate("/werkplaats/facturen/nieuw", {
          state: {
            prefillInvoice: {
              kind: invoice.invoice_kind === "intern" ? "intern" : "extern",
              customer: invoice.customer, vehicle: invoice.vehicle, vehicle_id: invoice.vehicle_id || null,
              lines, tak: invoice.tak, work_order_id: invoice.work_order_id, branch: invoice.branch,
            },
          },
        });
        return;
      }
      setDone({ result: r, pdfUrl });
    } catch (e: any) {
      toast({ title: "Crediteren mislukt", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const close = (v: boolean) => {
    if (!v && done?.pdfUrl) URL.revokeObjectURL(done.pdfUrl);
    onOpenChange(v);
  };

  return (
    <Dialog open={!!invoice} onOpenChange={close}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Factuur {invoice?.invoice_number} crediteren</DialogTitle>
          <DialogDescription>
            {invoice?.customer?.name || "—"} · {eur(Number(invoice?.subtotal) || 0)} excl. btw
            {info && info.n > 0 && <> · al gecrediteerd {eur(info.gecrediteerdExcl)} · nog {eur(info.nogExcl)}</>}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-border bg-muted p-3">
              <div className="font-semibold">Creditfactuur {done.result.invoice_number} aangemaakt</div>
              <div className="mt-1 text-muted-foreground">
                {done.result.status === "definitief"
                  ? "Mail hem zelf naar de klant. Er is niets automatisch verstuurd."
                  : mayDispatch ? "Wordt naar de administratie gestuurd." : "Wordt naar de administratie gestuurd zodra de werkplaats de facturen opent."}
              </div>
              <div className="mt-2 tabular-nums">{eur(done.result.subtotal)} excl. · {eur(done.result.vat)} btw · <b>{eur(done.result.total)}</b> incl.</div>
            </div>
            <DialogFooter className="gap-2">
              {done.pdfUrl && (
                <Button asChild variant="outline">
                  <a href={done.pdfUrl} download={`${done.result.invoice_number}.pdf`}><Download className="h-4 w-4 mr-1" />Download PDF</a>
                </Button>
              )}
              <Button onClick={() => close(false)}>Sluiten</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {MODI.map((m) => (
                <Button key={m.k} type="button" size="sm" variant={modus === m.k ? "default" : "outline"} onClick={() => setModus(m.k)}>{m.label}</Button>
              ))}
            </div>

            {modus === "volledig" && (
              <p className="text-[13px] text-muted-foreground">Alle {lines.length} regels worden volledig gecrediteerd.</p>
            )}

            {modus === "regels" && (
              <div className="space-y-2">
                {lines.map((l, i) => {
                  const s = sel[i] || { on: false, bedrag: "" };
                  return (
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-border p-2">
                      <Checkbox checked={s.on} onCheckedChange={(v) => setSel((p) => ({ ...p, [i]: { ...s, on: !!v } }))} className="mt-1" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] line-clamp-2">{l.description || `Regel ${i + 1}`}</div>
                        <div className="text-[11.5px] text-muted-foreground tabular-nums">{eur(Number(l.amount) || 0)} excl.</div>
                      </div>
                      {s.on && (
                        <Input className="h-8 w-28" inputMode="decimal" placeholder="heel bedrag" value={s.bedrag}
                          onChange={(e) => setSel((p) => ({ ...p, [i]: { ...s, bedrag: e.target.value } }))} />
                      )}
                    </div>
                  );
                })}
                <p className="text-[11.5px] text-muted-foreground">Laat het bedrag leeg om de hele regel te crediteren, of vul een deelbedrag excl. btw in.</p>
              </div>
            )}

            {modus === "bedrag" && (
              <div className="space-y-1">
                <Label className="text-[12px]">Bedrag excl. btw</Label>
                <Input inputMode="decimal" placeholder="bijv. 100,00" value={bedrag} onChange={(e) => setBedrag(e.target.value)} />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-[12px]">Reden *</Label>
              <Textarea rows={2} value={reden} onChange={(e) => setReden(e.target.value)} placeholder="Bijv. dubbel gefactureerd, verkeerd tarief…" />
            </div>

            <div className="rounded-lg border border-border bg-muted p-3 text-[13px]">
              {previewing && !preview && !previewErr ? (
                <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Doorrekenen…</div>
              ) : previewErr ? (
                <div className="text-destructive">{previewErr}</div>
              ) : preview ? (
                <div className="space-y-1 tabular-nums">
                  <div className="flex justify-between"><span>Excl. btw</span><span>{eur(preview.subtotal)}</span></div>
                  <div className="flex justify-between"><span>Btw</span><span>{eur(preview.vat)}</span></div>
                  <div className="flex justify-between font-semibold"><span>Incl. btw</span><span>{eur(preview.total)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Nog te crediteren na deze credit</span><span>{eur(preview.nog_te_crediteren_na)}</span></div>
                  {preview.origineel.payment_status === "betaald" && invoice?.invoice_kind !== "intern" && (
                    <div className="pt-1 text-destructive">Deze factuur is al betaald: er is een terugbetaling van {eur(-preview.total)} nodig.</div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground">{modus === "regels" ? "Kies minimaal één regel." : "Vul een bedrag in."}</div>
              )}
            </div>
            <p className="text-[11.5px] text-muted-foreground">
              {isIntern ? "Een interne creditfactuur gaat automatisch naar de administratie." : "Een externe creditfactuur wordt alleen aangemaakt met PDF; er gaat niets naar de klant."}
              {" "}De credit telt mee in de omzet van deze maand.
            </p>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="ghost" onClick={() => close(false)} disabled={saving}>Annuleren</Button>
              {canReinvoice && (
                <Button variant="outline" disabled={saving || !preview || !reden.trim()} onClick={() => submit(true)}>
                  <RotateCcw className="h-4 w-4 mr-1" />Crediteren en opnieuw factureren
                </Button>
              )}
              <Button variant="destructive" disabled={saving || !preview || !reden.trim()} onClick={() => submit(false)}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Crediteren
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CrediteerFactuurDialog;
