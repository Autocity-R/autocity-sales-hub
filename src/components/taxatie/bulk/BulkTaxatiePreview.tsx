import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, AlertTriangle, X } from 'lucide-react';
import type { ParsedVehicle, ColumnMapping } from '@/types/bulkTaxatie';

interface BulkTaxatiePreviewProps {
  parsedVehicles: ParsedVehicle[];
  rawData: Record<string, unknown>[];
  columnMapping: ColumnMapping;
}

const ConfidenceBadge = ({ confidence }: { confidence: number }) => {
  if (confidence >= 0.7) {
    return (
      <Badge variant="default" className="bg-green-500 gap-1">
        <Check className="h-3 w-3" />
        {Math.round(confidence * 100)}%
      </Badge>
    );
  }
  if (confidence >= 0.5) {
    return (
      <Badge variant="secondary" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        {Math.round(confidence * 100)}%
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-orange-600 border-orange-300 gap-1">
      <X className="h-3 w-3" />
      {Math.round(confidence * 100)}%
    </Badge>
  );
};

export const BulkTaxatiePreview = ({
  parsedVehicles,
  rawData,
  columnMapping,
}: BulkTaxatiePreviewProps) => {
  // Show first 10 vehicles for preview
  const previewVehicles = parsedVehicles.slice(0, 10);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Preview Geparseerde Voertuigen</span>
          <Badge variant="outline">
            {parsedVehicles.length} voertuigen
          </Badge>
        </CardTitle>
        <CardDescription>
          Controleer of de voertuigdata correct is geparseerd. Eerste {Math.min(10, parsedVehicles.length)} van {parsedVehicles.length} worden getoond.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Originele Beschrijving</TableHead>
                <TableHead>Merk</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Bouwjaar</TableHead>
                <TableHead>Brandstof</TableHead>
                <TableHead>KM</TableHead>
                <TableHead className="text-center">Betrouwbaarheid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewVehicles.map((vehicle, index) => {
                // Get mileage from raw data
                const rawRow = rawData[index];
                const mileage = columnMapping.mileage 
                  ? String(rawRow?.[columnMapping.mileage] || '')
                  : '-';
                
                return (
                  <TableRow 
                    key={index}
                    className={vehicle.confidence < 0.5 ? 'bg-orange-50 dark:bg-orange-950/20' : ''}
                  >
                    <TableCell className="font-mono text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {vehicle.originalDescription}
                    </TableCell>
                    <TableCell className="font-medium">
                      {vehicle.brand || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {vehicle.model || <span className="text-muted-foreground">-</span>}
                      {vehicle.variant && (
                        <span className="text-muted-foreground text-sm ml-1">
                          {vehicle.variant}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {vehicle.buildYear || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {vehicle.fuelType || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="font-mono">
                      {mileage}
                    </TableCell>
                    <TableCell className="text-center">
                      <ConfidenceBadge confidence={vehicle.confidence} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
        
        {parsedVehicles.length > 10 && (
          <p className="text-sm text-muted-foreground mt-4 text-center">
            ... en {parsedVehicles.length - 10} meer voertuigen
          </p>
        )}
      </CardContent>
    </Card>
  );
};
