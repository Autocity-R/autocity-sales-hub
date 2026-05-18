// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

// Brand colors
const NAVY = rgb(0x1f / 255, 0x38 / 255, 0x64 / 255);
const YELLOW = rgb(0xff / 255, 0xf3 / 255, 0xcd / 255);
const GREEN = rgb(0xd4 / 255, 0xed / 255, 0xda / 255);
const WHITE = rgb(1, 1, 1);
const TEXT = rgb(0.12, 0.12, 0.12);
const MUTED = rgb(0.45, 0.45, 0.45);

function parseClaudeResponse(text: string): any {
  try {
    let clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const first = clean.indexOf("{");
    const last = clean.lastIndexOf("}");
    if (first !== -1 && last !== -1) clean = clean.substring(first, last + 1);
    return JSON.parse(clean);
  } catch (e) {
    console.error("[robin] parse error", e);
    return null;
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
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

    // 1. Fetch inspection + agent prompt
    const { data: insp, error: inspErr } = await supabase
      .from("intake_inspections").select("*").eq("id", inspection_id).single();
    if (inspErr || !insp) throw new Error(`Inspectie niet gevonden: ${inspErr?.message}`);

    const { data: robin } = await supabase
      .from("ai_agents").select("system_prompt").eq("name", "Robin").maybeSingle();
    const systemPrompt = robin?.system_prompt || "Je bent Robin de inname inspector. Return JSON.";

    // 2. List frames
    const { data: filesList, error: listErr } = await supabase.storage
      .from("intake-frames").list(inspection_id, { limit: 100, sortBy: { column: "name", order: "asc" } });
    if (listErr) throw new Error(`Frames listen: ${listErr.message}`);
    const frameFiles = (filesList || []).filter(f => f.name.endsWith(".jpg")).sort((a, b) => a.name.localeCompare(b.name));
    if (frameFiles.length === 0) throw new Error("Geen frames gevonden");

    console.log(`[robin] ${frameFiles.length} frames`);

    // 3. Download frames as base64
    const images: { name: string; b64: string }[] = [];
    for (const f of frameFiles) {
      const { data: blob, error: dlErr } = await supabase.storage
        .from("intake-frames").download(`${inspection_id}/${f.name}`);
      if (dlErr || !blob) { console.warn(`[robin] skip ${f.name}: ${dlErr?.message}`); continue; }
      images.push({ name: f.name.replace(".jpg", ""), b64: await blobToBase64(blob) });
    }
    if (images.length === 0) throw new Error("Geen frames kunnen downloaden");

    // 4. Build Anthropic vision request
    const userContent: any[] = [];
    images.forEach((img) => {
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: img.b64 },
      });
      userContent.push({ type: "text", text: img.name });
    });
    userContent.push({
      type: "text",
      text: `\nVOERTUIG: ${insp.vehicle_brand ?? "?"} ${insp.vehicle_model ?? "?"}, bouwjaar ${insp.vehicle_year ?? "?"}, km-stand ${insp.vehicle_mileage ?? "?"}, kenteken ${insp.vehicle_license ?? "?"}.\n\nAnalyseer alle frames hierboven (frame-namen staan tussen de afbeeldingen) en geef je analyse als JSON volgens het OUTPUT FORMAT.`,
    });

    console.log(`[robin] calling Anthropic with ${images.length} images`);
    const anthRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
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

    // 5. Persist damages
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
        geschatte_kosten_min: d.geschatte_kosten_min ?? 0,
        geschatte_kosten_max: d.geschatte_kosten_max ?? 0,
        prioriteit: ["kritiek","hoog","midden","laag"].includes(d.prioriteit) ? d.prioriteit : "midden",
        in_taxatierapport: !!d.in_taxatierapport,
        claim_potential: !!d.claim_potential,
        redenering: d.redenering || null,
        frame_referentie: d.frame_referentie || null,
      }));
      const { error: dmgErr } = await supabase.from("intake_damages").insert(rows);
      if (dmgErr) console.error("[robin] damages insert error", dmgErr);
    }

    // 6. Update inspection with analysis summary
    const showroom = analysis.showroom_plan || {};
    const claim = analysis.claim_advies || {};
    const autoInfo = analysis.auto_info || {};

    await supabase.from("intake_inspections").update({
      status: "generating_pdf",
      categorie: ["A","B","C"].includes(autoInfo.categorie) ? autoInfo.categorie : null,
      categorie_reden: autoInfo.categorie_reden || null,
      totale_kosten_min: showroom.totale_kosten_min ?? 0,
      totale_kosten_max: showroom.totale_kosten_max ?? 0,
      schade_count: damages.length,
      claim_aanbevolen: !!claim.claim_aanbevolen,
      claim_waarde: claim.geschatte_claim_waarde_euro ?? 0,
      samenvatting_team: analysis.samenvatting_team || null,
      robin_analyse: analysis,
      taxatie_check_result: analysis.taxatie_check?.samenvatting || null,
    }).eq("id", inspection_id);

    // 7. Generate PDF
    console.log(`[robin] generating PDF`);
    const pdfBytes = await generatePdf(insp, analysis, damages, images, supabase);

    // 8. Upload PDF
    const pdfPath = `${inspection_id}.pdf`;
    const { error: upErr } = await supabase.storage.from("intake-reports").upload(pdfPath, pdfBytes, {
      contentType: "application/pdf", upsert: true,
    });
    if (upErr) throw new Error(`PDF upload: ${upErr.message}`);

    // 9. Signed URL (7 days)
    const { data: signed } = await supabase.storage.from("intake-reports").createSignedUrl(pdfPath, 60 * 60 * 24 * 7);
    const pdfUrl = signed?.signedUrl || "";

    // 10. vehicle_files row → toont in Documenten tab
    const reportName = `Robin Inname Rapport ${new Date().toLocaleDateString("nl-NL")}.pdf`;
    await supabase.from("vehicle_files").insert({
      vehicle_id: insp.vehicle_id,
      name: reportName,
      category: "inname_rapport",
      url: pdfUrl,
      file_path: `intake-reports/${pdfPath}`,
      metadata: { inspection_id, categorie: autoInfo.categorie, schade_count: damages.length },
    });

    // 11. Finalize
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
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============ PDF GENERATION ============
async function generatePdf(
  insp: any,
  analysis: any,
  damages: any[],
  images: { name: string; b64: string }[],
  supabase: any,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const W = 595; // A4
  const H = 842;
  const M = 40;

  const autoInfo = analysis.auto_info || {};
  const showroom = analysis.showroom_plan || {};
  const claim = analysis.claim_advies || {};
  const overzicht: any[] = analysis.inspectie_overzicht || [];

  // Helpers
  const drawText = (page: any, text: string, x: number, y: number, opts: any = {}) => {
    page.drawText(String(text ?? ""), { x, y, size: opts.size ?? 10, font: opts.bold ? bold : helv, color: opts.color ?? TEXT, ...opts });
  };
  const drawBox = (page: any, x: number, y: number, w: number, h: number, color: any) => {
    page.drawRectangle({ x, y, width: w, height: h, color });
  };
  const wrap = (text: string, maxChars: number): string[] => {
    const words = String(text || "").split(/\s+/);
    const lines: string[] = []; let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > maxChars) { if (cur) lines.push(cur); cur = w; }
      else cur = (cur + " " + w).trim();
    }
    if (cur) lines.push(cur);
    return lines;
  };

  // ===== PAGE 1: COVER =====
  const p1 = pdf.addPage([W, H]);
  drawBox(p1, 0, H - 80, W, 80, NAVY);
  drawText(p1, "ROBIN INNAME RAPPORT", M, H - 45, { size: 20, bold: true, color: WHITE });
  drawText(p1, "Auto City — AI Schade Inspectie", M, H - 65, { size: 10, color: WHITE });

  let y = H - 120;
  drawText(p1, `${insp.vehicle_brand ?? ""} ${insp.vehicle_model ?? ""}`, M, y, { size: 22, bold: true });
  y -= 22;
  drawText(p1, `Kenteken: ${insp.vehicle_license ?? "—"}`, M, y, { size: 11, color: MUTED });
  y -= 30;

  // Voertuiggegevens tabel
  drawText(p1, "VOERTUIGGEGEVENS", M, y, { bold: true, size: 12, color: NAVY }); y -= 18;
  const rows: [string, string, boolean][] = [
    ["Merk", String(insp.vehicle_brand ?? "—"), false],
    ["Model", String(insp.vehicle_model ?? "—"), false],
    ["Bouwjaar", String(insp.vehicle_year ?? "—"), true],
    ["Km-stand", insp.vehicle_mileage ? insp.vehicle_mileage.toLocaleString("nl-NL") + " km" : "—", true],
    ["Km per jaar", calcKmPerYear(insp.vehicle_year, insp.vehicle_mileage), true],
    ["Categorie", `${autoInfo.categorie ?? "—"} — ${autoInfo.categorie_reden ?? ""}`, false],
  ];
  for (const [k, v, hl] of rows) {
    if (hl) drawBox(p1, M, y - 4, W - 2 * M, 16, YELLOW);
    drawText(p1, k, M + 6, y, { bold: true });
    drawText(p1, v, M + 140, y);
    y -= 18;
  }

  y -= 16;
  // Samenvatting team — geel highlight
  drawText(p1, "SAMENVATTING VOOR HET TEAM", M, y, { bold: true, size: 12, color: NAVY }); y -= 16;
  const samenvLines = wrap(analysis.samenvatting_team || "Geen samenvatting beschikbaar.", 95);
  const samenvH = samenvLines.length * 13 + 16;
  drawBox(p1, M, y - samenvH + 8, W - 2 * M, samenvH, YELLOW);
  let sy = y;
  for (const line of samenvLines) { drawText(p1, line, M + 8, sy, { size: 10 }); sy -= 13; }
  y = sy - 16;

  // Kosten/claim blok
  drawText(p1, "TOTAAL KOSTENRAMING", M, y, { bold: true, size: 12, color: NAVY }); y -= 18;
  drawText(p1, `€ ${(showroom.totale_kosten_min ?? 0).toLocaleString("nl-NL")} – € ${(showroom.totale_kosten_max ?? 0).toLocaleString("nl-NL")}`, M, y, { size: 16, bold: true });
  drawText(p1, `Doorlooptijd: ${showroom.doorlooptijd_dagen ?? "?"} dagen · ${damages.length} schades`, M, y - 18, { size: 10, color: MUTED });

  if (claim.claim_aanbevolen) {
    y -= 50;
    drawBox(p1, M, y - 4, W - 2 * M, 28, rgb(1, 0.92, 0.7));
    drawText(p1, `⚠ CLAIM AANBEVOLEN: € ${(claim.geschatte_claim_waarde_euro ?? 0).toLocaleString("nl-NL")}`, M + 8, y + 8, { bold: true });
  }

  // ===== PAGE 2+: SCHADE DETAIL met embedded frames =====
  let curPage: any = null;
  let cy = 0;

  const ensurePage = (minSpace: number) => {
    if (!curPage || cy - minSpace < M) {
      curPage = pdf.addPage([W, H]);
      drawBox(curPage, 0, H - 40, W, 40, NAVY);
      drawText(curPage, "SCHADE DETAIL", M, H - 26, { size: 14, bold: true, color: WHITE });
      cy = H - 60;
    }
  };

  if (damages.length === 0) {
    ensurePage(40);
    drawText(curPage, "Geen schades gerapporteerd.", M, cy);
  } else {
    for (const d of damages) {
      ensurePage(220);
      // Header
      drawBox(curPage, M, cy - 4, W - 2 * M, 22, NAVY);
      drawText(curPage, `${d.id || ""} · ${d.locatie || ""}`, M + 8, cy + 4, { bold: true, color: WHITE, size: 11 });
      drawText(curPage, `${(d.type || "").toUpperCase()} · ${d.ernst || ""}`, W - M - 130, cy + 4, { color: WHITE, size: 10 });
      cy -= 30;

      // Frame screenshot
      const frameImg = images.find(im => im.name === d.frame_referentie);
      if (frameImg) {
        try {
          const imgBytes = Uint8Array.from(atob(frameImg.b64), c => c.charCodeAt(0));
          const embedded = await pdf.embedJpg(imgBytes);
          const imgW = (W - 2 * M);
          const imgH = imgW * (embedded.height / embedded.width);
          const maxH = 180;
          const finalH = Math.min(imgH, maxH);
          const finalW = finalH * (embedded.width / embedded.height);
          curPage.drawImage(embedded, { x: M, y: cy - finalH, width: finalW, height: finalH });
          cy -= finalH + 8;
        } catch (e) {
          console.warn("[robin] embed frame failed", e);
        }
      }

      // Details
      drawText(curPage, `Actie: ${d.aanbevolen_actie || "—"}`, M, cy, { bold: true }); cy -= 14;
      drawText(curPage, `Kosten: € ${(d.geschatte_kosten_min ?? 0).toLocaleString("nl-NL")} – € ${(d.geschatte_kosten_max ?? 0).toLocaleString("nl-NL")}  ·  Prioriteit: ${d.prioriteit || "—"}${d.claim_potential ? "  ·  CLAIM" : ""}`, M, cy); cy -= 14;
      if (d.redenering) {
        for (const line of wrap(d.redenering, 95)) { ensurePage(14); drawText(curPage, line, M, cy, { size: 9, color: MUTED }); cy -= 12; }
      }
      cy -= 14;
    }
  }

  // ===== PAGE: INSPECTIE OVERZICHT =====
  const p3 = pdf.addPage([W, H]);
  drawBox(p3, 0, H - 40, W, 40, NAVY);
  drawText(p3, "INSPECTIE OVERZICHT", M, H - 26, { size: 14, bold: true, color: WHITE });
  let oy = H - 60;
  drawText(p3, "Onderdeel", M + 4, oy, { bold: true, size: 10 });
  drawText(p3, "Status", M + 220, oy, { bold: true, size: 10 });
  drawText(p3, "Opmerking", M + 300, oy, { bold: true, size: 10 });
  oy -= 14;
  for (const item of overzicht) {
    if (oy < M + 20) break;
    const isSchade = item.status === "SCHADE";
    if (isSchade) drawBox(p3, M, oy - 3, W - 2 * M, 14, rgb(1, 0.93, 0.93));
    drawText(p3, item.onderdeel || "—", M + 4, oy, { size: 9 });
    drawText(p3, item.status || "—", M + 220, oy, { size: 9, bold: isSchade });
    drawText(p3, (item.opmerking || "").slice(0, 50), M + 300, oy, { size: 9, color: MUTED });
    oy -= 14;
  }

  // ===== PAGE: CLAIM + KOSTEN =====
  const p4 = pdf.addPage([W, H]);
  drawBox(p4, 0, H - 40, W, 40, NAVY);
  drawText(p4, "SHOWROOM PLAN & CLAIM", M, H - 26, { size: 14, bold: true, color: WHITE });
  let py = H - 70;

  drawText(p4, "Totale kosten", M, py, { bold: true, size: 12, color: NAVY }); py -= 18;
  drawBox(p4, M, py - 4, W - 2 * M, 24, GREEN);
  drawText(p4, `€ ${(showroom.totale_kosten_min ?? 0).toLocaleString("nl-NL")} – € ${(showroom.totale_kosten_max ?? 0).toLocaleString("nl-NL")}   ·   ${showroom.doorlooptijd_dagen ?? "?"} dagen doorlooptijd`, M + 8, py + 6, { bold: true });
  py -= 38;

  const planning = showroom.planning_per_discipline || {};
  drawText(p4, "Planning per discipline", M, py, { bold: true, size: 12, color: NAVY }); py -= 16;
  for (const [disc, ids] of Object.entries(planning)) {
    const arr = Array.isArray(ids) ? ids : [];
    if (arr.length === 0) continue;
    drawText(p4, `${disc}:`, M, py, { bold: true, size: 10 });
    drawText(p4, arr.join(", "), M + 110, py, { size: 10 });
    py -= 14;
  }

  py -= 14;
  if (claim.claim_aanbevolen) {
    drawText(p4, "Claim advies", M, py, { bold: true, size: 12, color: NAVY }); py -= 16;
    drawBox(p4, M, py - 60, W - 2 * M, 70, YELLOW);
    drawText(p4, `Aanbevolen claim: € ${(claim.geschatte_claim_waarde_euro ?? 0).toLocaleString("nl-NL")}`, M + 8, py - 2, { bold: true });
    let cyy = py - 18;
    for (const line of wrap(claim.onderbouwing || "", 95)) { drawText(p4, line, M + 8, cyy, { size: 9 }); cyy -= 12; if (cyy < py - 55) break; }
    py -= 80;
    drawText(p4, `Te claimen schades: ${(claim.te_claimen_schades || []).join(", ")}`, M, py, { size: 9, color: MUTED });
  } else {
    drawText(p4, "Geen claim aanbevolen.", M, py, { size: 10, color: MUTED });
  }

  // Footer op alle pagina's
  const pages = pdf.getPages();
  pages.forEach((p, idx) => {
    p.drawText(`Robin AI · Auto City · ${new Date().toLocaleDateString("nl-NL")}`, { x: M, y: 20, size: 8, font: helv, color: MUTED });
    p.drawText(`Pagina ${idx + 1} / ${pages.length}`, { x: W - M - 60, y: 20, size: 8, font: helv, color: MUTED });
  });

  return await pdf.save();
}

function calcKmPerYear(year: any, mileage: any): string {
  if (!year || !mileage) return "—";
  const age = Math.max(1, new Date().getFullYear() - Number(year));
  return Math.round(Number(mileage) / age).toLocaleString("nl-NL") + " km/jaar";
}