import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import type { DealerAnalysisState, DealerAnalysisResult, VehicleInput, DealerListing } from '@/types/dealerAnalysis';

interface AIAnalyzedVehicle {
  rowIndex: number;
  make: string;
  model: string;
  variant: string | null;
  buildYear: number;
  mileage: number;
  fuelType: string;
  transmission: string;
  bodyType: string | null;
  power: number | null;
  confidence: number;
  originalData: string;
}

interface JPCarsWindowItem {
  make?: string;
  model?: string;
  price_local?: number;
  mileage?: number;
  build?: number;
  url?: string;
  dealer_name?: string;
  days_in_stock?: number;
  sold_since?: number;
}

const initialState: DealerAnalysisState = {
  isProcessing: false,
  isParsing: false,
  isUploading: false,
  progress: { current: 0, total: 0, currentVehicle: '' },
  rawData: [],
  availableColumns: [],
  vehicles: [],
  results: [],
  filename: '',
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withTimeout = <T>(promise: Promise<T>, ms: number, operation: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout na ${ms / 1000}s bij ${operation}`)), ms)
    ),
  ]);
};

export const useDealerAnalysis = () => {
  const [state, setState] = useState<DealerAnalysisState>(initialState);

  // Find header row (same logic as useBulkTaxatie)
  const findHeaderRow = (sheetAsArray: unknown[][]): number => {
    const headerKeywords = [
      'position', 'mileage', 'commercial', 'registration', 'brand', 'model',
      'km', 'year', 'bouwjaar', 'kilometerstand', 'merk', 'kenteken',
      'prijs', 'price', 'fuel', 'brandstof', 'transmission', 'owner'
    ];

    for (let i = 0; i < Math.min(20, sheetAsArray.length); i++) {
      const row = sheetAsArray[i];
      if (!row || !Array.isArray(row) || row.length === 0) continue;

      const rowText = row
        .map(cell => String(cell || '').toLowerCase())
        .join(' ');

      const matchCount = headerKeywords.filter(kw => rowText.includes(kw)).length;

      if (matchCount >= 2) {
        console.log(`✅ Header rij gevonden op rij ${i + 1}`);
        return i;
      }
    }

    for (let i = 0; i < Math.min(10, sheetAsArray.length); i++) {
      const row = sheetAsArray[i];
      if (!row || !Array.isArray(row)) continue;

      const filledCells = row.filter(cell => cell && String(cell).trim() !== '').length;
      if (filledCells >= 5) {
        return i;
      }
    }

    return 0;
  };

  // Parse Excel file
  const parseExcelFile = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, isUploading: true, filename: file.name }));

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const sheetAsArray = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

      if (sheetAsArray.length === 0) {
        throw new Error('Excel bestand is leeg');
      }

      const headerRowIndex = findHeaderRow(sheetAsArray);

      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        range: headerRowIndex,
        defval: '',
        raw: false,
      }) as Record<string, unknown>[];

      if (jsonData.length === 0) {
        throw new Error('Geen data gevonden na header rij');
      }

      let columns = Object.keys(jsonData[0]);
      const realColumns = columns.filter(c => !c.startsWith('__EMPTY'));

      let processedData = jsonData;
      let finalColumns = realColumns.length > 0 ? realColumns : columns;

      if (realColumns.length < 3) {
        processedData = jsonData.map((row, idx) => ({
          rowIndex: idx,
          combinedDescription: Object.values(row)
            .filter(v => v && String(v).trim() !== '')
            .join(' | '),
        }));
        finalColumns = ['rowIndex', 'combinedDescription'];
      }

      const validData = processedData.filter(row => {
        const values = Object.values(row).filter(v => v && String(v).trim() !== '');
        return values.length >= 2;
      });

      setState(prev => ({
        ...prev,
        isUploading: false,
        rawData: validData,
        availableColumns: finalColumns,
        vehicles: [],
        results: [],
      }));

      toast.success(`${validData.length} rijen geïmporteerd uit "${file.name}"`);
    } catch (err) {
      console.error('Excel parse error:', err);
      toast.error('Fout bij het lezen van Excel bestand');
      setState(prev => ({ ...prev, isUploading: false }));
    }
  }, []);

  // Analyze Excel with AI
  const analyzeExcelWithAI = useCallback(async () => {
    const { rawData, availableColumns } = state;

    if (rawData.length === 0) {
      toast.error('Upload eerst een Excel bestand');
      return;
    }

    setState(prev => ({ ...prev, isParsing: true }));

    try {
      const batchSize = 150;
      const allVehicles: VehicleInput[] = [];

      for (let i = 0; i < rawData.length; i += batchSize) {
        const batch = rawData.slice(i, i + batchSize);

        const { data, error } = await supabase.functions.invoke('analyze-excel-vehicles', {
          body: {
            headers: availableColumns,
            rows: batch,
          },
        });

        if (error) {
          console.error('AI analysis error:', error);
          toast.error(`Fout bij analyse: ${error.message}`);
          continue;
        }

        if (data?.vehicles) {
          const vehicles = data.vehicles as AIAnalyzedVehicle[];

          const inputs = vehicles.map((v): VehicleInput => ({
            brand: v.make,
            model: v.model,
            buildYear: v.buildYear,
            fuelType: v.fuelType,
            transmission: v.transmission,
            power: v.power || undefined,
            bodyType: v.bodyType || undefined,
            variant: v.variant || undefined,
          }));

          allVehicles.push(...inputs);
        }

        if (i + batchSize < rawData.length) {
          await delay(1000);
        }
      }

      setState(prev => ({
        ...prev,
        isParsing: false,
        vehicles: allVehicles,
      }));

      toast.success(`${allVehicles.length} voertuigen herkend door AI`);
    } catch (err) {
      console.error('Error analyzing with AI:', err);
      toast.error('Fout bij AI analyse');
      setState(prev => ({ ...prev, isParsing: false }));
    }
  }, [state.rawData, state.availableColumns]);

  // Add single vehicle manually
  const addSingleVehicle = useCallback((vehicle: VehicleInput) => {
    setState(prev => ({
      ...prev,
      vehicles: [...prev.vehicles, vehicle],
    }));
  }, []);

  // Fetch JP Cars window data for a single vehicle
  const fetchDealerData = async (vehicle: VehicleInput): Promise<DealerListing[]> => {
    const { data, error } = await supabase.functions.invoke('jpcars-lookup', {
      body: {
        make: vehicle.brand,
        model: vehicle.model,
        build: vehicle.buildYear,
        fuel: vehicle.fuelType,
        gear: vehicle.transmission === 'Automaat' ? 'Automaat' : 'Handgeschakeld',
        hp: vehicle.power || 120,
        body: vehicle.bodyType || '',
        mileage: 50000,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.success || !data?.data?.window) {
      return [];
    }

    const windowItems = data.data.window as JPCarsWindowItem[];

    // Convert to DealerListing format, filter only items with dealer info
    const dealers: DealerListing[] = windowItems
      .filter(item => item.dealer_name && item.price_local)
      .map(item => ({
        dealerName: item.dealer_name || 'Onbekend',
        price: item.price_local || 0,
        mileage: item.mileage || 0,
        daysInStock: item.days_in_stock || 0,
        soldSince: item.sold_since ?? null,
        url: item.url || '',
        buildYear: item.build,
      }))
      // Sort by most recently sold first
      .sort((a, b) => {
        if (a.soldSince === null && b.soldSince === null) return 0;
        if (a.soldSince === null) return 1;
        if (b.soldSince === null) return -1;
        return a.soldSince - b.soldSince;
      });

    return dealers;
  };

  // Calculate stats for a set of dealer listings
  const calculateStats = (dealers: DealerListing[]) => {
    if (dealers.length === 0) {
      return {
        avgPrice: 0,
        avgDaysInStock: 0,
        totalListings: 0,
        fastestSale: null,
      };
    }

    const avgPrice = Math.round(
      dealers.reduce((sum, d) => sum + d.price, 0) / dealers.length
    );

    const avgDaysInStock = Math.round(
      dealers.reduce((sum, d) => sum + d.daysInStock, 0) / dealers.length
    );

    const soldDealers = dealers.filter(d => d.soldSince !== null);
    const fastestSale = soldDealers.length > 0
      ? Math.min(...soldDealers.map(d => d.soldSince!))
      : null;

    return {
      avgPrice,
      avgDaysInStock,
      totalListings: dealers.length,
      fastestSale,
    };
  };

  // Start analysis for all vehicles
  const startAnalysis = useCallback(async () => {
    const { vehicles } = state;

    if (vehicles.length === 0) {
      toast.error('Voeg eerst voertuigen toe of upload een Excel bestand');
      return;
    }

    setState(prev => ({
      ...prev,
      isProcessing: true,
      progress: { current: 0, total: vehicles.length, currentVehicle: '' },
      results: vehicles.map(vehicle => ({
        vehicle,
        dealers: [],
        stats: { avgPrice: 0, avgDaysInStock: 0, totalListings: 0, fastestSale: null },
        status: 'pending' as const,
      })),
    }));

    const results: DealerAnalysisResult[] = [];

    for (let i = 0; i < vehicles.length; i++) {
      const vehicle = vehicles[i];

      setState(prev => ({
        ...prev,
        progress: {
          current: i + 1,
          total: vehicles.length,
          currentVehicle: `${vehicle.brand} ${vehicle.model}`,
        },
        results: prev.results.map((r, idx) =>
          idx === i ? { ...r, status: 'processing' as const } : r
        ),
      }));

      console.log(`🔍 [${i + 1}/${vehicles.length}] Analyzing: ${vehicle.brand} ${vehicle.model}`);

      try {
        const dealers = await withTimeout(
          fetchDealerData(vehicle),
          30000,
          `${vehicle.brand} ${vehicle.model}`
        );

        const stats = calculateStats(dealers);

        const result: DealerAnalysisResult = {
          vehicle,
          dealers,
          stats,
          status: 'completed',
        };

        results.push(result);

        setState(prev => ({
          ...prev,
          results: prev.results.map((r, idx) =>
            idx === i ? result : r
          ),
        }));

      } catch (err) {
        console.error(`❌ Error for ${vehicle.brand} ${vehicle.model}:`, err);

        const result: DealerAnalysisResult = {
          vehicle,
          dealers: [],
          stats: { avgPrice: 0, avgDaysInStock: 0, totalListings: 0, fastestSale: null },
          status: 'error',
          error: err instanceof Error ? err.message : 'Onbekende fout',
        };

        results.push(result);

        setState(prev => ({
          ...prev,
          results: prev.results.map((r, idx) =>
            idx === i ? result : r
          ),
        }));
      }

      // Delay between requests
      if (i < vehicles.length - 1) {
        await delay(500);
      }
    }

    setState(prev => ({ ...prev, isProcessing: false }));

    const successCount = results.filter(r => r.status === 'completed').length;
    const totalDealers = results.reduce((sum, r) => sum + r.dealers.length, 0);

    toast.success(`${successCount} voertuigen geanalyseerd, ${totalDealers} dealers gevonden`);
  }, [state.vehicles]);

  // Reset state
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    parseExcelFile,
    analyzeExcelWithAI,
    addSingleVehicle,
    startAnalysis,
    reset,
  };
};
