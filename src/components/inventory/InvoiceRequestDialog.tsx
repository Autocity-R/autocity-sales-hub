import React, { useState } from "react";
import { Vehicle } from "@/types/inventory";
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Factuur aanvragen</DialogTitle>
          <DialogDescription>
            Selecteer hoe de verkoopprijs moet worden gefactureerd
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
