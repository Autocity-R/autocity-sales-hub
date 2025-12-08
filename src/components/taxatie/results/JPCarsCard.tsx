import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Info, Clock, TrendingUp } from 'lucide-react';
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
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  // Format APR als percentage
  const aprPercent = Math.round(data.apr * 100);

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

        {/* APR & ETR - Belangrijke marktindicatoren voor inkopers */}
        <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">APR (Price Ratio)</p>
              <p className={`font-semibold ${
                aprPercent >= 70 ? 'text-green-600' : 
                aprPercent >= 40 ? 'text-amber-600' : 
                'text-red-600'
              }`}>
                {aprPercent}%
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">ETR (Statijd)</p>
              <p className={`font-semibold ${
                data.etr <= 21 ? 'text-green-600' : 
                data.etr <= 35 ? 'text-amber-600' : 
                'text-red-600'
              }`}>
                ~{data.etr} dagen
              </p>
            </div>
          </div>
        </div>

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