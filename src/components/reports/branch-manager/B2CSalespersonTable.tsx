import React from 'react';
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
import { Users, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
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
              <TableHead className="text-center">Upsell %</TableHead>
              <TableHead className="text-center">Gem. Levertijd</TableHead>
              <TableHead className="text-center">&gt;21 dagen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {salespersons.map((sp, index) => (
              <TableRow key={sp.id}>
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
                  €{sp.totalMargin.toLocaleString()}
                </TableCell>
                <TableCell className={cn("text-center font-medium", getMarginColor(sp.marginPercent))}>
                  {sp.marginPercent.toFixed(1)}%
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">
                    {sp.upsellRatio.toFixed(0)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {sp.avgDeliveryDays > 0 ? (
                    <span className={cn(
                      sp.avgDeliveryDays <= 14 ? "text-green-600" :
                      sp.avgDeliveryDays <= 21 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {sp.avgDeliveryDays.toFixed(0)} dagen
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {sp.lateDeliveries > 0 ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {sp.lateDeliveries}
                    </Badge>
                  ) : (
                    <span className="text-green-600">0</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
