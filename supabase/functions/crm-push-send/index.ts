import { corsHeaders } from "../_shared/cors.ts";
import { sendPush, AFTERSALES_ROLES, AFTERSALES_PLUS_CHEF_ROLES } from "../_shared/push.ts";

/**
 * Centrale verzender voor CRM push-meldingen.
 * Wordt aangeroepen door edge functions, database-triggers (pg_net) en de cron-checks.
 * Beveiliging: header x-push-secret moet gelijk zijn aan het secret PUSH_HOOK_SECRET.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const secret = Deno.env.get("PUSH_HOOK_SECRET");
    if (!secret || req.headers.get("x-push-secret") !== secret) {
      return json({ error: "unauthorized" }, 401);
    }

    const payload = await req.json().catch(() => ({}));
    const {
      title,
      body,
      url,
      tag,
      dedupe_key,
      roles,
      user_ids,
      preset,
    } = payload as Record<string, any>;

    if (!title || !body) return json({ error: "title en body zijn verplicht" }, 400);

    // presets: 'aftersales' | 'aftersales_chef'
    const resolvedRoles: string[] | undefined =
      Array.isArray(roles) && roles.length
        ? roles
        : preset === "aftersales"
        ? AFTERSALES_ROLES
        : preset === "aftersales_chef"
        ? AFTERSALES_PLUS_CHEF_ROLES
        : undefined;

    const result = await sendPush(
      { roles: resolvedRoles, userIds: Array.isArray(user_ids) ? user_ids : undefined },
      { title: String(title), body: String(body), url, tag, dedupeKey: dedupe_key },
    );

    return json({ ok: true, ...result });
  } catch (e: any) {
    console.error("[crm-push-send] fout:", e?.message);
    // Nooit hard falen — meldingen mogen geen flow blokkeren.
    return json({ ok: false, error: e?.message ?? "unknown" }, 200);
  }
});