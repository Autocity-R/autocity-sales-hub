import { supabase } from "@/integrations/supabase/client";

/**
 * Werkplaatsklanten = elke klant die ooit in de werkplaats is geweest:
 * via een externe werkorder / werkplaatsafspraak, of via een externe factuur.
 * Puur lees-werk; raakt geen verkoopflows.
 */

export interface WorkshopCustomerVehicle {
  id: string | null;
  plate: string | null;
  brand: string | null;
  model: string | null;
}

export interface WorkshopCustomerRow {
  key: string;
  contactId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  postalCode: string | null;
  vehicles: WorkshopCustomerVehicle[];
  visits: number;
  lastVisit: string | null;
  totalSpent: number;
  invoiceCount: number;
}

const nameOf = (c: any): string =>
  (c?.company_name || `${c?.first_name || ""} ${c?.last_name || ""}`.trim() || "").trim();

const plateKey = (p?: string | null) => (p || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export const getWorkshopCustomers = async (): Promise<WorkshopCustomerRow[]> => {
  const [woRes, invRes, vehRes] = await Promise.all([
    supabase
      .from("work_orders")
      .select("id, planned_at, created_at, vehicle_id, external_customer, source, origin")
      .or("source.eq.extern,origin.eq.extern")
      .order("created_at", { ascending: false })
      .limit(3000),
    supabase
      .from("workshop_invoices")
      .select("id, created_at, total, customer, vehicle, vehicle_id, work_order_id")
      .eq("invoice_kind", "extern")
      .order("created_at", { ascending: false })
      .limit(3000),
    supabase
      .from("vehicles")
      .select("id, brand, model, license_number, customer_id")
      .eq("status", "extern")
      .limit(3000),
  ]);

  const orders = (woRes.data as any[]) || [];
  const invoices = (invRes.data as any[]) || [];
  const extVehicles = (vehRes.data as any[]) || [];

  // contacten ophalen voor nette naam/adresgegevens
  const contactIds = new Set<string>();
  orders.forEach((o) => { const id = o.external_customer?.customer_id; if (id) contactIds.add(id); });
  extVehicles.forEach((v) => { if (v.customer_id) contactIds.add(v.customer_id); });

  const contacts = new Map<string, any>();
  if (contactIds.size) {
    const { data } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, company_name, email, phone, address_street, address_number, address_postal_code, address_city")
      .in("id", Array.from(contactIds));
    ((data as any[]) || []).forEach((c) => contacts.set(c.id, c));
  }

  const vehicleById = new Map<string, any>(extVehicles.map((v) => [v.id, v]));
  const vehicleOwner = new Map<string, string>(); // vehicle_id -> contact_id
  extVehicles.forEach((v) => { if (v.customer_id) vehicleOwner.set(v.id, v.customer_id); });

  const rows = new Map<string, WorkshopCustomerRow>();

  const keyFor = (opts: { contactId?: string | null; email?: string | null; phone?: string | null; name?: string | null }) => {
    if (opts.contactId) return `c:${opts.contactId}`;
    const em = (opts.email || "").trim().toLowerCase();
    if (em && !em.endsWith("@werkplaats.local")) return `e:${em}`;
    const ph = (opts.phone || "").replace(/\D/g, "");
    if (ph) return `p:${ph}`;
    const nm = (opts.name || "").trim().toLowerCase();
    return nm ? `n:${nm}` : "";
  };

  const upsert = (opts: {
    contactId?: string | null; name?: string | null; email?: string | null; phone?: string | null;
    postalCode?: string | null; city?: string | null;
  }): WorkshopCustomerRow | null => {
    const contact = opts.contactId ? contacts.get(opts.contactId) : null;
    const name = (contact ? nameOf(contact) : "") || (opts.name || "").trim();
    const email = contact?.email || opts.email || null;
    const phone = contact?.phone || opts.phone || null;
    const key = keyFor({ contactId: opts.contactId, email, phone, name });
    if (!key) return null;
    let row = rows.get(key);
    if (!row) {
      row = {
        key,
        contactId: opts.contactId || null,
        name: name || "Onbekende klant",
        email: email && !String(email).endsWith("@werkplaats.local") ? email : null,
        phone,
        postalCode: contact?.address_postal_code || opts.postalCode || null,
        city: contact?.address_city || opts.city || null,
        vehicles: [],
        visits: 0,
        lastVisit: null,
        totalSpent: 0,
        invoiceCount: 0,
      };
      rows.set(key, row);
    }
    if (!row.contactId && opts.contactId) row.contactId = opts.contactId;
    if (!row.email && email && !String(email).endsWith("@werkplaats.local")) row.email = email;
    if (!row.phone && phone) row.phone = phone;
    if (!row.postalCode) row.postalCode = contact?.address_postal_code || opts.postalCode || null;
    if (!row.city) row.city = contact?.address_city || opts.city || null;
    return row;
  };

  const addVehicle = (row: WorkshopCustomerRow, v: WorkshopCustomerVehicle) => {
    const k = plateKey(v.plate) || v.id || "";
    if (!k) return;
    if (row.vehicles.some((x) => (plateKey(x.plate) || x.id || "") === k)) return;
    row.vehicles.push(v);
  };

  const touchVisit = (row: WorkshopCustomerRow, when?: string | null) => {
    row.visits += 1;
    if (when && (!row.lastVisit || new Date(when) > new Date(row.lastVisit))) row.lastVisit = when;
  };

  // 1) externe werkorders / werkplaatsafspraken
  for (const o of orders) {
    const ec = o.external_customer || {};
    const contactId = ec.customer_id || (o.vehicle_id ? vehicleOwner.get(o.vehicle_id) : null) || null;
    const row = upsert({
      contactId,
      name: ec.name,
      email: ec.email,
      phone: ec.phone,
      postalCode: ec.postal_code,
      city: ec.city,
    });
    if (!row) continue;
    touchVisit(row, o.planned_at || o.created_at);
    const v = o.vehicle_id ? vehicleById.get(o.vehicle_id) : null;
    if (v) addVehicle(row, { id: v.id, plate: v.license_number, brand: v.brand, model: v.model });
  }

  // 2) externe facturen (bedrag + eventueel klant die nog niet bekend was)
  for (const inv of invoices) {
    const c = inv.customer || {};
    const contactId = (inv.vehicle_id ? vehicleOwner.get(inv.vehicle_id) : null) || c.customer_id || null;
    const row = upsert({
      contactId,
      name: c.name,
      email: c.email,
      phone: c.phone,
      postalCode: c.postal_code,
      city: c.city,
    });
    if (!row) continue;
    row.totalSpent += Number(inv.total) || 0;
    row.invoiceCount += 1;
    if (inv.created_at && (!row.lastVisit || new Date(inv.created_at) > new Date(row.lastVisit))) {
      row.lastVisit = inv.created_at;
    }
    const iv = inv.vehicle || {};
    if (iv.license_number || inv.vehicle_id) {
      addVehicle(row, {
        id: inv.vehicle_id || null,
        plate: iv.license_number || null,
        brand: iv.brand || null,
        model: iv.model || null,
      });
    }
  }

  // 3) externe voertuigen zonder werkorder/factuur horen er ook bij
  for (const v of extVehicles) {
    if (!v.customer_id) continue;
    const row = upsert({ contactId: v.customer_id });
    if (!row) continue;
    addVehicle(row, { id: v.id, plate: v.license_number, brand: v.brand, model: v.model });
  }

  return Array.from(rows.values()).sort((a, b) => {
    const av = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
    const bv = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
    return bv - av;
  });
};