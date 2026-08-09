import { corsHeaders } from "../_shared/cors.ts";
import { adminClient, sendPush, AFTERSALES_ROLES } from "../_shared/push.ts";

/**
 * Cron (elk uur): open garantie-threads waar de laatste INKOMENDE mail >20 uur
 * onbeantwoord is → éénmalige push per thread per termijn.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (p: unknown, status = 200) =>
    new Response(JSON.stringify(p), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const secret = Deno.env.get("PUSH_HOOK_SECRET");
    if (!secret || req.headers.get("x-push-secret") !== secret) {
      return json({ error: "unauthorized" }, 401);
    }

    const supabase = adminClient();
    const cutoff = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();

    const { data: threads, error } = await supabase
      .from("garantie_email_threads")
      .select("id, klant_naam, klant_email, onderwerp, laatste_email_op, thread_status")
      .eq("thread_status", "open")
      .lt("laatste_email_op", cutoff)
      .order("laatste_email_op", { ascending: true })
      .limit(100);

    if (error) {
      console.error("[clock-check] threads laden mislukt:", error.message);
      return json({ ok: false, error: error.message });
    }

    let notified = 0;
    for (const t of threads ?? []) {
      // Laatste bericht in de thread moet INKOMEND zijn (anders is er al geantwoord).
      const { data: last } = await supabase
        .from("garantie_emails")
        .select("richting, received_at")
        .eq("thread_id", t.id)
        .order("received_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!last || last.richting !== "inkomend") continue;

      const hours = Math.floor(
        (Date.now() - new Date(last.received_at).getTime()) / 3_600_000,
      );
      if (hours < 20) continue;

      const res = await sendPush(
        { roles: AFTERSALES_ROLES },
        {
          title: "⏰ Reageer nu",
          body: `${t.klant_naam || t.klant_email} wacht al ${hours}+ uur op antwoord`,
          url: `/garantie/inbox?thread=${t.id}`,
          tag: `garantie-clock-${t.id}`,
          // Eén melding per thread per termijn (per laatste inkomende mail).
          dedupeKey: `clock20:${t.id}:${last.received_at}`,
        },
      );
      if (res.sent > 0) notified++;
    }

    return json({ ok: true, checked: threads?.length ?? 0, notified });
  } catch (e: any) {
    console.error("[clock-check] fout:", e?.message);
    return json({ ok: false, error: e?.message ?? "unknown" });
  }
});