export type ImportStatus = 'niet_aangemeld' | 'aanvraag_ontvangen' | 'goedgekeurd' | 'bpm_betaald' | 'ingeschreven';

export interface PendingDeliveryExtended {
  id: string;
  brand: string;
  model: string;
  licensePlate: string | null;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  soldDate: string;
  daysSinceSale: number;
  checklistProgress: number;
  checklistTotal: number;
  checklistCompleted: number;
  importStatus: ImportStatus | string | null;
  isLate: boolean;
  isWarning: boolean;
  isReadyForDelivery: boolean;
  location: string | null;
  unassignedTaskCount: number;
}

export interface AftersalesKPIs {
  pendingDeliveries: number;
  averageWaitingDays: number;
  openWarrantyClaims: number;
  openTasks: number;
}

export interface AftersalesDashboardData {
  pendingDeliveries: PendingDeliveryExtended[];
  openWarrantyClaims: WarrantyClaimExtended[];
  resolvedWarrantyClaims: WarrantyClaimExtended[];
  openTasks: TaskExtended[];
  completedTasks: TaskExtended[];
  kpis: AftersalesKPIs;
}

export interface WarrantyClaimExtended {
  id: string;
  vehicleId: string | null;
  vehicleBrand: string;
  vehicleModel: string;
  licensePlate: string | null;
  customerName: string;
  problemDescription: string;
  status: string;
  createdAt: string;
  daysOpen: number;
  claimAmount?: number | null;
  resolvedAt?: string | null;
  resolutionDays?: number;
}

export interface TaskExtended {
  id: string;
  title: string;
  description: string;
  vehicleId: string | null;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  licensePlate: string | null;
  assignedToName: string;
  assignedToId: string;
  dueDate: string;
  status: string;
  category: string;
  priority: string;
  completedAt?: string | null;
}
