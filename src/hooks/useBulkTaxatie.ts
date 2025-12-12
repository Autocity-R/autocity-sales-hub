import { useState, useCallback, useRef } from 'react';
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
  fetchRecentFeedback,
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

// Feedback context type for bulk processing
interface FeedbackContext {
  feedback_type: string;
  notes: string | null;
  vehicle_brand: string;
  vehicle_model: string;
  ai_recommendation: string;
  ai_purchase_price: number;
  ai_selling_price: number;
  actual_outcome: Record<string, unknown> | null;
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

// Timeout wrapper for promises
const withTimeout = <T>(promise: Promise<T>, ms: number, operation: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout na ${ms / 1000}s bij ${operation}`)), ms)
    ),
  ]);
};

// Retry wrapper for API calls
const withRetry = async <T>(
  fn: () => Promise<T>,
  retries: number,
  delayMs: number,
  operation: string
): Promise<T> => {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`⚠️ ${operation} poging ${attempt + 1}/${retries + 1} mislukt:`, lastError.message);
      if (attempt < retries) {
        await delay(delayMs);
      }
    }
  }
  throw lastError;
};

export const useBulkTaxatie = () => {
  const [state, setState] = useState<BulkTaxatieState>(initialState);
  const feedbackCacheRef = useRef<FeedbackContext[] | null>(null);

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

      // Clear feedback cache when new file is uploaded
      feedbackCacheRef.current = null;

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
      // Process in batches of 150 rows (Gemini can handle this within timeout)
      const batchSize = 150;
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

  // Process single vehicle with timeouts and cached feedback
  const processSingleVehicle = async (
    input: BulkTaxatieInput,
    feedbackContext: FeedbackContext[]
  ): Promise<BulkTaxatieResult> => {
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
      // JP Cars with 30s timeout and 2 retries
      const jpCarsData = await withRetry(
        () => withTimeout(fetchJPCarsData('', vehicleData), 30000, 'JP Cars'),
        2, 2000, 'JP Cars'
      );
      await delay(300);
      
      // Portal analysis with 45s timeout and 2 retries
      const portalAnalysis = await withRetry(
        () => withTimeout(
          fetchPortalAnalysis(vehicleData, jpCarsData?.portalUrls, jpCarsData?.window),
          45000, 'Portal analyse'
        ),
        2, 2000, 'Portal analyse'
      );
      await delay(200);
      
      // Internal comparison with 15s timeout and 1 retry
      const internalComparison = await withRetry(
        () => withTimeout(fetchInternalComparison(vehicleData), 15000, 'Interne vergelijking'),
        1, 1000, 'Interne vergelijking'
      );
      await delay(200);
      
      // AI advice with 60s timeout and 2 retries (uses cached feedback)
      const aiAdvice = await withRetry(
        () => withTimeout(
          generateAIAdviceWithFeedback(vehicleData, portalAnalysis, jpCarsData, internalComparison, feedbackContext),
          60000, 'AI advies'
        ),
        2, 3000, 'AI advies'
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
      console.error(`❌ Error processing ${input.brand} ${input.model}:`, err);
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

  // Generate AI advice with pre-fetched feedback (no additional fetch per vehicle)
  const generateAIAdviceWithFeedback = async (
    vehicleData: TaxatieVehicleData,
    portalAnalysis: any,
    jpCarsData: any,
    internalComparison: any,
    feedbackContext: FeedbackContext[]
  ) => {
    const { data, error } = await supabase.functions.invoke('taxatie-ai-advice', {
      body: {
        vehicleData,
        portalAnalysis,
        jpCarsData,
        internalComparison,
        feedbackHistory: feedbackContext,
      }
    });

    if (error) {
      throw new Error(error.message || 'AI advice failed');
    }

    if (!data?.success || !data?.advice) {
      throw new Error(data?.error || 'Invalid AI response');
    }

    return data.advice;
  };

  // Start bulk processing with robust error handling
  const startBulkProcessing = useCallback(async () => {
    const { inputs } = state;
    
    if (inputs.length === 0) {
      toast.error('Analyseer eerst de Excel data met AI');
      return;
    }

    // Fetch feedback ONCE at the start
    console.log('📚 Fetching feedback context (eenmalig)...');
    let feedbackContext: FeedbackContext[] = [];
    try {
      if (feedbackCacheRef.current) {
        feedbackContext = feedbackCacheRef.current;
        console.log(`📋 Gebruikte gecachte feedback: ${feedbackContext.length} items`);
      } else {
        feedbackContext = await withTimeout(fetchRecentFeedback(30), 10000, 'Feedback ophalen');
        feedbackCacheRef.current = feedbackContext;
        console.log(`✅ Feedback opgehaald: ${feedbackContext.length} items`);
      }
    } catch (err) {
      console.warn('⚠️ Feedback ophalen mislukt, doorgaan zonder:', err);
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
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      
      // Update progress with "processing" status
      setState(prev => ({
        ...prev,
        progress: {
          current: i + 1,
          total: inputs.length,
          currentVehicle: `${input.brand} ${input.model}`,
        },
        results: prev.results.map((r, idx) => 
          idx === i ? { ...r, status: 'processing' as const } : r
        ),
      }));

      console.log(`🚗 [${i + 1}/${inputs.length}] Processing: ${input.brand} ${input.model}`);

      // Process with full error isolation
      let result: BulkTaxatieResult;
      try {
        result = await processSingleVehicle(input, feedbackContext);
      } catch (err) {
        console.error(`❌ Unhandled error for ${input.brand} ${input.model}:`, err);
        result = {
          input,
          vehicleData: {} as TaxatieVehicleData,
          jpCarsData: null,
          portalAnalysis: null,
          internalComparison: null,
          aiAdvice: null,
          status: 'error',
          error: err instanceof Error ? err.message : 'Onbekende fout',
        };
      }

      results.push(result);
      
      if (result.status === 'completed') {
        successCount++;
      } else {
        errorCount++;
      }

      // Update result in state
      setState(prev => ({
        ...prev,
        results: prev.results.map((r, idx) => 
          idx === i ? result : r
        ),
      }));

      // Delay between vehicles (shorter since we have timeouts now)
      if (i < inputs.length - 1) {
        await delay(1000);
      }
    }

    setState(prev => ({
      ...prev,
      isProcessing: false,
      results,
    }));

    console.log(`✅ Bulk processing voltooid: ${successCount} succesvol, ${errorCount} mislukt`);
    toast.success(`Bulk taxatie voltooid: ${successCount} succesvol, ${errorCount} mislukt`);
  }, [state.inputs]);

  // Reset state
  const reset = useCallback(() => {
    feedbackCacheRef.current = null;
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
