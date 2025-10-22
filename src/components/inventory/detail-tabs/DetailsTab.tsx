
import React from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { 
  CalendarIcon, CircleCheck, MapPin, Euro, User, Wrench, Palette
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Vehicle, ImportStatus, TransportStatus, LocationStatus, DamageStatus, WorkshopStatus, PaintStatus } from "@/types/inventory";
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
  readOnly?: boolean;
  showPrices?: boolean;
}

export const DetailsTab: React.FC<DetailsTabProps> = ({
  editedVehicle,
  handleChange,
  handleDamageChange,
  readOnly = false,
  showPrices = true
}) => {
  const { data: salespeople, isLoading: salesLoading } = useSalespeople();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left column */}
      <div className="space-y-5">
        {/* Trade-in Toggle */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg border">
            <Switch
              id="isTradeIn"
              checked={Boolean(editedVehicle.details?.isTradeIn)}
              onCheckedChange={(checked) => {
                const newDetails = {
                  ...(editedVehicle.details || {}),
                  isTradeIn: checked,
                  tradeInDate: checked
                    ? (editedVehicle.details?.tradeInDate || new Date().toISOString())
                    : undefined,
                };
                handleChange('details', newDetails as any);
                if (checked) {
                  handleChange('supplierId', null);
                }
              }}
              disabled={readOnly}
            />
            <div className="flex-1">
              <Label htmlFor="isTradeIn" className="font-semibold cursor-pointer">
                Dit is een inruil voertuig
              </Label>
              <p className="text-xs text-muted-foreground">
                Voertuig is ingeruild, niet ingekocht bij leverancier
              </p>
            </div>
            {editedVehicle.details?.isTradeIn && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                Inruil
              </Badge>
            )}
          </div>
        </div>

        {/* Inruil Informatie */}
        {editedVehicle.details?.isTradeIn && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="bg-emerald-100 text-emerald-700">
                Inruil
              </Badge>
              <h4 className="font-semibold text-emerald-900">
                Inruil Voertuig
              </h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inruil datum:</span>
                <span className="font-medium">
                  {editedVehicle.details.tradeInDate 
                    ? new Date(editedVehicle.details.tradeInDate).toLocaleDateString('nl-NL')
                    : 'Niet opgegeven'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deal gesloten door:</span>
                <span className="font-medium">{editedVehicle.purchasedByName || 'Onbekend'}</span>
              </div>
              {editedVehicle.details.tradeInNotes && (
                <div className="pt-2 border-t border-emerald-200">
                  <span className="text-muted-foreground block mb-1">Notities:</span>
                  <p className="text-sm">{editedVehicle.details.tradeInNotes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Brand & Model */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brand">Merk</Label>
            <Input
              id="brand"
              value={editedVehicle.brand}
              onChange={(e) => handleChange('brand', e.target.value)}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={editedVehicle.model}
              onChange={(e) => handleChange('model', e.target.value)}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Kleur</Label>
            <Input
              id="color"
              value={editedVehicle.color || ""}
              onChange={(e) => handleChange('color', e.target.value)}
              placeholder="Bijv. Zwart, Wit, Zilver"
              disabled={readOnly}
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
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vin">VIN</Label>
            <Input
              id="vin"
              value={editedVehicle.vin}
              onChange={(e) => handleChange('vin', e.target.value)}
              disabled={readOnly}
            />
          </div>
        </div>
        
        {/* Transport Status */}
        <div className="space-y-2">
          <Label>Transport status</Label>
          <Select 
            value={editedVehicle.transportStatus} 
            onValueChange={(value: TransportStatus) => {
              handleChange('transportStatus', value);
              // Preserve sold status when marking as arrived; only auto-set to voorraad if not sold/delivered
              if (
                value === 'aangekomen' &&
                !['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(editedVehicle.salesStatus)
              ) {
                handleChange('salesStatus', 'voorraad');
              }
            }}
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecteer transport status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="onderweg">Onderweg</SelectItem>
              <SelectItem value="transport_geregeld">Transport Geregeld</SelectItem>
              <SelectItem value="aangekomen">Aangekomen</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Import Status */}
        <div className="space-y-2">
          <Label>Import status</Label>
          <Select 
            value={editedVehicle.importStatus} 
            onValueChange={(value: ImportStatus) => handleChange('importStatus', value)}
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecteer status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="niet_aangemeld">Niet aangemeld</SelectItem>
              <SelectItem value="aanvraag_ontvangen">Aanvraag ontvangen</SelectItem>
              <SelectItem value="goedgekeurd">Goedgekeurd</SelectItem>
              <SelectItem value="bpm_betaald">BPM Betaald</SelectItem>
              <SelectItem value="ingeschreven">Ingeschreven</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Workshop Status */}
        <div className="space-y-2">
          <Label className="flex items-center">
            <Wrench className="h-4 w-4 mr-1 text-muted-foreground" />
            Werkplaats status
          </Label>
          <Select 
            value={editedVehicle.workshopStatus} 
            onValueChange={(value: WorkshopStatus) => handleChange('workshopStatus', value)}
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecteer werkplaats status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wachten">Wachten</SelectItem>
              <SelectItem value="poetsen">Poetsen</SelectItem>
              <SelectItem value="spuiten">Spuiten</SelectItem>
              <SelectItem value="gereed">Gereed</SelectItem>
              <SelectItem value="klaar_voor_aflevering">Klaar voor aflevering</SelectItem>
              <SelectItem value="in_werkplaats">In werkplaats</SelectItem>
              <SelectItem value="wacht_op_onderdelen">Wacht op onderdelen</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Paint Status */}
        <div className="space-y-2">
          <Label className="flex items-center">
            <Palette className="h-4 w-4 mr-1 text-muted-foreground" />
            Lak status
          </Label>
          <Select 
            value={editedVehicle.paintStatus || "geen_behandeling"} 
            onValueChange={(value: PaintStatus) => handleChange('paintStatus', value)}
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecteer lak status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="geen_behandeling">Geen behandeling</SelectItem>
              <SelectItem value="in_behandeling">In behandeling</SelectItem>
              <SelectItem value="hersteld">Hersteld</SelectItem>
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
        {showPrices && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Inkoopprijs (€)</Label>
              <Input
                id="purchasePrice"
                type="number"
                value={editedVehicle.purchasePrice}
                onChange={(e) => handleChange('purchasePrice', parseFloat(e.target.value))}
                disabled={readOnly}
              />
            </div>

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
                disabled={readOnly}
                className="border-green-200 focus:border-green-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
        )}
        
        {/* Damage */}
        <div className="space-y-2">
          <Label>Schadeomschrijving</Label>
          <Textarea
            value={editedVehicle.damage.description}
            onChange={(e) => handleDamageChange('description', e.target.value)}
            placeholder="Beschrijf eventuele schade..."
            className="min-h-[80px]"
            disabled={readOnly}
          />
          <Select 
            value={editedVehicle.damage.status} 
            onValueChange={(value: DamageStatus) => handleDamageChange('status', value)}
            disabled={readOnly}
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
        {/* Year & Mileage */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="year">Bouwjaar</Label>
            <Input
              id="year"
              type="number"
              value={editedVehicle.year || ''}
              onChange={(e) => handleChange('year', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Bijv. 2020"
              disabled={readOnly}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="mileage">Kilometerstand</Label>
            <Input
              id="mileage"
              type="number"
              value={editedVehicle.mileage}
              onChange={(e) => handleChange('mileage', parseInt(e.target.value))}
              disabled={readOnly}
            />
          </div>
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
              disabled={readOnly}
            />
            <Label htmlFor="onInventory" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Op Voorraad
            </Label>
          </div>
          
          {/* Salesperson Selection - Always visible for performance tracking */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center">
              <User className="h-4 w-4 mr-1 text-muted-foreground" />
              Verkoper
            </Label>
            <Select 
              value={editedVehicle.salespersonId || "none"} 
              onValueChange={(value) => {
                if (value === "none") {
                  handleChange('salespersonId', null);
                  handleChange('salespersonName', '');
                } else {
                  const selectedSalesperson = salespeople?.find(sp => sp.id === value);
                  handleChange('salespersonId', value);
                  handleChange('salespersonName', selectedSalesperson?.name || '');
                }
              }}
              disabled={salesLoading || readOnly}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder={salesLoading ? "Laden..." : "Selecteer verkoper"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                <SelectItem value="none">Geen verkoper toegewezen</SelectItem>
                {salespeople?.map((salesperson) => (
                  <SelectItem key={salesperson.id} value={salesperson.id}>
                    {salesperson.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Koppel een verkoper voor performance tracking en motivatie
            </p>
          </div>

          {/* Purchaser Selection - For reporting and analytics */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center">
              <User className="h-4 w-4 mr-1 text-muted-foreground" />
              {editedVehicle.details?.isTradeIn ? 'Inruil door' : 'Inkoper'}
            </Label>
            <Select 
              value={editedVehicle.purchasedById || "none"} 
              onValueChange={(value) => {
                if (value === "none") {
                  handleChange('purchasedById', null);
                  handleChange('purchasedByName', '');
                } else {
                  const selectedPurchaser = salespeople?.find(sp => sp.id === value);
                  handleChange('purchasedById', value);
                  handleChange('purchasedByName', selectedPurchaser?.name || '');
                }
              }}
              disabled={salesLoading || readOnly}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder={salesLoading ? "Laden..." : "Selecteer inkoper"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                <SelectItem value="none">Geen inkoper toegewezen</SelectItem>
                {salespeople?.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Koppel een inkoper voor inkoop rapportages en analytics
            </p>
          </div>

          {/* Show payment status when vehicle is sold */}
          {(editedVehicle.salesStatus === "verkocht_b2c" || editedVehicle.salesStatus === "verkocht_b2b") && (
            <div className="ml-6 mt-2 p-4 bg-green-50 border border-green-100 rounded-md space-y-4">
              {/* Payment Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Betaalstatus</Label>
                <Select 
                  value={editedVehicle.paymentStatus || "niet_betaald"} 
                  onValueChange={(value) => handleChange('paymentStatus', value)}
                  disabled={readOnly}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Selecteer betaalstatus" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
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
              disabled={readOnly}
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
