import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Je bent de Autocity Garantie Agent — ervaren aftersales-specialist bij Autocity, een 55-jarig BOVAG-familiebedrijf voor premium jong-gebruikte auto's.

JURIDISCH KADER (Nederland, consumentenkoop B2C):
- Non-conformiteit (art. 7:17 BW): de auto moet voldoen aan wat de koper redelijkerwijs mocht verwachten, gelet op leeftijd, kilometerstand, prijs en wat is besproken.
- Bewijsvermoeden (art. 7:18a BW): bij een gebrek dat zich binnen 12 maanden na levering openbaart, wordt vermoed dat het er bij levering al was — de bewijslast ligt dan bij Autocity. Na 12 maanden ligt de bewijslast bij de klant.
- Wettelijke conformiteit is niet dezelfde als een garantiepakket: ook zonder BOVAG-pakket kan Autocity aansprakelijk zijn.
- BOVAG-garantie (indien afgenomen): aanvullend en uitgebreider dan het wettelijke minimum; benoem dit alleen als het dossier het bevestigt.
- Bij B2B-verkoop (handelaar/zakelijk, vaak "geen garantie") gelden de consumentenregels niet.
- Niet gedekt: normale slijtage (remmen, banden, koppeling, uitlaat), achterstallig of regulier onderhoud, misbruik, modificaties door derden, ongevalschade, gebreken die na levering door de klant zijn veroorzaakt.
- Herstel gaat vóór ontbinding/prijsvermindering; klant moet Autocity eerst gelegenheid tot herstel geven.

WERKWIJZE:
- Gebruik ALTIJD het meegeleverde dossier: klant, voertuig, verkoopdatum, leeftijd van de auto sinds levering, eerdere claims, werkplaatshistorie en eerdere mails.
- Reken expliciet met de termijn: hoeveel maanden na levering speelt het gebrek? Benoem de gevolgen voor bewijslast.
- Wees rechtvaardig: gelijk waar dat verdiend is, duidelijk "nee" waar geen recht bestaat — nooit valse hoop, nooit toezeggingen zonder onderbouwing.
- Als informatie ontbreekt (bv. onbekende verkoopdatum), benoem dat als aanname en vraag om wat je mist.

TOON:
- Nederlands, u/uw, empathisch en professioneel — familiebedrijf-warmte.
- Concreet: gebrek → conclusie → vervolgstap.

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
      model: "claude-sonnet-4-6",
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

function monthsBetween(from: string | null | undefined, to = new Date()): number | null {
  if (!from) return null;
  const d = new Date(from);
  if (isNaN(d.getTime())) return null;
  return Math.max(0, Math.round((to.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
}

function findPlate(text: string): string | null {
  const m = text.toUpperCase().match(/\b[A-Z0-9]{1,3}-?[A-Z0-9]{1,3}-?[A-Z0-9]{1,3}\b/g);
  if (!m) return null;
  const cand = m.find((x) => x.replace(/-/g, "").length === 6 && /\d/.test(x) && /[A-Z]/.test(x));
  return cand ? cand.replace(/-/g, "") : null;
}

/** Tijdsafhankelijke Nederlandse aanhef (Europe/Amsterdam). */
function dutchGreeting(name?: string | null): string {
  const hour = Number(
    new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", hour: "2-digit", hour12: false })
      .format(new Date()),
  );
  const deel = hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";
  const clean = String(name || "").replace(/[<>]/g, "").trim();
  const last = clean ? clean.split(/\s+/).slice(-1)[0] : "";
  const usable = last && !/@/.test(last) && last.length > 1 ? last : "";
  return usable ? `${deel} heer ${usable},` : `${deel},`;
}

async function loadContext(supabase: any, threadId: string) {
  const { data: thread } = await supabase
    .from("garantie_email_threads")
    .select("id, klant_naam, klant_email, onderwerp, voertuig_info, vehicle_id, warranty_claim_id, eerste_email_op, case_samenvatting, garantie_type")
    .eq("id", threadId)
    .maybeSingle();

  const { data: emails } = await supabase
    .from("garantie_emails")
    .select("id, sender, richting, subject, body, received_at, sara_beslissing")
    .eq("thread_id", threadId)
    .order("received_at", { ascending: true })
    .limit(40);

  // ── Klantherkenning ──
  let contact: any = null;
  if (thread?.klant_email) {
    const { data: c } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, company_name, email, phone, is_car_dealer, address_city, created_at")
      .ilike("email", thread.klant_email)
      .limit(1)
      .maybeSingle();
    contact = c;
  }

  // ── Claim ──
  let claim: any = null;
  if (thread?.warranty_claim_id) {
    const { data: c } = await supabase
      .from("warranty_claims")
      .select("id, claim_status, description, created_at, claim_amount, vehicle_id, customer_id, manual_license_number, manual_vehicle_brand, manual_vehicle_model")
      .eq("id", thread.warranty_claim_id)
      .maybeSingle();
    claim = c;
  }

  // ── Voertuig: via claim → via kenteken in tekst → via klant ──
  let vehicle: any = null;
  let vehicleConfirmed = false;
  const vehicleSelect = "id, brand, model, year, mileage, license_number, vin, sold_date, status, customer_id, branch";
  // 1) Handmatig gekoppeld voertuig op de thread = vaststaand feit
  if (thread?.vehicle_id) {
    const { data: v } = await supabase.from("vehicles").select(vehicleSelect).eq("id", thread.vehicle_id).maybeSingle();
    if (v) { vehicle = v; vehicleConfirmed = true; }
  }
  if (!vehicle && claim?.vehicle_id) {
    const { data: v } = await supabase.from("vehicles").select(vehicleSelect).eq("id", claim.vehicle_id).maybeSingle();
    vehicle = v;
  }
  if (!vehicle) {
    const haystack = `${thread?.voertuig_info || ""} ${thread?.onderwerp || ""} ${(emails || []).map((e: any) => `${e.subject} ${e.body}`).join(" ")}`;
    const plate = claim?.manual_license_number?.replace(/-/g, "").toUpperCase() || findPlate(sanitize(haystack));
    if (plate) {
      const { data: vs } = await supabase.from("vehicles").select(vehicleSelect).limit(400);
      vehicle = (vs || []).find((v: any) => (v.license_number || "").replace(/-/g, "").toUpperCase() === plate) || null;
    }
  }
  if (!vehicle && contact?.id) {
    const { data: vs } = await supabase
      .from("vehicles").select(vehicleSelect)
      .eq("customer_id", contact.id)
      .order("sold_date", { ascending: false })
      .limit(1);
    vehicle = vs?.[0] || null;
  }

  // ── Eerdere claims op dit voertuig / deze klant ──
  let earlierClaims: any[] = [];
  if (vehicle?.id || contact?.id) {
    let q = supabase
      .from("warranty_claims")
      .select("id, claim_status, description, created_at, claim_amount, resolution_description, resolution_date")
      .order("created_at", { ascending: false })
      .limit(10);
    q = vehicle?.id ? q.eq("vehicle_id", vehicle.id) : q.eq("customer_id", contact.id);
    const { data } = await q;
    earlierClaims = (data || []).filter((c: any) => c.id !== claim?.id);
  }

  // ── Werkplaatshistorie ──
  let workOrders: any[] = [];
  if (vehicle?.id) {
    const { data } = await supabase
      .from("work_orders")
      .select("id, discipline, status, description, created_at, finished_at, source")
      .eq("vehicle_id", vehicle.id)
      .order("created_at", { ascending: false })
      .limit(15);
    workOrders = data || [];
  }

  // ── Vaste kennis/afspraken uit agent_memory ──
  const { data: memories } = await supabase
    .from("agent_memory")
    .select("type, onderwerp, inhoud")
    .in("agent_name", ["garantie", "sara", "garantie-agent"])
    .eq("actief", true)
    .limit(30);

  const timeline = (emails || [])
    .map((e: any) => `[${e.richting?.toUpperCase()} · ${e.received_at}] ${sanitize(e.sender)} — ${sanitize(e.subject)}\n${sanitize(e.body).slice(0, 2000)}`)
    .join("\n---\n");

  const monthsSinceSale = monthsBetween(vehicle?.sold_date);
  const warrantyBlock = (() => {
    if (!vehicle) return "Garantiestatus: onbekend — geen voertuig gekoppeld, verkoopdatum niet vast te stellen.";
    if (monthsSinceSale === null) return `Garantiestatus: verkoopdatum onbekend voor ${vehicle.brand} ${vehicle.model}; termijn niet te berekenen.`;
    const b2b = String(vehicle.status || "").includes("b2b") || contact?.is_car_dealer;
    const lines = [
      `Levering/verkoopdatum: ${vehicle.sold_date} (± ${monthsSinceSale} maanden geleden).`,
      monthsSinceSale <= 12
        ? "Binnen 12 maanden na levering → wettelijk bewijsvermoeden (art. 7:18a BW): bewijslast bij Autocity."
        : "Meer dan 12 maanden na levering → bewijslast ligt bij de klant; beoordeel op non-conformiteit naar leeftijd/km-stand.",
      b2b ? "LET OP: dit lijkt een zakelijke/B2B-verkoop — consumentenbescherming geldt hier niet." : "Verkoop lijkt B2C (consument).",
    ];
    return `Garantiestatus:\n- ${lines.join("\n- ")}`;
  })();

  const vehicleBlock = vehicle
    ? `Voertuig: ${vehicle.brand} ${vehicle.model} (${vehicle.year || "?"}) · kenteken ${vehicle.license_number || "-"} · ${vehicle.mileage ?? "?"} km bij verkoop · status ${vehicle.status || "-"}`
    : thread?.voertuig_info || "Geen voertuiginformatie beschikbaar.";

  const customerBlock = contact
    ? `Klant in CRM: ${[contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.company_name || "-"}${contact.company_name ? ` (${contact.company_name})` : ""} · ${contact.email || "-"} · ${contact.phone || "-"}${contact.is_car_dealer ? " · AUTOBEDRIJF/handelaar" : ""} · klant sinds ${contact.created_at?.slice(0, 10) || "?"}`
    : `Klant niet gevonden in het CRM op e-mailadres ${thread?.klant_email || "-"}.`;

  const claimBlock = claim
    ? `Claim status: ${claim.claim_status} · aangemeld ${claim.created_at}${claim.claim_amount ? ` · bedrag € ${claim.claim_amount}` : ""}\nOmschrijving: ${sanitize(claim.description)}`
    : "Nog geen gekoppelde claim.";

  const earlierBlock = earlierClaims.length
    ? earlierClaims.map((c: any) => `- ${c.created_at?.slice(0, 10)} · ${c.claim_status} · ${sanitize(c.description).slice(0, 200)}${c.resolution_description ? ` → opgelost: ${sanitize(c.resolution_description).slice(0, 160)}` : ""}`).join("\n")
    : "Geen eerdere garantieclaims bekend.";

  const workBlock = workOrders.length
    ? workOrders.map((w: any) => `- ${w.created_at?.slice(0, 10)} · ${w.discipline || "werkorder"} · ${w.status}${w.source ? ` (${w.source})` : ""} · ${sanitize(w.description).slice(0, 160)}`).join("\n")
    : "Geen werkplaatshistorie bekend voor dit voertuig.";

  const memoryBlock = (memories || []).length
    ? (memories || []).map((m: any) => `- [${m.type}] ${m.onderwerp}: ${m.inhoud}`).join("\n")
    : "Geen extra vastgelegde afspraken.";

  const dossier = `KLANT
${customerBlock}
Onderwerp: ${sanitize(thread?.onderwerp)}

VOERTUIG
${vehicleBlock}

${warrantyBlock}

CLAIM
${claimBlock}

EERDERE CLAIMS
${earlierBlock}

WERKPLAATSHISTORIE
${workBlock}

VASTGELEGDE AFSPRAKEN/KENNIS
${memoryBlock}

VOLLEDIGE E-MAILGESCHIEDENIS (chronologisch):
${timeline}`;

  const lastIncomingId = [...(emails || [])].reverse().find((e: any) => e.richting === "inkomend")?.id || null;

  const klantNaam =
    [contact?.first_name, contact?.last_name].filter(Boolean).join(" ") ||
    thread?.klant_naam ||
    "";

  return { thread, dossier, lastIncomingId, klantNaam };
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
    const action: "suggest" | "chat" | "draft" = body.action;
    const threadId: string = body.thread_id;
    if (!action || !threadId) throw new Error("Missing action or thread_id");

    const ctx = await loadContext(supabase, threadId);
    if (!ctx.thread) throw new Error("Thread not found");

    if (action === "suggest" || action === "draft") {
      const hint: string = body.hint || "";
      const aanhef = dutchGreeting(ctx.klantNaam);
      const prompt = `DOSSIER
${ctx.dossier}

OPDRACHT:
Schrijf een professioneel Nederlands conceptantwoord aan de klant op de laatste inkomende e-mail. Weeg het dossier expliciet mee (termijn sinds levering, bewijslast, eerdere claims en werkplaatshistorie), maar noem geen interne kosten of marges. Empathisch, concreet, met duidelijke vervolgstap.
BEGIN de mail met exact deze aanhef op de eerste regel, gevolgd door een lege regel: "${aanhef}"
Geen andere of Engelse opening, geen stijve juridische aanhef. GEEN handtekening (die wordt automatisch toegevoegd). Geef alléén de kale antwoordtekst terug — geen JSON, geen markdown, geen uitleg.${hint ? `\n\nEXTRA AANWIJZING: ${hint}` : ""}`;

      let suggestion = await callAnthropic(anthKey, prompt, 1000);
      if (suggestion && !/^(goedemorgen|goedemiddag|goedenavond|beste|geachte)/i.test(suggestion.trim())) {
        suggestion = `${aanhef}\n\n${suggestion.trim()}`;
      }

      if (action === "draft" && ctx.lastIncomingId && suggestion) {
        await supabase.from("garantie_emails")
          .update({ sara_reactie_voorstel: suggestion })
          .eq("id", ctx.lastIncomingId);
      }

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

      const prompt = `DOSSIER
${ctx.dossier}

EERDER OVERLEG (aftersales ↔ agent):
${historyText || "(nog geen overleg)"}

NIEUWE VRAAG VAN AFTERSALES:
${question}

Antwoord kort, praktisch en meedenkend als garantie-expert. Onderbouw met de feiten uit het dossier (termijn, bewijslast, historie). Geen JSON, geen markdown-code. De mens beslist zelf; jij adviseert.`;

      const answer = await callAnthropic(anthKey, prompt, 900);

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
