
export type ContactType = 'supplier' | 'b2b' | 'b2c';

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
  phone: string;
  address: Address;
  notes?: string;
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
}

export interface SupplierHistoryItem {
  id: string;
  supplierId: string;
  date: string;
  actionType: 'purchase' | 'contact' | 'other';
  description: string;
  vehicleId?: string;
  vehicleName?: string;
}
