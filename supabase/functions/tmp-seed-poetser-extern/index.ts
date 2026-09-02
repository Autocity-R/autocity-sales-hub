// TEMPORARY: seeds one external poetser test account for the poets-flow verification. Delete after use.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SEED_TOKEN = "poets-audit-2026";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== SEED_TOKEN) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const email = "poetser.extern.test@auto-city.nl";
  let userId: string | null = null;
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: "Werkplaats2026!",
    email_confirm: true,
    user_metadata: { first_name: "Poetser", last_name: "Extern" },
  });
  if (created?.user) userId = created.user.id;
  if (!userId) {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = list?.users?.find((u) => u.email === email);
    if (found) {
      userId = found.id;
      await admin.auth.admin.updateUserById(found.id, { password: "Werkplaats2026!", email_confirm: true });
    }
  }
  if (!userId) return new Response(JSON.stringify({ error: error?.message ?? "no user" }), { status: 500 });

  await admin.from("profiles").upsert({
    id: userId, email, first_name: "Poetser", last_name: "Extern", poetser_type: "extern",
  });
  await admin.from("user_roles").upsert({ user_id: userId, role: "poetser" }, { onConflict: "user_id,role" });

  return new Response(JSON.stringify({ ok: true, userId, email }), { headers: { "Content-Type": "application/json" } });
});
