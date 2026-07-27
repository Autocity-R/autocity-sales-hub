import { supabase } from "@/integrations/supabase/client";
import { generatePdfFromHtml } from "@/services/contractPdfService";

export interface InvoiceLine { description: string; amount: number }
export interface InvoiceCustomer {
  name: string;
  /** legacy vrij adresveld — alleen nog voor backwards compatibiliteit */
  address?: string | null;
  street?: string | null;
  house_number?: string | null;
  postal_code?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
}

/** Adres als max. twee regels: "Straat Huisnummer" en "Postcode Plaats". Valt terug op het oude vrije veld. */
export const customerAddressLines = (c: InvoiceCustomer): string[] => {
  const line1 = [c.street, c.house_number].filter((v) => String(v ?? "").trim()).join(" ").trim();
  const line2 = [c.postal_code, c.city].filter((v) => String(v ?? "").trim()).join(" ").trim();
  const lines = [line1, line2].filter(Boolean);
  if (lines.length) return lines;
  return String(c.address ?? "").trim() ? [String(c.address).trim()] : [];
};
export interface InvoiceVehicle { brand?: string | null; model?: string | null; license_number?: string | null; vin?: string | null }

export interface InvoiceDraft {
  id?: string | null;
  work_order_id?: string | null;
  invoice_number?: string | null;
  customer: InvoiceCustomer;
  vehicle: InvoiceVehicle;
  lines: InvoiceLine[];
  branch?: string | null;
}

export const COMPANY = {
  name: "AUTOCITY REPAIRS B.V.",
  address: "Thurledeweg 61-a",
  city: "3044 ER Rotterdam",
  iban: "NL64ABNA0149702515",
  kvk: "98721801",
  btw: "868614555",
  email: "werkplaats@auto-city.nl",
};

export const VAT_RATE = 0.21;

export const calcTotals = (lines: InvoiceLine[]) => {
  const subtotal = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const vat = Math.round(subtotal * VAT_RATE * 100) / 100;
  const total = Math.round((subtotal + vat) * 100) / 100;
  return { subtotal: Math.round(subtotal * 100) / 100, vat, total };
};

export const eur = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n) || 0);

const esc = (s?: string | null) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Factuur-HTML in huisstijl — gebruikt voor zowel live-preview als PDF-generatie. */
export const renderInvoiceHtml = (d: InvoiceDraft & { invoice_date?: string }): string => {
  const { subtotal, vat, total } = calcTotals(d.lines);
  const date = d.invoice_date || new Date().toLocaleDateString("nl-NL");
  const nummer = d.invoice_number || "CONCEPT";
  const rows = d.lines
    .filter((l) => l.description.trim() || l.amount)
    .map(
      (l) => `<tr>
        <td style="padding:9px 10px;border-bottom:1px solid #e6e8ec;font-size:12px;color:#111827">${esc(l.description) || "—"}</td>
        <td style="padding:9px 10px;border-bottom:1px solid #e6e8ec;font-size:12px;color:#111827;text-align:right;white-space:nowrap">${eur(l.amount)}</td>
      </tr>`,
    )
    .join("");

  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;color:#111827;padding:28px 30px;width:794px;box-sizing:border-box">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #111827;padding-bottom:14px">
      <div>
        <div style="font-size:19px;font-weight:800;letter-spacing:.5px">${COMPANY.name}</div>
        <div style="font-size:11.5px;color:#4b5563;line-height:1.5;margin-top:4px">
          ${COMPANY.address}<br/>${COMPANY.city}<br/>${COMPANY.email}
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:22px;font-weight:800;letter-spacing:1px">FACTUUR</div>
        <div style="font-size:11.5px;color:#4b5563;line-height:1.6;margin-top:4px">
          Factuurnummer: <strong>${esc(nummer)}</strong><br/>
          Factuurdatum: <strong>${esc(date)}</strong>
        </div>
      </div>
    </div>

    <div style="display:flex;gap:16px;margin-top:20px">
      <div style="flex:1;background:#f7f8fa;border:1px solid #e6e8ec;border-radius:8px;padding:12px 14px">
        <div style="font-size:10px;font-weight:700;letter-spacing:.9px;color:#6b7280;text-transform:uppercase">Factuuradres</div>
        <div style="font-size:12.5px;margin-top:6px;line-height:1.6">
          <strong>${esc(d.customer.name) || "—"}</strong><br/>
          ${customerAddressLines(d.customer).map((l) => `${esc(l)}<br/>`).join("")}
          ${esc(d.customer.email) || ""}${d.customer.email ? "<br/>" : ""}
          ${esc(d.customer.phone) || ""}
        </div>
      </div>
      <div style="flex:1;background:#f7f8fa;border:1px solid #e6e8ec;border-radius:8px;padding:12px 14px">
        <div style="font-size:10px;font-weight:700;letter-spacing:.9px;color:#6b7280;text-transform:uppercase">Voertuig</div>
        <div style="font-size:12.5px;margin-top:6px;line-height:1.6">
          <strong>${esc(d.vehicle.brand)} ${esc(d.vehicle.model)}</strong><br/>
          Kenteken: <strong>${esc(d.vehicle.license_number) || "—"}</strong>
          ${d.vehicle.vin ? `<br/>VIN: ${esc(d.vehicle.vin)}` : ""}
        </div>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:22px">
      <thead>
        <tr style="background:#111827;color:#ffffff">
          <th style="text-align:left;padding:9px 10px;font-size:10.5px;letter-spacing:.7px;text-transform:uppercase">Omschrijving</th>
          <th style="text-align:right;padding:9px 10px;font-size:10.5px;letter-spacing:.7px;text-transform:uppercase;width:130px">Bedrag excl. btw</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="2" style="padding:14px 10px;font-size:12px;color:#9ca3af">Nog geen factuurregels</td></tr>`}</tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;margin-top:14px">
      <table style="border-collapse:collapse;min-width:280px">
        <tr><td style="padding:6px 10px;font-size:12px;color:#4b5563">Subtotaal</td><td style="padding:6px 10px;font-size:12px;text-align:right">${eur(subtotal)}</td></tr>
        <tr><td style="padding:6px 10px;font-size:12px;color:#4b5563">BTW 21%</td><td style="padding:6px 10px;font-size:12px;text-align:right">${eur(vat)}</td></tr>
        <tr style="background:#111827;color:#fff"><td style="padding:9px 10px;font-size:13px;font-weight:700">Totaal</td><td style="padding:9px 10px;font-size:13px;font-weight:800;text-align:right">${eur(total)}</td></tr>
      </table>
    </div>

    <div style="margin-top:24px;padding:12px 14px;background:#f7f8fa;border:1px solid #e6e8ec;border-radius:8px;font-size:12px;color:#374151">
      Gelieve te betalen binnen 14 dagen o.v.v. het factuurnummer.
    </div>

    <div style="margin-top:18px;border-top:1px solid #e6e8ec;padding-top:10px;font-size:10.5px;color:#6b7280;text-align:center;line-height:1.6">
      ${COMPANY.name} · ${COMPANY.address}, ${COMPANY.city} · IBAN ${COMPANY.iban} · KVK ${COMPANY.kvk} · BTW ${COMPANY.btw}
    </div>
  </div>`;
};

export const nextInvoiceNumber = async (): Promise<string> => {
  const { data, error } = await (supabase as any).rpc("next_workshop_invoice_number");
  if (error) throw error;
  return data as string;
};

/** Blob -> base64 (zonder data-url prefix), chunked i.v.m. grote PDF's. */
export const blobToBase64 = async (blob: Blob): Promise<string> => {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(binary);
};

/** Haalt een opgeslagen factuur-PDF uit de bucket en geeft base64 terug. */
export const getInvoicePdfBase64 = async (path: string): Promise<string | null> => {
  const { data, error } = await supabase.storage.from("workshop-invoices").download(path);
  if (error || !data) return null;
  return blobToBase64(data);
};

/** Slaat de factuur op als concept (send=false) of definitief + PDF + mail (send=true). */
export const saveWorkshopInvoice = async (
  draft: InvoiceDraft,
  opts: { send: boolean },
): Promise<{ invoiceNumber: string; id: string }> => {
  const { subtotal, vat, total } = calcTotals(draft.lines);
  const { data: userRes } = await supabase.auth.getUser();
  const lines = draft.lines.filter((l) => l.description.trim() || Number(l.amount));

  const invoiceNumber = draft.invoice_number || (opts.send ? await nextInvoiceNumber() : null);

  let pdfPath: string | null = null;
  let pdfBase64: string | null = null;

  if (opts.send && invoiceNumber) {
    const html = renderInvoiceHtml({ ...draft, invoice_number: invoiceNumber, lines });
    const blob = await generatePdfFromHtml(html);
    pdfPath = `${invoiceNumber}.pdf`;
    const { error: upErr } = await supabase.storage
      .from("workshop-invoices")
      .upload(pdfPath, blob, { contentType: "application/pdf", upsert: true });
    if (upErr) throw upErr;
    pdfBase64 = await blobToBase64(blob);
  }

  const row: any = {
    invoice_number: invoiceNumber,
    work_order_id: draft.work_order_id ?? null,
    customer: draft.customer as any,
    vehicle: draft.vehicle as any,
    lines: lines as any,
    subtotal,
    vat,
    total,
    status: opts.send ? "verstuurd" : "concept",
    pdf_path: pdfPath,
    branch: draft.branch ?? "rotterdam",
    sent_at: opts.send ? new Date().toISOString() : null,
    created_by: userRes.user?.id ?? null,
  };

  let id = draft.id ?? "";
  if (draft.id) {
    const { error } = await (supabase as any).from("workshop_invoices").update(row).eq("id", draft.id);
    if (error) throw error;
  } else {
    const { data, error } = await (supabase as any)
      .from("workshop_invoices")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    id = data.id;
  }

  if (opts.send && invoiceNumber) {
    await queueInvoiceEmail({
      invoiceNumber,
      customerName: draft.customer.name,
      plate: draft.vehicle.license_number || "",
      total,
      pdfBase64,
    });
  }

  return { invoiceNumber: invoiceNumber || "CONCEPT", id };
};

export const queueInvoiceEmail = async (p: {
  invoiceNumber: string;
  customerName: string;
  plate: string;
  total: number;
  pdfBase64?: string | null;
}) => {
  const htmlBody = `<div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f9;padding:24px">
    <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e6e8ec;border-radius:10px;overflow:hidden">
      <div style="background:#111827;color:#fff;padding:16px 20px;font-size:15px;font-weight:700">${COMPANY.name}</div>
      <div style="padding:20px;font-size:13.5px;color:#111827;line-height:1.7">
        <p style="margin:0 0 12px">Er is een nieuwe werkplaatsfactuur opgemaakt.</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr><td style="padding:5px 0;color:#6b7280">Factuurnummer</td><td style="padding:5px 0;text-align:right"><strong>${esc(p.invoiceNumber)}</strong></td></tr>
          <tr><td style="padding:5px 0;color:#6b7280">Klant</td><td style="padding:5px 0;text-align:right">${esc(p.customerName)}</td></tr>
          <tr><td style="padding:5px 0;color:#6b7280">Kenteken</td><td style="padding:5px 0;text-align:right">${esc(p.plate)}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;border-top:1px solid #e6e8ec">Totaal incl. btw</td><td style="padding:8px 0;text-align:right;border-top:1px solid #e6e8ec"><strong>${eur(p.total)}</strong></td></tr>
        </table>
        <p style="margin:16px 0 0;color:#4b5563">De factuur is als PDF bijgevoegd.</p>
      </div>
      <div style="padding:12px 20px;background:#f7f8fa;border-top:1px solid #e6e8ec;font-size:11px;color:#6b7280;text-align:center">
        ${COMPANY.name} · ${COMPANY.address}, ${COMPANY.city} · IBAN ${COMPANY.iban}
      </div>
    </div>
  </div>`;

  const { error } = await (supabase as any).from("email_queue").insert({
    status: "pending",
    attempts: 0,
    template_id: "workshop_invoice",
    payload: {
      senderEmail: "werkplaats@auto-city.nl",
      to: ["werkplaats@auto-city.nl", "administratie@auto-city.nl"],
      subject: `Werkplaatsfactuur ${p.invoiceNumber} - ${p.plate} - ${p.customerName}`,
      htmlBody,
      attachments: p.pdfBase64
        ? [
            {
              filename: `${p.invoiceNumber}.pdf`,
              content: p.pdfBase64,
              base64Content: p.pdfBase64,
            },
          ]
        : [],
    },
  });
  if (error) throw error;
};

export const getInvoiceSignedUrl = async (path: string): Promise<string | null> => {
  const { data } = await supabase.storage.from("workshop-invoices").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
};

/* ------------------------------------------------------------------ */
/*  Interne facturatie tussen de BV's (Repairs -> Automotive Group)    */
/* ------------------------------------------------------------------ */

export const INTERNAL_INVOICE_RECIPIENT = "administratie@auto-city.nl";

/** Mailt één interne factuur (PDF als base64-bijlage) naar de administratie. */
export const queueInternalInvoiceEmail = async (p: {
  invoiceNumber: string;
  plate: string;
  lines: InvoiceLine[];
  total: number;
  pdfBase64: string;
}) => {
  const rows = p.lines
    .map(
      (l) =>
        `<tr><td style="padding:5px 0;color:#6b7280">${esc(l.description)}</td><td style="padding:5px 0;text-align:right">${eur(l.amount)}</td></tr>`,
    )
    .join("");

  const htmlBody = `<div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f9;padding:24px">
    <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e6e8ec;border-radius:10px;overflow:hidden">
      <div style="background:#111827;color:#fff;padding:16px 20px;font-size:15px;font-weight:700">${COMPANY.name}</div>
      <div style="padding:20px;font-size:13.5px;color:#111827;line-height:1.7">
        <p style="margin:0 0 12px">Interne factuur aan Autocity Automotive Group B.V.</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr><td style="padding:5px 0;color:#6b7280">Factuurnummer</td><td style="padding:5px 0;text-align:right"><strong>${esc(p.invoiceNumber)}</strong></td></tr>
          <tr><td style="padding:5px 0;color:#6b7280">Kenteken</td><td style="padding:5px 0;text-align:right">${esc(p.plate)}</td></tr>
          ${rows}
          <tr><td style="padding:8px 0;color:#6b7280;border-top:1px solid #e6e8ec">Totaal incl. btw</td><td style="padding:8px 0;text-align:right;border-top:1px solid #e6e8ec"><strong>${eur(p.total)}</strong></td></tr>
        </table>
        <p style="margin:16px 0 0;color:#4b5563">De factuur is als PDF bijgevoegd.</p>
      </div>
      <div style="padding:12px 20px;background:#f7f8fa;border-top:1px solid #e6e8ec;font-size:11px;color:#6b7280;text-align:center">
        ${COMPANY.name} · ${COMPANY.address}, ${COMPANY.city} · IBAN ${COMPANY.iban}
      </div>
    </div>
  </div>`;

  const { error } = await (supabase as any).from("email_queue").insert({
    status: "pending",
    attempts: 0,
    template_id: "workshop_invoice_intern",
    payload: {
      senderEmail: "werkplaats@auto-city.nl",
      to: [INTERNAL_INVOICE_RECIPIENT],
      subject: `Interne factuur ${p.invoiceNumber} — ${p.plate}`,
      htmlBody,
      attachments: [
        { filename: `${p.invoiceNumber}.pdf`, content: p.pdfBase64, base64Content: p.pdfBase64 },
      ],
    },
  });
  if (error) throw error;
};

/**
 * Verwerkt alle interne facturen die nog niet verstuurd zijn: PDF genereren,
 * opslaan in de bucket en mailen naar de administratie. Volledig idempotent —
 * mislukt het mailen, dan blijft de factuur als concept staan.
 */
export const dispatchPendingInternalInvoices = async (): Promise<number> => {
  const { data, error } = await (supabase as any)
    .from("workshop_invoices")
    .select("id, invoice_number, customer, vehicle, lines, total, branch, created_at")
    .eq("invoice_kind", "intern")
    .eq("status", "concept")
    .order("created_at", { ascending: true })
    .limit(20);
  if (error || !data?.length) return 0;

  let sent = 0;
  for (const inv of data as any[]) {
    try {
      const lines: InvoiceLine[] = Array.isArray(inv.lines) ? inv.lines : [];
      const html = renderInvoiceHtml({
        invoice_number: inv.invoice_number,
        invoice_date: new Date(inv.created_at).toLocaleDateString("nl-NL"),
        customer: inv.customer || { name: "Autocity Automotive Group B.V." },
        vehicle: inv.vehicle || {},
        lines,
        branch: inv.branch,
      });
      const blob = await generatePdfFromHtml(html);
      const pdfPath = `${inv.invoice_number}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("workshop-invoices")
        .upload(pdfPath, blob, { contentType: "application/pdf", upsert: true });
      if (upErr) throw upErr;
      const pdfBase64 = await blobToBase64(blob);

      await queueInternalInvoiceEmail({
        invoiceNumber: inv.invoice_number,
        plate: inv.vehicle?.license_number || "",
        lines,
        total: Number(inv.total) || 0,
        pdfBase64,
      });

      await (supabase as any)
        .from("workshop_invoices")
        .update({ status: "verstuurd", pdf_path: pdfPath, sent_at: new Date().toISOString() })
        .eq("id", inv.id);
      sent += 1;
    } catch (e) {
      console.error("Interne factuur versturen mislukt", inv.invoice_number, e);
    }
  }
  return sent;
};

/** Mailt een reeds verstuurde interne factuur opnieuw. */
export const resendInternalInvoice = async (inv: {
  invoice_number: string | null;
  pdf_path: string | null;
  vehicle: any;
  lines: any;
  total: number;
}) => {
  if (!inv.pdf_path || !inv.invoice_number) throw new Error("Geen PDF beschikbaar");
  const pdfBase64 = await getInvoicePdfBase64(inv.pdf_path);
  if (!pdfBase64) throw new Error("Geen PDF beschikbaar");
  await queueInternalInvoiceEmail({
    invoiceNumber: inv.invoice_number,
    plate: inv.vehicle?.license_number || "",
    lines: Array.isArray(inv.lines) ? inv.lines : [],
    total: Number(inv.total) || 0,
    pdfBase64,
  });
};