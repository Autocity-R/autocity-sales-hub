
import { Vehicle, SalesStatus } from "@/types/inventory";

// Mock API for demonstration
export const fetchVehicles = async (): Promise<Vehicle[]> => {
  // Simulating API call
  return [
    {
      id: "1",
      brand: "Audi",
      model: "A4 2.0 TDI S Line",
      licenseNumber: "HNZ-60-N",
      vin: "WAUZZZ8K9NA123456",
      mileage: 45000,
      importStatus: "niet_gestart",
      arrived: false,
      workshopStatus: "wachten",
      location: "opslag",
      salesStatus: "voorraad",
      showroomOnline: false,
      bpmRequested: false,
      bpmStarted: false,
      damage: {
        description: "Kras op voorportier",
        status: "licht"
      },
      purchasePrice: 18500,
      cmrSent: false,
      cmrDate: null,
      papersReceived: false,
      papersDate: null,
      notes: "",
      mainPhotoUrl: "https://images.unsplash.com/photo-1489824904134-891ab64532f1?q=80&w=800",
      photos: [
        "https://images.unsplash.com/photo-1489824904134-891ab64532f1?q=80&w=800",
        "https://images.unsplash.com/photo-1489824904134-891ab64532f1?q=80&w=800"
      ],
      createdAt: new Date(2024, 4, 1).toISOString() // May 1, 2024
    },
    {
      id: "2",
      brand: "BMW",
      model: "3-serie 320d M Sport",
      licenseNumber: "AB-123-C",
      vin: "WBA8E9C50GK123456",
      mileage: 62000,
      importStatus: "onderweg",
      arrived: false,
      workshopStatus: "wachten",
      location: "opslag",
      salesStatus: "voorraad",
      showroomOnline: false,
      bpmRequested: true,
      bpmStarted: true,
      damage: {
        description: "",
        status: "geen"
      },
      purchasePrice: 24500,
      cmrSent: true,
      cmrDate: new Date(2023, 5, 15),
      papersReceived: false,
      papersDate: null,
      notes: "Verwacht eind deze week",
      mainPhotoUrl: "https://images.unsplash.com/photo-1556189250-72ba954cfc2b?q=80&w=800",
      photos: [
        "https://images.unsplash.com/photo-1556189250-72ba954cfc2b?q=80&w=800",
        "https://images.unsplash.com/photo-1556189250-72ba954cfc2b?q=80&w=800"
      ],
      createdAt: new Date(2024, 3, 15).toISOString() // April 15, 2024
    },
    {
      id: "3",
      brand: "Mercedes",
      model: "E-Klasse E220d AMG Line",
      licenseNumber: "ZX-789-Y",
      vin: "WDD2130421A123456",
      mileage: 38000,
      importStatus: "aangekomen",
      arrived: true,
      workshopStatus: "poetsen",
      location: "showroom",
      salesStatus: "voorraad",
      showroomOnline: false,
      bpmRequested: true,
      bpmStarted: true,
      damage: {
        description: "Deuk in achterbumper",
        status: "middel"
      },
      purchasePrice: 32000,
      cmrSent: true,
      cmrDate: new Date(2023, 4, 20),
      papersReceived: true,
      papersDate: new Date(2023, 5, 1),
      notes: "Klant heeft interesse getoond",
      mainPhotoUrl: "https://images.unsplash.com/photo-1563720223489-c94d197a0a0e?q=80&w=800",
      photos: [
        "https://images.unsplash.com/photo-1563720223489-c94d197a0a0e?q=80&w=800",
        "https://images.unsplash.com/photo-1563720223489-c94d197a0a0e?q=80&w=800"
      ],
      createdAt: new Date(2024, 2, 10).toISOString() // March 10, 2024
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

// Function to change sales status
export const updateSalesStatus = async (id: string, status: SalesStatus): Promise<Vehicle> => {
  // Simulating API call
  console.log(`Changing vehicle ${id} status to ${status}`);
  return { id } as Vehicle; // Would normally return updated vehicle
};

// Function to delete vehicle
export const deleteVehicle = async (id: string): Promise<boolean> => {
  // Simulating API call
  console.log(`Deleting vehicle ${id}`);
  return true;
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

// Mock photo upload function
export const uploadVehiclePhoto = async (vehicleId: string, file: File, isMain: boolean): Promise<string> => {
  // Simulating API call
  console.log(`Uploading photo for vehicle ${vehicleId}, main photo: ${isMain}`);
  // Return a random image URL for demonstration purposes
  const imageUrls = [
    "https://images.unsplash.com/photo-1489824904134-891ab64532f1?q=80&w=800",
    "https://images.unsplash.com/photo-1556189250-72ba954cfc2b?q=80&w=800",
    "https://images.unsplash.com/photo-1563720223489-c94d197a0a0e?q=80&w=800"
  ];
  return imageUrls[Math.floor(Math.random() * imageUrls.length)];
};
