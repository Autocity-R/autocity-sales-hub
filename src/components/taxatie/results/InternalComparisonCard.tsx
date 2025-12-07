import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Building2, TrendingUp, Clock, Package } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import type { InternalComparison } from '@/types/taxatie';

interface InternalComparisonCardProps {
  data: InternalComparison | null;
  loading: boolean;
}

export const InternalComparisonCard = ({ data, loading }: InternalComparisonCardProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Interne Vergelijking - Autocity Historie
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Gem. Marge</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{data.averageMargin}%</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Gem. Statijd</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{data.averageDaysToSell} dagen</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Package className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">Verkocht (12m)</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{data.soldLastYear} stuks</p>
          </div>
        </div>

        {/* Vergelijkbare verkopen */}
        {data.similarVehicles.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Vergelijkbare verkopen:</p>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Voertuig</TableHead>
                    <TableHead className="text-xs text-right">Inkoop</TableHead>
                    <TableHead className="text-xs text-right">Verkoop</TableHead>
                    <TableHead className="text-xs text-right">Marge</TableHead>
                    <TableHead className="text-xs text-right">Dagen</TableHead>
                    <TableHead className="text-xs">Kanaal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.similarVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="text-xs">
                        <div>
                          <p className="font-medium">{vehicle.brand} {vehicle.model}</p>
                          <p className="text-muted-foreground">
                            {vehicle.buildYear} • {vehicle.mileage.toLocaleString()} km
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        €{vehicle.purchasePrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        €{vehicle.sellingPrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        <span className={vehicle.margin >= 18 ? 'text-green-600' : 'text-amber-600'}>
                          {vehicle.margin}%
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        <span className={vehicle.daysToSell <= 21 ? 'text-green-600' : 'text-amber-600'}>
                          {vehicle.daysToSell}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-xs">
                          {vehicle.channel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
