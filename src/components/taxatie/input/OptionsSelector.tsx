import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';

const COMMON_OPTIONS = [
  'Navigatie',
  'Leder',
  'Panoramadak',
  'LED Verlichting',
  'ACC (Adaptive Cruise)',
  'Stoelverwarming',
  'Camera Achter',
  '360° Camera',
  'Elektrische Achterklep',
  'Keyless Entry',
  'Harman Kardon',
  'Head-up Display',
  'Matrix LED',
  'Trekhaak',
  'Sportstoelen',
  'M-Pakket / S-Line / R-Line',
];

interface OptionsSelectorProps {
  selectedOptions: string[];
  onToggleOption: (option: string) => void;
  disabled?: boolean;
}

export const OptionsSelector = ({
  selectedOptions,
  onToggleOption,
  disabled,
}: OptionsSelectorProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Opties Selecteren
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {COMMON_OPTIONS.map((option) => (
            <Badge
              key={option}
              variant={selectedOptions.includes(option) ? 'default' : 'outline'}
              className={`cursor-pointer transition-colors ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/80'
              }`}
              onClick={() => !disabled && onToggleOption(option)}
            >
              {option}
            </Badge>
          ))}
        </div>
        {selectedOptions.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            {selectedOptions.length} optie(s) geselecteerd
          </p>
        )}
      </CardContent>
    </Card>
  );
};
