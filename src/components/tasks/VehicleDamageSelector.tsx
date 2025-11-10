import React, { useState } from 'react';
import { DamagePart } from '@/types/tasks';
import { CarDiagram, CAR_PARTS } from './CarDiagram';
import { DamagePartDialog } from './DamagePartDialog';
import { DamagePartsList } from './DamagePartsList';
import { Label } from '@/components/ui/label';

interface VehicleDamageSelectorProps {
  selectedParts: DamagePart[];
  onPartsChange: (parts: DamagePart[]) => void;
}

export const VehicleDamageSelector: React.FC<VehicleDamageSelectorProps> = ({
  selectedParts,
  onPartsChange,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPartId, setCurrentPartId] = useState<string | null>(null);

  const handlePartClick = (partId: string) => {
    setCurrentPartId(partId);
    setDialogOpen(true);
  };

  const handleSaveInstruction = (instruction: string) => {
    if (!currentPartId) return;

    const partInfo = CAR_PARTS.find(p => p.id === currentPartId);
    if (!partInfo) return;

    const existingPartIndex = selectedParts.findIndex(p => p.id === currentPartId);
    
    if (existingPartIndex >= 0) {
      // Update existing part
      const updatedParts = [...selectedParts];
      updatedParts[existingPartIndex] = {
        ...updatedParts[existingPartIndex],
        instruction,
      };
      onPartsChange(updatedParts);
    } else {
      // Add new part
      onPartsChange([
        ...selectedParts,
        {
          id: currentPartId,
          name: partInfo.name,
          instruction,
        },
      ]);
    }
  };

  const handleEditPart = (part: DamagePart) => {
    setCurrentPartId(part.id);
    setDialogOpen(true);
  };

  const handleRemovePart = (partId: string) => {
    onPartsChange(selectedParts.filter(p => p.id !== partId));
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setCurrentPartId(null);
  };

  const currentPart = currentPartId 
    ? CAR_PARTS.find(p => p.id === currentPartId) 
    : null;
  
  const currentInstruction = currentPartId
    ? selectedParts.find(p => p.id === currentPartId)?.instruction
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <Label className="mb-3 block">Selecteer beschadigde delen</Label>
        <CarDiagram
          selectedPartIds={selectedParts.map(p => p.id)}
          onPartClick={handlePartClick}
        />
      </div>

      <div>
        <Label className="mb-3 block">Geselecteerde delen ({selectedParts.length})</Label>
        <DamagePartsList
          parts={selectedParts}
          onEdit={handleEditPart}
          onRemove={handleRemovePart}
        />
      </div>

      {currentPart && (
        <DamagePartDialog
          isOpen={dialogOpen}
          partName={currentPart.name}
          currentInstruction={currentInstruction}
          onSave={handleSaveInstruction}
          onClose={handleDialogClose}
        />
      )}
    </div>
  );
};
