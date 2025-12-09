import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Car, ChevronRight, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import type { TaxatieVehicleData } from '@/types/taxatie';

interface JPCarsVehicleBuilderProps {
  onSubmit: (data: TaxatieVehicleData) => void;
  disabled?: boolean;
  loading?: boolean;
}

type ValueType = 'make' | 'model' | 'fuel' | 'gear' | 'hp' | 'body' | 'build';

interface BuilderState {
  make: string;
  model: string;
  fuel: string;
  gear: string;
  hp: string;
  body: string;
  build: string;
  mileage: number;
}

const STEP_LABELS: Record<ValueType, string> = {
  make: 'Merk',
  model: 'Model',
  fuel: 'Brandstof',
  gear: 'Transmissie',
  hp: 'Vermogen (PK)',
  body: 'Carrosserie',
  build: 'Bouwjaar',
};

const STEPS: ValueType[] = ['make', 'model', 'fuel', 'gear', 'hp', 'body', 'build'];

export const JPCarsVehicleBuilder = ({ onSubmit, disabled, loading }: JPCarsVehicleBuilderProps) => {
  const [state, setState] = useState<BuilderState>({
    make: '',
    model: '',
    fuel: '',
    gear: '',
    hp: '',
    body: '',
    build: '',
    mileage: 0,
  });

  const [options, setOptions] = useState<Record<ValueType, string[]>>({
    make: [],
    model: [],
    fuel: [],
    gear: [],
    hp: [],
    body: [],
    build: [],
  });

  const [loadingStep, setLoadingStep] = useState<ValueType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchValues = useCallback(async (type: ValueType) => {
    setLoadingStep(type);
    setError(null);

    try {
      const params: Record<string, string | number> = { type };
      
      if (state.make && type !== 'make') params.make = state.make;
      if (state.model && ['fuel', 'gear', 'hp', 'body', 'build'].includes(type)) params.model = state.model;
      if (state.fuel && ['gear', 'hp', 'body', 'build'].includes(type)) params.fuel = state.fuel;
      if (state.gear && ['hp', 'body', 'build'].includes(type)) params.gear = state.gear;
      if (state.body && ['hp', 'build'].includes(type)) params.body = state.body;

      console.log(`📋 Fetching JP Cars values for ${type}:`, params);

      const { data, error: fetchError } = await supabase.functions.invoke('jpcars-values', {
        body: params,
      });

      if (fetchError) {
        console.error(`❌ Error fetching ${type}:`, fetchError);
        setError(`Fout bij laden ${STEP_LABELS[type]}`);
        return;
      }

      if (data?.success && data?.values) {
        console.log(`✅ Received ${data.values.length} options for ${type}`);
        setOptions(prev => ({ ...prev, [type]: data.values }));
      } else {
        console.warn(`⚠️ No values returned for ${type}:`, data);
        setOptions(prev => ({ ...prev, [type]: [] }));
      }
    } catch (err) {
      console.error(`❌ Failed to fetch ${type}:`, err);
      setError(`Fout bij laden ${STEP_LABELS[type]}`);
    } finally {
      setLoadingStep(null);
    }
  }, [state]);

  // Load makes on mount
  useEffect(() => {
    fetchValues('make');
  }, []);

  // Load next options when selection changes
  useEffect(() => {
    if (state.make && options.model.length === 0) {
      fetchValues('model');
    }
  }, [state.make]);

  useEffect(() => {
    if (state.model) {
      fetchValues('fuel');
    }
  }, [state.model]);

  useEffect(() => {
    if (state.fuel) {
      fetchValues('gear');
    }
  }, [state.fuel]);

  useEffect(() => {
    if (state.gear) {
      fetchValues('hp');
      fetchValues('body');
    }
  }, [state.gear]);

  useEffect(() => {
    if (state.hp || state.body) {
      fetchValues('build');
    }
  }, [state.hp, state.body]);

  const handleSelect = (type: ValueType, value: string) => {
    // Reset dependent fields
    const stepIndex = STEPS.indexOf(type);
    const resetFields: Partial<BuilderState> = {};
    
    for (let i = stepIndex + 1; i < STEPS.length; i++) {
      resetFields[STEPS[i] as keyof BuilderState] = '' as never;
    }

    // Reset options for dependent fields
    const resetOptions: Partial<Record<ValueType, string[]>> = {};
    for (let i = stepIndex + 1; i < STEPS.length; i++) {
      resetOptions[STEPS[i]] = [];
    }

    setState(prev => ({ ...prev, [type]: value, ...resetFields }));
    setOptions(prev => ({ ...prev, ...resetOptions }));
  };

  const handleMileageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
    setState(prev => ({ ...prev, mileage: value }));
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
    });
    setOptions({
      make: options.make, // Keep makes loaded
      model: [],
      fuel: [],
      gear: [],
      hp: [],
      body: [],
      build: [],
    });
    setError(null);
  };

  const handleSubmit = () => {
    const vehicleData: TaxatieVehicleData = {
      brand: state.make,
      model: state.model,
      buildYear: parseInt(state.build, 10),
      mileage: state.mileage,
      fuelType: mapFuelType(state.fuel),
      transmission: mapTransmission(state.gear),
      bodyType: state.body,
      power: parseInt(state.hp, 10) || 0,
      trim: '',
      color: '',
      options: [],
      keywords: [],
    };

    console.log('🚗 JP Cars builder submitting:', vehicleData);
    onSubmit(vehicleData);
  };

  const isComplete = state.make && state.model && state.fuel && state.gear && 
                     state.hp && state.build && state.mileage > 0;

  const getCompletedSteps = () => {
    return STEPS.filter(step => state[step as keyof BuilderState]).length;
  };

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Stap {getCompletedSteps() + 1} van {STEPS.length + 1}</span>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((getCompletedSteps() + (state.mileage > 0 ? 1 : 0)) / (STEPS.length + 1)) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Selected values badges */}
      {(state.make || state.model) && (
        <div className="flex flex-wrap gap-2">
          {state.make && <Badge variant="secondary">{state.make}</Badge>}
          {state.model && <Badge variant="secondary">{state.model}</Badge>}
          {state.fuel && <Badge variant="secondary">{mapFuelType(state.fuel)}</Badge>}
          {state.gear && <Badge variant="secondary">{mapTransmission(state.gear)}</Badge>}
          {state.hp && <Badge variant="secondary">{state.hp} PK</Badge>}
          {state.body && <Badge variant="secondary">{state.body}</Badge>}
          {state.build && <Badge variant="secondary">{state.build}</Badge>}
          {state.mileage > 0 && <Badge variant="secondary">{state.mileage.toLocaleString('nl-NL')} km</Badge>}
        </div>
      )}

      {/* Cascading dropdowns */}
      <div className="space-y-3">
        {/* Make */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Merk *</label>
          <Select
            value={state.make}
            onValueChange={(v) => handleSelect('make', v)}
            disabled={disabled || loadingStep === 'make'}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingStep === 'make' ? 'Laden...' : 'Selecteer merk'} />
            </SelectTrigger>
            <SelectContent>
              {options.make.map((value) => (
                <SelectItem key={value} value={value}>{value}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model */}
        {state.make && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Model *</label>
            <Select
              value={state.model}
              onValueChange={(v) => handleSelect('model', v)}
              disabled={disabled || loadingStep === 'model' || options.model.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingStep === 'model' ? 'Laden...' : 'Selecteer model'} />
              </SelectTrigger>
              <SelectContent>
                {options.model.map((value) => (
                  <SelectItem key={value} value={value}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Fuel */}
        {state.model && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Brandstof *</label>
            <Select
              value={state.fuel}
              onValueChange={(v) => handleSelect('fuel', v)}
              disabled={disabled || loadingStep === 'fuel' || options.fuel.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingStep === 'fuel' ? 'Laden...' : 'Selecteer brandstof'} />
              </SelectTrigger>
              <SelectContent>
                {options.fuel.map((value) => (
                  <SelectItem key={value} value={value}>{mapFuelType(value)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Gear */}
        {state.fuel && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Transmissie *</label>
            <Select
              value={state.gear}
              onValueChange={(v) => handleSelect('gear', v)}
              disabled={disabled || loadingStep === 'gear' || options.gear.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingStep === 'gear' ? 'Laden...' : 'Selecteer transmissie'} />
              </SelectTrigger>
              <SelectContent>
                {options.gear.map((value) => (
                  <SelectItem key={value} value={value}>{mapTransmission(value)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* HP */}
        {state.gear && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Vermogen *</label>
            <Select
              value={state.hp}
              onValueChange={(v) => handleSelect('hp', v)}
              disabled={disabled || loadingStep === 'hp' || options.hp.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingStep === 'hp' ? 'Laden...' : 'Selecteer vermogen'} />
              </SelectTrigger>
              <SelectContent>
                {options.hp.map((value) => (
                  <SelectItem key={value} value={value}>{value} PK</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Body (optional but helpful) */}
        {state.gear && options.body.length > 0 && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Carrosserie</label>
            <Select
              value={state.body}
              onValueChange={(v) => handleSelect('body', v)}
              disabled={disabled || loadingStep === 'body'}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingStep === 'body' ? 'Laden...' : 'Selecteer carrosserie'} />
              </SelectTrigger>
              <SelectContent>
                {options.body.map((value) => (
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
            <Select
              value={state.build}
              onValueChange={(v) => handleSelect('build', v)}
              disabled={disabled || loadingStep === 'build' || options.build.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingStep === 'build' ? 'Laden...' : 'Selecteer bouwjaar'} />
              </SelectTrigger>
              <SelectContent>
                {options.build.map((value) => (
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
        ✓ Alle waarden komen direct uit JP Cars catalogus
      </p>
    </div>
  );
};

// Helper functions to map JP Cars values to display values
function mapFuelType(fuel: string): string {
  const mapping: Record<string, string> = {
    'PETROL': 'Benzine',
    'DIESEL': 'Diesel',
    'ELECTRIC': 'Elektrisch',
    'HYBRID': 'Hybride',
    'PLUGIN_HYBRID': 'Plug-in Hybride',
    'LPG': 'LPG',
    'CNG': 'CNG',
  };
  return mapping[fuel] || fuel;
}

function mapTransmission(gear: string): 'Automaat' | 'Handgeschakeld' | 'Onbekend' {
  const lowerGear = gear.toLowerCase();
  if (lowerGear.includes('auto') || lowerGear === 'a') return 'Automaat';
  if (lowerGear.includes('manual') || lowerGear === 'm' || lowerGear.includes('hand')) return 'Handgeschakeld';
  return 'Onbekend';
}
