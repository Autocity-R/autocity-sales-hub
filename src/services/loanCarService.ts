import { supabase } from "@/integrations/supabase/client";
import { LoanCar } from "@/types/warranty";

export const fetchLoanCars = async (): Promise<LoanCar[]> => {
  try {
    const { data, error } = await supabase
      .from('loan_cars')
      .select(`
        *,
        vehicles!loan_cars_vehicle_id_fkey (
          brand,
          model,
          license_number
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((loanCar: any) => ({
      id: loanCar.id,
      brand: loanCar.vehicles?.brand || '',
      model: loanCar.vehicles?.model || '',
      licenseNumber: loanCar.vehicles?.license_number || '',
      available: loanCar.status === 'beschikbaar',
      vehicleId: loanCar.vehicle_id
    }));
  } catch (error: any) {
    console.error("Failed to fetch loan cars:", error);
    return [];
  }
};

export const createLoanCar = async (data: {
  brand: string;
  model: string;
  licenseNumber: string;
}): Promise<LoanCar> => {
  try {
    // First create a vehicle for the loan car
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .insert({
        brand: data.brand,
        model: data.model,
        license_number: data.licenseNumber,
        status: 'leenauto',
        details: {
          isLoanCar: true
        }
      })
      .select()
      .single();

    if (vehicleError) throw vehicleError;

    // Then create the loan car entry
    const { data: loanCar, error: loanCarError } = await supabase
      .from('loan_cars')
      .insert({
        vehicle_id: vehicle.id,
        status: 'beschikbaar'
      })
      .select()
      .single();

    if (loanCarError) throw loanCarError;

    return {
      id: loanCar.id,
      brand: data.brand,
      model: data.model,
      licenseNumber: data.licenseNumber,
      available: true
    };
  } catch (error: any) {
    console.error("Failed to create loan car:", error);
    throw error;
  }
};

export const updateLoanCar = async (
  id: string,
  vehicleId: string,
  data: {
    brand: string;
    model: string;
    licenseNumber: string;
  }
): Promise<LoanCar> => {
  try {
    // Update the vehicle details
    const { error: vehicleError } = await supabase
      .from('vehicles')
      .update({
        brand: data.brand,
        model: data.model,
        license_number: data.licenseNumber
      })
      .eq('id', vehicleId);

    if (vehicleError) throw vehicleError;

    return {
      id,
      brand: data.brand,
      model: data.model,
      licenseNumber: data.licenseNumber,
      available: true
    };
  } catch (error: any) {
    console.error("Failed to update loan car:", error);
    throw error;
  }
};

export const deleteLoanCar = async (id: string, vehicleId: string): Promise<void> => {
  try {
    // First delete the loan car entry
    const { error: loanCarError } = await supabase
      .from('loan_cars')
      .delete()
      .eq('id', id);

    if (loanCarError) throw loanCarError;

    // Try to delete the vehicle if vehicleId is provided
    if (vehicleId) {
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleId);

      // Log vehicle deletion error but don't fail the entire operation
      // This allows non-admin users to remove loan cars from the list
      // even if they can't delete the underlying vehicle record due to RLS
      if (vehicleError) {
        console.warn("Could not delete vehicle record (may be due to RLS permissions):", vehicleError);
      }
    }
  } catch (error: any) {
    console.error("Failed to delete loan car:", error);
    throw error;
  }
};

export const toggleLoanCarAvailability = async (
  id: string,
  currentStatus: string
): Promise<void> => {
  try {
    const newStatus = currentStatus === 'beschikbaar' ? 'uitgeleend' : 'beschikbaar';
    
    const { error } = await supabase
      .from('loan_cars')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) throw error;
  } catch (error: any) {
    console.error("Failed to toggle loan car availability:", error);
    throw error;
  }
};
