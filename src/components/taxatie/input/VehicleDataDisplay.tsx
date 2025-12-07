import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, Calendar, Gauge, Fuel, Settings2, Zap, Palette } from 'lucide-react';
import type { TaxatieVehicleData } from '@/types/taxatie';

interface VehicleDataDisplayProps {
  vehicleData: TaxatieVehicleData;
}

export const VehicleDataDisplay = ({ vehicleData }: VehicleDataDisplayProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Car className="h-5 w-5" />
          Voertuiggegevens
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Merk/Model:</span>
          </div>
          <div className="font-medium">
            {vehicleData.brand} {vehicleData.model}
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Bouwjaar:</span>
          </div>
          <div className="font-medium">{vehicleData.buildYear}</div>

          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">KM-stand:</span>
          </div>
          <div className="font-medium">{vehicleData.mileage.toLocaleString()} km</div>

          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Brandstof:</span>
          </div>
          <div className="font-medium">{vehicleData.fuelType}</div>

          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Transmissie:</span>
          </div>
          <div className="font-medium">{vehicleData.transmission}</div>

          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Vermogen:</span>
          </div>
          <div className="font-medium">{vehicleData.power} pk</div>

          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Kleur:</span>
          </div>
          <div className="font-medium">{vehicleData.color}</div>
        </div>

        {vehicleData.trim && (
          <div className="pt-2 border-t">
            <Badge variant="secondary">{vehicleData.trim}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
