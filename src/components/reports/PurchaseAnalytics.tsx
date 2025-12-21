import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportPeriod } from "@/types/reports";
import { purchaseReportsService } from "@/services/purchaseReportsService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Package, DollarSign, Percent, ShoppingCart, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface PurchaseAnalyticsProps {
  period: ReportPeriod;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658', '#ff8042'];

export const PurchaseAnalytics = ({ period }: PurchaseAnalyticsProps) => {
  const queryClient = useQueryClient();
  const [tableView, setTableView] = useState<'all' | 'regular' | 'tradein'>('all');
  
  const { data: purchaseData, isLoading } = useQuery({
    queryKey: ['purchase-analytics', period.startDate, period.endDate],
    queryFn: () => purchaseReportsService.getPurchaseAnalytics(period)
  });

  useEffect(() => {
    const channel = supabase
      .channel('purchase-analytics-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles'
        },
        (payload) => {
          console.log('Vehicle change detected in PurchaseAnalytics:', payload);
          queryClient.invalidateQueries({ queryKey: ['purchase-analytics'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!purchaseData) return null;

  const formatCurrency = (value: number) => 
    `€${value.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  // Data for stacked bar chart
  const stackedChartData = purchaseData.purchasers.map(p => ({
    name: p.name,
    regulier: p.regularPurchased,
    inruil: p.tradeInPurchased
  }));

  // Data for pie chart comparing regular vs trade-in
  const distributionData = [
    { name: 'Regulier', value: purchaseData.regularTotalPurchased, color: 'hsl(var(--primary))' },
    { name: 'Inruil', value: purchaseData.tradeInTotalPurchased, color: 'hsl(var(--secondary))' }
  ];

  return (
    <div className="space-y-6">
      {/* Split KPI Cards - Regulier vs Inruil */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reguliere Inkoop */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Reguliere Inkoop
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Ingekocht</p>
                <p className="text-2xl font-bold">{purchaseData.regularTotalPurchased}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Verkocht</p>
                <p className="text-2xl font-bold">{purchaseData.regularTotalSold}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Winst</p>
                <p className={`text-2xl font-bold ${purchaseData.regularTotalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(purchaseData.regularTotalProfit)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Marge</p>
                <p className="text-2xl font-bold">{purchaseData.regularAverageMargin.toFixed(1)}%</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Inkoopwaarde: </span>
                <span className="font-medium">{formatCurrency(purchaseData.regularTotalPurchaseValue)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Verkoopwaarde: </span>
                <span className="font-medium">{formatCurrency(purchaseData.regularTotalSalesValue)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Op voorraad: </span>
                <span className="font-medium">{purchaseData.regularInStock}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inruil */}
        <Card className="border-l-4 border-l-secondary">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Inruil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Ingeruild</p>
                <p className="text-2xl font-bold">{purchaseData.tradeInTotalPurchased}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Verkocht</p>
                <p className="text-2xl font-bold">{purchaseData.tradeInTotalSold}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Winst</p>
                <p className={`text-2xl font-bold ${purchaseData.tradeInTotalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(purchaseData.tradeInTotalProfit)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Marge</p>
                <p className="text-2xl font-bold">{purchaseData.tradeInAverageMargin.toFixed(1)}%</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Inruilwaarde: </span>
                <span className="font-medium">{formatCurrency(purchaseData.tradeInTotalPurchaseValue)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Verkoopwaarde: </span>
                <span className="font-medium">{formatCurrency(purchaseData.tradeInTotalSalesValue)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Op voorraad: </span>
                <span className="font-medium">{purchaseData.tradeInInStock}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gecombineerde totalen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Inkoopwaarde</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(purchaseData.totalPurchaseValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {purchaseData.regularTotalPurchased + purchaseData.tradeInTotalPurchased} voertuigen totaal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Winst</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(purchaseData.totalRealizedProfit)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Regulier: {formatCurrency(purchaseData.regularTotalProfit)} | Inruil: {formatCurrency(purchaseData.tradeInTotalProfit)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gem. Winstmarge</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseData.averageMargin.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Regulier: {purchaseData.regularAverageMargin.toFixed(1)}% | Inruil: {purchaseData.tradeInAverageMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Op Voorraad</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseData.totalInStock}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Regulier: {purchaseData.regularInStock} | Inruil: {purchaseData.tradeInInStock}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Inkoop per Inkoper (Regulier vs Inruil)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stackedChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="regulier" stackId="a" fill="hsl(var(--primary))" name="Regulier" />
                <Bar dataKey="inruil" stackId="a" fill="hsl(var(--secondary))" name="Inruil" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verdeling Regulier vs Inruil</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distributionData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table with View Toggle */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Inkoper Details</CardTitle>
            <Tabs value={tableView} onValueChange={(v) => setTableView(v as 'all' | 'regular' | 'tradein')}>
              <TabsList>
                <TabsTrigger value="all">Alle</TabsTrigger>
                <TabsTrigger value="regular">Regulier</TabsTrigger>
                <TabsTrigger value="tradein">Inruil</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Inkoper</TableHead>
                <TableHead className="text-right">Ingekocht</TableHead>
                <TableHead className="text-right">Inkoopwaarde</TableHead>
                <TableHead className="text-right">Verkocht</TableHead>
                <TableHead className="text-right">Verkoopwaarde</TableHead>
                <TableHead className="text-right">Winst</TableHead>
                <TableHead className="text-right">Marge %</TableHead>
                <TableHead className="text-right">Voorraad</TableHead>
                <TableHead className="text-right">Voorraadwaarde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseData.purchasers.map((purchaser) => {
                // Determine which values to show based on view
                const purchased = tableView === 'regular' ? purchaser.regularPurchased 
                  : tableView === 'tradein' ? purchaser.tradeInPurchased 
                  : purchaser.totalPurchased;
                const purchaseValue = tableView === 'regular' ? purchaser.regularPurchaseValue 
                  : tableView === 'tradein' ? purchaser.tradeInPurchaseValue 
                  : purchaser.totalPurchaseValue;
                const sold = tableView === 'regular' ? purchaser.regularSold 
                  : tableView === 'tradein' ? purchaser.tradeInSold 
                  : purchaser.sold;
                const salesValue = tableView === 'regular' ? purchaser.regularSalesValue 
                  : tableView === 'tradein' ? purchaser.tradeInSalesValue 
                  : purchaser.totalSalesValue;
                const profit = tableView === 'regular' ? purchaser.regularProfit 
                  : tableView === 'tradein' ? purchaser.tradeInProfit 
                  : purchaser.profit;
                const margin = tableView === 'regular' ? purchaser.regularMargin 
                  : tableView === 'tradein' ? purchaser.tradeInMargin 
                  : purchaser.profitMargin;
                const inStock = tableView === 'regular' ? purchaser.regularInStock 
                  : tableView === 'tradein' ? purchaser.tradeInInStock 
                  : purchaser.inStock;
                const stockValue = tableView === 'regular' ? purchaser.regularStockValue 
                  : tableView === 'tradein' ? purchaser.tradeInStockValue 
                  : purchaser.stockValue;

                // Skip rows with no data in this view
                if (purchased === 0 && tableView !== 'all') return null;

                return (
                  <TableRow key={purchaser.id}>
                    <TableCell className="font-medium">
                      {purchaser.name}
                      {tableView === 'all' && (
                        <div className="flex gap-1 mt-1">
                          {purchaser.regularPurchased > 0 && (
                            <Badge variant="outline" className="text-xs">R: {purchaser.regularPurchased}</Badge>
                          )}
                          {purchaser.tradeInPurchased > 0 && (
                            <Badge variant="secondary" className="text-xs">I: {purchaser.tradeInPurchased}</Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{purchased}</TableCell>
                    <TableCell className="text-right">{formatCurrency(purchaseValue)}</TableCell>
                    <TableCell className="text-right">{sold}</TableCell>
                    <TableCell className="text-right">{formatCurrency(salesValue)}</TableCell>
                    <TableCell className="text-right">
                      <span className={profit > 0 ? "text-green-600" : profit < 0 ? "text-red-600" : ""}>
                        {formatCurrency(profit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{margin.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{inStock}</TableCell>
                    <TableCell className="text-right">{formatCurrency(stockValue)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
