import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface DamagePartDialogProps {
  isOpen: boolean;
  partName: string;
  currentInstruction?: string;
  onSave: (instruction: string) => void;
  onClose: () => void;
}

export const DamagePartDialog: React.FC<DamagePartDialogProps> = ({
  isOpen,
  partName,
  currentInstruction,
  onSave,
  onClose,
}) => {
  const [instruction, setInstruction] = useState(currentInstruction || '');

  useEffect(() => {
    setInstruction(currentInstruction || '');
  }, [currentInstruction, isOpen]);

  const handleSave = () => {
    if (instruction.trim()) {
      onSave(instruction.trim());
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schade aan {partName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="instruction">Wat moet er gebeuren?</Label>
            <Textarea
              id="instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Bijv: Compleet opnieuw spuiten, kleur: zwart metallic"
              className="min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={!instruction.trim()}>
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
