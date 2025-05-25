
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Vehicle } from "@/types/inventory";
import { ContractOptions } from "@/types/email";
import { FileText, Send, X } from "lucide-react";

interface ContractConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  contractType: "b2b" | "b2c";
  onSendContract: (options: ContractOptions) => void;
}

export const ContractConfigDialog: React.FC<ContractConfigDialogProps> = ({
  isOpen,
  onClose,
  vehicle,
  contractType,
  onSendContract
}) => {
  const [options, setOptions] = useState<ContractOptions>({
    btwType: "inclusive",
    bpmIncluded: false,
    vehicleType: "btw",
    maxDamageAmount: 500,
    deliveryPackage: "standard",
    paymentTerms: "immediate",
    additionalClauses: "",
    specialAgreements: ""
  });

  const handleSend = () => {
    onSendContract(options);
    onClose();
  };

  const isB2B = contractType === "b2b";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Koopcontract Configuratie - {isB2B ? "Zakelijke klant" : "Particuliere klant"}
            <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Vehicle Info */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Voertuig informatie</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Voertuig:</span> {vehicle.brand} {vehicle.model}
              </div>
              <div>
                <span className="font-medium">Kleur:</span> {vehicle.color || "Niet opgegeven"}
              </div>
              <div>
                <span className="font-medium">Kenteken:</span> {vehicle.licenseNumber}
              </div>
              <div>
                <span className="font-medium">Kilometerstand:</span> {vehicle.mileage?.toLocaleString()} km
              </div>
              <div>
                <span className="font-medium">VIN:</span> {vehicle.vin}
              </div>
              <div>
                <span className="font-medium">Verkoopprijs:</span> €{vehicle.sellingPrice?.toLocaleString() || "0"}
              </div>
            </div>
          </div>

          {/* B2B Specific Options */}
          {isB2B && (
            <div className="space-y-4">
              <h4 className="font-medium">Zakelijke klant opties</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>BTW behandeling</Label>
                  <Select 
                    value={options.btwType} 
                    onValueChange={(value: "inclusive" | "exclusive") => 
                      setOptions(prev => ({ ...prev, btwType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inclusive">Inclusief BTW</SelectItem>
                      <SelectItem value="exclusive">Exclusief BTW</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Voertuig type</Label>
                  <Select 
                    value={options.vehicleType} 
                    onValueChange={(value: "marge" | "btw") => 
                      setOptions(prev => ({ ...prev, vehicleType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="btw">BTW voertuig</SelectItem>
                      <SelectItem value="marge">Marge voertuig</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="bpm-included"
                  checked={options.bpmIncluded}
                  onCheckedChange={(checked) => 
                    setOptions(prev => ({ ...prev, bpmIncluded: checked as boolean }))
                  }
                />
                <Label htmlFor="bpm-included">BPM inbegrepen in prijs</Label>
              </div>

              <div>
                <Label>Maximaal schade bedrag (€)</Label>
                <Input
                  type="number"
                  value={options.maxDamageAmount}
                  onChange={(e) => 
                    setOptions(prev => ({ ...prev, maxDamageAmount: parseInt(e.target.value) || 0 }))
                  }
                  placeholder="500"
                />
              </div>
            </div>
          )}

          {/* B2C Specific Options */}
          {!isB2B && (
            <div className="space-y-4">
              <h4 className="font-medium">Particuliere klant opties</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Afleverpakket</Label>
                  <Select 
                    value={options.deliveryPackage} 
                    onValueChange={(value) => 
                      setOptions(prev => ({ ...prev, deliveryPackage: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standaard aflevering</SelectItem>
                      <SelectItem value="premium">Premium pakket</SelectItem>
                      <SelectItem value="deluxe">Deluxe pakket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Betalingsvoorwaarden</Label>
                  <Select 
                    value={options.paymentTerms} 
                    onValueChange={(value) => 
                      setOptions(prev => ({ ...prev, paymentTerms: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Direct bij aflevering</SelectItem>
                      <SelectItem value="financing">Financiering</SelectItem>
                      <SelectItem value="installments">Termijnbetaling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Additional Options */}
          <div className="space-y-4">
            <h4 className="font-medium">Extra afspraken</h4>
            
            <div>
              <Label>Aanvullende contractclausules</Label>
              <Textarea
                value={options.additionalClauses}
                onChange={(e) => 
                  setOptions(prev => ({ ...prev, additionalClauses: e.target.value }))
                }
                placeholder="Voeg extra clausules toe die specifiek voor dit contract gelden..."
                className="min-h-[80px]"
              />
            </div>

            <div>
              <Label>Speciale afspraken</Label>
              <Textarea
                value={options.specialAgreements}
                onChange={(e) => 
                  setOptions(prev => ({ ...prev, specialAgreements: e.target.value }))
                }
                placeholder="Bijzondere afspraken tussen verkoper en koper..."
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button onClick={handleSend} className="gap-2">
              <Send className="h-4 w-4" />
              Contract Versturen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
