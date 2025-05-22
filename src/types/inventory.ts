
export type ImportStatus = 
  | "niet_gestart" 
  | "aangemeld"      // Added
  | "goedgekeurd"    // Added
  | "transport_geregeld" 
  | "onderweg" 
  | "aangekomen" 
  | "afgemeld"
  | "bpm_betaald"
  | "herkeuring"
  | "ingeschreven";

export type WorkshopStatus = 
  | "wachten" 
  | "poetsen" 
  | "spuiten" 
  | "gereed";

export type DamageStatus = 
  | "geen" 
  | "licht" 
  | "middel" 
  | "zwaar" 
  | "total_loss";

export type LocationStatus = 
  | "showroom" 
  | "opslag" 
  | "calandstraat"
  | "werkplaats"
  | "poetser"
  | "spuiter"
  | "onderweg"       // Added
  | "oud_beijerland";

export type SalesStatus = 
  | "voorraad" 
  | "verkocht_b2b" 
  | "verkocht_b2c"
  | "afgeleverd";    // Added the "afgeleverd" status

export type PaymentStatus =  // New type
  | "niet_betaald"
  | "aanbetaling"
  | "volledig_betaald";

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  licenseNumber: string;
  vin: string;
  mileage: number;
  importStatus: ImportStatus;
  arrived: boolean;
  workshopStatus: WorkshopStatus;
  location: LocationStatus;
  salesStatus: SalesStatus;
  showroomOnline: boolean;
  bpmRequested: boolean;
  bpmStarted: boolean;
  damage: {
    description: string;
    status: DamageStatus;
  };
  purchasePrice: number;
  sellingPrice: number;    // Added selling price
  paymentStatus: PaymentStatus; // Added payment status
  cmrSent: boolean;
  cmrDate: Date | null;
  papersReceived: boolean;
  papersDate: Date | null;
  notes: string;
  mainPhotoUrl: string | null;
  photos: string[];
  createdAt?: string | Date;
  customerId?: string;      // Added customer reference
}

export interface Supplier {
  id: string;
  name: string;
  country: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
}

export interface Customer {
  id: string;
  name: string;
  type: "particulier" | "zakelijk";
  contactPerson?: string;
  email: string;
  phone: string;
  address: string;
  purchasedVehicles?: string[]; // array of vehicle ids
}
