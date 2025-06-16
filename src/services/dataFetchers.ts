
import { supabase } from "@/integrations/supabase/client";
import { SystemDataAccess, Contact, Vehicle, Lead, Contract } from "@/types/systemData";

export const fetchAppointments = async (permissions: SystemDataAccess, maxItems: number) => {
  if (!permissions.appointments) return [];
  
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .gte('starttime', new Date().toISOString())
    .order('starttime', { ascending: true })
    .limit(maxItems);
  
  console.log('📅 Loaded appointments:', appointments?.length || 0);
  return appointments || [];
};

export const fetchContacts = async (permissions: SystemDataAccess, maxItems: number): Promise<Contact[]> => {
  if (!permissions.contacts && !permissions.customers) return [];
  
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(maxItems);

  // Map returned data to satisfy Contact[] typing
  const mappedContacts = (contacts || []).map((c) => ({
    ...c,
    type: c.type as 'supplier' | 'b2b' | 'b2c',
  }));
  
  console.log('👥 Loaded contacts:', contacts?.length || 0);
  return mappedContacts;
};

export const fetchVehicles = async (permissions: SystemDataAccess, maxItems: number): Promise<{ vehicles: Vehicle[], availableVehicles: Vehicle[] }> => {
  if (!permissions.vehicles) return { vehicles: [], availableVehicles: [] };
  
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(maxItems);
  
  const vehicleList = vehicles || [];
  const availableVehicles = vehicleList.filter(v => v.status === 'voorraad');
  
  console.log('🚗 Loaded vehicles:', vehicles?.length || 0);
  return { vehicles: vehicleList, availableVehicles };
};

export const fetchLeads = async (permissions: SystemDataAccess, maxItems: number): Promise<Lead[]> => {
  if (!permissions.leads) return [];
  
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(maxItems);
  
  console.log('📈 Loaded leads:', leads?.length || 0);
  return leads || [];
};

export const fetchContracts = async (permissions: SystemDataAccess, maxItems: number): Promise<Contract[]> => {
  if (!permissions.contracts) return [];
  
  const { data: contracts } = await supabase
    .from('contracts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(maxItems);

  // Map returned data to satisfy Contract[] typing
  const mappedContracts = (contracts || []).map((ctr) => ({
    ...ctr,
    type: ctr.type as 'b2b' | 'b2c',
  }));
  
  console.log('📄 Loaded contracts:', contracts?.length || 0);
  return mappedContracts;
};
