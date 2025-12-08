import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Car, Calendar, Gauge, Fuel, Settings2, Zap, Palette, Box, Search, Pencil, Check, Tag } from 'lucide-react';
import type { TaxatieVehicleData } from '@/types/taxatie';
import { calculateMaxMileage, formatMileage } from '@/utils/taxatieHelpers';

interface VehicleDataDisplayProps {
  vehicleData: TaxatieVehicleData;
  onVehicleDataChange?: (data: TaxatieVehicleData) => void;
  onMileageChange?: (mileage: number) => void;
  disabled?: boolean;
}

const FUEL_TYPES = ['Benzine', 'Diesel', 'Elektrisch', 'Hybride', 'Plug-in Hybride', 'LPG'];
const BODY_TYPES = ['Hatchback', 'Sedan', 'Stationwagen', 'SUV', 'MPV', 'Coupé', 'Cabrio', 'Pick-up'];

export const VehicleDataDisplay = ({ vehicleData, onVehicleDataChange, onMileageChange, disabled }: VehicleDataDisplayProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const maxMileage = calculateMaxMileage(vehicleData.mileage);
  const hasMileage = vehicleData.mileage > 0;
  const needsTransmission = vehicleData.transmission === 'Onbekend' || !vehicleData.transmission;

  const handleFieldChange = (field: keyof TaxatieVehicleData, value: string | number) => {
    const updatedData = { ...vehicleData, [field]: value };
    onVehicleDataChange?.(updatedData);
    
    // Sync mileage with separate handler if needed
    if (field === 'mileage' && onMileageChange) {
      onMileageChange(value as number);
    }
  };

  const handleMileageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
    handleFieldChange('mileage', value);
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Voertuiggegevens
          </CardTitle>
          {!disabled && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleEditMode}
              className="h-8 gap-1"
            >
              {isEditing ? (
                <>
                  <Check className="h-4 w-4" />
                  Klaar
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4" />
                  Bewerken
                </>
              )}
            </Button>
          )}
        </div>
        {needsTransmission && !disabled && (
          <p className="text-xs text-destructive mt-1">⚠️ Selecteer transmissie voordat u kunt starten</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* Merk - alleen lezen */}
          <DataRow icon={<Car className="h-4 w-4" />} label="Merk">
            <span className="font-semibold">{vehicleData.brand}</span>
          </DataRow>

          {/* Model - bewerkbaar */}
          <DataRow icon={<Car className="h-4 w-4" />} label="Model">
            {isEditing ? (
              <Input
                value={vehicleData.model}
                onChange={(e) => handleFieldChange('model', e.target.value)}
                className="h-7 text-sm"
                placeholder="bijv. Golf 8"
                disabled={disabled}
              />
            ) : (
              <span className="font-medium">{vehicleData.model}</span>
            )}
          </DataRow>

          {/* Carrosserie - bewerkbaar */}
          <DataRow icon={<Box className="h-4 w-4" />} label="Carrosserie">
            {isEditing ? (
              <Select 
                value={vehicleData.bodyType || ''} 
                onValueChange={(v) => handleFieldChange('bodyType', v)}
                disabled={disabled}
              >
                <SelectTrigger className="h-7 text-sm">
                  <SelectValue placeholder="Selecteer..." />
                </SelectTrigger>
                <SelectContent>
                  {BODY_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="font-medium">{vehicleData.bodyType || '-'}</span>
            )}
          </DataRow>

          {/* Bouwjaar - alleen lezen */}
          <DataRow icon={<Calendar className="h-4 w-4" />} label="Bouwjaar">
            {vehicleData.buildYear}
            {vehicleData.modelYear && vehicleData.modelYear !== vehicleData.buildYear && (
              <span className="text-muted-foreground ml-1">(MY {vehicleData.modelYear})</span>
            )}
          </DataRow>

          {/* Brandstof - bewerkbaar */}
          <DataRow icon={<Fuel className="h-4 w-4" />} label="Brandstof">
            {isEditing ? (
              <Select 
                value={vehicleData.fuelType} 
                onValueChange={(v) => handleFieldChange('fuelType', v)}
                disabled={disabled}
              >
                <SelectTrigger className="h-7 text-sm">
                  <SelectValue placeholder="Selecteer..." />
                </SelectTrigger>
                <SelectContent>
                  {FUEL_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="font-medium">{vehicleData.fuelType}</span>
            )}
          </DataRow>

          {/* Transmissie - ALTIJD bewerkbaar als 'Onbekend', anders in edit mode */}
          <DataRow icon={<Settings2 className="h-4 w-4" />} label="Transmissie">
            {(isEditing || needsTransmission) && !disabled ? (
              <Select 
                value={needsTransmission ? '' : vehicleData.transmission} 
                onValueChange={(v) => handleFieldChange('transmission', v as 'Automaat' | 'Handgeschakeld')}
                disabled={disabled}
              >
                <SelectTrigger className={`h-7 text-sm ${needsTransmission ? 'border-destructive ring-1 ring-destructive' : ''}`}>
                  <SelectValue placeholder="Selecteer..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Automaat">Automaat</SelectItem>
                  <SelectItem value="Handgeschakeld">Handgeschakeld</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <span className="font-medium">{vehicleData.transmission}</span>
            )}
          </DataRow>

          {/* Vermogen - alleen lezen */}
          {vehicleData.power > 0 && (
            <DataRow icon={<Zap className="h-4 w-4" />} label="Vermogen">
              {vehicleData.power} pk
            </DataRow>
          )}

          {/* Kleur - alleen lezen */}
          {vehicleData.color && (
            <DataRow icon={<Palette className="h-4 w-4" />} label="Kleur">
              {vehicleData.color}
            </DataRow>
          )}
        </div>

        {/* Trim/Uitvoering - ALTIJD bewerkbaar want RDW geeft dit niet */}
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Uitvoering/Trim:</span>
          </div>
          <Input
            value={vehicleData.trim || ''}
            onChange={(e) => handleFieldChange('trim', e.target.value)}
            placeholder="bijv. R-Line, M Sport, S-Line, GTI"
            disabled={disabled}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">Vul in voor nauwkeurigere zoekresultaten</p>
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
              onChange={handleMileageInputChange}
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
