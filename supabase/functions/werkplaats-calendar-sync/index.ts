// Eigen agenda-koppeling voor de WERKPLAATS. Volledig los van de verkoop-agenda.
// Gebruikt het bestaande service-account-secret, maar mint een token als het
// service-account ZELF (geen domain-wide impersonatie).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TZ = "Europe/Amsterdam";
const DISCIPLINE_LABELS: Record<string, string> = {
  spuit: "Spuiterij",
  werkplaats: "Werkplaats",
  uitdeuk: "Uitdeuken",
  poets: "Poets",
};

function base64UrlEncode(data: string | ArrayBuffer): string {
  const base64 = typeof data === "string"
    ? btoa(data)
    : btoa(String.fromCharCode(...new Uint8Array(data)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function createJWTAssertion(header: any, payload: any, privateKey: string): Promise<string> {
  const signatureInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const clean = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const keyData = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", keyData, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(signatureInput),
  );
  return `${signatureInput}.${base64UrlEncode(signature)}`;
}

async function getServiceAccountToken(): Promise<{ token: string; clientEmail: string }> {
  const raw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
  if (!raw) throw new Error("Service-account sleutel ontbreekt (GOOGLE_SERVICE_ACCOUNT_KEY).");
  let credentials: any;
  try { credentials = JSON.parse(raw); } catch { throw new Error("Service-account sleutel is geen geldige JSON."); }
  if (!credentials.private_key || !credentials.client_email) {
    throw new Error("Service-account sleutel mist verplichte velden.");
  }
  const now = Math.floor(Date.now() / 1000);
  const jwt = await createJWTAssertion(
    { alg: "RS256", typ: "JWT", kid: credentials.private_key_id },
    {
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/calendar",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    },
    credentials.private_key,
  );
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google token-uitwisseling mislukt: ${data.error_description || data.error}`);
  return { token: data.access_token, clientEmail: credentials.client_email };
}

function friendlyGoogleError(status: number, body: any, calendarId: string): string {
  const msg = body?.error?.message || "onbekende fout";
  if (status === 404) return `Agenda "${calendarId}" niet gevonden — is de agenda al gedeeld met het service-account?`;
  if (status === 403) return `Geen toegang tot "${calendarId}" — deel de agenda met het service-account met rechten "Wijzigingen aanbrengen in afspraken". (${msg})`;
  return `Google Agenda fout (${status}): ${msg}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  let branch = "rotterdam";
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Niet ingelogd.");
    const anon = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const { data: { user } } = await anon.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) throw new Error("Niet ingelogd.");

    const body = await req.json();
    const action: string = body.action;
    branch = body.branch || "rotterdam";

    // instellingen ophalen
    const { data: settings } = await admin
      .from("werkplaats_calendar_settings")
      .select("*")
      .eq("branch", branch)
      .maybeSingle();

    const calendarId: string | null = body.calendar_id || settings?.calendar_id || null;
    if (!calendarId) throw new Error("Geen agenda-ID ingesteld voor de werkplaats.");

    const { token, clientEmail } = await getServiceAccountToken();
    const api = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`;
    const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const touchSettings = async (patch: Record<string, unknown>) => {
      await admin.from("werkplaats_calendar_settings")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("branch", branch);
    };

    if (action === "test") {
      const res = await fetch(api, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) {
        const message = friendlyGoogleError(res.status, data, calendarId);
        await touchSettings({ last_error: message });
        return new Response(JSON.stringify({ success: false, error: message, service_account_email: clientEmail }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await touchSettings({
        calendar_id: calendarId,
        calendar_name: data.summary || calendarId,
        connected_at: new Date().toISOString(),
        last_error: null,
        managed_by_user_id: user.id,
      });
      return new Response(JSON.stringify({
        success: true, calendar_name: data.summary || calendarId, service_account_email: clientEmail,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "push" || action === "remove") {
      const workOrderId = body.work_order_id;
      if (!workOrderId) throw new Error("work_order_id ontbreekt.");

      const { data: wo, error: woErr } = await admin
        .from("work_orders")
        .select("*, vehicle:vehicles(id, brand, model, license_number)")
        .eq("id", workOrderId)
        .single();
      if (woErr || !wo) throw new Error("Werkorder niet gevonden.");

      if (action === "remove") {
        if (wo.calendar_event_id) {
          const res = await fetch(`${api}/events/${encodeURIComponent(wo.calendar_event_id)}`, {
            method: "DELETE", headers: authHeaders,
          });
          if (!res.ok && res.status !== 404 && res.status !== 410) {
            const data = await res.json().catch(() => ({}));
            const message = friendlyGoogleError(res.status, data, calendarId);
            await touchSettings({ last_error: message });
            throw new Error(message);
          }
          await admin.from("work_orders").update({ calendar_event_id: null }).eq("id", workOrderId);
        }
        await touchSettings({ last_sync_at: new Date().toISOString(), last_error: null });
        return new Response(JSON.stringify({ success: true, removed: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!wo.planned_at) throw new Error("Werkorder heeft geen geplande datum.");

      const ext = (wo.external_customer || {}) as any;
      const vehicle = (wo as any).vehicle || {};
      const plate = vehicle.license_number ? String(vehicle.license_number).toUpperCase() : "GEEN KENTEKEN";
      const vehicleLabel = [vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "Voertuig";
      const who = wo.origin === "extern" && ext.name
        ? ext.name
        : (wo.description ? String(wo.description).slice(0, 40) : "Werkplaats");

      let assignedName = "niet toegewezen";
      if (wo.assigned_to) {
        const { data: prof } = await admin.from("profiles").select("first_name, last_name").eq("id", wo.assigned_to).maybeSingle();
        if (prof) assignedName = [prof.first_name, prof.last_name].filter(Boolean).join(" ") || assignedName;
      }

      const title = `${wo.is_rush ? "⚡ SPOED " : ""}🔧 [${plate}] ${vehicleLabel} — ${who}`;
      const siteUrl = (Deno.env.get("SITE_URL") || "").replace(/\/$/, "");
      const descriptionLines = [
        `Discipline: ${DISCIPLINE_LABELS[wo.discipline] || wo.discipline}`,
        `Werkzaamheden: ${wo.description || "-"}`,
        `Medewerker: ${assignedName}`,
      ];
      if (wo.origin === "extern") {
        descriptionLines.push(`Klant: ${ext.name || "-"}`);
        descriptionLines.push(`Telefoon: ${ext.phone || "-"}`);
      }
      descriptionLines.push(`Werkorder: ${siteUrl}/werkplaats/planning`);

      const start = new Date(wo.planned_at);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      const eventBody = {
        summary: title,
        description: descriptionLines.join("\n"),
        start: { dateTime: start.toISOString(), timeZone: TZ },
        end: { dateTime: end.toISOString(), timeZone: TZ },
      };

      let res = wo.calendar_event_id
        ? await fetch(`${api}/events/${encodeURIComponent(wo.calendar_event_id)}`, {
            method: "PATCH", headers: authHeaders, body: JSON.stringify(eventBody),
          })
        : await fetch(`${api}/events`, { method: "POST", headers: authHeaders, body: JSON.stringify(eventBody) });

      if (!res.ok && wo.calendar_event_id && (res.status === 404 || res.status === 410)) {
        res = await fetch(`${api}/events`, { method: "POST", headers: authHeaders, body: JSON.stringify(eventBody) });
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = friendlyGoogleError(res.status, data, calendarId);
        await touchSettings({ last_error: message });
        throw new Error(message);
      }

      if (data.id && data.id !== wo.calendar_event_id) {
        await admin.from("work_orders").update({ calendar_event_id: data.id }).eq("id", workOrderId);
      }
      await touchSettings({ last_sync_at: new Date().toISOString(), last_error: null });

      return new Response(JSON.stringify({ success: true, event_id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Onbekende actie.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout";
    console.error("[werkplaats-calendar-sync]", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
