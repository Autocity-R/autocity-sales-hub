import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  token: string;
  signature_data_url: string; // buyer signature as data URL (png)
  pdf_base64: string; // full PDF (base64, no prefix) generated client-side
  signer_name?: string;
  signer_email?: string;
  ip?: string;
  user_agent?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = (await req.json()) as Payload;
    if (!body?.token || !body?.signature_data_url || !body?.pdf_base64) {
      return json({ error: "missing_fields" }, 400);
    }

    const { data: sig, error: sErr } = await admin
      .from("contract_signatures")
      .select("*")
      .eq("token", body.token)
      .maybeSingle();
    if (sErr || !sig) return json({ error: "invalid_token" }, 404);
    if (sig.signed_at) return json({ error: "already_signed" }, 409);
    if (new Date(sig.token_expires_at).getTime() < Date.now())
      return json({ error: "expired" }, 410);

    const { data: doc, error: dErr } = await admin
      .from("contract_documents")
      .select("*")
      .eq("id", sig.contract_id)
      .single();
    if (dErr || !doc) return json({ error: "contract_not_found" }, 404);
    if (doc.status === "geannuleerd") return json({ error: "cancelled" }, 409);

    // Decode PDF
    const pdfBytes = Uint8Array.from(atob(body.pdf_base64), (c) =>
      c.charCodeAt(0),
    );

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const path = `${doc.vehicle_id}/contracts/${doc.contract_number}-${yyyy}${mm}.pdf`;

    const { error: upErr } = await admin.storage
      .from("vehicle-documents")
      .upload(path, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (upErr) {
      console.error("pdf upload failed", upErr);
      return json({ error: "upload_failed", detail: upErr.message }, 500);
    }

    // Update signature (schema: signer_ip, no user_agent column)
    const { error: sigUpdErr } = await admin
      .from("contract_signatures")
      .update({
        signed_at: now.toISOString(),
        signature_data: body.signature_data_url,
        signer_name: body.signer_name || null,
        signer_email: body.signer_email || null,
        signer_ip: body.ip || null,
        pdf_path: path,
      })
      .eq("id", sig.id);
    if (sigUpdErr) {
      console.error("signature update failed", sigUpdErr);
      return json(
        { error: "signature_update_failed", detail: sigUpdErr.message },
        500,
      );
    }

    // Update contract doc
    const { error: docUpdErr } = await admin
      .from("contract_documents")
      .update({ status: "getekend", signed_at: now.toISOString() })
      .eq("id", doc.id);
    if (docUpdErr) {
      console.error("contract update failed", docUpdErr);
      return json(
        { error: "contract_update_failed", detail: docUpdErr.message },
        500,
      );
    }

    // Signed URL for immediate download / notifications
    const { data: signed } = await admin.storage
      .from("vehicle-documents")
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    // Register in vehicle_files so it appears in the vehicle detail's contracts list
    const category =
      doc.contract_type === "b2b" ? "contract_b2b" : "contract_b2c";
    try {
      await admin.from("vehicle_files").insert({
        vehicle_id: doc.vehicle_id,
        category,
        file_name: `${doc.contract_number}.pdf`,
        file_path: path,
        file_url: signed?.signedUrl || null,
        file_type: "application/pdf",
        file_size: pdfBytes.byteLength,
        metadata: {
          contractType: doc.contract_type,
          contract_id: doc.id,
          contract_number: doc.contract_number,
          signed: true,
          source: "contract_v2",
        },
      });
    } catch (e) {
      console.warn("vehicle_files insert failed", e);
    }

    // Notify parties
    const cust = (doc.customer_snapshot as any) || {};
    const buyerEmail = cust.email;
    const buyerName =
      cust.companyName ||
      [cust.firstName, cust.lastName].filter(Boolean).join(" ") ||
      "geachte klant";
    const companySnap = (doc.company_snapshot as any) || {};
    const company = companySnap.companyName || companySnap.name || "Auto City";
    const companyPhone = companySnap.phone || "";
    const salesEmail = (doc as any).salesperson_email || "inkoop@auto-city.nl";
    const salesName = (doc as any).salesperson_name || "Team Auto City";
    const buyerHtml = renderContractEmail({
      buyerName,
      intro: `Bedankt voor het digitaal ondertekenen van koopcontract <strong>${doc.contract_number}</strong>. Uw ondertekende kopie is als PDF bijgevoegd en ook via onderstaande knop (7 dagen geldig) te downloaden.`,
      ctaText: "Ondertekend contract downloaden",
      ctaUrl: signed?.signedUrl || "#",
      salesName,
      companyName: company,
      companyPhone,
    });
    const attachments = signed?.signedUrl
      ? [
          {
            filename: `${doc.contract_number}.pdf`,
            url: signed.signedUrl,
          },
        ]
      : [];
    if (buyerEmail) {
      const { error: qErr1 } = await admin.from("email_queue").insert({
        status: "pending",
        attempts: 0,
        vehicle_id: doc.vehicle_id ?? null,
        template_id: "contract_v2_signed_buyer",
        payload: {
          senderEmail: salesEmail,
          to: [buyerEmail],
          subject: `Ondertekend koopcontract ${doc.contract_number}`,
          htmlBody: buyerHtml,
          attachments,
        },
      });
      if (qErr1) console.error("email_queue insert (buyer) failed", qErr1);
    }
    if (salesEmail) {
      const salesHtml = renderContractEmail({
        buyerName: salesName,
        intro: `Contract <strong>${doc.contract_number}</strong> is zojuist digitaal ondertekend door ${buyerName}. Gebruik onderstaande knop om de PDF te bekijken.`,
        ctaText: "Ondertekend contract bekijken",
        ctaUrl: signed?.signedUrl || "#",
        salesName: "Auto City CRM",
        companyName: company,
        companyPhone,
      });
      const { error: qErr2 } = await admin.from("email_queue").insert({
        status: "pending",
        attempts: 0,
        vehicle_id: doc.vehicle_id ?? null,
        template_id: "contract_v2_signed_sales",
        payload: {
          senderEmail: "inkoop@auto-city.nl",
          to: [salesEmail],
          subject: `Contract ${doc.contract_number} is ondertekend`,
          htmlBody: salesHtml,
          attachments,
        },
      });
      if (qErr2) console.error("email_queue insert (sales) failed", qErr2);
    }

    // LMS terugkoppeling — mag NOOIT de teken-flow breken
    try {
      const { data: secretRow } = await admin.rpc("vault_secret", {
        secret_name: "lms_sync_secret",
      });
      const lmsSecret = typeof secretRow === "string" ? secretRow : null;
      if (lmsSecret) {
        const veh = (doc.vehicle_snapshot as any) || {};
        const lmsPayload = {
          contract_number: doc.contract_number,
          signed_at: now.toISOString(),
          price: Number(doc.sale_price_ex) || 0,
          financing_conditional: !!(doc as any).financing_conditional,
          vin: veh.vin || null,
          kenteken: veh.licenseNumber || null,
          customer: {
            name:
              cust.companyName ||
              [cust.firstName, cust.lastName].filter(Boolean).join(" ") ||
              cust.name ||
              null,
            email: cust.email || null,
            phone: cust.phone || null,
            address:
              [cust.street || cust.address, cust.number]
                .filter(Boolean)
                .join(" ") || null,
            postal_code: cust.zipCode || cust.postal_code || cust.postalCode || null,
            city: cust.city || null,
          },
          salesperson: { email: salesEmail || null },
          pdf_base64: body.pdf_base64,
        };
        const lmsResp = await fetch(
          "https://aogxdgnvhbogimoqjwpp.supabase.co/functions/v1/crm-intake",
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-lms-secret": lmsSecret,
            },
            body: JSON.stringify(lmsPayload),
          },
        );
        await admin.from("lms_sync_log").insert({
          contract_number: doc.contract_number,
          status: lmsResp.ok ? "success" : "error",
          http_status: lmsResp.status,
          response_body: await lmsResp.text().catch(() => null),
        } as any);
      } else {
        console.warn("lms_sync_secret not configured, skipping LMS sync");
      }
    } catch (e) {
      console.warn("LMS sync failed (non-blocking)", e);
    }

    return json({ ok: true, pdf_url: signed?.signedUrl || null });
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
  return s
    .replace(/\u2014/g, "-")
    .replace(/\u2013/g, "-")
    .replace(/\u2011/g, "-");
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
    buyerName,
    intro,
    ctaText,
    ctaUrl,
    salesName,
    companyName,
    companyPhone,
    extraHtml,
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
    <p style="font-size:12px;color:#666;margin:0 0 6px;">Werkt de knop niet? Open deze link:</p>
    <p style="font-size:12px;color:#0066cc;word-break:break-all;margin:0 0 24px;">
      <a href="${ctaUrl}" style="color:#0066cc;text-decoration:underline;">${ctaUrl}</a>
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