import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Info, Clock, TrendingUp, Package, CheckCircle, ExternalLink, Users } from 'lucide-react';
import type { JPCarsData } from '@/types/taxatie';

interface JPCarsCardProps {
  data: JPCarsData | null;
  loading: boolean;
}

export const JPCarsCard = ({ data, loading }: JPCarsCardProps) => {
  if (loading) {
    return (
      <Card className="border border-amber-500/30 bg-amber-500/5 opacity-80">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-28" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  // APR en ETR zijn nu schaal 1-5 (5 = beste)
  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <Card className="border border-amber-500/40 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-90">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            JP Cars
            <Badge 
              variant="outline" 
              className="border-amber-500/50 text-amber-600 text-xs"
            >
              ⚠️ INDICATIEF
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-2 bg-amber-500/10 rounded border border-amber-500/20">
          <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <strong>Niet bindend!</strong> JP Cars waarde wijkt vaak af van marktprijzen. 
            Wij volgen altijd de portaaldata.
          </p>
        </div>

        {/* Waardes */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Basiswaarde</p>
            <p className="font-medium">€{data.baseValue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Optiewaarde</p>
            <p className="font-medium text-green-600">+€{data.optionValue.toLocaleString()}</p>
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground">JP Cars Totaal</p>
              <p className="text-lg font-bold">€{data.totalValue.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Range</p>
              <p className="text-sm">
                €{data.range.min.toLocaleString()} - €{data.range.max.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* APR & ETR - Nu als 1-5 schaal */}
        <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">APR (Prijspositie)</p>
              <p className={`font-semibold ${getScoreColor(data.apr)}`}>
                {data.apr}/5 ⭐
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">ETR (Doorloopsnelheid)</p>
              <p className={`font-semibold ${getScoreColor(data.etr)}`}>
                {data.etr}/5 ⭐
              </p>
            </div>
          </div>
        </div>

        {/* Statijd Details - Voorraad & Verkocht (ECHTE DAGEN) */}
        {(data.stockStats || data.salesStats) && (
          <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
            {/* Voorraad stats */}
            {data.stockStats && data.stockStats.count > 0 && (
              <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Voorraad
                </p>
                <p className="font-semibold">{data.stockStats.count} auto's</p>
                {data.stockStats.avgDays !== null && (
                  <p className="text-xs text-blue-600">
                    {Math.round(data.stockStats.avgDays)} dagen gem.
                  </p>
                )}
              </div>
            )}
            
            {/* Verkocht stats */}
            {data.salesStats && data.salesStats.count > 0 && (
              <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Verkocht
                </p>
                <p className="font-semibold">{data.salesStats.count} auto's</p>
                {data.salesStats.avgDays !== null && (
                  <p className="text-xs text-green-600">
                    {Math.round(data.salesStats.avgDays)} dagen gem.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Marktdiscount */}
        {data.marketDiscount && data.marketDiscount > 0 && (
          <div className="flex items-center justify-between text-sm pt-2 border-t">
            <span className="text-muted-foreground">Marktdiscount gem.</span>
            <span className="font-medium text-amber-600">
              €{data.marketDiscount.toLocaleString()}
            </span>
          </div>
        )}

        {/* Portal Links */}
        {data.portalUrls && Object.values(data.portalUrls).some(url => url) && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Bekijk vergelijkbare:</p>
            <div className="flex flex-wrap gap-2">
              {data.portalUrls.gaspedaal && (
                <a
                  href={data.portalUrls.gaspedaal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded"
                >
                  <ExternalLink className="h-3 w-3" />
                  Gaspedaal
                </a>
              )}
              {data.portalUrls.autoscout24 && (
                <a
                  href={data.portalUrls.autoscout24}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded"
                >
                  <ExternalLink className="h-3 w-3" />
                  AutoScout24
                </a>
              )}
              {data.portalUrls.marktplaats && (
                <a
                  href={data.portalUrls.marktplaats}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded"
                >
                  <ExternalLink className="h-3 w-3" />
                  Marktplaats
                </a>
              )}
              {data.portalUrls.jpCarsWindow && (
                <a
                  href={data.portalUrls.jpCarsWindow}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-500 hover:underline flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded"
                >
                  <ExternalLink className="h-3 w-3" />
                  JP Cars Window
                </a>
              )}
            </div>
          </div>
        )}

        {/* Top Dealers (als beschikbaar) */}
        {data.topDealers && data.topDealers.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Users className="h-3 w-3" />
              Top dealers met dit model:
            </p>
            <div className="space-y-1">
              {data.topDealers.slice(0, 3).map((dealer, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-muted/50 px-2 py-1 rounded">
                  <span className="truncate max-w-[60%]">{dealer.name}</span>
                  <span className="text-muted-foreground">
                    {dealer.stockCount > 0 && `${dealer.stockCount} op voorraad`}
                    {dealer.soldCount > 0 && ` • ${dealer.soldCount} verkocht`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Courantheid badge */}
        <div className="flex items-center justify-between text-xs pt-2 border-t">
          <span className="text-muted-foreground">Courantheid:</span>
          <Badge 
            variant="outline" 
            className={
              data.courantheid === 'hoog' 
                ? 'border-green-500/50 text-green-600 bg-green-500/10' 
                : data.courantheid === 'gemiddeld'
                ? 'border-amber-500/50 text-amber-600 bg-amber-500/10'
                : 'border-red-500/50 text-red-600 bg-red-500/10'
            }
          >
            {data.courantheid.charAt(0).toUpperCase() + data.courantheid.slice(1)}
          </Badge>
        </div>

        {/* Confidence */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>Betrouwbaarheid JP Cars:</span>
          <span className={data.confidence >= 0.8 ? 'text-green-600' : 'text-amber-600'}>
            {Math.round(data.confidence * 100)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
