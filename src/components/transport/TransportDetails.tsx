
import React, { useState } from "react";
import { FileText, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Vehicle, ImportStatus } from "@/types/inventory";

interface TransportDetailsProps {
  vehicle: Vehicle;
  onUpdate: (vehicle: Vehicle) => void;
  onClose: () => void;
  onSendPickupDocument: (vehicleId: string) => void;
}

export const TransportDetails: React.FC<TransportDetailsProps> = ({
  vehicle,
  onUpdate,
  onClose,
  onSendPickupDocument
}) => {
  const [updatedVehicle, setUpdatedVehicle] = useState<Vehicle>(vehicle);

  const handleImportStatusChange = (status: ImportStatus) => {
    setUpdatedVehicle({
      ...updatedVehicle,
      importStatus: status
    });
  };

  const handleMarkAsArrived = () => {
    onUpdate({
      ...updatedVehicle,
      arrived: true,
      importStatus: "aangekomen"
    });
  };

  const handleSave = () => {
    onUpdate(updatedVehicle);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Transport Details: {vehicle.brand} {vehicle.model}
          </DialogTitle>
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-200px)]">
          <Tabs defaultValue="details" className="mt-4">
            <TabsList className="sticky top-0 bg-background z-10">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="transport">Transport</TabsTrigger>
              <TabsTrigger value="documents">Documenten</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Merk</Label>
                  <div className="text-sm mt-1">{updatedVehicle.brand}</div>
                </div>
                <div>
                  <Label>Model</Label>
                  <div className="text-sm mt-1">{updatedVehicle.model}</div>
                </div>
                <div>
                  <Label>Kenteken</Label>
                  <div className="text-sm mt-1">{updatedVehicle.licenseNumber || "Nog niet bekend"}</div>
                </div>
                <div>
                  <Label>VIN</Label>
                  <div className="text-sm mt-1">{updatedVehicle.vin}</div>
                </div>
                <div>
                  <Label>Kilometerstand</Label>
                  <div className="text-sm mt-1">{updatedVehicle.mileage} km</div>
                </div>
                <div>
                  <Label>Schade</Label>
                  <div className="text-sm mt-1 capitalize">{updatedVehicle.damage.status}</div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="transport" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="importStatus">Transport status</Label>
                  <Select
                    value={updatedVehicle.importStatus}
                    onValueChange={(value: ImportStatus) => handleImportStatusChange(value)}
                  >
                    <SelectTrigger id="importStatus" className="mt-1">
                      <SelectValue placeholder="Selecteer status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="niet_gestart">Niet gestart</SelectItem>
                      <SelectItem value="transport_geregeld">Transport geregeld</SelectItem>
                      <SelectItem value="onderweg">Onderweg</SelectItem>
                      <SelectItem value="aangekomen">Aangekomen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Transporteur</Label>
                  <Select defaultValue="transporteur1">
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecteer transporteur" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transporteur1">Easy Transport GmbH</SelectItem>
                      <SelectItem value="transporteur2">QuickMove Transport</SelectItem>
                      <SelectItem value="transporteur3">Euro Car Logistics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Land van herkomst</Label>
                  <div className="text-sm mt-1">Duitsland</div>
                </div>
                <div>
                  <Label>Verwachte aankomstdatum</Label>
                  <div className="text-sm mt-1">25-06-2025</div>
                </div>
              </div>

              <div className="flex space-x-2 mt-4">
                <Button 
                  onClick={() => onSendPickupDocument(vehicle.id)}
                  variant="outline"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Verstuur pickup document
                </Button>
                <Button onClick={handleMarkAsArrived}>Voertuig binnenmelden</Button>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <div className="p-4 border rounded-md">
                <h4 className="font-medium mb-2">CMR Document</h4>
                <div className="text-sm text-muted-foreground mb-2">
                  {updatedVehicle.cmrSent ? "Verstuurd op " + new Date(updatedVehicle.cmrDate || "").toLocaleDateString() : "Nog niet verstuurd"}
                </div>
                <Button variant="outline" size="sm">
                  <FileText className="mr-2 h-4 w-4" />
                  Download CMR
                </Button>
              </div>
              <div className="p-4 border rounded-md">
                <h4 className="font-medium mb-2">Pickup Document</h4>
                <div className="text-sm text-muted-foreground mb-2">
                  Gereed voor verzending
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onSendPickupDocument(vehicle.id)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Verstuur naar transporteur
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <div className="flex justify-end space-x-2 mt-4 sticky bottom-0 bg-background pt-2">
          <Button variant="outline" onClick={onClose}>Annuleren</Button>
          <Button onClick={handleSave}>Opslaan</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
