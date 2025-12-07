import React from 'react';
import { useTaxatie } from '@/hooks/useTaxatie';
import { toast } from 'sonner';

// Layout
import {
  TaxatieLayout,
  TaxatieColumnA,
  TaxatieColumnB,
  TaxatieColumnC,
  TaxatieFooter,
} from './layout/TaxatieLayout';

// Input components
import { LicensePlateSearch } from './input/LicensePlateSearch';
import { VehicleDataDisplay } from './input/VehicleDataDisplay';
import { OptionsSelector } from './input/OptionsSelector';

// Result components
import { PortalAnalysisCard } from './results/PortalAnalysisCard';
import { CourantheidCard } from './results/CourantheidCard';
import { JPCarsCard } from './results/JPCarsCard';
import { AIAdviceCard } from './results/AIAdviceCard';
import { InternalComparisonCard } from './results/InternalComparisonCard';

// Action components
import { TaxatieActionButtons } from './actions/TaxatieActionButtons';

export function NewValuationForm() {
  const {
    licensePlate,
    setLicensePlate,
    vehicleData,
    selectedOptions,
    portalAnalysis,
    jpCarsData,
    internalComparison,
    aiAdvice,
    loading,
    taxatieStarted,
    taxatieComplete,
    handleLicensePlateSearch,
    toggleOption,
    startTaxatie,
    submitFeedback,
    resetTaxatie,
  } = useTaxatie();

  const handleSave = () => {
    toast.success('Taxatie opgeslagen');
  };

  const handleUseAsPurchase = () => {
    if (aiAdvice) {
      toast.success(`Inkoopprijs €${aiAdvice.recommendedPurchasePrice.toLocaleString()} overgenomen`);
    }
  };

  return (
    <div className="space-y-6">
      <TaxatieLayout>
        {/* Kolom A: Voertuiggegevens */}
        <TaxatieColumnA>
          <LicensePlateSearch
            licensePlate={licensePlate}
            onLicensePlateChange={setLicensePlate}
            onSearch={handleLicensePlateSearch}
            loading={loading.rdw}
            disabled={taxatieStarted}
          />

          {vehicleData && (
            <>
              <VehicleDataDisplay vehicleData={vehicleData} />
              <OptionsSelector
                selectedOptions={selectedOptions}
                onToggleOption={toggleOption}
                disabled={taxatieStarted}
              />
            </>
          )}
        </TaxatieColumnA>

        {/* Kolom B: Marktdata */}
        <TaxatieColumnB>
          <PortalAnalysisCard
            data={portalAnalysis}
            loading={loading.portals}
          />

          <CourantheidCard
            data={jpCarsData}
            loading={loading.jpCars}
          />

          <JPCarsCard
            data={jpCarsData}
            loading={loading.jpCars}
          />
        </TaxatieColumnB>

        {/* Kolom C: AI Advies */}
        <TaxatieColumnC>
          <AIAdviceCard
            data={aiAdvice}
            loading={loading.aiAnalysis}
            onFeedbackSubmit={submitFeedback}
          />
        </TaxatieColumnC>

        {/* Footer: Interne vergelijking */}
        <TaxatieFooter>
          <InternalComparisonCard
            data={internalComparison}
            loading={loading.internalHistory}
          />

          <div className="mt-4">
            <TaxatieActionButtons
              onStartTaxatie={startTaxatie}
              onSave={handleSave}
              onReset={resetTaxatie}
              onUseAsPurchase={handleUseAsPurchase}
              loading={loading}
              canStart={!!vehicleData}
              taxatieComplete={taxatieComplete}
              taxatieStarted={taxatieStarted}
            />
          </div>
        </TaxatieFooter>
      </TaxatieLayout>
    </div>
  );
}
