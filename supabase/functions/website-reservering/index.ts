// Website-reservering: auto op verkocht_b2c na iDEAL-aanbetaling op de publieke site.
// Eigen auth via header x-reservering-secret (RESERVERING_SECRET). Idempotent op betaling_id.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-reservering-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const str = z.string().trim().max(500);
const Body = z.object({
  betaling_id: z.string().trim().min(1).max(200),
  bedrag: z.number().positive(),
  betaald_op: z.string().datetime({ offset: true }),
  gereserveerd_tot: z.string().max(40).optional().nullable(),
  advertentienummer: str.optional().nullable(),
  hexon_nr: z.union([z.number(), z.string()]).optional().nullable(),
  kenteken: str.optional().nullable(),
  vin: str.optional().nullable(),
  auto: z.object({
    merk: str.optional().nullable(),
    model: str.optional().nullable(),
    uitvoering: str.optional().nullable(),
    bouwjaar: z.union([z.number(), z.string()]).optional().nullable(),
    prijs: z.number().positive(),
    km: z.union([z.number(), z.string()]).optional().nullable(),
    url: str.optional().nullable(),
  }),
  klant: z.object({
    voornaam: str.min(1),
    achternaam: str.min(1),
    email: z.string().trim().email().max(255),
    telefoon: str.optional().nullable(),
    straat: str.optional().nullable(),
    huisnummer: str.optional().nullable(),
    postcode: str.optional().nullable(),
    plaats: str.optional().nullable(),
  }),
  ophalen: z.any().optional().nullable(),
  financiering: z.boolean().optional().nullable(),
  bezorgen: z.boolean().optional().nullable(),
  verkoper: str.optional().nullable(),
  bron: str.optional().nullable(),
}).refine((b) => !!(b.vin?.trim() || b.kenteken?.trim()), { message: "kenteken of vin verplicht" });

const normVin = (v?: string | null) => (v ?? "").replace(/\s+/g, "").toUpperCase();
const normPlate = (v?: string | null) => (v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

function safeEqual(a: string, b: string) {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

async function log(row: Record<string, unknown>) {
  const { error } = await sb.from("website_reservering_log").insert(row);
  if (error) console.error("log fout", error.message);
  return error;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { fout: "alleen_post" });

  let payload: any = null;
  try { payload = await req.json(); } catch { /* ongeldig */ }
  const betalingId = typeof payload?.betaling_id === "string" ? payload.betaling_id : null;

  const secret = Deno.env.get("RESERVERING_SECRET") ?? "";
  const given = req.headers.get("x-reservering-secret") ?? "";
  if (!secret || !safeEqual(given, secret)) {
    await log({ betaling_id: betalingId, resultaat: "unauthorized", http_status: 401, fout: secret ? "secret_onjuist" : "secret_niet_ingesteld", payload });
    return json(401, { fout: "unauthorized" });
  }

  const parsed = Body.safeParse(payload);
  if (!parsed.success) {
    const fout = JSON.stringify(parsed.error.flatten());
    await log({ betaling_id: betalingId, resultaat: "invalid", http_status: 400, fout, payload });
    return json(400, { fout: parsed.error.flatten() });
  }
  const b = parsed.data;

  try {
    // 1. Idempotent
    const { data: eerder } = await sb.from("website_reservering_log")
      .select("vehicle_id, contact_id").eq("betaling_id", b.betaling_id).eq("resultaat", "ok").maybeSingle();
    if (eerder) {
      await log({ betaling_id: b.betaling_id, resultaat: "herhaald", http_status: 200, vehicle_id: eerder.vehicle_id, contact_id: eerder.contact_id, payload });
      return json(200, { ok: true, vehicle_id: eerder.vehicle_id, contact_id: eerder.contact_id, herhaald: true });
    }

    // 2. Auto zoeken: VIN, anders kenteken
    const vin = normVin(b.vin), plate = normPlate(b.kenteken);
    const fail = async (status: number, resultaat: string, fout: string, vehicle_id?: string) => {
      await log({ betaling_id: b.betaling_id, resultaat, http_status: status, fout, vehicle_id: vehicle_id ?? null, payload });
      return json(status, { fout });
    };

    type V = { id: string; status: string; vin: string | null; license_number: string | null; details: any };
    let byVin: V[] = [], byPlate: V[] = [];
    if (vin) {
      const { data, error } = await sb.from("vehicles").select("id,status,vin,license_number,details").ilike("vin", `%${vin.slice(-6)}%`);
      if (error) throw error;
      byVin = (data ?? []).filter((v) => normVin(v.vin) === vin);
    }
    if (plate) {
      const tail = plate.slice(-2);
      const { data, error } = await sb.from("vehicles").select("id,status,vin,license_number,details").ilike("license_number", `%${tail}%`);
      if (error) throw error;
      byPlate = (data ?? []).filter((v) => normPlate(v.license_number) === plate);
    }

    let vehicle: V | undefined;
    if (vin && byVin.length) {
      if (byVin.length > 1) return fail(409, "meerdere_matches", "meerdere_matches");
      vehicle = byVin[0];
      if (plate && byPlate.length && !byPlate.some((p) => p.id === vehicle!.id))
        return fail(409, "vin_kenteken_conflict", "vin_kenteken_conflict", vehicle.id);
    } else if (vin && !byVin.length && plate && byPlate.length) {
      // VIN meegestuurd maar niet gevonden, kenteken wel: niet raden.
      return fail(409, "vin_kenteken_conflict", "vin_kenteken_conflict", byPlate[0].id);
    } else if (!vin && plate) {
      if (byPlate.length > 1) return fail(409, "meerdere_matches", "meerdere_matches");
      vehicle = byPlate[0];
    }
    if (!vehicle) return fail(404, "niet_gevonden", "auto_niet_gevonden");

    if (vehicle.status !== "voorraad") {
      if (vehicle.status === "verkocht_b2c" && vehicle.details?.websiteReservering?.betalingId === b.betaling_id) {
        await log({ betaling_id: b.betaling_id, resultaat: "herhaald", http_status: 200, vehicle_id: vehicle.id, payload });
        return json(200, { ok: true, vehicle_id: vehicle.id, herhaald: true });
      }
      return fail(409, "al_verkocht", "al_verkocht", vehicle.id);
    }

    // 3. Verkoper
    const { data: cfg } = await sb.from("system_config").select("value").eq("key", "website_reservering_verkoper_email").maybeSingle();
    const verkoperEmail = (cfg?.value ?? "hendrik@auto-city.nl").trim();
    const { data: verk } = await sb.from("profiles").select("id, first_name, last_name").ilike("email", verkoperEmail);
    if (!verk || verk.length !== 1) return fail(500, "fout", "verkoper_niet_gevonden", vehicle.id);
    const verkoper = verk[0];
    const verkoperNaam = `${verkoper.first_name ?? ""} ${verkoper.last_name ?? ""}`.trim();

    // 4. Contact
    const k = b.klant;
    const email = k.email.toLowerCase();
    const esc = email.replace(/[\\%_]/g, (c) => "\\" + c);
    const { data: contacts, error: cErr } = await sb.from("contacts").select("*").ilike("email", esc).order("created_at").limit(1);
    if (cErr) throw cErr;
    const velden: Record<string, string | null | undefined> = {
      first_name: k.voornaam, last_name: k.achternaam, phone: k.telefoon,
      address_street: k.straat, address_number: k.huisnummer,
      address_postal_code: k.postcode, address_city: k.plaats,
    };
    let contactId: string;
    if (contacts?.length) {
      const c = contacts[0];
      contactId = c.id;
      const aanvul: Record<string, string> = {};
      for (const [key, val] of Object.entries(velden)) {
        if (val && (c[key] == null || String(c[key]).trim() === "")) aanvul[key] = val;
      }
      if (Object.keys(aanvul).length) {
        const { error } = await sb.from("contacts").update(aanvul).eq("id", contactId);
        if (error) throw error;
      }
    } else {
      const { data: nieuw, error } = await sb.from("contacts").insert({
        type: "b2c", is_car_dealer: false, email,
        first_name: k.voornaam, last_name: k.achternaam, phone: k.telefoon ?? null,
        address_street: k.straat ?? null, address_number: k.huisnummer ?? null,
        address_postal_code: k.postcode ?? null, address_city: k.plaats ?? null,
      }).select("id").single();
      if (error) throw error;
      contactId = nieuw.id;
    }

    // 5. Claim de betaling_id eerst (unieke index voorkomt dubbele verwerking bij gelijktijdige calls)
    const { data: claim, error: claimErr } = await sb.from("website_reservering_log").insert({
      betaling_id: b.betaling_id, resultaat: "ok", http_status: 200, vehicle_id: vehicle.id, contact_id: contactId, payload,
    }).select("id").single();
    if (claimErr) {
      if ((claimErr as any).code === "23505") {
        return json(200, { ok: true, vehicle_id: vehicle.id, contact_id: contactId, herhaald: true });
      }
      throw claimErr;
    }

    // 6. Auto bijwerken (alleen als nog voorraad)
    const details = {
      ...(vehicle.details ?? {}),
      sales_payment_status: "aanbetaling",
      salespersonId: verkoper.id,
      salespersonName: verkoperNaam,
      websiteReservering: {
        betalingId: b.betaling_id, bedrag: b.bedrag, betaaldOp: b.betaald_op,
        gereserveerdTot: b.gereserveerd_tot ?? null, advertentienummer: b.advertentienummer ?? null,
        hexonNr: b.hexon_nr ?? null, ophalen: b.ophalen ?? null, financiering: b.financiering ?? null,
        bezorgen: b.bezorgen ?? null, autoUrl: b.auto.url ?? null, bron: b.bron ?? "website",
        verkoperUitBody: b.verkoper ?? null,
      },
    };
    const { data: upd, error: uErr } = await sb.from("vehicles").update({
      status: "verkocht_b2c", customer_id: contactId,
      sold_by_user_id: verkoper.id, sold_registered_by: verkoper.id,
      sold_date: b.betaald_op, selling_price: b.auto.prijs, details,
    }).eq("id", vehicle.id).eq("status", "voorraad").select("id");
    if (uErr || !upd?.length) {
      await sb.from("website_reservering_log").delete().eq("id", claim.id);
      if (uErr) {
        const msg = uErr.message ?? String(uErr);
        const inkoop = msg.includes("purchase_price");
        return fail(inkoop ? 409 : 500, inkoop ? "inkoopprijs_ontbreekt" : "fout", inkoop ? "inkoopprijs_ontbreekt" : msg, vehicle.id);
      }
      return fail(409, "al_verkocht", "al_verkocht", vehicle.id);
    }

    // 7. Audit: nieuwste regel van de trigger aanvullen
    const { data: audit } = await sb.from("vehicle_status_audit_log").select("id, change_metadata")
      .eq("vehicle_id", vehicle.id).eq("new_status", "verkocht_b2c")
      .order("change_timestamp", { ascending: false }).limit(1).maybeSingle();
    if (audit) {
      await sb.from("vehicle_status_audit_log").update({
        changed_by: verkoper.id,
        change_metadata: { ...(audit.change_metadata ?? {}), source: "website", betaling_id: b.betaling_id },
      }).eq("id", audit.id);
    }

    return json(200, { ok: true, vehicle_id: vehicle.id, contact_id: contactId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : (e as any)?.message ?? String(e);
    console.error("website-reservering fout", msg);
    await log({ betaling_id: b.betaling_id, resultaat: "fout", http_status: 500, fout: msg, payload });
    return json(500, { fout: "interne_fout" });
  }
});
