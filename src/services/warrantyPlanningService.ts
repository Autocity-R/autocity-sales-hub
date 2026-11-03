import { supabase } from "@/integrations/supabase/client";

export interface WarrantyPlanningInput {
  claimId: string;
  vehicleId: string | null;
  description: string;
  plannedAt: Date;
  assignedTo?: string | null;
  isRush?: boolean;
  branch: string;
  createdBy: string | null;
  customerId?: string | null;
}

/** Atomic server-side claim/vehicle/order linking, including manual claims. */
export async function createWarrantyWorkOrder(p: WarrantyPlanningInput): Promise<string> {
  if (!p.description.trim() || !Number.isFinite(p.plannedAt.getTime())) {
    throw new Error("Vul geldige werkzaamheden, datum en tijd in");
  }
  const { data, error } = await supabase.rpc("garantie_werkorder_inplannen", {
    p_claim_id: p.claimId,
    p_description: p.description.trim(),
    p_planned_at: p.plannedAt.toISOString(),
    p_assigned_to: p.assignedTo || null,
    p_is_rush: !!p.isRush,
    p_customer_id: p.customerId || null,
  });
  if (error) throw error;
  if (typeof data !== "string" || !data) throw new Error("Geen werkorder opgeslagen");
  return data;
}