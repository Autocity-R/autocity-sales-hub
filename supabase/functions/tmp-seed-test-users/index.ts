// TEMPORARY: seeds owner/verkoper test accounts for the mobile audit. Delete after use.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SEED_TOKEN = "mobile-audit-2026";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== SEED_TOKEN) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const accounts = [
    { email: "owner.test@auto-city.nl", role: "owner", first_name: "Owner", last_name: "Test" },
    { email: "verkoper.test@auto-city.nl", role: "verkoper", first_name: "Verkoper", last_name: "Test" },
  ];
  const out: unknown[] = [];

  for (const acc of accounts) {
    let userId: string | null = null;
    const { data: created, error } = await admin.auth.admin.createUser({
      email: acc.email,
      password: "Werkplaats2026!",
      email_confirm: true,
      user_metadata: { first_name: acc.first_name, last_name: acc.last_name },
    });
    if (created?.user) userId = created.user.id;
    if (error) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = list?.users?.find((u) => u.email === acc.email);
      if (found) {
        userId = found.id;
        await admin.auth.admin.updateUserById(found.id, { password: "Werkplaats2026!", email_confirm: true });
      }
    }
    if (!userId) { out.push({ email: acc.email, error: error?.message ?? "no user" }); continue; }

    await admin.from("profiles").upsert({ id: userId, email: acc.email, first_name: acc.first_name, last_name: acc.last_name });
    await admin.from("user_roles").upsert({ user_id: userId, role: acc.role }, { onConflict: "user_id,role" });
    out.push({ email: acc.email, userId, role: acc.role });
  }

  return new Response(JSON.stringify({ ok: true, out }), { headers: { "Content-Type": "application/json" } });
});
