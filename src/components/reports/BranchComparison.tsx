import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Euro, Percent, Car, Clock, Wrench, Package } from "lucide-react";
import { ReportPeriod } from "@/types/reports";
import { salesDataService } from "@/services/salesDataService";
import { systemReportsService } from "@/services/systemReportsService";
import { aftersalesService } from "@/services/aftersalesService";
import { BRANCH_LABELS, BRANCH_COLOR_CLASSES, type BranchCode } from "@/contexts/BranchContext";
import { cn } from "@/lib/utils";

interface BranchComparisonProps {
  period: ReportPeriod;
}

const BRANCHES: BranchCode[] = ["rotterdam", "heerhugowaard"];

const fmtEuro = (n: number) => `€${Math.round(n).toLocaleString("nl-NL")}`;
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

async function loadBranchStats(branch: BranchCode, period: ReportPeriod) {
  const [sales, inv, aftersales] = await Promise.all([
    salesDataService.getSalesData(period, branch),
    systemReportsService.getInventoryMetrics(branch),
    aftersalesService.getDashboardData(branch),
  ]);
  return { sales, inv, aftersales };
}

export const BranchComparison: React.FC<BranchComparisonProps> = ({ period }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["branch-comparison", period.startDate, period.endDate],
    queryFn: async () => {
      const results = await Promise.all(BRANCHES.map((b) => loadBranchStats(b, period)));
      return Object.fromEntries(BRANCHES.map((b, i) => [b, results[i]])) as Record<
        BranchCode,
        Awaited<ReturnType<typeof loadBranchStats>>
      >;
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Vergelijking laden…</span>
      </div>
    );
  }

  const rows: {
    key: string;
    label: string;
    icon: React.ElementType;
    value: (s: Awaited<ReturnType<typeof loadBranchStats>>) => string;
  }[] = [
    { key: "revenue", label: "Omzet", icon: Euro, value: (s) => fmtEuro(s.sales.totalRevenue) },
    { key: "profit", label: "Marge (bruto)", icon: TrendingUp, value: (s) => fmtEuro(s.sales.totalProfit) },
    { key: "margin", label: "Marge %", icon: Percent, value: (s) => fmtPct(s.sales.profitMargin) },
    { key: "b2c", label: "Aantal verkocht B2C", icon: Car, value: (s) => String(s.sales.b2cCount) },
    { key: "b2b", label: "Aantal verkocht B2B", icon: Car, value: (s) => String(s.sales.b2bCount) },
    { key: "stockdays", label: "Gem. sta-dagen", icon: Clock, value: (s) => `${s.inv?.avgDaysInStock ?? 0} dagen` },
    { key: "stockcount", label: "Voorraad", icon: Package, value: (s) => String(s.inv?.totalVehicles ?? 0) },
    { key: "aftersalesWait", label: "Aftersales gem. wachttijd", icon: Wrench, value: (s) => `${s.aftersales?.kpis?.averageWaitingDays ?? 0} dagen` },
    { key: "pending", label: "Openstaande leveringen", icon: Clock, value: (s) => String(s.aftersales?.kpis?.pendingDeliveries ?? 0) },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Vestiging vergelijking — {period.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[1fr,repeat(2,minmax(0,1fr))] gap-x-6 gap-y-3 text-sm">
            <div />
            {BRANCHES.map((b) => (
              <div
                key={b}
                className={cn(
                  "text-center font-semibold rounded-md px-2 py-1",
                  BRANCH_COLOR_CLASSES[b],
                )}
              >
                {BRANCH_LABELS[b]}
              </div>
            ))}
            {rows.map((row) => {
              const Icon = row.icon;
              return (
                <React.Fragment key={row.key}>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="h-4 w-4" />
                    <span>{row.label}</span>
                  </div>
                  {BRANCHES.map((b) => (
                    <div key={b} className="text-center font-medium text-base">
                      {row.value(data[b])}
                    </div>
                  ))}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BranchComparison;