import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import XLSX from "npm:xlsx-js-style";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

// ===== EMAIL HTML HELPERS =====
function buildLloydEmailHtml(summary: any, datumDisplay: string): string {
  return `
    <div style="font-family: Calibri, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1F3864; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 18px;">📋 Dagplanning Aftersales — ${datumDisplay}</h1>
      </div>
      <div style="background: #f8f8f8; padding: 20px; border: 1px solid #e0e0e0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">📅 Afleveringen morgen</td><td style="padding: 8px; text-align: right; font-weight: bold;">${summary.afleveringenMorgen}</td></tr>
          <tr style="background: #FFD7D7;"><td style="padding: 8px; border-bottom: 1px solid #ddd;">🔴 Rode zone (>14 dgn)</td><td style="padding: 8px; text-align: right; font-weight: bold;">${summary.rodeZone}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">🟢 Kenteken OK + checklist open</td><td style="padding: 8px; text-align: right; font-weight: bold;">${summary.werkplaats}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">🟡 Klaar maar geen afspraak</td><td style="padding: 8px; text-align: right; font-weight: bold;">${summary.verkopersBellen}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">🔵 Werk in uitvoering</td><td style="padding: 8px; text-align: right; font-weight: bold;">${summary.werkInUitvoering}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">⚠️ Checklist ontbreekt</td><td style="padding: 8px; text-align: right; font-weight: bold; color: #BF5800;">${summary.checklistOntbreekt}</td></tr>
          <tr style="background: #e8e8e8;"><td style="padding: 8px; font-weight: bold;">Totaal actief</td><td style="padding: 8px; text-align: right; font-weight: bold;">${summary.totaal}</td></tr>
        </table>
        <div style="margin-top: 16px; text-align: center; font-size: 13px; color: #666;">
          📎 Excel planning zit als bijlage bij deze email
        </div>
      </div>
      <div style="padding: 12px 20px; font-size: 11px; color: #999; text-align: center;">
        Automatisch gegenereerd door Lisa · Auto City CRM
      </div>
    </div>
  `;
}

function buildVerkoperEmailHtml(verkoperNaam: string, autos: any[], datumDisplay: string): string {
  const autoRows = autos.map(v =>
    `<tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${v.auto}</td>
      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">${v.kenteken}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>${v.klantNaam}</strong><br/><a href="tel:${v.klantTelefoon}" style="color: #1F3864;">${v.klantTelefoon}</a></td>
      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">${v.dagenWacht} dgn</td>
      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd; color: ${v.dagenWacht > 14 ? '#C00000' : '#375623'}; font-weight: bold;">${v.dagenWacht > 14 ? 'URGENT' : 'Bel klant'}</td>
    </tr>`
  ).join("");

  return `
    <div style="font-family: Calibri, Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
      <div style="background: #BF5800; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 18px;">📞 ${autos.length} auto('s) klaar voor aflevering</h1>
      </div>
      <div style="background: #f8f8f8; padding: 20px; border: 1px solid #e0e0e0;">
        <p style="font-size: 14px; margin: 0 0 16px;">Hoi ${verkoperNaam},</p>
        <p style="font-size: 14px; margin: 0 0 16px;">De volgende auto's zijn klaar (ingeschreven + checklist afgerond) maar hebben nog <strong>geen afleverafspraak</strong>. Bel de klant om een afleverdatum te plannen.</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr style="background: #BF5800; color: white;">
            <th style="padding: 8px; text-align: left;">Auto</th>
            <th style="padding: 8px; text-align: center;">Kenteken</th>
            <th style="padding: 8px; text-align: left;">Klant</th>
            <th style="padding: 8px; text-align: center;">Wachtdagen</th>
            <th style="padding: 8px; text-align: center;">Actie</th>
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

// ===== LLOYD OCHTENDMAIL HELPERS =====

interface GisterGedaanItem {
  auto: string;
  kenteken: string;
  taken: string[];
  door: string;
}

interface UrgentAflevering {
  auto: string;
  kenteken: string;
  klant: string;
  afleverDatum: string;
  afleverTijd: string;
  openItems: string[];
  openCount: number;
}

async function getGisterGedaan(supabase: any): Promise<GisterGedaanItem[]> {
  const now = new Date();
  const gisterStart = new Date(now);
  gisterStart.setUTCDate(gisterStart.getUTCDate() - 1);
  gisterStart.setUTCHours(0, 0, 0, 0);
  const gisterEnd = new Date(gisterStart);
  gisterEnd.setUTCHours(23, 59, 59, 999);

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("brand, model, license_number, details")
    .eq("status", "verkocht_b2c");

  if (!vehicles || vehicles.length === 0) return [];

  const results: GisterGedaanItem[] = [];

  for (const v of vehicles) {
    const checklist: any[] = v.details?.preDeliveryChecklist || [];
    const gisterItems = checklist.filter((item: any) => {
      if (!item.completed || !item.completedAt) return false;
      const completedAt = new Date(item.completedAt);
      return completedAt >= gisterStart && completedAt <= gisterEnd;
    });

    if (gisterItems.length > 0) {
      const auto = `${v.brand || ""} ${v.model || ""}`.trim();
      const kenteken = v.license_number || "—";
      const taken = gisterItems.map((i: any) => i.description || "Onbekend");
      const door = gisterItems[0]?.completedByName?.replace(" (via taak)", "") || "onbekend";
      results.push({ auto, kenteken, taken, door });
    }
  }

  return results;
}

async function getUrgentAfleveringen(supabase: any): Promise<UrgentAflevering[]> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const overmorgenEnd = new Date(todayStart);
  overmorgenEnd.setUTCDate(overmorgenEnd.getUTCDate() + 2);

  const { data: appointments } = await supabase
    .from("appointments")
    .select("vehicleid, customername, starttime, vehiclebrand, vehiclemodel, vehiclelicensenumber")
    .eq("type", "aflevering")
    .neq("status", "geannuleerd")
    .gte("starttime", todayStart.toISOString())
    .lt("starttime", overmorgenEnd.toISOString())
    .order("starttime");

  if (!appointments || appointments.length === 0) return [];

  const vehicleIds = appointments.map((a: any) => a.vehicleid).filter(Boolean);
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, brand, model, license_number, details")
    .in("id", vehicleIds);

  const vehicleMap: Record<string, any> = {};
  for (const v of (vehicles || [])) vehicleMap[v.id] = v;

  const results: UrgentAflevering[] = [];

  for (const a of appointments) {
    const v = a.vehicleid ? vehicleMap[a.vehicleid] : null;
    const checklist: any[] = v?.details?.preDeliveryChecklist || [];
    const openItems = checklist.filter((i: any) => !i.completed).map((i: any) => i.description || "Onbekend");

    if (openItems.length > 0) {
      const starttime = new Date(a.starttime);
      const dagNamen = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
      const dagNaam = dagNamen[starttime.getDay()].toUpperCase();
      const datum = starttime.toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
      const tijd = starttime.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

      results.push({
        auto: v ? `${v.brand || ""} ${v.model || ""}`.trim() : `${a.vehiclebrand || ""} ${a.vehiclemodel || ""}`.trim(),
        kenteken: v?.license_number || a.vehiclelicensenumber || "—",
        klant: a.customername || "Onbekend",
        afleverDatum: `${dagNaam} ${datum}`,
        afleverTijd: tijd,
        openItems,
        openCount: openItems.length,
      });
    }
  }

  return results;
}

function buildLloydOchtendEmail(gisterGedaan: GisterGedaanItem[], urgentAfleveringen: UrgentAflevering[], datumDisplay: string): string {
  const totalItems = gisterGedaan.reduce((sum, r) => sum + r.taken.length, 0);
  const totalAutos = gisterGedaan.length;

  let toonTekst: string;
  let toonKleur: string;
  if (totalItems === 0) {
    toonTekst = "Er zijn gisteren geen checklist punten afgevinkt.\nLet hierop — er staan nog auto's open die aandacht nodig hebben.";
    toonKleur = "#C00000";
  } else if (totalItems < 5) {
    toonTekst = `Gisteren zijn er ${totalItems} punten afgevinkt. Kan meer.`;
    toonKleur = "#BF5800";
  } else if (totalItems < 10) {
    toonTekst = `Gisteren zijn er ${totalItems} punten afgevinkt — goed tempo.`;
    toonKleur = "#375623";
  } else {
    toonTekst = `Gisteren zijn er ${totalItems} punten afgevinkt — uitstekend.`;
    toonKleur = "#375623";
  }

  // Blok 1: Gisteren gedaan
  let gisterHtml = "";
  if (totalItems > 0) {
    const itemRows = gisterGedaan.map(r =>
      `<li style="margin-bottom: 4px;"><strong>${r.auto}</strong> (${r.kenteken}) — ${r.taken.join(" + ")} — <em>${r.door}</em></li>`
    ).join("");
    gisterHtml = `<ul style="font-size: 13px; margin: 8px 0 0; padding-left: 18px; color: #333;">${itemRows}</ul>`;
  }

  // Blok 2: Urgente afleveringen
  let urgentHtml = "";
  if (urgentAfleveringen.length > 0) {
    const urgentRows = urgentAfleveringen.map(u => {
      const icon = u.openCount > 2 ? "⚠️" : "📌";
      const takenStr = u.openItems.join(" | ");
      return `
        <div style="margin-bottom: 12px; padding: 10px 12px; background: ${u.openCount > 2 ? '#FFF3F0' : '#FFF9F0'}; border-left: 4px solid ${u.openCount > 2 ? '#C00000' : '#BF5800'}; border-radius: 4px;">
          <div style="font-size: 14px; font-weight: bold;">${icon} ${u.auto} (${u.kenteken}) — aflevering ${u.afleverDatum} ${u.afleverTijd}</div>
          <div style="font-size: 13px; color: #555; margin-top: 4px;">Klant: ${u.klant}</div>
          <div style="font-size: 13px; color: #333; margin-top: 4px;">Nog te doen: ${takenStr}</div>
        </div>`;
    }).join("");
    urgentHtml = urgentRows;
  } else {
    urgentHtml = `<p style="font-size: 13px; color: #375623;">✅ Geen open punten bij aankomende afleveringen. Alles op schema.</p>`;
  }

  return `
    <div style="font-family: Calibri, Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px;">
      <div style="background: #1F3864; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 18px;">Goedemorgen Lloyd — Aftersales update</h1>
        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.85;">${datumDisplay}</p>
      </div>
      <div style="background: #f8f8f8; padding: 20px; border: 1px solid #e0e0e0;">
        <p style="font-size: 14px; margin: 0 0 16px;">Goedemorgen Lloyd,</p>
        <p style="font-size: 14px; margin: 0 0 16px;">Hier is de aftersales update voor ${datumDisplay}.</p>

        <div style="background: #1F3864; color: white; padding: 10px 14px; font-size: 14px; font-weight: bold; margin-top: 20px;">
          GISTEREN GEDAAN — ${totalItems} punt${totalItems !== 1 ? "en" : ""}${totalItems > 0 ? ` op ${totalAutos} auto's` : ""}
        </div>
        <div style="padding: 12px 14px; border: 1px solid #ddd; border-top: none;">
          <p style="font-size: 13px; color: ${toonKleur}; font-weight: bold; margin: 0 0 8px;">${toonTekst}</p>
          ${gisterHtml}
        </div>

        <div style="background: #1F3864; color: white; padding: 10px 14px; font-size: 14px; font-weight: bold; margin-top: 20px;">
          LET OP — OPEN PUNTEN BIJ AANKOMENDE AFLEVERINGEN
        </div>
        <div style="padding: 12px 14px; border: 1px solid #ddd; border-top: none;">
          ${urgentHtml}
        </div>
      </div>
      <div style="padding: 12px 20px; font-size: 11px; color: #999; text-align: center;">
        Lisa — Afleverplanning Auto City · aftersales@auto-city.nl
      </div>
    </div>
  `;
}
  const autoRows = autos.map(v =>
    `<tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${v.auto}</td>
      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">${v.kenteken}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>${v.klantNaam}</strong><br/><a href="tel:${v.klantTelefoon}" style="color: #1F3864;">${v.klantTelefoon}</a></td>
      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">${v.dagenWacht} dgn</td>
      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd; color: ${v.dagenWacht > 14 ? '#C00000' : '#375623'}; font-weight: bold;">${v.dagenWacht > 14 ? 'URGENT' : 'Bel klant'}</td>
    </tr>`
  ).join("");

  return `
    <div style="font-family: Calibri, Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
      <div style="background: #BF5800; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 18px;">📞 ${autos.length} auto('s) klaar voor aflevering</h1>
      </div>
      <div style="background: #f8f8f8; padding: 20px; border: 1px solid #e0e0e0;">
        <p style="font-size: 14px; margin: 0 0 16px;">Hoi ${verkoperNaam},</p>
        <p style="font-size: 14px; margin: 0 0 16px;">De volgende auto's zijn klaar (ingeschreven + checklist afgerond) maar hebben nog <strong>geen afleverafspraak</strong>. Bel de klant om een afleverdatum te plannen.</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr style="background: #BF5800; color: white;">
            <th style="padding: 8px; text-align: left;">Auto</th>
            <th style="padding: 8px; text-align: center;">Kenteken</th>
            <th style="padding: 8px; text-align: left;">Klant</th>
            <th style="padding: 8px; text-align: center;">Wachtdagen</th>
            <th style="padding: 8px; text-align: center;">Actie</th>
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode || "email";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // === IDEMPOTENCY GUARD: alleen voor automatische email, niet voor downloads ===
    if (mode !== "download") {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const { data: existingToday } = await supabase
        .from("email_queue")
        .select("id")
        .gte("created_at", todayStart.toISOString())
        .like("payload->>subject", "%Dagplanning Aftersales%")
        .limit(1);

      if (existingToday && existingToday.length > 0) {
        console.log("Dagplanning already ran today, skipping to prevent duplicates");
        return new Response(JSON.stringify({ skipped: true, reason: "Already ran today" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    // === END IDEMPOTENCY GUARD ===

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const tomorrow = new Date(now.getTime() + 86400000);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    const weekFromNow = new Date(now.getTime() + 7 * 86400000);

    // Fetch vehicles, appointments, profiles, and contacts in parallel
    const [vehiclesRes, appointmentsRes, tomorrowApptsRes, profilesRes, contactsRes] = await Promise.all([
      supabase.from("vehicles").select("id, brand, model, license_number, import_status, sold_date, sold_by_user_id, status, details, customer_id")
        .eq("status", "verkocht_b2c"),
      supabase.from("appointments").select("*").eq("type", "aflevering").neq("status", "geannuleerd")
        .gte("starttime", `${todayStr}T00:00:00`).lte("starttime", weekFromNow.toISOString()).order("starttime"),
      supabase.from("appointments").select("*").eq("type", "aflevering").neq("status", "geannuleerd")
        .gte("starttime", `${tomorrowStr}T00:00:00`).lt("starttime", `${tomorrowStr}T23:59:59`).order("starttime"),
      supabase.from("profiles").select("id, email, first_name, last_name"),
      supabase.from("contacts").select("id, first_name, last_name, phone, email"),
    ]);

    const vehicles = vehiclesRes.data || [];
    const appointments = appointmentsRes.data || [];
    const tomorrowAppts = tomorrowApptsRes.data || [];
    const profiles = profilesRes.data || [];
    const contacts = contactsRes.data || [];

    // Build profiles map from database
    const profilesMap: Record<string, { name: string; email: string }> = {};
    for (const p of profiles) {
      profilesMap[p.id] = {
        name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Onbekend",
        email: p.email || "",
      };
    }

    // Build contacts map for customer info
    const contactsMap: Record<string, { name: string; phone: string; email: string }> = {};
    for (const c of contacts) {
      contactsMap[c.id] = {
        name: `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Onbekend",
        phone: c.phone || "—",
        email: c.email || "",
      };
    }

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
      
      // FIX: checklist must exist AND be complete — empty checklist = NOT complete
      const hasChecklist = checklist.length > 0;
      const isChecklistComplete = hasChecklist && openItems.length === 0;
      
      const hasAppointment = !!details.deliveryAppointmentId;
      const profile = profilesMap[v.sold_by_user_id];
      const salesperson = profile?.name || "Onbekend";
      const customer = v.customer_id ? contactsMap[v.customer_id] : null;

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
        hasChecklist,
        isChecklistComplete,
        hasAppointment,
        verkoper: salesperson,
        verkoperEmail: profile?.email || "",
        verkoperUserId: v.sold_by_user_id,
        checklistDone: doneItems.length,
        checklistTotal: checklist.length,
        klantNaam: customer?.name || "Onbekend",
        klantTelefoon: customer?.phone || "—",
      };
    });
    processed.sort((a: any, b: any) => b.dagenWacht - a.dagenWacht);

    // Categories — FIX: checklist ontbreekt is now separate
    const checklistOntbreekt = processed.filter((v: any) => !v.hasChecklist);
    const rodeZone = processed.filter((v: any) => v.dagenWacht > 14 && !v.isChecklistComplete && v.hasChecklist);
    const werkplaats = processed.filter((v: any) => !v.isChecklistComplete && v.hasChecklist && v.isRegistered && v.dagenWacht <= 14);
    // FIX: verkopersBellen requires hasChecklist && isChecklistComplete
    const verkopersBellen = processed.filter((v: any) => v.isRegistered && v.hasChecklist && v.isChecklistComplete && !v.hasAppointment);
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

    // Section: Checklist ontbreekt (NIEUW)
    if (checklistOntbreekt.length > 0) {
      addMergedRow(ws1, r++, ws1Cols, sectionHeaderCell(`⚠️ CHECKLIST ONTBREEKT — VERKOPER ACTIE VEREIST (${checklistOntbreekt.length} auto's)`, C.ORANJE_H));
      addColHeaders(ws1, r++, ["Auto", "Kenteken", "Dagen wacht", "Verkoper", "Import status", "—", "Actie"], C.ORANJE_H);
      checklistOntbreekt.forEach((v: any, i: number) => {
        addDataRow(ws1, r++, [v.auto, v.kenteken, v.dagenWacht, v.verkoper, v.importLabel, "—", "Verkoper: checklist invullen!"],
          { bg: C.ORANJE_BG, alt: C.ORANJE_ALT, idx: i, colAligns: ws1ColAligns, dagenIdx: 2 });
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
    addMergedRow(ws2, r++, ws2Cols, subtitleCell("Klaar + ingeschreven + checklist af, maar nog geen afleverafspraak"));
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
      { cat: "⚠️ Checklist ontbreekt", n: checklistOntbreekt.length, wie: "Verkopers", actie: "Checklist invullen in CRM", bg: C.ORANJE_BG, alt: C.ORANJE_ALT },
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
      .createSignedUrl(filename, 604800);

    if (signedError) {
      return new Response(JSON.stringify({ error: "Signed URL failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const downloadUrl = signedData.signedUrl;
    const summary = {
      totaal: processed.length,
      rodeZone: rodeZone.length,
      werkplaats: werkplaats.length,
      verkopersBellen: verkopersBellen.length,
      werkInUitvoering: werkInUitvoering.length,
      checklistOntbreekt: checklistOntbreekt.length,
      afleveringenMorgen: tomorrowDeliveries.length,
      afleveringenVandaag: todayAppts.length,
      afleveringenWeek: appointments.length,
    };

    // === Download mode: alleen URL teruggeven, geen emails ===
    if (mode === "download") {
      return new Response(JSON.stringify({
        success: true,
        url: downloadUrl,
        filename,
        summary,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== EMAIL 1: Lloyd dagplanning (Excel als bijlage) =====
    try {
      await supabase.from("email_queue").insert({
        payload: {
          senderEmail: "aftersales@auto-city.nl",
          to: ["lloyd@auto-city.nl"],
          subject: `Dagplanning Aftersales — ${datumDisplay}`,
          htmlBody: buildLloydEmailHtml(summary, datumDisplay),
          attachments: [{
            filename: `Dagplanning_${todayStr}.xlsx`,
            url: downloadUrl,
          }],
        },
        status: "pending",
      });
      console.log("✅ Lloyd dagplanning email queued (met Excel bijlage)");
    } catch (emailErr) {
      console.error("❌ Failed to queue Lloyd email:", emailErr);
    }

    // ===== EMAIL 2: Verkoper notificaties — klaar voor aflevering =====
    const verkoperGroups: Record<string, { name: string; email: string; autos: any[] }> = {};
    for (const v of verkopersBellen) {
      if (!v.verkoperEmail) continue;
      if (!verkoperGroups[v.verkoperUserId]) {
        verkoperGroups[v.verkoperUserId] = { name: v.verkoper, email: v.verkoperEmail, autos: [] };
      }
      verkoperGroups[v.verkoperUserId].autos.push(v);
    }

    for (const [, group] of Object.entries(verkoperGroups)) {
      try {
        await supabase.from("email_queue").insert({
          payload: {
            senderEmail: "aftersales@auto-city.nl",
            to: [group.email],
            subject: `Aftersales: ${group.autos.length} auto('s) klaar voor aflevering — actie vereist`,
            htmlBody: buildVerkoperEmailHtml(group.name, group.autos, datumDisplay),
          },
          status: "pending",
        });
        console.log(`✅ Verkoper email queued for ${group.name} (${group.email})`);
      } catch (emailErr) {
        console.error(`❌ Failed to queue verkoper email for ${group.name}:`, emailErr);
      }
    }

    // ===== EMAIL 3: Lloyd ochtendmail — persoonlijke briefing =====
    try {
      const dagNamen = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
      const dagNaam = dagNamen[now.getDay()];
      const datumKort = now.toLocaleDateString("nl-NL", { day: "numeric", month: "long" });

      const [gisterGedaan, urgentAfleveringen] = await Promise.all([
        getGisterGedaan(supabase),
        getUrgentAfleveringen(supabase),
      ]);

      const lloydOchtendHtml = buildLloydOchtendEmail(gisterGedaan, urgentAfleveringen, datumDisplay);

      await supabase.from("email_queue").insert({
        payload: {
          senderEmail: "aftersales@auto-city.nl",
          to: ["lloyd@auto-city.nl"],
          subject: `Goedemorgen Lloyd — Aftersales update ${dagNaam} ${datumKort}`,
          htmlBody: lloydOchtendHtml,
        },
        status: "pending",
      });
      console.log("✅ Lloyd ochtendmail queued");
    } catch (emailErr) {
      console.error("❌ Failed to queue Lloyd ochtendmail:", emailErr);
    }

    return new Response(JSON.stringify({
      success: true,
      url: downloadUrl,
      filename,
      summary,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Lisa dagplanning error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
