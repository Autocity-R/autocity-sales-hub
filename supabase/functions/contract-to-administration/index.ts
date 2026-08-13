import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildContractPdfLink } from "../_shared/contractLink.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  contractId: string;
  /** 'administratie' (default) of 'custom' voor een zelf gekozen ontvanger */
  mode?: "administratie" | "custom";
  to?: string[];
  note?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "unauthenticated" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const body = (await req.json()) as Payload;
    if (!body?.contractId) return json({ error: "missing_contract_id" }, 400);

    const mode = body.mode === "custom" ? "custom" : "administratie";
    const recipients =
      mode === "custom"
        ? (body.to || []).map((e) => String(e).trim()).filter((e) =>
            /^\S+@\S+\.\S+$/.test(e),
          )
        : ["administratie@auto-city.nl"];
    if (recipients.length === 0) return json({ error: "no_recipient" }, 400);

    const { data: doc, error: dErr } = await admin
      .from("contract_documents")
      .select("*")
      .eq("id", body.contractId)
      .single();
    if (dErr || !doc) return json({ error: "not_found" }, 404);
    if (doc.status === "geannuleerd") return json({ error: "cancelled" }, 409);

    // PDF-pad: handmatig opgeslagen contract óf de getekende versie
    let path: string | null = (doc as any).pdf_path ?? null;
    let isSigned = false;
    if (!path) {
      const { data: sig } = await admin
        .from("contract_signatures")
        .select("pdf_path, signed_at")
        .eq("contract_id", doc.id)
        .not("pdf_path", "is", null)
        .order("signed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sig?.pdf_path) {
        path = sig.pdf_path;
        isSigned = !!sig.signed_at;
      }
    }
    if (!path) return json({ error: "no_pdf_stored" }, 409);

    const { data: signedUrlData, error: sErr } = await admin.storage
      .from("vehicle-documents")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (sErr || !signedUrlData?.signedUrl)
      return json({ error: "signed_url_failed", detail: sErr?.message }, 500);
    const pdfUrl = signedUrlData.signedUrl;
    // Permanente link voor de e-mail-knop (verloopt nooit)
    const permanentUrl = await buildContractPdfLink(
      supabaseUrl,
      serviceKey,
      doc.id,
    );

    const cust = (doc.customer_snapshot as any) || {};
    const veh = (doc.vehicle_snapshot as any) || {};
    const companySnap = (doc.company_snapshot as any) || {};
    const company = companySnap.companyName || companySnap.name || "Auto City";
    const companyPhone = companySnap.phone || "";
    const buyerName =
      cust.companyName ||
      [cust.firstName, cust.lastName].filter(Boolean).join(" ") ||
      "onbekend";
    const downPayment = Number((doc as any).down_payment) || 0;
    const total = Number(doc.total_price) || 0;

    const rows: Array<[string, string]> = [
      ["Contractnummer", doc.contract_number],
      ["Ondertekening", isSigned ? "Digitaal ondertekend" : "Handmatig (op papier)"],
      ["Klant", buyerName],
      ["E-mail klant", cust.email || "-"],
      ["Telefoon klant", cust.phone || "-"],
      [
        "Voertuig",
        [veh.brand, veh.model, veh.year ? `(${veh.year})` : null]
          .filter(Boolean)
          .join(" ") || "-",
      ],
      ["Kenteken", veh.licenseNumber || veh.license_number || "-"],
      ["VIN", veh.vin || "-"],
      ["Verkoopbedrag (kaal)", fmtEur(Number(doc.sale_price_ex) || 0)],
      ["Totaalbedrag", fmtEur(total)],
      ["BTW / marge", doc.btw_type === "btw" ? "BTW-voertuig" : "Margevoertuig"],
      ...(downPayment > 0
        ? ([
            ["Aanbetaling", fmtEur(downPayment)],
            ["Restant bij aflevering", fmtEur(total - downPayment)],
          ] as Array<[string, string]>)
        : []),
      ["Garantiepakket", (doc as any).warranty_package_name || "-"],
      [
        "Inruil",
        Number(doc.trade_in_value) > 0
          ? `${(doc.trade_in_vehicle as any)?.brand || ""} ${(doc.trade_in_vehicle as any)?.model || ""} - ${fmtEur(Number(doc.trade_in_value))}`.trim()
          : "Geen",
      ],
      [
        "Financieringsvoorbehoud",
        (doc as any).financing_conditional
          ? `Ja${(doc as any).financing_party ? ` - ${(doc as any).financing_party}` : ""}`
          : "Nee",
      ],
      ["Verkoper", (doc as any).salesperson_name || "-"],
    ];

    const tableHtml = `<table cellpadding="0" cellspacing="0" border="0" style="width:100%;font-size:13px;color:#333;border-collapse:collapse;margin:0 0 8px;">
      ${rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:6px 0;color:#666;width:45%;">${sanitizeText(String(k))}</td><td style="padding:6px 0;font-weight:600;">${sanitizeText(String(v))}</td></tr>`,
        )
        .join("")}
    </table>`;

    const noteHtml = body.note?.trim()
      ? `<p style="font-size:13px;line-height:1.55;color:#333;margin:0 0 16px;"><strong>Opmerking:</strong> ${sanitizeText(body.note.trim())}</p>`
      : "";

    const html = renderContractEmail({
      buyerName: mode === "administratie" ? "Administratie" : "Beste",
      intro:
        mode === "administratie"
          ? `Koopcontract ${doc.contract_number} van ${buyerName} is vastgelegd in het CRM${isSigned ? " en digitaal ondertekend" : " (klant tekent op papier)"}. De PDF is bijgevoegd voor de facturatie.`
          : `Bijgaand koopcontract ${doc.contract_number} als PDF.`,
      ctaText: "Koopcontract downloaden",
      ctaUrl: permanentUrl,
      salesName: "Auto City CRM",
      companyName: company,
      companyPhone,
      extraHtml: noteHtml + tableHtml,
    });

    const { error: qErr } = await admin.from("email_queue").insert({
      status: "pending",
      attempts: 0,
      vehicle_id: doc.vehicle_id ?? null,
      template_id:
        mode === "administratie"
          ? "contract_v2_stored_administratie"
          : "contract_v2_stored_custom",
      payload: {
        senderEmail: (doc as any).salesperson_email || "inkoop@auto-city.nl",
        to: recipients,
        subject:
          mode === "administratie"
            ? `Koopcontract ${doc.contract_number} - klaar voor facturatie`
            : `Koopcontract ${doc.contract_number}`,
        htmlBody: html,
        attachments: [{ filename: `${doc.contract_number}.pdf`, url: pdfUrl }],
      },
    });
    if (qErr) return json({ error: "queue_failed", detail: qErr.message }, 500);

    if (mode === "administratie") {
      await admin
        .from("contract_documents")
        .update({
          administratie_notified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", doc.id);
    }

    return json({ ok: true, to: recipients });
  } catch (err) {
    console.error(err);
    return json({ error: "unexpected", detail: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const LOGO_URL =
  "https://www.auto-city.nl/upload/logo/logo_images_0_1698072999114488851.png";

function sanitizeText(s: string): string {
  return s.replace(/\u2014/g, "-").replace(/\u2013/g, "-").replace(/\u2011/g, "-");
}

function fmtEur(n: number): string {
  return `EUR ${Number(n || 0).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function renderContractEmail(opts: {
  buyerName: string;
  intro: string;
  ctaText: string;
  ctaUrl: string;
  salesName: string;
  companyName: string;
  companyPhone?: string;
  extraHtml?: string;
}): string {
  const {
    buyerName, intro, ctaText, ctaUrl, salesName, companyName, companyPhone, extraHtml,
  } = opts;
  const s = sanitizeText;
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f6f6;">
  <div style="font-family:Arial,Helvetica,sans-serif;color:#222;max-width:600px;margin:0 auto;background:#ffffff;padding:32px 36px;">
    <p style="font-size:15px;margin:0 0 12px;">Beste ${s(buyerName)},</p>
    <p style="font-size:14px;line-height:1.55;color:#333;margin:0 0 20px;">${s(intro)}</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${ctaUrl}" style="background:#FF6B00;color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:4px;font-weight:600;letter-spacing:0.3px;display:inline-block;font-size:14px;">${s(ctaText)}</a>
    </p>
    ${extraHtml || ""}
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0 20px;" />
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;font-size:12px;color:#555;">
      <tr>
        <td style="vertical-align:middle;width:72px;padding:0;">
          <div style="background:#000000;width:64px;height:64px;border-radius:4px;padding:8px;box-sizing:border-box;">
            <img src="${LOGO_URL}" alt="Auto City" style="width:100%;height:100%;object-fit:contain;display:block;" />
          </div>
        </td>
        <td style="vertical-align:middle;line-height:1.6;border-left:3px solid #FF6B00;padding-left:14px;">
          <div style="color:#333;">Met vriendelijke groet,</div>
          <div style="font-weight:600;color:#222;">${s(salesName)}</div>
          <div>${s(companyName)}</div>
          ${companyPhone ? `<div>Tel: ${s(companyPhone)}</div>` : ""}
          <div><a href="https://www.auto-city.nl" style="color:#FF6B00;text-decoration:none;">www.auto-city.nl</a></div>
        </td>
      </tr>
    </table>
  </div>
</body></html>`;
}
