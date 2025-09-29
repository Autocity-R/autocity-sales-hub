
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface SupplierSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
}

interface Supplier {
  id: string;
  company_name: string | null;
  first_name: string;
  last_name: string;
  email: string;
  address_city: string | null;
}

export const SupplierSelector: React.FC<SupplierSelectorProps> = ({ 
  value, 
  onValueChange 
}) => {
  const { data: suppliers, isLoading, error } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async (): Promise<Supplier[]> => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, company_name, first_name, last_name, email, address_city')
        .eq('type', 'leverancier')
        .order('company_name', { ascending: true, nullsFirst: false });

      if (error) {
        console.error("Error fetching suppliers:", error);
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const getSupplierDisplayName = (supplier: Supplier) => {
    if (supplier.company_name) {
      return supplier.company_name;
    }
    return `${supplier.first_name} ${supplier.last_name}`.trim();
  };

  const getSupplierSubtext = (supplier: Supplier) => {
    const parts = [];
    if (supplier.address_city) {
      parts.push(supplier.address_city);
    }
    if (supplier.email) {
      parts.push(supplier.email);
    }
    return parts.join(' - ');
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Leverancier *</Label>
        <div className="flex items-center justify-center p-3 border rounded-md">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Leveranciers laden...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Label>Leverancier *</Label>
        <div className="p-3 border rounded-md border-destructive/50 bg-destructive/10">
          <span className="text-sm text-destructive">Fout bij laden leveranciers</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Leverancier *</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecteer leverancier" />
        </SelectTrigger>
        <SelectContent>
          {suppliers && suppliers.length > 0 ? (
            suppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{getSupplierDisplayName(supplier)}</span>
                  {getSupplierSubtext(supplier) && (
                    <span className="text-sm text-muted-foreground">
                      {getSupplierSubtext(supplier)}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-suppliers-available" disabled>
              <span className="text-muted-foreground">Geen leveranciers gevonden</span>
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      {suppliers && suppliers.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Voeg eerst leveranciers toe via Klanten → Type: Leverancier
        </p>
      )}
    </div>
  );
};
