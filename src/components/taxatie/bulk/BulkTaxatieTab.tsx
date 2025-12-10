import { useBulkTaxatie } from '@/hooks/useBulkTaxatie';
import { BulkTaxatieUploader } from './BulkTaxatieUploader';
import { BulkTaxatieProgress } from './BulkTaxatieProgress';
import { BulkTaxatieResults } from './BulkTaxatieResults';
import { BulkTaxatiePreview } from './BulkTaxatiePreview';

export const BulkTaxatieTab = () => {
  const {
    isUploading,
    isProcessing,
    isParsing,
    progress,
    rawData,
    columnMapping,
    availableColumns,
    results,
    detectedSupplier,
    parsedVehicles,
    filename,
    parseExcelFile,
    updateColumnMapping,
    parseVehicleDescriptions,
    startBulkProcessing,
    reset,
  } = useBulkTaxatie();

  const completedCount = results.filter(r => r.status === 'completed').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const hasResults = results.some(r => r.status === 'completed' || r.status === 'error');

  // Show results when processing is done
  if (hasResults && !isProcessing) {
    return <BulkTaxatieResults results={results} onReset={reset} />;
  }

  // Show progress during processing
  if (isProcessing) {
    return (
      <div className="space-y-6">
        <BulkTaxatieProgress
          current={progress.current}
          total={progress.total}
          currentVehicle={progress.currentVehicle}
          completedCount={completedCount}
          errorCount={errorCount}
        />
        
        {/* Live results preview */}
        {results.length > 0 && (
          <BulkTaxatieResults results={results} onReset={reset} />
        )}
      </div>
    );
  }

  // Show uploader and preview
  return (
    <div className="space-y-6">
      <BulkTaxatieUploader
        isUploading={isUploading}
        isParsing={isParsing}
        availableColumns={availableColumns}
        columnMapping={columnMapping}
        rawDataCount={rawData.length}
        detectedSupplier={detectedSupplier}
        parsedVehicles={parsedVehicles}
        filename={filename}
        onFileUpload={parseExcelFile}
        onColumnMappingChange={updateColumnMapping}
        onParseDescriptions={parseVehicleDescriptions}
        onStartProcessing={startBulkProcessing}
      />
      
      {/* Show parsed preview if available */}
      {parsedVehicles.length > 0 && (
        <BulkTaxatiePreview 
          parsedVehicles={parsedVehicles}
          rawData={rawData}
          columnMapping={columnMapping}
        />
      )}
    </div>
  );
};
