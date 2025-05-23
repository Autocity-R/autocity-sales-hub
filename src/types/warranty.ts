
export type WarrantyStatus = 
  | "actief"
  | "in_behandeling" 
  | "opgelost"
  | "vervallen";

export type WarrantyPriority =
  | "laag"
  | "normaal"
  | "hoog"
  | "kritiek";

export interface LoanCar {
  id: string;
  brand: string;
  model: string;
  licenseNumber: string;
  available: boolean;
}

export interface WarrantyClaim {
  id: string;
  vehicleId: string;
  customerId: string;
  customerName: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleLicenseNumber: string;
  deliveryDate: Date;
  warrantyStartDate: Date;
  warrantyEndDate: Date;
  problemDescription: string;
  reportDate: Date;
  status: WarrantyStatus;
  priority: WarrantyPriority;
  loanCarAssigned: boolean;
  loanCarId?: string;
  loanCarDetails?: LoanCar;
  estimatedCost: number;
  actualCost?: number;
  resolutionDate?: Date;
  resolutionDescription?: string;
  additionalNotes: string;
  attachments: string[];
  assignedTo?: string;
  customerSatisfaction?: number; // 1-5 rating
  createdAt: Date;
  updatedAt: Date;
}

export interface WarrantyStats {
  totalActive: number;
  totalThisMonth: number;
  avgResolutionDays: number;
  customerSatisfactionAvg: number;
  totalCostThisMonth: number;
  pendingClaims: number;
}
