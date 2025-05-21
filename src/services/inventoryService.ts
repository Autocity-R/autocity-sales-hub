
import { Vehicle } from "@/types/inventory";

// Mock API for demonstration
export const fetchVehicles = async (): Promise<Vehicle[]> => {
  // Simulating API call
  return [
    {
      id: "1",
      licenseNumber: "HNZ-60-N",
      model: "Audi A4 2.0 TDI",
      importStatus: "niet_gestart",
      arrived: false,
      workshopStatus: "wachten",
      showroomOnline: false,
      bpmRequested: false,
      damage: {
        description: "Kras op voorportier",
        status: "licht"
      },
      purchasePrice: 18500,
      cmrSent: false,
      cmrDate: null,
      papersReceived: false,
      papersDate: null,
      notes: ""
    },
    {
      id: "2",
      licenseNumber: "AB-123-C",
      model: "BMW 3-serie 320d",
      importStatus: "onderweg",
      arrived: false,
      workshopStatus: "wachten",
      showroomOnline: false,
      bpmRequested: true,
      damage: {
        description: "",
        status: "geen"
      },
      purchasePrice: 24500,
      cmrSent: true,
      cmrDate: new Date(2023, 5, 15),
      papersReceived: false,
      papersDate: null,
      notes: "Verwacht eind deze week"
    },
    {
      id: "3",
      licenseNumber: "ZX-789-Y",
      model: "Mercedes E-Klasse",
      importStatus: "aangekomen",
      arrived: true,
      workshopStatus: "poetsen",
      showroomOnline: false,
      bpmRequested: true,
      damage: {
        description: "Deuk in achterbumper",
        status: "middel"
      },
      purchasePrice: 32000,
      cmrSent: true,
      cmrDate: new Date(2023, 4, 20),
      papersReceived: true,
      papersDate: new Date(2023, 5, 1),
      notes: "Klant heeft interesse getoond"
    }
  ];
};

// Mock update function
export const updateVehicle = async (vehicle: Vehicle): Promise<Vehicle> => {
  // Simulating API call
  return vehicle;
};

// Mock bulk update function
export const bulkUpdateVehicles = async (ids: string[], updates: Partial<Vehicle>): Promise<Vehicle[]> => {
  // Simulating API call
  console.log("Bulk updating vehicles:", ids, updates);
  return []; // Would normally return updated vehicles
};

// Mock create function
export const createVehicle = async (vehicle: Omit<Vehicle, "id">): Promise<Vehicle> => {
  // Simulating API call
  return {
    ...vehicle,
    id: Math.random().toString(36).substring(7) // Generate random ID
  };
};

// Mock email sending function
export const sendEmail = async (type: string, vehicleIds: string[]): Promise<boolean> => {
  // Simulating API call
  console.log(`Sending ${type} email for vehicles:`, vehicleIds);
  return true;
};
