import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, TrendingUp, Clock, Package } from 'lucide-react';
import type { JPCarsData } from '@/types/taxatie';

interface CourantheidCardProps {
  data: JPCarsData | null;
  loading: boolean;
}

export const CourantheidCard = ({ data, loading }: CourantheidCardProps) => {
  if (loading) {
    return (
      <Card className="border-2 border-blue-500/30 bg-blue-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  // APR en ETR zijn nu schaal 1-5 (5 = beste)
  const apr = data.apr;
  const etr = data.etr;

  const getScoreBadge = (score: number, type: 'apr' | 'etr') => {
    if (score >= 4) {
      return <Badge className="bg-green-500 hover:bg-green-600">{type === 'apr' ? 'Uitstekend' : 'Snel'}</Badge>;
    }
    if (score >= 3) {
      return <Badge className="bg-amber-500 hover:bg-amber-600">Gemiddeld</Badge>;
    }
    return <Badge className="bg-red-500 hover:bg-red-600">{type === 'apr' ? 'Laag' : 'Traag'}</Badge>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-amber-600';
    return 'text-red-600';
  };

  const getCourantheidBadge = (courantheid: string) => {
    switch (courantheid) {
      case 'hoog':
        return <Badge className="bg-green-500 hover:bg-green-600">Hoog</Badge>;
      case 'gemiddeld':
        return <Badge className="bg-amber-500 hover:bg-amber-600">Gemiddeld</Badge>;
      default:
        return <Badge className="bg-red-500 hover:bg-red-600">Laag</Badge>;
    }
  };

  return (
    <Card className="border-2 border-blue-500/50 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            Courantheid
            <Badge className="bg-blue-500 hover:bg-blue-600 text-white">
              ⚡ BINDEND
            </Badge>
          </CardTitle>
          {getCourantheidBadge(data.courantheid)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* APR - Schaal 1-5 */}
        <div className="p-3 rounded-lg border bg-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">APR (Prijspositie)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${getScoreColor(apr)}`}>{apr}/5 ⭐</span>
              {getScoreBadge(apr, 'apr')}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {apr >= 4
              ? '✅ Scherp geprijsd - snelle verkoop verwacht'
              : apr >= 3
              ? '⚠️ Marktconform geprijsd'
              : '❌ Boven marktgemiddelde - let op!'}
          </p>
        </div>

        {/* ETR - Schaal 1-5 */}
        <div className="p-3 rounded-lg border bg-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">ETR (Doorloopsnelheid)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${getScoreColor(etr)}`}>{etr}/5 ⭐</span>
              {getScoreBadge(etr, 'etr')}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {etr >= 4
              ? '🚀 Zeer snelle doorlooptijd verwacht'
              : etr >= 3
              ? '⚠️ Gemiddelde doorlooptijd'
              : '🐌 Langere statijd verwacht'}
          </p>
        </div>

        {/* Echte statijd in DAGEN (apart) */}
        {data.stockStats?.avgDays && (
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Gem. statijd markt</span>
              </div>
              <span className="text-lg font-bold">{Math.round(data.stockStats.avgDays)} dagen</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              📊 Gebaseerd op {data.stockStats.count} vergelijkbare auto's in voorraad
            </p>
          </div>
        )}

        {/* Advies op basis van APR/ETR */}
        <div className="p-3 bg-muted/50 rounded-lg text-xs">
          <p className="font-medium mb-1">Strategie op basis van courantheid:</p>
          {data.courantheid === 'hoog' ? (
            <p className="text-muted-foreground">
              Hoge APR + hoge ETR = <span className="text-green-600 font-medium">scherper inkopen mogelijk</span>, 
              snelle omloop verwacht
            </p>
          ) : data.courantheid === 'gemiddeld' ? (
            <p className="text-muted-foreground">
              Gemiddelde courantheid = <span className="text-amber-600 font-medium">standaard marge aanhouden</span>
            </p>
          ) : (
            <p className="text-muted-foreground">
              Lage APR + lage ETR = <span className="text-red-600 font-medium">voorzichtiger inkopen</span>, 
              hogere marge nodig
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
