import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Car, Calendar, Gauge, Fuel, Settings2, Zap, Palette, Info, Box, Search } from 'lucide-react';
import type { TaxatieVehicleData } from '@/types/taxatie';
import { calculateMaxMileage, formatMileage } from '@/utils/taxatieHelpers';

interface VehicleDataDisplayProps {
  vehicleData: TaxatieVehicleData;
  onMileageChange?: (mileage: number) => void;
  disabled?: boolean;
}

export const VehicleDataDisplay = ({ vehicleData, onMileageChange, disabled }: VehicleDataDisplayProps) => {
  const maxMileage = calculateMaxMileage(vehicleData.mileage);
  const hasMileage = vehicleData.mileage > 0;

  const handleMileageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
    onMileageChange?.(value);
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Car className="h-5 w-5 text-primary" />
          Voertuiggegevens
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <DataRow icon={<Car className="h-4 w-4" />} label="Merk/Model">
            <span className="font-semibold">{vehicleData.brand} {vehicleData.model}</span>
          </DataRow>

          {vehicleData.bodyType && (
            <DataRow icon={<Box className="h-4 w-4" />} label="Carrosserie">
              {vehicleData.bodyType}
            </DataRow>
          )}

          <DataRow icon={<Calendar className="h-4 w-4" />} label="Bouwjaar">
            {vehicleData.buildYear}
            {vehicleData.modelYear && vehicleData.modelYear !== vehicleData.buildYear && (
              <span className="text-muted-foreground ml-1">(MY {vehicleData.modelYear})</span>
            )}
          </DataRow>

          <DataRow icon={<Fuel className="h-4 w-4" />} label="Brandstof">
            {vehicleData.fuelType}
          </DataRow>

          <DataRow icon={<Settings2 className="h-4 w-4" />} label="Transmissie">
            {vehicleData.transmission}
          </DataRow>

          {vehicleData.power > 0 && (
            <DataRow icon={<Zap className="h-4 w-4" />} label="Vermogen">
              {vehicleData.power} pk
            </DataRow>
          )}

          {vehicleData.color && (
            <DataRow icon={<Palette className="h-4 w-4" />} label="Kleur">
              {vehicleData.color}
            </DataRow>
          )}
        </div>

        {/* Editable mileage input */}
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">KM-stand:</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              inputMode="numeric"
              value={vehicleData.mileage > 0 ? vehicleData.mileage.toLocaleString('nl-NL') : ''}
              onChange={handleMileageChange}
              placeholder="Bijv. 45000"
              disabled={disabled}
              className={`font-medium ${!hasMileage ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
            <span className="text-sm text-muted-foreground">km</span>
          </div>
          {!hasMileage && (
            <p className="text-xs text-destructive mt-1">Vul de kilometerstand in voor de taxatie</p>
          )}
        </div>

        {vehicleData.trim && (
          <div className="pt-2 border-t">
            <Badge variant="secondary" className="font-medium">
              {vehicleData.trim}
            </Badge>
          </div>
        )}

        {/* Portal zoekfilter preview */}
        <div className="pt-2 border-t">
          <div className={`flex items-center gap-2 p-2 rounded-md ${hasMileage ? 'bg-primary/10 border border-primary/20' : 'bg-muted border border-border'}`}>
            <Search className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="text-xs">
              <span className="text-primary font-medium">Portal zoekfilter:</span>
              {hasMileage ? (
                <span className="text-muted-foreground ml-1">
                  t/m {formatMileage(maxMileage)} <span className="opacity-60">(+20k, afgerond op 10.000)</span>
                </span>
              ) : (
                <span className="text-muted-foreground ml-1 italic">Vul km-stand in</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface DataRowProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

const DataRow = ({ icon, label, children }: DataRowProps) => (
  <>
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <span>{label}:</span>
    </div>
    <div className="font-medium">{children}</div>
  </>
);
