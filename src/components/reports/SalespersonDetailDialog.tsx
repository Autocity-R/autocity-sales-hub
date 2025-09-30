import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Car, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Package
} from "lucide-react";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  selling_price: number;
  margin: number;
  sold_date: string;
  purchase_price: number;
}

interface SalespersonDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salesperson: {
    name: string;
    email: string;
    totalSales: number;
    totalRevenue: number;
    totalMargin: number;
    averageMargin: number;
    vehiclesSold: Vehicle[];
  } | null;
}

export const SalespersonDetailDialog: React.FC<SalespersonDetailDialogProps> = ({
  open,
  onOpenChange,
  salesperson,
}) => {
  if (!salesperson) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getMarginColor = (marginPercentage: number) => {
    if (marginPercentage >= 20) return "text-green-600";
    if (marginPercentage >= 15) return "text-blue-600";
    if (marginPercentage >= 10) return "text-yellow-600";
    return "text-red-600";
  };

  // Sort vehicles by sold date, most recent first
  const sortedVehicles = [...salesperson.vehiclesSold].sort(
    (a, b) => new Date(b.sold_date).getTime() - new Date(a.sold_date).getTime()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Alle Verkopen - {salesperson.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{salesperson.email}</p>
        </DialogHeader>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Car className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Totaal Verkocht</span>
            </div>
            <div className="text-2xl font-bold">{salesperson.totalSales}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Totale Omzet</span>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(salesperson.totalRevenue)}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Totale Winst</span>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(salesperson.totalMargin)}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Gem. Marge</span>
            </div>
            <div className="text-2xl font-bold">{salesperson.averageMargin.toFixed(1)}%</div>
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
              {sortedVehicles.map((vehicle) => {
                const marginPercentage = vehicle.selling_price > 0 
                  ? (vehicle.margin / vehicle.selling_price) * 100 
                  : 0;
                
                return (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">
                      {new Date(vehicle.sold_date).toLocaleDateString('nl-NL', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{vehicle.brand}</div>
                      <div className="text-sm text-muted-foreground">{vehicle.model}</div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(vehicle.purchase_price)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(vehicle.selling_price)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(vehicle.margin)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-bold ${getMarginColor(marginPercentage)}`}>
                        {marginPercentage.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        {sortedVehicles.length === 0 && (
          <div className="text-center py-8">
            <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Geen verkopen gevonden</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
