import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, Check, Bot, Sparkles, Car } from 'lucide-react';
import type { BulkTaxatieInput } from '@/types/bulkTaxatie';

interface BulkTaxatieUploaderProps {
  isUploading: boolean;
  isParsing: boolean;
  rawDataCount: number;
  inputs: BulkTaxatieInput[];
  filename: string;
  onFileUpload: (file: File) => void;
  onAnalyzeWithAI: () => void;
  onStartProcessing: () => void;
}

export const BulkTaxatieUploader = ({
  isUploading,
  isParsing,
  rawDataCount,
  inputs,
  filename,
  onFileUpload,
  onAnalyzeWithAI,
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
    disabled: isUploading || isParsing,
  });

  const hasAnalyzedData = inputs.length > 0;
  const highConfidenceCount = inputs.filter(v => (v.parseConfidence || 0) >= 0.7).length;
  const mediumConfidenceCount = inputs.filter(v => (v.parseConfidence || 0) >= 0.5 && (v.parseConfidence || 0) < 0.7).length;
  const lowConfidenceCount = inputs.filter(v => (v.parseConfidence || 0) < 0.5).length;

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
            Upload een Excel bestand van je leverancier - AI herkent automatisch alle voertuiggegevens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              ${isUploading || isParsing ? 'opacity-50 cursor-not-allowed' : ''}
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
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-green-600 font-medium">
                  {rawDataCount} rijen gevonden in "{filename}"
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Analysis Section */}
      {rawDataCount > 0 && !hasAnalyzedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Expert Analyse
            </CardTitle>
            <CardDescription>
              Onze AI Expert analyseert automatisch alle kolommen en herkent merken, modellen, bouwjaren, kilometerstanden en meer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-6 text-center">
              <Bot className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Klaar om te analyseren</h3>
              <p className="text-sm text-muted-foreground mb-4">
                De AI Expert kijkt naar alle {rawDataCount} rijen en herkent automatisch de voertuiggegevens, 
                ongeacht welke kolomnamen je leverancier gebruikt.
              </p>
              <Button
                onClick={onAnalyzeWithAI}
                disabled={isParsing}
                size="lg"
                className="min-w-[200px]"
              >
                {isParsing ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                    Analyseren...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyseer met AI Expert
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results Preview */}
      {hasAnalyzedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              AI Expert Resultaten
            </CardTitle>
            <CardDescription>
              {inputs.length} voertuigen succesvol herkend
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Confidence Summary */}
            <div className="flex flex-wrap gap-2">
              {highConfidenceCount > 0 && (
                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                  ✓ {highConfidenceCount} hoge betrouwbaarheid
                </Badge>
              )}
              {mediumConfidenceCount > 0 && (
                <Badge variant="secondary">
                  {mediumConfidenceCount} gemiddeld
                </Badge>
              )}
              {lowConfidenceCount > 0 && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  ⚠ {lowConfidenceCount} lage betrouwbaarheid
                </Badge>
              )}
            </div>

            {/* Preview Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">#</th>
                      <th className="text-left p-2 font-medium">Merk</th>
                      <th className="text-left p-2 font-medium">Model</th>
                      <th className="text-left p-2 font-medium">Bouwjaar</th>
                      <th className="text-left p-2 font-medium">KM</th>
                      <th className="text-left p-2 font-medium">Brandstof</th>
                      <th className="text-left p-2 font-medium">Transmissie</th>
                      <th className="text-left p-2 font-medium">Prijs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inputs.slice(0, 10).map((vehicle, idx) => (
                      <tr key={idx} className="border-t hover:bg-muted/50">
                        <td className="p-2 text-muted-foreground">{vehicle.rowIndex}</td>
                        <td className="p-2 font-medium">{vehicle.brand}</td>
                        <td className="p-2">{vehicle.model}</td>
                        <td className="p-2">{vehicle.buildYear}</td>
                        <td className="p-2">{vehicle.mileage.toLocaleString('nl-NL')} km</td>
                        <td className="p-2">{vehicle.fuelType || '-'}</td>
                        <td className="p-2">{vehicle.transmission || '-'}</td>
                        <td className="p-2">
                          {vehicle.askingPrice 
                            ? `€${vehicle.askingPrice.toLocaleString('nl-NL')}` 
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {inputs.length > 10 && (
                <div className="p-2 bg-muted text-center text-sm text-muted-foreground">
                  + {inputs.length - 10} meer voertuigen...
                </div>
              )}
            </div>

            {/* Start Processing Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={onStartProcessing}
                size="lg"
                className="min-w-[250px]"
              >
                Start JP Cars Taxaties ({inputs.length} voertuigen)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
