
export interface SystemDataAccess {
  leads: boolean;
  customers: boolean;
  vehicles: boolean;
  appointments: boolean;
  contracts: boolean;
  contacts: boolean;     // Added for full contact management
  warranty: boolean;     // Added for warranty claims
  loan_cars: boolean;    // Added for loan car management
}

export interface AgentContext {
  id: string;
  agent_id: string;
  context_type: string;
  query_template: string;
  is_active: boolean;
  priority: number;
}

export interface Contact {
  id: string;
  type: 'supplier' | 'b2b' | 'b2c';
  company_name?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address_street?: string;
  address_city?: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  license_number?: string;
  vin?: string;
  mileage?: number;
  status: string;
  location?: string;
  selling_price?: number;
  customer_id?: string;
  created_at: string;
}

export interface Lead {
  id: string;
  status: string;
  priority: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  interested_vehicle?: string;
  assigned_to?: string;
  created_at: string;
}

export interface Contract {
  id: string;
  contract_number: string;
  type: 'b2b' | 'b2c';
  status: string;
  customer_id: string;
  vehicle_id: string;
  contract_amount: number;
  created_at: string;
}

export interface SystemData {
  appointments?: any[];
  contacts?: Contact[];
  vehicles?: Vehicle[];
  leads?: Lead[];
  contracts?: Contract[];
  recentActivity?: any[];
  availableVehicles?: Vehicle[];
  warranty_claims?: any[];
  loan_cars?: any[];
}
