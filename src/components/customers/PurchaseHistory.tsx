import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Car, Calendar, Euro, Package } from "lucide-react";

interface PurchasedVehicle {
  id: string;
  brand: string;
  model: string;
  year?: number;
  licenseNumber?: string;
  vin?: string;
  sellingPrice?: number;
  soldDate?: string;
  status: string;
}

interface PurchaseHistoryProps {
  vehicles: PurchasedVehicle[];
  customerType: "b2b" | "b2c" | "supplier";
}

export const PurchaseHistory: React.FC<PurchaseHistoryProps> = ({ vehicles, customerType }) => {
  const formatCurrency = (amount?: number) => {
    if (!amount) return "-";
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date?: string) => {
    if (!date) return "-";
    return format(new Date(date), "dd MMM yyyy", { locale: nl });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      verkocht_b2b: { label: "Verkocht B2B", className: "bg-blue-100 text-blue-800" },
      verkocht_b2c: { label: "Verkocht B2C", className: "bg-green-100 text-green-800" },
      afgeleverd: { label: "Afgeleverd", className: "bg-purple-100 text-purple-800" },
    };

    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const totalValue = vehicles.reduce((sum, vehicle) => sum + (vehicle.sellingPrice || 0), 0);

  if (vehicles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Aankoophistorie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Car className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Geen aankopen gevonden voor deze klant</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Aankoophistorie
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{vehicles.length}</span> voertuig{vehicles.length !== 1 ? 'en' : ''} • 
            <span className="font-medium ml-2">{formatCurrency(totalValue)}</span> totaal
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Voertuig</TableHead>
              <TableHead>Kenteken</TableHead>
              <TableHead>Verkoopdatum</TableHead>
              <TableHead>Verkoopprijs</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="font-medium">{vehicle.brand} {vehicle.model}</div>
                      {vehicle.year && (
                        <div className="text-sm text-muted-foreground">
                          Bouwjaar: {vehicle.year}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm">
                    {vehicle.licenseNumber || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{formatDate(vehicle.soldDate)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Euro className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-700">
                      {formatCurrency(vehicle.sellingPrice)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(vehicle.status)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
