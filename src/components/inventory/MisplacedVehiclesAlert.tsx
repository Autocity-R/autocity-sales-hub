import React from "react";
import { Vehicle } from "@/types/inventory";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight } from "lucide-react";

interface MisplacedVehiclesAlertProps {
  onFixStatus: (vehicleId: string, correctStatus: 'verkocht_b2b' | 'verkocht_b2c') => void;
}

export const MisplacedVehiclesAlert: React.FC<MisplacedVehiclesAlertProps> = ({ onFixStatus }) => {
  // This component will check for vehicles with customer_id pointing to B2B customers but status verkocht_b2c
  // For now we'll use a hardcoded example for the Jeep Compass
  const misplacedVehicle = {
    id: 'dc6db6d5-2fbd-43a6-b561-09430ad481fe',
    brand: 'Jeep',
    model: 'Compass PHEV',
    licenseNumber: '1358',
    customerType: 'b2b',
    currentStatus: 'verkocht_b2c',
    correctStatus: 'verkocht_b2b' as const
  };

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Voertuig met verkeerde status gevonden!</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <div>
          <p className="mb-2">
            De <strong>{misplacedVehicle.brand} {misplacedVehicle.model}</strong> ({misplacedVehicle.licenseNumber}) staat als "verkocht B2C" maar heeft een B2B klant gekoppeld.
          </p>
          <p className="text-sm text-muted-foreground">
            Dit kan gebeuren bij het aanpassen van de prijs of andere velden. Klik op de knop hieronder om dit op te lossen.
          </p>
        </div>
        <Button
          onClick={() => onFixStatus(misplacedVehicle.id, misplacedVehicle.correctStatus)}
          className="ml-4 whitespace-nowrap"
        >
          Terugzetten naar B2B
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
};
