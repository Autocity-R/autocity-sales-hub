import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "administratie@auto-city.nl";
const SENDER_EMAIL = "werkplaats@auto-city.nl";

const eur = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n) || 0);

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
};

interface Line { description: string; amount: number }

const buildHtml = (res: any) => {
  const lines: Line[] = Array.isArray(res.lines) ? res.lines : [];
  const rows = lines
    .map(
      (l) => `<tr>
      <td style="padding:8px 10px;border-bottom:1px solid #e6e8ec;font-size:12.5px">${esc(l.description)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e6e8ec;font-size:12.5px;text-align:right;white-space:nowrap">${eur(l.amount)}</td>
    </tr>`,
    )
    .join("");

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;font-size:14px;line-height:1.6">
  <p style="margin:0 0 12px">Beste administratie,</p>
  <p style="margin:0 0 16px">Hierbij de interne maandfactuur <strong>${esc(res.invoice_number)}</strong> voor de poetswerkzaamheden van
  <strong>${esc(monthLabel(res.month))}</strong>. In totaal zijn er <strong>${esc(res.count)}</strong> auto's gepoetst door interne poetsers
  (€ 100,00 incl. btw per auto).</p>
  <table style="border-collapse:collapse;width:100%;max-width:680px;border:1px solid #e6e8ec;border-radius:8px;overflow:hidden">
    <thead>
      <tr style="background:#f7f8fa">
        <th style="padding:9px 10px;text-align:left;font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:#6b7280">Specificatie</th>
        <th style="padding:9px 10px;text-align:right;font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:#6b7280">Bedrag ex btw</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr><td style="padding:8px 10px;text-align:right;font-size:12.5px">Subtotaal ex btw</td>
          <td style="padding:8px 10px;text-align:right;font-size:12.5px">${eur(res.subtotal)}</td></tr>
      <tr><td style="padding:8px 10px;text-align:right;font-size:12.5px">Btw 21%</td>
          <td style="padding:8px 10px;text-align:right;font-size:12.5px">${eur(res.vat)}</td></tr>
      <tr><td style="padding:10px;text-align:right;font-size:13.5px;font-weight:700;border-top:2px solid #111827">Totaal incl. btw</td>
          <td style="padding:10px;text-align:right;font-size:13.5px;font-weight:700;border-top:2px solid #111827">${eur(res.total)}</td></tr>
    </tfoot>
  </table>
  <p style="margin:16px 0 0;color:#6b7280;font-size:12.5px">Deze factuur is automatisch opgemaakt vanuit het CRM (Autocity Repairs B.V. → Autocity Automotive Group B.V.).</p>
</div>`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    let body: any = {};
    try { body = await req.json(); } catch { /* cron stuurt soms geen body */ }
    const month: string | null = body?.month ?? null; // 'YYYY-MM'
    const dryRun = body?.dryRun === true;

    const p_month = month ? `${month}-01` : null;
    const { data, error } = await supabase.rpc("generate_poets_monthly_invoice", {
      p_month,
      p_dry_run: dryRun,
    });
    if (error) throw new Error(error.message);

    const res: any = data;
    // Dry-run maakt géén factuur aan en verstuurt geen mail: alleen een voorbeeld van de regels.
    if (!res?.created) {
      return new Response(JSON.stringify({ ...res, mailed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const { error: qErr } = await supabase.from("email_queue").insert({
      status: "pending",
      payload: {
        to: [ADMIN_EMAIL],
        subject: `Interne maandfactuur poetsen ${monthLabel(res.month)} — ${res.invoice_number}`,
        htmlBody: buildHtml(res),
        senderEmail: SENDER_EMAIL,
        senderName: "Autocity Werkplaats",
      },
    });
    if (qErr) throw new Error(`mail queue: ${qErr.message}`);

    await supabase.from("workshop_invoices").update({ status: "verstuurd" }).eq("id", res.invoice_id);

    return new Response(JSON.stringify({ ...res, mailed: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[poets-maandfactuur]", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
