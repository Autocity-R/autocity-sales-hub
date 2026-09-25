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
 * Get checklist data by access token (public, no auth required) via SECURITY DEFINER RPC.
 * Returns only basic vehicle fields + checklist (no prices / customer data).
 */
export const getVehicleByToken = async (token: string) => {
  const { data, error } = await (supabase as any).rpc('get_checklist_by_token', { p_token: token });
  if (error || !data) {
    throw new Error(error?.message?.includes('Ongeldige link') ? 'Ongeldige link' : (error?.message || 'Voertuig niet gevonden'));
  }
  return data as {
    vehicle_id: string; brand: string | null; model: string | null; license_number: string | null;
    color: string | null; vin: string | null; year: number | null; status: string | null;
    import_status: string | null; checklist: any[];
  };
};

/** Toggle one checklist item atomically via RPC; returns the updated checklist. */
export const toggleChecklistItemByToken = async (token: string, itemId: string, completed: boolean) => {
  const { data, error } = await (supabase as any).rpc('toggle_checklist_item_by_token', {
    p_token: token, p_item_id: itemId, p_completed: completed,
  });
  if (error) throw new Error(error.message || 'Afvinken mislukt');
  return (data || []) as any[];
};

/**
 * Production domain for printed QR codes. Source: Lovable project settings —
 * custom domain https://autocity-crm.nl (published fallback: autocity-sales-hub.lovable.app).
 */
export const PRODUCTION_ORIGIN = 'https://autocity-crm.nl';

const isPreviewHost = (host: string) =>
  host.includes('lovable.app') || host.includes('lovableproject.com') || host.includes('localhost');

/**
 * Build the checklist URL for a given token
 */
export const buildChecklistUrl = (token: string): string => {
  const baseUrl = isPreviewHost(window.location.hostname) ? PRODUCTION_ORIGIN : window.location.origin;
  return `${baseUrl}/checklist/view/${token}`;
};
