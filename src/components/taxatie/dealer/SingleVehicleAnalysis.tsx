import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Play, Car, FileText, Loader2 } from 'lucide-react';
import { VEHICLE_BRANDS, FUEL_TYPES, TRANSMISSION_TYPES, BODY_TYPES } from '@/data/vehicleData';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { VehicleInput } from '@/types/dealerAnalysis';

const MAKES = Object.keys(VEHICLE_BRANDS);
const YEARS = Array.from({ length: 15 }, (_, i) => (new Date().getFullYear() - i).toString());
const HP_OPTIONS_FALLBACK = ['75', '90', '100', '110', '120', '130', '140', '150', '163', '177', '190', '204', '220', '252', '286', '300', '340', '400', '450', '500'];

interface JPCarsOption {
  id: string;
  label: string;
  jpcarsKey?: string;
  category?: string;
}

interface SingleVehicleAnalysisProps {
  onAddVehicle: (vehicle: VehicleInput) => void;
  vehicles: VehicleInput[];
  onStartAnalysis: () => void;
  isProcessing: boolean;
  onLookupRDW?: (licensePlate: string) => Promise<VehicleInput | null>;
}

export const SingleVehicleAnalysis = ({
  onAddVehicle,
  vehicles,
  onStartAnalysis,
  isProcessing,
  onLookupRDW,
}: SingleVehicleAnalysisProps) => {
  // Manual input state
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [buildYear, setBuildYear] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [transmission, setTransmission] = useState('');
  const [power, setPower] = useState('');
  const [bodyType, setBodyType] = useState('');

  // Options state
  const [availableOptions, setAvailableOptions] = useState<JPCarsOption[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  // Dynamic HP options state
  const [hpOptions, setHpOptions] = useState<string[]>(HP_OPTIONS_FALLBACK);
  const [isLoadingHp, setIsLoadingHp] = useState(false);

  // License plate input state
  const [licensePlate, setLicensePlate] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [rdwResult, setRdwResult] = useState<VehicleInput | null>(null);

  const models = make ? VEHICLE_BRANDS[make] || [] : [];

  // Auto-load HP options when make, model, fuel, and transmission are selected
  useEffect(() => {
    const loadHpOptions = async () => {
      if (!make || !model || !fuelType || !transmission) {
        setHpOptions(HP_OPTIONS_FALLBACK);
        return;
      }

      setIsLoadingHp(true);
      setPower(''); // Reset power when dependencies change
      try {
        const { data, error } = await supabase.functions.invoke('jpcars-values', {
          body: { 
            type: 'hp',
            make, 
            model, 
            fuel: fuelType,
            gear: transmission
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
  }, [make, model, fuelType, transmission]);

  // Auto-load options from JP Cars API when all required fields are selected
  useEffect(() => {
    const loadOptions = async () => {
      if (!make || !fuelType) {
        setAvailableOptions([]);
        return;
      }

      setIsLoadingOptions(true);
      try {
        const { data, error } = await supabase.functions.invoke('jpcars-values', {
          body: { 
            type: 'options',
            make, 
            model: model || undefined, 
            fuel: fuelType,
            gear: transmission || undefined,
            build: buildYear ? parseInt(buildYear) : undefined,
          },
        });

        if (error) throw error;

        if (data?.success && data.values?.length > 0) {
          console.log('✅ JP Cars options loaded:', data.values.length);
          const options: JPCarsOption[] = data.values.map((opt: string) => ({
            id: opt.toLowerCase().replace(/\s+/g, '_'),
            label: opt.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
            jpcarsKey: opt,
          }));
          setAvailableOptions(options);
        } else {
          setAvailableOptions([]);
        }
      } catch (err) {
        console.error('Error loading JP Cars options:', err);
        setAvailableOptions([]);
      } finally {
        setIsLoadingOptions(false);
      }
    };

    loadOptions();
  }, [make, model, fuelType, transmission, buildYear]);

  const toggleOption = (optionKey: string) => {
    setSelectedOptions(prev => 
      prev.includes(optionKey) 
        ? prev.filter(key => key !== optionKey)
        : [...prev, optionKey]
    );
  };

  const handleAddVehicle = () => {
    if (!make || !model || !buildYear || !fuelType || !transmission || !power) return;

    onAddVehicle({
      brand: make,
      model,
      buildYear: parseInt(buildYear),
      fuelType,
      transmission,
      power: parseInt(power),
      bodyType: bodyType || undefined,
      options: selectedOptions.length > 0 ? selectedOptions : undefined,
    });

    // Reset form
    setMake('');
    setModel('');
    setBuildYear('');
    setFuelType('');
    setTransmission('');
    setPower('');
    setBodyType('');
    setSelectedOptions([]);
    setAvailableOptions([]);
  };

  const handleLookupLicensePlate = async () => {
    if (!licensePlate.trim() || !onLookupRDW) return;

    setIsLookingUp(true);
    setRdwResult(null);

    try {
      const result = await onLookupRDW(licensePlate);
      if (result) {
        setRdwResult(result);
        toast.success(`${result.brand} ${result.model} gevonden`);
      } else {
        toast.error('Kenteken niet gevonden');
      }
    } catch (err) {
      toast.error('Fout bij RDW opzoeken');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleAddRdwVehicle = () => {
    if (!rdwResult) return;
    onAddVehicle(rdwResult);
    setLicensePlate('');
    setRdwResult(null);
    toast.success('Voertuig toegevoegd aan lijst');
  };

  const isComplete = make && model && buildYear && fuelType && transmission && power;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Input form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Voertuig Toevoegen
          </CardTitle>
          <CardDescription>
            Voer kenteken of voertuigdetails in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="kenteken" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="kenteken" className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                Kenteken
              </TabsTrigger>
              <TabsTrigger value="handmatig" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Handmatig
              </TabsTrigger>
            </TabsList>

            {/* Kenteken tab */}
            <TabsContent value="kenteken" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Kenteken</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="AA-123-BB"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                    className="flex-1 font-mono text-lg"
                  />
                  <Button 
                    onClick={handleLookupLicensePlate}
                    disabled={!licensePlate.trim() || isLookingUp || !onLookupRDW}
                  >
                    {isLookingUp ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {rdwResult && (
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-600">Gevonden</Badge>
                    <span className="font-semibold">{rdwResult.brand} {rdwResult.model}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Bouwjaar:</span>{' '}
                      <span className="font-medium">{rdwResult.buildYear}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Brandstof:</span>{' '}
                      <span className="font-medium">{rdwResult.fuelType}</span>
                    </div>
                    {rdwResult.power && (
                      <div>
                        <span className="text-muted-foreground">Vermogen:</span>{' '}
                        <span className="font-medium">{rdwResult.power} PK</span>
                      </div>
                    )}
                    {rdwResult.bodyType && (
                      <div>
                        <span className="text-muted-foreground">Carrosserie:</span>{' '}
                        <span className="font-medium">{rdwResult.bodyType}</span>
                      </div>
                    )}
                  </div>
                  <Button onClick={handleAddRdwVehicle} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Toevoegen aan Lijst
                  </Button>
                </div>
              )}

              {!rdwResult && !isLookingUp && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Voer een kenteken in om voertuiggegevens op te halen via RDW
                </p>
              )}
            </TabsContent>

            {/* Handmatig tab */}
            <TabsContent value="handmatig" className="space-y-4">
              {/* Make */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Merk *</label>
                <Select value={make} onValueChange={(v) => { 
                  setMake(v); 
                  setModel(''); 
                  setAvailableOptions([]);
                  setSelectedOptions([]);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer merk" />
                  </SelectTrigger>
                  <SelectContent>
                    {MAKES.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Model */}
              {make && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Model *</label>
                  <Select value={model} onValueChange={(v) => {
                    setModel(v);
                    setSelectedOptions([]);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Fuel Type */}
              {model && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Brandstof *</label>
                  <Select value={fuelType} onValueChange={setFuelType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer brandstof" />
                    </SelectTrigger>
                    <SelectContent>
                      {FUEL_TYPES.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Transmission */}
              {fuelType && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Transmissie *</label>
                  <Select value={transmission} onValueChange={setTransmission}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer transmissie" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSMISSION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Power (PK) - Dynamic from JP Cars */}
              {transmission && (
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    Vermogen (PK) *
                    {isLoadingHp && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </label>
                  <Select value={power} onValueChange={setPower} disabled={isLoadingHp}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingHp ? "Laden..." : "Selecteer vermogen"} />
                    </SelectTrigger>
                    <SelectContent>
                      {hpOptions.map((hp) => (
                        <SelectItem key={hp} value={hp}>{hp} PK</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Body Type (Carrosserie) - NEW */}
              {power && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Carrosserie</label>
                  <Select value={bodyType} onValueChange={setBodyType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer carrosserie (optioneel)" />
                    </SelectTrigger>
                    <SelectContent>
                      {BODY_TYPES.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Build Year */}
              {power && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bouwjaar *</label>
                  <Select value={buildYear} onValueChange={setBuildYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer bouwjaar" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* JP Cars Options Section - Compact Grid from API */}
              {fuelType && (
                <div className="border-t pt-3 mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">JP Cars Opties</label>
                    {isLoadingOptions && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </div>

                  {availableOptions.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1 max-h-32 overflow-y-auto p-0.5">
                      {availableOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleOption(opt.jpcarsKey || opt.id)}
                          className={`
                            text-[10px] px-1.5 py-1 rounded border truncate transition-all text-left
                            ${(selectedOptions.includes(opt.jpcarsKey || '') || selectedOptions.includes(opt.id))
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/30 border-border hover:bg-muted hover:border-primary/50'
                            }
                          `}
                          title={opt.label}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  ) : !isLoadingOptions ? (
                    <p className="text-[10px] text-muted-foreground">Geen opties beschikbaar</p>
                  ) : null}

                  {selectedOptions.length > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      {selectedOptions.length} geselecteerd
                    </p>
                  )}
                </div>
              )}

              {/* Add button */}
              <Button
                onClick={handleAddVehicle}
                disabled={!isComplete}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Toevoegen aan Lijst
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Vehicle list */}
      <Card>
        <CardHeader>
          <CardTitle>Voertuigen te Analyseren</CardTitle>
          <CardDescription>
            {vehicles.length === 0
              ? 'Voeg voertuigen toe om te analyseren'
              : `${vehicles.length} voertuig${vehicles.length !== 1 ? 'en' : ''} in wachtrij`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {vehicles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nog geen voertuigen toegevoegd</p>
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {vehicles.map((v, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col p-3 bg-muted rounded-lg gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{v.brand}</Badge>
                        <span className="font-medium">{v.model}</span>
                        <span className="text-muted-foreground">{v.buildYear}</span>
                        {v.licensePlate && (
                          <Badge variant="secondary" className="font-mono">
                            {v.licensePlate}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{v.fuelType}</Badge>
                        <Badge variant="secondary">{v.transmission}</Badge>
                        {v.power && (
                          <Badge variant="secondary">{v.power} PK</Badge>
                        )}
                      </div>
                    </div>
                    {v.options && v.options.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">Opties:</span>
                        {v.options.slice(0, 3).map((opt) => (
                          <Badge key={opt} variant="outline" className="text-xs">
                            {opt.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                        {v.options.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{v.options.length - 3} meer
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button
                onClick={onStartAnalysis}
                disabled={isProcessing || vehicles.length === 0}
                className="w-full"
                size="lg"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Dealer Analyse ({vehicles.length})
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
