import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getContactsByType } from "@/services/customerService";
import { Contact } from "@/types/customer";

interface CustomerSelectorProps {
  value?: string;
  onValueChange: (customerId: string, customer: Contact) => void;
  customerType: "b2b" | "b2c";
  label?: string;
  placeholder?: string;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  value,
  onValueChange,
  customerType,
  label = "Klant",
  placeholder = "Selecteer klant"
}) => {
  const customers = getContactsByType(customerType);

  const handleValueChange = (customerId: string) => {
    const selectedCustomer = customers.find(c => c.id === customerId);
    if (selectedCustomer) {
      onValueChange(customerId, selectedCustomer);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="z-50 bg-white">
          {customers.map((customer) => (
            <SelectItem key={customer.id} value={customer.id}>
              <div className="flex flex-col">
                <span className="font-medium">
                  {customer.companyName ? customer.companyName : `${customer.firstName} ${customer.lastName}`}
                </span>
                <span className="text-sm text-muted-foreground">{customer.email}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};