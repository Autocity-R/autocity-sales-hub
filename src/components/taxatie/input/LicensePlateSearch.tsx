import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';

interface LicensePlateSearchProps {
  licensePlate: string;
  onLicensePlateChange: (value: string) => void;
  onSearch: () => void;
  loading: boolean;
  disabled?: boolean;
}

export const LicensePlateSearch = ({
  licensePlate,
  onLicensePlateChange,
  onSearch,
  loading,
  disabled,
}: LicensePlateSearchProps) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && !disabled) {
      onSearch();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Kenteken Zoeken</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            placeholder="AA-123-BB"
            value={licensePlate}
            onChange={(e) => onLicensePlateChange(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            className="font-mono text-lg tracking-wider"
            disabled={disabled}
          />
          <Button onClick={onSearch} disabled={loading || disabled}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
