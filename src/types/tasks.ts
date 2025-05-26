
export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedBy: string;
  vehicleId?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleLicenseNumber?: string;
  dueDate: Date | string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  location?: string;
  estimatedDuration?: number; // in minutes
  completedAt?: Date | string;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type TaskStatus = 
  | "toegewezen"
  | "in_uitvoering" 
  | "voltooid"
  | "uitgesteld"
  | "geannuleerd";

export type TaskPriority = "laag" | "normaal" | "hoog" | "urgent";

export type TaskCategory = 
  | "voorbereiding"
  | "transport"
  | "inspectie"
  | "schoonmaak"
  | "reparatie"
  | "administratie"
  | "aflevering"
  | "ophalen"
  | "overig";

export interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  department: "verkoop" | "techniek" | "administratie" | "transport" | "schoonmaak";
  active: boolean;
}

export interface TaskFilter {
  status?: TaskStatus;
  assignedTo?: string;
  category?: TaskCategory;
  priority?: TaskPriority;
  dateRange?: {
    start: Date;
    end: Date;
  };
}
