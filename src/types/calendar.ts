
export interface Appointment {
  id: string;
  title: string;
  description?: string;
  startTime: Date | string;
  endTime: Date | string;
  type: AppointmentType;
  status: AppointmentStatus;
  
  // Related entities
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  vehicleId?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleLicenseNumber?: string;
  leadId?: string;
  
  // Location and details
  location?: string;
  notes?: string;
  reminderSent?: boolean;
  confirmationSent?: boolean;
  
  // Metadata
  createdBy: string;
  assignedTo?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  
  // Google Calendar integration (will be available after SQL migration)
  googleEventId?: string;
  googleCalendarId?: string;
  sync_status?: 'pending' | 'synced' | 'error';
  last_synced_at?: Date | string;
  created_by_ai?: boolean;
  ai_agent_id?: string;
}

export type AppointmentType = 
  | "proefrit"
  | "aflevering" 
  | "ophalen"
  | "onderhoud"
  | "intake"
  | "bezichtiging"
  | "overig";

export type AppointmentStatus = 
  | "gepland"
  | "bevestigd"
  | "uitgevoerd"
  | "geannuleerd"
  | "no_show";

export interface CalendarView {
  type: "month" | "week" | "day" | "agenda";
  date: Date;
}

export interface AppointmentFilter {
  type?: AppointmentType;
  status?: AppointmentStatus;
  assignedTo?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}
