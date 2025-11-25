
import React, { useState } from "react";
import { FileText, X, Mail, Upload, CheckCircle, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Vehicle, ImportStatus, FileCategory, PaymentStatus } from "@/types/inventory";
import { TransportFileUploader } from "./TransportFileUploader";
import { useVehicleFiles } from "@/hooks/useVehicleFiles";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { VehicleFile } from "@/types/inventory";
import { deleteVehicleFile } from "@/services/inventoryService";
import { useToast } from "@/hooks/use-toast";
import { getContactsByType } from "@/services/customerService";

interface TransportDetailsProps {
  vehicle: Vehicle;
  onUpdate: (vehicle: Vehicle) => void;
  onClose: () => void;
  onSendPickupDocument: (vehicleId: string) => void;
  onSendEmail?: (type: string, vehicleId: string) => void;
  onFileUpload?: (file: File, category: FileCategory) => void;
}

export const TransportDetails: React.FC<TransportDetailsProps> = ({
  vehicle,
  onUpdate,
  onClose,
  onSendPickupDocument,
  onSendEmail,
  onFileUpload
}) => {
  const [updatedVehicle, setUpdatedVehicle] = useState<Vehicle>(vehicle);
  const { vehicleFiles = [] } = useVehicleFiles(vehicle);
  const [notes, setNotes] = useState(vehicle.notes || "");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch transporters
  const { data: transporters = [] } = useQuery({
    queryKey: ["contacts", "transporter"],
    queryFn: () => getContactsByType("transporter")
  });

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
      importStatus: "ingeschreven",
      notes
    });
  };

  const handleSave = () => {
    onUpdate({
      ...updatedVehicle,
      notes
    });
  };

  const handleFileUploaded = (fileData: VehicleFile) => {
    // Invalidate the vehicle files query to refresh the list
    queryClient.invalidateQueries({ queryKey: ["vehicleFiles", vehicle.id] });
    toast({
      title: "Document geüpload",
      description: `${fileData.name} is succesvol geüpload.`,
    });
    console.log("File uploaded:", fileData);
  };

  const handleDeleteFile = async (fileId: string, filePath: string, fileName: string) => {
    try {
      await deleteVehicleFile(fileId, filePath);
      queryClient.invalidateQueries({ queryKey: ["vehicleFiles", vehicle.id] });
      toast({
        title: "Document verwijderd",
        description: `${fileName} is verwijderd.`,
      });
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Fout bij verwijderen",
        description: "Het document kon niet worden verwijderd.",
        variant: "destructive",
      });
    }
  };

  // Get CMR files
  const cmrFiles = vehicleFiles.filter(file => file.category === "cmr");
  
  // Get pickup files
  const pickupFiles = vehicleFiles.filter(file => file.category === "pickup");
  
  // Get damage files
  const damageFiles = vehicleFiles.filter(file => file.category === "damage");

  const getPaymentStatusBadge = (vehicle: Vehicle) => {
    // ✅ Gebruik PURCHASE payment status voor transport (inkoop betaling)
    const paymentStatus = vehicle.details?.purchase_payment_status || "niet_betaald";
    
    if (paymentStatus === "volledig_betaald") {
      return {
        label: "Ja - Betaald aan leverancier",
        className: "bg-green-100 text-green-800 border-green-300 hover:bg-green-100"
      };
    }
    
    if (paymentStatus === "aanbetaling") {
      return {
        label: "Deels - Aanbetaling aan leverancier",
        className: "bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-100"
      };
    }
    
    return {
      label: "Nee - Leverancier niet betaald",
      className: "bg-red-100 text-red-800 border-red-300 hover:bg-red-100"
    };
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[90%] sm:max-w-[800px] max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-2 flex-shrink-0 bg-background border-b">
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

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6">
              <Tabs defaultValue="details" className="w-full">
              <TabsList className="sticky top-0 bg-background z-10 mb-4">
                <TabsTrigger value="details">Voertuig Details</TabsTrigger>
                <TabsTrigger value="transport">Transport</TabsTrigger>
                <TabsTrigger value="documents">Documenten</TabsTrigger>
                <TabsTrigger value="notes">Opmerkingen</TabsTrigger>
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
                    <Label>Inkoopprijs</Label>
                    <div className="text-sm mt-1">€{updatedVehicle.purchasePrice.toLocaleString('nl-NL')}</div>
                  </div>
                  <div>
                    <Label>Betaalstatus</Label>
                    <div className="mt-1">
                      <Badge className={getPaymentStatusBadge(updatedVehicle).className}>
                        {getPaymentStatusBadge(updatedVehicle).label}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label>Schade</Label>
                    <div className="text-sm mt-1 capitalize">{updatedVehicle.damage.status}</div>
                  </div>
                  {updatedVehicle.damage.status !== "geen" && (
                    <div className="col-span-2">
                      <Label>Schade omschrijving</Label>
                      <div className="text-sm mt-1">{updatedVehicle.damage.description}</div>
                    </div>
                  )}
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
                        <SelectItem value="niet_gestart">Niet ready</SelectItem>
                        <SelectItem value="transport_geregeld">Opdracht gegeven</SelectItem>
                        <SelectItem value="onderweg">Onderweg</SelectItem>
                        <SelectItem value="aangekomen">Aangekomen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Transporteur</Label>
                    <Select 
                      value={updatedVehicle.transporter_id || ""} 
                      onValueChange={(value) => setUpdatedVehicle({...updatedVehicle, transporter_id: value})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecteer transporteur" />
                      </SelectTrigger>
                      <SelectContent>
                        {transporters.length === 0 ? (
                          <SelectItem value="none" disabled>
                            Geen transporteurs beschikbaar
                          </SelectItem>
                        ) : (
                          transporters.map((transporter) => (
                            <SelectItem key={transporter.id} value={transporter.id}>
                              {transporter.companyName || `${transporter.firstName} ${transporter.lastName}`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="paymentStatus">Betaalstatus (Inkoop aan leverancier)</Label>
                    <Select
                      value={updatedVehicle.details?.purchase_payment_status || "niet_betaald"}
                      onValueChange={(value: PaymentStatus) => {
                        setUpdatedVehicle({
                          ...updatedVehicle,
                          details: {
                            ...updatedVehicle.details,
                            purchase_payment_status: value  // ← Update ALLEEN purchase
                          }
                        });
                      }}
                    >
                      <SelectTrigger id="paymentStatus" className="mt-1">
                        <SelectValue placeholder="Selecteer betaalstatus" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="niet_betaald">
                          🔴 Nee - Leverancier nog niet betaald
                        </SelectItem>
                        <SelectItem value="aanbetaling">
                          🟠 Deels - Aanbetaling aan leverancier gedaan
                        </SelectItem>
                        <SelectItem value="volledig_betaald">
                          🟢 Ja - Volledig betaald aan leverancier
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="pickupStatus">Pickup status transport</Label>
                    <Select
                      value={updatedVehicle.details?.pickupDocumentSent ? "verstuurd" : "niet_verstuurd"}
                      onValueChange={(value) => {
                        setUpdatedVehicle({
                          ...updatedVehicle,
                          details: {
                            ...updatedVehicle.details,
                            pickupDocumentSent: value === "verstuurd"
                          }
                        });
                      }}
                    >
                      <SelectTrigger id="pickupStatus" className="mt-1">
                        <SelectValue placeholder="Selecteer pickup status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="niet_verstuurd">
                          🔴 Niet ready
                        </SelectItem>
                        <SelectItem value="verstuurd">
                          🟢 Transport verstuurd
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Land van herkomst</Label>
                    <Input 
                      className="mt-1"
                      placeholder="Land van herkomst"
                      defaultValue="Duitsland"
                    />
                  </div>
                  <div>
                    <Label>Verwachte aankomstdatum</Label>
                    <Input 
                      className="mt-1"
                      type="date" 
                      defaultValue="2025-06-25"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <Button 
                    onClick={() => onSendEmail?.("transport_pickup", vehicle.id)}
                    variant="outline"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Verstuur e-mail naar transporteur
                  </Button>
                  <Button 
                    onClick={() => onSendPickupDocument(vehicle.id)}
                    variant="outline"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Verstuur pickup document
                  </Button>
                  <Button onClick={handleMarkAsArrived}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Voertuig binnenmelden
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <div className="p-4 border rounded-md">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">CMR Document</h4>
                    <TransportFileUploader 
                      vehicleId={vehicle.id}
                      category="cmr"
                      onFileUploaded={handleFileUploaded}
                    />
                  </div>
                   <div className="text-sm text-muted-foreground mb-2">
                     {cmrFiles.length > 0 ? `${cmrFiles.length} bestand(en) geüpload` : "Nog niet verstuurd"}
                   </div>
                   {cmrFiles.length > 0 && (
                     <div className="space-y-2">
                       {cmrFiles.map((file) => (
                         <div key={file.id} className="flex items-center justify-between p-2 bg-muted rounded">
                           <div className="flex items-center">
                             <FileText className="mr-2 h-4 w-4" />
                             <span className="text-sm">{file.name}</span>
                           </div>
                           <Button 
                             variant="ghost" 
                             size="sm"
                             onClick={() => handleDeleteFile(file.id, file.filePath || '', file.name)}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
                 
                 <div className="p-4 border rounded-md">
                   <div className="flex justify-between items-center mb-2">
                     <h4 className="font-medium">Pickup Document</h4>
                     <TransportFileUploader 
                       vehicleId={vehicle.id}
                       category="pickup"
                       onFileUploaded={handleFileUploaded}
                     />
                   </div>
                   <div className="text-sm text-muted-foreground mb-2">
                     {pickupFiles.length > 0 ? `${pickupFiles.length} bestand(en) geüpload` : "Niet gereed"}
                   </div>
                   {pickupFiles.length > 0 && (
                     <div className="space-y-2 mb-2">
                       {pickupFiles.map((file) => (
                         <div key={file.id} className="flex items-center justify-between p-2 bg-muted rounded">
                           <div className="flex items-center">
                             <FileText className="mr-2 h-4 w-4" />
                             <span className="text-sm">{file.name}</span>
                           </div>
                           <Button 
                             variant="ghost" 
                             size="sm"
                             onClick={() => handleDeleteFile(file.id, file.filePath || '', file.name)}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </div>
                       ))}
                     </div>
                   )}
                   <Button 
                     variant="outline" 
                     size="sm"
                     onClick={() => onSendPickupDocument(vehicle.id)}
                   >
                     <Mail className="mr-2 h-4 w-4" />
                     Verstuur naar transporteur
                   </Button>
                </div>
                
                <div className="p-4 border rounded-md">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Schadeformulier</h4>
                    <TransportFileUploader 
                      vehicleId={vehicle.id}
                      category="damage"
                      onFileUploaded={handleFileUploaded}
                    />
                  </div>
                   <div className="text-sm text-muted-foreground mb-2">
                     Optioneel: alleen bij schade
                   </div>
                   {damageFiles.length > 0 && (
                     <div className="space-y-2">
                       {damageFiles.map((file) => (
                         <div key={file.id} className="flex items-center justify-between p-2 bg-muted rounded">
                           <div className="flex items-center">
                             <FileText className="mr-2 h-4 w-4" />
                             <span className="text-sm">{file.name}</span>
                           </div>
                           <Button 
                             variant="ghost" 
                             size="sm"
                             onClick={() => handleDeleteFile(file.id, file.filePath || '', file.name)}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </div>
                       ))}
                     </div>
                   )}
                </div>
              </TabsContent>
              
              <TabsContent value="notes" className="space-y-4">
                <div>
                  <Label htmlFor="notes">Opmerkingen voor transport</Label>
                  <Textarea 
                    id="notes" 
                    className="mt-1 h-40" 
                    placeholder="Voer opmerkingen in voor de transporteur zoals bijzonderheden over het voertuig of de ophaallocatie..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
        </div>

        <div className="flex-shrink-0 flex justify-end gap-2 p-4 border-t bg-background">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuleren
          </Button>
          <Button type="submit" onClick={handleSave}>
            Opslaan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
