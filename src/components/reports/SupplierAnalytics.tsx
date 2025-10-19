import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportPeriod } from "@/types/reports";
import { supplierReportsService } from "@/services/supplierReportsService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Package, Euro, Percent, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface SupplierAnalyticsProps {
  period: ReportPeriod;
}

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const SupplierAnalytics: React.FC<SupplierAnalyticsProps> = ({ period }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("totalVehicles");
  const [showAllTime, setShowAllTime] = useState(true);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['supplierAnalytics', period, showAllTime],
    queryFn: () => supplierReportsService.getSupplierAnalytics(period, showAllTime)
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const filteredSuppliers = analytics?.suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    const aValue = a[sortBy as keyof typeof a] as number;
    const bValue = b[sortBy as keyof typeof b] as number;
    return bValue - aValue;
  }) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Toggle voor alle tijd vs periode */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border p-1 bg-muted">
          <Button
            variant={showAllTime ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowAllTime(true)}
          >
            Alle tijd
          </Button>
          <Button
            variant={!showAllTime ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowAllTime(false)}
          >
            Periode filter
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Inkoop</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.totalInvestment)}</div>
            <p className="text-xs text-muted-foreground">
              {showAllTime ? "Totale inkoopwaarde" : "Inkoopwaarde in periode"} - {analytics.totalVehiclesPurchased} voertuigen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Winst</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.totalProfit)}</div>
            <p className="text-xs text-muted-foreground">
              {showAllTime ? "Alle verkopen" : "Verkocht in periode"} - Gem. marge: {formatPercentage(analytics.avgMargin)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gemiddelde Marge</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(analytics.avgMargin)}</div>
            <p className="text-xs text-muted-foreground">
              Op {analytics.totalSuppliers} leveranciers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Voorraadwaarde</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.suppliers.reduce((sum, s) => sum + s.stockValue, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              {showAllTime ? "Op dit moment op voorraad" : "Voorraad in periode"} - {analytics.suppliers.reduce((sum, s) => sum + s.inStock, 0)} voertuigen
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Aantal per Leverancier</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.bySupplier}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Winst per Leverancier</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.profitBySupplier}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Bar dataKey="profit" fill="hsl(var(--chart-2))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gem. Sta Dagen</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.avgDaysBySupplier}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="days" fill="hsl(var(--chart-3))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inkoop Verdeling</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.bySupplier}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {analytics.bySupplier.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leverancier Details</CardTitle>
          <div className="flex gap-4 mt-4">
            <Input
              placeholder="Zoek leverancier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Sorteer op..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="totalVehicles">Aantal Voertuigen</SelectItem>
                <SelectItem value="profit">Winst</SelectItem>
                <SelectItem value="profitMargin">Marge %</SelectItem>
                <SelectItem value="avgDaysInStock">Sta Dagen</SelectItem>
                <SelectItem value="roi">ROI %</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leverancier</TableHead>
                <TableHead className="text-right">Auto's</TableHead>
                <TableHead className="text-right">Verkocht / Voorraad</TableHead>
                <TableHead className="text-right">Sta Dagen</TableHead>
                <TableHead className="text-right">Inkoopwaarde</TableHead>
                <TableHead className="text-right">Verkoopwaarde</TableHead>
                <TableHead className="text-right">Winst</TableHead>
                <TableHead className="text-right">Marge</TableHead>
                <TableHead className="text-right">ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell className="text-right">{supplier.totalVehicles}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Badge variant="default">{supplier.sold}</Badge>
                      <Badge variant="outline">{supplier.inStock}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {Math.round(supplier.avgDaysInStock)}d
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(supplier.totalPurchaseValue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(supplier.totalSalesValue)}</TableCell>
                  <TableCell className="text-right">
                    <span className={supplier.profit > 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(supplier.profit)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={supplier.profitMargin > 15 ? 'default' : supplier.profitMargin > 10 ? 'secondary' : 'destructive'}>
                      {formatPercentage(supplier.profitMargin)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatPercentage(supplier.roi)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
