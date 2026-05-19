// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

// ===== BRAND COLORS (v5) =====
const hex = (h: string) => {
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
};
const NAVY = hex("1F3864");
const YELLOW_ROW = hex("FFF9E6");
const YELLOW_BOX = hex("FFF3CD");
const ORANGE = hex("ED7D31");
const GREEN_CAT = hex("548235");
const GREEN_CELL = hex("E2EFDA");
const RED_DMG = hex("C00000");
const GREY_HEAD = hex("595959");
const RED_ROW = hex("FFE0E0");
const WHITE = rgb(1, 1, 1);
const TEXT = hex("262626");
const MUTED = hex("8C8C8C");
const BORDER = hex("D9D9D9");

function parseClaudeResponse(text: string): any {
  try {
    let clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const f = clean.indexOf("{"); const l = clean.lastIndexOf("}");
    if (f !== -1 && l !== -1) clean = clean.substring(f, l + 1);
    return JSON.parse(clean);
  } catch (e) {
    console.warn("[robin] parse error — attempting truncation recovery", e);
    return recoverTruncatedJson(text);
  }
}

// Best-effort herstel als Claude's output is afgekapt (max_tokens bereikt).
// Strategie: knip de laatste onvolledige array-entry weg en sluit JSON met de
// benodigde ] en } in de juiste volgorde, op basis van bracket-depth analyse.
function recoverTruncatedJson(text: string): any {
  try {
    let s = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const start = s.indexOf("{");
    if (start === -1) return null;
    s = s.substring(start);

    // Walk door de string, hou bracket-stack bij, negeer strings/escapes.
    const stack: string[] = [];
    let inStr = false; let esc = false;
    let lastSafeEnd = -1; // index t/m welke we een geldig prefix hebben (na een complete waarde op top-level object/array)
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (esc) { esc = false; continue; }
      if (inStr) {
        if (c === "\\") { esc = true; continue; }
        if (c === '"') { inStr = false; }
        continue;
      }
      if (c === '"') { inStr = true; continue; }
      if (c === "{" || c === "[") { stack.push(c); continue; }
      if (c === "}" || c === "]") {
        stack.pop();
        // Na het sluiten van een element in een array op stack-depth 1 (root = {),
        // is alles t/m hier een veilig prefix om te sluiten.
        if (stack.length >= 1) lastSafeEnd = i;
        continue;
      }
      if (c === "," && stack.length >= 1) {
        lastSafeEnd = i - 1; // komma zelf niet meenemen
      }
    }

    if (lastSafeEnd === -1) return null;
    let prefix = s.substring(0, lastSafeEnd + 1).replace(/[,\s]+$/, "");

    // Reconstrueer stack voor het afgekapt prefix.
    const stack2: string[] = [];
    let inStr2 = false; let esc2 = false;
    for (let i = 0; i < prefix.length; i++) {
      const c = prefix[i];
      if (esc2) { esc2 = false; continue; }
      if (inStr2) {
        if (c === "\\") { esc2 = true; continue; }
        if (c === '"') inStr2 = false;
        continue;
      }
      if (c === '"') { inStr2 = true; continue; }
      if (c === "{" || c === "[") stack2.push(c);
      else if (c === "}" || c === "]") stack2.pop();
    }

    // Sluit alle open brackets in omgekeerde volgorde.
    let closer = "";
    for (let i = stack2.length - 1; i >= 0; i--) {
      closer += stack2[i] === "{" ? "}" : "]";
    }
    const candidate = prefix + closer;
    const parsed = JSON.parse(candidate);
    console.warn("[robin] truncatie hersteld — sommige schades kunnen ontbreken");
    return parsed;
  } catch (e) {
    console.error("[robin] truncation recovery failed", e);
    return null;
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = ""; const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) bin += String.fromCharCode(...buf.subarray(i, i + CHUNK));
  return btoa(bin);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  let inspection_id: string | null = null;

  try {
    const body = await req.json();
    inspection_id = body.inspection_id;
    if (!inspection_id) throw new Error("inspection_id ontbreekt");
    console.log(`[robin] start ${inspection_id}`);

    const { data: insp, error: inspErr } = await supabase
      .from("intake_inspections").select("*").eq("id", inspection_id).single();
    if (inspErr || !insp) throw new Error(`Inspectie niet gevonden: ${inspErr?.message}`);

    const { data: robin } = await supabase
      .from("ai_agents").select("system_prompt").eq("name", "Robin").maybeSingle();
    const systemPrompt = robin?.system_prompt || "Je bent Robin. Return JSON.";

    const { data: filesList, error: listErr } = await supabase.storage
      .from("intake-frames").list(inspection_id, { limit: 200, sortBy: { column: "name", order: "asc" } });
    if (listErr) throw new Error(`Frames listen: ${listErr.message}`);
    const frameFiles = (filesList || []).filter(f => f.name.endsWith(".jpg")).sort((a, b) => a.name.localeCompare(b.name));
    if (frameFiles.length === 0) throw new Error("Geen frames gevonden");
    console.log(`[robin] ${frameFiles.length} frames`);

    const images: { name: string; b64: string }[] = [];
    for (const f of frameFiles) {
      const { data: blob, error: dlErr } = await supabase.storage
        .from("intake-frames").download(`${inspection_id}/${f.name}`);
      if (dlErr || !blob) { console.warn(`[robin] skip ${f.name}: ${dlErr?.message}`); continue; }
      images.push({ name: f.name.replace(".jpg", ""), b64: await blobToBase64(blob) });
    }
    if (images.length === 0) throw new Error("Geen frames kunnen downloaden");

    const userContent: any[] = [];
    images.forEach((img) => {
      userContent.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: img.b64 } });
      userContent.push({ type: "text", text: `[${img.name}]` });
    });
    const leeftijd = insp.vehicle_year ? Math.max(0, new Date().getFullYear() - Number(insp.vehicle_year)) : null;
    const kmPerJaar = (insp.vehicle_year && insp.vehicle_mileage && leeftijd && leeftijd > 0)
      ? Math.round(Number(insp.vehicle_mileage) / leeftijd) : null;
    userContent.push({
      type: "text",
      text:
`\nVOERTUIG CRM DATA:
- Merk/Model: ${insp.vehicle_brand ?? "?"} ${insp.vehicle_model ?? ""}
- Kenteken: ${insp.vehicle_license ?? "— (importauto, nog niet ingeschreven)"}
- VIN: ${insp.vehicle_vin ?? "?"}
- Bouwjaar: ${insp.vehicle_year ?? "?"} (leeftijd: ${leeftijd ?? "?"} jaar)
- Kilometerstand: ${insp.vehicle_mileage ? Number(insp.vehicle_mileage).toLocaleString("nl-NL") : "?"} km
- Gem. km/jaar: ${kmPerJaar ? kmPerJaar.toLocaleString("nl-NL") : "?"}
- Aantal frames: ${images.length}

Analyseer alle frames hierboven en geef je analyse als JSON volgens het exacte OUTPUT FORMAT in je system prompt. Frame-namen staan tussen blokhaken na elke foto.`,
    });

    console.log(`[robin] calling Anthropic with ${images.length} images`);
    const anthRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 16000,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      }),
    });
    if (!anthRes.ok) {
      const t = await anthRes.text();
      throw new Error(`Anthropic ${anthRes.status}: ${t.slice(0, 500)}`);
    }
    const anthJson = await anthRes.json();
    const textBlock = (anthJson.content || []).find((c: any) => c.type === "text");
    const rawText = textBlock?.text || "";
    const analysis = parseClaudeResponse(rawText);
    if (!analysis) throw new Error("Kon Robin's JSON niet parsen");
    console.log(`[robin] analysis OK, ${analysis.schade_overzicht?.length ?? 0} schades`);

    // Persist damages (best-effort)
    const damages: any[] = Array.isArray(analysis.schade_overzicht) ? analysis.schade_overzicht : [];
    if (damages.length > 0) {
      const rows = damages.map((d: any) => ({
        inspection_id,
        damage_code: d.id || "S?",
        locatie: d.locatie || "Onbekend",
        type: ["kras","deuk","steenslag","lakschade","interieur","glas","velg","overig"].includes(d.type) ? d.type : "overig",
        ernst: ["minimaal","licht","middel","zwaar"].includes(d.ernst) ? d.ernst : "licht",
        afmeting_cm: typeof d.afmeting_cm === "number" ? d.afmeting_cm : null,
        aanbevolen_actie: ["polijsten","touch_up","restylen","spuiten","vervangen","accepteren"].includes(d.aanbevolen_actie) ? d.aanbevolen_actie : "accepteren",
        geschatte_kosten_min: d.kosten_min ?? d.geschatte_kosten_min ?? 0,
        geschatte_kosten_max: d.kosten_max ?? d.geschatte_kosten_max ?? 0,
        prioriteit: ["kritiek","hoog","midden","laag"].includes(d.prioriteit) ? d.prioriteit : "midden",
        in_taxatierapport: !!d.in_taxatierapport,
        claim_potential: !!d.claim_potential,
        redenering: d.realism_check || d.redenering || null,
        frame_referentie: d.frame_referentie || null,
        detectie_blok: d.detectie_blok || null,
        detectie_bewijs: d.detectie_bewijs || null,
      }));
      const { error: dmgErr } = await supabase.from("intake_damages").insert(rows);
      if (dmgErr) console.error("[robin] damages insert error", dmgErr);
    }

    const autoInfo = analysis.auto_info || {};
    const totaalMin = analysis.totaal_min ?? analysis.showroom_plan?.totale_kosten_min ?? 0;
    const totaalMax = analysis.totaal_max ?? analysis.showroom_plan?.totale_kosten_max ?? 0;
    const claim = analysis.claim_advies || {};

    await supabase.from("intake_inspections").update({
      status: "generating_pdf",
      categorie: ["A","B","C"].includes(autoInfo.categorie) ? autoInfo.categorie : null,
      categorie_reden: autoInfo.categorie_titel || null,
      totale_kosten_min: totaalMin,
      totale_kosten_max: totaalMax,
      schade_count: damages.length,
      claim_aanbevolen: !!claim.aanbevolen,
      claim_waarde: claim.geschatte_claim_waarde_euro ?? 0,
      samenvatting_team: analysis.samenvatting_team || null,
      robin_analyse: analysis,
    }).eq("id", inspection_id);

    console.log(`[robin] generating PDF`);
    const pdfBytes = await generatePdf(insp, analysis, images);

    const pdfPath = `${inspection_id}.pdf`;
    const { error: upErr } = await supabase.storage.from("intake-reports").upload(pdfPath, pdfBytes, {
      contentType: "application/pdf", upsert: true,
    });
    if (upErr) throw new Error(`PDF upload: ${upErr.message}`);

    const { data: signed } = await supabase.storage.from("intake-reports").createSignedUrl(pdfPath, 60 * 60 * 24 * 365);
    const pdfUrl = signed?.signedUrl || "";

    const reportName = `Robin Inname Rapport ${new Date().toLocaleDateString("nl-NL")}.pdf`;
    await supabase.from("vehicle_files").insert({
      vehicle_id: insp.vehicle_id,
      name: reportName,
      category: "inname_rapport",
      url: pdfUrl,
      file_path: `intake-reports/${pdfPath}`,
      metadata: { inspection_id, categorie: autoInfo.categorie, schade_count: damages.length },
    });

    await supabase.from("intake_inspections").update({
      status: "completed",
      pdf_url: pdfUrl,
      pdf_generated_at: new Date().toISOString(),
    }).eq("id", inspection_id);

    console.log(`[robin] done ${inspection_id}`);
    return new Response(JSON.stringify({ ok: true, inspection_id, pdf_url: pdfUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[robin] FAIL", e);
    if (inspection_id) {
      await supabase.from("intake_inspections").update({
        status: "failed",
        error_message: String(e.message || e).slice(0, 500),
      }).eq("id", inspection_id);
    }
    return new Response(JSON.stringify({ ok: false, error: String(e.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// =============================================================
// PDF GENERATION — matches Robin v5 layout
// =============================================================
const PAGE_W = 595, PAGE_H = 842, MARGIN = 50;
const CONTENT_W = PAGE_W - 2 * MARGIN;

type Ctx = {
  pdf: PDFDocument;
  page: PDFPage;
  y: number;
  helv: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
};

async function generatePdf(insp: any, analysis: any, images: { name: string; b64: string }[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const ctx: Ctx = { pdf, page: pdf.addPage([PAGE_W, PAGE_H]), y: PAGE_H, helv, bold, italic };

  // ===== PAGE 1: COVER =====
  drawCoverHeader(ctx, insp, analysis);
  drawVoertuiggegevens(ctx, insp, analysis);
  drawCategorieBlok(ctx, analysis);
  drawSamenvattingTeam(ctx, analysis);

  // ===== PAGE 2+: SCHADE OVERZICHT =====
  const damages: any[] = Array.isArray(analysis.schade_overzicht) ? analysis.schade_overzicht : [];
  newPage(ctx);
  drawSectionTitle(ctx, "SCHADE OVERZICHT");
  if (damages.length === 0) {
    ensureSpace(ctx, 30);
    drawText(ctx, "Geen schades aangetroffen.", MARGIN, ctx.y, { size: 11 });
    ctx.y -= 16;
  } else {
    for (const d of damages) await drawDamage(ctx, d, images);
  }

  // ===== PAGE: VOLLEDIGE INSPECTIE OVERZICHT =====
  newPage(ctx);
  drawSectionTitle(ctx, "VOLLEDIGE INSPECTIE OVERZICHT");
  if (analysis.inspectie_intro) {
    drawWrappedText(ctx, analysis.inspectie_intro, { size: 10 });
    ctx.y -= 6;
  }
  drawInspectieTable(ctx, analysis.inspectie_overzicht || []);
  ctx.y -= 10;
  if (analysis.algemene_observatie) {
    drawCalloutBox(ctx, "Robin's algemene observatie: ", analysis.algemene_observatie, GREEN_CELL, GREEN_CAT);
  }
  ctx.y -= 14;
  drawSectionTitle(ctx, "BEPERKINGEN VAN DEZE ANALYSE");
  const beperkingen: string[] = Array.isArray(analysis.beperkingen) ? analysis.beperkingen : [];
  drawBulletBox(ctx, "Niet beoordeeld op deze video:", beperkingen);

  // ===== PAGE: KOSTEN + CLAIM + VOLGENDE STAPPEN =====
  newPage(ctx);
  drawSectionTitle(ctx, "KOSTEN OVERZICHT");
  drawKostenTable(ctx, analysis.kosten_overzicht || [], analysis.totaal_min ?? 0, analysis.totaal_max ?? 0);
  ctx.y -= 16;
  drawSectionTitle(ctx, "CLAIM ADVIES LEVERANCIER");
  drawClaimBox(ctx, analysis.claim_advies || {});
  ctx.y -= 14;
  drawSectionTitle(ctx, "VOLGENDE STAPPEN");
  drawNumberedList(ctx, analysis.volgende_stappen || []);

  drawCentralFooter(ctx);

  // Page footer + numbers on every page
  const pages = pdf.getPages();
  pages.forEach((p, idx) => {
    p.drawText(`Pagina ${idx + 1} / ${pages.length}`, { x: PAGE_W - MARGIN - 70, y: 24, size: 8, font: helv, color: MUTED });
  });

  return await pdf.save();
}

// ----------------- low-level draw helpers -----------------
function drawText(ctx: Ctx, text: string, x: number, y: number, opts: { size?: number; bold?: boolean; italic?: boolean; color?: any } = {}) {
  const font = opts.bold ? ctx.bold : opts.italic ? ctx.italic : ctx.helv;
  ctx.page.drawText(sanitizeWinAnsi(String(text ?? "")), { x, y, size: opts.size ?? 10, font, color: opts.color ?? TEXT });
}
function drawBox(ctx: Ctx, x: number, y: number, w: number, h: number, color: any) {
  ctx.page.drawRectangle({ x, y, width: w, height: h, color });
}
function drawBorder(ctx: Ctx, x: number, y: number, w: number, h: number, color: any, thickness = 0.5) {
  ctx.page.drawRectangle({ x, y, width: w, height: h, borderColor: color, borderWidth: thickness });
}
function drawHLine(ctx: Ctx, x: number, y: number, w: number, color: any, thickness = 1) {
  ctx.page.drawLine({ start: { x, y }, end: { x: x + w, y }, color, thickness });
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = sanitizeWinAnsi(String(text || "")).split(/\s+/);
  const lines: string[] = []; let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

// Replace characters that the WinAnsi-encoded standard PDF fonts cannot render.
function sanitizeWinAnsi(s: string): string {
  return s
    .replace(/[\u2192\u279C\u27A4]/g, "->")  // → ➜ ➤
    .replace(/[\u2190]/g, "<-")               // ←
    .replace(/[\u2194]/g, "<->")              // ↔
    .replace(/[\u2018\u2019\u02BC]/g, "'")    // ' ' ʼ
    .replace(/[\u201C\u201D]/g, '"')          // " "
    .replace(/[\u2013\u2014]/g, "-")          // – —
    .replace(/[\u2026]/g, "...")              // …
    .replace(/[\u00A0]/g, " ")                // nbsp
    .replace(/[\u2022\u25E6\u2043]/g, "•")    // bullets → kept (• is in WinAnsi)
    .replace(/[\u2713\u2714]/g, "v")          // ✓ ✔
    .replace(/[\u2717\u2718\u2715]/g, "x")    // ✗ ✘ ✕
    .replace(/[\u20AC]/g, "€")                // € (already in WinAnsi, keep)
    // Strip any remaining non-WinAnsi codepoints
    .replace(/[^\x00-\xFF€‚ƒ„…†‡ˆ‰Š‹ŒŽ•™š›œžŸ]/g, "?");
}

function newPage(ctx: Ctx) {
  ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - MARGIN;
}
function ensureSpace(ctx: Ctx, h: number) {
  if (ctx.y - h < MARGIN + 20) newPage(ctx);
}

function drawWrappedText(ctx: Ctx, text: string, opts: { size?: number; bold?: boolean; color?: any; indent?: number } = {}) {
  const size = opts.size ?? 10;
  const font = opts.bold ? ctx.bold : ctx.helv;
  const indent = opts.indent ?? 0;
  const lines = wrap(text, font, size, CONTENT_W - indent);
  for (const line of lines) {
    ensureSpace(ctx, size + 4);
    drawText(ctx, line, MARGIN + indent, ctx.y - size, { size, bold: opts.bold, color: opts.color });
    ctx.y -= size + 4;
  }
}

function drawSectionTitle(ctx: Ctx, title: string) {
  ensureSpace(ctx, 30);
  drawText(ctx, title, MARGIN, ctx.y - 14, { size: 13, bold: true, color: NAVY });
  ctx.y -= 18;
  drawHLine(ctx, MARGIN, ctx.y, CONTENT_W, NAVY, 1.2);
  ctx.y -= 14;
}

// ----------------- COVER -----------------
function drawCoverHeader(ctx: Ctx, insp: any, _analysis: any) {
  // Navy bar
  drawBox(ctx, 0, PAGE_H - 110, PAGE_W, 110, NAVY);
  drawText(ctx, "ROBIN INNAME", MARGIN, PAGE_H - 55, { size: 22, bold: true, color: WHITE });
  drawText(ctx, "INSPECTIE", MARGIN, PAGE_H - 80, { size: 22, bold: true, color: WHITE });
  drawText(ctx, "Auto City Automotive Group B.V.", 320, PAGE_H - 55, { size: 11, color: WHITE });
  const dt = new Date().toLocaleString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  drawText(ctx, `Inspectie datum: ${dt}`, 320, PAGE_H - 72, { size: 11, color: WHITE });
  ctx.y = PAGE_H - 130;
}

function drawVoertuiggegevens(ctx: Ctx, insp: any, analysis: any) {
  const ai = analysis.auto_info || {};
  drawSectionTitle(ctx, "VOERTUIGGEGEVENS");

  const leeftijd = insp.vehicle_year ? Math.max(0, new Date().getFullYear() - Number(insp.vehicle_year)) : null;
  const kmPerJaar = (insp.vehicle_year && insp.vehicle_mileage && leeftijd && leeftijd > 0)
    ? Math.round(Number(insp.vehicle_mileage) / leeftijd).toLocaleString("nl-NL") + " km/jaar"
    : "—";
  const inkoopDatum = insp.purchase_date ? new Date(insp.purchase_date).toLocaleDateString("nl-NL") : (ai.inkoopdatum || "—");
  const inkoopPrijs = ai.inkoopprijs || (insp.purchase_price ? "€ " + Number(insp.purchase_price).toLocaleString("nl-NL") : "—");

  const rows: [string, string, boolean][] = [
    ["Merk/Model", ai.merk_model || `${insp.vehicle_brand ?? ""} ${insp.vehicle_model ?? ""}`.trim() || "—", false],
    ["Kenteken", insp.vehicle_license || "— (importauto, nog niet ingeschreven)", false],
    ["Meldcode (laatste 4 VIN)", ai.meldcode || (insp.vehicle_vin ? String(insp.vehicle_vin).slice(-4) : "—"), false],
    ["Volledig VIN", insp.vehicle_vin || "—", false],
    ["Bouwjaar", `${insp.vehicle_year ?? "—"}${leeftijd != null ? ` (leeftijd: ${leeftijd} jaar)` : ""}`, true],
    ["Kilometerstand", insp.vehicle_mileage ? Number(insp.vehicle_mileage).toLocaleString("nl-NL") + " km" : "—", true],
    ["Gem. km per jaar", ai.gem_km_per_jaar || kmPerJaar, true],
    ["Status in CRM", ai.status_crm || "Voorraad", false],
    ["Inkoopdatum", inkoopDatum, false],
    ["Inkoopprijs", inkoopPrijs, false],
    ["Kleur", ai.kleur || "—", false],
  ];
  const rowH = 22, labelW = 180;
  for (const [k, v, hl] of rows) {
    ensureSpace(ctx, rowH + 2);
    if (hl) drawBox(ctx, MARGIN, ctx.y - rowH + 4, CONTENT_W, rowH, YELLOW_ROW);
    drawHLine(ctx, MARGIN, ctx.y - rowH + 4, CONTENT_W, BORDER, 0.4);
    drawText(ctx, k, MARGIN + 8, ctx.y - 12, { bold: true, size: 9.5, color: NAVY });
    const lines = wrap(v, ctx.helv, 9.5, CONTENT_W - labelW - 16);
    drawText(ctx, lines[0] || "", MARGIN + labelW, ctx.y - 12, { size: 9.5 });
    ctx.y -= rowH;
  }
  drawHLine(ctx, MARGIN, ctx.y + 4, CONTENT_W, BORDER, 0.4);
  ctx.y -= 10;
}

function drawCategorieBlok(ctx: Ctx, analysis: any) {
  const ai = analysis.auto_info || {};
  const cat = ai.categorie || "C";
  const titel = ai.categorie_titel || "";
  const normLines: string[] = Array.isArray(ai.categorie_norm_lines) ? ai.categorie_norm_lines : [];

  drawSectionTitle(ctx, "STAAT BEOORDELING — REALISM FILTER");

  const boxH = Math.max(140, 50 + normLines.length * 14 + (titel ? 30 : 0));
  ensureSpace(ctx, boxH + 10);
  const top = ctx.y;
  const leftW = 110;
  // Green category strip
  drawBox(ctx, MARGIN, top - boxH, leftW, boxH, GREEN_CAT);
  // Yellow content box + orange border
  drawBox(ctx, MARGIN + leftW, top - boxH, CONTENT_W - leftW, boxH, YELLOW_BOX);
  drawBox(ctx, MARGIN + leftW, top - boxH, 4, boxH, ORANGE);

  // Category text centered
  drawText(ctx, "CATEGORIE", MARGIN + 14, top - boxH / 2 + 6, { bold: true, size: 13, color: WHITE });
  drawText(ctx, cat, MARGIN + 47, top - boxH / 2 - 12, { bold: true, size: 22, color: WHITE });

  let cy = top - 20;
  if (titel) {
    const tLines = wrap(titel, ctx.bold, 10.5, CONTENT_W - leftW - 28);
    for (const l of tLines) { drawText(ctx, l, MARGIN + leftW + 16, cy, { bold: true, size: 10.5 }); cy -= 14; }
    cy -= 6;
  }
  for (const line of normLines) {
    const ll = wrap(line, ctx.helv, 9.5, CONTENT_W - leftW - 28);
    for (let i = 0; i < ll.length; i++) {
      drawText(ctx, (i === 0 ? "• " : "  ") + ll[i], MARGIN + leftW + 16, cy, { size: 9.5 });
      cy -= 13;
    }
  }
  ctx.y = top - boxH - 14;
}

function drawSamenvattingTeam(ctx: Ctx, analysis: any) {
  drawSectionTitle(ctx, "SAMENVATTING VOOR INNAME TEAM");
  const text = analysis.samenvatting_team || "—";
  const innerW = CONTENT_W - 24;
  const lines = wrap(text, ctx.helv, 10, innerW);
  const boxH = lines.length * 14 + 20;
  ensureSpace(ctx, boxH + 6);
  const top = ctx.y;
  drawBox(ctx, MARGIN, top - boxH, CONTENT_W, boxH, YELLOW_BOX);
  drawBox(ctx, MARGIN, top - boxH, 4, boxH, ORANGE);
  let cy = top - 14;
  for (const l of lines) { drawText(ctx, l, MARGIN + 14, cy, { size: 10 }); cy -= 14; }
  ctx.y = top - boxH - 10;
}

// ----------------- SCHADE DETAIL -----------------
async function drawDamage(ctx: Ctx, d: any, images: { name: string; b64: string }[]) {
  ensureSpace(ctx, 60);
  // Red header
  const headH = 24;
  drawBox(ctx, MARGIN, ctx.y - headH, CONTENT_W, headH, RED_DMG);
  drawText(ctx, `SCHADE ${d.id || "S?"} — ${d.locatie || ""}`, MARGIN + 10, ctx.y - 16, { bold: true, size: 11, color: WHITE });
  const kosten = `€ ${formatEuro(d.kosten_min ?? d.geschatte_kosten_min ?? 0)} — € ${formatEuro(d.kosten_max ?? d.geschatte_kosten_max ?? 0)}`;
  const kw = ctx.bold.widthOfTextAtSize(kosten, 11);
  drawText(ctx, kosten, MARGIN + CONTENT_W - kw - 12, ctx.y - 16, { bold: true, size: 11, color: WHITE });
  ctx.y -= headH + 10;

  // Overview photo
  if (d.frame_referentie) {
    drawText(ctx, d.frame_caption_label || "Overzichtsfoto (uit video):", MARGIN, ctx.y - 11, { bold: true, size: 9.5 });
    ctx.y -= 16;
    await embedFrame(ctx, d.frame_referentie, images, 200);
    if (d.frame_caption) {
      drawWrappedText(ctx, d.frame_caption, { size: 9, color: GREY_HEAD });
    }
  }
  // Close-up photo
  if (d.closeup_frame_referentie) {
    ensureSpace(ctx, 40);
    drawText(ctx, "Detailfoto (ingezoomd op schade):", MARGIN, ctx.y - 11, { bold: true, size: 9.5 });
    ctx.y -= 16;
    await embedFrame(ctx, d.closeup_frame_referentie, images, 160);
    if (d.closeup_caption) {
      drawWrappedText(ctx, d.closeup_caption, { size: 9, color: GREY_HEAD });
    }
  }

  // Details table
  const detailRows: [string, string, boolean][] = [
    ["Locatie", d.locatie_detail || d.locatie || "—", false],
    ["Type schade", d.type_schade_text || prettyType(d.type), false],
    ["Ernst", d.ernst_text || cap(d.ernst), false],
    ["Geschatte afmeting", d.afmeting_text || (d.afmeting_cm ? `~${d.afmeting_cm} cm` : "—"), false],
    ["Diepte", d.diepte || "—", false],
    [`Realism check (${(analysis_cat(d) || "C")})`, d.realism_check || "—", true],
    ["In taxatierapport?", d.in_taxatierapport_text || (d.in_taxatierapport ? "Ja" : "Geen taxatierapport beschikbaar"), false],
    ["Prioriteit", d.prioriteit_text || cap(d.prioriteit), false],
    ["Claim potentieel", d.claim_potential_text || (d.claim_potential ? "Ja" : "Nee"), false],
  ];
  if (d.detectie_blok) {
    detailRows.splice(2, 0, ["Detectie-methode", prettyBlok(d.detectie_blok), false]);
  }
  drawKeyValueTable(ctx, detailRows);

  // Detectie-bewijs (wat Robin specifiek zag)
  if (d.detectie_bewijs) {
    ctx.y -= 6;
    ensureSpace(ctx, 30);
    drawText(ctx, "Wat Robin zag:", MARGIN, ctx.y - 11, { bold: true, size: 10 });
    ctx.y -= 16;
    drawWrappedText(ctx, d.detectie_bewijs, { size: 9.5, color: GREY_HEAD });
  }

  // Reparatie-ladder
  ctx.y -= 6;
  ensureSpace(ctx, 30);
  drawText(ctx, "Aanbevolen aanpak volgens Auto City reparatie-ladder:", MARGIN, ctx.y - 11, { bold: true, size: 10 });
  ctx.y -= 16;
  const ladder: any[] = Array.isArray(d.reparatie_ladder) ? d.reparatie_ladder : [];
  drawLadderTable(ctx, ladder);
  ctx.y -= 16;
}

function analysis_cat(d: any): string | null {
  return d.realism_categorie || null;
}

function prettyBlok(blok: string): string {
  const map: Record<string, string> = {
    A_deuk: "Blok A — deuk via reflectie-vervorming",
    B_kras: "Blok B — kras via kleur/contrast",
    C_steenslag: "Blok C — steenslag via puntsgewijs contrast",
    D_lakschade: "Blok D — lakschade/scuff via vlekkig contrast",
    E_glas: "Blok E — glas/verlichting visueel",
    F_velg: "Blok F — velgen/banden (excessief)",
    G_trim: "Blok G — trim/aanbouw direct zichtbaar",
  };
  return map[blok] || blok;
}

async function embedFrame(ctx: Ctx, frameRef: string, images: { name: string; b64: string }[], maxH: number) {
  const img = images.find((im) => im.name === frameRef);
  if (!img) {
    drawText(ctx, `[Frame ${frameRef} niet gevonden]`, MARGIN, ctx.y - 12, { size: 9, italic: true, color: MUTED });
    ctx.y -= 16; return;
  }
  try {
    const bytes = Uint8Array.from(atob(img.b64), (c) => c.charCodeAt(0));
    const emb = await ctx.pdf.embedJpg(bytes);
    const ratio = emb.width / emb.height;
    let w = CONTENT_W, h = w / ratio;
    if (h > maxH) { h = maxH; w = h * ratio; }
    ensureSpace(ctx, h + 6);
    ctx.page.drawImage(emb, { x: MARGIN, y: ctx.y - h, width: w, height: h });
    ctx.y -= h + 6;
  } catch (e) {
    console.warn("[robin] embed failed", e);
    drawText(ctx, `[Frame embed error]`, MARGIN, ctx.y - 12, { size: 9, italic: true, color: MUTED });
    ctx.y -= 16;
  }
}

function drawKeyValueTable(ctx: Ctx, rows: [string, string, boolean][]) {
  const rowH = 20, labelW = 180;
  drawHLine(ctx, MARGIN, ctx.y, CONTENT_W, BORDER, 0.4);
  for (const [k, v, hl] of rows) {
    ensureSpace(ctx, rowH + 2);
    const top = ctx.y;
    if (hl) drawBox(ctx, MARGIN, top - rowH, CONTENT_W, rowH, YELLOW_ROW);
    drawText(ctx, k, MARGIN + 8, top - 13, { bold: true, size: 9.5, color: NAVY });
    const vl = wrap(v, ctx.helv, 9.5, CONTENT_W - labelW - 16);
    drawText(ctx, vl[0] || "", MARGIN + labelW, top - 13, { size: 9.5 });
    ctx.y -= rowH;
    drawHLine(ctx, MARGIN, ctx.y, CONTENT_W, BORDER, 0.4);
  }
}

function drawLadderTable(ctx: Ctx, rows: any[]) {
  const cols = [
    { key: "nr", w: 28, label: "#", align: "left" as const },
    { key: "methode", w: 130, label: "METHODE", align: "left" as const },
    { key: "kans", w: 170, label: "KANS OP RESULTAAT", align: "left" as const },
    { key: "kosten", w: 75, label: "KOSTEN", align: "left" as const },
    { key: "aanbeveling", w: CONTENT_W - 28 - 130 - 170 - 75, label: "AANBEVELING", align: "left" as const },
  ];
  const headH = 22, rowH = 22;
  ensureSpace(ctx, headH + (rows.length || 1) * rowH + 6);
  // header
  const top = ctx.y;
  drawBox(ctx, MARGIN, top - headH, CONTENT_W, headH, GREY_HEAD);
  let cx = MARGIN;
  for (const c of cols) {
    drawText(ctx, c.label, cx + 8, top - 14, { bold: true, size: 9, color: WHITE });
    cx += c.w;
  }
  ctx.y -= headH;

  for (const r of rows) {
    ensureSpace(ctx, rowH + 2);
    const rt = ctx.y;
    const hl = (r.highlight || "").toLowerCase();
    if (hl === "groen") drawBox(ctx, MARGIN, rt - rowH, CONTENT_W, rowH, GREEN_CELL);
    else if (hl === "geel") drawBox(ctx, MARGIN, rt - rowH, CONTENT_W, rowH, YELLOW_BOX);
    cx = MARGIN;
    for (const c of cols) {
      const val = String(r[c.key] ?? "");
      const isAanb = c.key === "aanbeveling";
      drawText(ctx, val, cx + 8, rt - 14, { size: 9, bold: isAanb && (hl === "groen" || hl === "geel") });
      cx += c.w;
    }
    ctx.y -= rowH;
    drawHLine(ctx, MARGIN, ctx.y, CONTENT_W, BORDER, 0.4);
  }
}

// ----------------- INSPECTIE OVERZICHT -----------------
function drawInspectieTable(ctx: Ctx, rows: any[]) {
  const cols = [
    { key: "onderdeel", w: 180, label: "ONDERDEEL" },
    { key: "status", w: 90, label: "STATUS" },
    { key: "opmerking", w: CONTENT_W - 180 - 90, label: "OPMERKING" },
  ];
  const headH = 22, rowH = 18;
  ensureSpace(ctx, headH + 6);
  const top = ctx.y;
  drawBox(ctx, MARGIN, top - headH, CONTENT_W, headH, NAVY);
  let cx = MARGIN;
  for (const c of cols) { drawText(ctx, c.label, cx + 8, top - 14, { bold: true, size: 9, color: WHITE }); cx += c.w; }
  ctx.y -= headH;

  for (const r of rows) {
    ensureSpace(ctx, rowH + 2);
    const rt = ctx.y;
    const isSchade = String(r.status || "").toUpperCase().includes("SCHADE");
    if (isSchade) drawBox(ctx, MARGIN, rt - rowH, CONTENT_W, rowH, RED_ROW);
    cx = MARGIN;
    drawText(ctx, String(r.onderdeel || "—"), cx + 8, rt - 12, { size: 9, bold: isSchade, color: isSchade ? RED_DMG : TEXT });
    cx += cols[0].w;
    drawText(ctx, "■ " + String(r.status || "OK"), cx + 8, rt - 12, { size: 9, bold: isSchade });
    cx += cols[1].w;
    const opm = String(r.opmerking || "").slice(0, 90);
    drawText(ctx, opm, cx + 8, rt - 12, { size: 9, bold: isSchade, color: isSchade ? RED_DMG : TEXT });
    ctx.y -= rowH;
    drawHLine(ctx, MARGIN, ctx.y, CONTENT_W, BORDER, 0.3);
  }
}

function drawCalloutBox(ctx: Ctx, label: string, text: string, bg: any, border: any) {
  const innerW = CONTENT_W - 24;
  const full = label + text;
  const lines = wrap(full, ctx.helv, 9.5, innerW);
  const h = lines.length * 13 + 18;
  ensureSpace(ctx, h + 4);
  const top = ctx.y;
  drawBox(ctx, MARGIN, top - h, CONTENT_W, h, bg);
  drawBox(ctx, MARGIN, top - h, 4, h, border);
  let cy = top - 14;
  // bold label inline
  const labelW = ctx.bold.widthOfTextAtSize(label, 9.5);
  drawText(ctx, label, MARGIN + 14, cy, { bold: true, size: 9.5 });
  // first line remainder
  let remaining = text;
  let firstLine = wrap(remaining, ctx.helv, 9.5, innerW - labelW)[0] || "";
  drawText(ctx, firstLine, MARGIN + 14 + labelW, cy, { size: 9.5 });
  cy -= 13;
  remaining = remaining.slice(firstLine.length).trim();
  const rest = wrap(remaining, ctx.helv, 9.5, innerW);
  for (const l of rest) { drawText(ctx, l, MARGIN + 14, cy, { size: 9.5 }); cy -= 13; }
  ctx.y = top - h - 6;
}

function drawBulletBox(ctx: Ctx, label: string, items: string[]) {
  const innerW = CONTENT_W - 28;
  let totalH = 20 + (label ? 16 : 0);
  const wrapped = items.map((it) => wrap(it, ctx.helv, 9.5, innerW - 12));
  for (const w of wrapped) totalH += w.length * 13;
  ensureSpace(ctx, totalH + 6);
  const top = ctx.y;
  drawBox(ctx, MARGIN, top - totalH, CONTENT_W, totalH, YELLOW_BOX);
  drawBox(ctx, MARGIN, top - totalH, 4, totalH, ORANGE);
  let cy = top - 14;
  if (label) { drawText(ctx, label, MARGIN + 14, cy, { bold: true, size: 9.5 }); cy -= 16; }
  for (let i = 0; i < items.length; i++) {
    const ll = wrapped[i];
    for (let j = 0; j < ll.length; j++) {
      drawText(ctx, (j === 0 ? "• " : "  ") + ll[j], MARGIN + 14, cy, { size: 9.5 });
      cy -= 13;
    }
  }
  ctx.y = top - totalH - 8;
}

// ----------------- KOSTEN + CLAIM + STAPPEN -----------------
function drawKostenTable(ctx: Ctx, rows: any[], totMin: number, totMax: number) {
  const cols = [
    { key: "actie", w: 230, label: "ACTIE" },
    { key: "aantal", w: 90, label: "AANTAL" },
    { key: "kosten_per_stuk", w: 110, label: "KOSTEN PER STUK" },
    { key: "totaal", w: CONTENT_W - 230 - 90 - 110, label: "TOTAAL" },
  ];
  const headH = 22, rowH = 22;
  ensureSpace(ctx, headH + (rows.length + 1) * rowH + 4);
  const top = ctx.y;
  drawBox(ctx, MARGIN, top - headH, CONTENT_W, headH, NAVY);
  let cx = MARGIN;
  for (const c of cols) { drawText(ctx, c.label, cx + 8, top - 14, { bold: true, size: 9, color: WHITE }); cx += c.w; }
  ctx.y -= headH;

  for (const r of rows) {
    ensureSpace(ctx, rowH + 2);
    const rt = ctx.y;
    cx = MARGIN;
    for (const c of cols) {
      drawText(ctx, String(r[c.key] ?? "—"), cx + 8, rt - 14, { size: 9.5 });
      cx += c.w;
    }
    ctx.y -= rowH;
    drawHLine(ctx, MARGIN, ctx.y, CONTENT_W, BORDER, 0.3);
  }
  // Totaal bar
  ensureSpace(ctx, 28);
  const tt = ctx.y;
  drawBox(ctx, MARGIN, tt - 26, CONTENT_W, 26, NAVY);
  drawText(ctx, "TOTALE GESCHATTE KOSTEN", MARGIN + 10, tt - 17, { bold: true, size: 10.5, color: WHITE });
  const tot = `€ ${formatEuro(totMin)} — € ${formatEuro(totMax)}`;
  const tw = ctx.bold.widthOfTextAtSize(tot, 11);
  drawText(ctx, tot, MARGIN + CONTENT_W - tw - 12, tt - 17, { bold: true, size: 11, color: WHITE });
  ctx.y -= 30;
}

function drawClaimBox(ctx: Ctx, claim: any) {
  const aanbevolen = !!claim.aanbevolen;
  const titel = claim.titel || (aanbevolen ? "CLAIM AANBEVELING: JA — claim indienen" : "CLAIM AANBEVELING: NEE — geen claim indienen");
  const bg = aanbevolen ? YELLOW_BOX : GREEN_CELL;
  const border = aanbevolen ? ORANGE : GREEN_CAT;
  const text = claim.tekst || claim.onderbouwing || "";
  const wijclaim = claim.wijclaim_wel_bij || "";

  ensureSpace(ctx, 30);
  // Title bar
  const top = ctx.y;
  drawBox(ctx, MARGIN, top - 26, CONTENT_W, 26, bg);
  drawBox(ctx, MARGIN, top - 26, 4, 26, border);
  drawText(ctx, titel, MARGIN + 14, top - 17, { bold: true, size: 11, color: border });
  ctx.y -= 32;

  if (text) drawWrappedText(ctx, text, { size: 10 });
  if (wijclaim) {
    ctx.y -= 4;
    ensureSpace(ctx, 20);
    drawText(ctx, "Wij claimen WEL bij: ", MARGIN, ctx.y - 11, { bold: true, size: 10 });
    const lblW = ctx.bold.widthOfTextAtSize("Wij claimen WEL bij: ", 10);
    const first = wrap(wijclaim, ctx.helv, 10, CONTENT_W - lblW)[0] || "";
    drawText(ctx, first, MARGIN + lblW, ctx.y - 11, { size: 10 });
    ctx.y -= 13;
    const rest = wrap(wijclaim.slice(first.length).trim(), ctx.helv, 10, CONTENT_W);
    for (const l of rest) { ensureSpace(ctx, 14); drawText(ctx, l, MARGIN, ctx.y - 11, { size: 10 }); ctx.y -= 13; }
  }
}

function drawNumberedList(ctx: Ctx, items: string[]) {
  for (let i = 0; i < items.length; i++) {
    ensureSpace(ctx, 18);
    drawText(ctx, `${i + 1}.`, MARGIN + 6, ctx.y - 12, { bold: true, size: 10, color: NAVY });
    const lines = wrap(items[i], ctx.helv, 10, CONTENT_W - 40);
    for (let j = 0; j < lines.length; j++) {
      if (j > 0) { ensureSpace(ctx, 14); ctx.y -= 0; }
      drawText(ctx, lines[j], MARGIN + 36, ctx.y - 12, { size: 10 });
      ctx.y -= 14;
    }
    ctx.y -= 4;
  }
}

function drawCentralFooter(ctx: Ctx) {
  ensureSpace(ctx, 50);
  ctx.y -= 10;
  const lines = [
    "Dit rapport is automatisch gegenereerd door Robin (AI Inname Inspector). Realism filter toegepast op",
    "basis van leeftijd en kilometrage. Robin meldt bandenslijtage alleen wanneer visueel duidelijk zichtbaar —",
    "vervangt geen werkplaats controle.",
  ];
  for (const l of lines) { drawText(ctx, l, MARGIN, ctx.y - 11, { size: 8.5, italic: true, color: MUTED }); ctx.y -= 12; }
  ctx.y -= 6;
  const f1 = "Auto City Automotive Group B.V. — Thurledeweg 61A, 3044ER Rotterdam";
  const f2 = `Gegenereerd: ${new Date().toLocaleString("nl-NL")} — Robin v0.5 (proof of concept)`;
  const w1 = ctx.helv.widthOfTextAtSize(f1, 9);
  const w2 = ctx.helv.widthOfTextAtSize(f2, 9);
  drawText(ctx, f1, (PAGE_W - w1) / 2, ctx.y - 11, { size: 9 }); ctx.y -= 13;
  drawText(ctx, f2, (PAGE_W - w2) / 2, ctx.y - 11, { size: 9, color: MUTED });
}

// ----------------- utils -----------------
function formatEuro(n: any): string {
  const v = Number(n) || 0;
  return v.toLocaleString("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function prettyType(t?: string): string {
  if (!t) return "—";
  const map: Record<string, string> = {
    kras: "Kras", deuk: "Deuk", steenslag: "Steenslag", lakschade: "Lakschade",
    interieur: "Interieur", glas: "Glas", velg: "Velg", overig: "Overig",
  };
  return map[t] || t;
}
function cap(s?: string): string { return s ? s.charAt(0).toUpperCase() + s.slice(1) : "—"; }