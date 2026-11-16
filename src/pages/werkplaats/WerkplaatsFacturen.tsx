import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { AsPage, AsCard, AsCardHead, AsLicensePlate, AsPill } from "@/components/aftersales/ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Search, ExternalLink, Send, Pencil, Plus, Check, Calculator, Undo2, ChevronDown, ChevronRight, Copy } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { VehicleTimeline } from "@/components/vehicle/VehicleTimeline";
import { NogTeFacturerenIntern } from "@/components/werkplaats/NogTeFacturerenIntern";
import { GekoppeldeWerkorders } from "@/components/werkplaats/GekoppeldeWerkorders";
import { mogelijkDubbel, type DubbelOrder, type WerkorderDetail } from "@/lib/factuurWerkorders";
import { fetchWerkorderDetails } from "@/services/werkorderDetailsService";
import { toast } from "@/hooks/use-toast";
import WorkshopInvoiceDialog from "@/components/werkplaats/WorkshopInvoiceDialog";
import { useAuth } from "@/contexts/AuthContext";
import { featureAccess } from "@/lib/routeAccess";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { countsAsRevenue, nlDate, linkedOrderIds } from "@/lib/omzet";
import { fetchOmzetBron, poetsNogOpMaandfactuur, dayStr } from "@/services/omzetService";
import { NogTeFacturerenExtern } from "@/components/werkplaats/NogTeFacturerenExtern";
import CrediteerFactuurDialog from "@/components/werkplaats/CrediteerFactuurDialog";
import { isCredit, creditInfo, crediteerbaar, creditBadge, betaalLabel, mayCrediteer, creditDocumentTekst, type CreditInfo } from "@/lib/creditfactuur";
import { buildHaystack, matchesSearch, amountTokens } from "@/lib/searchNormalize";
import {
  eur, getInvoiceSignedUrl, getInvoicePdfBase64, queueInvoiceEmail, InvoiceDraft,
  dispatchPendingInternalInvoices, resendInternalInvoice, setInvoicePaymentStatus, saveCreditPdf,
} from "@/services/workshopInvoiceService";

interface InvoiceRow {
  id: string; invoice_number: string | null; created_at: string; status: string;
  customer: any; vehicle: any; lines: any; total: number; pdf_path: string | null; branch: string | null;
  work_order_id: string | null; invoice_kind: string | null; subtotal: number | null;
  source_work_order_ids: string[] | null;
  payment_status: string | null;
  omzet_datum: string | null; telt_niet_mee: boolean | null; tak: string | null;
  vat: number | null; vehicle_id: string | null;
  document_type: string | null; credit_van_invoice_id: string | null; credit_reden: string | null;
}

const EMPTY_INFO: CreditInfo = { n: 0, gecrediteerdExcl: 0, gecrediteerdIncl: 0, nogExcl: 0, nogVat: 0, nogIncl: 0, volledig: false };

const WerkplaatsFacturen: React.FC = () => {
  const roleAccess = useRoleAccess();
  const readOnly = roleAccess.isDirectieReadOnly();
  // Operationeel directeur mag (alleen) de betaalstatus omzetten
  const mayTogglePaid = !readOnly || roleAccess.isOperationeelDirecteur();
  const { userRole, isAdmin } = useAuth();
  const mayCreateManual = isAdmin || featureAccess["handmatige-facturen"](userRole);
  const mayCredit = mayCrediteer(userRole, isAdmin);
  const [creditFor, setCreditFor] = useState<InvoiceRow | null>(null);
  const navigate = useNavigate();
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<InvoiceDraft | null>(null);
  const [tab, setTab] = useState<"intern" | "extern" | "poets" | "credit" | "dubbel">("extern");
  // BOUWSTAP 19A: gekoppelde werkorders per factuur + "mogelijk dubbel" (alleen weergave)
  const [checklistOrders, setChecklistOrders] = useState<DubbelOrder[]>([]);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<Map<string, WerkorderDetail>>(new Map());
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [historie, setHistorie] = useState<{ id: string; label: string } | null>(null);
  const [poetsOpen, setPoetsOpen] = useState({ count: 0, bedrag: 0 });

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAllPages<InvoiceRow>((a, b) => (supabase as any)
        .from("workshop_invoices")
        .select("id, invoice_number, created_at, status, customer, vehicle, lines, total, subtotal, vat, pdf_path, branch, work_order_id, source_work_order_ids, vehicle_id, invoice_kind, payment_status, omzet_datum, telt_niet_mee, tak, document_type, credit_van_invoice_id, credit_reden")
        .order("created_at", { ascending: false })
        .range(a, b));
      setRows(data);
      const orders = await fetchAllPages<DubbelOrder>((a, b) => (supabase as any).from("work_orders")
        .select("id, vehicle_id, discipline, source, approved_at")
        .eq("discipline", "werkplaats").eq("source", "checklist").order("id").range(a, b));
      setChecklistOrders(orders);
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const bron = await fetchOmzetBron(from, to, "all");
      const open = poetsNogOpMaandfactuur(bron, dayStr(from), dayStr(to));
      setPoetsOpen({ count: open.count, bedrag: open.bedrag });
    } catch (error: any) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
      setRows([]);
    }
    setLoading(false);
  };
  useEffect(() => {
    (async () => {
      await load();
      if (readOnly) return; // directie: alleen-lezen, geen automatische verzending
      // openstaande interne facturen alsnog van PDF voorzien en mailen
      const n = await dispatchPendingInternalInvoices();
      if (n > 0) { toast({ title: `${n} interne factuur/facturen verstuurd` }); load(); }
    })();
  }, [readOnly]);

  const togglePaid = async (r: InvoiceRow) => {
    const next = r.payment_status === "betaald" ? "open" : "betaald";
    try {
      await setInvoicePaymentStatus(r.id, next);
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, payment_status: next } : x)));
    } catch (e: any) {
      toast({ title: "Bijwerken mislukt", description: e.message, variant: "destructive" });
    }
  };

  // afgeleid per origineel: gecrediteerd / nog te crediteren (niets opgeslagen op het origineel)
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const infoOf = useMemo(() => {
    const credits = new Map<string, InvoiceRow[]>();
    rows.filter(isCredit).forEach((c) => {
      if (!c.credit_van_invoice_id) return;
      credits.set(c.credit_van_invoice_id, [...(credits.get(c.credit_van_invoice_id) || []), c]);
    });
    const m = new Map<string, CreditInfo>();
    rows.filter((r) => !isCredit(r)).forEach((r) => {
      m.set(r.id, creditInfo(
        { subtotal: Number(r.subtotal) || 0, vat: Number(r.vat) || 0, total: Number(r.total) || 0 },
        (credits.get(r.id) || []).map((c) => ({ subtotal: Number(c.subtotal) || 0, vat: Number(c.vat) || 0, total: Number(c.total) || 0 })),
      ));
    });
    return m;
  }, [rows]);
  // per origineel de creditfacturen (voor links)
  const creditsVan = useMemo(() => {
    const m = new Map<string, InvoiceRow[]>();
    rows.filter(isCredit).forEach((c) => { if (c.credit_van_invoice_id) m.set(c.credit_van_invoice_id, [...(m.get(c.credit_van_invoice_id) || []), c]); });
    return m;
  }, [rows]);
  const dubbel = useMemo(
    () => mogelijkDubbel(rows, checklistOrders, (id) => !!infoOf.get(id)?.volledig),
    [rows, checklistOrders, infoOf],
  );
  const dubbelAantal = useMemo(() => [...dubbel.values()].filter((d) => d.actief).length, [dubbel]);
  const asOrig = (r: InvoiceRow) => ({
    invoice_kind: r.invoice_kind, document_type: r.document_type, status: r.status, telt_niet_mee: r.telt_niet_mee,
    payment_status: r.payment_status, subtotal: Number(r.subtotal) || 0, vat: Number(r.vat) || 0, total: Number(r.total) || 0,
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = rows.filter((r) => tab === "credit"
      ? isCredit(r)
      : tab === "dubbel" ? !!dubbel.get(r.id)?.actief
      : (r.invoice_kind === "poets_intern" ? "poets" : r.invoice_kind === "intern" ? "intern" : "extern") === tab);
    if (!s) return base;
    return base.filter((r) => {
      const c = r.customer || {};
      const v = r.vehicle || {};
      const hay = buildHaystack([
        r.invoice_number, r.status, r.payment_status, isCredit(r) ? "credit creditfactuur" : "",
        r.credit_reden, r.credit_van_invoice_id ? byId.get(r.credit_van_invoice_id)?.invoice_number : "",
        c.name, c.email, c.phone, c.street, c.house_number, c.postal_code, c.city, c.address,
        v.license_number, v.brand, v.model, v.vin, v.year, v.mileage,
        ...amountTokens(r.total), ...amountTokens(r.subtotal),
        new Date(r.created_at).toLocaleDateString("nl-NL"),
      ]);
      return matchesSearch(hay, q);
    });
  }, [rows, q, tab, byId, dubbel]);

  // Details van de werkorders van alle zichtbare facturen in één RPC, zodra er iets is uitgeklapt.
  useEffect(() => {
    if (open.size === 0) return;
    const nodig = filtered.flatMap((r) => linkedOrderIds(r.source_work_order_ids, r.work_order_id)).filter((id) => !details.has(id));
    if (nodig.length === 0) return;
    let stop = false;
    setDetailsLoading(true);
    fetchWerkorderDetails(nodig)
      .then((m) => { if (!stop) setDetails((prev) => { const n = new Map(prev); m.forEach((v, k) => n.set(k, v)); return n; }); })
      .catch((e) => toast({ title: "Werkorders laden mislukt", description: e.message, variant: "destructive" }))
      .finally(() => { if (!stop) setDetailsLoading(false); });
    return () => { stop = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open.size > 0, filtered]);

  const toggleOpen = (id: string) => setOpen((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  /** Naar een andere factuur springen: juiste tab, zoeken op nummer, uitklappen. */
  const naarFactuur = (id: string) => {
    const r = byId.get(id);
    if (!r) return;
    setTab(isCredit(r) ? "credit" : r.invoice_kind === "poets_intern" ? "poets" : r.invoice_kind === "intern" ? "intern" : "extern");
    setQ(r.invoice_number || "");
    setOpen((prev) => new Set(prev).add(id));
  };
  const FactuurLink: React.FC<{ id: string }> = ({ id }) => (
    <button type="button" className="font-mono text-primary hover:underline" onClick={() => naarFactuur(id)}>
      {byId.get(id)?.invoice_number || "concept"}
    </button>
  );

  // Maandtotalen op omzetdatum (NL) met dezelfde telregel als alle omzetschermen
  const monthTotals = useMemo(() => {
    const month = nlDate(new Date()).slice(0, 7);
    const inMonth = (r: InvoiceRow) => (r.omzet_datum || nlDate(r.created_at)).slice(0, 7) === month;
    const counted = rows.filter((r) => inMonth(r) && countsAsRevenue(r));
    const sum = (xs: InvoiceRow[]) => xs.reduce((s, r) => s + (Number(r.subtotal) || 0), 0);
    const credits = counted.filter(isCredit);
    return {
      credit: { extern: sum(credits.filter((r) => !["intern", "poets_intern"].includes(r.invoice_kind || ""))), intern: sum(credits.filter((r) => r.invoice_kind === "intern")), poets: sum(credits.filter((r) => r.invoice_kind === "poets_intern")) },
      intern: sum(counted.filter((r) => r.invoice_kind === "intern")),
      extern: sum(counted.filter((r) => !["intern", "poets_intern"].includes(r.invoice_kind || ""))),
      poets: sum(counted.filter((r) => r.invoice_kind === "poets_intern")),
      concepten: rows.filter((r) => r.status === "concept" && !isCredit(r) && !["intern", "poets_intern"].includes(r.invoice_kind || "") && !r.telt_niet_mee),
    };
  }, [rows]);

  const openPdf = async (r: InvoiceRow) => {
    if (!r.pdf_path) { toast({ title: "Geen PDF beschikbaar", description: isCredit(r) ? "De creditfactuur wordt nog naar de administratie gestuurd." : "Deze factuur is nog een concept." }); return; }
    let url = await getInvoiceSignedUrl(r.pdf_path);
    if (!url && isCredit(r) && r.invoice_number) {
      // externe creditfactuur waarvan het opslaan van de PDF eerder mislukte: opnieuw maken
      const orig = r.credit_van_invoice_id ? byId.get(r.credit_van_invoice_id) : null;
      try {
        await saveCreditPdf({
          invoice_number: r.invoice_number, created_at: r.created_at, customer: r.customer || { name: "" }, vehicle: r.vehicle || {},
          lines: Array.isArray(r.lines) ? r.lines : [], subtotal: Number(r.subtotal) || 0, vat: Number(r.vat) || 0, total: Number(r.total) || 0,
          branch: r.branch, credit_tekst: creditDocumentTekst(orig?.invoice_number || null, orig?.created_at || r.created_at, r.credit_reden || ""),
        });
        url = await getInvoiceSignedUrl(r.pdf_path);
      } catch { /* melding hieronder */ }
    }
    if (url) window.open(url, "_blank");
    else toast({ title: "PDF kon niet worden geopend", variant: "destructive" });
  };

  const resend = async (r: InvoiceRow) => {
    try {
      if (r.invoice_kind === "intern" || (isCredit(r) && r.invoice_kind === "poets_intern")) {
        await resendInternalInvoice(r as any);
        toast({ title: `${isCredit(r) ? "Interne creditfactuur" : "Interne factuur"} opnieuw in de mailwachtrij geplaatst` });
        return;
      }
      const pdfBase64 = r.pdf_path ? await getInvoicePdfBase64(r.pdf_path) : null;
      if (!pdfBase64) { toast({ title: "Geen PDF beschikbaar", description: "Deze factuur heeft nog geen opgeslagen PDF.", variant: "destructive" }); return; }
      await queueInvoiceEmail({
        invoiceNumber: r.invoice_number || "",
        customerName: r.customer?.name || "",
        plate: r.vehicle?.license_number || "",
        total: Number(r.total) || 0,
        pdfBase64,
      });
      toast({ title: "Factuur opnieuw in de mailwachtrij geplaatst" });
    } catch (e: any) {
      toast({ title: "Fout", description: e.message, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <AsPage>
        <div className="flex flex-wrap items-center justify-between mb-5 gap-3">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">Werkplaats facturen</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">Facturen van externe werkplaatsopdrachten.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate("/werkplaats/prijslijst")}>
              <Calculator className="h-4 w-4 mr-1" />Prijslijst
            </Button>
            {mayCreateManual && (
              <Button size="sm" onClick={() => navigate("/werkplaats/facturen/nieuw")}>
                <Plus className="h-4 w-4 mr-1" />Nieuwe factuur
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Intern deze maand (excl. btw)", v: eur(monthTotals.intern), sub: monthTotals.credit.intern ? `waarvan creditfacturen ${eur(monthTotals.credit.intern)}` : undefined },
            { label: "Extern deze maand (excl. btw)", v: eur(monthTotals.extern), sub: monthTotals.credit.extern ? `waarvan creditfacturen ${eur(monthTotals.credit.extern)}` : undefined },
            { label: "Poets gefactureerd deze maand", v: eur(monthTotals.poets), sub: `+ ${eur(poetsOpen.bedrag)} nog op maandfactuur (${poetsOpen.count} beurten, factuur volgt op de 1e)${monthTotals.credit.poets ? ` · waarvan creditfacturen ${eur(monthTotals.credit.poets)}` : ""}` },
            { label: "Handmatige concepten (tellen niet mee)", v: `${monthTotals.concepten.length} · ${eur(monthTotals.concepten.reduce((s, r) => s + (Number(r.subtotal) || 0), 0))}` },
          ].map((x) => (
            <div key={x.label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">{x.label}</div>
              <div className="text-lg font-semibold tabular-nums text-slate-900">{x.v}</div>
              {x.sub && <div className="mt-1 text-xs text-muted-foreground">{x.sub}</div>}
            </div>
          ))}
        </div>
        <p className="-mt-2 mb-4 text-[11px] text-slate-500">Geteld op omzetdatum: interne facturen op de goedkeuringsdag, poets op de werkdag van de beurten, overige op factuurdatum. Creditfacturen tellen in de maand van crediteren.</p>

        <div className="mb-4">
          <NogTeFacturerenExtern onChanged={load} />
        </div>
        <div className="mb-4">
          <NogTeFacturerenIntern onChanged={load} />
        </div>

        <AsCard>
          <AsCardHead
            icon={<FileText className="h-4 w-4" />} tone="teal" title="Facturen"
            subtitle="Zoek op nummer, klant of kenteken" count={filtered.length}
          />
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <div className="relative max-w-sm">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input className="pl-8" placeholder="Zoeken…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={tab === "extern" ? "default" : "outline"} onClick={() => setTab("extern")}>Extern</Button>
              <Button size="sm" variant={tab === "intern" ? "default" : "outline"} onClick={() => setTab("intern")}>Intern</Button>
              <Button size="sm" variant={tab === "poets" ? "default" : "outline"} onClick={() => setTab("poets")}>Poets</Button>
              <Button size="sm" variant={tab === "credit" ? "destructive" : "outline"} onClick={() => setTab("credit")}>Creditfacturen</Button>
              <Button size="sm" variant={tab === "dubbel" ? "default" : "outline"} onClick={() => setTab("dubbel")}>
                <Copy className="h-3.5 w-3.5 mr-1" />Mogelijk dubbel ({dubbelAantal})
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Laden…</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-[13px] text-slate-400">Geen facturen gevonden.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((r) => {
                const credit = isCredit(r);
                const info = credit ? null : infoOf.get(r.id) || EMPTY_INFO;
                const badge = info ? creditBadge(asOrig(r), info) : null;
                const betaal = betaalLabel(asOrig(r), info);
                const orig = credit && r.credit_van_invoice_id ? byId.get(r.credit_van_invoice_id) : null;
                const definitief = r.status === "verstuurd" || r.status === "definitief";
                const d = dubbel.get(r.id);
                const orderIds = linkedOrderIds(r.source_work_order_ids, r.work_order_id);
                const isOpen = open.has(r.id);
                const credits = creditsVan.get(r.id) || [];
                return (
                <div key={r.id} className={`flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 md:gap-3 px-4 py-3 ${credit ? "bg-destructive/5" : ""}`}>
                  <div className="flex items-center gap-2 md:contents">
                    <div className={`md:w-[130px] font-mono text-[12.5px] font-semibold ${credit ? "text-destructive" : "text-slate-900"}`}>{r.invoice_number || "concept"}</div>
                    <div className="md:w-[92px] text-[12px] text-slate-500">{new Date(r.created_at).toLocaleDateString("nl-NL")}</div>
                  </div>
                  <div className="md:flex-1 md:min-w-[150px] min-w-0 text-[13px] text-slate-800">
                    <div className="truncate">{r.customer?.name || "—"}</div>
                    {credit && (
                      <div className="text-[11.5px] text-destructive truncate">
                        Creditering van {orig ? <FactuurLink id={orig.id} /> : "factuur"}{r.credit_reden ? ` · ${r.credit_reden}` : ""}
                      </div>
                    )}
                    {d && (
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px]">
                        {d.actief
                          ? <AsPill tone="amber">Mogelijk dubbel — 2e rijklaar voor deze auto</AsPill>
                          : <AsPill tone="slate">Dubbel — gecorrigeerd</AsPill>}
                        <span className="text-slate-500">eerder:</span>
                        {d.andere.map((id) => <FactuurLink key={id} id={id} />)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 md:contents">
                    <AsLicensePlate value={r.vehicle?.license_number} size="sm" />
                    <div className={`md:w-[110px] md:text-right text-[13px] font-semibold tabular-nums ${credit ? "text-destructive" : ""}`}>{eur(Number(r.total) || 0)}</div>
                    {credit && <AsPill tone="red">Credit</AsPill>}
                    <AsPill tone={definitief ? "green" : "amber"}>{credit && r.status === "concept" ? "wordt verstuurd" : r.status}</AsPill>
                    {credit ? null : betaal === "n.v.t." ? (
                      <AsPill tone="slate">betaling n.v.t.</AsPill>
                    ) : (
                      <AsPill tone={betaal === "betaald" ? "green" : betaal === "gecrediteerd" ? "slate" : "red"}>
                        {betaal === "gecrediteerd" ? "Gecrediteerd" : betaal}
                      </AsPill>
                    )}
                    {badge && <AsPill tone={badge.tone}>{badge.label}</AsPill>}
                  </div>
                  <div className="flex gap-2 [&_button]:min-h-[44px] md:[&_button]:min-h-0">
                    {credit ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openPdf(r)}><ExternalLink className="h-3.5 w-3.5 mr-1" />PDF</Button>
                        {/* externe creditfactuur mailt de eigenaar zelf; intern alleen opnieuw naar de administratie */}
                        {!readOnly && r.status === "verstuurd" && r.invoice_kind !== "extern" && (
                          <Button size="sm" variant="ghost" onClick={() => resend(r)}><Send className="h-3.5 w-3.5 mr-1" />Mailen</Button>
                        )}
                      </>
                    ) : definitief ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openPdf(r)}><ExternalLink className="h-3.5 w-3.5 mr-1" />PDF</Button>
                        {mayTogglePaid && r.invoice_kind !== "intern" && r.payment_status !== "nvt" && betaal !== "gecrediteerd" && (
                          <Button size="sm" variant="ghost" onClick={() => togglePaid(r)}>
                            <Check className="h-3.5 w-3.5 mr-1" />{r.payment_status === "betaald" ? "Op open" : "Betaald"}
                          </Button>
                        )}
                        {!readOnly && <Button size="sm" variant="ghost" onClick={() => resend(r)}><Send className="h-3.5 w-3.5 mr-1" />Mailen</Button>}
                        {mayCredit && info && crediteerbaar(asOrig(r), info) && (
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setCreditFor(r)}>
                            <Undo2 className="h-3.5 w-3.5 mr-1" />Crediteren
                          </Button>
                        )}
                      </>
                    ) : readOnly ? null : (
                      <Button size="sm" variant="outline" onClick={() => setEdit({
                        id: r.id, work_order_id: r.work_order_id, invoice_number: null, branch: r.branch,
                        customer: r.customer || { name: "" }, vehicle: r.vehicle || {},
                        lines: Array.isArray(r.lines) ? r.lines : [],
                      })}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />Afmaken
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => toggleOpen(r.id)} aria-expanded={isOpen}>
                      {isOpen ? <ChevronDown className="h-3.5 w-3.5 mr-1" /> : <ChevronRight className="h-3.5 w-3.5 mr-1" />}
                      Werkorders{orderIds.length ? ` (${orderIds.length})` : ""}
                    </Button>
                  </div>
                  {isOpen && (
                    <GekoppeldeWerkorders
                      orderIds={orderIds}
                      details={details}
                      loading={detailsLoading}
                      onOpenVehicle={(id, label) => setHistorie({ id, label })}
                      onOpenClaim={(id) => navigate(`/warranty?claim=${id}`)}
                      extra={(orig || credits.length > 0) ? (
                        <div className="flex flex-wrap items-center gap-1.5 text-slate-600">
                          {orig && <>Origineel: <FactuurLink id={orig.id} /></>}
                          {credits.length > 0 && <>Gecrediteerd via: {credits.map((c) => <FactuurLink key={c.id} id={c.id} />)}</>}
                        </div>
                      ) : null}
                    />
                  )}
                </div>
                );
              })}
            </div>
          )}
        </AsCard>

        <Sheet open={!!historie} onOpenChange={(v) => { if (!v) setHistorie(null); }}>
          <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader><SheetTitle>{historie?.label || "Auto"}</SheetTitle></SheetHeader>
            {historie && <div className="mt-4"><VehicleTimeline vehicleId={historie.id} /></div>}
          </SheetContent>
        </Sheet>

        <WorkshopInvoiceDialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)} initial={edit} onSaved={load} />
        <CrediteerFactuurDialog
          invoice={creditFor}
          info={creditFor ? infoOf.get(creditFor.id) || EMPTY_INFO : null}
          mayReinvoice={mayCreateManual}
          mayDispatch={!readOnly}
          onOpenChange={(v) => !v && setCreditFor(null)}
          onDone={load}
        />
      </AsPage>
    </DashboardLayout>
  );
};

export default WerkplaatsFacturen;