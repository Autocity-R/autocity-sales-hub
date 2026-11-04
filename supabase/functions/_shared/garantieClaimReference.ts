/** Additive reference matching; UUID foreign keys and reply-header matching remain authoritative. */
export function claimReferences(text: string) {
  return [...new Set((text.match(/\bGC-\d{4}-\d{4}\b/gi) || []).map(n => n.toUpperCase()))];
}
export async function resolveClaimReference(db: any, text: string, emails: string[]) {
  const numbers = claimReferences(text);
  const ids = [...new Set(text.match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi) || [])];
  if (numbers.length > 1 || ids.length > 1) return { claimId: null, explicit: true };
  if (!numbers.length && !ids.length) return { claimId: null, explicit: false };
  let q = db.from('warranty_claims').select('id,claim_nummer,claim_contact_email,manual_customer_email,customer:contacts!warranty_claims_customer_id_fkey(email),vehicle:vehicles!warranty_claims_vehicle_id_fkey(customer:contacts!vehicles_customer_id_fkey(email))');
  q = numbers.length ? q.eq('claim_nummer', numbers[0]) : q.eq('id', ids[0]);
  const { data: c } = await q.maybeSingle();
  if (!c || (ids.length && c.id.toLowerCase() !== ids[0].toLowerCase())) return { claimId: null, explicit: true };
  const known = [c.claim_contact_email,c.manual_customer_email,c.customer?.email,c.vehicle?.customer?.email].filter(Boolean).map((e: string) => e.toLowerCase());
  return { claimId: emails.some(e => known.includes(e.toLowerCase())) ? c.id : null, explicit: true };
}