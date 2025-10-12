
export type ContactType = 'supplier' | 'b2b' | 'b2c' | 'transporter';

export interface Address {
  street: string;
  number: string;
  city: string;
  zipCode: string;
  country: string;
}

export interface Contact {
  id: string;
  type: ContactType;
  companyName?: string;
  firstName: string;
  lastName: string;
  email: string;
  additionalEmails?: string[]; // Additional emails for suppliers/B2B clients
  phone: string;
  address: Address;
  notes?: string;
  isCarDealer?: boolean; // True if the contact is a car dealership (B2B), false for regular business customers (B2C)
  createdAt: string;
  updatedAt: string;
}

export interface CustomerHistoryItem {
  id: string;
  customerId: string;
  date: string;
  actionType: 'lead' | 'purchase' | 'contact' | 'sale' | 'other';
  description: string;
  vehicleId?: string;
  vehicleName?: string;
  // Additional vehicle details
  vehicleDetails?: boolean;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleMileage?: number;
  vehicleVin?: string;
  vehiclePrice?: number;
}

export interface SupplierHistoryItem {
  id: string;
  supplierId: string;
  date: string;
  actionType: 'purchase' | 'contact' | 'other';
  description: string;
  vehicleId?: string;
  vehicleName?: string;
  // Additional vehicle details
  vehicleDetails?: boolean;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleMileage?: number;
  vehicleVin?: string;
  vehiclePrice?: number;
}
