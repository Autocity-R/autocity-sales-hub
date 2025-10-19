import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportPeriod } from "@/types/reports";
import { purchaseReportsService } from "@/services/purchaseReportsService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Package, DollarSign, Percent } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PurchaseAnalyticsProps {
  period: ReportPeriod;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658', '#ff8042'];

export const PurchaseAnalytics = ({ period }: PurchaseAnalyticsProps) => {
  const { data: purchaseData, isLoading } = useQuery({
    queryKey: ['purchase-analytics', period.startDate, period.endDate],
    queryFn: () => purchaseReportsService.getPurchaseAnalytics(period)
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
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

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Inkoopwaarde</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{purchaseData.totalPurchaseValue.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gerealiseerde Winst</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{purchaseData.totalRealizedProfit.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gem. Winstmarge</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {purchaseData.averageMargin.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Op Voorraad</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {purchaseData.totalInStock}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Inkoop per Inkoper</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={purchaseData.byBuyer}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" name="Aantal Voertuigen" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verdeling Inkoopwaarde</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={purchaseData.purchasers}
                  dataKey="totalPurchaseValue"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.name}: €${entry.totalPurchaseValue.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}`}
                >
                  {purchaseData.purchasers.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `€${value.toLocaleString('nl-NL')}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inkoper Details</CardTitle>
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
              {purchaseData.purchasers.map((purchaser) => (
                <TableRow key={purchaser.id}>
                  <TableCell className="font-medium">{purchaser.name}</TableCell>
                  <TableCell className="text-right">{purchaser.totalPurchased}</TableCell>
                  <TableCell className="text-right">
                    €{purchaser.totalPurchaseValue.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right">{purchaser.sold}</TableCell>
                  <TableCell className="text-right">
                    €{purchaser.totalSalesValue.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={purchaser.profit > 0 ? "text-green-600" : purchaser.profit < 0 ? "text-red-600" : ""}>
                      €{purchaser.profit.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {purchaser.profitMargin.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">{purchaser.inStock}</TableCell>
                  <TableCell className="text-right">
                    €{purchaser.stockValue.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
