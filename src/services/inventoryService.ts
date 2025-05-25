import { Vehicle, PaymentStatus, PaintStatus, FileCategory, VehicleFile, SalesStatus } from "@/types/inventory";
import { Contact } from "@/types/customer";

// Use import.meta.env instead of process.env for Vite projects
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Enhanced mock data with more B2C vehicles and proper paintStatus
const mockVehicles: Vehicle[] = [
  {
    id: "1",
    brand: "Volkswagen",
    model: "Golf",
    licenseNumber: "AB-123-C",
    vin: "WVWZZZ1JZXW000001",
    mileage: 120000,
    importStatus: "niet_gestart",
    arrived: true,
    workshopStatus: "gereed",
    paintStatus: "geen_behandeling",
    location: "showroom",
    salesStatus: "voorraad",
    showroomOnline: true,
    bpmRequested: false,
    bpmStarted: false,
    damage: {
      description: "Small scratch on left door",
      status: "licht",
    },
    purchasePrice: 15000,
    sellingPrice: 18000,
    paymentStatus: "niet_betaald",
    cmrSent: true,
    cmrDate: new Date("2023-01-15"),
    papersReceived: true,
    papersDate: new Date("2023-01-20"),
    notes: "Car is in good condition, ready for sale.",
    mainPhotoUrl: "https://placehold.co/600x400?text=Volkswagen+Golf",
    photos: ["https://placehold.co/600x400?text=Volkswagen+Golf"],
  },
  {
    id: "2",
    brand: "BMW",
    model: "3 Series",
    licenseNumber: "XY-456-Z",
    vin: "WBAPK73509A453290",
    mileage: 85000,
    importStatus: "aangekomen",
    arrived: true,
    workshopStatus: "gereed",
    paintStatus: "hersteld",
    location: "showroom",
    salesStatus: "voorraad",
    showroomOnline: true,
    bpmRequested: true,
    bpmStarted: true,
    damage: {
      description: "No damage",
      status: "geen",
    },
    purchasePrice: 22000,
    sellingPrice: 26000,
    paymentStatus: "niet_betaald",
    cmrSent: true,
    cmrDate: new Date("2023-02-10"),
    papersReceived: true,
    papersDate: new Date("2023-02-15"),
    notes: "Premium package, leather seats.",
    mainPhotoUrl: "https://placehold.co/600x400?text=BMW+3+Series",
    photos: ["https://placehold.co/600x400?text=BMW+3+Series"],
  },
  {
    id: "3",
    brand: "Audi",
    model: "A4",
    licenseNumber: "CD-789-E",
    vin: "WAUZZZ8K3BA134651",
    mileage: 95000,
    importStatus: "aangekomen",
    arrived: true,
    workshopStatus: "gereed",
    paintStatus: "geen_behandeling",
    location: "showroom",
    salesStatus: "verkocht_b2c",
    showroomOnline: false,
    bpmRequested: true,
    bpmStarted: true,
    damage: {
      description: "Minor dent on rear bumper",
      status: "licht",
    },
    purchasePrice: 18000,
    sellingPrice: 22000,
    paymentStatus: "volledig_betaald",
    cmrSent: true,
    cmrDate: new Date("2023-03-05"),
    papersReceived: true,
    papersDate: new Date("2023-03-10"),
    notes: "Sold to John Doe, delivery scheduled next week.",
    mainPhotoUrl: "https://placehold.co/600x400?text=Audi+A4",
    photos: ["https://placehold.co/600x400?text=Audi+A4"],
    customerId: "cust-1",
    customerName: "John Doe",
    deliveryDate: new Date("2023-04-15"),
  },
  {
    id: "4",
    brand: "Mercedes",
    model: "C Class",
    licenseNumber: "EF-012-G",
    vin: "WDD2052011F123456",
    mileage: 70000,
    importStatus: "aangekomen",
    arrived: true,
    workshopStatus: "gereed",
    paintStatus: "hersteld",
    location: "showroom",
    salesStatus: "verkocht_b2b",
    showroomOnline: false,
    bpmRequested: true,
    bpmStarted: true,
    damage: {
      description: "No damage",
      status: "geen",
    },
    purchasePrice: 24000,
    sellingPrice: 27000,
    paymentStatus: "volledig_betaald",
    cmrSent: true,
    cmrDate: new Date("2023-02-20"),
    papersReceived: true,
    papersDate: new Date("2023-02-25"),
    notes: "Sold to ABC Auto Dealership.",
    mainPhotoUrl: "https://placehold.co/600x400?text=Mercedes+C+Class",
    photos: ["https://placehold.co/600x400?text=Mercedes+C+Class"],
    customerId: "dealer-1",
    customerName: "ABC Auto Dealership",
  },
  {
    id: "5",
    brand: "Toyota",
    model: "Corolla",
    licenseNumber: "GH-345-I",
    vin: "JTDDL35E903234567",
    mileage: 45000,
    importStatus: "transport_geregeld",
    arrived: false,
    workshopStatus: "wachten",
    paintStatus: "geen_behandeling",
    location: "onderweg",
    salesStatus: "voorraad",
    showroomOnline: false,
    bpmRequested: false,
    bpmStarted: false,
    damage: {
      description: "To be inspected upon arrival",
      status: "geen",
    },
    purchasePrice: 12000,
    sellingPrice: 15000,
    paymentStatus: "niet_betaald",
    cmrSent: true,
    cmrDate: new Date("2023-04-25"),
    papersReceived: false,
    papersDate: null,
    notes: "Vehicle currently in transit from Germany, expected arrival in 3 days.",
    mainPhotoUrl: "https://placehold.co/600x400?text=Toyota+Corolla",
    photos: ["https://placehold.co/600x400?text=Toyota+Corolla"],
  },
  // Add more B2C vehicles
  {
    id: "6",
    brand: "Opel",
    model: "Corsa",
    licenseNumber: "JK-567-L",
    vin: "W0L0AHL0808123456",
    mileage: 75000,
    importStatus: "aangekomen",
    arrived: true,
    workshopStatus: "in_werkplaats",
    paintStatus: "in_behandeling",
    location: "werkplaats",
    salesStatus: "verkocht_b2c",
    showroomOnline: false,
    bpmRequested: true,
    bpmStarted: true,
    damage: {
      description: "Small paint damage on front bumper",
      status: "licht",
    },
    purchasePrice: 8000,
    sellingPrice: 11000,
    paymentStatus: "aanbetaling",
    cmrSent: true,
    cmrDate: new Date("2023-03-15"),
    papersReceived: true,
    papersDate: new Date("2023-03-20"),
    notes: "Customer made down payment, paint work in progress.",
    mainPhotoUrl: "https://placehold.co/600x400?text=Opel+Corsa",
    photos: ["https://placehold.co/600x400?text=Opel+Corsa"],
    customerId: "cust-2",
    customerName: "Maria Johnson",
  },
  {
    id: "7",
    brand: "Ford",
    model: "Focus",
    licenseNumber: "MN-890-P",
    vin: "WF0SXXWPXS1234567",
    mileage: 60000,
    importStatus: "aangekomen",
    arrived: true,
    workshopStatus: "klaar_voor_aflevering",
    paintStatus: "hersteld",
    location: "showroom",
    salesStatus: "verkocht_b2c",
    showroomOnline: false,
    bpmRequested: true,
    bpmStarted: true,
    damage: {
      description: "No damage",
      status: "geen",
    },
    purchasePrice: 14000,
    sellingPrice: 17500,
    paymentStatus: "volledig_betaald",
    cmrSent: true,
    cmrDate: new Date("2023-04-01"),
    papersReceived: true,
    papersDate: new Date("2023-04-05"),
    notes: "Vehicle ready for delivery, customer contacted.",
    mainPhotoUrl: "https://placehold.co/600x400?text=Ford+Focus",
    photos: ["https://placehold.co/600x400?text=Ford+Focus"],
    customerId: "cust-3",
    customerName: "Peter van der Berg",
  }
];

// Mock contract data for delivered vehicles
const mockContracts = [
  {
    vehicleId: "3", // Audi A4
    contractId: "contract-3-123456",
    contractUrl: "https://example.com/contracts/contract-3-123456.pdf",
    contractType: "b2c" as const,
    contractDate: new Date("2023-04-10"),
    contractOptions: {
      deliveryPackage: "12_maanden_autocity",
      paymentTerms: "aanbetaling_10"
    }
  },
  {
    vehicleId: "4", // Mercedes C Class
    contractId: "contract-4-789012",
    contractUrl: "https://example.com/contracts/contract-4-789012.pdf", 
    contractType: "b2b" as const,
    contractDate: new Date("2023-02-18"),
    contractOptions: {
      bpmIncluded: true,
      maxDamageAmount: 2500
    }
  }
];

// Update mock vehicles with contract information
const enhancedMockVehicles = mockVehicles.map(vehicle => {
  const contractInfo = mockContracts.find(c => c.vehicleId === vehicle.id);
  if (contractInfo) {
    return {
      ...vehicle,
      contractId: contractInfo.contractId,
      contractUrl: contractInfo.contractUrl,
      contractType: contractInfo.contractType,
      contractDate: contractInfo.contractDate,
      contractOptions: contractInfo.contractOptions
    };
  }
  return vehicle;
});

// Mock B2C vehicles - now with more vehicles
const mockB2CVehicles = mockVehicles.filter(v => v.salesStatus === 'verkocht_b2c');

// Mock B2B vehicles
const mockB2BVehicles = mockVehicles.filter(v => v.salesStatus === 'verkocht_b2b');

// Mock stock vehicles
const mockStockVehicles = mockVehicles.filter(v => v.salesStatus === 'voorraad');

// Mock delivered vehicles
const mockDeliveredVehicles = mockVehicles.filter(v => v.paymentStatus === 'volledig_betaald' && (v.salesStatus === 'verkocht_b2b' || v.salesStatus === 'verkocht_b2c'));

// Mock online vehicles (showroomOnline = true and salesStatus = 'voorraad')
const mockOnlineVehicles = mockVehicles.filter(v => v.showroomOnline === true && v.salesStatus === 'voorraad');

export const fetchVehicles = async (): Promise<Vehicle[]> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to fetch vehicles:", error);
    // Return mock data when API fails
    console.log("Returning mock vehicles due to API failure");
    return mockVehicles;
  }
};

export const fetchVehicle = async (vehicleId: string): Promise<Vehicle | null> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles/${vehicleId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to fetch vehicle:", error);
    // Return mock vehicle when API fails
    const vehicle = mockVehicles.find(v => v.id === vehicleId);
    return vehicle || null;
  }
};

export const fetchB2CVehicles = async (): Promise<Vehicle[]> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles?status=verkocht_b2c`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to fetch B2C vehicles:", error);
    // Return mock B2C vehicles
    console.log("Returning mock B2C vehicles due to API failure");
    return mockB2CVehicles;
  }
};

export const fetchB2BVehicles = async (): Promise<Vehicle[]> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles?status=verkocht_b2b`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to fetch B2B vehicles:", error);
    // Return mock B2B vehicles
    console.log("Returning mock B2B vehicles due to API failure");
    return mockB2BVehicles;
  }
};

export const updateVehicle = async (vehicle: Vehicle): Promise<Vehicle> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles/${vehicle.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(vehicle),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to update vehicle:", error);
    // Return the vehicle as is
    return vehicle;
  }
};

export const sendEmail = async (type: string, vehicleIds: string[]): Promise<any> => {
  try {
    const response = await fetch(`${API_URL}/api/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type, vehicleIds }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to send email:", error);
    // Return a mock response
    return { success: false, message: "Mock email sent" };
  }
};

export const updateSellingPrice = async (vehicleId: string, price: number): Promise<Vehicle> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles/${vehicleId}/selling-price`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ price }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to update selling price:", error);
    // Return a mock updated vehicle
    const vehicle = mockVehicles.find(v => v.id === vehicleId);
    if (!vehicle) throw error;
    const updatedVehicle = { ...vehicle, sellingPrice: price };
    return updatedVehicle;
  }
};

export const updatePaymentStatus = async (vehicleId: string, status: PaymentStatus): Promise<Vehicle> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles/${vehicleId}/payment-status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to update payment status:", error);
    // Return a mock updated vehicle
    const vehicle = mockVehicles.find(v => v.id === vehicleId);
    if (!vehicle) throw error;
    const updatedVehicle = { ...vehicle, paymentStatus: status };
    return updatedVehicle;
  }
};

export const updatePaintStatus = async (vehicleId: string, status: PaintStatus): Promise<Vehicle> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles/${vehicleId}/paint-status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to update paint status:", error);
    // Return a mock updated vehicle
    const vehicle = mockVehicles.find(v => v.id === vehicleId);
    if (!vehicle) throw error;
    const updatedVehicle = { ...vehicle, paintStatus: status };
    return updatedVehicle;
  }
};

export const uploadVehiclePhoto = async (vehicleId: string, file: File, isMain: boolean): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("isMain", String(isMain));

    const response = await fetch(`${API_URL}/api/vehicles/${vehicleId}/photos`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.photoUrl;
  } catch (error: any) {
    console.error("Failed to upload photo:", error);
    // Return a mock photo URL
    return "https://placehold.co/600x400?text=Mock+Photo";
  }
};

export const markVehicleAsDelivered = async (vehicleId: string): Promise<Vehicle> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles/${vehicleId}/delivered`, {
      method: "PUT",
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to mark as delivered:", error);
    // Return a mock updated vehicle
    const vehicle = mockVehicles.find(v => v.id === vehicleId);
    if (!vehicle) throw error;
    const updatedVehicle = { ...vehicle, salesStatus: "afgeleverd" as SalesStatus };
    return updatedVehicle;
  }
};

export const uploadVehicleFile = async (file: File, category: FileCategory, vehicleId: string): Promise<VehicleFile> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);

    const response = await fetch(`${API_URL}/api/vehicles/${vehicleId}/files`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("Failed to upload file:", error);
    // Return mock file data
    return {
      id: `file-${Date.now()}`,
      name: file.name,
      url: URL.createObjectURL(file),
      category: category,
      vehicleId: vehicleId,
      createdAt: new Date().toISOString(),
      size: file.size,
      type: file.type
    };
  }
};

export const fetchVehicleFiles = async (vehicleId?: string): Promise<VehicleFile[]> => {
  if (!vehicleId) return [];

  try {
    const response = await fetch(`${API_URL}/api/vehicles/${vehicleId}/files`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to fetch files:", error);
    // Return mock files
    return [
      {
        id: "file-1",
        name: "car_documentation.pdf",
        url: "https://example.com/files/car_documentation.pdf",
        category: "cmr",
        vehicleId: vehicleId,
        createdAt: new Date().toISOString(),
        size: 1024 * 1024,
        type: "application/pdf"
      }
    ];
  }
};

// Add new function to change vehicle status
export const changeVehicleStatus = async (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad'): Promise<Vehicle> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles/${vehicleId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to change vehicle status:", error);
    // Return a mock updated vehicle
    const vehicle = mockVehicles.find(v => v.id === vehicleId);
    if (!vehicle) throw error;
    const updatedVehicle = { ...vehicle, salesStatus: status };
    return updatedVehicle;
  }
};

// Add new function for updating sales status
export const updateSalesStatus = async (vehicleId: string, status: string): Promise<Vehicle> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles/${vehicleId}/sales-status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to update sales status:", error);
    // Return a mock updated vehicle
    const vehicle = mockVehicles.find(v => v.id === vehicleId);
    if (!vehicle) throw error;
    const updatedVehicle = { ...vehicle, salesStatus: status as SalesStatus };
    return updatedVehicle;
  }
};

// Add new function for fetching delivered vehicles
export const fetchDeliveredVehicles = async (): Promise<Vehicle[]> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles?delivered=true`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to fetch delivered vehicles:", error);
    // Return mock delivered vehicles with contract information
    return enhancedMockVehicles.filter(v => v.paymentStatus === 'volledig_betaald' && (v.salesStatus === 'verkocht_b2b' || v.salesStatus === 'verkocht_b2c'));
  }
};

// Add new function for bulk updating vehicles
export const bulkUpdateVehicles = async (vehicles: Vehicle[]): Promise<Vehicle[]> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles/bulk`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ vehicles }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to bulk update vehicles:", error);
    // Return the input vehicles as if they were updated
    return vehicles;
  }
};

// Add new function for fetching online vehicles
export const fetchOnlineVehicles = async (): Promise<Vehicle[]> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles?online=true`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to fetch online vehicles:", error);
    // Return mock online vehicles
    console.log("Returning mock online vehicles due to API failure");
    return mockOnlineVehicles;
  }
};
