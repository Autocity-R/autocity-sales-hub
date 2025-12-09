import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Car, Globe } from 'lucide-react';
import type { TaxatieInputMode, TaxatieVehicleData } from '@/types/taxatie';
import { JPCarsVehicleBuilder } from './JPCarsVehicleBuilder';

interface VehicleInputCardProps {
  inputMode: TaxatieInputMode;
  onInputModeChange: (mode: TaxatieInputMode) => void;
  licensePlate: string;
  onLicensePlateChange: (value: string) => void;
  mileage: number;
  onMileageChange: (value: number) => void;
  onSearch: () => void;
  onManualSubmit: (data: TaxatieVehicleData) => void;
  onJPCarsSubmit?: (data: TaxatieVehicleData) => void;
  loading: boolean;
  disabled?: boolean;
  vehicleLoaded?: boolean;
}

export const VehicleInputCard = ({
  inputMode,
  onInputModeChange,
  licensePlate,
  onLicensePlateChange,
  mileage,
  onMileageChange,
  onSearch,
  onManualSubmit,
  onJPCarsSubmit,
  loading,
  disabled,
  vehicleLoaded,
}: VehicleInputCardProps) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && !disabled) {
      onSearch();
    }
  };

  const handleMileageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
    onMileageChange(value);
  };

  const handleBuilderSubmit = (data: TaxatieVehicleData) => {
    if (onJPCarsSubmit) {
      onJPCarsSubmit(data);
    } else {
      onManualSubmit(data);
    }
  };

  // Normalize mode for tabs - combine jpcars and handmatig into one
  const normalizedMode = inputMode === 'handmatig' ? 'handmatig' : inputMode;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Car className="h-5 w-5 text-primary" />
          Voertuig Invoer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={normalizedMode} onValueChange={(v) => onInputModeChange(v as TaxatieInputMode)}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="kenteken" className="flex items-center gap-1 text-xs sm:text-sm" disabled={disabled}>
              <Search className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Kenteken (NL)</span>
              <span className="sm:hidden">🇳🇱 NL</span>
            </TabsTrigger>
            <TabsTrigger value="handmatig" className="flex items-center gap-1 text-xs sm:text-sm" disabled={disabled}>
              <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Handmatig / Buitenlands</span>
              <span className="sm:hidden">🌍 Int</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="kenteken" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="AA-123-BB"
                value={licensePlate}
                onChange={(e) => onLicensePlateChange(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                className="font-mono text-lg tracking-wider"
                disabled={disabled}
              />
              <Button onClick={onSearch} disabled={loading || disabled}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* Mileage input - always visible for kenteken flow */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Kilometerstand *</label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Bijv. 45000"
                  value={mileage > 0 ? mileage.toLocaleString('nl-NL') : ''}
                  onChange={handleMileageChange}
                  disabled={disabled}
                  className={`${mileage <= 0 && vehicleLoaded ? 'border-destructive' : ''}`}
                />
                <span className="text-sm text-muted-foreground">km</span>
              </div>
              {mileage <= 0 && vehicleLoaded && (
                <p className="text-xs text-destructive">Verplicht voor taxatie</p>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              🇳🇱 Nederlands kenteken - automatische RDW lookup
            </p>
          </TabsContent>
          
          <TabsContent value="handmatig">
            <div className="mb-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                🇩🇪 🇧🇪 🇦🇹 🇫🇷 Buitenlands voertuig - selecteer via JP Cars catalogus
              </p>
            </div>
            <JPCarsVehicleBuilder 
              onSubmit={handleBuilderSubmit}
              disabled={disabled}
              loading={loading}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
