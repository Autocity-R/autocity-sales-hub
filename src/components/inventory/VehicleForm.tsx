
import React, { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SupplierSelector } from "./SupplierSelector";
import { cn } from "@/lib/utils";
import { Vehicle, ImportStatus, TransportStatus, WorkshopStatus, DamageStatus, LocationStatus, SalesStatus, PaymentStatus } from "@/types/inventory";

interface VehicleFormProps {
  onSubmit: (data: Omit<Vehicle, "id">) => void;
  initialData?: Omit<Vehicle, "id">;
}

export const VehicleForm: React.FC<VehicleFormProps> = ({ 
  onSubmit,
  initialData
}) => {
  const [formData, setFormData] = useState<Omit<Vehicle, "id"> & { supplierId?: string }>({
    brand: initialData?.brand || "",
    model: initialData?.model || "",
    year: initialData?.year || null,
    color: initialData?.color || "",
    licenseNumber: initialData?.licenseNumber || "",
    vin: initialData?.vin || "",
    mileage: initialData?.mileage || 0,
    importStatus: initialData?.importStatus || "niet_aangemeld",
    transportStatus: initialData?.transportStatus || "onderweg",
    arrived: initialData?.arrived || false,
    workshopStatus: initialData?.workshopStatus || "wachten",
    location: initialData?.location || "showroom",
    salesStatus: initialData?.salesStatus || "voorraad",
    showroomOnline: initialData?.showroomOnline || false,
    bpmRequested: initialData?.bpmRequested || false,
    bpmStarted: initialData?.bpmStarted || false,
    damage: {
      description: initialData?.damage?.description || "",
      status: initialData?.damage?.status || "geen"
    },
    purchasePrice: initialData?.purchasePrice || 0,
    sellingPrice: initialData?.sellingPrice || 0,
    paymentStatus: initialData?.paymentStatus || "niet_betaald",
    cmrSent: initialData?.cmrSent || false,
    cmrDate: initialData?.cmrDate || null,
    papersReceived: initialData?.papersReceived || false,
    papersDate: initialData?.papersDate || null,
    notes: initialData?.notes || "",
    mainPhotoUrl: initialData?.mainPhotoUrl || null,
    photos: initialData?.photos || [],
    customerId: initialData?.customerId || null,
    supplierId: ""
  });
  
  const handleChange = (field: keyof Omit<Vehicle, "id" | "damage"> | "supplierId", value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleDamageChange = (field: keyof Vehicle["damage"], value: any) => {
    setFormData({
      ...formData,
      damage: { ...formData.damage, [field]: value }
    });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Include supplierId in the submission data
    const { supplierId, ...vehicleData } = formData;
    const submitData = { ...vehicleData, supplierId };
    
    onSubmit(submitData);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          <SupplierSelector
            value={formData.supplierId}
            onValueChange={(value) => handleChange('supplierId', value)}
          />
          
          {/* Brand & Model */}
          <div className="space-y-2">
            <Label htmlFor="brand">Merk *</Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) => handleChange('brand', e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="model">Model *</Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => handleChange('model', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="year">Bouwjaar</Label>
            <Input
              id="year"
              type="number"
              value={formData.year || ""}
              onChange={(e) => handleChange('year', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Bijv. 2020"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Kleur</Label>
            <Input
              id="color"
              value={formData.color || ""}
              onChange={(e) => handleChange('color', e.target.value)}
            />
          </div>
          
          {/* License & VIN */}
          <div className="space-y-2">
            <Label htmlFor="licenseNumber">Kenteken *</Label>
            <Input
              id="licenseNumber"
              value={formData.licenseNumber}
              onChange={(e) => handleChange('licenseNumber', e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="vin">VIN (Chassisnummer) *</Label>
            <Input
              id="vin"
              value={formData.vin}
              onChange={(e) => handleChange('vin', e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="mileage">Kilometerstand *</Label>
            <Input
              id="mileage"
              type="number"
              value={formData.mileage}
              onChange={(e) => handleChange('mileage', parseInt(e.target.value))}
              required
            />
          </div>
          
          {/* Purchase Price */}
          <div className="space-y-2">
            <Label htmlFor="purchasePrice">Inkoopprijs (€)</Label>
            <Input
              id="purchasePrice"
              type="number"
              value={formData.purchasePrice}
              onChange={(e) => handleChange('purchasePrice', parseFloat(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sellingPrice">Verkoopprijs (€)</Label>
            <Input
              id="sellingPrice"
              type="number"
              value={formData.sellingPrice}
              onChange={(e) => handleChange('sellingPrice', parseFloat(e.target.value))}
            />
          </div>
        </div>
        
        {/* Right column */}
        <div className="space-y-4">
          {/* Transport Status */}
          <div className="space-y-2">
            <Label>Transport Status</Label>
            <Select 
              value={formData.transportStatus} 
              onValueChange={(value: TransportStatus) => {
                handleChange('transportStatus', value);
                
                // Auto-update related fields when transport status changes
                if (value === 'onderweg') {
                  handleChange('location', 'onderweg');
                  handleChange('salesStatus', 'in_transit');
                  handleChange('showroomOnline', false);
                } else if (value === 'aangekomen') {
                  handleChange('location', 'showroom');
                  handleChange('salesStatus', 'voorraad');
                }
              }}
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
            <Label>Importstatus</Label>
            <Select 
              value={formData.importStatus} 
              onValueChange={(value: ImportStatus) => handleChange('importStatus', value)}
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
            <Label>Werkplaatsstatus</Label>
            <ToggleGroup 
              type="single" 
              value={formData.workshopStatus}
              onValueChange={(value: WorkshopStatus) => {
                if (value) handleChange('workshopStatus', value);
              }}
              className="justify-start grid grid-cols-2 gap-2"
            >
              <ToggleGroupItem value="wachten">Wachten</ToggleGroupItem>
              <ToggleGroupItem value="poetsen">Poetsen</ToggleGroupItem>
              <ToggleGroupItem value="spuiten">Spuiten</ToggleGroupItem>
              <ToggleGroupItem value="gereed">Gereed</ToggleGroupItem>
            </ToggleGroup>
          </div>
          
          {/* Location & Sales Status */}
          <div className="space-y-2">
            <Label>Locatie</Label>
            <Select 
              value={formData.location} 
              onValueChange={(value: LocationStatus) => handleChange('location', value)}
              disabled={formData.transportStatus === 'onderweg'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer locatie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="showroom">Showroom</SelectItem>
                <SelectItem value="opslag">Opslag</SelectItem>
                <SelectItem value="calandstraat">Calandstraat</SelectItem>
                <SelectItem value="werkplaats">Werkplaats</SelectItem>
                <SelectItem value="poetser">Poetser</SelectItem>
                <SelectItem value="spuiter">Spuiter</SelectItem>
                <SelectItem value="onderweg">Onderweg</SelectItem>
                <SelectItem value="oud_beijerland">Oud Beijerland</SelectItem>
              </SelectContent>
            </Select>
            {formData.transportStatus === 'onderweg' && (
              <p className="text-xs text-muted-foreground">
                Locatie wordt automatisch ingesteld op "onderweg" tijdens transport
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Verkoopstatus</Label>
            <Select 
              value={formData.salesStatus} 
              onValueChange={(value: SalesStatus) => handleChange('salesStatus', value)}
              disabled={formData.transportStatus === 'onderweg'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="voorraad">Voorraad</SelectItem>
                <SelectItem value="verkocht_b2b">Verkocht B2B</SelectItem>
                <SelectItem value="verkocht_b2c">Verkocht B2C</SelectItem>
                <SelectItem value="afgeleverd">Afgeleverd</SelectItem>
              </SelectContent>
            </Select>
            {formData.transportStatus === 'onderweg' && (
              <p className="text-xs text-muted-foreground">
                Verkoopstatus kan pas worden ingesteld nadat het voertuig is aangekomen
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Betaalstatus</Label>
            <Select 
              value={formData.paymentStatus} 
              onValueChange={(value: PaymentStatus) => handleChange('paymentStatus', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer betaalstatus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="niet_betaald">Niet betaald</SelectItem>
                <SelectItem value="aanbetaling">Aanbetaling</SelectItem>
                <SelectItem value="volledig_betaald">Volledig betaald</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Checkboxes */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="arrived"
                checked={formData.arrived}
                onCheckedChange={(checked) => 
                  handleChange('arrived', Boolean(checked))
                }
              />
              <Label htmlFor="arrived">Aangekomen</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="bpmRequested"
                checked={formData.bpmRequested}
                onCheckedChange={(checked) => 
                  handleChange('bpmRequested', Boolean(checked))
                }
              />
              <Label htmlFor="bpmRequested">BPM aangevraagd</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="bpmStarted"
                checked={formData.bpmStarted}
                onCheckedChange={(checked) => 
                  handleChange('bpmStarted', Boolean(checked))
                }
              />
              <Label htmlFor="bpmStarted">BPM gestart</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="showroomOnline"
                checked={formData.showroomOnline}
                disabled={formData.transportStatus === 'onderweg'}
                onCheckedChange={(checked) => 
                  handleChange('showroomOnline', checked)
                }
              />
              <Label 
                htmlFor="showroomOnline"
                className={formData.transportStatus === 'onderweg' ? 'text-muted-foreground' : ''}
              >
                Showroom online
                {formData.transportStatus === 'onderweg' && (
                  <span className="text-xs block">
                    (Alleen beschikbaar na aankomst)
                  </span>
                )}
              </Label>
            </div>
          </div>
          
          {/* CMR */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cmrSent"
                checked={formData.cmrSent}
                onCheckedChange={(checked) => 
                  handleChange('cmrSent', Boolean(checked))
                }
              />
              <Label htmlFor="cmrSent">CMR verstuurd</Label>
            </div>
            
            {formData.cmrSent && (
              <div className="ml-6 mt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.cmrDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.cmrDate ? format(formData.cmrDate, "PPP", { locale: nl }) : <span>Selecteer datum</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.cmrDate || undefined}
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
                checked={formData.papersReceived}
                onCheckedChange={(checked) => 
                  handleChange('papersReceived', Boolean(checked))
                }
              />
              <Label htmlFor="papersReceived">Papieren binnen</Label>
            </div>
            
            {formData.papersReceived && (
              <div className="ml-6 mt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.papersDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.papersDate ? format(formData.papersDate, "PPP", { locale: nl }) : <span>Selecteer datum</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.papersDate || undefined}
                      onSelect={(date) => handleChange('papersDate', date)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Damage section - full width */}
      <div className="space-y-2">
        <Label>Schadeomschrijving</Label>
        <Textarea
          value={formData.damage.description}
          onChange={(e) => handleDamageChange('description', e.target.value)}
          placeholder="Beschrijf eventuele schade..."
        />
        <Select 
          value={formData.damage.status} 
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
      
      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notities</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Voeg notities toe..."
        />
      </div>
      
      <DialogFooter>
        <Button type="submit">Voertuig toevoegen</Button>
      </DialogFooter>
    </form>
  );
};
