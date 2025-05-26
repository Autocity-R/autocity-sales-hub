
import React from "react";
import { Users, Building, User, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Vehicle } from "@/types/inventory";

interface ContactsTabProps {
  vehicle: Vehicle;
  onUpdate?: (vehicle: Vehicle) => void;
}

export const ContactsTab: React.FC<ContactsTabProps> = ({ vehicle, onUpdate }) => {
  const handleSupplierChange = (supplierId: string) => {
    // In a real app, this would update the supplier info
    console.log("Supplier changed to:", supplierId);
    // onUpdate?.({ ...vehicle, supplierId });
  };

  const handleCustomerChange = (customerId: string) => {
    // In a real app, this would update the customer info
    console.log("Customer changed to:", customerId);
    // onUpdate?.({ ...vehicle, customerId });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Contacten</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Leverancier Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Leverancier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Huidige leverancier</label>
              <Select onValueChange={handleSupplierChange} defaultValue="auto-schmidt">
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecteer leverancier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto-schmidt">Auto Schmidt GmbH</SelectItem>
                  <SelectItem value="deutsche-autos">Deutsche Autos GmbH</SelectItem>
                  <SelectItem value="car-connect">Car Connect International</SelectItem>
                  <SelectItem value="euro-motors">Euro Motors AG</SelectItem>
                  <SelectItem value="berlin-auto">Berlin Auto Trade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Mock supplier info - in real app this would come from supplier data */}
            <div className="space-y-3 pt-2 border-t">
              <h4 className="font-medium text-sm">Contactgegevens</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Klaus Schmidt</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>k.schmidt@autoschmidt.de</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>+49 30 123456789</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>Berlin, Duitsland</span>
                </div>
              </div>
            </div>
            
            <div className="pt-2">
              <Button variant="outline" className="w-full">
                <Users className="mr-2 h-4 w-4" />
                Leverancier beheren
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Klant Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Klant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Huidige klant</label>
              {vehicle.salesStatus === 'voorraad' ? (
                <div className="mt-1 p-2 bg-muted rounded-md text-sm text-muted-foreground">
                  Nog niet verkocht
                </div>
              ) : (
                <Select onValueChange={handleCustomerChange} defaultValue={vehicle.customerId || ""}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecteer klant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jansen">Fam. Jansen</SelectItem>
                    <SelectItem value="pietersen">Dhr. Pietersen</SelectItem>
                    <SelectItem value="de-boer">De Boer Auto's B.V.</SelectItem>
                    <SelectItem value="van-dam">Mevr. van Dam</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            
            {/* Show customer info if vehicle is sold */}
            {vehicle.salesStatus !== 'voorraad' && (
              <div className="space-y-3 pt-2 border-t">
                <h4 className="font-medium text-sm">Contactgegevens</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{vehicle.customerName || "Jan Jansen"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>jan.jansen@email.nl</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>06 12345678</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>Amsterdam, Nederland</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="pt-2">
              <Button variant="outline" className="w-full" disabled={vehicle.salesStatus === 'voorraad'}>
                <Users className="mr-2 h-4 w-4" />
                Klant beheren
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Sales Information */}
      {vehicle.salesStatus !== 'voorraad' && (
        <Card>
          <CardHeader>
            <CardTitle>Verkoop informatie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <label className="font-medium text-muted-foreground">Verkoop type</label>
                <div className="mt-1 capitalize">{vehicle.salesStatus}</div>
              </div>
              <div>
                <label className="font-medium text-muted-foreground">Verkoper</label>
                <div className="mt-1">{vehicle.salespersonName || "Niet toegewezen"}</div>
              </div>
              <div>
                <label className="font-medium text-muted-foreground">Verkoop prijs</label>
                <div className="mt-1">€{vehicle.sellingPrice?.toLocaleString('nl-NL') || "Niet ingesteld"}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
