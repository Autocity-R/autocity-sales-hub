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
import { MessageSquare } from 'lucide-react';

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (feedback: { rating: number; reason?: string; notes: string }) => void;
}

const FEEDBACK_REASONS = [
  { value: 'te_hoog', label: 'AI prijs te hoog', description: 'De aanbevolen prijs was te optimistisch' },
  { value: 'te_laag', label: 'AI prijs te laag', description: 'De aanbevolen prijs was te conservatief' },
  { value: 'te_voorzichtig', label: 'Te voorzichtig', description: 'AI was te terughoudend met kopen-advies' },
  { value: 'te_agressief', label: 'Te agressief', description: 'AI adviseerde te snel om te kopen' },
  { value: 'anders', label: 'Anders', description: 'Andere reden (beschrijf hieronder)' },
];

export const FeedbackModal = ({ open, onOpenChange, onSubmit }: FeedbackModalProps) => {
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    onSubmit({
      rating: 2, // Negative feedback = low rating
      reason: reason as any,
      notes,
    });
    setReason('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Feedback op AI Advies
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Wat was er niet correct?
            </Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {FEEDBACK_REASONS.map((item) => (
                <div
                  key={item.value}
                  className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    reason === item.value
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:bg-muted/50'
                  }`}
                  onClick={() => setReason(item.value)}
                >
                  <RadioGroupItem value={item.value} id={item.value} className="mt-0.5" />
                  <div>
                    <Label htmlFor={item.value} className="font-medium cursor-pointer">
                      {item.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="notes" className="text-sm font-medium mb-2 block">
              Toelichting (optioneel)
            </Label>
            <Textarea
              id="notes"
              placeholder="Geef meer details over wat er beter kon..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Je feedback helpt ons AI systeem te verbeteren. We gebruiken dit om toekomstige 
            taxaties nauwkeuriger te maken.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={!reason}>
            Feedback Versturen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
