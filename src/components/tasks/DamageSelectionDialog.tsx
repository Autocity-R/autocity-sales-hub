import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { VehicleDamageSelector } from './VehicleDamageSelector';
import { DamagePart } from '@/types/tasks';

interface DamageSelectionDialogProps {
  isOpen: boolean;
  initialParts: DamagePart[];
  onSave: (parts: DamagePart[]) => void;
  onClose: () => void;
}

export const DamageSelectionDialog: React.FC<DamageSelectionDialogProps> = ({
  isOpen,
  initialParts,
  onSave,
  onClose,
}) => {
  const [tempParts, setTempParts] = useState<DamagePart[]>(initialParts);

  useEffect(() => {
    if (isOpen) {
      setTempParts(initialParts);
    }
  }, [isOpen, initialParts]);

  const handleSave = () => {
    onSave(tempParts);
    onClose();
  };

  const handleCancel = () => {
    setTempParts(initialParts);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schadedelen Selecteren</DialogTitle>
          <DialogDescription>
            Klik op de beschadigde delen van de auto en voeg instructies toe voor het herstel
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <VehicleDamageSelector
            selectedParts={tempParts}
            onPartsChange={setTempParts}
          />
        </div>

        <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Annuleren
          </Button>
          <Button onClick={handleSave}>
            Schade Opslaan ({tempParts.length} {tempParts.length === 1 ? 'deel' : 'delen'})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
