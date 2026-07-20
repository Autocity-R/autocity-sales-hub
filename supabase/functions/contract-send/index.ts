import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  contractId: string;
  publicBaseUrl?: string;
  overrideEmail?: string | null;
  resend?: boolean;
}

function randomToken(len = 40): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, len);
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

    const { data: doc, error: dErr } = await admin
      .from("contract_documents")
      .select("*")
      .eq("id", body.contractId)
      .single();
    if (dErr || !doc) return json({ error: "not_found" }, 404);

    if (doc.status === "getekend")
      return json({ error: "already_signed" }, 409);
    if (doc.status === "geannuleerd")
      return json({ error: "cancelled" }, 409);

    // Re-use a still-valid unsigned signature when resending; otherwise mint fresh.
    let token: string;
    let expires: string;
    const { data: existingSig } = await admin
      .from("contract_signatures")
      .select("*")
      .eq("contract_id", doc.id)
      .is("signed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (
      existingSig &&
      new Date(existingSig.token_expires_at).getTime() > Date.now() + 60_000
    ) {
      token = existingSig.token;
      expires = existingSig.token_expires_at;
    } else {
      token = randomToken(48);
      expires = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
      const { error: sErr } = await admin
        .from("contract_signatures")
        .insert({
          contract_id: doc.id,
          token,
          token_expires_at: expires,
        });
      if (sErr)
        return json(
          { error: "signature_insert_failed", detail: sErr.message },
          500,
        );
    }

    await admin
      .from("contract_documents")
      .update({ status: "verstuurd", sent_at: new Date().toISOString() })
      .eq("id", doc.id);

    const baseUrl = body.publicBaseUrl || Deno.env.get("PUBLIC_APP_URL") || "";
    const signUrl = baseUrl
      ? `${baseUrl.replace(/\/$/, "")}/teken/${token}`
      : `/teken/${token}`;

    // Queue an email to the customer via the shared email_queue processor.
    const cust = (doc.customer_snapshot as any) || {};
    const buyerName =
      cust.companyName ||
      [cust.firstName, cust.lastName].filter(Boolean).join(" ") ||
      "geachte klant";
    const buyerEmail =
      (typeof body.overrideEmail === "string" && body.overrideEmail.trim()) ||
      cust.email;
    if (!buyerEmail) {
      return json(
        { error: "missing_recipient", detail: "Geen e-mailadres bekend voor de koper." },
        400,
      );
    }
    const companySnap = (doc.company_snapshot as any) || {};
    const company = companySnap.companyName || companySnap.name || "Auto City";
    const companyPhone = companySnap.phone || "";
    const salesEmail = (doc as any).salesperson_email || "inkoop@auto-city.nl";
    const salesName = (doc as any).salesperson_name || "Team Auto City";
    const subject = `Uw koopcontract ${doc.contract_number} - digitaal ondertekenen`;
    const htmlBody = renderContractEmail({
      buyerName,
      intro: `Hierbij ontvangt u uw koopcontract <strong>${doc.contract_number}</strong> ter digitale ondertekening. Klik op onderstaande knop om uw contract te bekijken en te ondertekenen. De link is 48 uur geldig.`,
      ctaText: "Contract bekijken & ondertekenen",
      ctaUrl: signUrl,
      salesName,
      companyName: company,
      companyPhone,
    });
    const { error: qErr } = await admin.from("email_queue").insert({
      status: "pending",
      attempts: 0,
      vehicle_id: doc.vehicle_id ?? null,
      template_id: "contract_v2_send",
      payload: {
        senderEmail: salesEmail,
        to: [buyerEmail],
        subject,
        htmlBody,
      },
    });
    if (qErr) {
      return json(
        { error: "email_queue_failed", detail: qErr.message },
        500,
      );
    }

    return json({ ok: true, token, sign_url: signUrl, expires_at: expires });
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
  // Vervang em/en-dashes door gewoon streepje om dubbele UTF-8 encoding te vermijden.
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
  const safe = sanitizeText;
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f6f6;">
  <div style="font-family:Arial,Helvetica,sans-serif;color:#222;max-width:600px;margin:0 auto;background:#ffffff;padding:32px 36px;">
    <p style="font-size:15px;margin:0 0 12px;">Beste ${safe(buyerName)},</p>
    <p style="font-size:14px;line-height:1.55;color:#333;margin:0 0 20px;">${safe(intro)}</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${ctaUrl}" style="background:#FF6B00;color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:4px;font-weight:600;letter-spacing:0.3px;display:inline-block;font-size:14px;">${safe(ctaText)}</a>
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
          <div style="font-weight:600;color:#222;">${safe(salesName)}</div>
          <div>${safe(companyName)}</div>
          ${companyPhone ? `<div>Tel: ${safe(companyPhone)}</div>` : ""}
          <div><a href="https://www.auto-city.nl" style="color:#FF6B00;text-decoration:none;">www.auto-city.nl</a></div>
        </td>
      </tr>
    </table>
  </div>
</body></html>`;
}