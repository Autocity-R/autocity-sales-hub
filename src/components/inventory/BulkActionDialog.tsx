
import React, { useState } from "react";
import { 
  AlertCircle, Check, Clock, Mail, Truck, Wrench 
} from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImportStatus, WorkshopStatus } from "@/types/inventory";
import { Switch } from "@/components/ui/switch";

interface BulkActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (action: string, value: any) => void;
  count: number;
}

export const BulkActionDialog: React.FC<BulkActionDialogProps> = ({
  open,
  onOpenChange,
  onApply,
  count
}) => {
  const [actionType, setActionType] = useState<string>("importStatus");
  const [importStatus, setImportStatus] = useState<ImportStatus>("aangemeld");
  const [workshopStatus, setWorkshopStatus] = useState<WorkshopStatus>("poetsen");
  const [arrived, setArrived] = useState<boolean>(true);
  const [emailType, setEmailType] = useState<string>("transport_pickup");

  const handleApply = () => {
    switch (actionType) {
      case "importStatus":
        onApply("importStatus", importStatus);
        break;
      case "workshopStatus":
        onApply("workshopStatus", workshopStatus);
        break;
      case "arrived":
        onApply("arrived", arrived);
        break;
      case "sendEmail":
        onApply("sendEmail", emailType);
        break;
      default:
        console.error("Unknown action type:", actionType);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk actie uitvoeren</DialogTitle>
          <DialogDescription>
            {count === 1 ? 
              "Voer een actie uit op 1 geselecteerd voertuig." :
              `Voer een actie uit op ${count} geselecteerde voertuigen.`
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-4">
            <Label>Kies actie</Label>
            <RadioGroup value={actionType} onValueChange={setActionType}>
              <div className="flex items-center space-x-2 rounded-md border p-3">
                <RadioGroupItem value="importStatus" id="importStatus" />
                <Label htmlFor="importStatus" className="flex items-center">
                  <Truck className="mr-2 h-4 w-4" />
                  Importstatus bijwerken
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 rounded-md border p-3">
                <RadioGroupItem value="workshopStatus" id="workshopStatus" />
                <Label htmlFor="workshopStatus" className="flex items-center">
                  <Wrench className="mr-2 h-4 w-4" />
                  Werkplaatsstatus bijwerken
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 rounded-md border p-3">
                <RadioGroupItem value="arrived" id="arrived" />
                <Label htmlFor="arrived" className="flex items-center">
                  <Check className="mr-2 h-4 w-4" />
                  Aangekomen status bijwerken
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 rounded-md border p-3">
                <RadioGroupItem value="sendEmail" id="sendEmail" />
                <Label htmlFor="sendEmail" className="flex items-center">
                  <Mail className="mr-2 h-4 w-4" />
                  E-mail verzenden
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <Separator />
          
          {actionType === "importStatus" && (
            <div className="space-y-2">
              <Label>Nieuwe importstatus</Label>
              <Select 
                value={importStatus} 
                onValueChange={(value: ImportStatus) => setImportStatus(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="niet_aangemeld">Niet aangemeld</SelectItem>
                  <SelectItem value="aangemeld">Aangemeld</SelectItem>
                  <SelectItem value="goedgekeurd">Goedgekeurd</SelectItem>
                  <SelectItem value="bpm_betaald">BPM Betaald</SelectItem>
                  <SelectItem value="ingeschreven">Ingeschreven</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {actionType === "workshopStatus" && (
            <div className="space-y-2">
              <Label>Nieuwe werkplaatsstatus</Label>
              <Select 
                value={workshopStatus} 
                onValueChange={(value: WorkshopStatus) => setWorkshopStatus(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wachten">Wachten</SelectItem>
                  <SelectItem value="poetsen">Poetsen</SelectItem>
                  <SelectItem value="spuiten">Spuiten</SelectItem>
                  <SelectItem value="gereed">Gereed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {actionType === "arrived" && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="arrived-switch"
                  checked={arrived}
                  onCheckedChange={setArrived}
                />
                <Label htmlFor="arrived-switch">
                  {arrived ? "Aangekomen (Ja)" : "Aangekomen (Nee)"}
                </Label>
              </div>
              
              <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800 flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                <p>
                  Bij het markeren als aangekomen worden de voertuigen automatisch 
                  naar de werkplaats verplaatst. Dit kan niet ongedaan worden gemaakt.
                </p>
              </div>
            </div>
          )}
          
          {actionType === "sendEmail" && (
            <div className="space-y-2">
              <Label>E-mail type</Label>
              <Select 
                value={emailType} 
                onValueChange={setEmailType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer e-mail type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transport_pickup">
                    Transport pickup document
                  </SelectItem>
                  <SelectItem value="cmr_supplier">
                    CMR voor leverancier
                  </SelectItem>
                  <SelectItem value="reminder_papers">
                    Herinnering papieren
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Annuleren
          </Button>
          <Button onClick={handleApply}>
            {count === 1 ? "Actie uitvoeren" : `Actie uitvoeren op ${count} voertuigen`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
