
export type TransportStatus = 
  | "onderweg"
  | "transport_geregeld"
  | "aangekomen";

export type ImportStatus = 
  | "niet_aangemeld" 
  | "aanvraag_ontvangen"
  | "goedgekeurd"
  | "bpm_betaald"
  | "ingeschreven";

export type WorkshopStatus = 
  | "wachten" 
  | "poetsen" 
  | "spuiten" 
  | "gereed"
  | "klaar_voor_aflevering"  // Added for B2C
  | "in_werkplaats"          // Added for B2C
  | "wacht_op_onderdelen";   // Added for B2C

export type PaintStatus =     // New type for B2C
  | "geen_behandeling"
  | "hersteld"
  | "in_behandeling";

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
  | "onderweg"
  | "oud_beijerland"
  | "afgeleverd";

export type SalesStatus = 
  | "voorraad" 
  | "verkocht_b2b" 
  | "verkocht_b2c"
  | "afgeleverd"
  | "leenauto";     // Added for loan cars that shouldn't appear in inventory

export type PaymentStatus =  // New type
  | "niet_betaald"
  | "aanbetaling"
  | "volledig_betaald";

export type UserRole = "Admin" | "Verkoper" | "Financieel" | "Werkplaats";

export interface ContactInfo {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  isCarDealer?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export interface ChecklistItem {
  id: string;
  description: string;
  completed: boolean;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  completedAt?: string;
  completedBy?: string;
  completedByName?: string;
  [key: string]: any; // Make compatible with Json type
}

export interface VehicleDetails {
  purchasePrice?: number;
  customerEmail?: string;
  papersReceived?: boolean;
  
  // Payment status fields - GESCHEIDEN
  // ⚠️ DEPRECATED - Gebruik purchase_payment_status of sales_payment_status
  paymentStatus?: PaymentStatus;
  
  // ✅ NIEUW - Inkoop betaling (Transport menu - "Hebben WIJ aan leverancier betaald?")
  purchase_payment_status?: PaymentStatus;
  
  // ✅ NIEUW - Verkoop betaling (B2B/B2C verkoop - "Heeft KLANT aan ons betaald?")
  sales_payment_status?: PaymentStatus;
  
  // Warranty package fields
  warrantyPackage?: string;
  warrantyPackagePrice?: number;
  warrantyPackageName?: string;
  warrantyPackageSource?: 'contract' | 'delivery' | 'manual';
  warrantyPackageDate?: string;
  contractSentBy?: string;
  contractSentByName?: string;
  contractSentDate?: string;
  
  // Purchase tracking fields
  purchasedById?: string;
  purchasedByName?: string;
  
  // Inruil tracking
  isTradeIn?: boolean;              // TRUE = inruil, FALSE = normale inkoop
  tradeInDate?: string;             // Datum van inruil
  tradeInNotes?: string;            // Optionele notities
  
  // Transport/Pickup tracking fields
  pickupDocumentSent?: boolean;
  pickupDocumentSentDate?: string;
  pickupDocumentSentBy?: string;
  
  // Pre-delivery checklist for B2C sales
  preDeliveryChecklist?: ChecklistItem[];
  
  // Late delivery alert dismiss
  deliveryAlertDismissed?: boolean;
  deliveryAlertDismissedDate?: string;
  deliveryAlertDismissedBy?: string;
  deliveryAlertDismissedReason?: string;
  
  // Other details
  [key: string]: any;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  color?: string;  // Added color field
  licenseNumber: string;
  vin: string;
  mileage: number;
  importStatus: ImportStatus;
  transportStatus: TransportStatus;
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
  paintStatus?: PaintStatus; // Added paint status for B2C vehicles
  cmrSent: boolean;
  cmrDate: Date | null;
  papersReceived: boolean;
  papersDate: Date | null;
  notes: string;
  mainPhotoUrl: string | null;
  photos: string[];
  createdAt?: string | Date;
  deliveryDate?: string | Date;  // Date when vehicle was delivered (afgeleverd)
  customerName?: string;    // Added customer name for display
  salespersonId?: string;   // Added salesperson reference
  salespersonName?: string; // Added salesperson name for display
  purchasedById?: string;   // Added purchaser reference
  purchasedByName?: string; // Added purchaser name for display
  purchaseDate?: Date | null; // Added purchase date
  
  // Contract information
  contractId?: string;      // Reference to the generated contract
  contractUrl?: string;     // Link to the stored contract document
  contractType?: "b2b" | "b2c"; // Type of contract
  contractDate?: Date | null; // Date when contract was generated
  contractOptions?: any;    // The options used when generating the contract
  
  // Contact references to contacts table
  customerId?: string;              // Reference to customer in contacts table
  supplierId?: string;              // Reference to supplier in contacts table
  transporterId?: string;           // Reference to transporter in contacts table
  transporter_id?: string;          // New field: Reference to transporter in contacts table (separate from supplier)
  
  // Contact informatie voor email verzending
  customerContact?: ContactInfo;    // Klant contact informatie
  supplierContact?: ContactInfo;    // Leverancier contact informatie  
  transporterContact?: ContactInfo; // Transporteur contact informatie
  year?: number; // Toegevoegd voor email templates
  
  // Email reminder settings
  emailReminderSettings?: {
    payment_reminder_enabled?: boolean;
    papers_reminder_enabled?: boolean;
  };
  
  // JSONB details field
  details?: VehicleDetails;
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

// Moving the FileCategory and VehicleFile types from files.ts to inventory.ts since they're related to vehicles
export type FileCategory = "damage" | "cmr" | "pickup" | "contract_b2b" | "contract_b2c";

export interface VehicleFile {
  id: string;
  name: string;
  url: string;
  category: FileCategory;
  vehicleId: string;
  createdAt: string;
  size?: number;
  type?: string;
  isLargeFile?: boolean;
  filePath?: string;
  uploadedAt?: string;
  uploadedBy?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  metadata?: any;
}
