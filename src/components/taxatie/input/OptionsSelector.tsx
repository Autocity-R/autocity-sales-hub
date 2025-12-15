import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Tag, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface OptionsSelectorProps {
  selectedOptions: string[];
  onToggleOption: (option: string) => void;
  keywords: string[];
  onKeywordsChange: (keywords: string[]) => void;
  disabled?: boolean;
  fuelType?: string;
  // New props for dynamic options
  make?: string;
  model?: string;
  transmission?: string;
  buildYear?: number;
}

interface JPCarsOption {
  id: string;
  label: string;
  jpcarsKey: string;
}

// Format option label for display
function formatOptionLabel(option: string): string {
  return option
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export const OptionsSelector = ({
  selectedOptions,
  onToggleOption,
  keywords,
  onKeywordsChange,
  disabled,
  fuelType,
  make,
  model,
  transmission,
  buildYear,
}: OptionsSelectorProps) => {
  const [keywordInput, setKeywordInput] = useState('');
  const [availableOptions, setAvailableOptions] = useState<JPCarsOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load options from JP Cars API when vehicle data changes
  useEffect(() => {
    const loadOptions = async () => {
      if (!make || !fuelType) {
        setAvailableOptions([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('jpcars-values', {
          body: { 
            type: 'options',
            make, 
            model: model || undefined,
            fuel: fuelType,
            gear: transmission || undefined,
            build: buildYear || undefined,
          },
        });

        if (error) throw error;

        if (data?.success && data.values?.length > 0) {
          console.log('✅ JP Cars options loaded:', data.values.length, 'options');
          const options: JPCarsOption[] = data.values.map((opt: string) => ({
            id: opt.toLowerCase().replace(/\s+/g, '_'),
            label: formatOptionLabel(opt),
            jpcarsKey: opt,
          }));
          setAvailableOptions(options);
        } else {
          console.log('⚠️ No options from JP Cars');
          setAvailableOptions([]);
        }
      } catch (err) {
        console.error('Error loading JP Cars options:', err);
        setAvailableOptions([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadOptions();
  }, [make, model, fuelType, transmission, buildYear]);

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

  const handleToggle = (option: JPCarsOption) => {
    onToggleOption(option.jpcarsKey);
  };

  const isSelected = (option: JPCarsOption) => {
    return selectedOptions.includes(option.jpcarsKey) || 
           selectedOptions.includes(option.id);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5" />
          JP Cars Opties
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {availableOptions.length > 0 
            ? `${availableOptions.length} opties beschikbaar voor ${make}${model ? ` ${model}` : ''}`
            : make ? 'Opties worden geladen...' : 'Selecteer eerst een merk om opties te laden'
          }
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dynamic options from JP Cars - compact grid */}
        {availableOptions.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-1">
            {availableOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                onClick={() => handleToggle(option)}
                className={cn(
                  "text-[11px] px-2 py-1.5 rounded border truncate transition-all text-left",
                  disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted cursor-pointer',
                  isSelected(option)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:border-primary/50'
                )}
                title={option.label}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {/* No options message */}
        {!isLoading && availableOptions.length === 0 && make && (
          <div className="text-sm text-muted-foreground text-center py-4">
            Geen opties beschikbaar voor dit voertuig
          </div>
        )}

        {/* Selected options display */}
        {selectedOptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t">
            <span className="text-xs text-muted-foreground w-full mb-1">Geselecteerd ({selectedOptions.length}):</span>
            {selectedOptions.map(opt => {
              const found = availableOptions.find(o => o.jpcarsKey === opt || o.id === opt);
              return (
                <Badge key={opt} variant="default" className="text-xs">
                  {found?.label || formatOptionLabel(opt)}
                </Badge>
              );
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
