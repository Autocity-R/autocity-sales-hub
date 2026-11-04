/**
 * Externe klussen zonder factuur (BOUWSTAP 13B) — pure selectie + factuur-draft.
 * Zelfde koppelregel als de omzetbron: source_work_order_ids als niet leeg, anders work_order_id.
 */
import { linkedOrderIds } from "./omzet";
import { getWorkOrderParts } from "@/components/werkplaats/workOrderParts";
import type { InvoiceDraft } from "@/services/workshopInvoiceService";

export interface ExternOrderRow {
  id: string;
  status: string;
  origin: string | null;
  external_customer: unknown;
  factuur_niet_nodig?: boolean | null;
}

export interface InvoiceLinkRow {
  work_order_id: string | null;
  source_work_order_ids: unknown;
}

export const isExternOrder = (o: Pick<ExternOrderRow, "origin" | "external_customer">) =>
  o.origin === "extern" || o.external_customer != null;

/**
 * Goedgekeurde externe orders die nog een factuur nodig hebben:
 * niet gekoppeld aan een factuur en niet gemarkeerd als "geen factuur nodig".
 */
export function externOrdersZonderFactuur<T extends ExternOrderRow>(orders: T[], invoices: InvoiceLinkRow[]): T[] {
  const linked = new Set<string>();
  invoices.forEach(i => linkedOrderIds(i.source_work_order_ids, i.work_order_id).forEach(id => linked.add(id)));
  return orders.filter(o =>
    o.status === "goedgekeurd" && isExternOrder(o) && !o.factuur_niet_nodig && !linked.has(o.id));
}

export interface ExternOrderVoorDraft {
  id: string;
  branch: string | null;
  description: string | null;
  part?: string | null;
  parts?: string[] | null;
  external_customer: any;
  vehicle?: { brand?: string | null; model?: string | null; license_number?: string | null; vin?: string | null } | null;
}

/** Zelfde vooringevulde factuur-draft als bij het goedkeuren van een externe klus. */
export function externInvoiceDraft(w: ExternOrderVoorDraft): InvoiceDraft {
  const c = (w.external_customer as any) || {};
  return {
    work_order_id: w.id,
    branch: w.branch || "rotterdam",
    customer: {
      name: c.name || "",
      address: c.address || "",
      street: c.street || "",
      house_number: c.house_number || "",
      postal_code: c.postal_code || "",
      city: c.city || "",
      email: c.email || "",
      phone: c.phone || "",
    },
    vehicle: {
      brand: w.vehicle?.brand || "", model: w.vehicle?.model || "",
      license_number: w.vehicle?.license_number || "", vin: w.vehicle?.vin || null,
    },
    lines: [{ description: [getWorkOrderParts(w).join(" · ") || null, w.description].filter(Boolean).join(" — "), amount: 0 }],
  };
}

export const FACTUUR_NIET_NODIG_REDENEN: { value: string; label: string }[] = [
  { value: "kosteloos", label: "Kosteloos" },
  { value: "garantie", label: "Garantie" },
  { value: "buiten_crm", label: "Gefactureerd buiten CRM" },
  { value: "anders", label: "Anders" },
];
