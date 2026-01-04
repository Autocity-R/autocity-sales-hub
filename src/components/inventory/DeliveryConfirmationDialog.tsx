import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "lucide-react";

interface DeliveryConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: DeliveryData) => void;
  vehicleBrand?: string;
  vehicleModel?: string;
  isCarDealer?: boolean;
}

export interface DeliveryData {
  warrantyPackage: string;
  warrantyPackageName: string;
  warrantyPackagePrice?: number;
  warrantyPackageSource?: 'contract' | 'delivery' | 'manual';
  warrantyPackageDate?: string;
  deliveryDate: Date;
  deliveryNotes?: string;
}

const WARRANTY_PACKAGES = [
  { value: "geen_garantie_b2b", label: "Geen garantie (B2B autobedrijf)", price: 0 },
  { value: "garantie_wettelijk", label: "Wettelijke garantie (12 maanden)", price: 0 },
  { value: "6_maanden_autocity", label: "6 maanden Auto City garantie", price: 500 },
  { value: "12_maanden_autocity", label: "12 maanden Auto City garantie", price: 750 },
  { value: "12_maanden_bovag", label: "12 maanden BOVAG garantie", price: 1000 },
  { value: "12_maanden_bovag_vervangend", label: "12 maanden BOVAG garantie (vervangend vervoer)", price: 1250 },
];

export const DeliveryConfirmationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  vehicleBrand,
  vehicleModel,
  isCarDealer = false
}: DeliveryConfirmationDialogProps) => {
  const [warrantyPackage, setWarrantyPackage] = useState<string>("");
  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [customPrice, setCustomPrice] = useState<string>("");
  const [deliveryNotes, setDeliveryNotes] = useState<string>("");

  // Auto-select "geen garantie" for car dealers
  React.useEffect(() => {
    if (open && isCarDealer) {
      setWarrantyPackage("geen_garantie_b2b");
    } else if (open && !isCarDealer) {
      setWarrantyPackage("");
    }
  }, [open, isCarDealer]);

  const selectedPackage = WARRANTY_PACKAGES.find(p => p.value === warrantyPackage);
  const shouldShowCustomPrice = warrantyPackage && !["garantie_wettelijk", "geen_garantie_b2b"].includes(warrantyPackage);
  const shouldShowWarrantyField = !isCarDealer;

  const handleConfirm = () => {
    // For car dealers, warranty is auto-selected
    // For others, warranty must be manually selected
    if ((!isCarDealer && !warrantyPackage) || !deliveryDate) {
      return;
    }

    const price = customPrice ? parseFloat(customPrice) : selectedPackage?.price;

    onConfirm({
      warrantyPackage: isCarDealer ? "geen_garantie_b2b" : warrantyPackage,
      warrantyPackageName: isCarDealer ? "Geen garantie (B2B autobedrijf)" : (selectedPackage?.label || warrantyPackage),
      warrantyPackagePrice: price,
      warrantyPackageSource: 'delivery',
      warrantyPackageDate: new Date().toISOString(),
      deliveryDate: new Date(deliveryDate),
      deliveryNotes: deliveryNotes.trim() || undefined
    });

    // Reset form
    setWarrantyPackage("");
    setDeliveryDate(new Date().toISOString().split('T')[0]);
    setCustomPrice("");
    setDeliveryNotes("");
  };

  const isValid = (isCarDealer || warrantyPackage) && deliveryDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Voertuig afleveren</DialogTitle>
          <DialogDescription>
            {vehicleBrand && vehicleModel ? (
              <>Vul de garantiegegevens in voor <span className="font-semibold">{vehicleBrand} {vehicleModel}</span></>
            ) : (
              <>Vul de garantiegegevens in voor dit voertuig</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {shouldShowWarrantyField && (
            <div className="grid gap-2">
              <Label htmlFor="warranty-package">
                Garantiepakket <span className="text-destructive">*</span>
              </Label>
              <Select value={warrantyPackage} onValueChange={setWarrantyPackage}>
                <SelectTrigger id="warranty-package">
                  <SelectValue placeholder="Selecteer garantiepakket..." />
                </SelectTrigger>
                <SelectContent>
                  {WARRANTY_PACKAGES.filter(pkg => pkg.value !== "geen_garantie_b2b").map((pkg) => (
                    <SelectItem key={pkg.value} value={pkg.value}>
                      {pkg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isCarDealer && (
            <div className="grid gap-2">
              <Label>Garantiepakket</Label>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                <strong>Geen garantie (B2B autobedrijf)</strong> - Voor zakelijke verkopen aan autobedrijven wordt geen garantie verstrekt.
              </p>
            </div>
          )}

          {shouldShowCustomPrice && (
            <div className="grid gap-2">
              <Label htmlFor="warranty-price">
                Garantieprijs (€)
              </Label>
              <Input
                id="warranty-price"
                type="number"
                placeholder={selectedPackage?.price?.toString() || "0"}
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                min="0"
                step="50"
              />
              <p className="text-xs text-muted-foreground">
                Standaard prijs: €{selectedPackage?.price || 0}. Laat leeg om standaard prijs te gebruiken.
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="delivery-date">
              Afleverdatum <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="delivery-date"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="delivery-notes">
              Notities (optioneel)
            </Label>
            <Textarea
              id="delivery-notes"
              placeholder="Bijzonderheden bij aflevering..."
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Bevestig aflevering
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
