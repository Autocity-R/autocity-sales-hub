import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, TrendingUp, TrendingDown, Car, DollarSign, Shield } from 'lucide-react';
import { B2CSalespersonStats } from '@/types/branchManager';
import { ReportPeriod } from '@/types/reports';
import { cn } from '@/lib/utils';

interface B2CSalespersonTableProps {
  salespersons: B2CSalespersonStats[];
  period: ReportPeriod;
}

export const B2CSalespersonTable: React.FC<B2CSalespersonTableProps> = ({ 
  salespersons,
  period 
}) => {
  const [selectedSalesperson, setSelectedSalesperson] = useState<B2CSalespersonStats | null>(null);

  const getTargetBadge = (targetPercent: number) => {
    if (targetPercent >= 100) {
      return (
        <Badge className="bg-green-500 text-white">
          <TrendingUp className="h-3 w-3 mr-1" />
          {targetPercent.toFixed(0)}%
        </Badge>
      );
    }
    if (targetPercent >= 80) {
      return (
        <Badge className="bg-yellow-500 text-white">
          {targetPercent.toFixed(0)}%
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-500 text-white">
        <TrendingDown className="h-3 w-3 mr-1" />
        {targetPercent.toFixed(0)}%
      </Badge>
    );
  };

  const getMarginColor = (marginPercent: number) => {
    if (marginPercent >= 15) return 'text-green-600';
    if (marginPercent >= 12) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (salespersons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Verkoper B2C Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Geen B2C verkopen in deze periode
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Verkoper B2C Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Verkoper</TableHead>
                <TableHead className="text-center">Verkopen</TableHead>
                <TableHead className="text-center">Target %</TableHead>
                <TableHead className="text-right">Totale Marge</TableHead>
                <TableHead className="text-center">Marge %</TableHead>
                <TableHead className="text-center">Pakketten</TableHead>
                <TableHead className="text-center">Upsell %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salespersons.map((sp, index) => (
                <TableRow 
                  key={sp.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedSalesperson(sp)}
                >
                  <TableCell className="font-medium">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    {sp.name}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-bold">{sp.b2cSales}</span>
                    <span className="text-muted-foreground">/{sp.target}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {getTargetBadge(sp.targetPercent)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(sp.totalMargin)}
                  </TableCell>
                  <TableCell className={cn("text-center font-medium", getMarginColor(sp.marginPercent))}>
                    {sp.marginPercent.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Shield className="h-3 w-3 text-blue-500" />
                      <span className="font-medium">{sp.upsellCount}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {sp.upsellRatio.toFixed(0)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSalesperson} onOpenChange={(open) => !open && setSelectedSalesperson(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Verkopen - {selectedSalesperson?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedSalesperson && (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Totaal Verkocht</span>
                  </div>
                  <div className="text-2xl font-bold">{selectedSalesperson.b2cSales}</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Totale Omzet</span>
                  </div>
                  <div className="text-2xl font-bold">{formatCurrency(selectedSalesperson.totalRevenue)}</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Totale Marge</span>
                  </div>
                  <div className="text-2xl font-bold">{formatCurrency(selectedSalesperson.totalMargin)}</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Gem. Marge</span>
                  </div>
                  <div className="text-2xl font-bold">{selectedSalesperson.marginPercent.toFixed(1)}%</div>
                </div>
              </div>

              {/* Sales Table */}
              <ScrollArea className="h-[400px] w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Voertuig</TableHead>
                      <TableHead className="text-right">Inkoopprijs</TableHead>
                      <TableHead className="text-right">Verkoopprijs</TableHead>
                      <TableHead className="text-right">Marge €</TableHead>
                      <TableHead className="text-right">Marge %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...selectedSalesperson.vehicles]
                      .sort((a, b) => new Date(b.soldDate).getTime() - new Date(a.soldDate).getTime())
                      .map((vehicle) => {
                        const soldDate = vehicle.soldDate ? new Date(vehicle.soldDate) : null;
                        
                        return (
                          <TableRow key={vehicle.id}>
                            <TableCell className="font-medium">
                              {soldDate ? soldDate.toLocaleDateString('nl-NL', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              }) : 'Geen datum'}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{vehicle.brand}</div>
                              <div className="text-sm text-muted-foreground">{vehicle.model}</div>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatCurrency(vehicle.purchasePrice)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(vehicle.sellingPrice)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(vehicle.margin)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={cn("font-bold", getMarginColor(vehicle.marginPercent))}>
                                {vehicle.marginPercent.toFixed(1)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </ScrollArea>

              {selectedSalesperson.vehicles.length === 0 && (
                <div className="text-center py-8">
                  <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Geen verkopen gevonden</p>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
