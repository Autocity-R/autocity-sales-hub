import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildChecklistReminderHtml(verkoperNaam: string, autos: any[], datumDisplay: string): string {
  const autoRows = autos.map(v =>
    `<tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${v.auto}</td>
      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">${v.kenteken}</td>
      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">${v.dagenWacht} dgn</td>
      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">${v.importLabel}</td>
    </tr>`
  ).join("");

  return `
    <div style="font-family: Calibri, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #BF5800; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 18px;">⚠️ Checklist ontbreekt voor ${autos.length} auto('s)</h1>
      </div>
      <div style="background: #f8f8f8; padding: 20px; border: 1px solid #e0e0e0;">
        <p style="font-size: 14px; margin: 0 0 16px;">Hoi ${verkoperNaam},</p>
        <p style="font-size: 14px; margin: 0 0 16px;">De volgende auto's hebben <strong>nog geen afleveringschecklist</strong>. Zonder checklist kunnen we de planning niet bepalen en de auto niet klaarmaken.</p>
        <p style="font-size: 14px; margin: 0 0 16px; color: #BF5800; font-weight: bold;">Vul vandaag de checklist in via het CRM zodat de werkplaats aan de slag kan.</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr style="background: #BF5800; color: white;">
            <th style="padding: 8px; text-align: left;">Auto</th>
            <th style="padding: 8px; text-align: center;">Kenteken</th>
            <th style="padding: 8px; text-align: center;">Wachtdagen</th>
            <th style="padding: 8px; text-align: center;">Import status</th>
          </tr>
          ${autoRows}
        </table>
      </div>
      <div style="padding: 12px 20px; font-size: 11px; color: #999; text-align: center;">
        Automatisch verstuurd door Aftersales · ${datumDisplay}
      </div>
    </div>
  `;
}

const IMPORT_LABELS: Record<string, string> = {
  aangekomen: "Aangekomen",
  goedgekeurd: "Goedgekeurd",
  bpm_betaald: "BPM betaald",
  ingeschreven: "Ingeschreven",
  aanvraag_ontvangen: "Aanvraag ontvangen",
  niet_aangemeld: "Niet aangemeld",
  niet_gestart: "Niet gestart",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const datumDisplay = now.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    // Fetch verkocht_b2c vehicles and profiles
    const [vehiclesRes, profilesRes] = await Promise.all([
      supabase.from("vehicles")
        .select("id, brand, model, license_number, import_status, sold_date, sold_by_user_id, details")
        .eq("status", "verkocht_b2c"),
      supabase.from("profiles").select("id, email, first_name, last_name"),
    ]);

    const vehicles = vehiclesRes.data || [];
    const profiles = profilesRes.data || [];

    // Build profiles map
    const profilesMap: Record<string, { name: string; email: string }> = {};
    for (const p of profiles) {
      profilesMap[p.id] = {
        name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Onbekend",
        email: p.email || "",
      };
    }

    // Filter vehicles without checklist
    const withoutChecklist = vehicles.filter((v: any) => {
      const checklist = v.details?.preDeliveryChecklist || [];
      return checklist.length === 0;
    }).map((v: any) => ({
      auto: `${v.brand || ""} ${v.model || ""}`.trim(),
      kenteken: v.license_number || "—",
      dagenWacht: v.sold_date ? Math.floor((now.getTime() - new Date(v.sold_date).getTime()) / 86400000) : 0,
      importLabel: IMPORT_LABELS[v.import_status] || v.import_status || "Onbekend",
      verkoperUserId: v.sold_by_user_id,
    }));

    if (withoutChecklist.length === 0) {
      console.log("✅ Alle auto's hebben een checklist — geen reminders nodig");
      return new Response(JSON.stringify({ message: "No reminders needed", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by verkoper
    const verkoperGroups: Record<string, { name: string; email: string; autos: any[] }> = {};
    for (const v of withoutChecklist) {
      if (!v.verkoperUserId) continue;
      const profile = profilesMap[v.verkoperUserId];
      if (!profile?.email) continue;
      if (!verkoperGroups[v.verkoperUserId]) {
        verkoperGroups[v.verkoperUserId] = { name: profile.name, email: profile.email, autos: [] };
      }
      verkoperGroups[v.verkoperUserId].autos.push(v);
    }

    let emailsSent = 0;
    for (const [, group] of Object.entries(verkoperGroups)) {
      try {
        await supabase.from("email_queue").insert({
          payload: {
            senderEmail: "aftersales@auto-city.nl",
            to: [group.email],
            subject: `Aftersales: checklist ontbreekt voor ${group.autos.length} auto('s) — vul in voor planning`,
            htmlBody: buildChecklistReminderHtml(group.name, group.autos, datumDisplay),
          },
          status: "pending",
        });
        emailsSent++;
        console.log(`✅ Checklist reminder queued for ${group.name} (${group.email}) — ${group.autos.length} auto('s)`);
      } catch (err) {
        console.error(`❌ Failed to queue checklist reminder for ${group.name}:`, err);
      }
    }

    console.log(`📧 ${emailsSent} checklist reminder emails queued for ${withoutChecklist.length} auto('s)`);
    return new Response(JSON.stringify({
      success: true,
      emailsSent,
      vehiclesWithoutChecklist: withoutChecklist.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Checklist reminder error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
