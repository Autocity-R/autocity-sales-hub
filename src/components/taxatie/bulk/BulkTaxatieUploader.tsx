import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, Check, AlertCircle, Bot, Building2, Sparkles } from 'lucide-react';
import type { ColumnMapping, DetectedSupplier, ParsedVehicle } from '@/types/bulkTaxatie';

interface BulkTaxatieUploaderProps {
  isUploading: boolean;
  isParsing: boolean;
  availableColumns: string[];
  columnMapping: ColumnMapping;
  rawDataCount: number;
  detectedSupplier: DetectedSupplier | null;
  parsedVehicles: ParsedVehicle[];
  filename: string;
  onFileUpload: (file: File) => void;
  onColumnMappingChange: (field: keyof ColumnMapping, column: string | null) => void;
  onParseDescriptions: () => void;
  onStartProcessing: () => void;
}

const REQUIRED_FIELDS: (keyof ColumnMapping)[] = ['brand', 'model', 'buildYear', 'mileage'];
const OPTIONAL_FIELDS: (keyof ColumnMapping)[] = ['fuelType', 'transmission', 'askingPrice', 'supplierName', 'color', 'power'];

const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  brand: 'Merk',
  model: 'Model',
  buildYear: 'Bouwjaar',
  mileage: 'Kilometerstand',
  fuelType: 'Brandstof',
  transmission: 'Transmissie',
  askingPrice: 'Vraagprijs',
  supplierName: 'Leverancier',
  color: 'Kleur',
  power: 'Vermogen (PK)',
  combinedDescription: 'Gecombineerde beschrijving',
};

export const BulkTaxatieUploader = ({
  isUploading,
  isParsing,
  availableColumns,
  columnMapping,
  rawDataCount,
  detectedSupplier,
  parsedVehicles,
  filename,
  onFileUpload,
  onColumnMappingChange,
  onParseDescriptions,
  onStartProcessing,
}: BulkTaxatieUploaderProps) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles[0]);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  const hasParsedData = parsedVehicles.length > 0;
  const useCombinedDescription = !!columnMapping.combinedDescription;
  
  // If using parsed data, only mileage is required
  const requiredMapped = hasParsedData 
    ? !!columnMapping.mileage
    : REQUIRED_FIELDS.every(f => columnMapping[f]);
  
  const mappedCount = Object.values(columnMapping).filter(Boolean).length;
  const highConfidenceCount = parsedVehicles.filter(p => p.confidence >= 0.7).length;
  const lowConfidenceCount = parsedVehicles.filter(p => p.confidence < 0.5).length;

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel Bestand Uploaden
          </CardTitle>
          <CardDescription>
            Upload een Excel bestand met voertuiggegevens van je leverancier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-primary font-medium">Drop het bestand hier...</p>
            ) : (
              <>
                <p className="text-muted-foreground mb-2">
                  Sleep een Excel bestand hierheen of klik om te selecteren
                </p>
                <p className="text-sm text-muted-foreground/70">
                  Ondersteunde formaten: .xlsx, .xls, .csv
                </p>
              </>
            )}
          </div>

          {rawDataCount > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-green-600 font-medium">
                  {rawDataCount} voertuigen gevonden in "{filename}"
                </span>
              </div>
              
              {detectedSupplier && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  <span className="text-blue-600 font-medium">
                    Leverancier herkend: {detectedSupplier.name}
                  </span>
                  {detectedSupplier.requiresAIParsing && (
                    <Badge variant="outline" className="text-xs">
                      <Bot className="h-3 w-3 mr-1" />
                      AI parsing aanbevolen
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Column Mapping */}
      {availableColumns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Kolom Mapping</CardTitle>
            <CardDescription>
              Koppel de kolommen uit je Excel aan de juiste velden, of gebruik AI parsing voor gecombineerde beschrijvingen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* AI Parsing Option */}
            <div className="bg-muted/50 rounded-lg p-4 border">
              <div className="flex items-start gap-3">
                <Bot className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium mb-2">AI Voertuigherkenning</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Als je leverancier alle voertuiginfo in één kolom heeft (bijv. "BMW 320i Touring 2020 Benzine"), 
                    kan AI deze automatisch splitsen.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <Label className="text-sm mb-1.5 block">Kolom met voertuigbeschrijving</Label>
                      <Select
                        value={columnMapping.combinedDescription || 'none'}
                        onValueChange={val => onColumnMappingChange('combinedDescription', val === 'none' ? null : val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer kolom" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Niet gebruiken --</SelectItem>
                          {availableColumns.map(col => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-end">
                      <Button
                        onClick={onParseDescriptions}
                        disabled={!columnMapping.combinedDescription || isParsing}
                        variant="secondary"
                      >
                        {isParsing ? (
                          <>
                            <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                            Parsing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Parse met AI
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Parsed Results Summary */}
                  {hasParsedData && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="default" className="bg-green-500">
                        {highConfidenceCount} hoge betrouwbaarheid
                      </Badge>
                      {parsedVehicles.length - highConfidenceCount - lowConfidenceCount > 0 && (
                        <Badge variant="secondary">
                          {parsedVehicles.length - highConfidenceCount - lowConfidenceCount} gemiddeld
                        </Badge>
                      )}
                      {lowConfidenceCount > 0 && (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          {lowConfidenceCount} lage betrouwbaarheid
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            {!hasParsedData && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">of handmatig mappen</span>
                </div>
              </div>
            )}

            {/* Required Fields - Hide if using parsed data */}
            {!hasParsedData && (
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Verplichte velden
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {REQUIRED_FIELDS.map(field => (
                    <div key={field} className="space-y-2">
                      <Label className="text-sm">
                        {FIELD_LABELS[field]}
                        <span className="text-destructive ml-1">*</span>
                      </Label>
                      <Select
                        value={columnMapping[field] || 'none'}
                        onValueChange={val => onColumnMappingChange(field, val === 'none' ? null : val)}
                      >
                        <SelectTrigger className={!columnMapping[field] ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Selecteer kolom" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Geen --</SelectItem>
                          {availableColumns.map(col => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mileage (always required, even with parsed data) */}
            {hasParsedData && (
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Verplicht veld (niet uit beschrijving te halen)
                </h4>
                <div className="max-w-xs">
                  <Label className="text-sm">
                    Kilometerstand
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Select
                    value={columnMapping.mileage || 'none'}
                    onValueChange={val => onColumnMappingChange('mileage', val === 'none' ? null : val)}
                  >
                    <SelectTrigger className={!columnMapping.mileage ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Selecteer kolom" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Geen --</SelectItem>
                      {availableColumns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Optional Fields */}
            <div>
              <h4 className="font-medium mb-3">Optionele velden</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {OPTIONAL_FIELDS.map(field => (
                  <div key={field} className="space-y-2">
                    <Label className="text-sm">{FIELD_LABELS[field]}</Label>
                    <Select
                      value={columnMapping[field] || 'none'}
                      onValueChange={val => onColumnMappingChange(field, val === 'none' ? null : val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Geen --</SelectItem>
                        {availableColumns.map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Status & Start */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={requiredMapped ? 'default' : 'secondary'}>
                  {hasParsedData ? `${parsedVehicles.length} geparseerd` : `${mappedCount} velden gekoppeld`}
                </Badge>
                {!requiredMapped && !hasParsedData && (
                  <span className="text-sm text-destructive">
                    Koppel alle verplichte velden of gebruik AI parsing
                  </span>
                )}
                {!requiredMapped && hasParsedData && (
                  <span className="text-sm text-destructive">
                    Koppel de kilometerstand kolom
                  </span>
                )}
              </div>
              <Button
                onClick={onStartProcessing}
                disabled={!requiredMapped || rawDataCount === 0 || isParsing}
                size="lg"
              >
                Start Bulk Taxatie ({rawDataCount} auto's)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
