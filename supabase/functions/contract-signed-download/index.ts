import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { token } = (await req.json()) as { token?: string };
    if (!token) return json({ error: "missing_token" }, 400);

    const { data: sig, error } = await admin
      .from("contract_signatures")
      .select("signed_at, pdf_path, contract_id")
      .eq("token", token)
      .maybeSingle();
    if (error || !sig) return json({ error: "invalid_token" }, 404);
    if (!sig.signed_at || !sig.pdf_path)
      return json({ error: "not_signed" }, 404);

    const { data: signed } = await admin.storage
      .from("vehicle-documents")
      .createSignedUrl(sig.pdf_path, 60 * 60 * 24 * 7);

    return json({
      ok: true,
      signed_at: sig.signed_at,
      pdf_url: signed?.signedUrl || null,
    });
  } catch (e) {
    console.error(e);
    return json({ error: "unexpected", detail: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}