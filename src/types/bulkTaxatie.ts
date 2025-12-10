import type { TaxatieVehicleData, JPCarsData, PortalAnalysis, InternalComparison, AITaxatieAdvice } from './taxatie';

// Parsed vehicle from AI
export interface ParsedVehicle {
  brand: string | null;
  model: string | null;
  variant: string | null;
  buildYear: number | null;
  fuelType: string | null;
  transmission: string | null;
  bodyType: string | null;
  power: number | null;
  confidence: number;
  originalDescription: string;
}

// Excel row input from supplier
export interface BulkTaxatieInput {
  rowIndex: number;
  brand: string;
  model: string;
  buildYear: number;
  mileage: number;
  fuelType?: string;
  transmission?: string;
  askingPrice?: number;
  supplierName?: string;
  color?: string;
  power?: number;
  variant?: string;
  bodyType?: string;
  originalDescription?: string;
  parseConfidence?: number;
}

// Result per vehicle
export interface BulkTaxatieResult {
  input: BulkTaxatieInput;
  vehicleData: TaxatieVehicleData;
  jpCarsData: JPCarsData | null;
  portalAnalysis: PortalAnalysis | null;
  internalComparison: InternalComparison | null;
  aiAdvice: AITaxatieAdvice | null;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  savedValuationId?: string;
}

// Column mapping for Excel import
export interface ColumnMapping {
  brand: string | null;
  model: string | null;
  buildYear: string | null;
  mileage: string | null;
  fuelType: string | null;
  transmission: string | null;
  askingPrice: string | null;
  supplierName: string | null;
  color: string | null;
  power: string | null;
  combinedDescription: string | null; // For AI parsing
}

// Detected supplier info
export interface DetectedSupplier {
  id: string;
  name: string;
  requiresAIParsing: boolean;
}

// Processing state
export interface BulkTaxatieState {
  isUploading: boolean;
  isProcessing: boolean;
  isParsing: boolean;
  progress: {
    current: number;
    total: number;
    currentVehicle: string;
  };
  rawData: Record<string, unknown>[];
  columnMapping: ColumnMapping;
  availableColumns: string[];
  inputs: BulkTaxatieInput[];
  results: BulkTaxatieResult[];
  detectedSupplier: DetectedSupplier | null;
  parsedVehicles: ParsedVehicle[];
  filename: string;
}

// Export format options
export interface BulkExportOptions {
  includePortalData: boolean;
  includeInternalData: boolean;
  colorCode: boolean;
}
