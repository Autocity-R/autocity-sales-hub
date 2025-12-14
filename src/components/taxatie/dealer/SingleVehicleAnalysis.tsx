import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Trash2, Play } from 'lucide-react';
import { VEHICLE_BRANDS, FUEL_TYPES, TRANSMISSION_TYPES } from '@/data/vehicleData';
import type { VehicleInput } from '@/types/dealerAnalysis';

const MAKES = Object.keys(VEHICLE_BRANDS);
const YEARS = Array.from({ length: 15 }, (_, i) => (new Date().getFullYear() - i).toString());

interface SingleVehicleAnalysisProps {
  onAddVehicle: (vehicle: VehicleInput) => void;
  vehicles: VehicleInput[];
  onStartAnalysis: () => void;
  isProcessing: boolean;
}

export const SingleVehicleAnalysis = ({
  onAddVehicle,
  vehicles,
  onStartAnalysis,
  isProcessing,
}: SingleVehicleAnalysisProps) => {
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [buildYear, setBuildYear] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [transmission, setTransmission] = useState('');

  const models = make ? VEHICLE_BRANDS[make] || [] : [];

  const handleAddVehicle = () => {
    if (!make || !model || !buildYear || !fuelType || !transmission) return;

    onAddVehicle({
      brand: make,
      model,
      buildYear: parseInt(buildYear),
      fuelType,
      transmission,
    });

    // Reset form
    setMake('');
    setModel('');
    setBuildYear('');
    setFuelType('');
    setTransmission('');
  };

  const isComplete = make && model && buildYear && fuelType && transmission;

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
            Voer voertuigdetails in om dealers te vinden
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Make */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Merk *</label>
            <Select value={make} onValueChange={(v) => { setMake(v); setModel(''); }}>
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
              <Select value={model} onValueChange={setModel}>
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

          {/* Build Year */}
          {model && (
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

          {/* Fuel Type */}
          {buildYear && (
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

          {/* Add button */}
          <Button
            onClick={handleAddVehicle}
            disabled={!isComplete}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Toevoegen aan Lijst
          </Button>
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
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{v.brand}</Badge>
                      <span className="font-medium">{v.model}</span>
                      <span className="text-muted-foreground">{v.buildYear}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{v.fuelType}</Badge>
                      <Badge variant="secondary">{v.transmission}</Badge>
                    </div>
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
