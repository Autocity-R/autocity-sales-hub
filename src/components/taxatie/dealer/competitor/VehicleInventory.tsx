import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, ExternalLink, Loader2, Package, Clock, TrendingUp } from 'lucide-react';
import { useCompetitorVehicles, useCompetitorDealers } from '@/hooks/useCompetitorDealers';
import { format, differenceInDays } from 'date-fns';
import { nl } from 'date-fns/locale';

interface VehicleInventoryProps {
  dealerId?: string;
}

export function VehicleInventory({ dealerId }: VehicleInventoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'first_seen_at' | 'total_stock_days' | 'price'>('first_seen_at');
  
  const { vehicles, isLoading } = useCompetitorVehicles({ 
    dealerId, 
    status: 'in_stock',
    sortBy,
    sortOrder: 'desc',
  });
  const { dealers } = useCompetitorDealers();

  const filteredVehicles = vehicles.filter(v => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      v.brand?.toLowerCase().includes(search) ||
      v.model?.toLowerCase().includes(search) ||
      v.variant?.toLowerCase().includes(search)
    );
  });

  const formatPrice = (price: number | null) => {
    if (!price) return '-';
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(price);
  };

  const formatMileage = (mileage: number | null) => {
    if (!mileage) return '-';
    return new Intl.NumberFormat('nl-NL').format(mileage) + ' km';
  };

  const getStockDays = (firstSeen: string, totalDays: number) => {
    const days = differenceInDays(new Date(), new Date(firstSeen)) + totalDays;
    return days;
  };

  const getStockDaysBadge = (days: number) => {
    if (days <= 14) return <Badge variant="default" className="bg-green-500">{days}d</Badge>;
    if (days <= 30) return <Badge variant="secondary">{days}d</Badge>;
    if (days <= 60) return <Badge variant="outline" className="text-orange-500 border-orange-500">{days}d</Badge>;
    return <Badge variant="destructive">{days}d</Badge>;
  };

  const getDealerName = (dId: string) => {
    return dealers.find(d => d.id === dId)?.name || 'Onbekend';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Live Voorraad
          </h3>
          <p className="text-sm text-muted-foreground">
            {filteredVehicles.length} voertuigen in voorraad
            {dealerId && ` bij ${getDealerName(dealerId)}`}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op merk, model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Sorteren op..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="first_seen_at">Nieuwste eerst</SelectItem>
              <SelectItem value="total_stock_days">Langste standtijd</SelectItem>
              <SelectItem value="price">Prijs</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {!dealerId && <TableHead>Dealer</TableHead>}
                  <TableHead>Voertuig</TableHead>
                  <TableHead>Bouwjaar</TableHead>
                  <TableHead>Kilometerstand</TableHead>
                  <TableHead>Brandstof</TableHead>
                  <TableHead>Transmissie</TableHead>
                  <TableHead>Prijs</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Stadagen
                    </div>
                  </TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={dealerId ? 8 : 9} className="text-center py-8 text-muted-foreground">
                      {vehicles.length === 0 
                        ? 'Nog geen voertuigen gevonden. Voer eerst een scrape uit.'
                        : 'Geen voertuigen gevonden met deze zoekcriteria'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVehicles.map((vehicle) => {
                    const stockDays = getStockDays(vehicle.first_seen_at, vehicle.total_stock_days);
                    const isNew = differenceInDays(new Date(), new Date(vehicle.first_seen_at)) <= 7;
                    
                    return (
                      <TableRow key={vehicle.id}>
                        {!dealerId && (
                          <TableCell className="text-sm text-muted-foreground">
                            {getDealerName(vehicle.dealer_id)}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-medium">
                                {vehicle.brand} {vehicle.model}
                                {isNew && (
                                  <Badge variant="default" className="ml-2 bg-blue-500 text-xs">
                                    Nieuw
                                  </Badge>
                                )}
                              </div>
                              {vehicle.variant && (
                                <div className="text-sm text-muted-foreground">{vehicle.variant}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{vehicle.build_year || '-'}</TableCell>
                        <TableCell>{formatMileage(vehicle.mileage)}</TableCell>
                        <TableCell>{vehicle.fuel_type || '-'}</TableCell>
                        <TableCell>{vehicle.transmission || '-'}</TableCell>
                        <TableCell className="font-medium">{formatPrice(vehicle.price)}</TableCell>
                        <TableCell>{getStockDaysBadge(stockDays)}</TableCell>
                        <TableCell>
                          {vehicle.external_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a 
                                href={vehicle.external_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
