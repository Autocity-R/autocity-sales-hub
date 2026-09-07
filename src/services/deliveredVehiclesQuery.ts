import { supabase } from "@/integrations/supabase/client";
import { Vehicle } from "@/types/inventory";
import { handelsvoorraadScope } from "@/lib/vehicleScope";
import { applyBranchFilter, type BranchFilter } from "@/contexts/BranchContext";

/**
 * Server-side gepagineerde query voor de pagina "Afgeleverd".
 *
 * Waarom apart: de oude flow haalde ALLE afgeleverde auto's op (1000+ rijen,
 * ~1,6 MB) plus losse relatie-queries en filterde/sorteerde pas in de browser.
 * Hier gebeurt filteren, zoeken, sorteren en pagineren in de database.
 */

// Voorkomt dat supabase-js de selectstring op typeniveau parseert (trage tsc).
const sel = (s: string): string => s;

const VEHICLE_COLUMNS = `
  id, brand, model, year, color, license_number, vin, mileage,
  selling_price, purchase_price, purchase_date, status, branch, location,
  delivery_date, import_status, notes, created_at, updated_at,
  customer_id, supplier_id, transporter_id,
  purchased_by_user_id, purchased_by_name, sold_by_user_id,
  b2b_delivered, b2b_delivered_at, b2b_delivered_by, details,
  customerContact:contacts!vehicles_customer_id_fkey(
    id, first_name, last_name, company_name, email, phone,
    address_street, address_number, address_postal_code, address_city, is_car_dealer
  )
`;

export type DeliveredSortField =
  | "brand"
  | "model"
  | "year"
  | "mileage"
  | "licenseNumber"
  | "sellingPrice"
  | "customerName"
  | "salespersonName"
  | "purchasedByName"
  | "salesStatus"
  | "deliveryDate";

const SORT_COLUMNS: Partial<Record<DeliveredSortField, string>> = {
  brand: "brand",
  model: "model",
  year: "year",
  mileage: "mileage",
  licenseNumber: "license_number",
  sellingPrice: "selling_price",
  purchasedByName: "purchased_by_name",
  salesStatus: "details->>originalSalesStatus",
  deliveryDate: "details->>deliveryDate",
};

export interface DeliveredQueryParams {
  page: number; // 0-based
  pageSize: number;
  search?: string;
  salesType?: "all" | "b2c" | "b2b";
  dateFrom?: Date | null;
  dateTo?: Date | null;
  branch?: BranchFilter | null;
  sortField?: DeliveredSortField | null;
  sortDirection?: "asc" | "desc";
}

export interface DeliveredQueryResult {
  vehicles: Vehicle[];
  total: number;
}

const escapeOrValue = (v: string) => v.replace(/[,()"]/g, " ").trim();

const mapRow = (row: any): Vehicle => {
  const details = row.details || {};
  const c = row.customerContact || null;
  const customerName = c
    ? c.company_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || null
    : null;

  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    year: row.year,
    color: row.color,
    licenseNumber: row.license_number,
    vin: row.vin,
    mileage: row.mileage,
    sellingPrice: row.selling_price,
    purchasePrice: row.purchase_price || details.purchasePrice || 0,
    purchaseDate: row.purchase_date ? new Date(row.purchase_date) : null,
    location: row.location || "showroom",
    salesStatus: row.status,
    customerId: row.customer_id,
    supplierId: row.supplier_id,
    transporter_id: row.transporter_id,
    customerName,
    customerContact: c
      ? {
          name: customerName,
          email: c.email,
          phone: c.phone,
          address: [c.address_street, c.address_number, c.address_postal_code, c.address_city]
            .filter(Boolean)
            .join(", "),
          isCarDealer: !!c.is_car_dealer,
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deliveryDate: row.delivery_date || details.deliveryDate || null,
    importStatus: row.import_status || "niet_aangemeld",
    notes: row.notes || details.notes || "",
    workshopStatus: details.workshopStatus || "wachten",
    paintStatus: details.paintStatus || "geen_behandeling",
    transportStatus: details.transportStatus || "onderweg",
    damage: details.damage || { description: "", status: "geen" },
    bpmRequested: details.bpmRequested || false,
    bpmStarted: details.bpmStarted || false,
    cmrSent: details.cmrSent || false,
    cmrDate: details.cmrDate ? new Date(details.cmrDate) : null,
    bpmReportSent: details.bpmReportSent || false,
    bpmReportSentDate: details.bpmReportSentDate ? new Date(details.bpmReportSentDate) : null,
    papersReceived: details.papersReceived || false,
    papersDate: details.papersDate ? new Date(details.papersDate) : null,
    showroomOnline: details.showroomOnline || false,
    paymentStatus: details.paymentStatus || "niet_betaald",
    purchasedById: row.purchased_by_user_id || details.purchasedById || null,
    purchasedByName: row.purchased_by_name || details.purchasedByName || null,
    salespersonId: row.sold_by_user_id || details.salespersonId || null,
    salespersonName: details.salespersonName || null,
    mainPhotoUrl: details.mainPhotoUrl || null,
    photos: details.photos || [],
    details,
    arrived: row.location !== "onderweg",
    branch: row.branch || "rotterdam",
    b2bDelivered: row.b2b_delivered ?? false,
    b2bDeliveredAt: row.b2b_delivered_at || null,
    b2bDeliveredBy: row.b2b_delivered_by || null,
  } as Vehicle;
};

/** Zoek klant-ids die matchen op naam/e-mail, zodat zoeken op klant ook werkt. */
const findMatchingCustomerIds = async (term: string): Promise<string[]> => {
  const t = `%${escapeOrValue(term)}%`;
  const { data } = await supabase
    .from("contacts")
    .select("id")
    .or(`company_name.ilike.${t},first_name.ilike.${t},last_name.ilike.${t},email.ilike.${t}`)
    .limit(300);
  return (data || []).map((r: any) => r.id);
};

export const fetchDeliveredVehiclesPage = async (
  params: DeliveredQueryParams,
): Promise<DeliveredQueryResult> => {
  const {
    page,
    pageSize,
    search = "",
    salesType = "all",
    dateFrom,
    dateTo,
    branch,
    sortField,
    sortDirection = "desc",
  } = params;

  let q = supabase
    .from("vehicles")
    .select(sel(VEHICLE_COLUMNS), { count: "exact" })
    .eq("status", "afgeleverd");

  q = handelsvoorraadScope(q);
  q = applyBranchFilter(q, branch);

  const term = escapeOrValue(search);
  if (term.length >= 2) {
    const like = `%${term}%`;
    const parts = [
      `license_number.ilike.${like}`,
      `brand.ilike.${like}`,
      `model.ilike.${like}`,
      `vin.ilike.${like}`,
      `details->>salespersonName.ilike.${like}`,
      `purchased_by_name.ilike.${like}`,
      `details->>customerName.ilike.${like}`,
    ];
    const customerIds = await findMatchingCustomerIds(term);
    if (customerIds.length) parts.push(`customer_id.in.(${customerIds.join(",")})`);
    q = q.or(parts.join(","));
  }

  if (salesType === "b2c") {
    q = q.or(
      "details->>originalSalesStatus.eq.verkocht_b2c,details->>originalSalesStatus.is.null",
    );
  } else if (salesType === "b2b") {
    q = q.eq("details->>originalSalesStatus", "verkocht_b2b");
  }

  if (dateFrom) {
    q = q.gte("details->>deliveryDate", dateFrom.toISOString().slice(0, 10));
  }
  if (dateTo) {
    // inclusieve einddatum
    const end = new Date(dateTo);
    end.setDate(end.getDate() + 1);
    q = q.lt("details->>deliveryDate", end.toISOString().slice(0, 10));
  }

  const orderColumn = (sortField && SORT_COLUMNS[sortField]) || "details->>deliveryDate";
  q = q.order(orderColumn, {
    ascending: sortField ? sortDirection === "asc" : false,
    nullsFirst: false,
  });

  const from = page * pageSize;
  q = q.range(from, from + pageSize - 1);

  const { data, error, count } = await q;
  if (error) {
    console.error("[DELIVERED] query failed:", error);
    throw error;
  }

  let vehicles = ((data as any[]) || []).map(mapRow);

  // Namen staan niet als kolom in de database → binnen de pagina sorteren.
  if (sortField === "customerName" || sortField === "salespersonName") {
    const dir = sortDirection === "asc" ? 1 : -1;
    vehicles = [...vehicles].sort((a, b) =>
      dir *
      String((a as any)[sortField] || "").localeCompare(String((b as any)[sortField] || ""), "nl"),
    );
  }

  return { vehicles, total: count ?? vehicles.length };
};
