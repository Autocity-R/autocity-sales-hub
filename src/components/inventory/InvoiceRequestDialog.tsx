import React, { useState, useEffect } from "react";
import { Vehicle } from "@/types/inventory";
import { SavedContractMetadata, getLatestContractForVehicle } from "@/services/contractStorageService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InvoiceRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bpmIncluded: boolean) => void;
  vehicle: Vehicle | null;
}

export const InvoiceRequestDialog: React.FC<InvoiceRequestDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  vehicle,
}) => {
  const [bpmChoice, setBpmChoice] = useState<string>("");
  const [contractMetadata, setContractMetadata] = useState<SavedContractMetadata | null>(null);
  const [hasContract, setHasContract] = useState(false);

  useEffect(() => {
    const loadContractData = async () => {
      if (!vehicle || !isOpen) return;
      
      const latestContract = await getLatestContractForVehicle(vehicle.id);
      
      if (latestContract?.metadata) {
        setContractMetadata(latestContract.metadata);
        setHasContract(true);
      } else {
        setContractMetadata(null);
        setHasContract(false);
      }
    };
    
    loadContractData();
  }, [vehicle, isOpen]);

  const handleConfirm = () => {
    if (bpmChoice === "") return;
    onConfirm(bpmChoice === "inclusief");
    setBpmChoice("");
    onClose();
  };

  const handleClose = () => {
    setBpmChoice("");
    onClose();
  };

  if (!vehicle) return null;

  const tradeInVehicle = contractMetadata?.contractOptions?.tradeInVehicle;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Factuur aanvragen</DialogTitle>
          <DialogDescription>
            Controleer de gegevens en selecteer hoe de verkoopprijs moet worden gefactureerd
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Waarschuwing als er geen contract is */}
          {!hasContract && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Geen koopcontract gevonden. De facturatie aanvraag wordt verzonden zonder contract als bijlage.
              </AlertDescription>
            </Alert>
          )}

          {/* Contract preview */}
          {hasContract && contractMetadata && (
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg border-2 border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-semibold text-base">Opgeslagen contract</span>
                <Badge variant="outline" className="ml-auto">
                  {contractMetadata.contractType === 'b2b' ? 'B2B' : 'B2C'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Opgeslagen:</span>
                  <span className="ml-2">{new Date(contractMetadata.savedAt).toLocaleDateString('nl-NL')}</span>
                </div>
                {contractMetadata.contractOptions?.btwType && (
                  <div>
                    <span className="text-muted-foreground">BTW:</span>
                    <span className="ml-2 capitalize">{contractMetadata.contractOptions.btwType}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Inruil info */}
          {tradeInVehicle && (
            <div className="space-y-2 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-amber-500 text-white">Inruil</Badge>
                <span className="font-semibold">Inruil voertuig in contract</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Merk/Model:</span>
                  <span className="ml-2">{tradeInVehicle.brand} {tradeInVehicle.model}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Kenteken:</span>
                  <span className="ml-2 font-mono">{tradeInVehicle.licenseNumber}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">KM-stand:</span>
                  <span className="ml-2">{tradeInVehicle.mileage.toLocaleString('nl-NL')} km</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Inruilprijs:</span>
                  <Badge variant="secondary">
                    {new Intl.NumberFormat('nl-NL', { 
                      style: 'currency', 
                      currency: 'EUR' 
                    }).format(tradeInVehicle.tradeInPrice)}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Voertuig informatie */}
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Voertuig:</span>
              <span className="text-sm">{vehicle.brand} {vehicle.model}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">VIN:</span>
              <span className="text-sm font-mono">{vehicle.vin}</span>
            </div>
            {vehicle.sellingPrice && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Verkoopprijs:</span>
                <Badge variant="secondary">
                  {new Intl.NumberFormat('nl-NL', { 
                    style: 'currency', 
                    currency: 'EUR' 
                  }).format(vehicle.sellingPrice)}
                </Badge>
              </div>
            )}
          </div>

          {/* BPM Keuze */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              Facturatie type
            </Label>
            <RadioGroup value={bpmChoice} onValueChange={setBpmChoice}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="inclusief" id="inclusief" />
                <Label htmlFor="inclusief" className="flex-1 cursor-pointer font-normal">
                  Inclusief BPM
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="exclusief" id="exclusief" />
                <Label htmlFor="exclusief" className="flex-1 cursor-pointer font-normal">
                  Exclusief BPM
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Annuleren
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={bpmChoice === ""}
          >
            Versturen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};