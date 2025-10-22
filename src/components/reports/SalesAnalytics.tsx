import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { salesDataService } from "@/services/salesDataService";
import { 
  TrendingUp, 
  DollarSign, 
  Car, 
  Percent,
  Users,
  Building2,
  BarChart3
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";

export const SalesAnalytics = () => {
  const [periodType, setPeriodType] = useState<"week" | "month" | "year">("month");
  const currentYear = new Date().getFullYear();
  const queryClient = useQueryClient();

  // Fetch sales data for selected period
  const { data: salesData, isLoading } = useQuery({
    queryKey: ["sales-data", periodType],
    queryFn: () => salesDataService.getSalesData(periodType),
    refetchInterval: 30000,
  });

  // Fetch monthly breakdown for year view
  const { data: monthlyBreakdown } = useQuery({
    queryKey: ["monthly-sales-breakdown", currentYear],
    queryFn: () => salesDataService.getMonthlySalesBreakdown(currentYear),
    enabled: periodType === "year",
  });

  // Real-time updates for vehicles
  useEffect(() => {
    const channel = supabase
      .channel('sales-analytics-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles'
        },
        (payload) => {
          console.log('Vehicle change detected in SalesAnalytics:', payload);
          queryClient.invalidateQueries({ queryKey: ['sales-data'] });
          queryClient.invalidateQueries({ queryKey: ['monthly-sales-breakdown'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Sales Dashboard</h2>
        <Select value={periodType} onValueChange={(value: any) => setPeriodType(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Deze Week</SelectItem>
            <SelectItem value="month">Deze Maand</SelectItem>
            <SelectItem value="year">Dit Jaar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Verkopen</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesData?.totalVehicles || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {salesData?.b2bCount || 0} B2B • {salesData?.b2cCount || 0} B2C
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Omzet</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(salesData?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Gem: {formatCurrency(salesData?.averageSalePrice || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Winst</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(salesData?.totalProfit || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Kosten: {formatCurrency(salesData?.totalCost || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Winstmarge</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesData?.profitMargin?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Van totale omzet
            </p>
          </CardContent>
        </Card>

        {/* Inruil Voertuigen - Verkopen */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inruil Verkopen</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {salesData?.tradeInCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Omzet: {formatCurrency(salesData?.tradeInRevenue || 0)}
            </p>
          </CardContent>
        </Card>

        {/* Inruil Voertuigen - Winst */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inruil Winst</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(salesData?.tradeInProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(salesData?.tradeInProfit || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Marge: {salesData?.tradeInProfitMargin?.toFixed(1) || 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* B2B vs B2C Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              B2B vs B2C Verdeling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  {
                    name: "Verkopen",
                    B2B: salesData?.b2bCount || 0,
                    B2C: salesData?.b2cCount || 0,
                  },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="B2B" fill="hsl(var(--primary))" />
                <Bar dataKey="B2C" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trend (only for year view) */}
        {periodType === "year" && monthlyBreakdown && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Maandelijkse Trend {currentYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthName" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="b2b" 
                    stroke="hsl(var(--primary))" 
                    name="B2B"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="b2c" 
                    stroke="hsl(var(--accent))" 
                    name="B2C"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Vehicle List */}
      <Card>
        <CardHeader>
          <CardTitle>Verkochte Voertuigen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {salesData?.vehicles && salesData.vehicles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Merk & Model</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-right p-2">Verkoopprijs</th>
                      <th className="text-right p-2">Verkoopdatum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.vehicles.map((vehicle) => (
                      <tr key={vehicle.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          {vehicle.brand} {vehicle.model}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                vehicle.status === "verkocht_b2b"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {vehicle.status === "verkocht_b2b" ? "B2B" : "B2C"}
                            </span>
                            {vehicle.details?.isTradeIn && (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                Inruil
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-right font-medium">
                          {formatCurrency(vehicle.selling_price || 0)}
                        </td>
                        <td className="p-2 text-right text-sm text-muted-foreground">
                          {vehicle.sold_date 
                            ? new Date(vehicle.sold_date).toLocaleDateString("nl-NL")
                            : "Geen datum"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Geen verkochte voertuigen in deze periode
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
