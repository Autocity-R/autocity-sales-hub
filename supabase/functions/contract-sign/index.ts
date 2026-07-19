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

    // Update signature
    await admin
      .from("contract_signatures")
      .update({
        signed_at: now.toISOString(),
        signature_data: body.signature_data_url,
        signer_name: body.signer_name || null,
        signer_email: body.signer_email || null,
        ip_address: body.ip || null,
        user_agent: body.user_agent || null,
        pdf_path: path,
      })
      .eq("id", sig.id);

    // Update contract doc
    await admin
      .from("contract_documents")
      .update({ status: "getekend", signed_at: now.toISOString() })
      .eq("id", doc.id);

    // Register in vehicle_files so it appears in the vehicle detail's contracts list
    const category =
      doc.contract_type === "b2b" ? "contract_b2b" : "contract_b2c";
    try {
      await admin.from("vehicle_files").insert({
        vehicle_id: doc.vehicle_id,
        category,
        file_name: `${doc.contract_number}.pdf`,
        file_path: path,
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

    // Signed URL for immediate download
    const { data: signed } = await admin.storage
      .from("vehicle-documents")
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    // Notify parties
    const cust = (doc.customer_snapshot as any) || {};
    const buyerEmail = cust.email;
    const buyerName =
      cust.companyName ||
      [cust.firstName, cust.lastName].filter(Boolean).join(" ") ||
      "geachte klant";
    const company = (doc.company_snapshot as any)?.companyName || "Autocity";
    const salesEmail = (doc as any).salesperson_email;
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;color:#222;max-width:560px;margin:0 auto;">
        <p>Beste ${buyerName},</p>
        <p>Bedankt voor het digitaal ondertekenen van koopcontract <strong>${doc.contract_number}</strong>. Uw ondertekende kopie is bijgevoegd via onderstaande link.</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${signed?.signedUrl || "#"}" style="background:#FF6B00;color:#fff;text-decoration:none;padding:12px 22px;border-radius:2px;font-weight:600;">Ondertekend contract downloaden</a>
        </p>
        <p style="font-size:12px;color:#999;">Met vriendelijke groet,<br/>${company}</p>
      </div>`;
    try {
      if (buyerEmail) {
        await admin.from("email_queue").insert({
          to: [buyerEmail],
          subject: `Ondertekend koopcontract ${doc.contract_number}`,
          html,
          status: "pending",
          meta: { source: "contract-sign", contract_id: doc.id },
        });
      }
      if (salesEmail) {
        await admin.from("email_queue").insert({
          to: [salesEmail],
          subject: `Contract ${doc.contract_number} is ondertekend`,
          html: `<p>Contract <strong>${doc.contract_number}</strong> is zojuist digitaal ondertekend door ${buyerName}. <a href="${signed?.signedUrl || "#"}">Bekijk PDF</a>.</p>`,
          status: "pending",
          meta: { source: "contract-sign", contract_id: doc.id },
        });
      }
    } catch (e) {
      console.warn("email_queue insert failed", e);
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