import React from 'react';
import { DamagePart } from '@/types/tasks';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2, Edit } from 'lucide-react';

interface DamagePartsListProps {
  parts: DamagePart[];
  onEdit: (part: DamagePart) => void;
  onRemove: (partId: string) => void;
}

export const DamagePartsList: React.FC<DamagePartsListProps> = ({
  parts,
  onEdit,
  onRemove,
}) => {
  if (parts.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p>Geen beschadigde delen geselecteerd</p>
        <p className="text-sm mt-1">Klik op een deel in het diagram om te beginnen</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {parts.map((part) => (
        <Card key={part.id} className="p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{part.name}</p>
              <p className="text-sm text-muted-foreground mt-1 break-words">
                {part.instruction}
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(part)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(part.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
