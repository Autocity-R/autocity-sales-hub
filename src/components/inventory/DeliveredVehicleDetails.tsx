
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { X, Car, User, Euro, Calendar, FileText, Download, Eye } from "lucide-react";
import { Vehicle } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { ContractViewer } from "@/components/contracts/ContractViewer";
import { getContractByVehicleId, StoredContract } from "@/services/contractStorageService";

interface DeliveredVehicleDetailsProps {
  vehicle: Vehicle;
  onClose: () => void;
}

export const DeliveredVehicleDetails: React.FC<DeliveredVehicleDetailsProps> = ({
  vehicle,
  onClose,
}) => {
  const [contract, setContract] = useState<StoredContract | null>(null);
  const [showContractViewer, setShowContractViewer] = useState(false);
  const [loadingContract, setLoadingContract] = useState(true);

  useEffect(() => {
    const loadContract = async () => {
      try {
        const storedContract = await getContractByVehicleId(vehicle.id);
        setContract(storedContract);
      } catch (error) {
        console.error("Failed to load contract:", error);
      } finally {
        setLoadingContract(false);
      }
    };

    loadContract();
  }, [vehicle.id]);

  const formatPrice = (price: number | undefined) => {
    if (!price) return "Niet beschikbaar";
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(price);
  };
  
  const formatMileage = (mileage: number | undefined) => {
    if (!mileage) return "Niet beschikbaar";
    return new Intl.NumberFormat('nl-NL').format(mileage) + " km";
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "Niet beschikbaar";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "d MMMM yyyy", { locale: nl });
  };

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              {vehicle.brand} {vehicle.model}
            </DialogTitle>
            <DialogDescription>
              Volledige informatie van het afgeleverde voertuig
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Vehicle Photo */}
            {vehicle.mainPhotoUrl && (
              <div className="flex justify-center">
                <Avatar className="w-48 h-32 rounded-lg">
                  <img 
                    src={vehicle.mainPhotoUrl} 
                    alt={`${vehicle.brand} ${vehicle.model}`} 
                    className="object-cover w-full h-full rounded-lg"
                  />
                </Avatar>
              </div>
            )}
            
            {/* Vehicle Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Car className="h-5 w-5" />
                Voertuig Informatie
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Merk</label>
                  <p className="text-sm">{vehicle.brand}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Model</label>
                  <p className="text-sm">{vehicle.model}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Kenteken</label>
                  <p className="text-sm font-mono">{vehicle.licenseNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">VIN</label>
                  <p className="text-sm font-mono">{vehicle.vin}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Kilometerstand</label>
                  <p className="text-sm">{formatMileage(vehicle.mileage)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Locatie</label>
                  <Badge variant="outline" className="capitalize">
                    {vehicle.location}
                  </Badge>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Financial Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Financiële Informatie
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Inkoopprijs</label>
                  <p className="text-sm font-semibold">{formatPrice(vehicle.purchasePrice)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Verkoopprijs</label>
                  <p className="text-sm font-semibold text-green-600">{formatPrice(vehicle.sellingPrice)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Betaalstatus</label>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {vehicle.paymentStatus === "volledig_betaald" ? "Volledig betaald" : 
                     vehicle.paymentStatus === "aanbetaling" ? "Aanbetaling" : "Niet betaald"}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Verkoop Type</label>
                  <Badge variant="outline" className={vehicle.salesStatus === "verkocht_b2c" ? "bg-blue-50 text-blue-800" : "bg-purple-50 text-purple-800"}>
                    {vehicle.salesStatus === "verkocht_b2c" ? "B2C (Particulier)" : "B2B (Zakelijk)"}
                  </Badge>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Customer Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <User className="h-5 w-5" />
                Klant Informatie
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Klantnaam</label>
                  <p className="text-sm">{vehicle.customerName || "Niet beschikbaar"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Klant ID</label>
                  <p className="text-sm font-mono">{vehicle.customerId || "Niet beschikbaar"}</p>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Contract Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Koopcontract
              </h3>
              {loadingContract ? (
                <p className="text-sm text-muted-foreground">Contract laden...</p>
              ) : contract ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Contract Type</label>
                      <Badge variant="outline" className={contract.contractType === "b2c" ? "bg-blue-50 text-blue-800" : "bg-purple-50 text-purple-800"}>
                        {contract.contractType === "b2c" ? "B2C (Particulier)" : "B2B (Zakelijk)"}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Contract Datum</label>
                      <p className="text-sm">{format(contract.createdAt, "d MMMM yyyy 'om' HH:mm", { locale: nl })}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Bestandsnaam</label>
                      <p className="text-sm font-mono">{contract.fileName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        Afgeleverd
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowContractViewer(true)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Bekijk Contract
                    </Button>
                    {contract.pdfUrl && (
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                  Geen contract gevonden voor dit voertuig.
                </div>
              )}
            </div>
            
            <Separator />
            
            {/* Delivery Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Aflevering Informatie
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Afleverdatum</label>
                  <p className="text-sm">{formatDate(vehicle.deliveryDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Papieren compleet</label>
                  <Badge variant="outline" className={vehicle.papersReceived ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                    <FileText className="h-3 w-3 mr-1" />
                    {vehicle.papersReceived ? "Compleet" : "Incompleet"}
                  </Badge>
                </div>
                {vehicle.papersDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Papieren ontvangen</label>
                    <p className="text-sm">{formatDate(vehicle.papersDate)}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Notes */}
            {vehicle.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-3">Notities</h3>
                  <p className="text-sm bg-muted p-3 rounded-md">{vehicle.notes}</p>
                </div>
              </>
            )}
          </div>
          
          {/* Close button */}
          <Button
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 rounded-sm"
            variant="ghost"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Sluiten</span>
          </Button>
        </DialogContent>
      </Dialog>

      {/* Contract Viewer Modal */}
      {showContractViewer && contract && (
        <ContractViewer
          contract={contract}
          onClose={() => setShowContractViewer(false)}
        />
      )}
    </>
  );
};
