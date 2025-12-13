import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Play, 
  Save, 
  RotateCcw, 
  ShoppingCart, 
  Loader2,
  Database,
  Globe,
  Car,
  Brain,
  SlidersHorizontal,
  Check
} from 'lucide-react';
import type { TaxatieLoadingState } from '@/types/taxatie';

interface TaxatieActionButtonsProps {
  onStartTaxatie: () => void;
  onSave: () => void;
  onReset: () => void;
  onUseAsPurchase: () => void;
  loading: TaxatieLoadingState;
  canStart: boolean;
  taxatieComplete: boolean;
  taxatieStarted: boolean;
  salesMode: boolean;
  onSalesModeChange: (value: boolean) => void;
}

export const TaxatieActionButtons = ({
  onStartTaxatie,
  onSave,
  onReset,
  onUseAsPurchase,
  loading,
  canStart,
  taxatieComplete,
  taxatieStarted,
  salesMode,
  onSalesModeChange,
}: TaxatieActionButtonsProps) => {
  const isLoading = Object.values(loading).some(Boolean);

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Loading status */}
        {taxatieStarted && !taxatieComplete && (
          <div className="mb-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-3">Taxatie wordt uitgevoerd...</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <LoadingStep
                icon={Database}
                label="RDW Data"
                loading={loading.rdw}
                complete={!loading.rdw && taxatieStarted}
              />
              <LoadingStep
                icon={Globe}
                label="Portalen"
                loading={loading.portals}
                complete={!loading.portals && !loading.rdw}
              />
              <LoadingStep
                icon={Car}
                label="JP Cars"
                loading={loading.jpCars}
                complete={!loading.jpCars && !loading.portals}
              />
              <LoadingStep
                icon={Brain}
                label="AI Analyse"
                loading={loading.aiAnalysis}
                complete={taxatieComplete}
              />
            </div>
          </div>
        )}

        {/* Info text before start */}
        {!taxatieStarted && canStart && (
          <div className="mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <strong>Start Taxatie</strong> haalt de volgende data op:
            </p>
            <ul className="text-xs text-muted-foreground mt-2 space-y-1">
              <li>• Portaaldata (Gaspedaal, Autoscout24, Marktplaats, Autotrack)</li>
              <li>• JP Cars waarde inclusief APR & ETR</li>
              <li>• Autocity verkoop historie</li>
              <li>• AI analyse en advies</li>
            </ul>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          {!taxatieComplete ? (
            <Button
              size="lg"
              onClick={onStartTaxatie}
              disabled={!canStart || isLoading}
              className="flex-1 md:flex-none"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Start Taxatie
            </Button>
          ) : (
            <>
              <Button
                size="lg"
                onClick={onSave}
                className="flex-1 md:flex-none"
              >
                <Save className="h-4 w-4 mr-2" />
                Taxatie Opslaan
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={onUseAsPurchase}
                className="flex-1 md:flex-none"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Gebruik als Inkoop
              </Button>
            </>
          )}
          <Button
            size="lg"
            variant="outline"
            onClick={onReset}
            disabled={isLoading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            size="lg"
            variant="ghost"
            onClick={() => onSalesModeChange(!salesMode)}
            className="text-muted-foreground"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Details
            {salesMode && <Check className="h-3 w-3 ml-1 text-green-500" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface LoadingStepProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  loading: boolean;
  complete: boolean;
}

const LoadingStep = ({ icon: Icon, label, loading, complete }: LoadingStepProps) => {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
        loading
          ? 'bg-primary/10 text-primary'
          : complete
          ? 'bg-green-500/10 text-green-600'
          : 'bg-muted text-muted-foreground'
      }`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      <span>{label}</span>
    </div>
  );
};
