import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  contractId: string;
  pdf_base64: string;
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
    if (!body?.contractId || !body?.pdf_base64)
      return json({ error: "missing_fields" }, 400);

    const { data: doc, error: dErr } = await admin
      .from("contract_documents")
      .select("*")
      .eq("id", body.contractId)
      .single();
    if (dErr || !doc) return json({ error: "not_found" }, 404);
    if (doc.status === "geannuleerd") return json({ error: "cancelled" }, 409);
    if (doc.status === "getekend") return json({ error: "already_signed" }, 409);

    const pdfBytes = Uint8Array.from(atob(body.pdf_base64), (c) =>
      c.charCodeAt(0),
    );
    const path = `${doc.vehicle_id}/contracts/${doc.contract_number}.pdf`;

    const { error: upErr } = await admin.storage
      .from("vehicle-documents")
      .upload(path, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (upErr)
      return json({ error: "upload_failed", detail: upErr.message }, 500);

    const { data: signed } = await admin.storage
      .from("vehicle-documents")
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    const { error: uErr } = await admin
      .from("contract_documents")
      .update({
        status: "opgeslagen",
        pdf_path: path,
        stored_at: new Date().toISOString(),
        stored_by: u.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", doc.id);
    if (uErr)
      return json({ error: "update_failed", detail: uErr.message }, 500);

    // vehicle_files: één rij per contract (upsert-gedrag zonder unieke index)
    const category =
      doc.contract_type === "b2b" ? "contract_b2b" : "contract_b2c";
    const metadata = {
      contractType: doc.contract_type,
      contract_id: doc.id,
      contract_number: doc.contract_number,
      signed: false,
      manual_signature: true,
      source: "contract_v2_manual",
    };
    try {
      const { data: existing } = await admin
        .from("vehicle_files")
        .select("id")
        .eq("vehicle_id", doc.vehicle_id)
        .eq("file_path", path)
        .maybeSingle();

      if (existing?.id) {
        await admin
          .from("vehicle_files")
          .update({
            file_url: signed?.signedUrl || null,
            file_size: pdfBytes.byteLength,
            metadata,
          })
          .eq("id", existing.id);
      } else {
        await admin.from("vehicle_files").insert({
          vehicle_id: doc.vehicle_id,
          category,
          file_name: `${doc.contract_number}.pdf`,
          file_path: path,
          file_url: signed?.signedUrl || null,
          file_type: "application/pdf",
          file_size: pdfBytes.byteLength,
          metadata,
        });
      }
    } catch (e) {
      console.warn("vehicle_files registration failed", e);
    }

    return json({
      ok: true,
      pdf_path: path,
      pdf_url: signed?.signedUrl || null,
      contract_number: doc.contract_number,
    });
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
