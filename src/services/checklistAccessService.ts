import { supabase } from "@/integrations/supabase/client";

/**
 * Generate a random access token
 */
const generateToken = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let token = '';
  for (let i = 0; i < 24; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

/**
 * Get or create an access token for a vehicle's checklist
 */
export const getOrCreateChecklistToken = async (vehicleId: string): Promise<string> => {
  // Check for existing token
  const { data: existing } = await supabase
    .from('checklist_access_tokens')
    .select('token')
    .eq('vehicle_id', vehicleId)
    .limit(1)
    .single();

  if (existing?.token) {
    return existing.token;
  }

  // Create new token
  const token = generateToken();
  const { data: user } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('checklist_access_tokens')
    .insert({
      vehicle_id: vehicleId,
      token,
      created_by: user.user?.id || null,
    });

  if (error) throw error;
  return token;
};

/**
 * Get vehicle data by checklist access token (public, no auth required)
 */
export const getVehicleByToken = async (token: string) => {
  // First get the vehicle_id from the token
  const { data: tokenData, error: tokenError } = await supabase
    .from('checklist_access_tokens')
    .select('vehicle_id')
    .eq('token', token)
    .single();

  if (tokenError || !tokenData) {
    throw new Error('Ongeldige link');
  }

  // Get vehicle data
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', tokenData.vehicle_id)
    .single();

  if (vehicleError || !vehicle) {
    throw new Error('Voertuig niet gevonden');
  }

  return vehicle;
};

/**
 * Build the checklist URL for a given token
 */
export const buildChecklistUrl = (token: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/checklist/view/${token}`;
};
