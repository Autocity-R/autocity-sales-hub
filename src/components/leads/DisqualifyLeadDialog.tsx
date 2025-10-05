import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { XCircle } from "lucide-react";

interface DisqualifyLeadDialogProps {
  open: boolean;
  onClose: () => void;
  onDisqualify: (reason: string, notes: string) => void;
  leadName: string;
}

const DISQUALIFY_REASONS = [
  { value: 'no_response', label: 'Geen reactie na meerdere pogingen' },
  { value: 'budget_too_low', label: 'Budget te laag' },
  { value: 'competitor_chosen', label: 'Concurrent gekozen' },
  { value: 'not_interested', label: 'Niet langer geïnteresseerd' },
  { value: 'spam', label: 'Spam / Niet serieus' },
  { value: 'timing', label: 'Verkeerde timing (te vroeg/te laat)' },
  { value: 'other', label: 'Andere reden' },
];

export const DisqualifyLeadDialog: React.FC<DisqualifyLeadDialogProps> = ({
  open,
  onClose,
  onDisqualify,
  leadName
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const handleDisqualify = () => {
    if (!selectedReason) return;
    
    const reasonLabel = DISQUALIFY_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;
    onDisqualify(reasonLabel, notes);
    
    // Reset form
    setSelectedReason('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle>Lead diskwalificeren</DialogTitle>
              <DialogDescription>
                {leadName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Reden voor diskwalificatie *</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {DISQUALIFY_REASONS.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.value} id={reason.value} />
                  <Label htmlFor={reason.value} className="font-normal cursor-pointer">
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Aanvullende notities (optioneel)</Label>
            <Textarea
              id="notes"
              placeholder="Voeg eventuele extra details toe..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <p>💡 <strong>Let op:</strong> Deze lead wordt naar "Verloren" verplaatst en na 7 dagen automatisch gearchiveerd uit het actieve overzicht.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDisqualify}
            disabled={!selectedReason}
          >
            Diskwalificeren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
