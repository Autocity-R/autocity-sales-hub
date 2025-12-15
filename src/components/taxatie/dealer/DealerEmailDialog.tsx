import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Send, Sparkles, FileText, RefreshCw, Car, Euro, Info } from 'lucide-react';
import type { VehicleInput, DealerListing } from '@/types/dealerAnalysis';
import { useDealerEmail, type EmailFormData } from '@/hooks/useDealerEmail';

interface DealerEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: VehicleInput;
  dealer: DealerListing;
  onSuccess?: () => void;
}

export const DealerEmailDialog = ({
  open,
  onOpenChange,
  vehicle,
  dealer,
  onSuccess
}: DealerEmailDialogProps) => {
  const { isGenerating, isSending, buildDefaultTemplate, generateWithAI, sendEmail, buildSubject } = useDealerEmail();
  
  // Form state
  const [formData, setFormData] = useState<EmailFormData>({
    subject: '',
    body: '',
    recipientEmail: '',
    recipientName: '',
    brand: '',
    model: '',
    variant: '',
    fuelType: '',
    transmission: '',
    buildYear: 0,
    mileage: 0,
    vin: '',
    b2bPrice: 0,
    maxDamage: 0,
    extraOptions: ''
  });

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      const initialData: EmailFormData = {
        subject: buildSubject(vehicle, {}),
        body: '',
        recipientEmail: dealer.dealerEmail || '',
        recipientName: dealer.dealerName,
        brand: vehicle.brand,
        model: vehicle.model,
        variant: vehicle.variant || '',
        fuelType: vehicle.fuelType,
        transmission: vehicle.transmission,
        buildYear: vehicle.buildYear,
        mileage: vehicle.mileage || 0,
        vin: '',
        b2bPrice: 0,
        maxDamage: 0,
        extraOptions: ''
      };
      setFormData(initialData);
      // Start with template
      const template = buildDefaultTemplate(vehicle, dealer, initialData);
      setFormData(prev => ({ ...prev, body: template }));
    }
  }, [open, vehicle, dealer]);

  const updateField = (field: keyof EmailFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRefreshTemplate = () => {
    const template = buildDefaultTemplate(vehicle, dealer, formData);
    setFormData(prev => ({ ...prev, body: template }));
  };

  const handleGenerateAI = async () => {
    const aiEmail = await generateWithAI(vehicle, dealer, formData);
    if (aiEmail) {
      setFormData(prev => ({ ...prev, body: aiEmail }));
    }
  };

  const handleSend = async () => {
    if (!formData.recipientEmail) {
      return;
    }
    
    const success = await sendEmail(
      formData.recipientEmail,
      formData.recipientName,
      formData.subject,
      formData.body
    );
    
    if (success) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const updateSubject = () => {
    setFormData(prev => ({ ...prev, subject: buildSubject(vehicle, formData) }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            B2B Aanbod Email
          </DialogTitle>
          <DialogDescription>
            Email naar {dealer.dealerName} voor {vehicle.brand} {vehicle.model}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Email recipients */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Verzenden</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Van</Label>
                  <Input value="verkoop@auto-city.nl" disabled className="bg-muted" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Aan</Label>
                  <Input 
                    value={formData.recipientEmail}
                    onChange={(e) => updateField('recipientEmail', e.target.value)}
                    placeholder="email@dealer.nl"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Onderwerp</Label>
                <div className="flex gap-2">
                  <Input 
                    value={formData.subject}
                    onChange={(e) => updateField('subject', e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={updateSubject} title="Genereer onderwerp">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Data & Pricing */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Car className="h-4 w-4" />
                Voertuiggegevens (aanpasbaar)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Merk</Label>
                  <Input 
                    value={formData.brand}
                    onChange={(e) => updateField('brand', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Model</Label>
                  <Input 
                    value={formData.model}
                    onChange={(e) => updateField('model', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Variant</Label>
                  <Input 
                    value={formData.variant}
                    onChange={(e) => updateField('variant', e.target.value)}
                    placeholder="bijv. 30e xDrive"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Brandstof</Label>
                  <Input 
                    value={formData.fuelType}
                    onChange={(e) => updateField('fuelType', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Transmissie</Label>
                  <Input 
                    value={formData.transmission}
                    onChange={(e) => updateField('transmission', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Bouwjaar</Label>
                  <Input 
                    type="number"
                    value={formData.buildYear}
                    onChange={(e) => updateField('buildYear', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">KM-stand</Label>
                  <Input 
                    type="number"
                    value={formData.mileage}
                    onChange={(e) => updateField('mileage', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs">VIN Nummer</Label>
                  <Input 
                    value={formData.vin}
                    onChange={(e) => updateField('vin', e.target.value.toUpperCase())}
                    placeholder="WBAXXXXXXXXXXXXXXX"
                    className="font-mono"
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Euro className="h-3 w-3" />
                    B2B Prijs incl. BTW ex BPM
                  </Label>
                  <Input 
                    type="number"
                    value={formData.b2bPrice}
                    onChange={(e) => updateField('b2bPrice', parseInt(e.target.value) || 0)}
                    placeholder="42500"
                  />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Max. Schadebedrag
                  </Label>
                  <Input 
                    type="number"
                    value={formData.maxDamage}
                    onChange={(e) => updateField('maxDamage', parseInt(e.target.value) || 0)}
                    placeholder="500"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-xs">Extra opties / opmerkingen</Label>
                <Textarea 
                  value={formData.extraOptions}
                  onChange={(e) => updateField('extraOptions', e.target.value)}
                  placeholder="Bijv. panoramadak, trekhaak, leder interieur..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Email Content */}
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Email Inhoud</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRefreshTemplate}
                    disabled={isGenerating}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Vul Template
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleGenerateAI}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    {isGenerating ? 'Genereren...' : 'Genereer met AI'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={formData.body}
                onChange={(e) => updateField('body', e.target.value)}
                rows={20}
                className="font-mono text-sm"
                placeholder="Schrijf je email hier of gebruik de template/AI knoppen..."
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={isSending || !formData.recipientEmail || !formData.body}
            >
              {isSending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Verzenden...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Verstuur Email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
