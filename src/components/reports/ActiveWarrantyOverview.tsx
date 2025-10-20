import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShieldCheck,
  Calendar,
  Euro,
  TrendingUp,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { fetchActiveWarranties, getActiveWarrantyStats } from "@/services/warrantyService";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export const ActiveWarrantyOverview = () => {
  const { data: warranties = [], isLoading: warrantiesLoading } = useQuery({
    queryKey: ["active-warranties"],
    queryFn: fetchActiveWarranties,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["active-warranty-stats"],
    queryFn: getActiveWarrantyStats,
  });

  const getRiskColor = (risk: 'laag' | 'gemiddeld' | 'hoog') => {
    switch (risk) {
      case 'hoog':
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case 'gemiddeld':
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      case 'laag':
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDaysRemainingColor = (days: number) => {
    if (days < 30) return "text-red-600 dark:text-red-400 font-semibold";
    if (days < 90) return "text-orange-600 dark:text-orange-400 font-medium";
    return "text-green-600 dark:text-green-400";
  };

  if (warrantiesLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <ShieldCheck className="h-6 w-6 animate-pulse mr-2" />
        <span>Actieve garanties laden...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actieve Garanties</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalActiveWarranties || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              voertuigen onder garantie
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verloopt Deze Maand</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats?.expiringThisMonth || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              aandacht vereist
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volgende Maand</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.expiringNextMonth || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              garanties verlopen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Waarde</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{(stats?.totalVehicleValue || 0).toLocaleString("nl-NL", { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              risico blootstelling
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gem. Resterende Tijd</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.averageDaysRemaining || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              dagen gemiddeld
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Warranties Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Voertuigen Onder Garantie
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Alleen B2C verkopen (geen autobedrijven) - Garantieperiode: 12 maanden vanaf afleverdatum
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voertuig</TableHead>
                <TableHead>Klant</TableHead>
                <TableHead>Afleverdatum</TableHead>
                <TableHead>Garantie Verloopt</TableHead>
                <TableHead>Resterende Dagen</TableHead>
                <TableHead className="text-right">Verkoopprijs</TableHead>
                <TableHead>Risico</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warranties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldCheck className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Geen actieve garanties gevonden
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Alle huidige garanties zijn verlopen of er zijn geen B2C verkopen met garantie
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                warranties.map((warranty) => (
                  <TableRow key={warranty.id}>
                    <TableCell>
                      <div className="font-medium">
                        {warranty.brand} {warranty.model}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {warranty.licenseNumber}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{warranty.customerName}</div>
                      {warranty.customerEmail && (
                        <div className="text-xs text-muted-foreground">
                          {warranty.customerEmail}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(warranty.deliveryDate, "dd MMM yyyy", { locale: nl })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {format(warranty.warrantyEndDate, "dd MMM yyyy", { locale: nl })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`text-sm ${getDaysRemainingColor(warranty.daysRemaining)}`}>
                        {warranty.daysRemaining} dagen
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium">
                        {warranty.sellingPrice
                          ? `€${warranty.sellingPrice.toLocaleString("nl-NL")}`
                          : "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getRiskColor(warranty.estimatedRisk)} flex items-center gap-1 w-fit`}>
                        {warranty.estimatedRisk === 'hoog' && <AlertTriangle className="h-3 w-3" />}
                        {warranty.estimatedRisk === 'gemiddeld' && <TrendingUp className="h-3 w-3" />}
                        {warranty.estimatedRisk === 'laag' && <ShieldCheck className="h-3 w-3" />}
                        {warranty.estimatedRisk}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
