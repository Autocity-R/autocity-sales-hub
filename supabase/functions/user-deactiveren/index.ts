import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ROLES = ["admin","owner","manager","verkoper","operationeel","user","aftersales_manager","schadeherstel",
  "monteur","werkplaats_chef","uitdeuker_extern","operationeel_directeur","poetser","administratie"];
const UUID = /^[0-9a-f-]{36}$/i;
const OPEN_TASK = ["toegewezen", "in_uitvoering", "uitgesteld"];
const OPEN_WO = ["aangevraagd", "ingepland", "bezig", "gepauzeerd"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
    if (!token) return json({ success: false, error: "Unauthorized" }, 401);
    const { data: me, error: meErr } = await admin.auth.getUser(token);
    if (meErr || !me?.user) return json({ success: false, error: "Unauthorized" }, 401);

    const { data: myRoles } = await admin.from("user_roles").select("role").eq("user_id", me.user.id);
    const mine = (myRoles || []).map((r: any) => r.role);
    const isOwner = mine.includes("owner");
    if (!isOwner && !mine.includes("admin")) return json({ success: false, error: "Alleen owner/admin mag dit." }, 403);

    const body = await req.json().catch(() => ({}));
    const { userId, actie, rol, openWerk, overdragenAan } = body || {};
    if (typeof userId !== "string" || !UUID.test(userId)) return json({ success: false, error: "Ongeldige gebruiker" }, 400);
    if (actie !== "deactiveren" && actie !== "heractiveren") return json({ success: false, error: "Ongeldige actie" }, 400);
    if (userId === me.user.id) return json({ success: false, error: "Je kunt jezelf niet uit dienst zetten" }, 400);

    const { data: prof } = await admin.from("profiles").select("id, email, first_name, last_name").eq("id", userId).maybeSingle();
    if (!prof) return json({ success: false, error: "Gebruiker niet gevonden" }, 404);
    const naam = `${prof.first_name || ""} ${prof.last_name || ""}`.trim() || prof.email;

    const { data: targetRoles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    if ((targetRoles || []).some((r: any) => r.role === "owner") && !isOwner)
      return json({ success: false, error: "Alleen een owner kan een owner uit dienst zetten" }, 403);

    if (actie === "deactiveren") {
      // Open werk eerst regelen
      let overgedragen = 0, afgesloten = 0;
      if (openWerk === "overdragen") {
        if (typeof overdragenAan !== "string" || !UUID.test(overdragenAan) || overdragenAan === userId)
          return json({ success: false, error: "Kies een collega om aan over te dragen" }, 400);
        const { data: t } = await admin.from("tasks").update({ assigned_to: overdragenAan })
          .eq("assigned_to", userId).in("status", OPEN_TASK).select("id");
        const { data: w } = await admin.from("work_orders").update({ assigned_to: overdragenAan })
          .eq("assigned_to", userId).in("status", OPEN_WO).select("id");
        overgedragen = (t?.length || 0) + (w?.length || 0);
      } else if (openWerk === "afsluiten") {
        const { data: t } = await admin.from("tasks").update({ status: "geannuleerd" })
          .eq("assigned_to", userId).in("status", OPEN_TASK).select("id");
        const { data: w } = await admin.from("work_orders").update({ status: "geannuleerd" })
          .eq("assigned_to", userId).in("status", OPEN_WO).select("id");
        afgesloten = (t?.length || 0) + (w?.length || 0);
      }

      const { error: banErr } = await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
      if (banErr) return json({ success: false, error: "Blokkeren mislukt: " + banErr.message }, 500);
      const { data: sessies } = await admin.rpc("medewerker_sessies_beeindigen", { p_user_id: userId });
      await admin.from("user_roles").delete().eq("user_id", userId);
      await admin.from("profiles").update({ actief: false, uit_dienst_sinds: new Date().toISOString() }).eq("id", userId);

      console.log(`[user-deactiveren] ${me.user.email} zette ${prof.email} uit dienst; rollen=${JSON.stringify(targetRoles)}; sessies=${sessies}; overgedragen=${overgedragen}; afgesloten=${afgesloten}`);
      return json({ success: true, message: `${naam} staat nu uit dienst`, overgedragen, afgesloten });
    }

    // heractiveren
    if (typeof rol !== "string" || !ROLES.includes(rol)) return json({ success: false, error: "Kies een rol" }, 400);
    if (rol === "owner" && !isOwner) return json({ success: false, error: "Alleen een owner kan de rol owner geven" }, 403);
    const { error: unbanErr } = await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
    if (unbanErr) return json({ success: false, error: "Deblokkeren mislukt: " + unbanErr.message }, 500);
    await admin.from("user_roles").delete().eq("user_id", userId);
    const { error: roleErr } = await admin.from("user_roles").insert({ user_id: userId, role: rol });
    if (roleErr) return json({ success: false, error: "Rol terugzetten mislukt: " + roleErr.message }, 500);
    await admin.from("profiles").update({ actief: true, uit_dienst_sinds: null }).eq("id", userId);
    console.log(`[user-deactiveren] ${me.user.email} heractiveerde ${prof.email} als ${rol}`);
    return json({ success: true, message: `${naam} is weer actief` });
  } catch (e) {
    console.error("[user-deactiveren] fout", e);
    return json({ success: false, error: "Interne fout" }, 500);
  }
});
