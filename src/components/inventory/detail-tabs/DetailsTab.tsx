
import React from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { 
  CalendarIcon, CircleCheck, MapPin, Euro, User
} from "lucide-react";
import { Vehicle, ImportStatus, LocationStatus, DamageStatus } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useSalespeople } from "@/hooks/useSalespeople";

interface DetailsTabProps {
  editedVehicle: Vehicle;
  handleChange: (field: keyof Vehicle, value: any) => void;
  handleDamageChange: (field: keyof Vehicle["damage"], value: any) => void;
}

export const DetailsTab: React.FC<DetailsTabProps> = ({
  editedVehicle,
  handleChange,
  handleDamageChange
}) => {
  const { data: salespeople, isLoading: salesLoading } = useSalespeople();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left column */}
      <div className="space-y-5">
        {/* Brand & Model */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brand">Merk</Label>
            <Input
              id="brand"
              value={editedVehicle.brand}
              onChange={(e) => handleChange('brand', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={editedVehicle.model}
              onChange={(e) => handleChange('model', e.target.value)}
            />
          </div>
        </div>
        
        {/* License & VIN */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="licenseNumber">Kenteken</Label>
            <Input
              id="licenseNumber"
              value={editedVehicle.licenseNumber}
              onChange={(e) => handleChange('licenseNumber', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vin">VIN</Label>
            <Input
              id="vin"
              value={editedVehicle.vin}
              onChange={(e) => handleChange('vin', e.target.value)}
            />
          </div>
        </div>
        
        {/* Import Status */}
        <div className="space-y-2">
          <Label>Import status</Label>
          <Select 
            value={editedVehicle.importStatus} 
            onValueChange={(value: ImportStatus) => handleChange('importStatus', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecteer status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="niet_gestart">Niet gestart</SelectItem>
              <SelectItem value="aangemeld">Aangemeld</SelectItem>
              <SelectItem value="goedgekeurd">Goedgekeurd</SelectItem>
              <SelectItem value="transport_geregeld">Transport geregeld</SelectItem>
              <SelectItem value="onderweg">Onderweg</SelectItem>
              <SelectItem value="aangekomen">Aangekomen</SelectItem>
              <SelectItem value="afgemeld">Afgemeld</SelectItem>
              <SelectItem value="bpm_betaald">BPM Betaald</SelectItem>
              <SelectItem value="herkeuring">Herkeuring</SelectItem>
              <SelectItem value="ingeschreven">Ingeschreven</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Location Status */}
        <div className="space-y-2">
          <Label>Locatie auto</Label>
          <ToggleGroup 
            type="single" 
            value={editedVehicle.location}
            onValueChange={(value: LocationStatus) => {
              if (value) handleChange('location', value);
            }}
            className="justify-start flex flex-wrap"
          >
            <ToggleGroupItem value="showroom" aria-label="Showroom">
              <MapPin className="h-4 w-4 mr-2" />
              Showroom
            </ToggleGroupItem>
            <ToggleGroupItem value="werkplaats" aria-label="Werkplaats">
              <MapPin className="h-4 w-4 mr-2" />
              Werkplaats
            </ToggleGroupItem>
            <ToggleGroupItem value="poetser" aria-label="Poetser">
              <MapPin className="h-4 w-4 mr-2" />
              Poetser
            </ToggleGroupItem>
            <ToggleGroupItem value="spuiter" aria-label="Spuiter">
              <MapPin className="h-4 w-4 mr-2" />
              Spuiter
            </ToggleGroupItem>
            <ToggleGroupItem value="calandstraat" aria-label="Calandstraat">
              <MapPin className="h-4 w-4 mr-2" />
              Calandstraat
            </ToggleGroupItem>
            <ToggleGroupItem value="oud_beijerland" aria-label="Oud Beijerland">
              <MapPin className="h-4 w-4 mr-2" />
              Oud Beijerland
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        
        {/* Purchase Price & Selling Price */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="purchasePrice">Inkoopprijs (€)</Label>
            <Input
              id="purchasePrice"
              type="number"
              value={editedVehicle.purchasePrice}
              onChange={(e) => handleChange('purchasePrice', parseFloat(e.target.value))}
            />
          </div>

          {/* Added Selling Price field - always visible in B2C view */}
          <div className="space-y-2">
            <Label htmlFor="sellingPrice" className="flex items-center">
              <Euro className="h-4 w-4 mr-1 text-muted-foreground" />
              <span>Verkoopprijs (€)</span>
            </Label>
            <Input
              id="sellingPrice"
              type="number"
              value={editedVehicle.sellingPrice || ''}
              onChange={(e) => handleChange('sellingPrice', parseFloat(e.target.value))}
              className="border-green-200 focus:border-green-300"
            />
          </div>
        </div>
        
        {/* Damage */}
        <div className="space-y-2">
          <Label>Schadeomschrijving</Label>
          <Textarea
            value={editedVehicle.damage.description}
            onChange={(e) => handleDamageChange('description', e.target.value)}
            placeholder="Beschrijf eventuele schade..."
            className="min-h-[80px]"
          />
          <Select 
            value={editedVehicle.damage.status} 
            onValueChange={(value: DamageStatus) => handleDamageChange('status', value)}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Selecteer schade status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="geen">Geen schade</SelectItem>
              <SelectItem value="licht">Lichte schade</SelectItem>
              <SelectItem value="middel">Middelmatige schade</SelectItem>
              <SelectItem value="zwaar">Zware schade</SelectItem>
              <SelectItem value="total_loss">Total loss</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Right column */}
      <div className="space-y-5">
        {/* Mileage */}
        <div className="space-y-2">
          <Label htmlFor="mileage">Kilometerstand</Label>
          <Input
            id="mileage"
            type="number"
            value={editedVehicle.mileage}
            onChange={(e) => handleChange('mileage', parseInt(e.target.value))}
          />
        </div>
        
        {/* Checkboxes row */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="onInventory"
              checked={editedVehicle.salesStatus === "voorraad"}
              onCheckedChange={(checked) => 
                handleChange('salesStatus', checked ? "voorraad" : "verkocht_b2c")
              }
            />
            <Label htmlFor="onInventory" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Op Voorraad
            </Label>
          </div>
          
          {/* Show salesperson and payment status when vehicle is sold */}
          {(editedVehicle.salesStatus === "verkocht_b2c" || editedVehicle.salesStatus === "verkocht_b2b") && (
            <div className="ml-6 mt-2 p-4 bg-green-50 border border-green-100 rounded-md space-y-4">
              {/* Salesperson Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center">
                  <User className="h-4 w-4 mr-1 text-muted-foreground" />
                  Verkoper
                </Label>
                <Select 
                  value={editedVehicle.salespersonId || ""} 
                  onValueChange={(value) => {
                    const selectedSalesperson = salespeople?.find(sp => sp.id === value);
                    handleChange('salespersonId', value);
                    handleChange('salespersonName', selectedSalesperson?.name || '');
                  }}
                  disabled={salesLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={salesLoading ? "Laden..." : "Selecteer verkoper"} />
                  </SelectTrigger>
                  <SelectContent>
                    {salespeople?.map((salesperson) => (
                      <SelectItem key={salesperson.id} value={salesperson.id}>
                        {salesperson.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Betaalstatus</Label>
                <Select 
                  value={editedVehicle.paymentStatus || "niet_betaald"} 
                  onValueChange={(value) => handleChange('paymentStatus', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecteer betaalstatus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="niet_betaald">Niet betaald</SelectItem>
                    <SelectItem value="aanbetaling">Aanbetaling</SelectItem>
                    <SelectItem value="volledig_betaald">Volledig betaald</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="bpmRequested"
              checked={editedVehicle.bpmRequested}
              onCheckedChange={(checked) => 
                handleChange('bpmRequested', Boolean(checked))
              }
            />
            <Label htmlFor="bpmRequested" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              BPM Huys aangemeld
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="showroomOnline"
              checked={editedVehicle.showroomOnline}
              onCheckedChange={(checked) => 
                handleChange('showroomOnline', checked)
              }
            />
            <Label htmlFor="showroomOnline" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Showroom online
            </Label>
          </div>
        </div>
        
        {/* CMR */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cmrSent"
              checked={editedVehicle.cmrSent}
              onCheckedChange={(checked) => 
                handleChange('cmrSent', Boolean(checked))
              }
            />
            <Label htmlFor="cmrSent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              CMR verstuurd
            </Label>
          </div>
          
          {editedVehicle.cmrSent && (
            <div className="ml-6 mt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editedVehicle.cmrDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editedVehicle.cmrDate ? format(editedVehicle.cmrDate, "PPP", { locale: nl }) : <span>Selecteer datum</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editedVehicle.cmrDate || undefined}
                    onSelect={(date) => handleChange('cmrDate', date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
        
        {/* Papers */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="papersReceived"
              checked={editedVehicle.papersReceived}
              onCheckedChange={(checked) => 
                handleChange('papersReceived', Boolean(checked))
              }
            />
            <Label htmlFor="papersReceived" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Papieren binnen
            </Label>
          </div>
          
          {editedVehicle.papersReceived && (
            <div className="ml-6 mt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editedVehicle.papersDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editedVehicle.papersDate ? format(editedVehicle.papersDate, "PPP", { locale: nl }) : <span>Selecteer datum</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editedVehicle.papersDate || undefined}
                    onSelect={(date) => handleChange('papersDate', date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
        
        {/* Notes */}
        <div className="space-y-2">
          <Label className="flex items-center space-x-2">
            <span>Notities</span>
          </Label>
          <Textarea
            value={editedVehicle.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Voeg notities toe..."
            className="min-h-[120px]"
          />
        </div>
      </div>
    </div>
  );
};
