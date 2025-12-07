import type {
  TaxatieVehicleData,
  PortalAnalysis,
  JPCarsData,
  InternalComparison,
  AITaxatieAdvice,
  TaxatieValuation,
  TaxatieFeedback,
} from '@/types/taxatie';

// Mock RDW lookup
export const lookupRDW = async (licensePlate: string): Promise<TaxatieVehicleData | null> => {
  // Simuleer API delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Mock data voor demonstratie
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
    power: 150,
    trim: 'R-Line',
    color: 'Grijs Metallic',
    options: [],
  };
};

// Mock Portal Analysis
export const fetchPortalAnalysis = async (vehicleData: TaxatieVehicleData): Promise<PortalAnalysis> => {
  await new Promise(resolve => setTimeout(resolve, 1500));

  return {
    lowestPrice: 28500,
    medianPrice: 31200,
    highestPrice: 34900,
    listingCount: 12,
    primaryComparableCount: 5,
    appliedFilters: {
      brand: vehicleData.brand,
      model: vehicleData.model,
      buildYearRange: `${vehicleData.buildYear - 1} - ${vehicleData.buildYear + 1}`,
      mileageRange: `${Math.max(0, vehicleData.mileage - 15000)} - ${vehicleData.mileage + 15000} km`,
      fuelType: vehicleData.fuelType,
    },
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

// Mock JP Cars lookup (inclusief APR/ETR)
export const fetchJPCarsData = async (licensePlate: string): Promise<JPCarsData> => {
  await new Promise(resolve => setTimeout(resolve, 1200));

  return {
    baseValue: 30500,
    optionValue: 2100,
    totalValue: 32600,
    range: { min: 28000, max: 35000 },
    confidence: 0.82,
    apr: 0.85, // 85% = onder marktgemiddelde = goed
    etr: 18, // Verwacht 18 dagen statijd
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

// Mock AI analyse
export const generateAIAdvice = async (
  vehicleData: TaxatieVehicleData,
  portalAnalysis: PortalAnalysis,
  jpCarsData: JPCarsData,
  internalComparison: InternalComparison
): Promise<AITaxatieAdvice> => {
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Bereken op basis van portaaldata (LEIDEND)
  const recommendedSellingPrice = Math.round(portalAnalysis.lowestPrice * 0.98); // Net onder laagste
  const targetMargin = 18;
  const recommendedPurchasePrice = Math.round(recommendedSellingPrice * (1 - targetMargin / 100));

  return {
    recommendedSellingPrice,
    recommendedPurchasePrice,
    expectedDaysToSell: jpCarsData.etr,
    targetMargin,
    recommendation: 'kopen',
    reasoning: `Op basis van ${portalAnalysis.primaryComparableCount} vergelijkbare listings adviseren wij een verkoopprijs van €${recommendedSellingPrice.toLocaleString()}. Dit ligt net onder de laagste vergelijkbare advertentie (€${portalAnalysis.lowestPrice.toLocaleString()}) waardoor Autocity de scherpste aanbieder wordt. Met een verwachte statijd van ${jpCarsData.etr} dagen en een doelmarge van ${targetMargin}%, is de aanbevolen inkoopprijs €${recommendedPurchasePrice.toLocaleString()}.`,
    jpcarsDeviation: `JP Cars waardeert dit voertuig op €${jpCarsData.totalValue.toLocaleString()}, wat €${(jpCarsData.totalValue - portalAnalysis.lowestPrice).toLocaleString()} hoger is dan de laagste marktprijs. Dit verschil ontstaat doordat JP Cars optiewaarde (€${jpCarsData.optionValue.toLocaleString()}) zwaarder meeweegt dan de daadwerkelijke markt. Wij volgen daarom de portaaldata.`,
    riskFactors: [
      'R-Line uitvoering is populair maar concurrentie is hoog',
      'Kilometerstand (45.000 km) is gemiddeld voor dit bouwjaar',
    ],
    opportunities: [
      'Hoge courantheid (APR 0.85) = snelle doorlooptijd verwacht',
      'Autocity heeft dit model 8x verkocht afgelopen jaar met 18.5% marge',
      'Grijs metallic is een courante kleur',
    ],
    primaryListingsUsed: portalAnalysis.primaryComparableCount,
  };
};

// Taxatie opslaan (mock)
export const saveTaxatieValuation = async (valuation: Partial<TaxatieValuation>): Promise<TaxatieValuation> => {
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    createdBy: 'current-user-id',
    createdByName: 'Demo User',
    aiModelVersion: 'gpt-4.1-mini-taxatie-v1',
    status: 'voltooid',
    ...valuation,
  } as TaxatieValuation;
};

// Feedback opslaan (mock)
export const saveTaxatieFeedback = async (
  valuationId: string,
  feedback: TaxatieFeedback
): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  console.log('Feedback saved:', { valuationId, feedback });
};

// Taxatie historie ophalen (mock)
export const fetchTaxatieHistory = async (): Promise<TaxatieValuation[]> => {
  await new Promise(resolve => setTimeout(resolve, 800));

  return [
    {
      id: '1',
      createdAt: '2024-12-06T14:30:00Z',
      createdBy: 'user-1',
      createdByName: 'Jan de Vries',
      licensePlate: 'AB-123-CD',
      aiModelVersion: 'gpt-4.1-mini-taxatie-v1',
      vehicleData: {
        brand: 'BMW',
        model: '3 Serie',
        buildYear: 2022,
        mileage: 35000,
        fuelType: 'Diesel',
        transmission: 'Automaat',
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
      aiModelVersion: 'gpt-4.1-mini-taxatie-v1',
      vehicleData: {
        brand: 'Audi',
        model: 'A4',
        buildYear: 2020,
        mileage: 62000,
        fuelType: 'Benzine',
        transmission: 'Automaat',
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
