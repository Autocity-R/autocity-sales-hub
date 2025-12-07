import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Car, Info } from 'lucide-react';
import type { TaxatieVehicleData } from '@/types/taxatie';
import { 
  VEHICLE_BRANDS, 
  BODY_TYPES, 
  FUEL_TYPES, 
  TRANSMISSION_TYPES,
  COLORS,
  TRIM_LEVELS 
} from '@/data/vehicleData';
import { calculateMaxMileage, formatMileage } from '@/utils/taxatieHelpers';

interface ManualVehicleFormProps {
  onSubmit: (data: TaxatieVehicleData) => void;
  disabled?: boolean;
  loading?: boolean;
}

export const ManualVehicleForm = ({ onSubmit, disabled, loading }: ManualVehicleFormProps) => {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [buildYear, setBuildYear] = useState('');
  const [modelYear, setModelYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [transmission, setTransmission] = useState<'Automaat' | 'Handgeschakeld'>('Automaat');
  const [power, setPower] = useState('');
  const [color, setColor] = useState('');
  const [trim, setTrim] = useState('');
  const [customTrim, setCustomTrim] = useState('');

  // Get models for selected brand
  const availableModels = useMemo(() => {
    return brand ? (VEHICLE_BRANDS[brand] || []) : [];
  }, [brand]);

  // Get trim levels for selected brand
  const availableTrims = useMemo(() => {
    return brand ? (TRIM_LEVELS[brand] || []) : [];
  }, [brand]);

  // Calculate max mileage for portal search
  const maxMileagePreview = useMemo(() => {
    const km = parseInt(mileage);
    if (isNaN(km) || km <= 0) return null;
    return calculateMaxMileage(km);
  }, [mileage]);

  // Generate year options (last 25 years)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 25 }, (_, i) => currentYear - i);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const vehicleData: TaxatieVehicleData = {
      brand,
      model: model === 'other' ? customModel : model,
      bodyType,
      buildYear: parseInt(buildYear),
      modelYear: modelYear ? parseInt(modelYear) : undefined,
      mileage: parseInt(mileage),
      fuelType,
      transmission,
      power: parseInt(power) || 0,
      color,
      trim: trim === 'other' ? customTrim : trim,
      options: [],
      keywords: [],
    };

    onSubmit(vehicleData);
  };

  const isValid = brand && (model || customModel) && bodyType && buildYear && mileage && fuelType;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Row 1: Brand & Model */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Merk *</Label>
          <Select value={brand} onValueChange={(v) => { setBrand(v); setModel(''); setTrim(''); }} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Selecteer merk" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {Object.keys(VEHICLE_BRANDS).sort().map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1.5">
          <Label className="text-xs">Model *</Label>
          <Select value={model} onValueChange={setModel} disabled={disabled || !brand}>
            <SelectTrigger>
              <SelectValue placeholder="Selecteer model" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {availableModels.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
              <SelectItem value="other">Anders...</SelectItem>
            </SelectContent>
          </Select>
          {model === 'other' && (
            <Input
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder="Typ modelnaam"
              className="mt-2"
              disabled={disabled}
            />
          )}
        </div>
      </div>

      {/* Row 2: Body Type & Fuel */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Carrosserie *</Label>
          <Select value={bodyType} onValueChange={setBodyType} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Selecteer" />
            </SelectTrigger>
            <SelectContent>
              {BODY_TYPES.map((bt) => (
                <SelectItem key={bt} value={bt}>{bt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1.5">
          <Label className="text-xs">Brandstof *</Label>
          <Select value={fuelType} onValueChange={setFuelType} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Selecteer" />
            </SelectTrigger>
            <SelectContent>
              {FUEL_TYPES.map((ft) => (
                <SelectItem key={ft} value={ft}>{ft}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 3: Build Year & Model Year */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Bouwjaar *</Label>
          <Select value={buildYear} onValueChange={setBuildYear} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Jaar" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            Modeljaar
            <span className="text-muted-foreground">(optioneel)</span>
          </Label>
          <Select value={modelYear} onValueChange={(v) => setModelYear(v === '__none__' ? '' : v)} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Jaar" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="__none__">-</SelectItem>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 4: Mileage with preview */}
      <div className="space-y-1.5">
        <Label className="text-xs">KM-stand *</Label>
        <Input
          type="number"
          value={mileage}
          onChange={(e) => setMileage(e.target.value)}
          placeholder="bijv. 45000"
          disabled={disabled}
        />
        {maxMileagePreview && (
          <div className="flex items-center gap-2 p-2 mt-2 rounded-md bg-primary/10 border border-primary/20">
            <Info className="h-4 w-4 text-primary" />
            <span className="text-xs text-primary font-medium">
              Portal zoekfilter: t/m {formatMileage(maxMileagePreview)}
            </span>
          </div>
        )}
      </div>

      {/* Row 5: Transmission & Power */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Transmissie *</Label>
          <Select value={transmission} onValueChange={(v) => setTransmission(v as 'Automaat' | 'Handgeschakeld')} disabled={disabled}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSMISSION_TYPES.map((tt) => (
                <SelectItem key={tt} value={tt}>{tt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1.5">
          <Label className="text-xs">Vermogen (pk)</Label>
          <Input
            type="number"
            value={power}
            onChange={(e) => setPower(e.target.value)}
            placeholder="bijv. 150"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Row 6: Color & Trim */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Kleur</Label>
          <Select value={color} onValueChange={setColor} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Selecteer" />
            </SelectTrigger>
            <SelectContent>
              {COLORS.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1.5">
          <Label className="text-xs">Uitvoering / Trim</Label>
          <Select value={trim || '__none__'} onValueChange={(v) => setTrim(v === '__none__' ? '' : v)} disabled={disabled || !brand}>
            <SelectTrigger>
              <SelectValue placeholder="Selecteer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">-</SelectItem>
              {availableTrims.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
              <SelectItem value="other">Anders...</SelectItem>
            </SelectContent>
          </Select>
          {trim === 'other' && (
            <Input
              value={customTrim}
              onChange={(e) => setCustomTrim(e.target.value)}
              placeholder="Typ uitvoering"
              className="mt-2"
              disabled={disabled}
            />
          )}
        </div>
      </div>

      {/* Submit button */}
      <Button type="submit" className="w-full" disabled={disabled || loading || !isValid}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Car className="h-4 w-4 mr-2" />
        )}
        Voertuig Toevoegen
      </Button>
    </form>
  );
};
