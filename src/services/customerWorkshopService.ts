import { supabase } from "@/integrations/supabase/client";

export interface WorkshopHistoryVehicle {
  id: string;
  brand: string | null;
  model: string | null;
  license_number: string | null;
}

export interface WorkshopHistoryOrder {
  id: string;
  discipline: string;
  status: string;
  description: string | null;
  planned_at: string | null;
  created_at: string;
  vehicle_id: string | null;
  vehicle?: WorkshopHistoryVehicle | null;
}

export interface WorkshopHistoryInvoice {
  id: string;
  invoice_number: string | null;
  total: number | null;
  status: string | null;
  created_at: string;
  pdf_path: string | null;
}

export interface CustomerWorkshopHistory {
  vehicles: WorkshopHistoryVehicle[];
  orders: WorkshopHistoryOrder[];
  invoices: WorkshopHistoryInvoice[];
}

/**
 * Werkplaats-historie van één klant: externe voertuigen, werkorders en facturen.
 * Koppeling loopt via work_orders.external_customer->>customer_id én via
 * de externe voertuigen die aan deze klant hangen (vehicles.customer_id, status 'extern').
 */
export const getCustomerWorkshopHistory = async (
  contactId: string,
): Promise<CustomerWorkshopHistory> => {
  // 1) externe voertuigen van deze klant
  const { data: vehRows } = await supabase
    .from("vehicles")
    .select("id, brand, model, license_number")
    .eq("status", "extern")
    .eq("customer_id", contactId);

  const vehicles: WorkshopHistoryVehicle[] = (vehRows as any[]) || [];
  const vehicleIds = vehicles.map((v) => v.id);

  // 2) werkorders: via external_customer.customer_id of via de voertuigen
  const orFilters = [`external_customer->>customer_id.eq.${contactId}`];
  if (vehicleIds.length) orFilters.push(`vehicle_id.in.(${vehicleIds.join(",")})`);

  const { data: woRows } = await supabase
    .from("work_orders")
    .select("id, discipline, status, description, planned_at, created_at, vehicle_id, external_customer")
    .or(orFilters.join(","))
    .order("created_at", { ascending: false })
    .limit(200);

  const orders = ((woRows as any[]) || []) as WorkshopHistoryOrder[];

  // voertuigen die alleen via werkorders bekend zijn alsnog ophalen
  const extraIds = Array.from(
    new Set(orders.map((o) => o.vehicle_id).filter((id): id is string => !!id && !vehicleIds.includes(id))),
  );
  if (extraIds.length) {
    const { data: extra } = await supabase
      .from("vehicles")
      .select("id, brand, model, license_number")
      .in("id", extraIds);
    ((extra as any[]) || []).forEach((v) => vehicles.push(v));
  }
  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
  orders.forEach((o) => { o.vehicle = o.vehicle_id ? vehicleMap.get(o.vehicle_id) ?? null : null; });

  // 3) facturen: via work_order_id, vehicle_id of source_work_order_ids
  const allVehicleIds = vehicles.map((v) => v.id);
  const orderIds = orders.map((o) => o.id);
  let invoices: WorkshopHistoryInvoice[] = [];
  if (orderIds.length || allVehicleIds.length) {
    const invFilters: string[] = [];
    if (orderIds.length) invFilters.push(`work_order_id.in.(${orderIds.join(",")})`);
    if (allVehicleIds.length) invFilters.push(`vehicle_id.in.(${allVehicleIds.join(",")})`);
    const { data: invRows } = await supabase
      .from("workshop_invoices")
      .select("id, invoice_number, total, status, created_at, pdf_path, work_order_id, vehicle_id, source_work_order_ids")
      .eq("invoice_kind", "extern")
      .or(invFilters.join(","))
      .order("created_at", { ascending: false })
      .limit(200);
    invoices = ((invRows as any[]) || []) as WorkshopHistoryInvoice[];
  }

  return { vehicles, orders, invoices };
};
