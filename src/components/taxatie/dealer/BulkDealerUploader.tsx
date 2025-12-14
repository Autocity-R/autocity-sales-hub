import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, Sparkles, Play, CheckCircle2, Loader2 } from 'lucide-react';
import type { VehicleInput } from '@/types/dealerAnalysis';

interface BulkDealerUploaderProps {
  isUploading: boolean;
  isParsing: boolean;
  rawDataCount: number;
  vehicles: VehicleInput[];
  filename: string;
  onFileUpload: (file: File) => void;
  onAnalyzeWithAI: () => void;
  onStartProcessing: () => void;
}

export const BulkDealerUploader = ({
  isUploading,
  isParsing,
  rawDataCount,
  vehicles,
  filename,
  onFileUpload,
  onAnalyzeWithAI,
  onStartProcessing,
}: BulkDealerUploaderProps) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      onFileUpload(file);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  // Step status
  const step1Complete = rawDataCount > 0;
  const step2Complete = vehicles.length > 0;

  return (
    <div className="space-y-6">
      {/* Step 1: Upload */}
      <Card className={step1Complete ? 'border-green-500/50' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {step1Complete ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                1
              </span>
            )}
            Excel Upload
          </CardTitle>
          <CardDescription>
            Upload een Excel bestand met voertuiglijst
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!step1Complete ? (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:border-primary/50'}
              `}
            >
              <input {...getInputProps()} />
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p>Bestand wordt geladen...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  {isDragActive ? (
                    <p>Laat het bestand hier los...</p>
                  ) : (
                    <>
                      <p className="font-medium">Sleep een Excel bestand hierheen</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        of klik om te selecteren (.xlsx, .xls, .csv)
                      </p>
                    </>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-medium">{filename}</p>
                  <p className="text-sm text-muted-foreground">{rawDataCount} rijen geïmporteerd</p>
                </div>
              </div>
              <Badge variant="default" className="bg-green-500">Geladen</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: AI Analysis */}
      {step1Complete && (
        <Card className={step2Complete ? 'border-green-500/50' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {step2Complete ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  2
                </span>
              )}
              AI Voertuig Herkenning
            </CardTitle>
            <CardDescription>
              Laat AI de voertuiggegevens herkennen uit je Excel
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!step2Complete ? (
              <Button
                onClick={onAnalyzeWithAI}
                disabled={isParsing}
                className="w-full"
                size="lg"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    AI analyseert {rawDataCount} rijen...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyseer met AI
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg">
                  <div>
                    <p className="font-medium">{vehicles.length} voertuigen herkend</p>
                    <p className="text-sm text-muted-foreground">
                      Klaar voor dealer analyse
                    </p>
                  </div>
                  <Badge variant="default" className="bg-green-500">Klaar</Badge>
                </div>

                {/* Preview of recognized vehicles */}
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {vehicles.slice(0, 5).map((v, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{v.brand}</Badge>
                        <span>{v.model}</span>
                        <span className="text-muted-foreground">{v.buildYear}</span>
                      </div>
                      <Badge variant="secondary">{v.fuelType}</Badge>
                    </div>
                  ))}
                  {vehicles.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      + {vehicles.length - 5} meer voertuigen...
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Start Analysis */}
      {step2Complete && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                3
              </span>
              Start Dealer Analyse
            </CardTitle>
            <CardDescription>
              Zoek dealers die recent deze voertuigen hebben verkocht
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={onStartProcessing}
              className="w-full"
              size="lg"
            >
              <Play className="h-4 w-4 mr-2" />
              Analyseer {vehicles.length} Voertuigen
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
