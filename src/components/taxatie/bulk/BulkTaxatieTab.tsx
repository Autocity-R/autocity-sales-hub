import { useBulkTaxatie } from '@/hooks/useBulkTaxatie';
import { BulkTaxatieUploader } from './BulkTaxatieUploader';
import { BulkTaxatieProgress } from './BulkTaxatieProgress';
import { BulkTaxatieResults } from './BulkTaxatieResults';

export const BulkTaxatieTab = () => {
  const {
    isUploading,
    isProcessing,
    isParsing,
    progress,
    rawData,
    inputs,
    results,
    filename,
    parseExcelFile,
    analyzeExcelWithAI,
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

  // Show uploader with AI analysis
  return (
    <BulkTaxatieUploader
      isUploading={isUploading}
      isParsing={isParsing}
      rawDataCount={rawData.length}
      inputs={inputs}
      filename={filename}
      onFileUpload={parseExcelFile}
      onAnalyzeWithAI={analyzeExcelWithAI}
      onStartProcessing={startBulkProcessing}
    />
  );
};
