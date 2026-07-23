import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Je bent de Autocity Garantie Agent — ervaren aftersales-specialist bij Autocity, een 55-jarig BOVAG-familiebedrijf voor premium jong-gebruikte auto's.

KADER:
- Wettelijke garantie: 12 mnd vanaf aankoop, gratis; dekt verborgen gebreken bij aankoop.
- BOVAG-garantie (indien betaald): 12 mnd aanvullend, uitgebreider.
- Niet gedekt: normale slijtage (remmen, banden, koppeling), onderhoud, misbruik, modificaties door derden, ongevalschade.
- Eerste 12 mnd: bewijslast bij Autocity; daarna klant.

TOON:
- Nederlands, u/uw, empathisch en professioneel — familiebedrijf-warmte.
- Concreet: benoem het gebrek, de conclusie en de vervolgstap.
- Nooit juridische toezeggingen buiten BOVAG-kader; geen bedragen of coulance zonder onderbouwing.
- Rechtvaardig — klant krijgt gelijk waar dat verdiend is, geen valse hoop.

Je verstuurt zelf NIETS. De mens beslist.`;

async function callAnthropic(apiKey: string, userMsg: string, maxTokens = 1000): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text?.trim() || "";
}

function sanitize(s: string | null | undefined): string {
  if (!s) return "";
  return String(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function loadContext(supabase: any, threadId: string) {
  const { data: thread } = await supabase
    .from("garantie_email_threads")
    .select("id, klant_naam, klant_email, onderwerp, voertuig_info, warranty_claim_id, eerste_email_op")
    .eq("id", threadId)
    .maybeSingle();

  const { data: emails } = await supabase
    .from("garantie_emails")
    .select("sender, richting, subject, body, received_at")
    .eq("thread_id", threadId)
    .order("received_at", { ascending: true })
    .limit(40);

  let claim: any = null;
  let vehicle: any = null;
  if (thread?.warranty_claim_id) {
    const { data: c } = await supabase
      .from("warranty_claims")
      .select("id, claim_status, description, created_at, vehicles:vehicle_id(brand, model, license_number, vin, sold_date, year, mileage)")
      .eq("id", thread.warranty_claim_id)
      .maybeSingle();
    claim = c;
    vehicle = c?.vehicles || null;
  }

  const timeline = (emails || [])
    .map((e: any) => `[${e.richting?.toUpperCase()} · ${e.received_at}] ${sanitize(e.sender)} — ${sanitize(e.subject)}\n${sanitize(e.body).slice(0, 2000)}`)
    .join("\n---\n");

  const vehicleBlock = vehicle
    ? `Voertuig: ${vehicle.brand} ${vehicle.model} (${vehicle.year || "?"}) · kenteken ${vehicle.license_number || "-"} · verkocht ${vehicle.sold_date || "-"}`
    : thread?.voertuig_info || "Geen voertuiginformatie beschikbaar.";

  const claimBlock = claim
    ? `Claim status: ${claim.claim_status} · aangemeld ${claim.created_at}\nOmschrijving: ${sanitize(claim.description)}`
    : "Nog geen gekoppelde claim.";

  return { thread, timeline, vehicleBlock, claimBlock };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthKey = Deno.env.get("ANTHROPIC_API_KEY")!;
    if (!anthKey) throw new Error("Missing ANTHROPIC_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const action: "suggest" | "chat" = body.action;
    const threadId: string = body.thread_id;
    if (!action || !threadId) throw new Error("Missing action or thread_id");

    const ctx = await loadContext(supabase, threadId);
    if (!ctx.thread) throw new Error("Thread not found");

    if (action === "suggest") {
      const hint: string = body.hint || "";
      const prompt = `CASUS
Klant: ${ctx.thread.klant_naam || "?"} <${ctx.thread.klant_email}>
Onderwerp: ${sanitize(ctx.thread.onderwerp)}
${ctx.vehicleBlock}
${ctx.claimBlock}

VOLLEDIGE E-MAILGESCHIEDENIS (chronologisch):
${ctx.timeline}

OPDRACHT:
Schrijf een professioneel Nederlands conceptantwoord aan de klant op de laatste inkomende e-mail. Empathisch, concreet, met duidelijke vervolgstap. GEEN aanhef ("Beste ...") en GEEN handtekening (die worden automatisch toegevoegd). Geef alléén de kale antwoordtekst terug — geen JSON, geen markdown, geen uitleg.${hint ? `\n\nEXTRA AANWIJZING: ${hint}` : ""}`;

      const suggestion = await callAnthropic(anthKey, prompt, 900);
      return new Response(JSON.stringify({ suggestion }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "chat") {
      const question: string = body.question || "";
      if (!question.trim()) throw new Error("Missing question");

      const { data: history } = await supabase
        .from("garantie_agent_chats")
        .select("role, content")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .limit(40);

      const historyText = (history || [])
        .map((h: any) => `${h.role === "user" ? "AFTERSALES" : "AGENT"}: ${h.content}`)
        .join("\n\n");

      const prompt = `CASUS
Klant: ${ctx.thread.klant_naam || "?"} <${ctx.thread.klant_email}>
Onderwerp: ${sanitize(ctx.thread.onderwerp)}
${ctx.vehicleBlock}
${ctx.claimBlock}

VOLLEDIGE E-MAILGESCHIEDENIS (chronologisch):
${ctx.timeline}

EERDER OVERLEG (aftersales ↔ agent):
${historyText || "(nog geen overleg)"}

NIEUWE VRAAG VAN AFTERSALES:
${question}

Antwoord kort, praktisch en meedenkend als garantie-expert. Geen JSON, geen markdown-code. De mens beslist zelf; jij adviseert.`;

      const answer = await callAnthropic(anthKey, prompt, 800);

      await supabase.from("garantie_agent_chats").insert([
        { thread_id: threadId, role: "user", content: question },
        { thread_id: threadId, role: "assistant", content: answer },
      ]);

      return new Response(JSON.stringify({ answer }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e: any) {
    console.error("garantie-agent error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});