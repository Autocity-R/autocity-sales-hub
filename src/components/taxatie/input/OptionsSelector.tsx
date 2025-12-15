import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Tag, Check } from 'lucide-react';
import { VALUE_OPTIONS, type ValueOption } from '@/data/vehicleData';

interface OptionsSelectorProps {
  selectedOptions: string[];
  onToggleOption: (option: string) => void;
  keywords: string[];
  onKeywordsChange: (keywords: string[]) => void;
  disabled?: boolean;
  fuelType?: string; // Om EV-specifieke opties te tonen/verbergen
}

export const OptionsSelector = ({
  selectedOptions,
  onToggleOption,
  keywords,
  onKeywordsChange,
  disabled,
  fuelType,
}: OptionsSelectorProps) => {
  const [keywordInput, setKeywordInput] = useState('');

  const isEV = fuelType?.toLowerCase().includes('elektr') || fuelType?.toLowerCase().includes('ev');

  // Filter opties: verberg EV-only opties voor niet-EV's
  const visibleOptions = VALUE_OPTIONS.filter(opt => !opt.evOnly || isEV);

  const handleKeywordAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && keywordInput.trim()) {
      e.preventDefault();
      if (!keywords.includes(keywordInput.trim())) {
        onKeywordsChange([...keywords, keywordInput.trim()]);
      }
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    onKeywordsChange(keywords.filter(k => k !== keyword));
  };

  const getImpactColor = (impact: ValueOption['valueImpact']) => {
    switch (impact) {
      case 'hoog': return 'border-green-500 bg-green-500/10';
      case 'medium': return 'border-yellow-500 bg-yellow-500/10';
      case 'laag': return 'border-muted-foreground bg-muted/50';
    }
  };

  const getImpactLabel = (impact: ValueOption['valueImpact']) => {
    switch (impact) {
      case 'hoog': return '+€€€';
      case 'medium': return '+€€';
      case 'laag': return '+€';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Waarde-bepalende Opties
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Selecteer alleen de opties die significant effect hebben op de waarde
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Value-determining options as large clickable cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visibleOptions.map((option) => {
            const isSelected = selectedOptions.includes(option.id);
            const isPanoramadak = option.id === 'panoramadak';
            
            return (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                onClick={() => onToggleOption(option.id)}
                className={`
                  relative p-4 rounded-lg border-2 transition-all text-left
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md cursor-pointer'}
                  ${isSelected 
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/30' 
                    : getImpactColor(option.valueImpact)
                  }
                  ${isPanoramadak && !isSelected ? 'ring-2 ring-orange-400/50' : ''}
                `}
              >
                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                )}
                
                {/* Panoramadak highlight badge */}
                {isPanoramadak && (
                  <Badge 
                    variant="outline" 
                    className="absolute top-2 right-2 text-xs bg-orange-100 text-orange-700 border-orange-300"
                  >
                    Belangrijk!
                  </Badge>
                )}
                
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{option.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Waarde-impact: <span className={
                        option.valueImpact === 'hoog' ? 'text-green-600 font-medium' :
                        option.valueImpact === 'medium' ? 'text-yellow-600 font-medium' :
                        'text-muted-foreground'
                      }>{getImpactLabel(option.valueImpact)}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {selectedOptions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <span className="text-xs text-muted-foreground">Geselecteerd:</span>
            {selectedOptions.map(optId => {
              const opt = VALUE_OPTIONS.find(o => o.id === optId);
              return opt ? (
                <Badge key={optId} variant="default" className="text-xs">
                  {opt.icon} {opt.label}
                </Badge>
              ) : null;
            })}
          </div>
        )}

        {/* Keywords input */}
        <div className="border-t pt-4 space-y-2">
          <Label className="text-xs flex items-center gap-2">
            <Tag className="h-3 w-3" />
            Extra trefwoorden voor portal zoeken
          </Label>
          <Input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleKeywordAdd}
            placeholder="bijv. R-Line, M-pakket (Enter om toe te voegen)"
            disabled={disabled}
            className="text-sm"
          />
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {keywords.map((kw) => (
                <Badge
                  key={kw}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  onClick={() => !disabled && removeKeyword(kw)}
                >
                  {kw} ×
                </Badge>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Druk Enter om trefwoorden toe te voegen. Klik om te verwijderen.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
