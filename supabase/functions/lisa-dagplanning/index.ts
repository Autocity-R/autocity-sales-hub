import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import * as XLSX from "npm:xlsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROFILES_MAP: Record<string, string> = {
  "9f42b4f5-6e01-43e4-87d3-f372e1b4c909": "Daan Leyte",
  "3be626db-ad93-4236-9e9f-e0ab14690f42": "Alexander Kool",
  "6d62becf-fa32-4eb6-9fb2-936ecfe4313f": "Hendrik",
  "fe095518-9c0a-4435-b097-5b91ca8be586": "Martijn Zuyderhoudt",
  "ddcad8f3-5522-477a-a613-7d35094306a5": "Mario Kroon",
  "37eb30a7-e034-4315-8d1b-c2f61d2535a3": "Lloyd Mahabier",
};

const COMPLEX_PATTERNS = /uitdeuk|spotrepair|herstel|spuit|onderdeel|bestellen|plaatsen|restyle|deuk|lak|beschadig|steenslag|kras|schimmel|kunststof|carrosserie|distributie/i;
const SIMPLE_PATTERNS = /beurt|apk|opladen|volle tank|schoonmaken|wassen|tanken|sleutel|klaar|mattenset|laadkabel|strip|sticker|poetsen/i;

function splitDescription(desc: string): string[] {
  return desc
    .split(/,|\+|\bincl\.?\b|\ben\b/gi)
    .map((t) => t.trim())
    .filter((t) => t.length > 2);
}

function classifyWerklast(openDescriptions: string[]): string {
  const allTasks: string[] = [];
  for (const desc of openDescriptions) {
    allTasks.push(...splitDescription(desc));
  }
  if (allTasks.length === 0) return "Klaar";

  const hasComplex = allTasks.some((t) => COMPLEX_PATTERNS.test(t));
  const taskCount = allTasks.length;

  if (hasComplex && taskCount > 3) return "Zwaar";
  if (hasComplex) return "Normaal";
  if (taskCount <= 2) return "Snel";
  if (taskCount <= 4) return "Normaal";
  return "Zwaar";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekFromNow = new Date(now.getTime() + 7 * 86400000);

    // Fetch vehicles + appointments
    const [vehiclesRes, appointmentsRes] = await Promise.all([
      supabase
        .from("vehicles")
        .select("id, brand, model, license_number, import_status, sold_date, sold_by_user_id, status, details")
        .eq("status", "verkocht_b2c"),
      supabase
        .from("appointments")
        .select("*")
        .eq("type", "aflevering")
        .neq("status", "geannuleerd")
        .gte("starttime", `${todayStr}T00:00:00`)
        .lte("starttime", weekFromNow.toISOString())
        .order("starttime"),
    ]);

    const vehicles = vehiclesRes.data || [];
    const appointments = appointmentsRes.data || [];

    // Process vehicles
    const processed = vehicles.map((v: any) => {
      const details = v.details || {};
      const checklist: any[] = details.preDeliveryChecklist || [];
      const openItems = checklist.filter((i: any) => !i.completed);
      const doneItems = checklist.filter((i: any) => i.completed);
      const openDescriptions = openItems.map((i: any) => i.description || "");
      const allOpenTasks = openDescriptions.flatMap(splitDescription);
      const daysWaiting = v.sold_date
        ? Math.floor((now.getTime() - new Date(v.sold_date).getTime()) / 86400000)
        : 0;
      const isRegistered = v.import_status === "ingeschreven";
      const isChecklistComplete = checklist.length === 0 || openItems.length === 0;
      const hasAppointment = !!details.deliveryAppointmentId;
      const salesperson = PROFILES_MAP[v.sold_by_user_id] || "Onbekend";
      const werklast = classifyWerklast(openDescriptions);

      return {
        auto: `${v.brand || ""} ${v.model || ""}`.trim(),
        kenteken: v.license_number || "—",
        dagenWacht: daysWaiting,
        werklast,
        openWerk: allOpenTasks.join(", ") || "—",
        openWerkCount: allOpenTasks.length,
        importStatus: v.import_status || "onbekend",
        isRegistered,
        isChecklistComplete,
        hasAppointment,
        verkoper: salesperson,
        checklistDone: doneItems.length,
        checklistTotal: checklist.length,
      };
    });

    processed.sort((a: any, b: any) => b.dagenWacht - a.dagenWacht);

    // Tab 1: Werkplaats — has open work + registered (or rode zone)
    const werkplaats = processed.filter(
      (v: any) => !v.isChecklistComplete && v.isRegistered
    );
    const rodeZone = processed.filter((v: any) => v.dagenWacht > 14 && !v.isChecklistComplete && !v.isRegistered);
    const werkplaatsAll = [...rodeZone, ...werkplaats.filter((v: any) => !rodeZone.includes(v))];

    // Tab 2: Verkopers Bellen — ready but no appointment
    const verkopersBellen = processed.filter(
      (v: any) => v.isRegistered && v.isChecklistComplete && !v.hasAppointment
    );

    // Tab 3: Werk in Uitvoering — not registered, has open work
    const werkInUitvoering = processed.filter(
      (v: any) => !v.isRegistered && !v.isChecklistComplete
    );

    // Tab 4: Overzicht
    const todayAppts = appointments.filter((a: any) => a.starttime?.startsWith(todayStr));

    // Build Excel
    const wb = XLSX.utils.book_new();

    // --- Tab 1: Werkplaats ---
    const ws1Data = [
      [`DAGPLANNING WERKPLAATS — ${todayStr}`],
      [],
      ["Auto", "Kenteken", "Dagen wacht", "Werklast", "Open werk", "Import status", "Verkoper", "Checklist"],
      ...werkplaatsAll.map((v: any) => [
        v.auto,
        v.kenteken,
        v.dagenWacht,
        v.werklast,
        v.openWerk,
        v.importStatus,
        v.verkoper,
        `${v.checklistDone}/${v.checklistTotal}`,
      ]),
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
    ws1["!cols"] = [
      { wch: 30 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 60 }, { wch: 16 }, { wch: 20 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "Werkplaats");

    // --- Tab 2: Verkopers Bellen ---
    const grouped: Record<string, any[]> = {};
    for (const v of verkopersBellen) {
      if (!grouped[v.verkoper]) grouped[v.verkoper] = [];
      grouped[v.verkoper].push(v);
    }
    const ws2Data: any[][] = [
      [`VERKOPERS BELLEN — ${todayStr}`],
      [],
      ["Verkoper", "Auto", "Kenteken", "Dagen wacht", "Status"],
    ];
    for (const [verkoper, items] of Object.entries(grouped)) {
      for (const v of items) {
        ws2Data.push([verkoper, v.auto, v.kenteken, v.dagenWacht, "Klaar — geen afspraak"]);
      }
    }
    const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
    ws2["!cols"] = [{ wch: 22 }, { wch: 30 }, { wch: 14 }, { wch: 12 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Verkopers Bellen");

    // --- Tab 3: Werk in Uitvoering ---
    const ws3Data = [
      [`WERK IN UITVOERING — ${todayStr}`],
      [],
      ["Auto", "Kenteken", "Dagen wacht", "Open werk", "Import status", "Blokkade"],
      ...werkInUitvoering.map((v: any) => [
        v.auto,
        v.kenteken,
        v.dagenWacht,
        v.openWerk,
        v.importStatus,
        `Wacht op kenteken + ${v.openWerkCount} taken open`,
      ]),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
    ws3["!cols"] = [{ wch: 30 }, { wch: 14 }, { wch: 12 }, { wch: 60 }, { wch: 16 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws3, "Werk in Uitvoering");

    // --- Tab 4: Overzicht ---
    const ws4Data = [
      [`OVERZICHT AFTERSALES — ${todayStr}`],
      [],
      ["Categorie", "Aantal"],
      ["Totaal verkocht B2C wachtend", processed.length],
      ["Rode zone (>14 dagen, niet klaar)", rodeZone.length],
      ["Werkplaats (ingeschreven, werk open)", werkplaats.length],
      ["Verkopers bellen (klaar, geen afspraak)", verkopersBellen.length],
      ["Werk in uitvoering (wacht op kenteken)", werkInUitvoering.length],
      ["Afleveringen vandaag", todayAppts.length],
      ["Afleveringen deze week", appointments.length],
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(ws4Data);
    ws4["!cols"] = [{ wch: 42 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws4, "Overzicht");

    // Generate buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `dagplanning-${todayStr}.xlsx`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("lisa-planningen")
      .upload(filename, buffer, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Upload failed", details: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate signed URL (24h)
    const { data: signedData, error: signedError } = await supabase.storage
      .from("lisa-planningen")
      .createSignedUrl(filename, 86400);

    if (signedError) {
      console.error("Signed URL error:", signedError);
      return new Response(JSON.stringify({ error: "Signed URL failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        url: signedData.signedUrl,
        filename,
        summary: {
          totaal: processed.length,
          rodeZone: rodeZone.length,
          werkplaats: werkplaats.length,
          verkopersBellen: verkopersBellen.length,
          werkInUitvoering: werkInUitvoering.length,
          afleveringenVandaag: todayAppts.length,
          afleveringenWeek: appointments.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Lisa dagplanning error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
