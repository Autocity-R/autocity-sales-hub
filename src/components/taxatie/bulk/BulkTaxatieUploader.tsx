import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import type { ColumnMapping } from '@/types/bulkTaxatie';

interface BulkTaxatieUploaderProps {
  isUploading: boolean;
  availableColumns: string[];
  columnMapping: ColumnMapping;
  rawDataCount: number;
  onFileUpload: (file: File) => void;
  onColumnMappingChange: (field: keyof ColumnMapping, column: string | null) => void;
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
};

export const BulkTaxatieUploader = ({
  isUploading,
  availableColumns,
  columnMapping,
  rawDataCount,
  onFileUpload,
  onColumnMappingChange,
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

  const requiredMapped = REQUIRED_FIELDS.every(f => columnMapping[f]);
  const mappedCount = Object.values(columnMapping).filter(Boolean).length;

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
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-green-600 font-medium">
                {rawDataCount} voertuigen gevonden
              </span>
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
              Koppel de kolommen uit je Excel aan de juiste velden
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Required Fields */}
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
              <div className="flex items-center gap-2">
                <Badge variant={requiredMapped ? 'default' : 'secondary'}>
                  {mappedCount} van {Object.keys(columnMapping).length} velden gekoppeld
                </Badge>
                {!requiredMapped && (
                  <span className="text-sm text-destructive">
                    Koppel alle verplichte velden om te starten
                  </span>
                )}
              </div>
              <Button
                onClick={onStartProcessing}
                disabled={!requiredMapped || rawDataCount === 0}
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
