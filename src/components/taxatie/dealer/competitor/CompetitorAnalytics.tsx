import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, ShoppingCart, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { useCompetitorStats, useCompetitorDealers, useCompetitorScrapeLogs } from '@/hooks/useCompetitorDealers';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface CompetitorAnalyticsProps {
  dealerId?: string;
}

export function CompetitorAnalytics({ dealerId }: CompetitorAnalyticsProps) {
  const { stats, isLoading: statsLoading } = useCompetitorStats(dealerId);
  const { dealers } = useCompetitorDealers();
  const { logs, isLoading: logsLoading } = useCompetitorScrapeLogs(dealerId);

  const getDealerName = (dId: string) => {
    return dealers.find(d => d.id === dId)?.name || 'Onbekend';
  };

  if (statsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Analytics
        </h3>
        <p className="text-sm text-muted-foreground">
          Statistieken en inzichten
          {dealerId && ` voor ${getDealerName(dealerId)}`}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats?.totalStock || 0}</div>
                <p className="text-sm text-muted-foreground">In Voorraad</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats?.totalSold || 0}</div>
                <p className="text-sm text-muted-foreground">Verkocht</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{stats?.avgStockDays || 0}d</div>
                <p className="text-sm text-muted-foreground">Gem. Standtijd</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{stats?.newThisWeek || 0}</div>
                <p className="text-sm text-muted-foreground">Nieuw (7d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-emerald-500" />
              <div>
                <div className="text-2xl font-bold">{stats?.soldThisWeek || 0}</div>
                <p className="text-sm text-muted-foreground">Verkocht (7d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Brands */}
      <Card>
        <CardHeader>
          <CardTitle>Top Merken in Voorraad</CardTitle>
          <CardDescription>Meest voorkomende merken bij concurrenten</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.topBrands && stats.topBrands.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {stats.topBrands.map((brand, index) => (
                <Badge 
                  key={brand.brand} 
                  variant={index < 3 ? "default" : "secondary"}
                  className="text-sm py-1 px-3"
                >
                  {brand.brand}: {brand.count}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Nog geen data beschikbaar</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Scrape Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recente Scrapes</CardTitle>
          <CardDescription>Laatste scrape activiteiten</CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length > 0 ? (
            <div className="space-y-3">
              {logs.slice(0, 10).map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                      {log.status}
                    </Badge>
                    <div>
                      <div className="text-sm font-medium">
                        {getDealerName(log.dealer_id)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(log.scraped_at), 'dd MMM HH:mm', { locale: nl })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div>{log.vehicles_found || 0} gevonden</div>
                    <div className="text-xs text-muted-foreground">
                      +{log.vehicles_new || 0} nieuw, -{log.vehicles_sold || 0} verkocht
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Nog geen scrape logs beschikbaar
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
