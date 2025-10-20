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
  Shield,
  Clock,
  Euro,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Calendar,
  BarChart3,
} from "lucide-react";
import { fetchWarrantyClaims, getWarrantyStats } from "@/services/warrantyService";
import { WarrantyClaim } from "@/types/warranty";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { ActiveWarrantyOverview } from "./ActiveWarrantyOverview";
import { Separator } from "@/components/ui/separator";

export const WarrantyReports = () => {
  const { data: claims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ["warranty-claims"],
    queryFn: fetchWarrantyClaims,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["warranty-stats"],
    queryFn: getWarrantyStats,
  });

  // Calculate additional metrics
  const calculateMetrics = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const last30Days = claims.filter(
      (c) => new Date(c.createdAt) >= thirtyDaysAgo
    );
    const previous30Days = claims.filter(
      (c) =>
        new Date(c.createdAt) >= sixtyDaysAgo &&
        new Date(c.createdAt) < thirtyDaysAgo
    );

    const costLast30 = last30Days.reduce(
      (sum, c) => sum + (c.actualCost || c.estimatedCost || 0),
      0
    );
    const costPrevious30 = previous30Days.reduce(
      (sum, c) => sum + (c.actualCost || c.estimatedCost || 0),
      0
    );

    const costTrend =
      costPrevious30 > 0
        ? ((costLast30 - costPrevious30) / costPrevious30) * 100
        : 0;

    // Calculate average cost per claim
    const totalCost = claims.reduce(
      (sum, c) => sum + (c.actualCost || c.estimatedCost || 0),
      0
    );
    const avgCostPerClaim = claims.length > 0 ? totalCost / claims.length : 0;

    // Calculate resolution rate
    const resolvedClaims = claims.filter((c) => c.status === "opgelost");
    const resolutionRate =
      claims.length > 0 ? (resolvedClaims.length / claims.length) * 100 : 0;

    return {
      costLast30,
      costTrend,
      avgCostPerClaim,
      resolutionRate,
      totalCost,
    };
  };

  const metrics = calculateMetrics();

  const getStatusColor = (status: WarrantyClaim["status"]) => {
    switch (status) {
      case "opgelost":
        return "bg-green-100 text-green-800";
      case "in_behandeling":
        return "bg-blue-100 text-blue-800";
      case "actief":
        return "bg-orange-100 text-orange-800";
      case "vervallen":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: WarrantyClaim["status"]) => {
    switch (status) {
      case "opgelost":
        return <CheckCircle2 className="h-4 w-4" />;
      case "in_behandeling":
        return <Clock className="h-4 w-4" />;
      case "actief":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const calculateResolutionTime = (claim: WarrantyClaim) => {
    if (!claim.resolutionDate) return null;
    const reportDate = new Date(claim.reportDate);
    const resolutionDate = new Date(claim.resolutionDate);
    const diffDays = Math.ceil(
      (resolutionDate.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays;
  };

  if (claimsLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Shield className="h-6 w-6 animate-pulse mr-2" />
        <span>Garantie gegevens laden...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Active Warranties Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Actieve Garanties</h2>
        <ActiveWarrantyOverview />
      </div>

      <Separator className="my-8" />

      {/* Warranty Claims Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Garantie Claims</h2>
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actieve Claims</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalActive || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.pendingClaims || 0} in afwachting
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Gem. Doorlooptijd
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avgResolutionDays || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">dagen gemiddeld</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Totale Kosten (30d)
            </CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{metrics.costLast30.toLocaleString("nl-NL")}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {metrics.costTrend >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-red-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-green-500" />
              )}
              {Math.abs(metrics.costTrend).toFixed(1)}% vs vorige periode
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Oplossingspercentage
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.resolutionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              van alle claims opgelost
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Financieel Overzicht
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Totale garantiekosten
              </span>
              <span className="font-semibold">
                €{metrics.totalCost.toLocaleString("nl-NL")}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Gemiddelde kosten per claim
              </span>
              <span className="font-semibold">
                €{metrics.avgCostPerClaim.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Kosten deze maand
              </span>
              <span className="font-semibold">
                €{(stats?.totalCostThisMonth || 0).toLocaleString("nl-NL")}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Aantal claims deze maand
              </span>
              <span className="font-semibold">{stats?.totalThisMonth || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Prestatie Indicatoren
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Gemiddelde oplostijd
              </span>
              <span className="font-semibold">
                {stats?.avgResolutionDays || 0} dagen
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Klanttevredenheid
              </span>
              <span className="font-semibold">
                {stats?.customerSatisfactionAvg?.toFixed(1) || "N/A"}/5
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Oplossingspercentage
              </span>
              <span className="font-semibold">
                {metrics.resolutionRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Actieve claims
              </span>
              <span className="font-semibold">{stats?.totalActive || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Claims Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Alle Garantie Claims
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voertuig</TableHead>
                <TableHead>Klant</TableHead>
                <TableHead>Probleem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Gemeld</TableHead>
                <TableHead>Doorlooptijd</TableHead>
                <TableHead className="text-right">Kosten</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">
                      Geen garantie claims gevonden
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                claims.map((claim) => {
                  const resolutionTime = calculateResolutionTime(claim);
                  return (
                    <TableRow key={claim.id}>
                      <TableCell>
                        <div className="font-medium">
                          {claim.vehicleBrand} {claim.vehicleModel}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {claim.vehicleLicenseNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{claim.customerName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm max-w-[200px] truncate">
                          {claim.problemDescription}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${getStatusColor(claim.status)} flex items-center gap-1 w-fit`}
                        >
                          {getStatusIcon(claim.status)}
                          {claim.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(claim.reportDate), {
                            addSuffix: true,
                            locale: nl,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {resolutionTime !== null ? (
                          <div className="text-sm">
                            <Badge
                              variant="outline"
                              className={
                                resolutionTime <= 7
                                  ? "border-green-500 text-green-700"
                                  : resolutionTime <= 14
                                  ? "border-orange-500 text-orange-700"
                                  : "border-red-500 text-red-700"
                              }
                            >
                              {resolutionTime} dagen
                            </Badge>
                          </div>
                        ) : claim.status === "opgelost" ||
                          claim.status === "vervallen" ? (
                          <span className="text-sm text-muted-foreground">-</span>
                        ) : (
                          <Badge variant="outline" className="text-orange-700">
                            Lopend
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">
                          €
                          {(
                            claim.actualCost ||
                            claim.estimatedCost ||
                            0
                          ).toLocaleString("nl-NL")}
                        </div>
                        {claim.actualCost && claim.estimatedCost && claim.actualCost !== claim.estimatedCost && (
                          <div className="text-xs text-muted-foreground">
                            (schatting: €{claim.estimatedCost.toLocaleString("nl-NL")})
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};
