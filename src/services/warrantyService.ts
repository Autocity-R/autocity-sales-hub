import { WarrantyClaim, WarrantyStats, LoanCar, ActiveWarrantyVehicle, ActiveWarrantyStats } from "@/types/warranty";
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

// Map database status values to UI status (Dutch)
const mapDbStatusToUi = (status?: string): import("@/types/warranty").WarrantyClaim["status"] => {
  switch (status) {
    case 'resolved':
      return 'opgelost';
    case 'in_progress':
      return 'in_behandeling';
    case 'void':
      return 'vervallen';
    case 'pending':
    default:
      return 'actief';
  }
};

// Map UI status (Dutch) to database status values
const mapUiStatusToDb = (status?: import("@/types/warranty").WarrantyClaim["status"]): string => {
  switch (status) {
    case 'opgelost':
      return 'resolved';
    case 'in_behandeling':
      return 'in_progress';
    case 'vervallen':
      return 'void';
    case 'actief':
    default:
      return 'pending';
  }
};

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
          vin,
          details,
          customer_id,
          customerContact:contacts!vehicles_customer_id_fkey(
            first_name,
            last_name,
            email,
            phone
          )
        ),
        loan_cars!warranty_claims_loan_car_id_fkey (
          id,
          vehicle_id,
          status,
          vehicles!loan_cars_vehicle_id_fkey (
            brand,
            model,
            license_number
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((claim: any) => ({
      id: claim.id,
      vehicleId: claim.vehicle_id,
      customerId: claim.vehicles?.customer_id || '',
      customerName: claim.vehicle_id 
        ? `${claim.vehicles?.customerContact?.first_name || ''} ${claim.vehicles?.customerContact?.last_name || ''}`.trim()
        : (claim.manual_customer_name || 'Onbekend'),
      customerEmail: claim.vehicles?.customerContact?.email,
      customerPhone: claim.vehicle_id
        ? claim.vehicles?.customerContact?.phone
        : claim.manual_customer_phone,
      vehicleBrand: claim.vehicle_id
        ? claim.vehicles?.brand || ''
        : (claim.manual_vehicle_brand || ''),
      vehicleModel: claim.vehicle_id
        ? claim.vehicles?.model || ''
        : (claim.manual_vehicle_model || ''),
      vehicleLicenseNumber: claim.vehicle_id
        ? claim.vehicles?.license_number || 'N.v.t.'
        : (claim.manual_license_number || 'N.v.t.'),
      vehicleVin: claim.vehicles?.vin || '',
      deliveryDate: claim.vehicles?.details?.deliveryDate || new Date(),
      warrantyStartDate: claim.vehicles?.details?.deliveryDate || new Date(),
      warrantyEndDate: new Date(new Date(claim.vehicles?.details?.deliveryDate || new Date()).setFullYear(new Date().getFullYear() + 1)),
      problemDescription: claim.description || '',
      reportDate: claim.created_at,
      status: mapDbStatusToUi(claim.claim_status),
      priority: 'normaal',
      loanCarAssigned: claim.loan_car_assigned || false,
      loanCarId: claim.loan_car_id || undefined,
      loanCarDetails: claim.loan_car_id && claim.loan_cars ? {
        id: claim.loan_cars.id,
        brand: claim.loan_cars.vehicles?.brand || '',
        model: claim.loan_cars.vehicles?.model || '',
        licenseNumber: claim.loan_cars.vehicles?.license_number || '',
        available: claim.loan_cars.status === 'beschikbaar',
        vehicleId: claim.loan_cars.vehicle_id
      } : undefined,
      estimatedCost: claim.claim_amount || 0,
      actualCost: claim.claim_status === 'resolved' ? claim.claim_amount : undefined,
      resolutionDate: claim.resolution_date || (claim.claim_status === 'resolved' ? claim.updated_at : undefined),
      resolutionDescription: claim.resolution_description || undefined,
      attachments: [],
      createdAt: claim.created_at,
      updatedAt: claim.updated_at,
      // Manual entry fields
      manualCustomerName: claim.manual_customer_name,
      manualCustomerPhone: claim.manual_customer_phone,
      manualVehicleBrand: claim.manual_vehicle_brand,
      manualVehicleModel: claim.manual_vehicle_model,
      manualLicenseNumber: claim.manual_license_number
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
        vehicle_id: claim.vehicleId || null,
        description: claim.problemDescription,
        claim_status: claim.status ? mapUiStatusToDb(claim.status as any) : 'pending',
        claim_amount: claim.estimatedCost,
        manual_customer_name: claim.manualCustomerName || null,
        manual_customer_phone: claim.manualCustomerPhone || null,
        manual_vehicle_brand: claim.manualVehicleBrand || null,
        manual_vehicle_model: claim.manualVehicleModel || null,
        manual_license_number: claim.manualLicenseNumber || null,
        loan_car_id: claim.loanCarId || null,
        loan_car_assigned: claim.loanCarAssigned || false
      })
      .select()
      .single();
    
    // Update loan car status if assigned
    if (claim.loanCarId && claim.loanCarAssigned) {
      await supabase
        .from('loan_cars')
        .update({ status: 'uitgeleend' })
        .eq('id', claim.loanCarId);
    }

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
    if (updates.status) updateData.claim_status = mapUiStatusToDb(updates.status as any);
    if (updates.estimatedCost !== undefined) updateData.claim_amount = updates.estimatedCost;
    if (updates.actualCost !== undefined) updateData.claim_amount = updates.actualCost;
    if (updates.additionalNotes !== undefined) updateData.resolution_description = updates.additionalNotes;
    if (updates.loanCarId !== undefined) updateData.loan_car_id = updates.loanCarId || null;
    if (updates.loanCarAssigned !== undefined) updateData.loan_car_assigned = updates.loanCarAssigned;

    // Update loan car status if assignment changed
    if (updates.loanCarId !== undefined) {
      if (updates.loanCarId && updates.loanCarAssigned) {
        // Assign loan car - set status to 'uitgeleend'
        await supabase
          .from('loan_cars')
          .update({ status: 'uitgeleend' })
          .eq('id', updates.loanCarId);
      } else if (!updates.loanCarAssigned) {
        // Unassign loan car - set status to 'beschikbaar'
        if (updates.loanCarId) {
          await supabase
            .from('loan_cars')
            .update({ status: 'beschikbaar' })
            .eq('id', updates.loanCarId);
        }
      }
    }

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

export const deleteWarrantyClaim = async (claimId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('warranty_claims')
      .delete()
      .eq('id', claimId);

    if (error) throw error;
  } catch (error: any) {
    console.error("Failed to delete warranty claim:", error);
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
        claim_amount: resolutionData.actualCost,
        resolution_description: resolutionData.resolutionDescription,
        resolution_date: new Date().toISOString()
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

export const fetchActiveWarranties = async (): Promise<ActiveWarrantyVehicle[]> => {
  try {
    const now = new Date();
    
    // Fetch all delivered vehicles with customer data
    const { data, error } = await supabase
      .from('vehicles')
      .select(`
        id,
        brand,
        model,
        license_number,
        vin,
        customer_id,
        selling_price,
        sold_date,
        status,
        details,
        customerContact:contacts!vehicles_customer_id_fkey(
          first_name,
          last_name,
          email,
          phone,
          is_car_dealer
        )
      `)
      .in('status', ['afgeleverd', 'verkocht_b2c', 'verkocht_b2b'])
      .order('sold_date', { ascending: false });

    if (error) throw error;

    // Filter and map to active warranties
    const activeWarranties = (data || [])
      .filter((vehicle: any) => {
        // Only B2C: exclude B2B sales to car dealers
        if (vehicle.status === 'verkocht_b2b' && vehicle.customerContact?.is_car_dealer) {
          return false;
        }
        
        // Get delivery date
        const deliveryDate = new Date(vehicle.details?.deliveryDate || vehicle.sold_date || now);
        
        // Calculate warranty end date (12 months from delivery)
        const warrantyEndDate = new Date(deliveryDate);
        warrantyEndDate.setMonth(warrantyEndDate.getMonth() + 12);
        
        // Only include if warranty hasn't expired
        return warrantyEndDate > now;
      })
      .map((vehicle: any) => {
        const deliveryDate = new Date(vehicle.details?.deliveryDate || vehicle.sold_date || now);
        const warrantyEndDate = new Date(deliveryDate);
        warrantyEndDate.setMonth(warrantyEndDate.getMonth() + 12);
        
        const daysRemaining = Math.ceil((warrantyEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Determine risk level
        let estimatedRisk: 'laag' | 'gemiddeld' | 'hoog' = 'laag';
        if (daysRemaining < 30) {
          estimatedRisk = 'hoog';
        } else if (daysRemaining < 90) {
          estimatedRisk = 'gemiddeld';
        }
        
        return {
          id: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          licenseNumber: vehicle.license_number || '',
          vin: vehicle.vin,
          customerId: vehicle.customer_id || '',
          customerName: `${vehicle.customerContact?.first_name || ''} ${vehicle.customerContact?.last_name || ''}`.trim(),
          customerEmail: vehicle.customerContact?.email,
          customerPhone: vehicle.customerContact?.phone,
          deliveryDate,
          warrantyEndDate,
          daysRemaining,
          sellingPrice: vehicle.selling_price ? parseFloat(vehicle.selling_price) : undefined,
          estimatedRisk,
        } as ActiveWarrantyVehicle;
      });

    return activeWarranties;
  } catch (error: any) {
    console.error("Failed to fetch active warranties:", error);
    return [];
  }
};

export const getActiveWarrantyStats = async (): Promise<ActiveWarrantyStats> => {
  try {
    const warranties = await fetchActiveWarranties();
    
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    
    const expiringThisMonth = warranties.filter(w => 
      w.warrantyEndDate <= endOfMonth
    ).length;
    
    const expiringNextMonth = warranties.filter(w => 
      w.warrantyEndDate > endOfMonth && w.warrantyEndDate <= endOfNextMonth
    ).length;
    
    const totalVehicleValue = warranties.reduce((sum, w) => sum + (w.sellingPrice || 0), 0);
    
    const averageDaysRemaining = warranties.length > 0
      ? warranties.reduce((sum, w) => sum + w.daysRemaining, 0) / warranties.length
      : 0;
    
    return {
      totalActiveWarranties: warranties.length,
      expiringThisMonth,
      expiringNextMonth,
      totalVehicleValue,
      averageDaysRemaining: Math.round(averageDaysRemaining),
    };
  } catch (error: any) {
    console.error("Failed to fetch active warranty stats:", error);
    return {
      totalActiveWarranties: 0,
      expiringThisMonth: 0,
      expiringNextMonth: 0,
      totalVehicleValue: 0,
      averageDaysRemaining: 0,
    };
  }
};
