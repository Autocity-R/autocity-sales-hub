// Portal listing (van AI zoekopdracht)
export interface PortalListing {
  id: string;
  portal: 'gaspedaal' | 'autoscout24' | 'autotrack' | 'marktplaats';
  url: string;
  price: number;
  mileage: number;
  buildYear: number;
  title: string;
  options: string[];
  color?: string;
  matchScore?: number; // 0-1 hoe vergelijkbaar met "jouw" auto
  isPrimaryComparable?: boolean; // true = deze listing telt mee voor berekening
  isLogicalDeviation?: boolean;
  deviationReason?: string;
}

// JP Cars data (inclusief APR/ETR)
export interface JPCarsData {
  baseValue: number;
  optionValue: number;
  totalValue: number;
  range: { min: number; max: number };
  confidence: number;
  apr: number; // Average Price Ratio (0-1, hoger = onder markt)
  etr: number; // Expected Time to Retail (dagen)
  courantheid: 'hoog' | 'gemiddeld' | 'laag';
}

// Portal analyse resultaat
export interface PortalAnalysis {
  lowestPrice: number;
  medianPrice: number;
  highestPrice: number;
  listingCount: number;
  primaryComparableCount: number;
  appliedFilters: {
    brand: string;
    model: string;
    buildYearRange: string;
    mileageRange: string;
    fuelType?: string;
  };
  listings: PortalListing[];
  logicalDeviations: string[];
}

// Vergelijkbare verkoop uit historie
export interface SimilarVehicleSale {
  id: string;
  brand: string;
  model: string;
  buildYear: number;
  mileage: number;
  purchasePrice: number;
  sellingPrice: number;
  margin: number;
  daysToSell: number;
  channel: 'B2B' | 'B2C';
  soldAt: string; // ISO datum
}

// Interne vergelijking
export interface InternalComparison {
  averageMargin: number;
  averageDaysToSell: number;
  soldLastYear: number;
  similarVehicles: SimilarVehicleSale[];
}

// AI Advies
export interface AITaxatieAdvice {
  recommendedSellingPrice: number;
  recommendedPurchasePrice: number;
  expectedDaysToSell: number;
  targetMargin: number;
  recommendation: 'kopen' | 'niet_kopen' | 'twijfel';
  reasoning: string;
  jpcarsDeviation: string; // Waarom JP Cars afwijkt
  riskFactors: string[];
  opportunities: string[];
  primaryListingsUsed: number; // Hoeveel listings gebruikt voor berekening
}

// Taxatie feedback
export interface TaxatieFeedback {
  rating: number; // 1-5
  wasAccurate: boolean;
  reason?: 'te_hoog' | 'te_laag' | 'te_voorzichtig' | 'te_agressief' | 'anders';
  notes: string;
}

// Taxatie uitkomst (voor learning)
export interface TaxatieOutcome {
  wasPurchased: boolean;
  actualPurchasePrice?: number;
  actualSellingPrice?: number;
  actualDaysToSell?: number;
  actualMargin?: number;
}

// Voertuiggegevens
export interface TaxatieVehicleData {
  brand: string;
  model: string;
  buildYear: number;
  mileage: number;
  fuelType: string;
  transmission: string;
  power: number;
  trim: string;
  color: string;
  options: string[];
}

// Complete taxatie record
export interface TaxatieValuation {
  id: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;

  // Link naar CRM
  vehicleId?: string; // FK naar vehicles tabel
  aiModelVersion?: string; // bijv. "gpt-4.1-mini-taxatie-v1"

  // Voertuiggegevens
  licensePlate: string;
  vehicleData: TaxatieVehicleData;

  // Data bronnen
  portalAnalysis: PortalAnalysis | null;
  jpCarsData: JPCarsData | null;
  internalComparison: InternalComparison | null;

  // AI Resultaat
  aiAdvice: AITaxatieAdvice | null;

  // Status
  status: 'concept' | 'in_behandeling' | 'voltooid' | 'gekocht' | 'afgewezen';

  // Feedback (voor learning)
  feedback?: TaxatieFeedback;

  // Werkelijke uitkomst (voor learning)
  outcome?: TaxatieOutcome;
}

// Loading states per bron
export interface TaxatieLoadingState {
  rdw: boolean;
  portals: boolean;
  jpCars: boolean;
  internalHistory: boolean;
  aiAnalysis: boolean;
}
