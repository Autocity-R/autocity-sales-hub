import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { signContractLinkToken } from "../_shared/contractLink.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const contractId = url.searchParams.get("c") || "";
  const token = url.searchParams.get("t") || "";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!/^[0-9a-f-]{36}$/i.test(contractId) || !token) {
    return html("Ongeldige link", 400);
  }

  const expected = await signContractLinkToken(contractId, serviceKey);
  if (token !== expected) return html("Ongeldige of verouderde link", 403);

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: doc } = await admin
    .from("contract_documents")
    .select("id, status, pdf_path")
    .eq("id", contractId)
    .maybeSingle();
  if (!doc) return html("Contract niet gevonden", 404);
  if (doc.status === "geannuleerd")
    return html("Dit contract is ingetrokken", 410);

  let path: string | null = (doc as any).pdf_path ?? null;
  if (!path) {
    const { data: sig } = await admin
      .from("contract_signatures")
      .select("pdf_path, signed_at")
      .eq("contract_id", contractId)
      .not("pdf_path", "is", null)
      .order("signed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    path = sig?.pdf_path ?? null;
  }
  if (!path) return html("Er is nog geen PDF van dit contract opgeslagen", 404);

  const { data: signed, error } = await admin.storage
    .from("vehicle-documents")
    .createSignedUrl(path, 60 * 10);
  if (error || !signed?.signedUrl)
    return html("PDF kon niet worden geopend", 404);

  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: signed.signedUrl },
  });
});

function html(message: string, status: number) {
  return new Response(
    `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Koopcontract</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f6f6f6;margin:0;padding:48px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;padding:32px;border-radius:6px;">
    <h1 style="font-size:18px;margin:0 0 12px;">Koopcontract</h1>
    <p style="font-size:14px;color:#444;margin:0;">${message}.</p>
  </div>
</body></html>`,
    { status, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
  );
}