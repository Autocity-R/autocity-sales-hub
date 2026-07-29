import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
Deno.serve(async () => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const res = await fetch("https://autocity-crm.nl/__l5e/assets-v1/2e144415-db30-4949-b4ec-3187dedcc9a3/autocity-logo.png");
  const buf = new Uint8Array(await res.arrayBuffer());
  const { error } = await supabase.storage.from('email-assets').upload('autocity-logo-v3.png', buf, { contentType: 'image/png', upsert: true });
  const { data } = supabase.storage.from('email-assets').getPublicUrl('autocity-logo-v3.png');
  return new Response(JSON.stringify({ error: error?.message ?? null, url: data.publicUrl, bytes: buf.length }), { headers: { 'Content-Type': 'application/json' } });
});
