import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const alerts: string[] = [];
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString();

    // === Regel 1: bpmRequested=true maar na 7 dagen geen auto_opgenomen ===
    const { data: bpmVehicles } = await supabase
      .from("vehicles")
      .select("id, brand, model, vin, license_number, details")
      .neq("status", "afgeleverd")
      .not("import_status", "eq", "ingeschreven");

    const bpmRequested = (bpmVehicles || []).filter((v: any) => {
      const d = v.details || {};
      return (
        d.bpmRequested === true &&
        d.isTradeIn !== true &&
        d.isTradeIn !== "true" &&
        d.bpmRequestedDate &&
        new Date(d.bpmRequestedDate) < new Date(sevenDaysAgo)
      );
    });

    if (bpmRequested.length > 0) {
      // Check which ones have NO auto_opgenomen entry
      const vehicleIds = bpmRequested.map((v: any) => v.id);
      const { data: opgenomen } = await supabase
        .from("bpm_huys_whatsapp_log")
        .select("vehicle_id")
        .in("vehicle_id", vehicleIds)
        .eq("bericht_type", "auto_opgenomen");

      const opgenomenIds = new Set((opgenomen || []).map((r: any) => r.vehicle_id));
      const missing = bpmRequested.filter((v: any) => !opgenomenIds.has(v.id));

      if (missing.length > 0) {
        let html = `<h3>⚠️ BPM Huys — Niet opgenomen na 7+ dagen (${missing.length})</h3><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Auto</th><th>VIN</th><th>Kenteken</th><th>Aangemeld op</th></tr>`;
        for (const v of missing) {
          html += `<tr><td>${v.brand || ""} ${v.model || ""}</td><td>${v.vin || "—"}</td><td>${v.license_number || "—"}</td><td>${v.details?.bpmRequestedDate?.slice(0, 10) || "?"}</td></tr>`;
        }
        html += "</table>";
        alerts.push(html);
      }
    }

    // === Regel 3: papieren_verstuurd maar na 3 dagen geen aanvraag_ontvangen ===
    const { data: papierenLogs } = await supabase
      .from("bpm_huys_whatsapp_log")
      .select("vehicle_id, bericht_datum")
      .eq("bericht_type", "papieren_verstuurd")
      .lt("bericht_datum", threeDaysAgo);

    if (papierenLogs && papierenLogs.length > 0) {
      const papierenVehicleIds = papierenLogs.map((l: any) => l.vehicle_id).filter(Boolean);
      if (papierenVehicleIds.length > 0) {
        const { data: vehicles } = await supabase
          .from("vehicles")
          .select("id, brand, model, vin, license_number, import_status, details")
          .in("id", papierenVehicleIds)
          .not("import_status", "in", '("aanvraag_ontvangen","goedgekeurd","bpm_betaald","ingeschreven")');

        const bpmOnly = (vehicles || []).filter((v: any) => {
          const d = v.details || {};
          return d.bpmRequested === true;
        });

        if (bpmOnly.length > 0) {
          let html = `<h3>🔴 Papieren verstuurd maar nog niet aangemeld bij RDW (${bpmOnly.length})</h3><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Auto</th><th>VIN</th><th>Papieren verstuurd</th></tr>`;
          for (const v of bpmOnly) {
            const log = papierenLogs.find((l: any) => l.vehicle_id === v.id);
            html += `<tr><td>${v.brand || ""} ${v.model || ""}</td><td>${v.vin || "—"}</td><td>${log?.bericht_datum?.slice(0, 10) || "?"}</td></tr>`;
          }
          html += "</table>";
          alerts.push(html);
        }
      }
    }

    // Stuur email als er alerts zijn
    if (alerts.length > 0) {
      const htmlBody = `
        <div style="font-family:Arial,sans-serif;max-width:700px">
          <h2>🔧 Marco — BPM Huys Dagelijkse Check</h2>
          <p>Datum: ${now.toLocaleDateString("nl-NL")}</p>
          ${alerts.join("<hr/>")}
          <hr/><p style="color:#888;font-size:12px">Automatisch gegenereerd door Marco AI</p>
        </div>
      `;

      await supabase.from("email_queue").insert({
        status: "pending",
        payload: {
          senderEmail: "marco@auto-city.nl",
          to: "hendrik@auto-city.nl",
          subject: `Marco BPM Check — ${alerts.length} alerts (${now.toLocaleDateString("nl-NL")})`,
          htmlBody,
        },
      });

      console.log(`✅ ${alerts.length} alerts verstuurd`);
    } else {
      console.log("✅ Geen alerts vandaag");
    }

    return new Response(JSON.stringify({ ok: true, alerts: alerts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("marco-bpm-check error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
