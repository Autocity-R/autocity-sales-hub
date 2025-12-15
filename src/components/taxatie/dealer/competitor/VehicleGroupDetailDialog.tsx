import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ExternalLink } from 'lucide-react';
import { useVehiclesByIds } from '@/hooks/useCompetitorDealers';
import type { TopVehicleGroup } from '@/types/competitor';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface VehicleGroupDetailDialogProps {
  group: TopVehicleGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VehicleGroupDetailDialog({ group, open, onOpenChange }: VehicleGroupDetailDialogProps) {
  const { vehicles, isLoading } = useVehiclesByIds(group?.vehicleIds || [], open && !!group);

  if (!group) return null;

  const formatPrice = (price: number | null) => {
    if (!price) return '-';
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);
  };

  const formatMileage = (km: number | null) => {
    if (!km) return '-';
    return `${km.toLocaleString('nl-NL')} km`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {group.brand} {group.model} {group.buildYear} ({group.mileageRange} km)
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{group.inStock + group.sold} voertuigen</span>
            <span>•</span>
            <span>Gem. standtijd: {group.avgStockDays}d</span>
            <span>•</span>
            <span>Prijs: {formatPrice(group.minPrice)} - {formatPrice(group.maxPrice)}</span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Prijs</TableHead>
                  <TableHead>KM</TableHead>
                  <TableHead>Standtijd</TableHead>
                  <TableHead>Brandstof</TableHead>
                  <TableHead>Transmissie</TableHead>
                  <TableHead>Kleur</TableHead>
                  <TableHead>Dealer</TableHead>
                  <TableHead>Verkocht op</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <Badge variant={v.status === 'in_stock' ? 'default' : 'secondary'}>
                        {v.status === 'in_stock' ? 'Voorraad' : 'Verkocht'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{formatPrice(v.price)}</TableCell>
                    <TableCell>{formatMileage(v.mileage)}</TableCell>
                    <TableCell>{v.total_stock_days}d</TableCell>
                    <TableCell>{v.fuel_type || '-'}</TableCell>
                    <TableCell>{v.transmission || '-'}</TableCell>
                    <TableCell>{v.color || '-'}</TableCell>
                    <TableCell className="text-sm">{v.dealer?.name || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {v.sold_at 
                        ? format(new Date(v.sold_at), 'dd MMM yyyy', { locale: nl })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {v.external_url && (
                        <a 
                          href={v.external_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
