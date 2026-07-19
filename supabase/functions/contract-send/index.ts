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

    const token = randomToken(48);
    const expires = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

    const { data: sig, error: sErr } = await admin
      .from("contract_signatures")
      .insert({
        contract_id: doc.id,
        token,
        token_expires_at: expires,
      })
      .select("*")
      .single();
    if (sErr) return json({ error: "signature_insert_failed", detail: sErr.message }, 500);

    await admin
      .from("contract_documents")
      .update({ status: "verstuurd", sent_at: new Date().toISOString() })
      .eq("id", doc.id);

    const baseUrl = body.publicBaseUrl || Deno.env.get("PUBLIC_APP_URL") || "";
    const signUrl = baseUrl
      ? `${baseUrl.replace(/\/$/, "")}/teken/${token}`
      : `/teken/${token}`;

    // Queue an email to the customer
    const cust = (doc.customer_snapshot as any) || {};
    const buyerName =
      cust.companyName ||
      [cust.firstName, cust.lastName].filter(Boolean).join(" ") ||
      "geachte klant";
    const buyerEmail = cust.email;
    if (buyerEmail) {
      const company = ((doc.company_snapshot as any)?.companyName) || "Autocity";
      const subject = `Uw koopcontract ${doc.contract_number} — digitaal ondertekenen`;
      const html = `
        <div style="font-family:Inter,Arial,sans-serif;color:#222;max-width:560px;margin:0 auto;">
          <p>Beste ${buyerName},</p>
          <p>Hierbij ontvangt u uw koopcontract <strong>${doc.contract_number}</strong> ter digitale ondertekening.</p>
          <p style="text-align:center;margin:28px 0;">
            <a href="${signUrl}" style="background:#FF6B00;color:#fff;text-decoration:none;padding:14px 24px;border-radius:2px;font-weight:600;letter-spacing:0.5px;">Contract bekijken &amp; ondertekenen</a>
          </p>
          <p style="font-size:12px;color:#666;">De link is 48 uur geldig. Na ondertekening ontvangt u automatisch een kopie per e-mail.</p>
          <p style="font-size:12px;color:#999;">Met vriendelijke groet,<br/>${company}</p>
        </div>`;
      try {
        await admin.from("email_queue").insert({
          to: [buyerEmail],
          subject,
          html,
          status: "pending",
          meta: { source: "contract-send", contract_id: doc.id },
        });
      } catch (e) {
        console.warn("email_queue insert failed", e);
      }
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