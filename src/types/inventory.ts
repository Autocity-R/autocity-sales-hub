
export type ImportStatus = 
  | "niet_gestart" 
  | "transport_geregeld" 
  | "onderweg" 
  | "aangekomen" 
  | "afgemeld";

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

export interface Vehicle {
  id: string;
  licenseNumber: string;
  model: string;
  importStatus: ImportStatus;
  arrived: boolean;
  workshopStatus: WorkshopStatus;
  showroomOnline: boolean;
  bpmRequested: boolean;
  damage: {
    description: string;
    status: DamageStatus;
  };
  purchasePrice: number;
  cmrSent: boolean;
  cmrDate: Date | null;
  papersReceived: boolean;
  papersDate: Date | null;
  notes: string;
}

export interface Supplier {
  id: string;
  name: string;
  country: string;
  contactPerson: string;
}

export interface Customer {
  id: string;
  name: string;
  type: "particulier" | "zakelijk";
  contact: string;
}
