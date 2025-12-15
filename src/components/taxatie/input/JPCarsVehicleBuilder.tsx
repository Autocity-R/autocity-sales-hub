import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Car, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TaxatieVehicleData } from '@/types/taxatie';
import { VEHICLE_BRANDS, FUEL_TYPES, BODY_TYPES, TRANSMISSION_TYPES } from '@/data/vehicleData';
import { OptionsSelector } from './OptionsSelector';
import { supabase } from '@/integrations/supabase/client';

interface JPCarsVehicleBuilderProps {
  onSubmit: (data: TaxatieVehicleData) => void;
  disabled?: boolean;
  loading?: boolean;
  selectedOptions: string[];
  onToggleOption: (option: string) => void;
  keywords: string[];
  onKeywordsChange: (keywords: string[]) => void;
}

interface BuilderState {
  make: string;
  model: string;
  fuel: string;
  gear: string;
  hp: string;
  body: string;
  build: string;
  mileage: number;
  trim: string;
}

// Static data - no API dependency
const MAKES = Object.keys(VEHICLE_BRANDS);
const FUELS = [...FUEL_TYPES];
const GEARS = [...TRANSMISSION_TYPES];
const BODIES = [...BODY_TYPES];
const YEARS = Array.from({ length: 20 }, (_, i) => (new Date().getFullYear() - i).toString());
const HP_OPTIONS_FALLBACK = ['75', '90', '100', '110', '120', '130', '140', '150', '163', '177', '190', '204', '220', '252', '286', '300', '340', '400', '450', '500'];

export const JPCarsVehicleBuilder = ({ 
  onSubmit, 
  disabled, 
  loading,
  selectedOptions,
  onToggleOption,
  keywords,
  onKeywordsChange,
}: JPCarsVehicleBuilderProps) => {
  const [state, setState] = useState<BuilderState>({
    make: '',
    model: '',
    fuel: '',
    gear: '',
    hp: '',
    body: '',
    build: '',
    mileage: 0,
    trim: '',
  });

  const [models, setModels] = useState<string[]>([]);
  const [hpOptions, setHpOptions] = useState<string[]>(HP_OPTIONS_FALLBACK);
  const [isLoadingHp, setIsLoadingHp] = useState(false);

  // Update models when make changes
  useEffect(() => {
    if (state.make) {
      const makeModels = VEHICLE_BRANDS[state.make] || [];
      setModels(makeModels);
    } else {
      setModels([]);
    }
  }, [state.make]);

  // Load HP options from JP Cars API
  useEffect(() => {
    const loadHpOptions = async () => {
      if (!state.make || !state.model || !state.fuel || !state.gear) {
        setHpOptions(HP_OPTIONS_FALLBACK);
        return;
      }

      setIsLoadingHp(true);
      try {
        const { data, error } = await supabase.functions.invoke('jpcars-values', {
          body: { 
            type: 'hp',
            make: state.make, 
            model: state.model, 
            fuel: state.fuel,
            gear: state.gear
          },
        });

        if (error) throw error;

        if (data?.success && data.values?.length > 0) {
          console.log('✅ JP Cars HP options loaded:', data.values);
          setHpOptions(data.values.map((v: string | number) => String(v)));
        } else {
          console.log('⚠️ No HP options from JP Cars, using fallback');
          setHpOptions(HP_OPTIONS_FALLBACK);
        }
      } catch (err) {
        console.error('Error loading HP options:', err);
        setHpOptions(HP_OPTIONS_FALLBACK);
      } finally {
        setIsLoadingHp(false);
      }
    };

    loadHpOptions();
  }, [state.make, state.model, state.fuel, state.gear]);

  const handleSelect = (field: keyof BuilderState, value: string) => {
    const updates: Partial<BuilderState> = { [field]: value };
    
    // Reset dependent fields
    if (field === 'make') {
      updates.model = '';
      updates.fuel = '';
      updates.gear = '';
      updates.hp = '';
      updates.body = '';
      updates.build = '';
      updates.trim = '';
    } else if (field === 'model') {
      updates.fuel = '';
      updates.gear = '';
      updates.hp = '';
      updates.body = '';
      updates.build = '';
      updates.trim = '';
    }
    
    setState(prev => ({ ...prev, ...updates }));
  };

  const handleMileageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
    setState(prev => ({ ...prev, mileage: value }));
  };

  const handleTrimChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, trim: e.target.value }));
  };

  const handleReset = () => {
    setState({
      make: '',
      model: '',
      fuel: '',
      gear: '',
      hp: '',
      body: '',
      build: '',
      mileage: 0,
      trim: '',
    });
  };

  const mapTransmission = (gear: string): 'Automaat' | 'Handgeschakeld' | 'Onbekend' => {
    if (gear === 'Automaat') return 'Automaat';
    if (gear === 'Handgeschakeld') return 'Handgeschakeld';
    return 'Onbekend';
  };

  const handleSubmit = () => {
    const vehicleData: TaxatieVehicleData = {
      brand: state.make,
      model: state.model,
      buildYear: parseInt(state.build, 10),
      mileage: state.mileage,
      fuelType: state.fuel,
      transmission: mapTransmission(state.gear),
      bodyType: state.body,
      power: parseInt(state.hp, 10) || 0,
      trim: state.trim,
      color: '',
      options: selectedOptions,
      keywords: keywords,
    };

    console.log('🚗 JP Cars builder submitting:', vehicleData);
    console.log('🎯 With options:', selectedOptions);
    console.log('🏷️ With keywords:', keywords);
    onSubmit(vehicleData);
  };

  const isComplete = state.make && state.model && state.fuel && state.gear && 
                     state.hp && state.build && state.mileage > 0;

  const completedSteps = [state.make, state.model, state.fuel, state.gear, state.hp, state.build, state.mileage > 0].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Stap {completedSteps + 1} van 7</span>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(completedSteps / 7) * 100}%` }}
          />
        </div>
      </div>

      {/* Selected values badges */}
      {(state.make || state.model) && (
        <div className="flex flex-wrap gap-2">
          {state.make && <Badge variant="secondary">{state.make}</Badge>}
          {state.model && <Badge variant="secondary">{state.model}</Badge>}
          {state.trim && <Badge variant="default">{state.trim}</Badge>}
          {state.fuel && <Badge variant="secondary">{state.fuel}</Badge>}
          {state.gear && <Badge variant="secondary">{state.gear}</Badge>}
          {state.hp && <Badge variant="secondary">{state.hp} PK</Badge>}
          {state.body && <Badge variant="secondary">{state.body}</Badge>}
          {state.build && <Badge variant="secondary">{state.build}</Badge>}
          {state.mileage > 0 && <Badge variant="secondary">{state.mileage.toLocaleString('nl-NL')} km</Badge>}
        </div>
      )}

      {/* Form fields */}
      <div className="space-y-3">
        {/* Make */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Merk *</label>
          <Select value={state.make} onValueChange={(v) => handleSelect('make', v)} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Selecteer merk" />
            </SelectTrigger>
            <SelectContent>
              {MAKES.map((value) => (
                <SelectItem key={value} value={value}>{value}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model */}
        {state.make && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Model *</label>
            <Select value={state.model} onValueChange={(v) => handleSelect('model', v)} disabled={disabled || models.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((value) => (
                  <SelectItem key={value} value={value}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Trim / Uitvoering - NIEUW EN BELANGRIJK */}
        {state.model && (
          <div className="space-y-1">
            <label className="text-sm font-medium flex items-center gap-2">
              Uitvoering / Motortype
              <Badge variant="outline" className="text-xs">Belangrijk!</Badge>
            </label>
            <Input
              placeholder="bijv. B4, T5, R-Design, M Sport, GTI, 2.0 TDI"
              value={state.trim}
              onChange={handleTrimChange}
              disabled={disabled}
              className="font-medium"
            />
            <p className="text-xs text-muted-foreground">
              Kritiek voor accurate vergelijking (B4 ≠ T5, 1.5T ≠ 2.0T)
            </p>
          </div>
        )}

        {/* Fuel */}
        {state.model && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Brandstof *</label>
            <Select value={state.fuel} onValueChange={(v) => handleSelect('fuel', v)} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer brandstof" />
              </SelectTrigger>
              <SelectContent>
                {FUELS.map((value) => (
                  <SelectItem key={value} value={value}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Gear */}
        {state.fuel && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Transmissie *</label>
            <Select value={state.gear} onValueChange={(v) => handleSelect('gear', v)} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer transmissie" />
              </SelectTrigger>
              <SelectContent>
                {GEARS.map((value) => (
                  <SelectItem key={value} value={value}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* HP - Dynamic from JP Cars */}
        {state.gear && (
          <div className="space-y-1">
            <label className="text-sm font-medium flex items-center gap-2">
              Vermogen *
              {isLoadingHp && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </label>
            <Select value={state.hp} onValueChange={(v) => handleSelect('hp', v)} disabled={disabled || isLoadingHp}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingHp ? "Laden..." : "Selecteer vermogen"} />
              </SelectTrigger>
              <SelectContent>
                {hpOptions.map((value) => (
                  <SelectItem key={value} value={value}>{value} PK</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Body */}
        {state.hp && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Carrosserie</label>
            <Select value={state.body} onValueChange={(v) => handleSelect('body', v)} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer carrosserie" />
              </SelectTrigger>
              <SelectContent>
                {BODIES.map((value) => (
                  <SelectItem key={value} value={value}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Build year */}
        {state.hp && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Bouwjaar *</label>
            <Select value={state.build} onValueChange={(v) => handleSelect('build', v)} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer bouwjaar" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((value) => (
                  <SelectItem key={value} value={value}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Mileage */}
        {state.build && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Kilometerstand *</label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Bijv. 45000"
                value={state.mileage > 0 ? state.mileage.toLocaleString('nl-NL') : ''}
                onChange={handleMileageChange}
                disabled={disabled}
              />
              <span className="text-sm text-muted-foreground">km</span>
            </div>
          </div>
        )}

        {/* Opties & Keywords - KRITIEK voor accurate taxatie */}
        {state.build && state.mileage > 0 && (
          <div className="border-t pt-4 mt-4">
            <OptionsSelector
              selectedOptions={selectedOptions}
              onToggleOption={onToggleOption}
              keywords={keywords}
              onKeywordsChange={onKeywordsChange}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={disabled || loading}
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isComplete || disabled || loading}
          className="flex-1 flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Car className="h-4 w-4" />
              Voertuig Laden
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Handmatige invoer voor buitenlandse of onbekende kentekens
      </p>
    </div>
  );
};

export default JPCarsVehicleBuilder;
