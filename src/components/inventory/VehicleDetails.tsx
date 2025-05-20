import React, { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { 
  CalendarIcon, Car, CircleCheck, 
  FileText, Save, Truck, Wrench, X, Clock
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { Vehicle, ImportStatus, WorkshopStatus, DamageStatus } from "@/pages/Inventory";

interface VehicleDetailsProps {
  vehicle: Vehicle;
  onClose: () => void;
  onUpdate: (vehicle: Vehicle) => void;
}

export const VehicleDetails: React.FC<VehicleDetailsProps> = ({
  vehicle,
  onClose,
  onUpdate,
}) => {
  const [editedVehicle, setEditedVehicle] = useState<Vehicle>({...vehicle});
  
  const handleChange = (field: keyof Vehicle, value: any) => {
    setEditedVehicle({ ...editedVehicle, [field]: value });
  };

  const handleDamageChange = (field: keyof Vehicle["damage"], value: any) => {
    setEditedVehicle({
      ...editedVehicle,
      damage: { ...editedVehicle.damage, [field]: value }
    });
  };
  
  const handleSave = () => {
    onUpdate(editedVehicle);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            {editedVehicle.licenseNumber} - {editedVehicle.model}
          </DialogTitle>
          <DialogDescription>
            Bekijk en bewerk alle details van dit voertuig.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-5">
            {/* License & Model */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">Kenteken</Label>
                <Input
                  id="licenseNumber"
                  value={editedVehicle.licenseNumber}
                  onChange={(e) => handleChange('licenseNumber', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={editedVehicle.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                />
              </div>
            </div>
            
            {/* Import Status */}
            <div className="space-y-2">
              <Label>Importstatus</Label>
              <Select 
                value={editedVehicle.importStatus} 
                onValueChange={(value: ImportStatus) => handleChange('importStatus', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="niet_gestart">Niet gestart</SelectItem>
                  <SelectItem value="transport_geregeld">Transport geregeld</SelectItem>
                  <SelectItem value="onderweg">Onderweg</SelectItem>
                  <SelectItem value="aangekomen">Aangekomen</SelectItem>
                  <SelectItem value="afgemeld">Afgemeld</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Workshop Status */}
            <div className="space-y-2">
              <Label>Werkplaatsstatus</Label>
              <ToggleGroup 
                type="single" 
                value={editedVehicle.workshopStatus}
                onValueChange={(value: WorkshopStatus) => {
                  if (value) handleChange('workshopStatus', value);
                }}
                className="justify-start"
              >
                <ToggleGroupItem value="wachten" aria-label="Wachten">
                  <Clock className="h-4 w-4 mr-2" />
                  Wachten
                </ToggleGroupItem>
                <ToggleGroupItem value="poetsen" aria-label="Poetsen">
                  <Wrench className="h-4 w-4 mr-2" />
                  Poetsen
                </ToggleGroupItem>
                <ToggleGroupItem value="spuiten" aria-label="Spuiten">
                  <Wrench className="h-4 w-4 mr-2" />
                  Spuiten
                </ToggleGroupItem>
                <ToggleGroupItem value="gereed" aria-label="Gereed">
                  <CircleCheck className="h-4 w-4 mr-2" />
                  Gereed
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            
            {/* Purchase Price */}
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Inkoopprijs (€)</Label>
              <Input
                id="purchasePrice"
                type="number"
                value={editedVehicle.purchasePrice}
                onChange={(e) => handleChange('purchasePrice', parseFloat(e.target.value))}
              />
            </div>
            
            {/* Damage */}
            <div className="space-y-2">
              <Label>Schadeomschrijving & status</Label>
              <Textarea
                value={editedVehicle.damage.description}
                onChange={(e) => handleDamageChange('description', e.target.value)}
                placeholder="Beschrijf eventuele schade..."
                className="min-h-[80px]"
              />
              <Select 
                value={editedVehicle.damage.status} 
                onValueChange={(value: DamageStatus) => handleDamageChange('status', value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecteer schade status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="geen">Geen schade</SelectItem>
                  <SelectItem value="licht">Lichte schade</SelectItem>
                  <SelectItem value="middel">Middelmatige schade</SelectItem>
                  <SelectItem value="zwaar">Zware schade</SelectItem>
                  <SelectItem value="total_loss">Total loss</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Right column */}
          <div className="space-y-5">
            {/* Checkboxes row */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="arrived"
                  checked={editedVehicle.arrived}
                  onCheckedChange={(checked) => 
                    handleChange('arrived', Boolean(checked))
                  }
                />
                <Label htmlFor="arrived" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Aangekomen
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bpmRequested"
                  checked={editedVehicle.bpmRequested}
                  onCheckedChange={(checked) => 
                    handleChange('bpmRequested', Boolean(checked))
                  }
                />
                <Label htmlFor="bpmRequested" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  BPM aangevraagd
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="showroomOnline"
                  checked={editedVehicle.showroomOnline}
                  onCheckedChange={(checked) => 
                    handleChange('showroomOnline', checked)
                  }
                />
                <Label htmlFor="showroomOnline" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Showroom online
                </Label>
              </div>
            </div>
            
            {/* CMR */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cmrSent"
                  checked={editedVehicle.cmrSent}
                  onCheckedChange={(checked) => 
                    handleChange('cmrSent', Boolean(checked))
                  }
                />
                <Label htmlFor="cmrSent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  CMR verstuurd
                </Label>
              </div>
              
              {editedVehicle.cmrSent && (
                <div className="ml-6 mt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !editedVehicle.cmrDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editedVehicle.cmrDate ? format(editedVehicle.cmrDate, "PPP", { locale: nl }) : <span>Selecteer datum</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editedVehicle.cmrDate || undefined}
                        onSelect={(date) => handleChange('cmrDate', date)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
            
            {/* Papers */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="papersReceived"
                  checked={editedVehicle.papersReceived}
                  onCheckedChange={(checked) => 
                    handleChange('papersReceived', Boolean(checked))
                  }
                />
                <Label htmlFor="papersReceived" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Papieren binnen
                </Label>
              </div>
              
              {editedVehicle.papersReceived && (
                <div className="ml-6 mt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !editedVehicle.papersDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editedVehicle.papersDate ? format(editedVehicle.papersDate, "PPP", { locale: nl }) : <span>Selecteer datum</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editedVehicle.papersDate || undefined}
                        onSelect={(date) => handleChange('papersDate', date)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
            
            {/* Notes */}
            <div className="space-y-2">
              <Label className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Notities</span>
              </Label>
              <Textarea
                value={editedVehicle.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Voeg notities toe..."
                className="min-h-[120px]"
              />
            </div>
          </div>
        </div>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Annuleren
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
