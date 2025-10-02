import { WarrantyClaim, WarrantyStats, LoanCar } from "@/types/warranty";
import { supabase } from "@/integrations/supabase/client";

// Import from deliveredVehicleService instead
export { fetchDeliveredVehiclesForWarranty } from "./deliveredVehicleService";

// Import loan car functions from loanCarService
export { 
  fetchLoanCars,
  createLoanCar,
  updateLoanCar,
  deleteLoanCar,
  toggleLoanCarAvailability
} from "./loanCarService";

export const fetchWarrantyClaims = async (): Promise<WarrantyClaim[]> => {
  try {
    const { data, error } = await supabase
      .from('warranty_claims')
      .select(`
        *,
        vehicles!warranty_claims_vehicle_id_fkey (
          brand,
          model,
          license_number,
          details,
          customer_id,
          customerContact:contacts!vehicles_customer_id_fkey(
            first_name,
            last_name,
            email,
            phone
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((claim: any) => ({
      id: claim.id,
      vehicleId: claim.vehicle_id,
      customerId: claim.vehicles?.customer_id || '',
      customerName: `${claim.vehicles?.customerContact?.first_name || ''} ${claim.vehicles?.customerContact?.last_name || ''}`.trim(),
      customerEmail: claim.vehicles?.customerContact?.email,
      customerPhone: claim.vehicles?.customerContact?.phone,
      vehicleBrand: claim.vehicles?.brand || '',
      vehicleModel: claim.vehicles?.model || '',
      vehicleLicenseNumber: claim.vehicles?.license_number || '',
      deliveryDate: claim.vehicles?.details?.deliveryDate || new Date(),
      warrantyStartDate: claim.vehicles?.details?.deliveryDate || new Date(),
      warrantyEndDate: new Date(new Date(claim.vehicles?.details?.deliveryDate || new Date()).setFullYear(new Date().getFullYear() + 1)),
      problemDescription: claim.description || '',
      reportDate: claim.created_at,
      status: claim.claim_status,
      priority: 'normaal',
      loanCarAssigned: false,
      estimatedCost: claim.claim_amount || 0,
      actualCost: claim.claim_status === 'resolved' ? claim.claim_amount : undefined,
      resolutionDate: claim.claim_status === 'resolved' ? claim.updated_at : undefined,
      attachments: [],
      createdAt: claim.created_at,
      updatedAt: claim.updated_at
    }));
  } catch (error: any) {
    console.error("Failed to fetch warranty claims:", error);
    return [];
  }
};


export const createWarrantyClaim = async (claim: Omit<WarrantyClaim, 'id' | 'createdAt' | 'updatedAt'>): Promise<WarrantyClaim> => {
  try {
    const { data, error } = await supabase
      .from('warranty_claims')
      .insert({
        vehicle_id: claim.vehicleId,
        description: claim.problemDescription,
        claim_status: claim.status || 'pending',
        claim_amount: claim.estimatedCost
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ...claim,
      id: data.id,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    } as WarrantyClaim;
  } catch (error: any) {
    console.error("Failed to create warranty claim:", error);
    throw error;
  }
};

export const updateWarrantyClaim = async (claimId: string, updates: Partial<WarrantyClaim>): Promise<WarrantyClaim> => {
  try {
    const updateData: any = {};
    
    if (updates.problemDescription) updateData.description = updates.problemDescription;
    if (updates.status) updateData.claim_status = updates.status;
    if (updates.estimatedCost !== undefined) updateData.claim_amount = updates.estimatedCost;
    if (updates.actualCost !== undefined) updateData.claim_amount = updates.actualCost;

    const { data, error } = await supabase
      .from('warranty_claims')
      .update(updateData)
      .eq('id', claimId)
      .select()
      .single();

    if (error) throw error;

    // Fetch full claim with relations
    const claims = await fetchWarrantyClaims();
    const updatedClaim = claims.find(c => c.id === claimId);
    
    if (!updatedClaim) throw new Error('Claim not found after update');
    
    return updatedClaim;
  } catch (error: any) {
    console.error("Failed to update warranty claim:", error);
    throw error;
  }
};

export const resolveWarrantyClaim = async (claimId: string, resolutionData: {
  resolutionDescription: string;
  actualCost: number;
  customerSatisfaction: number;
}): Promise<WarrantyClaim> => {
  try {
    const { data, error } = await supabase
      .from('warranty_claims')
      .update({
        claim_status: 'resolved',
        claim_amount: resolutionData.actualCost
      })
      .eq('id', claimId)
      .select()
      .single();

    if (error) throw error;

    // Fetch full claim with relations
    const claims = await fetchWarrantyClaims();
    const resolvedClaim = claims.find(c => c.id === claimId);
    
    if (!resolvedClaim) throw new Error('Claim not found after resolve');
    
    return resolvedClaim;
  } catch (error: any) {
    console.error("Failed to resolve warranty claim:", error);
    throw error;
  }
};

export const getWarrantyStats = async (): Promise<WarrantyStats> => {
  try {
    const claims = await fetchWarrantyClaims();
    
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const activeClaims = claims.filter(c => c.status !== 'opgelost' && c.status !== 'vervallen');
    const resolvedClaims = claims.filter(c => c.status === 'opgelost');
    const thisMonthClaims = claims.filter(c => new Date(c.createdAt) >= firstDayOfMonth);
    const pendingClaims = claims.filter(c => c.status === 'actief');
    
    // Calculate average resolution days
    const resolvedWithDates = resolvedClaims.filter(c => c.resolutionDate);
    const avgResolutionDays = resolvedWithDates.length > 0
      ? resolvedWithDates.reduce((sum, claim) => {
          const reportDate = new Date(claim.reportDate);
          const resolutionDate = new Date(claim.resolutionDate!);
          const diffDays = Math.ceil((resolutionDate.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24));
          return sum + diffDays;
        }, 0) / resolvedWithDates.length
      : 0;
    
    // Calculate average customer satisfaction
    const withSatisfaction = resolvedClaims.filter(c => c.customerSatisfaction);
    const avgSatisfaction = withSatisfaction.length > 0
      ? withSatisfaction.reduce((sum, c) => sum + (c.customerSatisfaction || 0), 0) / withSatisfaction.length
      : 0;
    
    // Calculate total cost this month
    const totalCostThisMonth = thisMonthClaims.reduce((sum, c) => sum + (c.actualCost || c.estimatedCost || 0), 0);
    
    return {
      totalActive: activeClaims.length,
      totalThisMonth: thisMonthClaims.length,
      avgResolutionDays: Math.round(avgResolutionDays * 10) / 10,
      customerSatisfactionAvg: Math.round(avgSatisfaction * 10) / 10,
      totalCostThisMonth,
      pendingClaims: pendingClaims.length
    };
  } catch (error: any) {
    console.error("Failed to fetch warranty stats:", error);
    return {
      totalActive: 0,
      totalThisMonth: 0,
      avgResolutionDays: 0,
      customerSatisfactionAvg: 0,
      totalCostThisMonth: 0,
      pendingClaims: 0
    };
  }
};
