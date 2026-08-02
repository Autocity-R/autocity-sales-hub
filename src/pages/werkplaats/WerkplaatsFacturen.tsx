import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { AsPage, AsCard, AsCardHead, AsLicensePlate, AsPill } from "@/components/aftersales/ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Search, ExternalLink, Send, Pencil, Plus, Check, Calculator } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import WorkshopInvoiceDialog from "@/components/werkplaats/WorkshopInvoiceDialog";
import { useAuth } from "@/contexts/AuthContext";
import { featureAccess } from "@/lib/routeAccess";
import {
  eur, getInvoiceSignedUrl, getInvoicePdfBase64, queueInvoiceEmail, InvoiceDraft,
  dispatchPendingInternalInvoices, resendInternalInvoice, setInvoicePaymentStatus,
} from "@/services/workshopInvoiceService";

interface InvoiceRow {
  id: string; invoice_number: string | null; created_at: string; status: string;
  customer: any; vehicle: any; lines: any; total: number; pdf_path: string | null; branch: string | null;
  work_order_id: string | null; invoice_kind: string | null; subtotal: number | null;
  payment_status: string | null;
}

const WerkplaatsFacturen: React.FC = () => {
  const readOnly = useRoleAccess().isDirectieReadOnly();
  const { userRole, isAdmin } = useAuth();
  const mayCreateManual = isAdmin || featureAccess["handmatige-facturen"](userRole);
  const navigate = useNavigate();
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<InvoiceDraft | null>(null);
  const [tab, setTab] = useState<"intern" | "extern">("extern");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("workshop_invoices")
      .select("id, invoice_number, created_at, status, customer, vehicle, lines, total, subtotal, pdf_path, branch, work_order_id, invoice_kind, payment_status")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) toast({ title: "Fout", description: error.message, variant: "destructive" });
    setRows((data as any) || []);
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

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = rows.filter((r) => (r.invoice_kind === "intern" ? "intern" : "extern") === tab);
    if (!s) return base;
    return base.filter((r) =>
      [r.invoice_number, r.customer?.name, r.vehicle?.license_number, r.vehicle?.brand, r.vehicle?.model]
        .filter(Boolean).some((v: string) => String(v).toLowerCase().includes(s)),
    );
  }, [rows, q, tab]);

  const monthTotals = useMemo(() => {
    const now = new Date();
    const inMonth = (d: string) => {
      const dt = new Date(d);
      return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
    };
    const sum = (kind: string) => rows
      .filter((r) => inMonth(r.created_at) && (r.invoice_kind === "intern" ? "intern" : "extern") === kind)
      .reduce((s, r) => s + (Number(r.subtotal) || 0), 0);
    return { intern: sum("intern"), extern: sum("extern") };
  }, [rows]);

  const openPdf = async (r: InvoiceRow) => {
    if (!r.pdf_path) { toast({ title: "Geen PDF beschikbaar", description: "Deze factuur is nog een concept." }); return; }
    const url = await getInvoiceSignedUrl(r.pdf_path);
    if (url) window.open(url, "_blank");
    else toast({ title: "PDF kon niet worden geopend", variant: "destructive" });
  };

  const resend = async (r: InvoiceRow) => {
    try {
      if (r.invoice_kind === "intern") {
        await resendInternalInvoice(r as any);
        toast({ title: "Interne factuur opnieuw in de mailwachtrij geplaatst" });
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
        <div className="flex items-center justify-between mb-5 gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Werkplaats facturen</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">Facturen van externe werkplaatsopdrachten.</p>
          </div>
          <div className="flex gap-2">
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

        <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Intern deze maand (excl. btw)</div>
              <div className="text-lg font-semibold tabular-nums text-slate-900">{eur(monthTotals.intern)}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Extern deze maand (excl. btw)</div>
              <div className="text-lg font-semibold tabular-nums text-slate-900">{eur(monthTotals.extern)}</div>
            </div>
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
            <div className="flex gap-2">
              <Button size="sm" variant={tab === "extern" ? "default" : "outline"} onClick={() => setTab("extern")}>Extern</Button>
              <Button size="sm" variant={tab === "intern" ? "default" : "outline"} onClick={() => setTab("intern")}>Intern</Button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Laden…</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-[13px] text-slate-400">Geen facturen gevonden.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <div key={r.id} className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 md:gap-3 px-4 py-3">
                  <div className="flex items-center gap-2 md:contents">
                    <div className="md:w-[130px] font-mono text-[12.5px] font-semibold text-slate-900">{r.invoice_number || "concept"}</div>
                    <div className="md:w-[92px] text-[12px] text-slate-500">{new Date(r.created_at).toLocaleDateString("nl-NL")}</div>
                  </div>
                  <div className="md:flex-1 md:min-w-[150px] text-[13px] text-slate-800 truncate">{r.customer?.name || "—"}</div>
                  <div className="flex items-center gap-2 md:contents">
                    <AsLicensePlate value={r.vehicle?.license_number} size="sm" />
                    <div className="md:w-[110px] md:text-right text-[13px] font-semibold tabular-nums">{eur(Number(r.total) || 0)}</div>
                    <AsPill tone={r.status === "verstuurd" ? "green" : "amber"}>{r.status}</AsPill>
                    {r.invoice_kind === "intern" || r.payment_status === "nvt" ? (
                      <AsPill tone="slate">betaling n.v.t.</AsPill>
                    ) : (
                      <AsPill tone={r.payment_status === "betaald" ? "green" : "red"}>
                        {r.payment_status === "betaald" ? "betaald" : "open"}
                      </AsPill>
                    )}
                  </div>
                  <div className="flex gap-2 [&_button]:min-h-[44px] md:[&_button]:min-h-0">
                    {r.status === "verstuurd" ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openPdf(r)}><ExternalLink className="h-3.5 w-3.5 mr-1" />PDF</Button>
                        {!readOnly && r.invoice_kind !== "intern" && r.payment_status !== "nvt" && (
                          <Button size="sm" variant="ghost" onClick={() => togglePaid(r)}>
                            <Check className="h-3.5 w-3.5 mr-1" />{r.payment_status === "betaald" ? "Op open" : "Betaald"}
                          </Button>
                        )}
                        {!readOnly && <Button size="sm" variant="ghost" onClick={() => resend(r)}><Send className="h-3.5 w-3.5 mr-1" />Mailen</Button>}
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </AsCard>

        <WorkshopInvoiceDialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)} initial={edit} onSaved={load} />
      </AsPage>
    </DashboardLayout>
  );
};

export default WerkplaatsFacturen;