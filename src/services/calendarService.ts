import { Appointment, AppointmentType, AppointmentStatus } from "@/types/calendar";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type DbAppointment = Database['public']['Tables']['appointments']['Row'];
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];

// Convert database appointment to frontend type
const convertDbAppointment = (dbAppointment: DbAppointment): Appointment => ({
  id: dbAppointment.id,
  title: dbAppointment.title,
  description: dbAppointment.description || undefined,
  startTime: dbAppointment.starttime,
  endTime: dbAppointment.endtime,
  type: dbAppointment.type as AppointmentType,
  status: dbAppointment.status as AppointmentStatus,
  customerId: dbAppointment.customerid || undefined,
  customerName: dbAppointment.customername || undefined,
  customerEmail: dbAppointment.customeremail || undefined,
  customerPhone: dbAppointment.customerphone || undefined,
  vehicleId: dbAppointment.vehicleid || undefined,
  vehicleBrand: dbAppointment.vehiclebrand || undefined,
  vehicleModel: dbAppointment.vehiclemodel || undefined,
  vehicleLicenseNumber: dbAppointment.vehiclelicensenumber || undefined,
  leadId: dbAppointment.leadid || undefined,
  location: dbAppointment.location || undefined,
  notes: dbAppointment.notes || undefined,
  reminderSent: dbAppointment.remindersent || false,
  confirmationSent: dbAppointment.confirmationsent || false,
  createdBy: dbAppointment.createdby,
  assignedTo: dbAppointment.assignedto || undefined,
  createdAt: dbAppointment.created_at,
  updatedAt: dbAppointment.updated_at,
  googleEventId: dbAppointment.google_event_id || undefined,
  googleCalendarId: dbAppointment.google_calendar_id || undefined,
  sync_status: dbAppointment.sync_status as 'pending' | 'synced' | 'error' || 'pending',
  last_synced_at: dbAppointment.last_synced_at || undefined,
  created_by_ai: dbAppointment.created_by_ai || false,
  ai_agent_id: dbAppointment.ai_agent_id || undefined
});

// Convert frontend appointment to database insert format
const convertToDbInsert = (appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): AppointmentInsert => ({
  title: appointment.title,
  description: appointment.description,
  starttime: typeof appointment.startTime === 'string' ? appointment.startTime : appointment.startTime.toISOString(),
  endtime: typeof appointment.endTime === 'string' ? appointment.endTime : appointment.endTime.toISOString(),
  type: appointment.type,
  status: appointment.status,
  customerid: appointment.customerId,
  customername: appointment.customerName,
  customeremail: appointment.customerEmail,
  customerphone: appointment.customerPhone,
  vehicleid: appointment.vehicleId,
  vehiclebrand: appointment.vehicleBrand,
  vehiclemodel: appointment.vehicleModel,
  vehiclelicensenumber: appointment.vehicleLicenseNumber,
  leadid: appointment.leadId,
  location: appointment.location,
  notes: appointment.notes,
  remindersent: appointment.reminderSent,
  confirmationsent: appointment.confirmationSent,
  createdby: appointment.createdBy,
  assignedto: appointment.assignedTo,
  google_event_id: appointment.googleEventId,
  google_calendar_id: appointment.googleCalendarId,
  sync_status: appointment.sync_status,
  last_synced_at: typeof appointment.last_synced_at === 'string' ? appointment.last_synced_at : appointment.last_synced_at?.toISOString(),
  created_by_ai: appointment.created_by_ai,
  ai_agent_id: appointment.ai_agent_id
});

export const fetchAppointments = async (
  startDate?: Date,
  endDate?: Date
): Promise<Appointment[]> => {
  try {
    let query = supabase
      .from('appointments')
      .select('*')
      .order('starttime', { ascending: true });

    if (startDate) {
      query = query.gte('starttime', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('starttime', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching appointments:', error);
      throw error;
    }

    return data?.map(convertDbAppointment) || [];
  } catch (error) {
    console.error("Failed to fetch appointments:", error);
    throw error;
  }
};

export const createAppointment = async (
  appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Appointment> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const dbAppointment = convertToDbInsert({
      ...appointment,
      createdBy: appointment.createdBy || user.email || 'Unknown User'
    });

    const { data, error } = await supabase
      .from('appointments')
      .insert(dbAppointment)
      .select()
      .single();

    if (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }

    return convertDbAppointment(data);
  } catch (error) {
    console.error("Failed to create appointment:", error);
    throw error;
  }
};

export const updateAppointment = async (
  appointmentId: string,
  updates: Partial<Appointment>
): Promise<Appointment> => {
  try {
    // Convert frontend updates to database format
    const dbUpdates: any = {};
    
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.startTime !== undefined) {
      dbUpdates.starttime = typeof updates.startTime === 'string' ? updates.startTime : updates.startTime.toISOString();
    }
    if (updates.endTime !== undefined) {
      dbUpdates.endtime = typeof updates.endTime === 'string' ? updates.endTime : updates.endTime.toISOString();
    }
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.customerName !== undefined) dbUpdates.customername = updates.customerName;
    if (updates.customerEmail !== undefined) dbUpdates.customeremail = updates.customerEmail;
    if (updates.customerPhone !== undefined) dbUpdates.customerphone = updates.customerPhone;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.sync_status !== undefined) dbUpdates.sync_status = updates.sync_status;
    if (updates.googleEventId !== undefined) dbUpdates.google_event_id = updates.googleEventId;
    if (updates.last_synced_at !== undefined) {
      dbUpdates.last_synced_at = typeof updates.last_synced_at === 'string' ? updates.last_synced_at : updates.last_synced_at?.toISOString();
    }

    const { data, error } = await supabase
      .from('appointments')
      .update(dbUpdates)
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }

    return convertDbAppointment(data);
  } catch (error) {
    console.error("Failed to update appointment:", error);
    throw error;
  }
};

export const deleteAppointment = async (appointmentId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointmentId);

    if (error) {
      console.error('Error deleting appointment:', error);
      throw error;
    }
  } catch (error) {
    console.error("Failed to delete appointment:", error);
    throw error;
  }
};

export const sendAppointmentConfirmation = async (
  appointmentId: string,
  message?: string
): Promise<void> => {
  try {
    // Update confirmation status
    await updateAppointment(appointmentId, { confirmationSent: true });
    
    // Here you could integrate with an email service
    console.log(`Confirmation sent for appointment ${appointmentId}`, message);
  } catch (error) {
    console.error("Failed to send confirmation:", error);
    throw error;
  }
};
