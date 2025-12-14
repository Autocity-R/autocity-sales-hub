import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Car, FileSpreadsheet } from 'lucide-react';
import { SingleVehicleAnalysis } from './SingleVehicleAnalysis';
import { BulkDealerUploader } from './BulkDealerUploader';
import { DealerAnalysisResults } from './DealerAnalysisResults';
import { DealerAnalysisProgress } from './DealerAnalysisProgress';
import { useDealerAnalysis } from '@/hooks/useDealerAnalysis';

export const DealerAnalysisTab = () => {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  const {
    isProcessing,
    isParsing,
    isUploading,
    progress,
    rawData,
    vehicles,
    results,
    filename,
    parseExcelFile,
    analyzeExcelWithAI,
    addSingleVehicle,
    lookupRDW,
    startAnalysis,
    reset,
  } = useDealerAnalysis();

  const hasResults = results.some(r => r.status === 'completed' || r.status === 'error');

  // Show results when processing is done
  if (hasResults && !isProcessing) {
    return <DealerAnalysisResults results={results} onReset={reset} />;
  }

  // Show progress during processing
  if (isProcessing) {
    return (
      <div className="space-y-6">
        <DealerAnalysisProgress
          current={progress.current}
          total={progress.total}
          currentVehicle={progress.currentVehicle}
        />

        {/* Live results preview */}
        {results.some(r => r.status === 'completed') && (
          <DealerAnalysisResults results={results} onReset={reset} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">B2B Dealer Analyse</h2>
        <p className="text-muted-foreground">
          Vind dealers die recent vergelijkbare voertuigen hebben verkocht
        </p>
      </div>

      {/* Mode selection */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'single' | 'bulk')}>
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Enkel Voertuig
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Bulk Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="mt-6">
          <SingleVehicleAnalysis
            onAddVehicle={addSingleVehicle}
            vehicles={vehicles}
            onStartAnalysis={startAnalysis}
            isProcessing={isProcessing}
            onLookupRDW={lookupRDW}
          />
        </TabsContent>

        <TabsContent value="bulk" className="mt-6">
          <BulkDealerUploader
            isUploading={isUploading}
            isParsing={isParsing}
            rawDataCount={rawData.length}
            vehicles={vehicles}
            filename={filename}
            onFileUpload={parseExcelFile}
            onAnalyzeWithAI={analyzeExcelWithAI}
            onStartProcessing={startAnalysis}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
