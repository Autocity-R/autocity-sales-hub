
import { supabase } from "@/integrations/supabase/client";
import { SystemDataAccess } from "@/types/systemData";

export const fetchRecentActivity = async (permissions: SystemDataAccess): Promise<any[]> => {
  const recentActivity = [];

  // Recent appointments
  if (permissions.appointments) {
    const { data: recentAppts } = await supabase
      .from('appointments')
      .select('id, title, customername, created_at, type')
      .order('created_at', { ascending: false })
      .limit(5);

    recentAppts?.forEach(appt => {
      recentActivity.push({
        type: 'appointment',
        id: appt.id,
        description: `${appt.type}: ${appt.title} met ${appt.customername}`,
        timestamp: appt.created_at
      });
    });
  }

  // Recent contacts
  if (permissions.contacts || permissions.customers) {
    const { data: recentContacts } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    recentContacts?.forEach(contact => {
      recentActivity.push({
        type: 'contact',
        id: contact.id,
        description: `Nieuwe contact: ${contact.first_name} ${contact.last_name}`,
        timestamp: contact.created_at
      });
    });
  }

  // Recent vehicles
  if (permissions.vehicles) {
    const { data: recentVehicles } = await supabase
      .from('vehicles')
      .select('id, brand, model, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    recentVehicles?.forEach(vehicle => {
      recentActivity.push({
        type: 'vehicle',
        id: vehicle.id,
        description: `Auto toegevoegd: ${vehicle.brand} ${vehicle.model} (${vehicle.status})`,
        timestamp: vehicle.created_at
      });
    });
  }

  return recentActivity
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 12);
};
