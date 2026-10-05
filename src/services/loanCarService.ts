import { supabase } from "@/integrations/supabase/client";
import { LoanCar } from "@/types/warranty";

const db = supabase as any;

/** Ruwe database-/RLS-fouten omzetten naar een begrijpelijke NL-melding. */
export const friendlyLoanCarError = (e: any): Error => {
  const msg = String(e?.message || e || "");
  if (/row-level security|permission denied|42501/i.test(msg))
    return new Error("Je hebt geen rechten voor deze actie. Vraag een beheerder om hulp.");
  return new Error(msg.replace(/^.*?ERROR:\s*/i, "") || "Er is een fout opgetreden.");
};

export const fetchLoanCars = async (includeInactive = false): Promise<LoanCar[]> => {
  try {
    let q = db
      .from('loan_cars')
      .select(`*, vehicles!loan_cars_vehicle_id_fkey (brand, model, license_number)`)
      .order('created_at', { ascending: false });
    if (!includeInactive) q = q.eq('actief', true);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map((loanCar: any) => ({
      id: loanCar.id,
      brand: loanCar.vehicles?.brand || '',
      model: loanCar.vehicles?.model || '',
      licenseNumber: loanCar.vehicles?.license_number || '',
      available: (loanCar.status || '').toLowerCase() === 'beschikbaar',
      vehicleId: loanCar.vehicle_id,
      bron: loanCar.bron === 'voorraad' ? 'voorraad' : 'eigen',
      actief: loanCar.actief !== false,
    }));
  } catch (error: any) {
    console.error("Failed to fetch loan cars:", error);
    return [];
  }
};

/** Nieuwe eigen leenauto (maakt een voertuig met status leenauto aan). */
export const createLoanCar = async (data: { brand: string; model: string; licenseNumber: string }): Promise<string> => {
  const { data: id, error } = await db.rpc('leenauto_toevoegen', {
    p_brand: data.brand, p_model: data.model, p_kenteken: data.licenseNumber, p_vehicle_id: null,
  });
  if (error) throw friendlyLoanCarError(error);
  return id as string;
};

/** Bestaande voorraadauto tijdelijk als leenauto: voertuig blijft in de voorraad. */
export const addStockCarAsLoanCar = async (vehicleId: string): Promise<string> => {
  const { data: id, error } = await db.rpc('leenauto_toevoegen', { p_vehicle_id: vehicleId });
  if (error) throw friendlyLoanCarError(error);
  return id as string;
};

export const updateLoanCar = async (
  id: string,
  _vehicleId: string,
  data: { brand: string; model: string; licenseNumber: string },
): Promise<void> => {
  const { error } = await db.rpc('leenauto_bijwerken', {
    p_loan_car_id: id, p_brand: data.brand, p_model: data.model, p_kenteken: data.licenseNumber,
  });
  if (error) throw friendlyLoanCarError(error);
};

/** "Niet meer als leenauto gebruiken": historie blijft, auto verdwijnt uit beheer. */
export const deactivateLoanCar = async (id: string): Promise<void> => {
  const { error } = await db.rpc('leenauto_deactiveren', { p_loan_car_id: id });
  if (error) throw friendlyLoanCarError(error);
};

export const deleteLoanCar = async (id: string, vehicleId: string): Promise<void> => {
  const { error: loanCarError } = await supabase.from('loan_cars').delete().eq('id', id);
  if (loanCarError) throw friendlyLoanCarError(loanCarError);
  if (vehicleId) {
    const { error: vehicleError } = await supabase.from('vehicles').delete().eq('id', vehicleId);
    if (vehicleError) console.warn("Could not delete vehicle record (may be due to RLS permissions):", vehicleError);
  }
};

/** Voorraadauto's zoeken (kenteken genormaliseerd, merk/model). */
export const searchStockVehicles = async (q: string) => {
  const s = q.trim().replace(/[,%()]/g, " ");
  if (s.length < 2) return [];
  const squashed = s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const dashed = squashed.length >= 4 ? squashed.split("").join("%") : s;
  const { data } = await supabase
    .from('vehicles')
    .select('id, brand, model, license_number, status')
    .in('status', ['voorraad', 'onderweg', 'transport'])
    .or(`brand.ilike.%${s}%,model.ilike.%${s}%,license_number.ilike.%${s}%,license_number.ilike.%${dashed}%`)
    .limit(10);
  return (data || []) as { id: string; brand: string; model: string; license_number: string | null; status: string }[];
};

export const setLoanCarAvailability = async (id: string, makeAvailable: boolean): Promise<void> => {
  const updateData: any = { status: makeAvailable ? 'beschikbaar' : 'uitgeleend' };
  if (makeAvailable) {
    updateData.customer_id = null; updateData.start_date = null; updateData.end_date = null; updateData.notes = null;
  }
  const { error } = await supabase.from('loan_cars').update(updateData).eq('id', id);
  if (error) throw friendlyLoanCarError(error);
};

export const toggleLoanCarAvailability = async (id: string, currentStatus: string): Promise<void> => {
  const newStatus = currentStatus === 'beschikbaar' ? 'uitgeleend' : 'beschikbaar';
  const { error } = await supabase.from('loan_cars').update({ status: newStatus }).eq('id', id);
  if (error) throw friendlyLoanCarError(error);
};
