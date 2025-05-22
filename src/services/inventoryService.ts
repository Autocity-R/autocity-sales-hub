import { Vehicle, PaymentStatus, PaintStatus, DamageStatus, SalesStatus } from "@/types/inventory";
import { FileCategory, VehicleFile } from "@/types/files";

// Mock API endpoint
const API_ENDPOINT = "http://localhost:3000/api";

// Mock function to fetch all vehicles
export const fetchVehicles = async (): Promise<Vehicle[]> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockVehicles: Vehicle[] = [
        {
          id: "1",
          brand: "Mercedes-Benz",
          model: "C-Class",
          licenseNumber: "ABC-123",
          vin: "1234567890",
          mileage: 50000,
          importStatus: "niet_gestart",
          arrived: false,
          workshopStatus: "wachten",
          location: "showroom",
          salesStatus: "voorraad",
          showroomOnline: false,
          bpmRequested: false,
          bpmStarted: false,
          damage: {
            description: "Scratches on the bumper",
            status: "licht"
          },
          purchasePrice: 35000,
          sellingPrice: 40000,
          paymentStatus: "niet_betaald",
          paintStatus: "geen_behandeling",
          cmrSent: false,
          cmrDate: null,
          papersReceived: false,
          papersDate: null,
          notes: "",
          mainPhotoUrl: null,
          photos: []
        },
        {
          id: "2",
          brand: "BMW",
          model: "3 Series",
          licenseNumber: "DEF-456",
          vin: "0987654321",
          mileage: 40000,
          importStatus: "aangekomen",
          arrived: true,
          workshopStatus: "gereed",
          location: "showroom",
          salesStatus: "verkocht_b2b",
          showroomOnline: true,
          bpmRequested: true,
          bpmStarted: true,
          damage: {
            description: "",
            status: "geen"
          },
          purchasePrice: 40000,
          sellingPrice: 45000,
          paymentStatus: "volledig_betaald",
          paintStatus: "geen_behandeling",
          cmrSent: true,
          cmrDate: new Date(),
          papersReceived: true,
          papersDate: new Date(),
          notes: "",
          mainPhotoUrl: null,
          photos: []
        },
        {
          id: "3",
          brand: "Audi",
          model: "A4",
          licenseNumber: "GHI-789",
          vin: "1234509876",
          mileage: 30000,
          importStatus: "transport_geregeld",
          arrived: false,
          workshopStatus: "wachten",
          location: "onderweg",
          salesStatus: "verkocht_b2c",
          showroomOnline: false,
          bpmRequested: false,
          bpmStarted: false,
          damage: {
            description: "Front collision",
            status: "zwaar"
          },
          purchasePrice: 45000,
          sellingPrice: 50000,
          paymentStatus: "niet_betaald",
          paintStatus: "in_behandeling",
          cmrSent: false,
          cmrDate: null,
          papersReceived: false,
          papersDate: null,
          notes: "",
          mainPhotoUrl: null,
          photos: []
        },
        {
          id: "4",
          brand: "Volkswagen",
          model: "Golf",
          licenseNumber: "JKL-012",
          vin: "6789012345",
          mileage: 60000,
          importStatus: "onderweg",
          arrived: false,
          workshopStatus: "poetsen",
          location: "calandstraat",
          salesStatus: "voorraad",
          showroomOnline: true,
          bpmRequested: false,
          bpmStarted: false,
          damage: {
            description: "Dent on the door",
            status: "licht"
          },
          purchasePrice: 25000,
          sellingPrice: 30000,
          paymentStatus: "volledig_betaald",
          paintStatus: "geen_behandeling",
          cmrSent: false,
          cmrDate: null,
          papersReceived: false,
          papersDate: null,
          notes: "",
          mainPhotoUrl: null,
          photos: []
        },
        {
          id: "5",
          brand: "Renault",
          model: "Clio",
          licenseNumber: "MNO-345",
          vin: "5432167890",
          mileage: 45000,
          importStatus: "aangekomen",
          arrived: true,
          workshopStatus: "spuiten",
          location: "werkplaats",
          salesStatus: "voorraad",
          showroomOnline: false,
          bpmRequested: false,
          bpmStarted: false,
          damage: {
            description: "",
            status: "geen"
          },
          purchasePrice: 18000,
          sellingPrice: 22000,
          paymentStatus: "niet_betaald",
          paintStatus: "geen_behandeling",
          cmrSent: false,
          cmrDate: null,
          papersReceived: false,
          papersDate: null,
          notes: "",
          mainPhotoUrl: null,
          photos: []
        },
        {
          id: "6",
          brand: "Peugeot",
          model: "208",
          licenseNumber: "PQR-678",
          vin: "0987612345",
          mileage: 35000,
          importStatus: "niet_gestart",
          arrived: false,
          workshopStatus: "gereed",
          location: "poetser",
          salesStatus: "voorraad",
          showroomOnline: true,
          bpmRequested: false,
          bpmStarted: false,
          damage: {
            description: "Scratch on the side mirror",
            status: "licht"
          },
          purchasePrice: 20000,
          sellingPrice: 24000,
          paymentStatus: "volledig_betaald",
          paintStatus: "geen_behandeling",
          cmrSent: false,
          cmrDate: null,
          papersReceived: false,
          papersDate: null,
          notes: "",
          mainPhotoUrl: null,
          photos: []
        },
        {
          id: "7",
          brand: "Fiat",
          model: "500",
          licenseNumber: "STU-901",
          vin: "5432109876",
          mileage: 25000,
          importStatus: "transport_geregeld",
          arrived: false,
          workshopStatus: "wachten",
          location: "spuiter",
          salesStatus: "voorraad",
          showroomOnline: false,
          bpmRequested: false,
          bpmStarted: false,
          damage: {
            description: "",
            status: "geen"
          },
          purchasePrice: 17000,
          sellingPrice: 21000,
          paymentStatus: "niet_betaald",
          paintStatus: "geen_behandeling",
          cmrSent: false,
          cmrDate: null,
          papersReceived: false,
          papersDate: null,
          notes: "",
          mainPhotoUrl: null,
          photos: []
        },
        {
          id: "8",
          brand: "Toyota",
          model: "Yaris",
          licenseNumber: "VWX-234",
          vin: "6789054321",
          mileage: 70000,
          importStatus: "onderweg",
          arrived: false,
          workshopStatus: "poetsen",
          location: "onderweg",
          salesStatus: "voorraad",
          showroomOnline: true,
          bpmRequested: false,
          bpmStarted: false,
          damage: {
            description: "Small dent on the hood",
            status: "licht"
          },
          purchasePrice: 15000,
          sellingPrice: 19000,
          paymentStatus: "volledig_betaald",
          paintStatus: "geen_behandeling",
          cmrSent: false,
          cmrDate: null,
          papersReceived: false,
          papersDate: null,
          notes: "",
          mainPhotoUrl: null,
          photos: []
        },
        {
          id: "9",
          brand: "Nissan",
          model: "Qashqai",
          licenseNumber: "YZA-567",
          vin: "1234567890",
          mileage: 55000,
          importStatus: "aangekomen",
          arrived: true,
          workshopStatus: "spuiten",
          location: "oud_beijerland",
          salesStatus: "voorraad",
          showroomOnline: false,
          bpmRequested: false,
          bpmStarted: false,
          damage: {
            description: "",
            status: "geen"
          },
          purchasePrice: 22000,
          sellingPrice: 26000,
          paymentStatus: "niet_betaald",
          paintStatus: "geen_behandeling",
          cmrSent: false,
          cmrDate: null,
          papersReceived: false,
          papersDate: null,
          notes: "",
          mainPhotoUrl: null,
          photos: []
        },
        {
          id: "10",
          brand: "Ford",
          model: "Focus",
          licenseNumber: "BCD-890",
          vin: "0987654321",
          mileage: 40000,
          importStatus: "niet_gestart",
          arrived: false,
          workshopStatus: "gereed",
          location: "showroom",
          salesStatus: "voorraad",
          showroomOnline: true,
          bpmRequested: false,
          bpmStarted: false,
          damage: {
            description: "Scratches on the bumper",
            status: "licht"
          },
          purchasePrice: 23000,
          sellingPrice: 27000,
          paymentStatus: "volledig_betaald",
          paintStatus: "geen_behandeling",
          cmrSent: false,
          cmrDate: null,
          papersReceived: false,
          papersDate: null,
          notes: "",
          mainPhotoUrl: null,
          photos: []
        }
      ];
      resolve(mockVehicles);
    }, 500);
  });
};

// Mock function to fetch B2B vehicles
export const fetchB2BVehicles = async (): Promise<Vehicle[]> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockVehicles: Vehicle[] = [
        {
          id: "2",
          brand: "BMW",
          model: "3 Series",
          licenseNumber: "DEF-456",
          vin: "0987654321",
          mileage: 40000,
          importStatus: "aangekomen",
          arrived: true,
          workshopStatus: "gereed",
          location: "showroom",
          salesStatus: "verkocht_b2b",
          showroomOnline: true,
          bpmRequested: true,
          bpmStarted: true,
          damage: {
            description: "",
            status: "geen"
          },
          purchasePrice: 40000,
          sellingPrice: 45000,
          paymentStatus: "volledig_betaald",
          paintStatus: "geen_behandeling",
          cmrSent: true,
          cmrDate: new Date(),
          papersReceived: true,
          papersDate: new Date(),
          notes: "",
          mainPhotoUrl: null,
          photos: []
        }
      ];
      resolve(mockVehicles);
    }, 500);
  });
};

// Mock function to fetch B2C vehicles
export const fetchB2CVehicles = async (): Promise<Vehicle[]> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockVehicles: Vehicle[] = [
        {
          id: "3",
          brand: "Audi",
          model: "A4",
          licenseNumber: "GHI-789",
          vin: "1234509876",
          mileage: 30000,
          importStatus: "transport_geregeld",
          arrived: false,
          workshopStatus: "wachten",
          location: "onderweg",
          salesStatus: "verkocht_b2c",
          showroomOnline: false,
          bpmRequested: false,
          bpmStarted: false,
          damage: {
            description: "Front collision",
            status: "zwaar"
          },
          purchasePrice: 45000,
          sellingPrice: 50000,
          paymentStatus: "niet_betaald",
          paintStatus: "in_behandeling",
          cmrSent: false,
          cmrDate: null,
          papersReceived: false,
          papersDate: null,
          notes: "",
          mainPhotoUrl: null,
          photos: []
        }
      ];
      resolve(mockVehicles);
    }, 500);
  });
};

// Mock function to fetch delivered vehicles
export const fetchDeliveredVehicles = async (): Promise<Vehicle[]> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockVehicles: Vehicle[] = [
        {
          id: "3",
          brand: "Audi",
          model: "A4",
          licenseNumber: "GHI-789",
          vin: "1234509876",
          mileage: 30000,
          importStatus: "transport_geregeld",
          arrived: false,
          workshopStatus: "wachten",
          location: "onderweg",
          salesStatus: "afgeleverd",
          showroomOnline: false,
          bpmRequested: false,
          bpmStarted: false,
          damage: {
            description: "Front collision",
            status: "zwaar"
          },
          purchasePrice: 45000,
          sellingPrice: 50000,
          paymentStatus: "niet_betaald",
          paintStatus: "in_behandeling",
          cmrSent: false,
          cmrDate: null,
          papersReceived: false,
          papersDate: null,
          notes: "",
          mainPhotoUrl: null,
          photos: []
        }
      ];
      resolve(mockVehicles);
    }, 500);
  });
};

// Mock function to update a vehicle
export const updateVehicle = async (vehicle: Vehicle): Promise<Vehicle> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("Vehicle updated:", vehicle);
      resolve(vehicle);
    }, 500);
  });
};

// New function: bulk update vehicles
export const bulkUpdateVehicles = async (ids: string[], updates: Partial<Vehicle>): Promise<void> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Bulk updated ${ids.length} vehicles with:`, updates);
      resolve();
    }, 500);
  });
};

// New function: create a new vehicle
export const createVehicle = async (vehicle: Omit<Vehicle, "id">): Promise<Vehicle> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const newVehicle = {
        ...vehicle,
        id: Math.random().toString(36).substr(2, 9),
      };
      console.log("Vehicle created:", newVehicle);
      resolve(newVehicle);
    }, 500);
  });
};

// New function: delete a vehicle
export const deleteVehicle = async (vehicleId: string): Promise<void> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Vehicle ${vehicleId} deleted`);
      resolve();
    }, 500);
  });
};

// Mock function to update selling price
export const updateSellingPrice = async (vehicleId: string, price: number): Promise<void> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Selling price updated for vehicle ${vehicleId} to ${price}`);
      resolve();
    }, 500);
  });
};

// Mock function to update payment status
export const updatePaymentStatus = async (vehicleId: string, status: PaymentStatus): Promise<void> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Payment status updated for vehicle ${vehicleId} to ${status}`);
      resolve();
    }, 500);
  });
};

// Mock function to update paint status
export const updatePaintStatus = async (vehicleId: string, status: PaintStatus): Promise<void> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Paint status updated for vehicle ${vehicleId} to ${status}`);
      resolve();
    }, 500);
  });
};

// Mock function to upload a vehicle photo
export const uploadVehiclePhoto = async (vehicleId: string, file: File, isMain: boolean): Promise<string> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const photoUrl = URL.createObjectURL(file);
      console.log(`Photo uploaded for vehicle ${vehicleId}. Is main: ${isMain}`);
      resolve(photoUrl);
    }, 1000);
  });
};

// Mock function to update sales status
export const updateSalesStatus = async (vehicleId: string, salesStatus: string): Promise<void> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Sales status updated for vehicle ${vehicleId} to ${salesStatus}`);
      resolve();
    }, 500);
  });
};

// Mock function to mark vehicle as delivered
export const markVehicleAsDelivered = async (vehicleId: string): Promise<void> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Vehicle ${vehicleId} marked as delivered`);
      resolve();
    }, 500);
  });
};

// Mock upload vehicle file function
export const uploadVehicleFile = async (file: File, category: FileCategory, vehicleId: string): Promise<string> => {
  // In a real app, this would upload to a server/cloud storage
  return new Promise((resolve) => {
    setTimeout(() => {
      const fileUrl = URL.createObjectURL(file);
      console.log(`Uploaded ${file.name} for vehicle ${vehicleId} in category ${category}`);
      resolve(fileUrl);
    }, 1000);
  });
};

// Mock fetch vehicle files function
export const fetchVehicleFiles = async (vehicleId: string): Promise<VehicleFile[]> => {
  // In a real app, this would fetch from an API
  return new Promise((resolve) => {
    setTimeout(() => {
      // Return mock data for now
      resolve([
        {
          id: "1",
          name: "damage_report.pdf",
          url: "/placeholder.svg",
          category: "damage",
          vehicleId,
          createdAt: new Date().toISOString(),
          size: 1024 * 1024, // 1MB
          type: "application/pdf"
        },
        {
          id: "2",
          name: "cmr_document.pdf",
          url: "/placeholder.svg",
          category: "cmr",
          vehicleId,
          createdAt: new Date().toISOString(),
          size: 2048 * 1024, // 2MB
          type: "application/pdf"
        }
      ]);
    }, 500);
  });
};

// Mock function to send a test email
export const sendTestEmail = async (email: string): Promise<void> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Test email sent to ${email}`);
      resolve();
    }, 500);
  });
};

// Enhanced email function to check for attachments
export const sendEmail = async (type: string, vehicleIds: string[]): Promise<void> => {
  // In a real app, this would send an email via an API
  console.log(`Sending email type: ${type} to vehicles: ${vehicleIds.join(", ")}`);
  
  // Check if files exist for email attachments
  const files = await fetchVehicleFiles(vehicleIds[0]);
  
  if (type === "cmr_supplier" && !files.some(file => file.category === "cmr")) {
    throw new Error("Geen CMR document gevonden om te versturen");
  }
  
  if (type === "transport_pickup" && !files.some(file => file.category === "pickup")) {
    throw new Error("Geen pickup document gevonden om te versturen");
  }
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 1000);
  });
};
