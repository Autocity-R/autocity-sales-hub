export interface LoanCar {
  id: string;
  brand: string;
  model: string;
  licenseNumber: string;
  available: boolean;
  vehicleId?: string;
}

export interface WarrantyStats {
  totalActive: number;
  totalThisMonth: number;
  avgResolutionDays: number;
  customerSatisfactionAvg: number;
  totalCostThisMonth: number;
  pendingClaims: number;
}

export interface WarrantyClaim {
  id: string;
  vehicleId: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleLicenseNumber: string;
  deliveryDate: Date | string;
  warrantyStartDate: Date | string;
  warrantyEndDate: Date | string;
  problemDescription: string;
  reportDate: Date | string;
  status: "actief" | "in_behandeling" | "opgelost" | "vervallen";
  priority: "kritiek" | "hoog" | "normaal" | "laag";
  loanCarAssigned: boolean;
  loanCarId?: string;
  loanCarDetails?: LoanCar;
  estimatedCost: number;
  actualCost?: number;
  resolutionDate?: Date | string;
  resolutionDescription?: string;
  additionalNotes?: string;
  attachments: string[];
  assignedTo?: string;
  customerSatisfaction?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

