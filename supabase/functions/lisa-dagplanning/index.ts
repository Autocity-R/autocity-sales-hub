import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import XLSX from "npm:xlsx-js-style";

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

// Colors
const C = {
  DARK_NAVY: "1F3864", MID_BLUE: "2F5496",
  ROOD_H: "C00000", GROEN_H: "375623", GROEN_MID: "4E7B35",
  ORANJE_H: "BF5800", BLAUW_H: "1F3864",
  ROOD_BG: "FFD7D7", ROOD_ALT: "FFB3B3",
  GROEN_BG: "E2EFDA", GROEN_ALT: "F0F7EC",
  ORANJE_BG: "FCE4D6", ORANJE_ALT: "FFF0E6",
  BLAUW_BG: "DEEAF1", BLAUW_ALT: "EEF5FA",
  WIT: "FFFFFF", GRIJS_LT: "F8F8F8", GRIJS_BG: "F2F2F2", GRIJS_H: "EEF2F8",
};

const BORDER = { style: "thin", color: { rgb: "BFBFBF" } };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const FONT_BASE = { name: "Calibri", sz: 9, color: { rgb: "000000" } };

const ZWAAR_PATTERNS = /spuit|inlak|lakschade|beschadig|uitdeuk|deuk|spotrepair|restyle|bodywerk|distributieriem|revisie|herstellen|carrosserie|schimmel|kunststof/i;
const NORMAAL_PATTERNS = /apk|onderhoudsbeurt|beurt|banden|velgen|trekhaak|camera|melding|lichtunit|parkeerrem|onderdeel|bestellen|plaatsen/i;

const IMPORT_LABELS: Record<string, string> = {
  aangekomen: "Aangekomen (Marco)",
  goedgekeurd: "Goedgekeurd (bijna)",
  bpm_betaald: "BPM betaald (bijna)",
  aanvraag_ontvangen: "Aanvraag ontvangen",
  niet_aangemeld: "Niet aangemeld",
  niet_gestart: "Niet gestart",
};

function parseTaken(desc: string): string[] {
  return desc.split(/,\s*|\s*\+\s*|\s+incl\.?\s+|\ben\b/gi).map(t => t.trim()).filter(t => t.length > 2);
}

function getWerklast(openDescriptions: string[]): string {
  const allTasks: string[] = [];
  for (const d of openDescriptions) allTasks.push(...parseTaken(d));
  if (allTasks.length === 0) return "✅ Klaar";
  const tekst = allTasks.join(" ").toLowerCase();
  if (ZWAAR_PATTERNS.test(tekst)) return "🔴 Zwaar\n~halve dag+";
  const normaalCount = allTasks.filter(t => NORMAAL_PATTERNS.test(t)).length;
  if (normaalCount > 0) return `🟡 Normaal\n~${normaalCount < 2 ? "1,5" : normaalCount + "+"} uur`;
  return "⚡ Snel\n~30 min";
}

function makeCell(v: any, opts: any = {}): any {
  const cell: any = { v, t: typeof v === "number" ? "n" : "s" };
  cell.s = {
    font: { ...FONT_BASE, ...(opts.font || {}) },
    border: BORDERS,
    alignment: { vertical: "center", wrapText: true, horizontal: opts.align || "left", ...(opts.alignment || {}) },
    fill: opts.fill ? { fgColor: { rgb: opts.fill }, patternType: "solid" } : undefined,
  };
  return cell;
}

function titleCell(text: string): any {
  return {
    v: text, t: "s",
    s: {
      font: { name: "Calibri", sz: 14, bold: true, color: { rgb: C.WIT } },
      fill: { fgColor: { rgb: C.DARK_NAVY }, patternType: "solid" },
      alignment: { vertical: "center", horizontal: "left" },
      border: BORDERS,
    },
  };
}

function subtitleCell(text: string): any {
  return {
    v: text, t: "s",
    s: {
      font: { name: "Calibri", sz: 9, italic: true, color: { rgb: "A0A0A0" } },
      fill: { fgColor: { rgb: C.GRIJS_H }, patternType: "solid" },
      alignment: { vertical: "center", horizontal: "left" },
      border: BORDERS,
    },
  };
}

function spacerCell(): any {
  return {
    v: "", t: "s",
    s: { fill: { fgColor: { rgb: C.GRIJS_LT }, patternType: "solid" }, border: BORDERS },
  };
}

function sectionHeaderCell(text: string, color: string): any {
  return {
    v: text, t: "s",
    s: {
      font: { name: "Calibri", sz: 11, bold: true, color: { rgb: C.WIT } },
      fill: { fgColor: { rgb: color }, patternType: "solid" },
      alignment: { vertical: "center", horizontal: "left" },
      border: BORDERS,
    },
  };
}

function colHeaderCell(text: string, color: string): any {
  return {
    v: text, t: "s",
    s: {
      font: { name: "Calibri", sz: 9, bold: true, color: { rgb: C.WIT } },
      fill: { fgColor: { rgb: color }, patternType: "solid" },
      alignment: { vertical: "center", horizontal: "center", wrapText: true },
      border: BORDERS,
    },
  };
}

function addMergedRow(ws: any, row: number, cols: number, cell: any): void {
  const ref = XLSX.utils.encode_cell({ r: row, c: 0 });
  ws[ref] = cell;
  for (let c = 1; c < cols; c++) {
    ws[XLSX.utils.encode_cell({ r: row, c })] = { v: "", t: "s", s: cell.s };
  }
  if (!ws["!merges"]) ws["!merges"] = [];
  ws["!merges"].push({ s: { r: row, c: 0 }, e: { r: row, c: cols - 1 } });
}

function addDataRow(ws: any, row: number, values: any[], opts: { bg: string; alt: string; idx: number; colAligns?: string[]; dagenIdx?: number }): void {
  const fill = opts.idx % 2 === 0 ? opts.bg : opts.alt;
  values.forEach((v, c) => {
    const align = opts.colAligns?.[c] || "left";
    const fontOverride: any = {};
    if (opts.dagenIdx !== undefined && c === opts.dagenIdx && typeof v === "number") {
      if (v > 14) { fontOverride.color = { rgb: C.ROOD_H }; fontOverride.bold = true; }
      else if (v > 7) { fontOverride.color = { rgb: C.ORANJE_H }; }
    }
    ws[XLSX.utils.encode_cell({ r: row, c })] = makeCell(v, { fill, align, font: fontOverride });
  });
}

function addColHeaders(ws: any, row: number, headers: string[], color: string): void {
  headers.forEach((h, c) => {
    ws[XLSX.utils.encode_cell({ r: row, c })] = colHeaderCell(h, color);
  });
}

function setSheetProps(ws: any, colWidths: number[], maxRow: number, maxCol: number): void {
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow, c: maxCol - 1 } });
  ws["!cols"] = colWidths.map(w => ({ wch: w }));
  ws["!rows"] = [];
  for (let r = 0; r <= maxRow; r++) {
    if (r === 0) ws["!rows"][r] = { hpt: 36 };
    else if (r === 1) ws["!rows"][r] = { hpt: 16 };
    else if (r === 2) ws["!rows"][r] = { hpt: 6 };
    else ws["!rows"][r] = { hpt: 52 };
  }
  ws["!freeze"] = { xSplit: 0, ySplit: 3, topLeftCell: "A4" };
  if (!ws["!sheetViews"]) ws["!sheetViews"] = [{}];
  ws["!sheetViews"][0].showGridLines = false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const tomorrow = new Date(now.getTime() + 86400000);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    const weekFromNow = new Date(now.getTime() + 7 * 86400000);

    const [vehiclesRes, appointmentsRes, tomorrowApptsRes] = await Promise.all([
      supabase.from("vehicles").select("id, brand, model, license_number, import_status, sold_date, sold_by_user_id, status, details")
        .eq("status", "verkocht_b2c"),
      supabase.from("appointments").select("*").eq("type", "aflevering").neq("status", "geannuleerd")
        .gte("starttime", `${todayStr}T00:00:00`).lte("starttime", weekFromNow.toISOString()).order("starttime"),
      supabase.from("appointments").select("*").eq("type", "aflevering").neq("status", "geannuleerd")
        .gte("starttime", `${tomorrowStr}T00:00:00`).lt("starttime", `${tomorrowStr}T23:59:59`).order("starttime"),
    ]);

    const vehicles = vehiclesRes.data || [];
    const appointments = appointmentsRes.data || [];
    const tomorrowAppts = tomorrowApptsRes.data || [];

    // Process vehicles
    const processed = vehicles.map((v: any) => {
      const details = v.details || {};
      const checklist: any[] = details.preDeliveryChecklist || [];
      const openItems = checklist.filter((i: any) => !i.completed);
      const doneItems = checklist.filter((i: any) => i.completed);
      const openDescriptions = openItems.map((i: any) => i.description || "");
      const allOpenTasks = openDescriptions.flatMap(parseTaken);
      const daysWaiting = v.sold_date ? Math.floor((now.getTime() - new Date(v.sold_date).getTime()) / 86400000) : 0;
      const isRegistered = v.import_status === "ingeschreven";
      const isChecklistComplete = checklist.length === 0 || openItems.length === 0;
      const hasAppointment = !!details.deliveryAppointmentId;
      const salesperson = PROFILES_MAP[v.sold_by_user_id] || "Onbekend";

      return {
        id: v.id,
        auto: `${v.brand || ""} ${v.model || ""}`.trim(),
        kenteken: v.license_number || "—",
        dagenWacht: daysWaiting,
        werklast: getWerklast(openDescriptions),
        openWerk: allOpenTasks.length > 0 ? allOpenTasks.map(t => `• ${t}`).join("\n") : "—",
        openWerkCount: allOpenTasks.length,
        importStatus: v.import_status || "onbekend",
        importLabel: IMPORT_LABELS[v.import_status] || v.import_status || "Onbekend",
        isRegistered,
        isChecklistComplete,
        hasAppointment,
        verkoper: salesperson,
        checklistDone: doneItems.length,
        checklistTotal: checklist.length,
      };
    });
    processed.sort((a: any, b: any) => b.dagenWacht - a.dagenWacht);

    // Categories
    const rodeZone = processed.filter((v: any) => v.dagenWacht > 14 && !v.isChecklistComplete);
    const werkplaats = processed.filter((v: any) => !v.isChecklistComplete && v.isRegistered && v.dagenWacht <= 14);
    const verkopersBellen = processed.filter((v: any) => v.isRegistered && v.isChecklistComplete && !v.hasAppointment);
    const werkInUitvoering = processed.filter((v: any) => !v.isRegistered && !v.isChecklistComplete);
    const todayAppts = appointments.filter((a: any) => a.starttime?.startsWith(todayStr));

    // Tomorrow deliveries with vehicle info
    const tomorrowDeliveries = tomorrowAppts.map((a: any) => {
      const veh = processed.find((v: any) => v.id === a.vehicleid);
      return {
        auto: veh?.auto || `${a.vehiclebrand || ""} ${a.vehiclemodel || ""}`.trim(),
        kenteken: veh?.kenteken || a.vehiclelicensenumber || "—",
        tijd: a.starttime ? new Date(a.starttime).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }) : "—",
        klant: a.customername || "—",
        werklast: veh?.werklast || "✅ Klaar",
        openWerk: veh?.openWerk || "—",
        checklistStatus: veh ? `${veh.checklistDone}/${veh.checklistTotal}` : "—",
      };
    });

    const datumDisplay = now.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const wb = XLSX.utils.book_new();

    // ===== TAB 1: WERKPLAATS =====
    const ws1: any = {};
    const ws1Cols = 7;
    const ws1Widths = [28, 12, 9, 13, 40, 18, 42];
    const ws1ColAligns = ["left", "center", "center", "center", "left", "center", "left"];
    let r = 0;

    addMergedRow(ws1, r++, ws1Cols, titleCell(`🔧 DAGPLANNING WERKPLAATS · ${datumDisplay}`));
    addMergedRow(ws1, r++, ws1Cols, subtitleCell("Gegenereerd door Lisa · aftersales@auto-city.nl"));
    addMergedRow(ws1, r++, ws1Cols, spacerCell());

    // Section: Tomorrow deliveries
    if (tomorrowDeliveries.length > 0) {
      addMergedRow(ws1, r++, ws1Cols, sectionHeaderCell("📅 AFLEVERING MORGEN — AANWEZIG & KLAAR VOOR 09:45", C.GROEN_H));
      addColHeaders(ws1, r++, ["Auto", "Kenteken", "Tijd", "Klant", "Werklast", "Checklist", "Open werk"], C.GROEN_MID);
      tomorrowDeliveries.forEach((d: any, i: number) => {
        addDataRow(ws1, r++, [d.auto, d.kenteken, d.tijd, d.klant, d.werklast, d.checklistStatus, d.openWerk],
          { bg: C.GROEN_BG, alt: C.GROEN_ALT, idx: i, colAligns: ws1ColAligns });
      });
      addMergedRow(ws1, r++, ws1Cols, spacerCell());
    }

    // Section: Rode zone
    if (rodeZone.length > 0) {
      addMergedRow(ws1, r++, ws1Cols, sectionHeaderCell(`🔴 RODE ZONE — KLANT WACHT TE LANG (${rodeZone.length} auto's)`, C.ROOD_H));
      addColHeaders(ws1, r++, ["Auto", "Kenteken", "Dagen wacht", "Werklast", "Open werk", "Import status", "Actie werkplaats"], C.ROOD_H);
      rodeZone.forEach((v: any, i: number) => {
        const actie = v.isRegistered ? "PRIORITEIT — direct inplannen" : `Wacht op kenteken + ${v.openWerkCount} taken`;
        addDataRow(ws1, r++, [v.auto, v.kenteken, v.dagenWacht, v.werklast, v.openWerk, v.importLabel, actie],
          { bg: C.ROOD_BG, alt: C.ROOD_ALT, idx: i, colAligns: ws1ColAligns, dagenIdx: 2 });
      });
      addMergedRow(ws1, r++, ws1Cols, spacerCell());
    }

    // Section: Kenteken OK
    if (werkplaats.length > 0) {
      addMergedRow(ws1, r++, ws1Cols, sectionHeaderCell(`🟢 KENTEKEN OK — CHECKLIST OPEN (${werkplaats.length} auto's)`, C.GROEN_H));
      addColHeaders(ws1, r++, ["Auto", "Kenteken", "Dagen wacht", "Werklast", "Open werk", "Import status", "Actie werkplaats"], C.GROEN_MID);
      werkplaats.forEach((v: any, i: number) => {
        addDataRow(ws1, r++, [v.auto, v.kenteken, v.dagenWacht, v.werklast, v.openWerk, v.importLabel, `Inplannen — ${v.openWerkCount} taken open`],
          { bg: C.GROEN_BG, alt: C.GROEN_ALT, idx: i, colAligns: ws1ColAligns, dagenIdx: 2 });
      });
    }

    setSheetProps(ws1, ws1Widths, r, ws1Cols);
    XLSX.utils.book_append_sheet(wb, ws1, "🔧 Werkplaats");

    // ===== TAB 2: VERKOPERS BELLEN =====
    const ws2: any = {};
    const ws2Cols = 6;
    const ws2Widths = [18, 34, 12, 12, 22, 30];
    r = 0;

    addMergedRow(ws2, r++, ws2Cols, titleCell(`📞 VERKOPERS BELLEN · ${datumDisplay}`));
    addMergedRow(ws2, r++, ws2Cols, subtitleCell("Klaar + ingeschreven, maar nog geen afleverafspraak"));
    addMergedRow(ws2, r++, ws2Cols, spacerCell());

    const grouped: Record<string, any[]> = {};
    for (const v of verkopersBellen) {
      if (!grouped[v.verkoper]) grouped[v.verkoper] = [];
      grouped[v.verkoper].push(v);
    }

    if (verkopersBellen.length > 0) {
      addMergedRow(ws2, r++, ws2Cols, sectionHeaderCell(`🟡 ${verkopersBellen.length} AUTO'S KLAAR — GEEN AFSPRAAK`, C.ORANJE_H));
      addColHeaders(ws2, r++, ["Verkoper", "Auto", "Kenteken", "Dagen wacht", "Status", "Actie"], C.ORANJE_H);
      let idx = 0;
      for (const [verkoper, items] of Object.entries(grouped)) {
        for (const v of items) {
          const actie = v.dagenWacht > 14 ? "URGENT — bel vandaag nog!" : "Bel klant voor afleverafspraak";
          const actieFontOverride = v.dagenWacht > 14 ? { color: { rgb: C.ROOD_H }, bold: true } : {};
          const fill = idx % 2 === 0 ? C.ORANJE_BG : C.ORANJE_ALT;
          ws2[XLSX.utils.encode_cell({ r, c: 0 })] = makeCell(verkoper, { fill, align: "left" });
          ws2[XLSX.utils.encode_cell({ r, c: 1 })] = makeCell(v.auto, { fill, align: "left" });
          ws2[XLSX.utils.encode_cell({ r, c: 2 })] = makeCell(v.kenteken, { fill, align: "center" });
          ws2[XLSX.utils.encode_cell({ r, c: 3 })] = makeCell(v.dagenWacht, { fill, align: "center", font: v.dagenWacht > 14 ? { color: { rgb: C.ROOD_H }, bold: true } : v.dagenWacht > 7 ? { color: { rgb: C.ORANJE_H } } : {} });
          ws2[XLSX.utils.encode_cell({ r, c: 4 })] = makeCell("✅ Klaar + Ingeschreven", { fill, align: "center", font: { color: { rgb: C.GROEN_H } } });
          ws2[XLSX.utils.encode_cell({ r, c: 5 })] = makeCell(actie, { fill, align: "left", font: actieFontOverride });
          r++; idx++;
        }
      }
    } else {
      addMergedRow(ws2, r++, ws2Cols, sectionHeaderCell("✅ Alle klanten hebben een afspraak!", C.GROEN_H));
    }

    setSheetProps(ws2, ws2Widths, r, ws2Cols);
    XLSX.utils.book_append_sheet(wb, ws2, "📞 Verkopers Bellen");

    // ===== TAB 3: WERK IN UITVOERING =====
    const ws3: any = {};
    const ws3Cols = 6;
    const ws3Widths = [26, 12, 10, 42, 18, 38];
    r = 0;

    addMergedRow(ws3, r++, ws3Cols, titleCell(`🔵 WERK IN UITVOERING · ${datumDisplay}`));
    addMergedRow(ws3, r++, ws3Cols, subtitleCell("Wacht op kenteken — checklist alvast starten"));
    addMergedRow(ws3, r++, ws3Cols, spacerCell());

    if (werkInUitvoering.length > 0) {
      addMergedRow(ws3, r++, ws3Cols, sectionHeaderCell(`🔵 ${werkInUitvoering.length} AUTO'S — WACHT OP KENTEKEN`, C.BLAUW_H));
      addColHeaders(ws3, r++, ["Auto", "Kenteken", "Dagen wacht", "Open werk (start alvast)", "Import status", "Actie"], C.BLAUW_H);
      werkInUitvoering.forEach((v: any, i: number) => {
        const actie = `Checklist alvast starten — ${v.openWerkCount} taken open`;
        addDataRow(ws3, r++, [v.auto, v.kenteken, v.dagenWacht, v.openWerk, v.importLabel, actie],
          { bg: C.BLAUW_BG, alt: C.BLAUW_ALT, idx: i, colAligns: ["left", "center", "center", "left", "center", "left"], dagenIdx: 2 });
      });
    } else {
      addMergedRow(ws3, r++, ws3Cols, sectionHeaderCell("✅ Geen auto's wachtend op kenteken", C.GROEN_H));
    }

    setSheetProps(ws3, ws3Widths, r, ws3Cols);
    XLSX.utils.book_append_sheet(wb, ws3, "🔵 Werk in Uitvoering");

    // ===== TAB 4: OVERZICHT =====
    const ws4: any = {};
    const ws4Cols = 4;
    const ws4Widths = [35, 10, 15, 42];
    r = 0;

    addMergedRow(ws4, r++, ws4Cols, titleCell(`📊 OVERZICHT AFTERSALES · ${datumDisplay}`));
    addMergedRow(ws4, r++, ws4Cols, subtitleCell("Samenvatting dagplanning"));
    addMergedRow(ws4, r++, ws4Cols, spacerCell());

    addColHeaders(ws4, r++, ["Categorie", "Aantal", "Wie", "Actie"], C.DARK_NAVY);

    const overzichtRows = [
      { cat: "📅 Aflevering MORGEN", n: tomorrowDeliveries.length, wie: "Lloyd", actie: tomorrowDeliveries.length > 0 ? tomorrowDeliveries.map(d => `${d.auto} ${d.tijd}`).join(", ") : "Geen afleveringen morgen", bg: C.GROEN_BG, alt: C.GROEN_ALT },
      { cat: "🔴 Rode zone (>14 dgn)", n: rodeZone.length, wie: "Werkplaats", actie: "Absolute prioriteit", bg: C.ROOD_BG, alt: C.ROOD_ALT },
      { cat: "🟢 Kenteken OK + checklist open", n: werkplaats.length, wie: "Werkplaats", actie: "Inplannen", bg: C.GROEN_BG, alt: C.GROEN_ALT },
      { cat: "🟡 Klaar maar geen afspraak", n: verkopersBellen.length, wie: "Verkopers", actie: "Vandaag bellen", bg: C.ORANJE_BG, alt: C.ORANJE_ALT },
      { cat: "🔵 Werk in uitvoering", n: werkInUitvoering.length, wie: "Werkplaats", actie: "Checklist alvast starten", bg: C.BLAUW_BG, alt: C.BLAUW_ALT },
      { cat: "📅 Afleveringen deze week", n: appointments.length, wie: "Lloyd", actie: "Zie agenda", bg: C.GROEN_BG, alt: C.GROEN_ALT },
    ];

    overzichtRows.forEach((row, i) => {
      addDataRow(ws4, r++, [row.cat, row.n, row.wie, row.actie],
        { bg: row.bg, alt: row.alt, idx: i, colAligns: ["left", "center", "center", "left"] });
    });

    // Totaal rij
    addMergedRow(ws4, r, ws4Cols, spacerCell());
    r++;
    const totaalValues = ["TOTAAL ACTIEF", processed.length, "—", `Totaal verkocht B2C in pipeline`];
    totaalValues.forEach((v, c) => {
      ws4[XLSX.utils.encode_cell({ r, c })] = makeCell(v, {
        fill: C.GRIJS_BG, align: c === 0 ? "left" : "center",
        font: { bold: true },
      });
    });
    r++;

    setSheetProps(ws4, ws4Widths, r, ws4Cols);
    XLSX.utils.book_append_sheet(wb, ws4, "📊 Overzicht");

    // Generate and upload
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `dagplanning-${todayStr}.xlsx`;

    const { error: uploadError } = await supabase.storage
      .from("lisa-planningen")
      .upload(filename, buffer, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Upload failed", details: uploadError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from("lisa-planningen")
      .createSignedUrl(filename, 86400);

    if (signedError) {
      return new Response(JSON.stringify({ error: "Signed URL failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      url: signedData.signedUrl,
      filename,
      summary: {
        totaal: processed.length,
        rodeZone: rodeZone.length,
        werkplaats: werkplaats.length,
        verkopersBellen: verkopersBellen.length,
        werkInUitvoering: werkInUitvoering.length,
        afleveringenMorgen: tomorrowDeliveries.length,
        afleveringenVandaag: todayAppts.length,
        afleveringenWeek: appointments.length,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Lisa dagplanning error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
