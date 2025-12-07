import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingDown, TrendingUp, ExternalLink, Filter, Flame } from 'lucide-react';
import type { PortalAnalysis } from '@/types/taxatie';
import { PortalListingsModal } from '../modals/PortalListingsModal';

interface PortalAnalysisCardProps {
  data: PortalAnalysis | null;
  loading: boolean;
}

export const PortalAnalysisCard = ({ data, loading }: PortalAnalysisCardProps) => {
  const [showListings, setShowListings] = useState(false);

  if (loading) {
    return (
      <Card className="border-2 border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-5 w-20" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-4 w-16 mx-auto mb-2" />
                <Skeleton className="h-7 w-20 mx-auto" />
              </div>
            ))}
          </div>
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const priceRange = data.highestPrice - data.lowestPrice;
  const priceSpread = Math.round((priceRange / data.medianPrice) * 100);

  return (
    <>
      <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Portaalanalyse
              <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
                🔥 LEIDEND
              </Badge>
            </CardTitle>
            <Badge variant="secondary">
              {data.listingCount} listings
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prijzen */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <TrendingDown className="h-3 w-3 text-green-600" />
                Laagste
              </div>
              <div className="text-xl font-bold text-green-600">
                €{data.lowestPrice.toLocaleString()}
              </div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg border">
              <div className="text-xs text-muted-foreground mb-1">Mediaan</div>
              <div className="text-xl font-bold">
                €{data.medianPrice.toLocaleString()}
              </div>
            </div>
            <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3 w-3 text-red-600" />
                Hoogste
              </div>
              <div className="text-xl font-bold text-red-600">
                €{data.highestPrice.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Toegepaste filters */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <Badge variant="outline" className="text-xs">
              {data.appliedFilters.brand} {data.appliedFilters.model}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {data.appliedFilters.buildYearRange}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {data.appliedFilters.mileageRange}
            </Badge>
          </div>

          {/* Statistieken */}
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Prijsspreiding: {priceSpread}%</span>
            <span>{data.primaryComparableCount} primair vergelijkbaar</span>
          </div>

          {/* Logische afwijkingen */}
          {data.logicalDeviations.length > 0 && (
            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                Logische afwijkingen gedetecteerd:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {data.logicalDeviations.map((deviation, i) => (
                  <li key={i}>• {deviation}</li>
                ))}
              </ul>
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowListings(true)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Bekijk alle {data.listingCount} listings
          </Button>
        </CardContent>
      </Card>

      <PortalListingsModal
        open={showListings}
        onOpenChange={setShowListings}
        data={data}
      />
    </>
  );
};
