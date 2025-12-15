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
import { Search, ExternalLink, Loader2, ShoppingCart, Clock, RotateCcw } from 'lucide-react';
import { useCompetitorVehicles, useCompetitorDealers } from '@/hooks/useCompetitorDealers';
import { format, differenceInDays } from 'date-fns';
import { nl } from 'date-fns/locale';

interface SoldVehiclesProps {
  dealerId?: string;
}

export function SoldVehicles({ dealerId }: SoldVehiclesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'sold_at' | 'total_stock_days' | 'price'>('sold_at');
  
  const { vehicles, isLoading } = useCompetitorVehicles({ 
    dealerId, 
    status: 'sold',
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

  const getDealerName = (dId: string) => {
    return dealers.find(d => d.id === dId)?.name || 'Onbekend';
  };

  // Calculate stats
  const soldThisWeek = filteredVehicles.filter(v => 
    v.sold_at && differenceInDays(new Date(), new Date(v.sold_at)) <= 7
  ).length;
  
  const soldThisMonth = filteredVehicles.filter(v => 
    v.sold_at && differenceInDays(new Date(), new Date(v.sold_at)) <= 30
  ).length;

  const avgStockDays = filteredVehicles.length > 0
    ? Math.round(filteredVehicles.reduce((sum, v) => sum + (v.total_stock_days || 0), 0) / filteredVehicles.length)
    : 0;

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
            <ShoppingCart className="h-5 w-5" />
            Verkochte Voertuigen
          </h3>
          <p className="text-sm text-muted-foreground">
            {filteredVehicles.length} voertuigen verkocht
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
              <SelectItem value="sold_at">Recent verkocht</SelectItem>
              <SelectItem value="total_stock_days">Standtijd</SelectItem>
              <SelectItem value="price">Prijs</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{soldThisWeek}</div>
            <p className="text-sm text-muted-foreground">Verkocht deze week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{soldThisMonth}</div>
            <p className="text-sm text-muted-foreground">Verkocht deze maand</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{avgStockDays} dagen</div>
            <p className="text-sm text-muted-foreground">Gem. standtijd</p>
          </CardContent>
        </Card>
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
                  <TableHead>Prijs</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Standtijd
                    </div>
                  </TableHead>
                  <TableHead>Verkocht op</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={dealerId ? 8 : 9} className="text-center py-8 text-muted-foreground">
                      Nog geen verkochte voertuigen geregistreerd
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVehicles.map((vehicle) => {
                    const hasReappeared = (vehicle.reappeared_count || 0) > 0;
                    
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
                              <div className="font-medium flex items-center gap-2">
                                {vehicle.brand} {vehicle.model}
                                {hasReappeared && (
                                  <Badge variant="outline" className="text-orange-500 border-orange-500">
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                    {vehicle.reappeared_count}x herplaatst
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
                        <TableCell className="font-medium">{formatPrice(vehicle.price)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{vehicle.total_stock_days} dagen</Badge>
                        </TableCell>
                        <TableCell>
                          {vehicle.sold_at ? (
                            <span className="text-sm">
                              {format(new Date(vehicle.sold_at), 'dd MMM yyyy', { locale: nl })}
                            </span>
                          ) : '-'}
                        </TableCell>
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
