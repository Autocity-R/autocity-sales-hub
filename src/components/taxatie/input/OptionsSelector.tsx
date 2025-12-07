import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { OPTIONS_BY_CATEGORY, CATEGORY_LABELS, type VehicleOption } from '@/data/vehicleData';

interface OptionsSelectorProps {
  selectedOptions: string[];
  onToggleOption: (option: string) => void;
  keywords: string[];
  onKeywordsChange: (keywords: string[]) => void;
  disabled?: boolean;
}

export const OptionsSelector = ({
  selectedOptions,
  onToggleOption,
  keywords,
  onKeywordsChange,
  disabled,
}: OptionsSelectorProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['premium']));
  const [keywordInput, setKeywordInput] = useState('');

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

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

  const renderCategory = (category: string, options: VehicleOption[]) => {
    const isExpanded = expandedCategories.has(category);
    const selectedInCategory = options.filter(o => selectedOptions.includes(o.id)).length;

    return (
      <Collapsible key={category} open={isExpanded} onOpenChange={() => toggleCategory(category)}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <span className="text-sm font-medium">{CATEGORY_LABELS[category]}</span>
          <div className="flex items-center gap-2">
            {selectedInCategory > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedInCategory}
              </Badge>
            )}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="flex flex-wrap gap-2 pl-2">
            {options.map((option) => (
              <Badge
                key={option.id}
                variant={selectedOptions.includes(option.id) ? 'default' : 'outline'}
                className={`cursor-pointer transition-all ${
                  disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/80'
                } ${selectedOptions.includes(option.id) ? 'ring-2 ring-primary/30' : ''}`}
                onClick={() => !disabled && onToggleOption(option.id)}
              >
                {option.label}
              </Badge>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Opties & Trefwoorden
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Options by category */}
        <div className="space-y-1">
          {Object.entries(OPTIONS_BY_CATEGORY).map(([category, options]) => 
            renderCategory(category, options)
          )}
        </div>

        {selectedOptions.length > 0 && (
          <p className="text-xs text-muted-foreground border-t pt-3">
            {selectedOptions.length} optie(s) geselecteerd
          </p>
        )}

        {/* Keywords input */}
        <div className="border-t pt-4 space-y-2">
          <Label className="text-xs flex items-center gap-2">
            <Tag className="h-3 w-3" />
            Trefwoorden voor portal zoeken
          </Label>
          <Input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleKeywordAdd}
            placeholder="bijv. R-Line, panoramadak (Enter om toe te voegen)"
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
