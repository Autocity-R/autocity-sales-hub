import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  ShoppingCart, 
  DollarSign, 
  Percent, 
  TrendingUp,
  Clock,
  Package,
  RefreshCw,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { B2CKPIData, TradeInStats } from '@/types/branchManager';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface B2CKPICardsProps {
  kpis: B2CKPIData;
  tradeIns?: TradeInStats;
}

export const B2CKPICards: React.FC<B2CKPICardsProps> = ({ kpis, tradeIns }) => {
  const getProgressColor = (current: number, target: number): string => {
    const percentage = (current / target) * 100;
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getPercentage = (current: number, target: number): number => {
    return Math.min((current / target) * 100, 100);
  };

  const cards = [
    {
      title: 'B2C Verkopen',
      icon: ShoppingCart,
      current: kpis.b2cSalesCount,
      target: kpis.b2cSalesTarget,
      format: (v: number) => v.toString(),
      suffix: `/ ${kpis.b2cSalesTarget}`
    },
    {
      title: 'Totale B2C Marge',
      icon: DollarSign,
      current: kpis.b2cRevenue,
      target: kpis.b2cRevenueTarget,
      format: (v: number) => `€${v.toLocaleString()}`,
      suffix: `/ €${kpis.b2cRevenueTarget.toLocaleString()}`
    },
    {
      title: 'Marge Percentage',
      icon: Percent,
      current: kpis.b2cMarginPercent,
      target: kpis.b2cMarginTarget,
      format: (v: number) => `${v.toFixed(1)}%`,
      suffix: `/ ${kpis.b2cMarginTarget}%`
    },
    {
      title: 'Openstaande Leveringen',
      icon: Package,
      current: kpis.pendingDeliveries,
      target: null,
      format: (v: number) => v.toString(),
      suffix: 'te leveren'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          const percentage = card.target ? getPercentage(card.current, card.target) : null;
          const progressColor = card.target ? getProgressColor(card.current, card.target) : '';

          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {card.format(card.current)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {card.suffix}
                </p>
                {percentage !== null && (
                  <div className="mt-3 space-y-1">
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all", progressColor)}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className={cn(
                      "text-xs font-medium",
                      percentage >= 100 ? "text-green-600" :
                      percentage >= 80 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {percentage.toFixed(0)}% van target
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gem. Levertijd</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis.avgDeliveryDays.toFixed(1)} dagen
            </div>
            <p className={cn(
              "text-xs",
              kpis.avgDeliveryDays <= 14 ? "text-green-600" :
              kpis.avgDeliveryDays <= 21 ? "text-yellow-600" : "text-red-600"
            )}>
              {kpis.avgDeliveryDays <= 14 ? "Goed" : 
               kpis.avgDeliveryDays <= 21 ? "Acceptabel" : "Te traag"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upsell Ratio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis.upsellRatio.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              verkopen met garantiepakket
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upsales Omzet</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{kpis.upsalesRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              garantie & pakketten
            </p>
          </CardContent>
        </Card>

        {/* Trade-In KPI Card */}
        {tradeIns && (
          <Card className={cn(
            tradeIns.negativeCount > 0 && "border-destructive bg-destructive/5"
          )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inruil Resultaat</CardTitle>
              <RefreshCw className={cn(
                "h-4 w-4",
                tradeIns.negativeCount > 0 ? "text-destructive" : "text-muted-foreground"
              )} />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                tradeIns.avgResult < 0 ? "text-destructive" : 
                tradeIns.avgResult > 0 ? "text-green-600" : ""
              )}>
                €{tradeIns.avgResult >= 0 ? '' : ''}{Math.round(tradeIns.avgResult).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {tradeIns.totalTradeIns} verkocht | Gem. per auto
              </p>
              <div className="mt-2">
                {tradeIns.negativeCount > 0 ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {tradeIns.negativeCount} met verlies
                  </Badge>
                ) : tradeIns.totalTradeIns > 0 ? (
                  <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                    <CheckCircle className="h-3 w-3" />
                    Geen verliezen
                  </Badge>
                ) : null}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
