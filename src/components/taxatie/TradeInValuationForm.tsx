import React, { useState } from 'react';
import { useTradeInTaxatie } from '@/hooks/useTradeInTaxatie';
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
import { VehicleInputCard } from './input/VehicleInputCard';
import { VehicleDataDisplay } from './input/VehicleDataDisplay';
import { OptionsSelector } from './input/OptionsSelector';

// Result components
import { PortalAnalysisCard } from './results/PortalAnalysisCard';
import { CourantheidCard } from './results/CourantheidCard';
import { JPCarsCard } from './results/JPCarsCard';
import { TradeInAdviceCard } from './results/TradeInAdviceCard';
import { InternalComparisonCard } from './results/InternalComparisonCard';

// Action components
import { TaxatieActionButtons } from './actions/TaxatieActionButtons';

// Header
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { CarFront, TrendingDown, SlidersHorizontal } from 'lucide-react';

interface TradeInHeaderProps {
  salesMode: boolean;
  onSalesModeChange: (value: boolean) => void;
}

function TradeInHeader({ salesMode, onSalesModeChange }: TradeInHeaderProps) {
  return (
    <Card className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/20">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <CarFront className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                Inruil Taxatie
                <TrendingDown className="h-5 w-5 text-orange-500" />
              </h1>
              <p className="text-sm text-muted-foreground">
                Data analyse automotive inruil taxatie
              </p>
            </div>
          </div>
          
          {/* Subtiele toggle - lijkt op een "meer opties" functie */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" />
            <span>Details</span>
            <Switch 
              checked={salesMode} 
              onCheckedChange={onSalesModeChange}
              className="scale-75"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TradeInValuationForm() {
  const [salesMode, setSalesMode] = useState(false);
  
  const {
    inputMode,
    setInputMode,
    licensePlate,
    setLicensePlate,
    vehicleData,
    selectedOptions,
    keywords,
    setKeywords,
    portalAnalysis,
    jpCarsData,
    internalComparison,
    tradeInAdvice,
    loading,
    taxatieStarted,
    taxatieComplete,
    enteredMileage,
    handleLicensePlateSearch,
    handleManualVehicleSubmit,
    handleJPCarsVehicleSubmit,
    toggleOption,
    startTaxatie,
    resetTaxatie,
    updateVehicleMileage,
    updateVehicleData,
  } = useTradeInTaxatie();

  const handleSave = () => {
    toast.success('Inruil taxatie opgeslagen');
  };

  const handleUseAsPurchase = () => {
    if (tradeInAdvice) {
      toast.success(`Max inkoopprijs €${tradeInAdvice.maxPurchasePrice.toLocaleString('nl-NL')} overgenomen`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Inruil Header met Sales Toggle */}
      <TradeInHeader salesMode={salesMode} onSalesModeChange={setSalesMode} />

      <TaxatieLayout>
        {/* Kolom A: Voertuiggegevens */}
        <TaxatieColumnA>
          <VehicleInputCard
            inputMode={inputMode}
            onInputModeChange={setInputMode}
            licensePlate={licensePlate}
            onLicensePlateChange={setLicensePlate}
            mileage={enteredMileage}
            onMileageChange={updateVehicleMileage}
            onSearch={handleLicensePlateSearch}
            onManualSubmit={handleManualVehicleSubmit}
            onJPCarsSubmit={handleJPCarsVehicleSubmit}
            loading={loading.rdw}
            disabled={taxatieStarted}
            vehicleLoaded={!!vehicleData}
            selectedOptions={selectedOptions}
            onToggleOption={toggleOption}
            keywords={keywords}
            onKeywordsChange={setKeywords}
          />

          {vehicleData && (
            <>
              <VehicleDataDisplay 
                vehicleData={vehicleData} 
                onVehicleDataChange={updateVehicleData}
                onMileageChange={updateVehicleMileage}
                disabled={taxatieStarted}
              />
              <OptionsSelector
                selectedOptions={selectedOptions}
                onToggleOption={toggleOption}
                keywords={keywords}
                onKeywordsChange={setKeywords}
                disabled={taxatieStarted}
              />
            </>
          )}
        </TaxatieColumnA>

        {/* Kolom B: Marktdata */}
        <TaxatieColumnB>
          {/* Portaal Analyse - altijd zichtbaar (klant-transparant) */}
          <PortalAnalysisCard
            data={portalAnalysis}
            loading={loading.portals}
          />

          {/* JP Cars data - alleen in Sales Mode */}
          {salesMode && (
            <>
              <CourantheidCard
                data={jpCarsData}
                loading={loading.jpCars}
              />

              <JPCarsCard
                data={jpCarsData}
                loading={loading.jpCars}
              />
            </>
          )}
        </TaxatieColumnB>

        {/* Kolom C: Inruil Advies - altijd zichtbaar */}
        <TaxatieColumnC>
          <TradeInAdviceCard
            data={tradeInAdvice}
            loading={loading.aiAnalysis}
            jpCarsData={jpCarsData}
          />
        </TaxatieColumnC>

        {/* Footer */}
        <TaxatieFooter>
          {/* Interne vergelijking - alleen in Sales Mode */}
          {salesMode && (
            <InternalComparisonCard
              data={internalComparison}
              loading={loading.internalHistory}
            />
          )}

          <div className={salesMode ? "mt-4" : ""}>
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
