import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import XLSX from "npm:xlsx-js-style";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const C = {
  DARK_NAVY: "1F3864", MID_BLUE: "2F5496",
  ROOD_H: "C00000", GROEN_H: "375623", GROEN_MID: "4E7B35",
  ORANJE_H: "BF5800",
  ROOD_BG: "FFD7D7", ROOD_ALT: "FFB3B3",
  GROEN_BG: "E2EFDA", GROEN_ALT: "F0F7EC",
  ORANJE_BG: "FCE4D6", ORANJE_ALT: "FFF0E6",
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

interface ParsedVehicle {
  id: string;
  brand: string;
  model: string;
  uitvoering: string | null;
  brandstof: string | null;
  transmissie: string | null;
  bouwjaar: number | null;
  kilometerstand: number;
  inkoopprijs: number;
  kenteken: string;
}

interface B2BKans {
  auto: string;
  kenteken: string;
  inkoopprijs: number;
  b2bAanbodprijs: number;
  dealerNaam: string;
  dealerVerkoopprijs: number;
  dealerStagedagen: number;
  verkochtDagenGeleden: number;
  onzeMarge: number;
  dealerMargeruimte: number;
  score: "STERK" | "MOGELIJK";
}

function parseClaudeResponse(text: string): any[] {
  try {
    let cleanText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const firstBracket = Math.min(
      cleanText.indexOf('[') !== -1 ? cleanText.indexOf('[') : Infinity,
      cleanText.indexOf('{') !== -1 ? cleanText.indexOf('{') : Infinity
    );
    const lastBracket = Math.max(
      cleanText.lastIndexOf(']'),
      cleanText.lastIndexOf('}')
    );

    if (firstBracket !== Infinity && lastBracket !== -1 && lastBracket > firstBracket) {
      cleanText = cleanText.substring(firstBracket, lastBracket + 1);
    }

    const parsed = JSON.parse(cleanText);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    console.error("❌ CRITICAL: Failed to parse Claude JSON:", error);
    console.error("Raw Claude Output (first 500 chars):", text.substring(0, 500));
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
  console.log(`🤖 Claude Parsing voltooid: ${parsed.length} voertuigen succesvol geëxtraheerd`);

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

async function queryJPCars(
  parsed: { brand: string; model: string; brandstof?: string | null; bouwjaar?: number | null; kilometerstand?: number },
  apiToken: string
): Promise<any[]> {
  const params = new URLSearchParams({
    make: parsed.brand,
    model: parsed.model.split(" ")[0],
    include_sold: "true",
    page_size: "100",
    page_index: "0",
  });

  if (parsed.brandstof) {
    const fuelMap: Record<string, string> = {
      Benzine: "Benzine", Diesel: "Diesel", Hybride: "Hybride", Elektrisch: "Elektrisch",
    };
    if (fuelMap[parsed.brandstof]) params.append("fuel", fuelMap[parsed.brandstof]);
  }

  if (parsed.bouwjaar) {
    params.append("build_year_min", String(parsed.bouwjaar - 1));
    params.append("build_year_max", String(parsed.bouwjaar + 1));
  }

  // Mileage filter: ±20.000 km (skip voor nieuwe auto's < 1000 km)
  if (parsed.kilometerstand && parsed.kilometerstand > 1000) {
    params.append("mileage_min", String(Math.max(0, parsed.kilometerstand - 20000)));
    params.append("mileage_max", String(parsed.kilometerstand + 20000));
  }

  const url = `https://api.nl.jp.cars/api/cars/list?${params.toString()}`;
  try {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
    });
    if (!resp.ok) {
      console.error(`❌ JP Cars API Error: ${resp.status} ${resp.statusText} for ${parsed.brand} ${parsed.model}`);
      return [];
    }
    const data = await resp.json();

    let listings: any[];
    if (Array.isArray(data)) {
      listings = data;
    } else if (data && Array.isArray(data.results)) {
      listings = data.results;
    } else if (data && Array.isArray(data.data)) {
      listings = data.data;
    } else if (data && Array.isArray(data.items)) {
      listings = data.items;
    } else {
      console.warn(`⚠️ Onverwacht JP Cars response formaat voor ${parsed.brand} ${parsed.model}:`, JSON.stringify(data).substring(0, 200));
      listings = [];
    }

    // Debug logging
    console.log(`🚗 JP Cars: ${parsed.brand} ${parsed.model} bj:${parsed.bouwjaar || '?'} km:${parsed.kilometerstand || '?'} ${parsed.brandstof || ''} -> ${listings.length} resultaten`);
    if (listings.length > 0) {
      const sample = listings[0];
      console.log(`   📋 Sample keys: ${Object.keys(sample).join(', ')}`);
      console.log(`   📋 Sample RAW: ${JSON.stringify(sample).substring(0, 500)}`);
    }

    return listings;
  } catch (e) {
    console.error(`❌ Fetch error JP Cars ${parsed.brand} ${parsed.model}:`, e);
    return [];
  }
}

function calculateB2BKansen(vehicle: ParsedVehicle, listings: any[], ownPlates: Set<string>): B2BKans[] {
  const kansen: B2BKans[] = [];
  const autoNaam = `${vehicle.brand} ${vehicle.model}`;

  let skipOwn = 0, skipNoSold = 0, skipSoldOld = 0, skipStockHigh = 0, skipNoPrice = 0, skipLowMarge = 0, passed = 0;

  for (const listing of listings) {
    // Skip eigen voorraad op basis van kenteken
    const plate = (listing.license_plate || "").replace(/[-\s]/g, "").toUpperCase();
    if (ownPlates.has(plate)) { skipOwn++; continue; }

    const soldSince = listing.sold_since;
    const daysInStock = listing.stock_days ?? 0;
    const dealerPrice = listing.price_local ?? 0;
    const dealerName = listing.location_name || "Onbekend";

    if (soldSince === null || soldSince === undefined) { skipNoSold++; continue; }
    if (soldSince > 40) { skipSoldOld++; continue; }
    if (daysInStock > 50) { skipStockHigh++; continue; }
    if (dealerPrice <= 0) { skipNoPrice++; continue; }

    const maxOnzeprijs = dealerPrice - 3000;
    const onzeMarge = maxOnzeprijs - vehicle.inkoopprijs;

    if (onzeMarge < 3000) { skipLowMarge++; continue; }
    passed++;

    kansen.push({
      auto: autoNaam,
      kenteken: vehicle.kenteken,
      inkoopprijs: vehicle.inkoopprijs,
      b2bAanbodprijs: maxOnzeprijs,
      dealerNaam: dealerName,
      dealerVerkoopprijs: dealerPrice,
      dealerStagedagen: daysInStock,
      verkochtDagenGeleden: soldSince,
      onzeMarge,
      dealerMargeruimte: 3000,
      score: onzeMarge >= 4000 ? "STERK" : "MOGELIJK",
    });
  }

  if (listings.length > 0) {
    console.log(`   🔍 ${autoNaam} (${vehicle.kenteken}): ${listings.length} listings → eigen:${skipOwn} noSold:${skipNoSold} soldOud:${skipSoldOld} stockHoog:${skipStockHigh} geenPrijs:${skipNoPrice} lageMarge:${skipLowMarge} ✅:${passed}`);
  }

  return kansen;
}

function buildExcel(sterkeKansen: B2BKans[], mogelijkeKansen: B2BKans[], datum: string): Uint8Array {
  const wb = XLSX.utils.book_new();
  const COLS = ["Onze Auto", "Kenteken", "Onze Inkoop", "B2B Aanbod", "Dealer Naam", "Dealer Verkoopprijs", "Dealer Stagedagen", "Verkocht dgn geleden", "Onze Marge", "Dealer Margeruimte"];
  const COL_WIDTHS = [22, 12, 12, 12, 22, 14, 14, 14, 12, 14];

  function addSheet(name: string, kansen: B2BKans[], fillBg: string, fillAlt: string, hdrFill: string) {
    const rows: any[][] = [];
    const titleRow = [titleCell(`${name} — ${datum}`), ...Array(COLS.length - 1).fill({ v: "", t: "s", s: { fill: { fgColor: { rgb: C.DARK_NAVY }, patternType: "solid" } } })];
    rows.push(titleRow);
    rows.push(COLS.map(c => headerCell(c, hdrFill)));
    kansen.forEach((k, i) => {
      const bg = i % 2 === 0 ? fillBg : fillAlt;
      rows.push([
        makeCell(k.auto, { fill: bg }),
        makeCell(k.kenteken, { fill: bg, align: "center" }),
        makeCell(k.inkoopprijs, { fill: bg, align: "right" }),
        makeCell(k.b2bAanbodprijs, { fill: bg, align: "right", font: { bold: true } }),
        makeCell(k.dealerNaam, { fill: bg }),
        makeCell(k.dealerVerkoopprijs, { fill: bg, align: "right" }),
        makeCell(k.dealerStagedagen, { fill: bg, align: "center" }),
        makeCell(k.verkochtDagenGeleden, { fill: bg, align: "center" }),
        makeCell(k.onzeMarge, { fill: bg, align: "right", font: { bold: true, color: { rgb: C.GROEN_H } } }),
        makeCell(k.dealerMargeruimte, { fill: bg, align: "right" }),
      ]);
    });

    if (kansen.length === 0) {
      rows.push([makeCell("Geen kansen gevonden", { fill: C.GRIJS_LT }), ...Array(COLS.length - 1).fill(makeCell("", { fill: C.GRIJS_LT }))]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = COL_WIDTHS.map(w => ({ wch: w }));
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: COLS.length - 1 } }];
    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  addSheet("🟢 Sterke kansen", sterkeKansen, C.GROEN_BG, C.GROEN_ALT, C.GROEN_H);
  addSheet("🟡 Mogelijke kansen", mogelijkeKansen, C.ORANJE_BG, C.ORANJE_ALT, C.ORANJE_H);

  const overzichtRows: any[][] = [
    [titleCell(`B2B Analyse Overzicht — ${datum}`), ...Array(3).fill({ v: "", t: "s", s: { fill: { fgColor: { rgb: C.DARK_NAVY }, patternType: "solid" } } })],
    [headerCell("KPI"), headerCell("Waarde"), headerCell(""), headerCell("")],
    [makeCell("Sterke kansen (marge ≥ €4.000)"), makeCell(sterkeKansen.length, { align: "center", font: { bold: true, color: { rgb: C.GROEN_H } } }), makeCell(""), makeCell("")],
    [makeCell("Mogelijke kansen (marge €3.000-€4.000)"), makeCell(mogelijkeKansen.length, { align: "center", font: { bold: true, color: { rgb: C.ORANJE_H } } }), makeCell(""), makeCell("")],
    [makeCell("Totaal kansen"), makeCell(sterkeKansen.length + mogelijkeKansen.length, { align: "center", font: { bold: true } }), makeCell(""), makeCell("")],
    [makeCell("Totale potentiële marge"), makeCell(
      [...sterkeKansen, ...mogelijkeKansen].reduce((sum, k) => sum + k.onzeMarge, 0),
      { align: "center", font: { bold: true, color: { rgb: C.GROEN_H } } }
    ), makeCell(""), makeCell("")],
  ];
  const wsOvz = XLSX.utils.aoa_to_sheet(overzichtRows);
  wsOvz["!cols"] = [{ wch: 35 }, { wch: 15 }, { wch: 10 }, { wch: 10 }];
  wsOvz["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
  XLSX.utils.book_append_sheet(wb, wsOvz, "📊 Overzicht");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new Uint8Array(buf);
}

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

    // BUG 1 FIX: Haal year, mileage, notes op uit DB
    const { data: vehicles, error: vErr } = await supabase
      .from("vehicles")
      .select("id, brand, model, year, mileage, license_number, purchase_price, notes, details, created_at")
      .eq("status", "voorraad")
      .gt("purchase_price", 0);

    if (vErr) throw new Error(`Vehicle query failed: ${vErr.message}`);

    // BUG 1 FIX: Verwijder de transportStatus === "onderweg" exclusie
    // Alle offline + niet-inruil auto's zijn B2B kandidaten
    const offlineVehicles = (vehicles || []).filter((v: any) => {
      const d = v.details || {};
      if (d.showroomOnline === true) return false;
      if (d.isTradeIn === true) return false;
      // VERWIJDERD: if (d.transportStatus === "onderweg") return false;
      // Auto's onderweg zijn JUIST de B2B kansen
      return true;
    });

    console.log(`📊 START B2B Analyse: ${offlineVehicles.length} offline voertuigen gevonden (incl. onderweg)`);

    if (offlineVehicles.length === 0) {
      const result = { sterkeKansen: [], mogelijkeKansen: [], totaalOffline: 0 };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // BUG 2 FIX: Stuur notes + mileage mee naar Claude
    const vehicleInputs = offlineVehicles.map((v: any) => ({
      id: v.id,
      brand: v.brand || "",
      model: v.model || "",
      bouwjaar: v.year || v.details?.buildYear || v.details?.year || null,
      kilometerstand: v.mileage || 0,
      omschrijving: v.notes || "",
    }));

    const claudeResults = await claudeBatchParse(vehicleInputs, anthropicKey);

    const parsedVehicles: ParsedVehicle[] = offlineVehicles.map((v: any) => {
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
        kenteken: v.license_number || "",
      };
    });

    // BUG 3 FIX: Per-voertuig JP Cars query met slimme cache
    // Cache key: brand|model[0]|brandstof|bouwjaar|mileage_bucket(per 20k)
    const jpCarsCache = new Map<string, any[]>();
    for (const pv of parsedVehicles) {
      const mileageBucket = Math.round(pv.kilometerstand / 20000) * 20000;
      const key = `${pv.brand}|${pv.model.split(" ")[0]}|${pv.brandstof || ""}|${pv.bouwjaar || ""}|${mileageBucket}`;

      if (!jpCarsCache.has(key)) {
        const listings = await queryJPCars({
          brand: pv.brand,
          model: pv.model,
          brandstof: pv.brandstof,
          bouwjaar: pv.bouwjaar,
          kilometerstand: pv.kilometerstand,
        }, jpCarsToken);
        jpCarsCache.set(key, listings);
        await new Promise(r => setTimeout(r, 200));
      }
    }

    const allKansen: B2BKans[] = [];
    for (const pv of parsedVehicles) {
      const mileageBucket = Math.round(pv.kilometerstand / 20000) * 20000;
      const key = `${pv.brand}|${pv.model.split(" ")[0]}|${pv.brandstof || ""}|${pv.bouwjaar || ""}|${mileageBucket}`;
      const listings = jpCarsCache.get(key) || [];
      const kansen = calculateB2BKansen(pv, listings);
      allKansen.push(...kansen);
    }

    const bestPerVehicle = new Map<string, B2BKans>();
    for (const k of allKansen) {
      const existing = bestPerVehicle.get(k.kenteken);
      if (!existing || k.onzeMarge > existing.onzeMarge) {
        bestPerVehicle.set(k.kenteken, k);
      }
    }
    const dedupedKansen = Array.from(bestPerVehicle.values());

    const sterkeKansen = dedupedKansen.filter(k => k.score === "STERK").sort((a, b) => b.onzeMarge - a.onzeMarge);
    const mogelijkeKansen = dedupedKansen.filter(k => k.score === "MOGELIJK").sort((a, b) => b.onzeMarge - a.onzeMarge);

    console.log(`✅ Analyse voltooid: ${sterkeKansen.length} Sterke kansen, ${mogelijkeKansen.length} Mogelijke kansen uit ${offlineVehicles.length} auto's`);

    if (isDownloadMode) {
      return new Response(JSON.stringify({
        sterkeKansen,
        mogelijkeKansen,
        totaalOffline: offlineVehicles.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const datum = new Date().toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
    const excelBuffer = buildExcel(sterkeKansen, mogelijkeKansen, datum);

    const filename = `daan-b2b-${new Date().toISOString().split("T")[0]}.xlsx`;
    const { error: uploadErr } = await supabase.storage
      .from("daan-analyses")
      .upload(filename, excelBuffer, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });

    const { data: signedUrl } = await supabase.storage
      .from("daan-analyses")
      .createSignedUrl(filename, 60 * 60 * 24 * 7);

    const totalKansen = sterkeKansen.length + mogelijkeKansen.length;
    const totalMarge = dedupedKansen.reduce((s, k) => s + k.onzeMarge, 0);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #1F3864;">🚗 B2B Kansen Rapport — ${datum}</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 12px; background: #E2EFDA; border-radius: 8px; text-align: center;">
              <strong style="font-size: 24px; color: #375623;">${sterkeKansen.length}</strong><br>
              <span style="font-size: 12px;">Sterke kansen</span>
            </td>
            <td style="padding: 12px; background: #FCE4D6; border-radius: 8px; text-align: center; margin-left: 8px;">
              <strong style="font-size: 24px; color: #BF5800;">${mogelijkeKansen.length}</strong><br>
              <span style="font-size: 12px;">Mogelijke kansen</span>
            </td>
            <td style="padding: 12px; background: #DEEAF1; border-radius: 8px; text-align: center; margin-left: 8px;">
              <strong style="font-size: 24px; color: #1F3864;">€${totalMarge.toLocaleString("nl-NL")}</strong><br>
              <span style="font-size: 12px;">Potentiële marge</span>
            </td>
          </tr>
        </table>
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
            📥 Download Excel Rapport
          </a>
        </p>` : ""}
        <p style="color: #999; font-size: 11px; margin-top: 24px;">
          Geanalyseerd: ${offlineVehicles.length} offline auto's | ${datum} | Daan AI Agent
        </p>
      </div>
    `;

    await supabase.from("email_queue").insert({
      status: "pending",
      payload: {
        from: "verkoop@auto-city.nl",
        to: ["hendrik@auto-city.nl"],
        subject: `B2B Kansen ${datum} — ${totalKansen} kansen gevonden`,
        html: emailHtml,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      sterkeKansen: sterkeKansen.length,
      mogelijkeKansen: mogelijkeKansen.length,
      totaalOffline: offlineVehicles.length,
      excelUrl: signedUrl?.signedUrl || null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in daan-b2b-analyse:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
