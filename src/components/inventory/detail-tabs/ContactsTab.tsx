import React, { useState, useEffect } from "react";
import { Vehicle } from "@/types/inventory";
import { Contact } from "@/types/customer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Phone, Mail, Building, Edit, Plus } from "lucide-react";
import { SearchableCustomerSelector } from "@/components/customers/SearchableCustomerSelector";
import { supabaseCustomerService } from "@/services/supabaseCustomerService";
import { useToast } from "@/hooks/use-toast";

interface ContactsTabProps {
  vehicle: Vehicle;
  onUpdate: (vehicle: Vehicle) => void;
}

export const ContactsTab: React.FC<ContactsTabProps> = ({ vehicle, onUpdate }) => {
  const [customerContact, setCustomerContact] = useState<Contact | null>(null);
  const [supplierContact, setSupplierContact] = useState<Contact | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [loadingSupplier, setLoadingSupplier] = useState(false);
  const { toast } = useToast();

  // Load customer contact when vehicle.customerId changes
  useEffect(() => {
    if (vehicle.customerId) {
      setLoadingCustomer(true);
      supabaseCustomerService.getContactById(vehicle.customerId)
        .then(contact => {
          setCustomerContact(contact);
        })
        .catch(error => {
          console.error('Error loading customer contact:', error);
          setCustomerContact(null);
        })
        .finally(() => setLoadingCustomer(false));
    } else {
      setCustomerContact(null);
    }
  }, [vehicle.customerId]);

  // Load supplier contact when vehicle.supplierId changes
  useEffect(() => {
    if (vehicle.supplierId) {
      setLoadingSupplier(true);
      supabaseCustomerService.getContactById(vehicle.supplierId)
        .then(contact => {
          setSupplierContact(contact);
        })
        .catch(error => {
          console.error('Error loading supplier contact:', error);
          setSupplierContact(null);
        })
        .finally(() => setLoadingSupplier(false));
    } else {
      setSupplierContact(null);
    }
  }, [vehicle.supplierId]);

  const handleCustomerChange = (contactId: string, contact: Contact) => {
    onUpdate({
      ...vehicle,
      customerId: contactId,
      customerName: contact.companyName || `${contact.firstName} ${contact.lastName}`.trim()
    });
    setCustomerContact(contact);
    toast({ description: "Klant succesvol gekoppeld aan voertuig" });
  };

  const handleSupplierChange = (contactId: string, contact: Contact) => {
    onUpdate({
      ...vehicle,
      supplierId: contactId
    });
    setSupplierContact(contact);
    toast({ description: "Leverancier succesvol gekoppeld aan voertuig" });
  };

  const getContactDisplayName = (contact: Contact) => {
    if (contact.companyName) {
      return contact.companyName;
    }
    return `${contact.firstName} ${contact.lastName}`.trim();
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Contacten</h3>
      
      {vehicle.details?.isTradeIn && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-sm text-emerald-700">
          <strong>Dit is een inruil voertuig.</strong> Leverancier blijft bewust leeg.
        </div>
      )}
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Leverancier
              </div>
              {supplierContact && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    onUpdate({ ...vehicle, supplierId: null });
                    setSupplierContact(null);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Wijzigen
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SearchableCustomerSelector
              placeholder="Zoek leverancier..."
              onValueChange={handleSupplierChange}
              customerType="supplier"
              value={vehicle.supplierId || undefined}
              label="Leverancier selecteren"
            />
            
            {loadingSupplier && (
              <div className="p-4 text-center text-muted-foreground">
                Leverancier laden...
              </div>
            )}
            
            {supplierContact && !loadingSupplier && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {supplierContact.companyName ? 'Bedrijfsnaam' : 'Naam'}
                  </Label>
                  <p className="text-sm font-medium">{getContactDisplayName(supplierContact)}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">E-mailadres</Label>
                  <p className="text-sm">{supplierContact.email}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Telefoonnummer</Label>
                  <p className="text-sm">{supplierContact.phone || "-"}</p>
                </div>

                {supplierContact.address && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Adres</Label>
                    <p className="text-sm">
                      {supplierContact.address.street} {supplierContact.address.number}<br />
                      {supplierContact.address.zipCode} {supplierContact.address.city}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Klant
              </div>
              {customerContact && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    onUpdate({ ...vehicle, customerId: null, customerName: null });
                    setCustomerContact(null);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Wijzigen
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SearchableCustomerSelector
              placeholder="Zoek klant (zakelijk of particulier)..."
              onValueChange={handleCustomerChange}
              customerType="customer"
              value={vehicle.customerId || undefined}
              label="Klant selecteren"
            />
            
            {loadingCustomer && (
              <div className="p-4 text-center text-muted-foreground">
                Klant laden...
              </div>
            )}
            
            {customerContact && !loadingCustomer && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {customerContact.companyName ? 'Bedrijfsnaam' : 'Naam'}
                  </Label>
                  <p className="text-sm font-medium">{getContactDisplayName(customerContact)}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">E-mailadres</Label>
                  <p className="text-sm">{customerContact.email}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Telefoonnummer</Label>
                  <p className="text-sm">{customerContact.phone || "-"}</p>
                </div>

                {customerContact.address && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Adres</Label>
                    <p className="text-sm">
                      {customerContact.address.street} {customerContact.address.number}<br />
                      {customerContact.address.zipCode} {customerContact.address.city}
                    </p>
                  </div>
                )}

                {customerContact.type && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Type klant</Label>
                    <p className="text-sm capitalize">
                      {customerContact.type === 'b2b' ? 'Zakelijk (B2B)' : 
                       customerContact.type === 'b2c' ? 'Particulier (B2C)' : 
                       customerContact.type}
                    </p>
                  </div>
                )}
              </div>
            )}

            {!customerContact && !loadingCustomer && vehicle.customerName && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Gekoppelde klant: <strong>{vehicle.customerName}</strong>
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Volledige gegevens kunnen niet worden geladen. Selecteer opnieuw om details te bekijken.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};