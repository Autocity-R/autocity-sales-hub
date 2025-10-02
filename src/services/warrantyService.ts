
import { WarrantyClaim, WarrantyStats, LoanCar } from "@/types/warranty";
import { Vehicle } from "@/types/inventory";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Mock data voor loan cars
const mockLoanCars: LoanCar[] = [
  {
    id: "loan-1",
    brand: "Volkswagen",
    model: "Polo",
    licenseNumber: "LN-001-X",
    available: true
  },
  {
    id: "loan-2", 
    brand: "Toyota",
    model: "Yaris",
    licenseNumber: "LN-002-Y",
    available: false
  },
  {
    id: "loan-3",
    brand: "Opel",
    model: "Corsa",
    licenseNumber: "LN-003-Z",
    available: true
  }
];

// Mock warranty claims
const mockWarrantyClaims: WarrantyClaim[] = [
  {
    id: "warranty-1",
    vehicleId: "3",
    customerId: "cust-1", 
    customerName: "John Doe",
    customerEmail: "john.doe@email.com",
    customerPhone: "+31 6 12345678",
    vehicleBrand: "Audi",
    vehicleModel: "A4",
    vehicleLicenseNumber: "CD-789-E",
    deliveryDate: new Date("2023-04-15"),
    warrantyStartDate: new Date("2023-04-15"),
    warrantyEndDate: new Date("2024-04-15"),
    problemDescription: "Motor maakt vreemd geluid bij opstarten",
    reportDate: new Date("2023-10-15"),
    status: "in_behandeling",
    priority: "hoog",
    loanCarAssigned: true,
    loanCarId: "loan-2",
    loanCarDetails: mockLoanCars.find(car => car.id === "loan-2"),
    estimatedCost: 850,
    additionalNotes: "Klant heeft aangegeven dat het geluid alleen bij koude starts voorkomt",
    attachments: [],
    assignedTo: "Mechanic Team A",
    createdAt: new Date("2023-10-15"),
    updatedAt: new Date("2023-10-20")
  },
  {
    id: "warranty-2",
    vehicleId: "4",
    customerId: "dealer-1",
    customerName: "ABC Auto Dealership", 
    customerEmail: "contact@abcauto.nl",
    customerPhone: "+31 20 1234567",
    vehicleBrand: "Mercedes",
    vehicleModel: "C Class",
    vehicleLicenseNumber: "EF-012-G",
    deliveryDate: new Date("2023-02-25"),
    warrantyStartDate: new Date("2023-02-25"),
    warrantyEndDate: new Date("2024-02-25"),
    problemDescription: "Airconditioning werkt niet optimaal",
    reportDate: new Date("2023-08-10"),
    status: "opgelost",
    priority: "normaal",
    loanCarAssigned: false,
    estimatedCost: 450,
    actualCost: 425,
    resolutionDate: new Date("2023-08-15"),
    resolutionDescription: "Airco systeem gereinigd en bijgevuld",
    additionalNotes: "Preventieve controle uitgevoerd",
    attachments: [],
    assignedTo: "Mechanic Team B",
    customerSatisfaction: 4,
    createdAt: new Date("2023-08-10"),
    updatedAt: new Date("2023-08-15")
  }
];

// Import from deliveredVehicleService instead
export { fetchDeliveredVehiclesForWarranty } from "./deliveredVehicleService";

export const fetchWarrantyClaims = async (): Promise<WarrantyClaim[]> => {
  try {
    const response = await fetch(`${API_URL}/api/warranty/claims`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to fetch warranty claims:", error);
    return mockWarrantyClaims;
  }
};

export const fetchLoanCars = async (): Promise<LoanCar[]> => {
  try {
    const response = await fetch(`${API_URL}/api/warranty/loan-cars`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to fetch loan cars:", error);
    return mockLoanCars;
  }
};

export const createWarrantyClaim = async (claim: Omit<WarrantyClaim, 'id' | 'createdAt' | 'updatedAt'>): Promise<WarrantyClaim> => {
  try {
    const response = await fetch(`${API_URL}/api/warranty/claims`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(claim),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to create warranty claim:", error);
    // Return mock created claim
    return {
      ...claim,
      id: `warranty-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    } as WarrantyClaim;
  }
};

export const updateWarrantyClaim = async (claimId: string, updates: Partial<WarrantyClaim>): Promise<WarrantyClaim> => {
  try {
    const response = await fetch(`${API_URL}/api/warranty/claims/${claimId}`, {
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
    console.error("Failed to update warranty claim:", error);
    // Return mock updated claim
    const existingClaim = mockWarrantyClaims.find(c => c.id === claimId);
    if (!existingClaim) throw error;
    return { ...existingClaim, ...updates, updatedAt: new Date() };
  }
};

export const resolveWarrantyClaim = async (claimId: string, resolutionData: {
  resolutionDescription: string;
  actualCost: number;
  customerSatisfaction: number;
}): Promise<WarrantyClaim> => {
  try {
    const response = await fetch(`${API_URL}/api/warranty/claims/${claimId}/resolve`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resolutionData),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to resolve warranty claim:", error);
    // Return mock resolved claim
    const existingClaim = mockWarrantyClaims.find(c => c.id === claimId);
    if (!existingClaim) throw error;
    return {
      ...existingClaim,
      ...resolutionData,
      status: "opgelost",
      resolutionDate: new Date(),
      updatedAt: new Date()
    };
  }
};

export const getWarrantyStats = async (): Promise<WarrantyStats> => {
  try {
    const response = await fetch(`${API_URL}/api/warranty/stats`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to fetch warranty stats:", error);
    // Return mock stats
    return {
      totalActive: 3,
      totalThisMonth: 2,
      avgResolutionDays: 5.2,
      customerSatisfactionAvg: 4.2,
      totalCostThisMonth: 1275,
      pendingClaims: 1
    };
  }
};
