import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import type { BulkTaxatieInput, BulkTaxatieResult, BulkTaxatieState } from '@/types/bulkTaxatie';
import type { TaxatieVehicleData } from '@/types/taxatie';
import {
  fetchJPCarsData,
  fetchPortalAnalysis,
  fetchInternalComparison,
  generateAIAdvice,
  saveTaxatieValuation,
} from '@/services/taxatieService';
import { supabase } from '@/integrations/supabase/client';

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
  askingPrice: number | null;
  color: string | null;
  confidence: number;
  originalData: string;
}

const initialState: BulkTaxatieState = {
  isUploading: false,
  isProcessing: false,
  isParsing: false,
  progress: { current: 0, total: 0, currentVehicle: '' },
  rawData: [],
  columnMapping: {
    brand: null,
    model: null,
    buildYear: null,
    mileage: null,
    fuelType: null,
    transmission: null,
    askingPrice: null,
    supplierName: null,
    color: null,
    power: null,
    combinedDescription: null,
  },
  availableColumns: [],
  inputs: [],
  results: [],
  detectedSupplier: null,
  parsedVehicles: [],
  filename: '',
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useBulkTaxatie = () => {
  const [state, setState] = useState<BulkTaxatieState>(initialState);

  // Find the real header row by looking for common column keywords
  const findHeaderRow = (sheetAsArray: unknown[][]): number => {
    const headerKeywords = [
      'position', 'mileage', 'commercial', 'registration', 'brand', 'model', 
      'km', 'year', 'bouwjaar', 'kilometerstand', 'merk', 'kenteken', 
      'prijs', 'price', 'fuel', 'brandstof', 'transmission', 'owner'
    ];

    for (let i = 0; i < Math.min(20, sheetAsArray.length); i++) {
      const row = sheetAsArray[i];
      if (!row || !Array.isArray(row) || row.length === 0) continue;

      // Convert row to lowercase string for keyword matching
      const rowText = row
        .map(cell => String(cell || '').toLowerCase())
        .join(' ');

      // Count how many keywords match
      const matchCount = headerKeywords.filter(kw => rowText.includes(kw)).length;

      // If we find 2+ keywords, this is likely the header row
      if (matchCount >= 2) {
        console.log(`✅ Header rij gevonden op rij ${i + 1}: "${row.slice(0, 4).join(', ')}..."`);
        return i;
      }
    }

    // Fallback: look for a row with many filled columns (likely the header)
    for (let i = 0; i < Math.min(10, sheetAsArray.length); i++) {
      const row = sheetAsArray[i];
      if (!row || !Array.isArray(row)) continue;
      
      const filledCells = row.filter(cell => cell && String(cell).trim() !== '').length;
      if (filledCells >= 5) {
        console.log(`📋 Fallback: Header rij op ${i + 1} met ${filledCells} gevulde kolommen`);
        return i;
      }
    }

    return 0; // Default to first row
  };

  // Parse Excel file with smart header detection
  const parseExcelFile = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, isUploading: true, filename: file.name }));
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // First, read as array to detect header row
      const sheetAsArray = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
      
      if (sheetAsArray.length === 0) {
        throw new Error('Excel bestand is leeg');
      }

      // Find the real header row
      const headerRowIndex = findHeaderRow(sheetAsArray);
      console.log(`📊 Excel parsing met header op rij ${headerRowIndex + 1}`);

      // Now parse with the correct header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        range: headerRowIndex,
        defval: '',
        raw: false,
      }) as Record<string, unknown>[];

      if (jsonData.length === 0) {
        throw new Error('Geen data gevonden na header rij');
      }

      // Get columns and filter out __EMPTY ones
      let columns = Object.keys(jsonData[0]);
      const realColumns = columns.filter(c => !c.startsWith('__EMPTY'));

      console.log(`📋 Kolommen gevonden: ${realColumns.length > 0 ? realColumns.join(', ') : columns.join(', ')}`);

      // If all columns are __EMPTY, combine all values into description
      let processedData = jsonData;
      let finalColumns = realColumns.length > 0 ? realColumns : columns;

      if (realColumns.length < 3) {
        console.log(`⚠️ Weinig bruikbare kolommen, combineer alle data tot beschrijving`);
        processedData = jsonData.map((row, idx) => ({
          rowIndex: idx,
          combinedDescription: Object.values(row)
            .filter(v => v && String(v).trim() !== '')
            .join(' | '),
        }));
        finalColumns = ['rowIndex', 'combinedDescription'];
      }

      // Filter rows that have actual data (at least 2 non-empty values)
      const validData = processedData.filter(row => {
        const values = Object.values(row).filter(v => v && String(v).trim() !== '');
        return values.length >= 2;
      });

      console.log(`✅ ${validData.length} data rijen geïmporteerd (van ${jsonData.length} totaal)`);

      setState(prev => ({
        ...prev,
        isUploading: false,
        rawData: validData,
        availableColumns: finalColumns,
        inputs: [],
        results: [],
        parsedVehicles: [],
      }));

      toast.success(`${validData.length} rijen geïmporteerd uit "${file.name}"`);
    } catch (err) {
      console.error('Excel parse error:', err);
      toast.error('Fout bij het lezen van Excel bestand');
      setState(prev => ({ ...prev, isUploading: false }));
    }
  }, []);

  // Analyze Excel with AI Expert
  const analyzeExcelWithAI = useCallback(async () => {
    const { rawData, availableColumns } = state;
    
    if (rawData.length === 0) {
      toast.error('Upload eerst een Excel bestand');
      return;
    }

    setState(prev => ({ ...prev, isParsing: true }));

    try {
      // Process in batches of 100 rows
      const batchSize = 100;
      const allVehicles: BulkTaxatieInput[] = [];

      for (let i = 0; i < rawData.length; i += batchSize) {
        const batch = rawData.slice(i, i + batchSize);
        
        console.log(`📊 Analyzing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(rawData.length / batchSize)}`);

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
          
          // Convert AI response to BulkTaxatieInput format
          const inputs = vehicles.map((v): BulkTaxatieInput => ({
            rowIndex: i + v.rowIndex + 1,
            brand: v.make,
            model: v.model,
            buildYear: v.buildYear,
            mileage: v.mileage,
            fuelType: v.fuelType,
            transmission: v.transmission,
            askingPrice: v.askingPrice || undefined,
            color: v.color || undefined,
            power: v.power || undefined,
            variant: v.variant || undefined,
            bodyType: v.bodyType || undefined,
            originalDescription: v.originalData,
            parseConfidence: v.confidence,
          }));

          allVehicles.push(...inputs);
        }

        // Delay between batches
        if (i + batchSize < rawData.length) {
          await delay(1000);
        }
      }

      setState(prev => ({
        ...prev,
        isParsing: false,
        inputs: allVehicles,
      }));

      const highConfidence = allVehicles.filter(v => (v.parseConfidence || 0) >= 0.7).length;
      toast.success(`${allVehicles.length} voertuigen herkend (${highConfidence} met hoge betrouwbaarheid)`);

    } catch (err) {
      console.error('Error analyzing with AI:', err);
      toast.error('Fout bij AI analyse');
      setState(prev => ({ ...prev, isParsing: false }));
    }
  }, [state.rawData, state.availableColumns]);

  // Process single vehicle
  const processSingleVehicle = async (input: BulkTaxatieInput): Promise<BulkTaxatieResult> => {
    const vehicleData: TaxatieVehicleData = {
      brand: input.brand,
      model: input.model,
      buildYear: input.buildYear,
      mileage: input.mileage,
      fuelType: input.fuelType || 'Benzine',
      transmission: (input.transmission?.toLowerCase().includes('auto') ? 'Automaat' : 
                    input.transmission?.toLowerCase().includes('hand') ? 'Handgeschakeld' : 'Onbekend') as 'Automaat' | 'Handgeschakeld' | 'Onbekend',
      bodyType: input.bodyType || '',
      power: input.power || 0,
      trim: input.variant || '',
      color: input.color || '',
      options: [],
      keywords: [],
    };

    try {
      const jpCarsData = await fetchJPCarsData('', vehicleData);
      await delay(500);
      
      const portalAnalysis = await fetchPortalAnalysis(
        vehicleData,
        jpCarsData?.portalUrls,
        jpCarsData?.window
      );
      await delay(300);
      
      const internalComparison = await fetchInternalComparison(vehicleData);
      await delay(300);
      
      const aiAdvice = await generateAIAdvice(
        vehicleData,
        portalAnalysis,
        jpCarsData,
        internalComparison
      );

      const saved = await saveTaxatieValuation({
        vehicleData,
        portalAnalysis,
        jpCarsData,
        internalComparison,
        aiAdvice,
        status: 'voltooid',
      });

      return {
        input,
        vehicleData,
        jpCarsData,
        portalAnalysis,
        internalComparison,
        aiAdvice,
        status: 'completed',
        savedValuationId: saved?.id,
      };
    } catch (err) {
      console.error(`Error processing ${input.brand} ${input.model}:`, err);
      return {
        input,
        vehicleData,
        jpCarsData: null,
        portalAnalysis: null,
        internalComparison: null,
        aiAdvice: null,
        status: 'error',
        error: err instanceof Error ? err.message : 'Onbekende fout',
      };
    }
  };

  // Start bulk processing
  const startBulkProcessing = useCallback(async () => {
    const { inputs } = state;
    
    if (inputs.length === 0) {
      toast.error('Analyseer eerst de Excel data met AI');
      return;
    }

    setState(prev => ({
      ...prev,
      isProcessing: true,
      progress: { current: 0, total: inputs.length, currentVehicle: '' },
      results: inputs.map(input => ({
        input,
        vehicleData: {} as TaxatieVehicleData,
        jpCarsData: null,
        portalAnalysis: null,
        internalComparison: null,
        aiAdvice: null,
        status: 'pending' as const,
      })),
    }));

    const results: BulkTaxatieResult[] = [];

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      
      setState(prev => ({
        ...prev,
        progress: {
          current: i + 1,
          total: inputs.length,
          currentVehicle: `${input.brand} ${input.model}`,
        },
      }));

      const result = await processSingleVehicle(input);
      results.push(result);

      setState(prev => ({
        ...prev,
        results: prev.results.map((r, idx) => 
          idx === i ? result : r
        ),
      }));

      if (i < inputs.length - 1) {
        await delay(1500);
      }
    }

    setState(prev => ({
      ...prev,
      isProcessing: false,
      results,
    }));

    const successCount = results.filter(r => r.status === 'completed').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    toast.success(`Bulk taxatie voltooid: ${successCount} succesvol, ${errorCount} mislukt`);
  }, [state.inputs]);

  // Reset state
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    parseExcelFile,
    analyzeExcelWithAI,
    startBulkProcessing,
    reset,
  };
};
