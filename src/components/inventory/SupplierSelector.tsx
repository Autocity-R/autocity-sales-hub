
import React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SupplierSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
}

// Mock suppliers data - in real app this would come from an API
const mockSuppliers = [
  {
    id: "auto-schmidt",
    name: "Auto Schmidt GmbH",
    country: "Duitsland",
    contactPerson: "Hans Schmidt",
    email: "hans@autoschmidt.de",
    phone: "+49 30 12345678"
  },
  {
    id: "deutsche-autos",
    name: "Deutsche Autos",
    country: "Duitsland", 
    contactPerson: "Maria Weber",
    email: "maria@deutscheautos.de",
    phone: "+49 40 87654321"
  },
  {
    id: "car-connect",
    name: "Car Connect BV",
    country: "Nederland",
    contactPerson: "Jan de Vries",
    email: "jan@carconnect.nl",
    phone: "+31 20 5551234"
  },
  {
    id: "euro-motors",
    name: "Euro Motors",
    country: "België",
    contactPerson: "Pierre Dubois",
    email: "pierre@euromotors.be",
    phone: "+32 2 7778899"
  }
];

export const SupplierSelector: React.FC<SupplierSelectorProps> = ({ 
  value, 
  onValueChange 
}) => {
  return (
    <div className="space-y-2">
      <Label>Leverancier *</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecteer leverancier" />
        </SelectTrigger>
        <SelectContent>
          {mockSuppliers.map((supplier) => (
            <SelectItem key={supplier.id} value={supplier.id}>
              <div className="flex flex-col">
                <span className="font-medium">{supplier.name}</span>
                <span className="text-sm text-gray-500">{supplier.country} - {supplier.contactPerson}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
