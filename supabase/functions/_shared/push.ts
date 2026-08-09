// Shared web-push helper. Meldingen falen ALTIJD stil: nooit een flow blokkeren.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

export type PushTarget = { roles?: string[]; userIds?: string[] };
export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  /** Voorkomt dubbele meldingen: dezelfde key wordt maximaal één keer verstuurd. */
  dedupeKey?: string;
};

export const adminClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

const configureVapid = (): boolean => {
  const pub = Deno.env.get("VAPID_PUBLIC_KEY");
  const priv = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:ict@auto-city.nl";
  if (!pub || !priv) {
    console.warn("[push] VAPID keys ontbreken — melding overgeslagen");
    return false;
  }
  webpush.setVapidDetails(subject, pub, priv);
  return true;
};

/** Verstuurt een push naar alle apparaten van de doelgroep. Retourneert aantallen; gooit nooit. */
export const sendPush = async (
  target: PushTarget,
  payload: PushPayload,
): Promise<{ sent: number; failed: number; skipped?: string }> => {
  try {
    if (!configureVapid()) return { sent: 0, failed: 0, skipped: "no_vapid" };
    const supabase = adminClient();

    // ── Dedupe ──
    if (payload.dedupeKey) {
      const { error } = await supabase
        .from("push_dedupe")
        .insert({ dedupe_key: payload.dedupeKey });
      if (error) {
        console.log(`[push] dedupe hit: ${payload.dedupeKey}`);
        return { sent: 0, failed: 0, skipped: "dedupe" };
      }
    }

    // ── Ontvangers bepalen ──
    const userIds = new Set<string>(target.userIds ?? []);
    if (target.roles?.length) {
      const { data: rows } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", target.roles);
      (rows ?? []).forEach((r: { user_id: string }) => userIds.add(r.user_id));
    }
    if (userIds.size === 0) return { sent: 0, failed: 0, skipped: "no_recipients" };

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", [...userIds]);
    if (!subs?.length) return { sent: 0, failed: 0, skipped: "no_subscriptions" };

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/",
      tag: payload.tag,
    });

    let sent = 0;
    let failed = 0;
    const stale: string[] = [];

    await Promise.all(
      subs.map(async (s: { id: string; endpoint: string; p256dh: string; auth: string }) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
            { TTL: 3600 },
          );
          sent++;
        } catch (e: any) {
          failed++;
          const code = e?.statusCode;
          if (code === 404 || code === 410) stale.push(s.id);
          else console.warn("[push] verzenden mislukt:", code, e?.message);
        }
      }),
    );

    if (stale.length) {
      await supabase.from("push_subscriptions").delete().in("id", stale);
    }
    if (sent > 0) {
      await supabase
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .in("endpoint", subs.map((s: { endpoint: string }) => s.endpoint));
    }

    return { sent, failed };
  } catch (e: any) {
    console.error("[push] onverwachte fout (stil genegeerd):", e?.message);
    return { sent: 0, failed: 0, skipped: "error" };
  }
};

/** Rollen die aftersales-meldingen ontvangen. */
export const AFTERSALES_ROLES = ["aftersales_manager", "owner", "admin"];
export const AFTERSALES_PLUS_CHEF_ROLES = [
  "aftersales_manager",
  "werkplaats_chef",
  "owner",
  "admin",
];