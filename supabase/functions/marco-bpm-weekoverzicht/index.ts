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

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString();

    // Haal alle bpmRequested vehicles op
    const { data: allVehicles } = await supabase
      .from("vehicles")
      .select("id, brand, model, vin, license_number, import_status, details")
      .neq("status", "afgeleverd");

    const bpmVehicles = (allVehicles || []).filter((v: any) => {
      const d = v.details || {};
      return d.bpmRequested === true && d.isTradeIn !== true && d.isTradeIn !== "true";
    });

    const vehicleIds = bpmVehicles.map((v: any) => v.id);

    // Haal alle relevante whatsapp logs op
    const { data: allLogs } = await supabase
      .from("bpm_huys_whatsapp_log")
      .select("vehicle_id, bericht_type, bericht_datum")
      .in("vehicle_id", vehicleIds.length > 0 ? vehicleIds : ["00000000-0000-0000-0000-000000000000"]);

    const logsByVehicle: Record<string, any[]> = {};
    (allLogs || []).forEach((l: any) => {
      if (!logsByVehicle[l.vehicle_id]) logsByVehicle[l.vehicle_id] = [];
      logsByVehicle[l.vehicle_id].push(l);
    });

    const hasLogType = (vid: string, type: string) =>
      (logsByVehicle[vid] || []).some((l: any) => l.bericht_type === type);

    const getLogDate = (vid: string, type: string) => {
      const log = (logsByVehicle[vid] || []).find((l: any) => l.bericht_type === type);
      return log?.bericht_datum;
    };

    // Blok 1: Wacht op opname
    const wachtOpname = bpmVehicles.filter((v: any) => !hasLogType(v.id, "auto_opgenomen"));

    // Blok 2: Actie vereist door ons (opgenomen, geen papieren_verstuurd)
    const actieDoorOns = bpmVehicles.filter(
      (v: any) => hasLogType(v.id, "auto_opgenomen") && !hasLogType(v.id, "papieren_verstuurd")
    );

    // Blok 3: Wacht op RDW (papieren verstuurd < 3 dagen)
    const wachtRdw = bpmVehicles.filter((v: any) => {
      if (!hasLogType(v.id, "papieren_verstuurd")) return false;
      const datum = getLogDate(v.id, "papieren_verstuurd");
      if (!datum) return false;
      const inProgress = !["aanvraag_ontvangen", "goedgekeurd", "bpm_betaald", "ingeschreven"].includes(v.import_status);
      return inProgress && new Date(datum) >= new Date(threeDaysAgo);
    });

    // Blok 4: Vastgelopen (papieren verstuurd > 3 dagen, geen statusupdate)
    const vastgelopen = bpmVehicles.filter((v: any) => {
      if (!hasLogType(v.id, "papieren_verstuurd")) return false;
      const datum = getLogDate(v.id, "papieren_verstuurd");
      if (!datum) return false;
      const inProgress = !["aanvraag_ontvangen", "goedgekeurd", "bpm_betaald", "ingeschreven"].includes(v.import_status);
      return inProgress && new Date(datum) < new Date(threeDaysAgo);
    });

    const renderTable = (vehicles: any[], extraCol?: { label: string; fn: (v: any) => string }) => {
      if (vehicles.length === 0) return "<p style='color:#888'>Geen auto's</p>";
      let html = `<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%"><tr><th>Auto</th><th>VIN</th><th>Kenteken</th>`;
      if (extraCol) html += `<th>${extraCol.label}</th>`;
      html += "</tr>";
      for (const v of vehicles) {
        html += `<tr><td>${v.brand || ""} ${v.model || ""}</td><td>${v.vin || "—"}</td><td>${v.license_number || "—"}</td>`;
        if (extraCol) html += `<td>${extraCol.fn(v)}</td>`;
        html += "</tr>";
      }
      html += "</table>";
      return html;
    };

    const htmlBody = `
      <div style="font-family:Arial,sans-serif;max-width:750px">
        <h2>📋 Marco — BPM Huys Weekoverzicht</h2>
        <p>Week van ${now.toLocaleDateString("nl-NL")}</p>

        <h3 style="color:#dc2626">1. Wacht op opname door BPM Huys (${wachtOpname.length})</h3>
        ${renderTable(wachtOpname, { label: "Aangemeld", fn: (v) => v.details?.bpmRequestedDate?.slice(0, 10) || "?" })}

        <h3 style="color:#ea580c">2. Actie vereist door ons — papieren sturen (${actieDoorOns.length})</h3>
        ${renderTable(actieDoorOns)}

        <h3 style="color:#2563eb">3. Wacht op RDW aanmelding (${wachtRdw.length})</h3>
        ${renderTable(wachtRdw, { label: "Papieren verstuurd", fn: (v) => getLogDate(v.id, "papieren_verstuurd")?.slice(0, 10) || "?" })}

        <h3 style="color:#dc2626">4. Vastgelopen — >3 dagen zonder update (${vastgelopen.length})</h3>
        ${renderTable(vastgelopen, { label: "Papieren verstuurd", fn: (v) => getLogDate(v.id, "papieren_verstuurd")?.slice(0, 10) || "?" })}

        <hr/><p style="color:#888;font-size:12px">Automatisch gegenereerd door Marco AI — ${now.toISOString()}</p>
      </div>
    `;

    await supabase.from("email_queue").insert({
      status: "pending",
      payload: {
        senderEmail: "marco@auto-city.nl",
        to: "hendrik@auto-city.nl",
        subject: `Marco Weekoverzicht BPM Huys — ${now.toLocaleDateString("nl-NL")}`,
        htmlBody,
      },
    });

    console.log("✅ Weekoverzicht verstuurd");

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("marco-bpm-weekoverzicht error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
