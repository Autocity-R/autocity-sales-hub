import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { MessageSquare, ThumbsUp, AlertCircle } from 'lucide-react';
import { TaxatieFeedbackType, TaxatieCorrectionType, PortalListing } from '@/types/taxatie';

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (feedback: {
    rating: number;
    reason?: TaxatieFeedbackType;
    notes: string;
    referencedListingId?: string;
    userReasoning?: string;
    userSuggestedPrice?: number;
    correctionType?: TaxatieCorrectionType;
  }) => void;
  listings?: PortalListing[];
}

interface FeedbackReason {
  value: TaxatieFeedbackType;
  label: string;
  description: string;
  isPositive?: boolean;
  requiresReasoning?: boolean;
  correctionType?: TaxatieCorrectionType;
}

const FEEDBACK_REASONS: FeedbackReason[] = [
  { 
    value: 'goede_taxatie', 
    label: '✅ Goede taxatie!', 
    description: 'De AI had het goed - bewaar deze denkwijze',
    isPositive: true,
  },
  { 
    value: 'te_hoog', 
    label: 'AI prijs te hoog', 
    description: 'De aanbevolen prijs was te optimistisch',
    requiresReasoning: true,
  },
  { 
    value: 'te_laag', 
    label: 'AI prijs te laag', 
    description: 'De aanbevolen prijs was te conservatief',
    requiresReasoning: true,
  },
  { 
    value: 'listing_niet_herkend', 
    label: 'Listing niet herkend', 
    description: 'AI negeerde een belangrijke listing',
    requiresReasoning: true,
    correctionType: 'listing',
  },
  { 
    value: 'verkeerde_referentie', 
    label: 'Verkeerde referentie', 
    description: 'AI gebruikte de verkeerde auto als referentie',
    requiresReasoning: true,
    correctionType: 'listing',
  },
  { 
    value: 'km_correctie_fout', 
    label: 'KM-correctie fout', 
    description: 'AI corrigeerde verkeerd voor kilometerstand',
    requiresReasoning: true,
    correctionType: 'km',
  },
  { 
    value: 'uitvoering_correctie_fout', 
    label: 'Uitvoering verkeerd gewaardeerd', 
    description: 'AI waardeerde de uitvoering/opties verkeerd',
    requiresReasoning: true,
    correctionType: 'uitvoering',
  },
  { 
    value: 'markt_verkeerd_ingeschat', 
    label: 'Markt verkeerd ingeschat', 
    description: 'AI begreep de marktdynamiek niet goed',
    requiresReasoning: true,
    correctionType: 'markt',
  },
  { 
    value: 'te_voorzichtig', 
    label: 'Te voorzichtig', 
    description: 'AI was te terughoudend met kopen-advies',
    requiresReasoning: true,
  },
  { 
    value: 'te_agressief', 
    label: 'Te agressief', 
    description: 'AI adviseerde te snel om te kopen',
    requiresReasoning: true,
  },
  { 
    value: 'anders', 
    label: 'Anders', 
    description: 'Andere reden (beschrijf hieronder)',
    requiresReasoning: true,
    correctionType: 'anders',
  },
];

export const FeedbackModal = ({ open, onOpenChange, onSubmit, listings = [] }: FeedbackModalProps) => {
  const [reason, setReason] = useState<TaxatieFeedbackType | ''>('');
  const [notes, setNotes] = useState('');
  const [userReasoning, setUserReasoning] = useState('');
  const [userSuggestedPrice, setUserSuggestedPrice] = useState<string>('');
  const [selectedListingId, setSelectedListingId] = useState<string>('');

  const selectedFeedback = FEEDBACK_REASONS.find(f => f.value === reason);
  const isPositive = selectedFeedback?.isPositive;
  const requiresReasoning = selectedFeedback?.requiresReasoning;
  const showListingSelector = ['listing_niet_herkend', 'verkeerde_referentie'].includes(reason);

  const handleSubmit = () => {
    onSubmit({
      rating: isPositive ? 5 : 2,
      reason: reason as TaxatieFeedbackType,
      notes,
      referencedListingId: selectedListingId || undefined,
      userReasoning: userReasoning || undefined,
      userSuggestedPrice: userSuggestedPrice ? parseFloat(userSuggestedPrice) : undefined,
      correctionType: selectedFeedback?.correctionType,
    });
    // Reset form
    setReason('');
    setNotes('');
    setUserReasoning('');
    setUserSuggestedPrice('');
    setSelectedListingId('');
  };

  const canSubmit = reason && (isPositive || userReasoning.trim().length > 10);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Feedback op AI Advies
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Feedback type selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Hoe was het AI advies?
            </Label>
            <RadioGroup value={reason} onValueChange={(v) => setReason(v as TaxatieFeedbackType)}>
              {FEEDBACK_REASONS.map((item) => (
                <div
                  key={item.value}
                  className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    reason === item.value
                      ? item.isPositive 
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-primary bg-primary/5'
                      : 'border-muted hover:bg-muted/50'
                  }`}
                  onClick={() => setReason(item.value)}
                >
                  <RadioGroupItem value={item.value} id={item.value} className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor={item.value} className="font-medium cursor-pointer flex items-center gap-2">
                      {item.isPositive && <ThumbsUp className="h-4 w-4 text-green-500" />}
                      {item.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Listing selector - only show for listing-related feedback */}
          {showListingSelector && listings.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Welke listing was de betere referentie? (optioneel)
              </Label>
              <select
                value={selectedListingId}
                onChange={(e) => setSelectedListingId(e.target.value)}
                className="w-full p-2 border rounded-md bg-background text-sm"
              >
                <option value="">Selecteer een listing...</option>
                {listings.slice(0, 10).map((listing, idx) => (
                  <option key={listing.id || idx} value={listing.id || listing.url}>
                    {listing.title} - €{listing.price?.toLocaleString('nl-NL')} ({listing.mileage?.toLocaleString('nl-NL')} km)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* User suggested price - only show for price-related feedback */}
          {['te_hoog', 'te_laag'].includes(reason) && (
            <div>
              <Label htmlFor="suggestedPrice" className="text-sm font-medium mb-2 block">
                Wat was jouw inschatting? (optioneel)
              </Label>
              <Input
                id="suggestedPrice"
                type="number"
                placeholder="Bijv. 25000"
                value={userSuggestedPrice}
                onChange={(e) => setUserSuggestedPrice(e.target.value)}
                className="max-w-48"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Dit helpt de AI om beter te begrijpen hoeveel je verwachtte
              </p>
            </div>
          )}

          {/* User reasoning - required for negative feedback */}
          {requiresReasoning && (
            <div>
              <Label htmlFor="reasoning" className="text-sm font-medium mb-2 block flex items-center gap-2">
                Leg je redenering uit
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reasoning"
                placeholder="Leg uit HOE de AI anders had moeten denken. Bijv: 'De laagste listing was met schade, dus die had genegeerd moeten worden. De tweede listing was de betere referentie omdat...'"
                value={userReasoning}
                onChange={(e) => setUserReasoning(e.target.value)}
                rows={4}
                className={userReasoning.length < 10 && reason ? 'border-destructive' : ''}
              />
              {userReasoning.length < 10 && reason && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Minimaal 10 tekens nodig - leg uit HOE de AI moet denken
                </p>
              )}
            </div>
          )}

          {/* Additional notes */}
          <div>
            <Label htmlFor="notes" className="text-sm font-medium mb-2 block">
              Extra opmerkingen (optioneel)
            </Label>
            <Textarea
              id="notes"
              placeholder="Eventuele extra opmerkingen..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Info text */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">
              {isPositive ? (
                <>
                  🎉 <strong>Positieve feedback</strong> helpt de AI om te leren wat goed werkt. 
                  Deze denkwijze wordt onthouden voor toekomstige taxaties.
                </>
              ) : (
                <>
                  🧠 <strong>Jouw uitleg</strong> helpt de AI om zijn <em>denkwijze</em> aan te passen, 
                  niet alleen de getallen. Hoe specifieker je uitlegt HOE de AI anders moest denken, 
                  hoe beter de AI leert.
                </>
              )}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!canSubmit}
            variant={isPositive ? 'default' : 'default'}
            className={isPositive ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {isPositive ? 'Bevestig Goede Taxatie' : 'Feedback Versturen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
