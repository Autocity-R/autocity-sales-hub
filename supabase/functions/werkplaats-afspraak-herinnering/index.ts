import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AUTOCITY_LOGO_URL =
  "https://www.auto-city.nl/upload/logo/logo_images_0_1698072999114488851.png";

const WORKSHOP_ADDRESS = "Calandstraat 94, Schiedam";
const WORKSHOP_PHONE = "010-2623980";

function signatureHtml(name = "Autocity Werkplaats"): string {
  return `
<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;color:#222">
  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;font-size:12px;color:#555;table-layout:fixed">
    <tr>
      <td style="vertical-align:middle;width:72px;padding:0;">
        <div style="background:#000000;width:64px;height:64px;border-radius:4px;padding:8px;box-sizing:border-box;">
          <img src="${AUTOCITY_LOGO_URL}" alt="Auto City" style="width:100%;height:100%;object-fit:contain;display:block;border:0;" />
        </div>
      </td>
      <td style="vertical-align:middle;line-height:1.6;border-left:3px solid #FF6B00;padding-left:14px;">
        <div style="color:#333;">Met vriendelijke groet,</div>
        <div style="font-weight:600;color:#222;">${name}</div>
        <div>Autocity</div>
        <div>Tel: ${WORKSHOP_PHONE}</div>
        <div><a href="https://www.auto-city.nl" style="color:#FF6B00;text-decoration:none;">www.auto-city.nl</a></div>
      </td>
    </tr>
  </table>
</div>`;
}

const row = (k: string, v: string) =>
  `<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px;white-space:nowrap">${k}</td><td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600">${v}</td></tr>`;

/** Datum in Amsterdam-tijdzone als YYYY-MM-DD. */
const amsDate = (d: Date): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const tomorrow = amsDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
    // ruime UTC-window rond de doeldag; exacte dag filteren we in Amsterdam-tijd
    const from = new Date(`${tomorrow}T00:00:00+02:00`);
    from.setHours(from.getHours() - 3);
    const to = new Date(`${tomorrow}T23:59:59+01:00`);
    to.setHours(to.getHours() + 3);

    const { data: orders, error } = await supabase
      .from("work_orders")
      .select("id, planned_at, description, parts, part, discipline, external_customer, reminder_for_date, vehicle_id, status")
      .or("source.eq.extern,origin.eq.extern")
      .in("status", ["ingepland", "bezig"])
      .gte("planned_at", from.toISOString())
      .lte("planned_at", to.toISOString());
    if (error) throw error;

    const todo = (orders || []).filter((o: any) => {
      if (!o.planned_at) return false;
      if (amsDate(new Date(o.planned_at)) !== tomorrow) return false;
      if (o.reminder_for_date === tomorrow) return false; // al gestuurd voor deze datum
      const email = o.external_customer?.email;
      return !!email && typeof email === "string" && email.includes("@") && !email.endsWith("@werkplaats.local");
    });

    const vehicleIds = [...new Set(todo.map((o: any) => o.vehicle_id).filter(Boolean))];
    const vehicles = new Map<string, any>();
    if (vehicleIds.length) {
      const { data: vs } = await supabase
        .from("vehicles").select("id, brand, model, license_number").in("id", vehicleIds);
      (vs || []).forEach((v: any) => vehicles.set(v.id, v));
    }

    let sent = 0;
    for (const o of todo) {
      const ec = o.external_customer || {};
      const v = o.vehicle_id ? vehicles.get(o.vehicle_id) : null;
      const when = new Date(o.planned_at);
      const dateLabel = when.toLocaleDateString("nl-NL", {
        weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Amsterdam",
      });
      const timeLabel = when.toLocaleTimeString("nl-NL", {
        hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam",
      });
      const parts: string[] = Array.isArray(o.parts) ? o.parts : (o.part ? [o.part] : []);
      const work = (o.description || parts.join(" · ") || o.discipline || "-").replace(/\n/g, "<br/>");
      const plate = (v?.license_number || "").toUpperCase();
      const car = [v?.brand, v?.model].filter(Boolean).join(" ") + (plate ? ` · ${plate}` : "");

      const htmlBody = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;font-size:14px;line-height:1.6">
  <p style="margin:0 0 12px">Beste ${String(ec.name || "klant").replace(/[<>]/g, "")},</p>
  <p style="margin:0 0 16px">Een korte herinnering: morgen verwachten wij u in onze werkplaats.</p>
  <table style="border-collapse:collapse;margin:0 0 16px">
    ${row("Datum", dateLabel)}
    ${row("Tijd", timeLabel)}
    ${row("Voertuig", car || "-")}
    ${row("Werkzaamheden", work)}
    ${row("Locatie", `Autocity Werkplaats — ${WORKSHOP_ADDRESS}`)}
  </table>
  <p style="margin:0 0 12px">Kunt u er onverhoopt niet bij zijn? Laat het ons dan even weten via ${WORKSHOP_PHONE}.</p>
  ${signatureHtml()}
</div>`;

      const { error: qErr } = await supabase.from("email_queue").insert({
        status: "pending",
        payload: {
          to: [ec.email],
          subject: "Herinnering: uw werkplaatsafspraak",
          htmlBody,
          senderEmail: "werkplaats@auto-city.nl",
          senderName: "Autocity Werkplaats",
        },
      });
      if (qErr) {
        console.error("queue error", o.id, qErr.message);
        continue;
      }
      await supabase
        .from("work_orders")
        .update({ reminder_sent_at: new Date().toISOString(), reminder_for_date: tomorrow })
        .eq("id", o.id);
      sent++;
    }

    console.log(`[werkplaats-herinnering] ${tomorrow}: ${sent}/${todo.length} verstuurd`);
    return new Response(JSON.stringify({ date: tomorrow, candidates: todo.length, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});