import React, { useState, useEffect, useRef } from "react";
import { Check, ChevronDown, Search, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Vehicle } from "@/types/inventory";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface SearchableVehicleSelectorProps {
  value?: string;
  onValueChange: (vehicle: Vehicle | null) => void;
  vehicles: Vehicle[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

export const SearchableVehicleSelector: React.FC<SearchableVehicleSelectorProps> = ({
  value,
  onValueChange,
  vehicles,
  label = "Voertuig",
  placeholder = "Zoek en selecteer voertuig...",
  disabled = false,
  loading = false
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Find selected vehicle when value changes
  useEffect(() => {
    if (value && vehicles.length > 0) {
      const vehicle = vehicles.find(v => v.id === value);
      setSelectedVehicle(vehicle || null);
    } else {
      setSelectedVehicle(null);
    }
  }, [value, vehicles]);

  // Filter vehicles based on search term
  const filteredVehicles = vehicles.filter(vehicle => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      vehicle.brand?.toLowerCase().includes(searchLower) ||
      vehicle.model?.toLowerCase().includes(searchLower) ||
      vehicle.licenseNumber?.toLowerCase().includes(searchLower) ||
      vehicle.vin?.toLowerCase().includes(searchLower) ||
      vehicle.customerName?.toLowerCase().includes(searchLower)
    );
  });

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setOpen(false);
    onValueChange(vehicle);
  };

  const getVehicleDisplayName = (vehicle: Vehicle) => {
    return `${vehicle.brand} ${vehicle.model} - ${vehicle.licenseNumber}`;
  };

  const formatDeliveryDate = (date: Date | string | null | undefined) => {
    if (!date) return "Onbekend";
    return format(new Date(date), "dd MMM yyyy", { locale: nl });
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open && !disabled} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || loading}
          >
            {selectedVehicle ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Car className="h-4 w-4 shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="truncate">{getVehicleDisplayName(selectedVehicle)}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {selectedVehicle.customerName}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Search className="h-4 w-4" />
                {loading ? "Laden..." : placeholder}
              </div>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[500px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Zoek op merk, model, kenteken, VIN of klant..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              {loading && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Voertuigen laden...
                </div>
              )}
              
              {!loading && filteredVehicles.length === 0 && (
                <CommandEmpty>
                  <div className="text-center space-y-2">
                    <p>Geen voertuigen gevonden</p>
                    {searchTerm && (
                      <p className="text-xs text-muted-foreground">
                        Probeer een andere zoekopdracht
                      </p>
                    )}
                  </div>
                </CommandEmpty>
              )}

              {!loading && filteredVehicles.length > 0 && (
                <CommandGroup>
                  <div className="text-xs text-muted-foreground p-2 border-b">
                    {filteredVehicles.length} voertuig{filteredVehicles.length !== 1 ? 'en' : ''} gevonden
                  </div>
                  {filteredVehicles.map((vehicle) => (
                    <CommandItem
                      key={vehicle.id}
                      value={vehicle.id}
                      onSelect={() => handleSelectVehicle(vehicle)}
                      className="flex items-start justify-between p-3 cursor-pointer"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Car className="h-4 w-4 mt-0.5 shrink-0" />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-medium truncate">
                            {getVehicleDisplayName(vehicle)}
                          </span>
                          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                            <span className="truncate">
                              Klant: {vehicle.customerName || "Onbekend"}
                            </span>
                            <span>
                              Afgeleverd: {formatDeliveryDate(vehicle.deliveryDate)}
                            </span>
                            {vehicle.vin && (
                              <span className="truncate">VIN: {vehicle.vin}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          value === vehicle.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
