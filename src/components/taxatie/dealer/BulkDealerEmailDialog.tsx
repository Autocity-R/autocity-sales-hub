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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Sparkles, 
  FileText, 
  RefreshCw, 
  Car, 
  Euro, 
  Info, 
  Image, 
  X,
  Check,
  AlertCircle,
  Loader2,
  Users
} from 'lucide-react';
import type { VehicleInput, DealerListing } from '@/types/dealerAnalysis';
import { useDealerEmail, type EmailFormData } from '@/hooks/useDealerEmail';

export interface SelectedDealerItem {
  vehicle: VehicleInput;
  dealer: DealerListing;
  id: string; // unique key for each selection
}

interface BulkDealerEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDealers: SelectedDealerItem[];
  onSuccess?: () => void;
  onRemoveDealer?: (id: string) => void;
}

type SendStatus = 'pending' | 'sending' | 'success' | 'error';

interface DealerSendStatus {
  id: string;
  dealerName: string;
  email: string;
  status: SendStatus;
  error?: string;
}

export const BulkDealerEmailDialog = ({
  open,
  onOpenChange,
  selectedDealers,
  onSuccess,
  onRemoveDealer
}: BulkDealerEmailDialogProps) => {
  const { isGenerating, buildDefaultTemplate, generateWithAI, sendEmail, buildSubject, BANNER_URL } = useDealerEmail();
  
  const [isSending, setIsSending] = useState(false);
  const [sendStatuses, setSendStatuses] = useState<DealerSendStatus[]>([]);
  const [currentSendingIndex, setCurrentSendingIndex] = useState(-1);
  
  // Form state - shared across all emails
  const [formData, setFormData] = useState<Partial<EmailFormData>>({
    b2bPrice: 0,
    maxDamage: 0,
    extraOptions: '',
    includeBanner: true,
    vin: ''
  });
  
  const [emailTemplate, setEmailTemplate] = useState('');

  // Get first vehicle for template generation (they should be similar)
  const firstItem = selectedDealers[0];

  // Initialize form when dialog opens
  useEffect(() => {
    if (open && firstItem) {
      const template = buildDefaultTemplate(firstItem.vehicle, firstItem.dealer, formData);
      setEmailTemplate(template);
      
      // Reset send statuses
      setSendStatuses(selectedDealers.map(item => ({
        id: item.id,
        dealerName: item.dealer.dealerName,
        email: item.dealer.dealerEmail || '',
        status: 'pending' as SendStatus
      })));
      setCurrentSendingIndex(-1);
      setIsSending(false);
    }
  }, [open, selectedDealers]);

  const updateField = (field: keyof EmailFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRefreshTemplate = () => {
    if (firstItem) {
      const template = buildDefaultTemplate(firstItem.vehicle, firstItem.dealer, formData);
      setEmailTemplate(template);
    }
  };

  const handleGenerateAI = async () => {
    if (firstItem) {
      const aiEmail = await generateWithAI(firstItem.vehicle, firstItem.dealer, formData);
      if (aiEmail) {
        setEmailTemplate(aiEmail);
      }
    }
  };

  const personalizeTemplate = (template: string, vehicle: VehicleInput, dealer: DealerListing): string => {
    // Replace dealer-specific placeholders
    let personalized = template;
    
    // Update vehicle info for each specific vehicle
    const brand = vehicle.brand;
    const model = vehicle.model;
    const buildYear = vehicle.buildYear;
    const mileage = vehicle.mileage || 0;
    const fuelType = vehicle.fuelType;
    const transmission = vehicle.transmission;
    const variant = vehicle.variant || '';
    
    // Replace vehicle details in template
    personalized = personalized
      .replace(/Merk:\s+\S+/g, `Merk:           ${brand}`)
      .replace(/Model:\s+.+/g, `Model:          ${model}${variant ? ` ${variant}` : ''}`)
      .replace(/Bouwjaar:\s+\d+/g, `Bouwjaar:       ${buildYear}`)
      .replace(/KM-stand:\s+[\d.,]+ km/g, `KM-stand:       ${mileage.toLocaleString('nl-NL')} km`)
      .replace(/Brandstof:\s+\S+/g, `Brandstof:      ${fuelType}`)
      .replace(/Transmissie:\s+\S+/g, `Transmissie:    ${transmission}`);
    
    // Also update the intro line mentioning the vehicle
    const introPattern = /een \S+ \S+ \(\d+\)/;
    personalized = personalized.replace(introPattern, `een ${brand} ${model} (${buildYear})`);
    
    return personalized;
  };

  const handleSendAll = async () => {
    if (selectedDealers.length === 0 || !emailTemplate) return;
    
    setIsSending(true);
    
    // Reset all statuses to pending
    setSendStatuses(selectedDealers.map(item => ({
      id: item.id,
      dealerName: item.dealer.dealerName,
      email: item.dealer.dealerEmail || '',
      status: 'pending' as SendStatus
    })));

    for (let i = 0; i < selectedDealers.length; i++) {
      const item = selectedDealers[i];
      setCurrentSendingIndex(i);
      
      // Update status to sending
      setSendStatuses(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: 'sending' as SendStatus } : s
      ));
      
      if (!item.dealer.dealerEmail) {
        setSendStatuses(prev => prev.map((s, idx) => 
          idx === i ? { ...s, status: 'error' as SendStatus, error: 'Geen email adres' } : s
        ));
        continue;
      }

      try {
        // Personalize the template for this specific vehicle/dealer
        const personalizedBody = personalizeTemplate(emailTemplate, item.vehicle, item.dealer);
        const subject = buildSubject(item.vehicle, formData);
        
        const success = await sendEmail(
          item.dealer.dealerEmail,
          item.dealer.dealerName,
          subject,
          personalizedBody,
          formData.includeBanner ?? true
        );
        
        setSendStatuses(prev => prev.map((s, idx) => 
          idx === i ? { 
            ...s, 
            status: success ? 'success' as SendStatus : 'error' as SendStatus,
            error: success ? undefined : 'Verzenden mislukt'
          } : s
        ));
        
        // Small delay between emails to prevent rate limiting
        if (i < selectedDealers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (err) {
        setSendStatuses(prev => prev.map((s, idx) => 
          idx === i ? { ...s, status: 'error' as SendStatus, error: 'Onverwachte fout' } : s
        ));
      }
    }
    
    setIsSending(false);
    setCurrentSendingIndex(-1);
    
    // Check if all succeeded
    const allSuccess = sendStatuses.every(s => s.status === 'success');
    if (allSuccess) {
      onSuccess?.();
    }
  };

  const successCount = sendStatuses.filter(s => s.status === 'success').length;
  const errorCount = sendStatuses.filter(s => s.status === 'error').length;
  const progress = isSending ? ((currentSendingIndex + 1) / selectedDealers.length) * 100 : 0;

  const handleClose = () => {
    if (!isSending) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk B2B Email ({selectedDealers.length} dealers)
          </DialogTitle>
          <DialogDescription>
            Verstuur gepersonaliseerde emails naar meerdere dealers tegelijk
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected dealers list */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Geselecteerde Dealers ({selectedDealers.length})</span>
                {isSending && (
                  <Badge variant="secondary">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Verzenden {currentSendingIndex + 1}/{selectedDealers.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isSending && (
                <Progress value={progress} className="mb-4 h-2" />
              )}
              <ScrollArea className="h-[150px]">
                <div className="space-y-2">
                  {sendStatuses.map((status, idx) => (
                    <div 
                      key={status.id} 
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border"
                    >
                      <div className="flex items-center gap-3">
                        {status.status === 'pending' && (
                          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                        )}
                        {status.status === 'sending' && (
                          <Loader2 className="h-5 w-5 text-primary animate-spin" />
                        )}
                        {status.status === 'success' && (
                          <Check className="h-5 w-5 text-green-500" />
                        )}
                        {status.status === 'error' && (
                          <AlertCircle className="h-5 w-5 text-destructive" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{status.dealerName}</p>
                          <p className="text-xs text-muted-foreground">{status.email}</p>
                          {status.error && (
                            <p className="text-xs text-destructive">{status.error}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {selectedDealers[idx]?.vehicle.brand} {selectedDealers[idx]?.vehicle.model}
                        </Badge>
                        {!isSending && status.status === 'pending' && onRemoveDealer && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => onRemoveDealer(status.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {/* Summary badges */}
              {(successCount > 0 || errorCount > 0) && (
                <div className="flex gap-2 mt-3">
                  {successCount > 0 && (
                    <Badge variant="default" className="bg-green-500">
                      <Check className="h-3 w-3 mr-1" />
                      {successCount} verzonden
                    </Badge>
                  )}
                  {errorCount > 0 && (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errorCount} mislukt
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing & Options */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Euro className="h-4 w-4" />
                Prijs & Opties (voor alle emails)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">B2B Prijs incl. BTW ex BPM</Label>
                  <Input 
                    type="number"
                    value={formData.b2bPrice || ''}
                    onChange={(e) => updateField('b2bPrice', parseInt(e.target.value) || 0)}
                    placeholder="42500"
                    disabled={isSending}
                  />
                </div>
                <div>
                  <Label className="text-xs">Max. Schadebedrag</Label>
                  <Input 
                    type="number"
                    value={formData.maxDamage || ''}
                    onChange={(e) => updateField('maxDamage', parseInt(e.target.value) || 0)}
                    placeholder="500"
                    disabled={isSending}
                  />
                </div>
                <div>
                  <Label className="text-xs">VIN Nummer</Label>
                  <Input 
                    value={formData.vin || ''}
                    onChange={(e) => updateField('vin', e.target.value.toUpperCase())}
                    placeholder="WBAXXXXXXX"
                    className="font-mono"
                    disabled={isSending}
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-xs">Extra opties / opmerkingen</Label>
                <Textarea 
                  value={formData.extraOptions || ''}
                  onChange={(e) => updateField('extraOptions', e.target.value)}
                  placeholder="Bijv. panoramadak, trekhaak, leder interieur..."
                  rows={2}
                  disabled={isSending}
                />
              </div>
            </CardContent>
          </Card>

          {/* Email Template */}
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Email Template</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRefreshTemplate}
                    disabled={isGenerating || isSending}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Vul Template
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleGenerateAI}
                    disabled={isGenerating || isSending}
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
            <CardContent className="space-y-4">
              <div className="p-2 bg-muted/50 rounded-lg border mb-2">
                <p className="text-xs text-muted-foreground">
                  <Info className="h-3 w-3 inline mr-1" />
                  Voertuiggegevens worden automatisch per dealer aangepast
                </p>
              </div>
              <Textarea 
                value={emailTemplate}
                onChange={(e) => setEmailTemplate(e.target.value)}
                rows={16}
                className="font-mono text-sm"
                placeholder="Schrijf je email hier of gebruik de template/AI knoppen..."
                disabled={isSending}
              />
              
              {/* Banner Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Image className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Autocity Banner</Label>
                    <p className="text-xs text-muted-foreground">
                      Banner tonen onder handtekening
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.includeBanner ?? true}
                  onCheckedChange={(checked) => updateField('includeBanner', checked)}
                  disabled={isSending}
                />
              </div>
              
              {/* Banner Preview */}
              {formData.includeBanner && (
                <div className="p-3 bg-muted/30 rounded-lg border">
                  <Label className="text-xs text-muted-foreground mb-2 block">Banner Preview:</Label>
                  <img 
                    src={BANNER_URL} 
                    alt="Autocity Banner" 
                    className="max-w-full h-auto rounded border"
                    style={{ maxHeight: '60px' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {selectedDealers.length} email(s) worden individueel verstuurd
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} disabled={isSending}>
                {isSending ? 'Bezig...' : 'Annuleren'}
              </Button>
              <Button 
                onClick={handleSendAll} 
                disabled={isSending || selectedDealers.length === 0 || !emailTemplate}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verzenden... ({currentSendingIndex + 1}/{selectedDealers.length})
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Verstuur {selectedDealers.length} Email{selectedDealers.length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
