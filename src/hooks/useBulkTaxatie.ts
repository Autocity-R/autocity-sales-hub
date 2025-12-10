import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import type { BulkTaxatieInput, BulkTaxatieResult, ColumnMapping, BulkTaxatieState, ParsedVehicle } from '@/types/bulkTaxatie';
import type { TaxatieVehicleData } from '@/types/taxatie';
import {
  fetchJPCarsData,
  fetchPortalAnalysis,
  fetchInternalComparison,
  generateAIAdvice,
  saveTaxatieValuation,
} from '@/services/taxatieService';
import { detectSupplier, findColumnForField, type SupplierTemplate } from '@/config/supplierTemplates';
import { supabase } from '@/integrations/supabase/client';

const initialColumnMapping: ColumnMapping = {
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
};

const initialState: BulkTaxatieState = {
  isUploading: false,
  isProcessing: false,
  isParsing: false,
  progress: { current: 0, total: 0, currentVehicle: '' },
  rawData: [],
  columnMapping: initialColumnMapping,
  availableColumns: [],
  inputs: [],
  results: [],
  detectedSupplier: null,
  parsedVehicles: [],
  filename: '',
};

// Rate limiter - max 2 concurrent requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useBulkTaxatie = () => {
  const [state, setState] = useState<BulkTaxatieState>(initialState);

  // Parse Excel file with supplier detection
  const parseExcelFile = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, isUploading: true, filename: file.name }));
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

      if (jsonData.length === 0) {
        throw new Error('Excel bestand is leeg');
      }

      // Get column names from first row
      const columns = Object.keys(jsonData[0]);
      
      // Detect supplier from filename and columns
      const supplier = detectSupplier(file.name, columns);
      
      // Auto-detect column mappings (with supplier hints if available)
      const autoMapping = autoDetectColumns(columns, supplier);

      setState(prev => ({
        ...prev,
        isUploading: false,
        rawData: jsonData,
        availableColumns: columns,
        columnMapping: autoMapping,
        detectedSupplier: supplier ? {
          id: supplier.id,
          name: supplier.name,
          requiresAIParsing: supplier.requiresAIParsing,
        } : null,
        parsedVehicles: [],
      }));

      if (supplier) {
        toast.success(`${jsonData.length} rijen geïmporteerd - Leverancier herkend: ${supplier.name}`);
      } else {
        toast.success(`${jsonData.length} rijen geïmporteerd`);
      }
    } catch (err) {
      console.error('Excel parse error:', err);
      toast.error('Fout bij het lezen van Excel bestand');
      setState(prev => ({ ...prev, isUploading: false }));
    }
  }, []);

  // Auto-detect column mappings based on common names and supplier hints
  const autoDetectColumns = (columns: string[], supplier: SupplierTemplate | null): ColumnMapping => {
    const mapping: ColumnMapping = { ...initialColumnMapping };
    const lowerColumns = columns.map(c => c.toLowerCase());

    const patterns: Record<keyof ColumnMapping, string[]> = {
      brand: ['merk', 'brand', 'make', 'fabrikant'],
      model: ['model', 'type', 'uitvoering'],
      buildYear: ['bouwjaar', 'jaar', 'build', 'year', 'bj'],
      mileage: ['km', 'kilometerstand', 'mileage', 'kilometers', 'km stand', 'odometer'],
      fuelType: ['brandstof', 'fuel', 'motor'],
      transmission: ['transmissie', 'versnelling', 'transmission', 'bak'],
      askingPrice: ['prijs', 'vraagprijs', 'price', 'bedrag', 'inkoopprijs', 'residual', 'value', 'restwaarde'],
      supplierName: ['leverancier', 'supplier', 'verkoper', 'dealer'],
      color: ['kleur', 'color', 'colour'],
      power: ['pk', 'vermogen', 'power', 'hp', 'kw'],
      combinedDescription: ['vehicle', 'description', 'omschrijving', 'asset', 'voertuig', 'auto'],
    };

    // Apply supplier-specific hints first
    if (supplier?.columnHints) {
      for (const [field, hints] of Object.entries(supplier.columnHints)) {
        if (hints) {
          const foundCol = findColumnForField(columns, hints);
          if (foundCol) {
            mapping[field as keyof ColumnMapping] = foundCol;
          }
        }
      }
    }

    // Fill in remaining fields with generic patterns
    for (const [field, searchTerms] of Object.entries(patterns)) {
      if (mapping[field as keyof ColumnMapping]) continue; // Already mapped by supplier hints
      
      const matchIndex = lowerColumns.findIndex(col => 
        searchTerms.some(term => col.includes(term))
      );
      if (matchIndex !== -1) {
        mapping[field as keyof ColumnMapping] = columns[matchIndex];
      }
    }

    return mapping;
  };

  // Update column mapping
  const updateColumnMapping = useCallback((field: keyof ColumnMapping, column: string | null) => {
    setState(prev => ({
      ...prev,
      columnMapping: { ...prev.columnMapping, [field]: column },
      // Clear parsed vehicles if changing combined description
      parsedVehicles: field === 'combinedDescription' ? [] : prev.parsedVehicles,
    }));
  }, []);

  // Parse vehicle descriptions with AI
  const parseVehicleDescriptions = useCallback(async () => {
    const { rawData, columnMapping } = state;
    
    if (!columnMapping.combinedDescription) {
      toast.error('Selecteer eerst een kolom met voertuigbeschrijvingen');
      return;
    }

    setState(prev => ({ ...prev, isParsing: true }));

    try {
      // Extract descriptions from raw data
      const descriptions = rawData
        .map(row => String(row[columnMapping.combinedDescription!] || '').trim())
        .filter(d => d.length > 0);

      if (descriptions.length === 0) {
        throw new Error('Geen beschrijvingen gevonden');
      }

      // Process in batches of 20
      const batchSize = 20;
      const allParsed: ParsedVehicle[] = [];

      for (let i = 0; i < descriptions.length; i += batchSize) {
        const batch = descriptions.slice(i, i + batchSize);
        
        const { data, error } = await supabase.functions.invoke('parse-vehicle-description', {
          body: { descriptions: batch },
        });

        if (error) {
          console.error('Parse error:', error);
          // Continue with empty results for this batch
          allParsed.push(...batch.map(desc => ({
            brand: null,
            model: null,
            variant: null,
            buildYear: null,
            fuelType: null,
            transmission: null,
            bodyType: null,
            power: null,
            confidence: 0,
            originalDescription: desc,
          })));
        } else if (data?.results) {
          allParsed.push(...data.results);
        }

        // Small delay between batches
        if (i + batchSize < descriptions.length) {
          await delay(500);
        }
      }

      setState(prev => ({
        ...prev,
        isParsing: false,
        parsedVehicles: allParsed,
      }));

      const highConfidence = allParsed.filter(p => p.confidence >= 0.7).length;
      toast.success(`${allParsed.length} beschrijvingen geparseerd (${highConfidence} met hoge betrouwbaarheid)`);

    } catch (err) {
      console.error('Error parsing descriptions:', err);
      toast.error('Fout bij het parsen van beschrijvingen');
      setState(prev => ({ ...prev, isParsing: false }));
    }
  }, [state.rawData, state.columnMapping]);

  // Convert raw data to inputs based on mapping (with parsed data if available)
  const prepareInputs = useCallback((): BulkTaxatieInput[] => {
    const { rawData, columnMapping, parsedVehicles } = state;
    const useParsedData = parsedVehicles.length > 0 && columnMapping.combinedDescription;
    
    // If using parsed data, don't require brand/model columns
    if (!useParsedData && (!columnMapping.brand || !columnMapping.model || !columnMapping.buildYear || !columnMapping.mileage)) {
      toast.error('Map minimaal Merk, Model, Bouwjaar en KM (of gebruik AI parsing)');
      return [];
    }

    if (useParsedData && !columnMapping.mileage) {
      toast.error('Map minimaal de Kilometerstand kolom');
      return [];
    }

    const inputs: BulkTaxatieInput[] = rawData.map((row, index) => {
      const parsed = useParsedData ? parsedVehicles[index] : null;
      
      return {
        rowIndex: index + 1,
        brand: parsed?.brand || (columnMapping.brand ? String(row[columnMapping.brand] || '').trim() : ''),
        model: parsed?.model || (columnMapping.model ? String(row[columnMapping.model] || '').trim() : ''),
        buildYear: parsed?.buildYear || (columnMapping.buildYear ? parseInt(String(row[columnMapping.buildYear])) : 0) || 0,
        mileage: parseInt(String(row[columnMapping.mileage!]).replace(/\D/g, '')) || 0,
        fuelType: parsed?.fuelType || (columnMapping.fuelType ? String(row[columnMapping.fuelType] || '').trim() : undefined),
        transmission: parsed?.transmission || (columnMapping.transmission ? String(row[columnMapping.transmission] || '').trim() : undefined),
        askingPrice: columnMapping.askingPrice ? parseInt(String(row[columnMapping.askingPrice]).replace(/\D/g, '')) : undefined,
        supplierName: columnMapping.supplierName ? String(row[columnMapping.supplierName] || '').trim() : undefined,
        color: columnMapping.color ? String(row[columnMapping.color] || '').trim() : undefined,
        power: parsed?.power || (columnMapping.power ? parseInt(String(row[columnMapping.power]).replace(/\D/g, '')) : undefined),
        variant: parsed?.variant || undefined,
        bodyType: parsed?.bodyType || undefined,
        originalDescription: parsed?.originalDescription,
        parseConfidence: parsed?.confidence,
      };
    }).filter(input => 
      input.brand && 
      input.model && 
      input.buildYear > 1990 && 
      input.mileage > 0
    );

    setState(prev => ({ ...prev, inputs }));
    return inputs;
  }, [state.rawData, state.columnMapping, state.parsedVehicles]);

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
      // Fetch JP Cars data (primary source for APR/ETR)
      const jpCarsData = await fetchJPCarsData('', vehicleData);
      
      // Wait between API calls
      await delay(500);
      
      // Fetch portal analysis
      const portalAnalysis = await fetchPortalAnalysis(
        vehicleData,
        jpCarsData?.portalUrls,
        jpCarsData?.window
      );
      
      await delay(300);
      
      // Fetch internal comparison
      const internalComparison = await fetchInternalComparison(vehicleData);
      
      await delay(300);
      
      // Generate AI advice
      const aiAdvice = await generateAIAdvice(
        vehicleData,
        portalAnalysis,
        jpCarsData,
        internalComparison
      );

      // Save to database
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
    const inputs = prepareInputs();
    if (inputs.length === 0) return;

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

      // Process vehicle
      const result = await processSingleVehicle(input);
      results.push(result);

      // Update results in state
      setState(prev => ({
        ...prev,
        results: prev.results.map((r, idx) => 
          idx === i ? result : r
        ),
      }));

      // Rate limiting delay between vehicles
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
  }, [prepareInputs]);

  // Reset state
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    parseExcelFile,
    updateColumnMapping,
    parseVehicleDescriptions,
    prepareInputs,
    startBulkProcessing,
    reset,
  };
};
