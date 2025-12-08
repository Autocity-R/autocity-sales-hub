import type {
  TaxatieVehicleData,
  PortalAnalysis,
  PortalSearchFilters,
  JPCarsData,
  InternalComparison,
  AITaxatieAdvice,
  TaxatieValuation,
  TaxatieFeedback,
} from '@/types/taxatie';
import { calculateMaxMileage, calculateBuildYearRange } from '@/utils/taxatieHelpers';
import { supabase } from '@/integrations/supabase/client';

// Mock RDW lookup
export const lookupRDW = async (licensePlate: string): Promise<TaxatieVehicleData | null> => {
  await new Promise(resolve => setTimeout(resolve, 800));

  if (licensePlate.toUpperCase().includes('TEST')) {
    return null;
  }

  return {
    brand: 'Volkswagen',
    model: 'Golf',
    buildYear: 2021,
    mileage: 45000,
    fuelType: 'Benzine',
    transmission: 'Automaat',
    bodyType: 'Hatchback',
    power: 150,
    trim: 'R-Line',
    color: 'Grijs',
    options: [],
    keywords: [],
  };
};

// Build search filters based on vehicle data and correct KM logic
const buildSearchFilters = (vehicleData: TaxatieVehicleData): PortalSearchFilters => {
  const yearRange = calculateBuildYearRange(vehicleData.buildYear);
  const mileageMax = calculateMaxMileage(vehicleData.mileage);

  return {
    brand: vehicleData.brand,
    model: vehicleData.model,
    buildYearFrom: yearRange.from,
    buildYearTo: yearRange.to,
    mileageMax, // ALLEEN max, geen min
    fuelType: vehicleData.fuelType,
    transmission: vehicleData.transmission,
    bodyType: vehicleData.bodyType,
    keywords: vehicleData.keywords || [],
    requiredOptions: vehicleData.options || [],
  };
};

// Mock Portal Analysis with correct filter structure
export const fetchPortalAnalysis = async (vehicleData: TaxatieVehicleData): Promise<PortalAnalysis> => {
  await new Promise(resolve => setTimeout(resolve, 1500));

  const filters = buildSearchFilters(vehicleData);

  return {
    lowestPrice: 28500,
    medianPrice: 31200,
    highestPrice: 34900,
    listingCount: 12,
    primaryComparableCount: 5,
    appliedFilters: filters,
    listings: [
      {
        id: '1',
        portal: 'gaspedaal',
        url: 'https://www.gaspedaal.nl/example1',
        price: 28500,
        mileage: 52000,
        buildYear: 2020,
        title: `${vehicleData.brand} ${vehicleData.model} 1.5 TSI Style`,
        options: ['Navigatie', 'Cruise Control'],
        color: 'Zwart',
        matchScore: 0.75,
        isPrimaryComparable: true,
        isLogicalDeviation: true,
        deviationReason: 'Ouder bouwjaar, mist R-Line pakket en leder',
      },
      {
        id: '2',
        portal: 'autoscout24',
        url: 'https://www.autoscout24.nl/example2',
        price: 29900,
        mileage: 48000,
        buildYear: 2021,
        title: `${vehicleData.brand} ${vehicleData.model} 1.5 TSI R-Line`,
        options: ['Navigatie', 'LED', 'Cruise Control'],
        color: 'Grijs',
        matchScore: 0.92,
        isPrimaryComparable: true,
      },
      {
        id: '3',
        portal: 'marktplaats',
        url: 'https://www.marktplaats.nl/example3',
        price: 30500,
        mileage: 42000,
        buildYear: 2021,
        title: `${vehicleData.brand} ${vehicleData.model} 1.5 TSI R-Line Business`,
        options: ['Navigatie', 'LED', 'ACC', 'Leder'],
        color: 'Wit',
        matchScore: 0.88,
        isPrimaryComparable: true,
      },
      {
        id: '4',
        portal: 'autotrack',
        url: 'https://www.autotrack.nl/example4',
        price: 31200,
        mileage: 38000,
        buildYear: 2021,
        title: `${vehicleData.brand} ${vehicleData.model} 1.5 TSI R-Line`,
        options: ['Navigatie', 'LED', 'Panoramadak'],
        color: 'Blauw',
        matchScore: 0.85,
        isPrimaryComparable: true,
      },
      {
        id: '5',
        portal: 'gaspedaal',
        url: 'https://www.gaspedaal.nl/example5',
        price: 32500,
        mileage: 35000,
        buildYear: 2022,
        title: `${vehicleData.brand} ${vehicleData.model} 1.5 TSI R-Line`,
        options: ['Navigatie', 'LED', 'ACC', 'Harman Kardon'],
        color: 'Grijs',
        matchScore: 0.78,
        isPrimaryComparable: true,
      },
      {
        id: '6',
        portal: 'autoscout24',
        url: 'https://www.autoscout24.nl/example6',
        price: 34900,
        mileage: 28000,
        buildYear: 2022,
        title: `${vehicleData.brand} ${vehicleData.model} 2.0 TSI R Full Options`,
        options: ['Navigatie', 'LED Matrix', 'ACC', 'Panorama', 'Leder', 'Harman Kardon'],
        color: 'Zwart',
        matchScore: 0.65,
        isPrimaryComparable: false,
        isLogicalDeviation: true,
        deviationReason: 'Full options, nieuwer, veel minder km - logisch hoger geprijsd',
      },
    ],
    logicalDeviations: [
      '€28.500 listing mist R-Line pakket en heeft ouder bouwjaar',
      '€34.900 heeft full options en slechts 28.000 km - logisch hoger geprijsd',
    ],
  };
};

// Mock JP Cars lookup
export const fetchJPCarsData = async (licensePlate: string): Promise<JPCarsData> => {
  await new Promise(resolve => setTimeout(resolve, 1200));

  return {
    baseValue: 30500,
    optionValue: 2100,
    totalValue: 32600,
    range: { min: 28000, max: 35000 },
    confidence: 0.82,
    apr: 0.85,
    etr: 18,
    courantheid: 'hoog',
  };
};

// Mock interne vergelijking
export const fetchInternalComparison = async (vehicleData: TaxatieVehicleData): Promise<InternalComparison> => {
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    averageMargin: 18.5,
    averageDaysToSell: 22,
    soldLastYear: 8,
    similarVehicles: [
      {
        id: 'sold-1',
        brand: vehicleData.brand,
        model: vehicleData.model,
        buildYear: 2021,
        mileage: 42000,
        purchasePrice: 25500,
        sellingPrice: 30500,
        margin: 19.6,
        daysToSell: 18,
        channel: 'B2C',
        soldAt: '2024-10-15',
      },
      {
        id: 'sold-2',
        brand: vehicleData.brand,
        model: vehicleData.model,
        buildYear: 2020,
        mileage: 55000,
        purchasePrice: 22000,
        sellingPrice: 26500,
        margin: 20.5,
        daysToSell: 25,
        channel: 'B2C',
        soldAt: '2024-09-20',
      },
      {
        id: 'sold-3',
        brand: vehicleData.brand,
        model: vehicleData.model,
        buildYear: 2021,
        mileage: 38000,
        purchasePrice: 26500,
        sellingPrice: 31000,
        margin: 17.0,
        daysToSell: 14,
        channel: 'B2C',
        soldAt: '2024-11-05',
      },
    ],
  };
};

// Fallback advice when AI is unavailable
const generateFallbackAdvice = (
  vehicleData: TaxatieVehicleData,
  portalAnalysis: PortalAnalysis,
  jpCarsData: JPCarsData
): AITaxatieAdvice => {
  const recommendedSellingPrice = Math.round(portalAnalysis.lowestPrice * 0.98);
  const targetMargin = 20;
  const recommendedPurchasePrice = Math.round(recommendedSellingPrice * (1 - targetMargin / 100));

  return {
    recommendedSellingPrice,
    recommendedPurchasePrice,
    expectedDaysToSell: jpCarsData.etr,
    targetMargin,
    recommendation: 'twijfel',
    reasoning: `⚠️ AI advies niet beschikbaar. Dit is een automatische berekening op basis van portaaldata. 
    
Verkoopprijs: Laagste vergelijkbare listing (€${portalAnalysis.lowestPrice.toLocaleString()}) minus 2% = €${recommendedSellingPrice.toLocaleString()}.
Inkoopprijs: Verkoopprijs met 20% standaardmarge = €${recommendedPurchasePrice.toLocaleString()}.
Verwachte statijd: JP Cars ETR van ${jpCarsData.etr} dagen.

⚠️ Controleer dit advies handmatig voordat je een bod uitbrengt.`,
    jpcarsDeviation: 'Geen AI analyse beschikbaar - handmatige verificatie aanbevolen',
    riskFactors: ['Automatisch berekend - handmatige verificatie noodzakelijk'],
    opportunities: [],
    primaryListingsUsed: portalAnalysis.primaryComparableCount,
  };
};

// AI-powered advice generation via Edge Function
export const generateAIAdvice = async (
  vehicleData: TaxatieVehicleData,
  portalAnalysis: PortalAnalysis,
  jpCarsData: JPCarsData,
  internalComparison: InternalComparison
): Promise<AITaxatieAdvice> => {
  try {
    console.log('🤖 Calling taxatie-ai-advice edge function...');
    
    const { data, error } = await supabase.functions.invoke('taxatie-ai-advice', {
      body: {
        vehicleData,
        portalAnalysis,
        jpCarsData,
        internalComparison,
      }
    });

    if (error) {
      console.error('❌ Edge function error:', error);
      throw new Error(error.message || 'Edge function call failed');
    }

    if (!data?.success || !data?.advice) {
      console.error('❌ Invalid response from edge function:', data);
      throw new Error(data?.error || 'Invalid response from AI');
    }

    console.log('✅ AI advice received:', data.advice.recommendation);
    return data.advice;

  } catch (err) {
    console.error('❌ AI advice generation failed, using fallback:', err);
    return generateFallbackAdvice(vehicleData, portalAnalysis, jpCarsData);
  }
};

// Taxatie opslaan
export const saveTaxatieValuation = async (valuation: Partial<TaxatieValuation>): Promise<TaxatieValuation> => {
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    createdBy: 'current-user-id',
    createdByName: 'Demo User',
    aiModelVersion: 'gemini-2.5-flash-taxatie-v1',
    status: 'voltooid',
    licensePlate: '',
    ...valuation,
  } as TaxatieValuation;
};

// Feedback opslaan
export const saveTaxatieFeedback = async (
  valuationId: string,
  feedback: TaxatieFeedback
): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  console.log('Feedback saved:', { valuationId, feedback });
};

// Taxatie historie ophalen
export const fetchTaxatieHistory = async (): Promise<TaxatieValuation[]> => {
  await new Promise(resolve => setTimeout(resolve, 800));

  return [
    {
      id: '1',
      createdAt: '2024-12-06T14:30:00Z',
      createdBy: 'user-1',
      createdByName: 'Jan de Vries',
      licensePlate: 'AB-123-CD',
      aiModelVersion: 'gemini-2.5-flash-taxatie-v1',
      vehicleData: {
        brand: 'BMW',
        model: '3 Serie',
        buildYear: 2022,
        mileage: 35000,
        fuelType: 'Diesel',
        transmission: 'Automaat',
        bodyType: 'Sedan',
        power: 190,
        trim: 'M Sport',
        color: 'Zwart',
        options: ['Navigatie', 'LED', 'ACC'],
      },
      portalAnalysis: null,
      jpCarsData: null,
      internalComparison: null,
      aiAdvice: {
        recommendedSellingPrice: 42500,
        recommendedPurchasePrice: 35000,
        expectedDaysToSell: 21,
        targetMargin: 17.5,
        recommendation: 'kopen',
        reasoning: 'Goede auto',
        jpcarsDeviation: 'Kleine afwijking',
        riskFactors: [],
        opportunities: [],
        primaryListingsUsed: 4,
      },
      status: 'gekocht',
    },
    {
      id: '2',
      createdAt: '2024-12-05T10:15:00Z',
      createdBy: 'user-2',
      createdByName: 'Piet Jansen',
      licensePlate: 'EF-456-GH',
      aiModelVersion: 'gemini-2.5-flash-taxatie-v1',
      vehicleData: {
        brand: 'Audi',
        model: 'A4',
        buildYear: 2020,
        mileage: 62000,
        fuelType: 'Benzine',
        transmission: 'Automaat',
        bodyType: 'Sedan',
        power: 150,
        trim: 'S-Line',
        color: 'Wit',
        options: ['Navigatie'],
      },
      portalAnalysis: null,
      jpCarsData: null,
      internalComparison: null,
      aiAdvice: {
        recommendedSellingPrice: 28900,
        recommendedPurchasePrice: 23500,
        expectedDaysToSell: 28,
        targetMargin: 18.7,
        recommendation: 'twijfel',
        reasoning: 'Hoge kilometerstand',
        jpcarsDeviation: 'JP Cars te optimistisch',
        riskFactors: ['Hoge km'],
        opportunities: [],
        primaryListingsUsed: 6,
      },
      status: 'afgewezen',
    },
  ];
};
