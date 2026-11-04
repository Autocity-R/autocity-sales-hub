interface ContactInfo { company_name?: string | null; first_name?: string | null; last_name?: string | null; email?: string | null; phone?: string | null }
export function warrantyCustomer(claim: {
  customer_id?: string | null;
  customerContact?: ContactInfo | null;
  vehicles?: { customer_id?: string | null; customerContact?: ContactInfo | null } | null;
  manual_customer_name?: string | null;
  manual_customer_phone?: string | null;
  manual_customer_email?: string | null;
  claim_contact_naam?: string | null;
  claim_contact_telefoon?: string | null;
  claim_contact_email?: string | null;
}) {
  const contact = claim.customerContact || claim.vehicles?.customerContact;
  const name = contact?.company_name || `${contact?.first_name || ""} ${contact?.last_name || ""}`.trim();
  return {
    customerId: claim.customer_id || claim.vehicles?.customer_id || "",
    customerName: claim.claim_contact_naam ?? (name || claim.manual_customer_name || "Onbekend"),
    customerEmail: claim.claim_contact_email ?? (contact?.email || claim.manual_customer_email || undefined),
    customerPhone: claim.claim_contact_telefoon ?? (contact?.phone || claim.manual_customer_phone || undefined),
  };
}