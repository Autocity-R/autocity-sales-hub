import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingDown, TrendingUp, ExternalLink, Filter, Flame, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import type { PortalAnalysis } from '@/types/taxatie';
import { PortalListingsModal } from '../modals/PortalListingsModal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PortalAnalysisCardProps {
  data: PortalAnalysis | null;
  loading: boolean;
}

export const PortalAnalysisCard = ({ data, loading }: PortalAnalysisCardProps) => {
  const [showListings, setShowListings] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  if (loading) {
    return (
      <Card className="border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-orange-500/10">
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

  // Safe fallbacks for price values
  const lowestPrice = data.lowestPrice ?? 0;
  const medianPrice = data.medianPrice ?? 0;
  const highestPrice = data.highestPrice ?? 0;
  const mileageMax = data.appliedFilters?.mileageMax ?? 0;

  const priceRange = highestPrice - lowestPrice;
  const priceSpread = medianPrice > 0 ? Math.round((priceRange / medianPrice) * 100) : 0;

  return (
    <>
      <Card className="border-2 border-orange-500/50 bg-gradient-to-br from-orange-500/5 to-orange-500/10 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Portaalanalyse
              <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-xs">
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
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <TrendingDown className="h-3 w-3 text-green-600" />
                Laagste
              </div>
              <div className="text-lg font-bold text-green-600">
                €{lowestPrice.toLocaleString()}
              </div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg border">
              <div className="text-xs text-muted-foreground mb-1">Mediaan</div>
              <div className="text-lg font-bold">
                €{medianPrice.toLocaleString()}
              </div>
            </div>
            <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3 w-3 text-red-600" />
                Hoogste
              </div>
              <div className="text-lg font-bold text-red-600">
                €{highestPrice.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Toegepaste filters - Collapsible */}
          {data.appliedFilters && (
            <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Filter className="h-3 w-3" />
                  <span className="font-medium">Toegepaste zoekfilters</span>
                </div>
                {filtersExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="p-3 rounded-lg bg-muted/20 border space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">Merk/Model:</span>
                      <span className="ml-1 font-medium">{data.appliedFilters.brand} {data.appliedFilters.model}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Bouwjaar:</span>
                      <span className="ml-1 font-medium">{data.appliedFilters.buildYearFrom} - {data.appliedFilters.buildYearTo}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">KM-stand:</span>
                      <span className="ml-1 font-medium text-primary">t/m {mileageMax.toLocaleString()} km</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Brandstof:</span>
                      <span className="ml-1 font-medium">{data.appliedFilters.fuelType}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Transmissie:</span>
                      <span className="ml-1 font-medium">{data.appliedFilters.transmission}</span>
                    </div>
                    {data.appliedFilters.bodyType && (
                      <div>
                        <span className="text-muted-foreground">Carrosserie:</span>
                        <span className="ml-1 font-medium">{data.appliedFilters.bodyType}</span>
                      </div>
                    )}
                  </div>
                  {data.appliedFilters.keywords?.length > 0 && (
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground">Trefwoorden:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {data.appliedFilters.keywords.map((kw, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.appliedFilters.requiredOptions?.length > 0 && (
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground">Vereiste opties:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {data.appliedFilters.requiredOptions.map((opt, i) => (
                          <Badge key={i} variant="outline" className="text-xs">✓ {opt}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Statistieken */}
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Prijsspreiding: {priceSpread}%</span>
            <span>{data.primaryComparableCount} primair vergelijkbaar</span>
          </div>

          {/* Prijsspread waarschuwing */}
          {data.priceSpreadWarning && (
            <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                {data.priceSpreadWarning}
              </p>
            </div>
          )}

          {/* Logische afwijkingen */}
          {data.logicalDeviations && data.logicalDeviations.length > 0 && (
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

          {/* Directe Gaspedaal link */}
          {data.directSearchUrls?.gaspedaal && (
            <Button
              variant="default"
              className="w-full bg-orange-500 hover:bg-orange-600"
              onClick={() => window.open(data.directSearchUrls!.gaspedaal, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Bekijk alle resultaten op Gaspedaal ↗
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowListings(true)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Bekijk {data.listingCount} gevonden listings
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
