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