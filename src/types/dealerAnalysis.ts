// Types for Dealer Analysis feature

export interface DealerListing {
  dealerName: string;
  price: number;
  mileage: number;
  daysInStock: number;
  soldSince: number | null;
  url: string;
  buildYear?: number;
}

export interface VehicleInput {
  brand: string;
  model: string;
  buildYear: number;
  fuelType: string;
  transmission: string;
  power?: number;
  bodyType?: string;
  variant?: string;
  licensePlate?: string;
  mileage?: number;
  rowIndex?: number;
  askingPrice?: number;
}

export interface DealerAnalysisResult {
  vehicle: VehicleInput;
  dealers: DealerListing[];
  stats: {
    avgPrice: number;
    avgDaysInStock: number;
    totalListings: number;
    fastestSale: number | null;
  };
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  windowUrl?: string;
}

export interface DealerAnalysisState {
  isProcessing: boolean;
  isParsing: boolean;
  isUploading: boolean;
  progress: {
    current: number;
    total: number;
    currentVehicle: string;
  };
  rawData: Record<string, unknown>[];
  availableColumns: string[];
  vehicles: VehicleInput[];
  results: DealerAnalysisResult[];
  filename: string;
}
