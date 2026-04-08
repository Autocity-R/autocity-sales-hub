import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import XLSX from "npm:xlsx-js-style";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const C = {
  DARK_NAVY: "2E4D7B", MID_BLUE: "2F5496",
  ROOD_H: "C00000", GROEN_H: "375623", GROEN_MID: "4E7B35",
  ORANJE_H: "BF5800",
  ROOD_BG: "FFD7D7", ROOD_ALT: "FFB3B3",
  GROEN_BG: "E2EFDA", GROEN_ALT: "F0F7EC",
  ORANJE_BG: "FCE4D6", ORANJE_ALT: "FFF0E6",
  BLAUW_BG: "DEEAF1", BLAUW_ALT: "EAF1F5",
  SCHEIDING: "B8CCE4",
  MARGE_GROEN: "D7F0D7", MARGE_ORANJE: "FCE4D6",
  WIT: "FFFFFF", GRIJS_LT: "F8F8F8", GRIJS_H: "EEF2F8",
};

const BORDER = { style: "thin", color: { rgb: "BFBFBF" } };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const FONT_BASE = { name: "Calibri", sz: 9, color: { rgb: "000000" } };

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

function linkCell(text: string, url: string, opts: any = {}): any {
  return {
    v: text, t: "s",
    l: { Target: url, Tooltip: text },
    s: {
      font: { ...FONT_BASE, color: { rgb: "0563C1" }, underline: true, ...(opts.font || {}) },
      border: BORDERS,
      alignment: { vertical: "center", horizontal: opts.align || "left" },
      fill: opts.fill ? { fgColor: { rgb: opts.fill }, patternType: "solid" } : undefined,
    },
  };
}

function headerCell(text: string, fill = C.DARK_NAVY): any {
  return {
    v: text, t: "s",
    s: {
      font: { name: "Calibri", sz: 9, bold: true, color: { rgb: C.WIT } },
      fill: { fgColor: { rgb: fill }, patternType: "solid" },
      alignment: { vertical: "center", horizontal: "center", wrapText: true },
      border: BORDERS,
    },
  };
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

function emptyTitleFill(): any {
  return { v: "", t: "s", s: { fill: { fgColor: { rgb: C.DARK_NAVY }, patternType: "solid" } } };
}

// === INTERFACES ===

interface ParsedVehicle {
  id: string;
  brand: string;
  model: string;
  vin: string | null;
  uitvoering: string | null;
  brandstof: string | null;
  transmissie: string | null;
  bouwjaar: number | null;
  kilometerstand: number;
  inkoopprijs: number;
}

interface B2BKans {
  // Onze auto
  onze_merk: string;
  onze_model: string;
  onze_vin: string;
  onze_bouwjaar: number | null;
  onze_km: number;
  onze_inkoop: number;
  // Dealer auto
  dealer_naam: string;
  dealer_merk: string;
  dealer_model: string;
  dealer_bouwjaar: number | null;
  dealer_km: number;
  dealer_prijs: number;
  dealer_stagedagen: number;
  verkocht_dgn_geleden: number;
  jp_cars_url: string | null;
  // Berekend
  b2b_aanbod: number;
  onze_marge: number;
  score: "STERK" | "MOGELIJK";
}

// === CLAUDE PARSING ===

function parseClaudeResponse(text: string): any[] {
  try {
    let cleanText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const firstBracket = Math.min(
      cleanText.indexOf('[') !== -1 ? cleanText.indexOf('[') : Infinity,
      cleanText.indexOf('{') !== -1 ? cleanText.indexOf('{') : Infinity
    );
    const lastBracket = Math.max(cleanText.lastIndexOf(']'), cleanText.lastIndexOf('}'));
    if (firstBracket !== Infinity && lastBracket !== -1 && lastBracket > firstBracket) {
      cleanText = cleanText.substring(firstBracket, lastBracket + 1);
    }
    const parsed = JSON.parse(cleanText);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    console.error("❌ Failed to parse Claude JSON:", error);
    return [];
  }
}

async function claudeBatchParse(
  vehicles: { id: string; brand: string; model: string; bouwjaar?: number; kilometerstand?: number; omschrijving?: string }[],
  apiKey: string
): Promise<Record<string, { uitvoering: string | null; brandstof: string | null; transmissie: string | null; bouwjaar: number | null }>> {
  const descriptions = vehicles.map((v, i) =>
    `[${i}] ${v.brand} ${v.model} ${v.bouwjaar || ""} km:${v.kilometerstand || ""} ${v.omschrijving || ""}`
  ).join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      temperature: 0.1,
      messages: [{
        role: "user",
        content: `Je bent een expert auto-data-extractor. Parse deze auto-omschrijvingen naar gestructureerde data.

Haal uit elke omschrijving:
- uitvoering (bijv. T5, M Sport, R-Line, S Line, Sportback, etc.)
- brandstof (Benzine, Diesel, Hybride, Elektrisch - leid af uit PHEV, T5, e-tron, DM-i, etc.)
- transmissie (Automaat of Handgeschakeld - leid af uit Aut, DSG, S-Tronic, etc.)
- bouwjaar (4 cijfers indien aanwezig)

Regels:
- "PHEV", "DM-i", "T5" (Volvo) → brandstof = "Hybride"
- "Aut", "DSG", "S-Tronic", "Tiptronic" → transmissie = "Automaat"
- "EV", "e-tron", "iX", "ID." → brandstof = "Elektrisch"
- "TDI", "CDI", "d", "SDrive" → brandstof = "Diesel"
- "TFSI", "TSI", "T" (zonder hybride indicator) → brandstof = "Benzine"
- Als niet af te leiden → null

Input:
${descriptions}

Geef UITSLUITEND een geldige JSON array terug. Formaat:
[{"id":0,"uitvoering":"T5","brandstof":"Hybride","transmissie":"Automaat","bouwjaar":2021}]

BELANGRIJK: Geef UITSLUITEND de ruwe JSON array terug. Geen inleiding, geen conclusie, geen markdown code blocks. Begin direct met [ en eindig met ].`
      }],
    }),
  });

  if (!response.ok) {
    console.error("Claude API error:", response.status, await response.text());
    return {};
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "[]";
  const parsed = parseClaudeResponse(text);
  console.log(`🤖 Claude: ${parsed.length} voertuigen geëxtraheerd`);

  const result: Record<string, any> = {};
  for (const item of parsed) {
    if (item.id >= 0 && item.id < vehicles.length) {
      result[vehicles[item.id].id] = {
        uitvoering: item.uitvoering,
        brandstof: item.brandstof,
        transmissie: item.transmissie,
        bouwjaar: item.bouwjaar,
      };
    }
  }
  return result;
}

// === FUEL / GEAR / MAKE MAPPING ===

function mapFuel(brandstof: string | null | undefined): string | undefined {
  if (!brandstof) return undefined;
  const map: Record<string, string> = {
    "Benzine": "Petrol", "Diesel": "Diesel", "Hybride": "Hybrid",
    "Elektrisch": "Electric", "PHEV": "Hybrid", "Plug-in Hybride": "Hybrid",
  };
  return map[brandstof] || undefined;
}

function mapGear(transmissie: string | null | undefined): string | undefined {
  if (!transmissie) return undefined;
  const map: Record<string, string> = {
    "Automaat": "Automatic", "Handgeschakeld": "Manual",
    "Manual": "Manual", "Automatic": "Automatic",
  };
  return map[transmissie] || undefined;
}

function mapMake(brand: string): string {
  const normalized = brand.trim().toUpperCase();
  const makeMap: Record<string, string> = {
    "LAND ROVER": "LANDROVER", "ALFA ROMEO": "ALFAROMEO",
    "MERCEDES-BENZ": "MERCEDES", "MERCEDES BENZ": "MERCEDES",
    "ROLLS ROYCE": "ROLLSROYCE", "ASTON MARTIN": "ASTONMARTIN",
  };
  return makeMap[normalized] || normalized;
}

// === JP CARS QUERY ===

async function queryJPCarsValuation(
  parsed: { brand: string; model: string; brandstof?: string | null; transmissie?: string | null; bouwjaar?: number | null; kilometerstand?: number },
  apiToken: string
): Promise<any[]> {
  const body: Record<string, any> = {
    make: mapMake(parsed.brand),
    model: parsed.model.trim().toUpperCase(),
    mileage: parsed.kilometerstand || 0,
  };
  if (parsed.bouwjaar) body.build = parsed.bouwjaar;
  const fuel = mapFuel(parsed.brandstof);
  if (fuel) body.fuel = fuel;
  const gear = mapGear(parsed.transmissie);
  if (gear) body.gear = gear;

  // enable_portal_urls=true zodat we JP Cars links krijgen
  const url = `https://api.nl.jp.cars/api/valuate/extended?enable_portal_urls=true&enable_top_dealers=true`;

  try {
    console.log(`🔎 JP Cars: ${JSON.stringify(body)}`);
    const resp = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const respText = await resp.text();
    let data: any;
    try { data = JSON.parse(respText); } catch {
      console.error(`❌ JP Cars unparseable: ${respText.substring(0, 200)}`);
      return [];
    }

    const window = data.window || [];
    if (data.error) {
      console.warn(`⚠️ JP Cars: ${parsed.brand} ${parsed.model}: ${data.error_message || data.error} — ${window.length} listings`);
    }
    if (window.length > 0) {
      console.log(`🚗 ${parsed.brand} ${parsed.model} → ${window.length} listings`);
    }
    return window;
  } catch (e) {
    console.error(`❌ JP Cars error ${parsed.brand} ${parsed.model}:`, e);
    return [];
  }
}

// === B2B KANSEN BEREKENING ===

function calculateB2BKansen(vehicle: ParsedVehicle, listings: any[]): B2BKans[] {
  const kansen: B2BKans[] = [];

  for (const listing of listings) {
    const soldSince = listing.sold_since;
    const daysInStock = listing.days_in_stock ?? listing.stock_days ?? 0;
    const dealerPrice = listing.price_local ?? listing.price ?? 0;
    const dealerName = listing.dealer_name || listing.location_name || "Onbekend";
    const jpCarsUrl = listing.portal_url || listing.jpcars_url || listing.url || null;

    if (soldSince === null || soldSince === undefined) continue;
    if (soldSince > 40) continue;
    if (daysInStock > 50) continue;
    if (dealerPrice <= 0) continue;

    const b2bAanbod = dealerPrice - 3000;
    const onzeMarge = b2bAanbod - vehicle.inkoopprijs;
    if (onzeMarge < 3000) continue;

    kansen.push({
      onze_merk: vehicle.brand,
      onze_model: vehicle.model,
      onze_vin: vehicle.vin?.substring(0, 17) ?? "—",
      onze_bouwjaar: vehicle.bouwjaar,
      onze_km: vehicle.kilometerstand,
      onze_inkoop: vehicle.inkoopprijs,
      dealer_naam: dealerName,
      dealer_merk: listing.make || vehicle.brand,
      dealer_model: listing.model || vehicle.model,
      dealer_bouwjaar: listing.build || null,
      dealer_km: listing.mileage || 0,
      dealer_prijs: dealerPrice,
      dealer_stagedagen: daysInStock,
      verkocht_dgn_geleden: soldSince,
      jp_cars_url: jpCarsUrl,
      b2b_aanbod: b2bAanbod,
      onze_marge: onzeMarge,
      score: onzeMarge >= 4000 ? "STERK" : "MOGELIJK",
    });
  }
  return kansen;
}

// === TEAM PERFORMANCE QUERY ===

async function queryTeamPerformance(supabase: any): Promise<any[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: soldVehicles, error } = await supabase
    .from("vehicles")
    .select("id, brand, model, status, selling_price, purchase_price, details, sold_date")
    .in("status", ["verkocht_b2b", "verkocht_b2c", "afgeleverd"])
    .gte("sold_date", monthStart);

  if (error) { console.error("Team query error:", error); return []; }

  const teamMappings: Record<string, string[]> = {
    Daan: ["daan", "daan leyte", "daan@auto-city.nl"],
    Martijn: ["martijn", "martijn zuyderhoudt", "martijn@auto-city.nl"],
    Alex: ["alex", "alexander", "alexander kool", "alex@auto-city.nl"],
    Hendrik: ["hendrik", "hendrik@auto-city.nl"],
    Mario: ["mario", "mario kroon", "mario@auto-city.nl"],
  };

  const stats: Record<string, { b2c: number; b2b: number; total: number; revenue: number; margin: number }> = {};
  Object.keys(teamMappings).forEach(n => { stats[n] = { b2c: 0, b2b: 0, total: 0, revenue: 0, margin: 0 }; });

  for (const v of soldVehicles || []) {
    const details = (v.details || {}) as any;
    const sp = (details.salespersonName || details.salesperson || details.verkoper || "").toLowerCase().trim();
    if (!sp) continue;

    let matched: string | null = null;
    for (const [name, variations] of Object.entries(teamMappings)) {
      if (variations.some(var_ => sp.includes(var_) || var_.includes(sp))) { matched = name; break; }
    }
    if (!matched) continue;

    const s = stats[matched];
    const isB2B = v.status === "verkocht_b2b" || (v.status === "afgeleverd" && details.salesType === "b2b");
    if (isB2B) s.b2b++; else s.b2c++;
    s.total++;
    const selling = Number(v.selling_price) || 0;
    const purchase = Number(v.purchase_price) || Number(details.purchasePrice) || 0;
    s.revenue += selling;
    s.margin += selling - purchase;
  }

  return Object.entries(stats)
    .filter(([, s]) => s.total > 0)
    .map(([name, s]) => ({
      name, ...s,
      margePerc: s.revenue > 0 ? Math.round((s.margin / s.revenue) * 100) : 0,
      norm: 10,
      opNorm: s.b2c >= 10,
    }))
    .sort((a, b) => b.total - a.total);
}

// === NIET ONLINE QUERY ===

async function queryNietOnline(supabase: any): Promise<any[]> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("id, brand, model, license_number, purchase_price, details, created_at")
    .eq("status", "voorraad")
    .gt("purchase_price", 0);

  if (error) { console.error("Niet-online query error:", error); return []; }

  const now = Date.now();
  const DAY = 86400000;

  return (data || [])
    .filter((v: any) => {
      const d = v.details || {};
      return d.showroomOnline !== true && d.isTradeIn !== true && d.transportStatus !== "onderweg";
    })
    .map((v: any) => ({
      naam: `${v.brand || ""} ${v.model || ""}`.trim(),
      kenteken: v.license_number || "—",
      inkoopprijs: Number(v.purchase_price) || Number(v.details?.purchasePrice) || 0,
      dagenInBezit: Math.floor((now - new Date(v.created_at).getTime()) / DAY),
      status: v.details?.transportStatus === "aangekomen" ? "Aangekomen" : "Voorraad",
    }))
    .sort((a: any, b: any) => b.dagenInBezit - a.dagenInBezit);
}

// === EXCEL OUTPUT (3 TABS) ===

function buildExcel(
  sterkeKansen: B2BKans[],
  mogelijkeKansen: B2BKans[],
  teamData: any[],
  nietOnline: any[],
  datum: string
): Uint8Array {
  const wb = XLSX.utils.book_new();

  // ===== TAB 1: B2B KANSEN =====
  const B2B_COLS = ["Onze Auto", "Onze Inkoop", "B2B Aanbod", "Dealer Naam", "Dealer Verkoopprijs", "Stagedagen", "Verk. dgn geleden", "Onze Marge", "Dealer Marge", "JP Cars"];
  const B2B_WIDTHS = [24, 12, 12, 24, 14, 12, 14, 12, 14, 14];

  function addKansenSheet(name: string, kansen: B2BKans[], fillBg: string, fillAlt: string, hdrFill: string) {
    const rows: any[][] = [];
    rows.push([titleCell(`${name} — ${datum}`), ...Array(B2B_COLS.length - 1).fill(emptyTitleFill())]);
    rows.push(B2B_COLS.map(c => headerCell(c, hdrFill)));

    kansen.forEach((k, i) => {
      const bg = i % 2 === 0 ? fillBg : fillAlt;
      const row = [
        makeCell(k.auto, { fill: bg }),
        makeCell(k.inkoopprijs, { fill: bg, align: "right" }),
        makeCell(k.b2bAanbodprijs, { fill: bg, align: "right", font: { bold: true } }),
        makeCell(k.dealerNaam, { fill: bg }),
        makeCell(k.dealerVerkoopprijs, { fill: bg, align: "right" }),
        makeCell(k.dealerStagedagen, { fill: bg, align: "center" }),
        makeCell(k.verkochtDagenGeleden, { fill: bg, align: "center" }),
        makeCell(k.onzeMarge, { fill: bg, align: "right", font: { bold: true, color: { rgb: C.GROEN_H } } }),
        makeCell(k.dealerMargeruimte, { fill: bg, align: "right" }),
        k.jpCarsUrl
          ? linkCell("Bekijk →", k.jpCarsUrl, { fill: bg })
          : makeCell("—", { fill: bg, align: "center" }),
      ];
      rows.push(row);
    });

    if (kansen.length === 0) {
      rows.push([makeCell("Geen kansen gevonden", { fill: C.GRIJS_LT }), ...Array(B2B_COLS.length - 1).fill(makeCell("", { fill: C.GRIJS_LT }))]);
    }

    // Totaalregel
    if (kansen.length > 0) {
      const totalMarge = kansen.reduce((s, k) => s + k.onzeMarge, 0);
      rows.push([
        makeCell(`Totaal: ${kansen.length} kansen`, { font: { bold: true }, fill: C.GRIJS_H }),
        makeCell("", { fill: C.GRIJS_H }), makeCell("", { fill: C.GRIJS_H }),
        makeCell("", { fill: C.GRIJS_H }), makeCell("", { fill: C.GRIJS_H }),
        makeCell("", { fill: C.GRIJS_H }), makeCell("", { fill: C.GRIJS_H }),
        makeCell(totalMarge, { fill: C.GRIJS_H, align: "right", font: { bold: true, color: { rgb: C.GROEN_H } } }),
        makeCell("", { fill: C.GRIJS_H }), makeCell("", { fill: C.GRIJS_H }),
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = B2B_WIDTHS.map(w => ({ wch: w }));
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: B2B_COLS.length - 1 } }];
    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  addKansenSheet("🟢 Sterke kansen", sterkeKansen, C.GROEN_BG, C.GROEN_ALT, C.GROEN_H);
  addKansenSheet("🟡 Mogelijke kansen", mogelijkeKansen, C.ORANJE_BG, C.ORANJE_ALT, C.ORANJE_H);

  // ===== TAB 2: TEAM PERFORMANCE =====
  {
    const TEAM_COLS = ["Verkoper", "B2C", "B2B", "Totaal", "Omzet", "Marge", "Marge %", "Norm B2C", "Status"];
    const TEAM_WIDTHS = [16, 8, 8, 8, 16, 16, 10, 10, 14];
    const rows: any[][] = [];
    rows.push([titleCell(`Team Performance — ${datum}`), ...Array(TEAM_COLS.length - 1).fill(emptyTitleFill())]);
    rows.push(TEAM_COLS.map(c => headerCell(c, C.MID_BLUE)));

    teamData.forEach((t, i) => {
      const bg = i % 2 === 0 ? C.BLAUW_BG : C.BLAUW_ALT;
      rows.push([
        makeCell(t.name, { fill: bg, font: { bold: true } }),
        makeCell(t.b2c, { fill: bg, align: "center" }),
        makeCell(t.b2b, { fill: bg, align: "center" }),
        makeCell(t.total, { fill: bg, align: "center", font: { bold: true } }),
        makeCell(t.revenue, { fill: bg, align: "right" }),
        makeCell(t.margin, { fill: bg, align: "right" }),
        makeCell(`${t.margePerc}%`, { fill: bg, align: "center" }),
        makeCell(t.norm, { fill: bg, align: "center" }),
        makeCell(t.opNorm ? "✅ Op norm" : "⚠️ Onder norm", {
          fill: bg, align: "center",
          font: { bold: true, color: { rgb: t.opNorm ? C.GROEN_H : C.ROOD_H } },
        }),
      ]);
    });

    if (teamData.length === 0) {
      rows.push([makeCell("Geen verkoopdata deze maand", { fill: C.GRIJS_LT }), ...Array(TEAM_COLS.length - 1).fill(makeCell("", { fill: C.GRIJS_LT }))]);
    }

    // Totaal
    if (teamData.length > 0) {
      const totB2C = teamData.reduce((s, t) => s + t.b2c, 0);
      const totB2B = teamData.reduce((s, t) => s + t.b2b, 0);
      const totTotal = teamData.reduce((s, t) => s + t.total, 0);
      const totRev = teamData.reduce((s, t) => s + t.revenue, 0);
      const totMargin = teamData.reduce((s, t) => s + t.margin, 0);
      const totPerc = totRev > 0 ? Math.round((totMargin / totRev) * 100) : 0;
      rows.push([
        makeCell("TOTAAL", { fill: C.GRIJS_H, font: { bold: true } }),
        makeCell(totB2C, { fill: C.GRIJS_H, align: "center", font: { bold: true } }),
        makeCell(totB2B, { fill: C.GRIJS_H, align: "center", font: { bold: true } }),
        makeCell(totTotal, { fill: C.GRIJS_H, align: "center", font: { bold: true } }),
        makeCell(totRev, { fill: C.GRIJS_H, align: "right", font: { bold: true } }),
        makeCell(totMargin, { fill: C.GRIJS_H, align: "right", font: { bold: true } }),
        makeCell(`${totPerc}%`, { fill: C.GRIJS_H, align: "center", font: { bold: true } }),
        makeCell("", { fill: C.GRIJS_H }), makeCell("", { fill: C.GRIJS_H }),
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = TEAM_WIDTHS.map(w => ({ wch: w }));
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: TEAM_COLS.length - 1 } }];
    XLSX.utils.book_append_sheet(wb, ws, "📊 Team Performance");
  }

  // ===== TAB 3: NIET ONLINE =====
  {
    const NO_COLS = ["Auto", "Kenteken", "Inkoopprijs", "Dagen in bezit", "Status", "Advies"];
    const NO_WIDTHS = [24, 14, 14, 14, 14, 28];
    const rows: any[][] = [];
    rows.push([titleCell(`Niet Online — ${datum}`), ...Array(NO_COLS.length - 1).fill(emptyTitleFill())]);
    rows.push(NO_COLS.map(c => headerCell(c, C.ROOD_H)));

    nietOnline.forEach((v, i) => {
      const bg = i % 2 === 0 ? C.ROOD_BG : C.ROOD_ALT;
      const advies = v.dagenInBezit > 60
        ? "⚠️ Direct online zetten!"
        : v.dagenInBezit > 30
        ? "Snel online zetten"
        : "Binnenkort online";
      rows.push([
        makeCell(v.naam, { fill: bg }),
        makeCell(v.kenteken, { fill: bg, align: "center" }),
        makeCell(v.inkoopprijs, { fill: bg, align: "right" }),
        makeCell(v.dagenInBezit, {
          fill: bg, align: "center",
          font: { bold: v.dagenInBezit > 60, color: { rgb: v.dagenInBezit > 60 ? C.ROOD_H : "000000" } },
        }),
        makeCell(v.status, { fill: bg, align: "center" }),
        makeCell(advies, { fill: bg }),
      ]);
    });

    if (nietOnline.length === 0) {
      rows.push([makeCell("Alle auto's staan online 🎉", { fill: C.GRIJS_LT }), ...Array(NO_COLS.length - 1).fill(makeCell("", { fill: C.GRIJS_LT }))]);
    }

    // Totaal
    rows.push([
      makeCell(`Totaal: ${nietOnline.length} auto's`, { fill: C.GRIJS_H, font: { bold: true } }),
      ...Array(NO_COLS.length - 1).fill(makeCell("", { fill: C.GRIJS_H })),
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = NO_WIDTHS.map(w => ({ wch: w }));
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: NO_COLS.length - 1 } }];
    XLSX.utils.book_append_sheet(wb, ws, "🔴 Niet Online");
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new Uint8Array(buf);
}

// === MAIN HANDLER ===

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;
    const jpCarsToken = Deno.env.get("JPCARS_API_TOKEN")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let body: any = {};
    try { body = await req.json(); } catch { }
    const isDownloadMode = body?.mode === "download";

    if (!isDownloadMode) {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const { data: existing } = await supabase
        .from("email_queue")
        .select("id")
        .gte("created_at", todayStart.toISOString())
        .like("payload->>subject", "%B2B Kansen%")
        .limit(1);

      if (existing && existing.length > 0) {
        return new Response(JSON.stringify({ skipped: true, reason: "Already ran today" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // STAP 1: Haal transportlijst op
    const { data: vehicles, error: vErr } = await supabase
      .from("vehicles")
      .select("id, brand, model, year, mileage, license_number, purchase_price, notes, details, created_at")
      .eq("status", "voorraad")
      .gt("purchase_price", 0);

    if (vErr) throw new Error(`Vehicle query failed: ${vErr.message}`);

    const transportVehicles = (vehicles || []).filter((v: any) => {
      const d = v.details || {};
      if (d.transportStatus !== "onderweg") return false;
      if (d.isTradeIn === true) return false;
      return true;
    });

    console.log(`📊 START: ${transportVehicles.length} transport auto's`);

    // Parallel: team + niet-online data ophalen
    const [teamData, nietOnline] = await Promise.all([
      queryTeamPerformance(supabase),
      queryNietOnline(supabase),
    ]);

    if (transportVehicles.length === 0) {
      if (isDownloadMode) {
        // Nog steeds Excel genereren met team + niet-online tabs
        const datum = new Date().toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
        const excelBuffer = buildExcel([], [], teamData, nietOnline, datum);
        const filename = `daan-b2b-${new Date().toISOString().split("T")[0]}.xlsx`;
        await supabase.storage.from("daan-analyses").upload(filename, excelBuffer, {
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          upsert: true,
        });
        const { data: signedUrl } = await supabase.storage.from("daan-analyses").createSignedUrl(filename, 60 * 60 * 24 * 7);

        return new Response(JSON.stringify({
          sterkeKansen: [], mogelijkeKansen: [],
          totaalTransport: 0,
          excelUrl: signedUrl?.signedUrl || null,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ sterkeKansen: [], mogelijkeKansen: [], totaalTransport: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // STAP 2: Claude specificeert elke auto
    const vehicleInputs = transportVehicles.map((v: any) => ({
      id: v.id,
      brand: v.brand || "",
      model: v.model || "",
      bouwjaar: v.year || v.details?.buildYear || v.details?.year || null,
      kilometerstand: v.mileage || 0,
      omschrijving: v.notes || "",
    }));

    const claudeResults = await claudeBatchParse(vehicleInputs, anthropicKey);

    const parsedVehicles: ParsedVehicle[] = transportVehicles.map((v: any) => {
      const claude = claudeResults[v.id] || {};
      return {
        id: v.id,
        brand: v.brand || "",
        model: v.model || "",
        uitvoering: claude.uitvoering || null,
        brandstof: claude.brandstof || null,
        transmissie: claude.transmissie || null,
        bouwjaar: claude.bouwjaar || v.year || v.details?.buildYear || v.details?.year || null,
        kilometerstand: v.mileage || 0,
        inkoopprijs: Number(v.purchase_price) || Number(v.details?.purchasePrice) || 0,
      };
    });

    // STAP 3: JP Cars taxatie per auto
    const jpCarsCache = new Map<string, any[]>();

    for (const pv of parsedVehicles) {
      const mileageBucket = Math.round(pv.kilometerstand / 20000) * 20000;
      const cacheKey = `${pv.brand}|${pv.model}|${pv.brandstof || ""}|${pv.transmissie || ""}|${pv.bouwjaar || ""}|${mileageBucket}`;

      if (!jpCarsCache.has(cacheKey)) {
        const listings = await queryJPCarsValuation({
          brand: pv.brand, model: pv.model, brandstof: pv.brandstof,
          transmissie: pv.transmissie, bouwjaar: pv.bouwjaar, kilometerstand: pv.kilometerstand,
        }, jpCarsToken);
        jpCarsCache.set(cacheKey, listings);
        await new Promise(r => setTimeout(r, 200));
      }
    }

    // STAP 4: B2B kansen berekenen
    const kansenPerAuto = new Map<string, B2BKans[]>();
    for (const pv of parsedVehicles) {
      const mileageBucket = Math.round(pv.kilometerstand / 20000) * 20000;
      const cacheKey = `${pv.brand}|${pv.model}|${pv.brandstof || ""}|${pv.transmissie || ""}|${pv.bouwjaar || ""}|${mileageBucket}`;
      const listings = jpCarsCache.get(cacheKey) || [];
      const kansen = calculateB2BKansen(pv, listings);
      if (kansen.length > 0) {
        kansen.sort((a, b) => b.onzeMarge - a.onzeMarge);
        kansenPerAuto.set(pv.id, kansen.slice(0, 3));
      }
    }

    const allKansen = Array.from(kansenPerAuto.values()).flat();
    const sterkeKansen = allKansen.filter(k => k.score === "STERK").sort((a, b) => b.onzeMarge - a.onzeMarge);
    const mogelijkeKansen = allKansen.filter(k => k.score === "MOGELIJK").sort((a, b) => b.onzeMarge - a.onzeMarge);

    console.log(`✅ Analyse: ${sterkeKansen.length} Sterk, ${mogelijkeKansen.length} Mogelijk`);

    // Excel genereren (altijd met 3 tabs)
    const datum = new Date().toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
    const excelBuffer = buildExcel(sterkeKansen, mogelijkeKansen, teamData, nietOnline, datum);

    const filename = `daan-b2b-${new Date().toISOString().split("T")[0]}.xlsx`;
    await supabase.storage.from("daan-analyses").upload(filename, excelBuffer, {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      upsert: true,
    });
    const { data: signedUrl } = await supabase.storage.from("daan-analyses").createSignedUrl(filename, 60 * 60 * 24 * 7);

    if (isDownloadMode) {
      return new Response(JSON.stringify({
        sterkeKansen, mogelijkeKansen,
        totaalTransport: transportVehicles.length,
        excelUrl: signedUrl?.signedUrl || null,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Email mode: verstuur rapport
    const totalKansen = sterkeKansen.length + mogelijkeKansen.length;
    const totalMarge = allKansen.reduce((s, k) => s + k.onzeMarge, 0);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #1F3864;">🚗 B2B Kansen Rapport — ${datum}</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 12px; background: #E2EFDA; border-radius: 8px; text-align: center;">
              <strong style="font-size: 24px; color: #375623;">${sterkeKansen.length}</strong><br>
              <span style="font-size: 12px;">Sterke kansen</span>
            </td>
            <td style="padding: 12px; background: #FCE4D6; border-radius: 8px; text-align: center;">
              <strong style="font-size: 24px; color: #BF5800;">${mogelijkeKansen.length}</strong><br>
              <span style="font-size: 12px;">Mogelijke kansen</span>
            </td>
            <td style="padding: 12px; background: #DEEAF1; border-radius: 8px; text-align: center;">
              <strong style="font-size: 24px; color: #1F3864;">€${totalMarge.toLocaleString("nl-NL")}</strong><br>
              <span style="font-size: 12px;">Potentiële marge</span>
            </td>
          </tr>
        </table>
        <p><strong>📊 Team:</strong> ${teamData.map(t => `${t.name}: ${t.total} (B2C:${t.b2c}/B2B:${t.b2b})`).join(" | ")}</p>
        <p><strong>🔴 Niet online:</strong> ${nietOnline.length} auto's</p>
        ${sterkeKansen.length > 0 ? `
        <h3 style="color: #375623;">🟢 Top Sterke Kansen</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr style="background: #375623; color: white;">
            <th style="padding: 6px; text-align: left;">Auto</th>
            <th style="padding: 6px; text-align: right;">Marge</th>
            <th style="padding: 6px; text-align: left;">Dealer</th>
          </tr>
          ${sterkeKansen.slice(0, 10).map((k, i) => `
          <tr style="background: ${i % 2 === 0 ? "#E2EFDA" : "#F0F7EC"};">
            <td style="padding: 6px;">${k.auto}</td>
            <td style="padding: 6px; text-align: right; font-weight: bold;">€${k.onzeMarge.toLocaleString("nl-NL")}</td>
            <td style="padding: 6px;">${k.dealerNaam}</td>
          </tr>`).join("")}
        </table>` : ""}
        ${signedUrl?.signedUrl ? `
        <p style="margin-top: 20px;">
          <a href="${signedUrl.signedUrl}" style="background: #1F3864; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            📥 Download Excel Rapport (3 tabs)
          </a>
        </p>` : ""}
        <p style="color: #999; font-size: 11px; margin-top: 24px;">
          ${transportVehicles.length} transport auto's | ${teamData.length} verkopers | ${nietOnline.length} niet online | ${datum}
        </p>
      </div>
    `;

    await supabase.from("email_queue").insert({
      status: "pending",
      payload: {
        from: "verkoop@auto-city.nl",
        to: ["hendrik@auto-city.nl"],
        subject: `B2B Kansen ${datum} — ${totalKansen} kansen | Team: ${teamData.reduce((s, t) => s + t.total, 0)} verkopen | ${nietOnline.length} niet online`,
        html: emailHtml,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      sterkeKansen: sterkeKansen.length,
      mogelijkeKansen: mogelijkeKansen.length,
      totaalTransport: transportVehicles.length,
      excelUrl: signedUrl?.signedUrl || null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error in daan-b2b-analyse:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
