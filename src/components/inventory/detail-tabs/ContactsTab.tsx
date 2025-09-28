import React from "react";
import { Vehicle } from "@/types/inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Phone, Mail, Building } from "lucide-react";
import { SearchableCustomerSelector } from "@/components/customers/SearchableCustomerSelector";

interface ContactsTabProps {
  vehicle: Vehicle;
  onUpdate: (vehicle: Vehicle) => void;
}

export const ContactsTab: React.FC<ContactsTabProps> = ({ vehicle, onUpdate }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Contacten</h3>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Leverancier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SearchableCustomerSelector
              placeholder="Zoek leverancier..."
              onValueChange={(contactId, contact) => {
                onUpdate({
                  ...vehicle,
                  supplierId: contactId,
                  supplierContact: {
                    name: contact.companyName || `${contact.firstName} ${contact.lastName}`,
                    email: contact.email,
                    phone: contact.phone || ""
                  }
                });
              }}
              customerType="supplier"
              value={vehicle.supplierId}
            />
            
            {vehicle.supplierContact && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label>Bedrijfsnaam</Label>
                  <p className="text-sm font-medium">{vehicle.supplierContact.name}</p>
                </div>
                
                <div>
                  <Label>E-mailadres</Label>
                  <p className="text-sm">{vehicle.supplierContact.email}</p>
                </div>
                
                <div>
                  <Label>Telefoonnummer</Label>
                  <p className="text-sm">{vehicle.supplierContact.phone || "-"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Klant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SearchableCustomerSelector
              placeholder="Zoek klant..."
              onValueChange={(contactId, contact) => {
                onUpdate({
                  ...vehicle,
                  customerId: contactId,
                  customerContact: {
                    name: contact.companyName || `${contact.firstName} ${contact.lastName}`,
                    email: contact.email,
                    phone: contact.phone || ""
                  }
                });
              }}
              customerType={vehicle.salesStatus === "verkocht_b2b" ? "b2b" : "b2c"}
              value={vehicle.customerId}
            />
            
            {vehicle.customerContact && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label>Naam</Label>
                  <p className="text-sm font-medium">{vehicle.customerContact.name}</p>
                </div>
                
                <div>
                  <Label>E-mailadres</Label>
                  <p className="text-sm">{vehicle.customerContact.email}</p>
                </div>
                
                <div>
                  <Label>Telefoonnummer</Label>
                  <p className="text-sm">{vehicle.customerContact.phone || "-"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};