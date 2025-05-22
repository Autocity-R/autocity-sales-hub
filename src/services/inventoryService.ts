import { Vehicle, PaymentStatus, PaintStatus } from "@/types/inventory";
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
          year: 2020,
          mileage: 50000,
          price: 35000,
          licenseNumber: "ABC-123",
          vin: "1234567890",
          engineType: "Gasoline",
          engineCapacity: 2.0,
          transmission: "Automatic",
          color: "Black",
          salesStatus: "beschikbaar",
          paymentStatus: "open",
          paintStatus: "ok",
          importStatus: "niet_gestart",
          cmrSent: false,
          cmrDate: null,
          photos: [],
          mainPhotoUrl: null,
          damage: {
            status: "minor",
            description: "Scratches on the bumper"
          },
          options: ["Navigation", "Leather seats", "Sunroof"],
          arrived: false,
          sellingPrice: 40000,
          dateAdded: new Date(),
          dateSold: null
        },
        {
          id: "2",
          brand: "BMW",
          model: "3 Series",
          year: 2021,
          mileage: 40000,
          price: 40000,
          licenseNumber: "DEF-456",
          vin: "0987654321",
          engineType: "Diesel",
          engineCapacity: 3.0,
          transmission: "Automatic",
          color: "White",
          salesStatus: "verkocht_b2b",
          paymentStatus: "voldaan",
          paintStatus: "ok",
          importStatus: "aangekomen",
          cmrSent: true,
          cmrDate: new Date(),
          photos: [],
          mainPhotoUrl: null,
          damage: {
            status: "none",
            description: ""
          },
          options: ["Navigation", "Leather seats", "Sunroof"],
          arrived: true,
          sellingPrice: 45000,
          dateAdded: new Date(),
          dateSold: new Date()
        },
        {
          id: "3",
          brand: "Audi",
          model: "A4",
          year: 2022,
          mileage: 30000,
          price: 45000,
          licenseNumber: "GHI-789",
          vin: "1234509876",
          engineType: "Gasoline",
          engineCapacity: 2.0,
          transmission: "Automatic",
          color: "Gray",
          salesStatus: "verkocht_b2c",
          paymentStatus: "open",
          paintStatus: "reparatie",
          importStatus: "transport_geregeld",
          cmrSent: false,
          cmrDate: null,
          photos: [],
          mainPhotoUrl: null,
          damage: {
            status: "major",
            description: "Front collision"
          },
          options: ["Navigation", "Leather seats", "Sunroof"],
          arrived: false,
          sellingPrice: 50000,
          dateAdded: new Date(),
          dateSold: new Date()
        },
        {
          id: "4",
          brand: "Volkswagen",
          model: "Golf",
          year: 2019,
          mileage: 60000,
          price: 25000,
          licenseNumber: "JKL-012",
          vin: "6789012345",
          engineType: "Gasoline",
          engineCapacity: 1.5,
          transmission: "Manual",
          color: "Blue",
          salesStatus: "beschikbaar",
          paymentStatus: "voldaan",
          paintStatus: "ok",
          importStatus: "onderweg",
          cmrSent: false,
          cmrDate: null,
          photos: [],
          mainPhotoUrl: null,
          damage: {
            status: "minor",
            description: "Dent on the door"
          },
          options: ["Air conditioning", "Alloy wheels"],
          arrived: false,
          sellingPrice: 30000,
          dateAdded: new Date(),
          dateSold: null
        },
        {
          id: "5",
          brand: "Renault",
          model: "Clio",
          year: 2020,
          mileage: 45000,
          price: 18000,
          licenseNumber: "MNO-345",
          vin: "5432167890",
          engineType: "Gasoline",
          engineCapacity: 1.0,
          transmission: "Manual",
          color: "Red",
          salesStatus: "beschikbaar",
          paymentStatus: "open",
          paintStatus: "ok",
          importStatus: "aangekomen",
          cmrSent: false,
          cmrDate: null,
          photos: [],
          mainPhotoUrl: null,
          damage: {
            status: "none",
            description: ""
          },
          options: ["Air conditioning", "Bluetooth"],
          arrived: true,
          sellingPrice: 22000,
          dateAdded: new Date(),
          dateSold: null
        },
        {
          id: "6",
          brand: "Peugeot",
          model: "208",
          year: 2021,
          mileage: 35000,
          price: 20000,
          licenseNumber: "PQR-678",
          vin: "0987612345",
          engineType: "Electric",
          engineCapacity: 0.0,
          transmission: "Automatic",
          color: "Orange",
          salesStatus: "beschikbaar",
          paymentStatus: "voldaan",
          paintStatus: "ok",
          importStatus: "niet_gestart",
          cmrSent: false,
          cmrDate: null,
          photos: [],
          mainPhotoUrl: null,
          damage: {
            status: "minor",
            description: "Scratch on the side mirror"
          },
          options: ["Navigation", "Parking sensors"],
          arrived: false,
          sellingPrice: 24000,
          dateAdded: new Date(),
          dateSold: null
        },
        {
          id: "7",
          brand: "Fiat",
          model: "500",
          year: 2022,
          mileage: 25000,
          price: 17000,
          licenseNumber: "STU-901",
          vin: "5432109876",
          engineType: "Gasoline",
          engineCapacity: 1.2,
          transmission: "Manual",
          color: "Pink",
          salesStatus: "beschikbaar",
          paymentStatus: "open",
          paintStatus: "ok",
          importStatus: "transport_geregeld",
          cmrSent: false,
          cmrDate: null,
          photos: [],
          mainPhotoUrl: null,
          damage: {
            status: "none",
            description: ""
          },
          options: ["Air conditioning", "Panoramic roof"],
          arrived: false,
          sellingPrice: 21000,
          dateAdded: new Date(),
          dateSold: null
        },
        {
          id: "8",
          brand: "Toyota",
          model: "Yaris",
          year: 2019,
          mileage: 70000,
          price: 15000,
          licenseNumber: "VWX-234",
          vin: "6789054321",
          engineType: "Hybrid",
          engineCapacity: 1.5,
          transmission: "Automatic",
          color: "Silver",
          salesStatus: "beschikbaar",
          paymentStatus: "voldaan",
          paintStatus: "ok",
          importStatus: "onderweg",
          cmrSent: false,
          cmrDate: null,
          photos: [],
          mainPhotoUrl: null,
          damage: {
            status: "minor",
            description: "Small dent on the hood"
          },
          options: ["Navigation", "Reversing camera"],
          arrived: false,
          sellingPrice: 19000,
          dateAdded: new Date(),
          dateSold: null
        },
        {
          id: "9",
          brand: "Nissan",
          model: "Qashqai",
          year: 2020,
          mileage: 55000,
          price: 22000,
          licenseNumber: "YZA-567",
          vin: "1234567890",
          engineType: "Gasoline",
          engineCapacity: 1.3,
          transmission: "Automatic",
          color: "Black",
          salesStatus: "beschikbaar",
          paymentStatus: "open",
          paintStatus: "ok",
          importStatus: "aangekomen",
          cmrSent: false,
          cmrDate: null,
          photos: [],
          mainPhotoUrl: null,
          damage: {
            status: "none",
            description: ""
          },
          options: ["Leather seats", "Sunroof", "Parking sensors"],
          arrived: true,
          sellingPrice: 26000,
          dateAdded: new Date(),
          dateSold: null
        },
        {
          id: "10",
          brand: "Ford",
          model: "Focus",
          year: 2021,
          mileage: 40000,
          price: 23000,
          licenseNumber: "BCD-890",
          vin: "0987654321",
          engineType: "Gasoline",
          engineCapacity: 1.0,
          transmission: "Manual",
          color: "White",
          salesStatus: "beschikbaar",
          paymentStatus: "voldaan",
          paintStatus: "ok",
          importStatus: "niet_gestart",
          cmrSent: false,
          cmrDate: null,
          photos: [],
          mainPhotoUrl: null,
          damage: {
            status: "minor",
            description: "Scratches on the bumper"
          },
          options: ["Navigation", "Air conditioning", "Alloy wheels"],
          arrived: false,
          sellingPrice: 27000,
          dateAdded: new Date(),
          dateSold: null
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
          year: 2021,
          mileage: 40000,
          price: 40000,
          licenseNumber: "DEF-456",
          vin: "0987654321",
          engineType: "Diesel",
          engineCapacity: 3.0,
          transmission: "Automatic",
          color: "White",
          salesStatus: "verkocht_b2b",
          paymentStatus: "voldaan",
          paintStatus: "ok",
          importStatus: "aangekomen",
          cmrSent: true,
          cmrDate: new Date(),
          photos: [],
          mainPhotoUrl: null,
          damage: {
            status: "none",
            description: ""
          },
          options: ["Navigation", "Leather seats", "Sunroof"],
          arrived: true,
          sellingPrice: 45000,
          dateAdded: new Date(),
          dateSold: new Date()
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
          year: 2022,
          mileage: 30000,
          price: 45000,
          licenseNumber: "GHI-789",
          vin: "1234509876",
          engineType: "Gasoline",
          engineCapacity: 2.0,
          transmission: "Automatic",
          color: "Gray",
          salesStatus: "verkocht_b2c",
          paymentStatus: "open",
          paintStatus: "reparatie",
          importStatus: "transport_geregeld",
          cmrSent: false,
          cmrDate: null,
          photos: [],
          mainPhotoUrl: null,
          damage: {
            status: "major",
            description: "Front collision"
          },
          options: ["Navigation", "Leather seats", "Sunroof"],
          arrived: false,
          sellingPrice: 50000,
          dateAdded: new Date(),
          dateSold: new Date()
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
          year: 2022,
          mileage: 30000,
          price: 45000,
          licenseNumber: "GHI-789",
          vin: "1234509876",
          engineType: "Gasoline",
          engineCapacity: 2.0,
          transmission: "Automatic",
          color: "Gray",
          salesStatus: "afgeleverd",
          paymentStatus: "open",
          paintStatus: "reparatie",
          importStatus: "transport_geregeld",
          cmrSent: false,
          cmrDate: null,
          photos: [],
          mainPhotoUrl: null,
          damage: {
            status: "major",
            description: "Front collision"
          },
          options: ["Navigation", "Leather seats", "Sunroof"],
          arrived: false,
          sellingPrice: 50000,
          dateAdded: new Date(),
          dateSold: new Date()
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
