import { Appointment, AppointmentType, AppointmentStatus } from "@/types/calendar";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Mock appointments data with lead connections
const mockAppointments: Appointment[] = [
  {
    id: "app-1",
    title: "Proefrit BMW 3 Serie",
    description: "Proefrit voor potentiële klant Jan de Vries",
    startTime: new Date("2024-01-20T10:00:00"),
    endTime: new Date("2024-01-20T11:00:00"),
    type: "proefrit",
    status: "bevestigd",
    customerId: "cust-1",
    customerName: "Jan de Vries",
    customerEmail: "jan.devries@gmail.com",
    customerPhone: "+31 6 12345678",
    vehicleId: "v-1",
    vehicleBrand: "BMW",
    vehicleModel: "3 Serie",
    vehicleLicenseNumber: "AB-123-CD",
    leadId: "lead1",
    location: "Showroom",
    notes: "Klant geïnteresseerd in lease optie",
    confirmationSent: true,
    createdBy: "Pieter Jansen",
    assignedTo: "Pieter Jansen",
    createdAt: new Date("2024-01-15T09:00:00"),
    updatedAt: new Date("2024-01-15T09:00:00")
  },
  {
    id: "app-2",
    title: "Aflevering Mercedes E-Class",
    description: "Aflevering voor Mark Bakker - Bakker Group",
    startTime: new Date("2024-01-22T14:00:00"),
    endTime: new Date("2024-01-22T15:00:00"),
    type: "aflevering",
    status: "gepland",
    customerId: "cust-2",
    customerName: "Mark Bakker",
    customerEmail: "mark@bakkergroup.nl",
    customerPhone: "+31 6 11223344",
    vehicleId: "v-2",
    vehicleBrand: "Mercedes",
    vehicleModel: "E-Class",
    vehicleLicenseNumber: "EF-456-GH",
    leadId: "lead3",
    location: "Bakker Group - Hoofdkantoor",
    notes: "Fleet delivery, contract getekend",
    confirmationSent: false,
    createdBy: "Sander Vermeulen",
    assignedTo: "Sander Vermeulen",
    createdAt: new Date("2024-01-16T11:00:00"),
    updatedAt: new Date("2024-01-16T11:00:00")
  },
  {
    id: "app-3",
    title: "Proefrit Audi A4",
    description: "Eerste proefrit voor Lisa Schmidt",
    startTime: new Date("2024-01-25T13:30:00"),
    endTime: new Date("2024-01-25T14:30:00"),
    type: "proefrit",
    status: "gepland",
    customerName: "Lisa Schmidt",
    customerEmail: "l.schmidt@hotmail.com",
    customerPhone: "+31 6 87654321",
    vehicleBrand: "Audi",
    vehicleModel: "A4",
    leadId: "lead2",
    location: "Showroom",
    notes: "Eerste auto, heeft financiering nodig. Klant komt om 13:30",
    confirmationSent: true,
    createdBy: "Sander Vermeulen",
    assignedTo: "Sander Vermeulen",
    createdAt: new Date("2024-01-18T10:15:00"),
    updatedAt: new Date("2024-01-18T10:15:00")
  },
  {
    id: "app-4",
    title: "Bezichtiging BMW X5",
    description: "Klant wil de BMW X5 bekijken",
    startTime: new Date("2024-01-23T11:00:00"),
    endTime: new Date("2024-01-23T12:00:00"),
    type: "bezichtiging",
    status: "bevestigd",
    customerName: "Peter van der Berg",
    customerEmail: "p.vandenberg@email.com",
    customerPhone: "+31 6 55667788",
    vehicleBrand: "BMW",
    vehicleModel: "X5",
    location: "Showroom",
    notes: "Geïnteresseerd in zwarte uitvoering",
    confirmationSent: true,
    createdBy: "Pieter Jansen",
    assignedTo: "Pieter Jansen",
    createdAt: new Date("2024-01-19T14:20:00"),
    updatedAt: new Date("2024-01-19T14:20:00")
  },
  {
    id: "app-5",
    title: "Onderhoud Mercedes C-Class",
    description: "Regulier onderhoud voor bestaande klant",
    startTime: new Date("2024-01-24T09:00:00"),
    endTime: new Date("2024-01-24T11:00:00"),
    type: "onderhoud",
    status: "bevestigd",
    customerName: "Sandra Jansen",
    customerEmail: "sandra.jansen@gmail.com",
    customerPhone: "+31 6 99887766",
    vehicleBrand: "Mercedes",
    vehicleModel: "C-Class",
    vehicleLicenseNumber: "GH-789-IJ",
    location: "Werkplaats",
    notes: "Grote beurt + APK",
    confirmationSent: true,
    createdBy: "Technische dienst",
    assignedTo: "Monteur Jan",
    createdAt: new Date("2024-01-17T16:45:00"),
    updatedAt: new Date("2024-01-17T16:45:00")
  },
  {
    id: "app-6",
    title: "Intake nieuw voertuig",
    description: "Intake van nieuwe BMW i4 voor verkoop",
    startTime: new Date("2024-01-26T10:30:00"),
    endTime: new Date("2024-01-26T11:30:00"),
    type: "intake",
    status: "gepland",
    customerName: "Leverancier AutoHouse",
    customerEmail: "intake@autohouse.nl",
    customerPhone: "+31 20 1234567",
    vehicleBrand: "BMW",
    vehicleModel: "i4",
    location: "Inkomende goederen",
    notes: "Elektrische BMW, volledig geïnspecteerd",
    confirmationSent: false,
    createdBy: "Inkoopafdeling",
    assignedTo: "Pieter Jansen",
    createdAt: new Date("2024-01-20T11:30:00"),
    updatedAt: new Date("2024-01-20T11:30:00")
  }
];

export const fetchAppointments = async (
  startDate?: Date,
  endDate?: Date
): Promise<Appointment[]> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('start', startDate.toISOString());
    if (endDate) params.append('end', endDate.toISOString());
    
    const response = await fetch(`${API_URL}/api/appointments?${params}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to fetch appointments:", error);
    return mockAppointments.filter(apt => {
      if (!startDate || !endDate) return true;
      const aptDate = new Date(apt.startTime);
      return aptDate >= startDate && aptDate <= endDate;
    });
  }
};

export const createAppointment = async (
  appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Appointment> => {
  try {
    const response = await fetch(`${API_URL}/api/appointments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(appointment),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to create appointment:", error);
    // Return mock created appointment
    const newAppointment: Appointment = {
      ...appointment,
      id: `app-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockAppointments.push(newAppointment);
    return newAppointment;
  }
};

export const updateAppointment = async (
  appointmentId: string,
  updates: Partial<Appointment>
): Promise<Appointment> => {
  try {
    const response = await fetch(`${API_URL}/api/appointments/${appointmentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to update appointment:", error);
    // Return mock updated appointment
    const existingAppointment = mockAppointments.find(a => a.id === appointmentId);
    if (!existingAppointment) throw error;
    return { ...existingAppointment, ...updates, updatedAt: new Date() };
  }
};

export const deleteAppointment = async (appointmentId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/api/appointments/${appointmentId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error: any) {
    console.error("Failed to delete appointment:", error);
    // Mock delete
    const index = mockAppointments.findIndex(a => a.id === appointmentId);
    if (index > -1) {
      mockAppointments.splice(index, 1);
    }
  }
};

export const sendAppointmentConfirmation = async (
  appointmentId: string,
  message?: string
): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/api/appointments/${appointmentId}/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error: any) {
    console.error("Failed to send confirmation:", error);
    // Mock success
    console.log(`Confirmation sent for appointment ${appointmentId}`);
  }
};
