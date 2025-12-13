import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink, Filter, CheckCircle, AlertTriangle } from 'lucide-react';
import type { PortalAnalysis, PortalListing } from '@/types/taxatie';

interface PortalListingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PortalAnalysis;
}

const getPortalColor = (portal: string) => {
  switch (portal) {
    case 'gaspedaal':
      return 'bg-blue-500';
    case 'autoscout24':
      return 'bg-orange-500';
    case 'marktplaats':
      return 'bg-green-500';
    case 'autotrack':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
};

const ListingCard = ({ listing }: { listing: PortalListing }) => {
  return (
    <div
      className={`p-4 rounded-lg border ${
        listing.isPrimaryComparable
          ? 'border-green-500/30 bg-green-500/5'
          : listing.isLogicalDeviation
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-muted'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={`${getPortalColor(listing.portal)} text-white text-xs`}>
              {listing.portal}
            </Badge>
            {listing.isPrimaryComparable && (
              <Badge variant="outline" className="text-green-600 border-green-500/50 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Primair
              </Badge>
            )}
            {listing.isLogicalDeviation && (
              <Badge variant="outline" className="text-amber-600 border-amber-500/50 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Afwijkend
              </Badge>
            )}
            {listing.matchScore !== undefined && (
              <span className="text-xs text-muted-foreground">
                Match: {Math.round(listing.matchScore * 100)}%
              </span>
            )}
          </div>
          <p className="font-medium text-sm mb-1">{listing.title}</p>
          <div className="flex gap-4 text-xs text-muted-foreground mb-2">
            <span>{listing.buildYear}</span>
            <span>{(listing.mileage ?? 0).toLocaleString()} km</span>
            {listing.color && <span>{listing.color}</span>}
          </div>
          {Array.isArray(listing.options) && listing.options.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {listing.options.slice(0, 5).map((opt, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {opt}
                </Badge>
              ))}
              {listing.options.length > 5 && (
                <Badge variant="secondary" className="text-xs">
                  +{listing.options.length - 5}
                </Badge>
              )}
            </div>
          )}
          {listing.deviationReason && (
            <p className="text-xs text-amber-600 italic">{listing.deviationReason}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">€{listing.price.toLocaleString()}</p>
          <Button
            size="sm"
            variant="ghost"
            className="mt-2"
            onClick={() => window.open(listing.url, '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Bekijk
          </Button>
        </div>
      </div>
    </div>
  );
};

export const PortalListingsModal = ({ open, onOpenChange, data }: PortalListingsModalProps) => {
  const listings = data.listings ?? [];
  const primaryListings = listings.filter((l) => l.isPrimaryComparable);
  const deviatingListings = listings.filter((l) => l.isLogicalDeviation);
  const otherListings = listings.filter((l) => !l.isPrimaryComparable && !l.isLogicalDeviation);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Portaal Listings ({data.listingCount})
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        {data.appliedFilters && (
          <div className="flex items-center gap-2 flex-wrap p-3 bg-muted/50 rounded-lg">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filters:</span>
            <Badge variant="outline">{data.appliedFilters.brand} {data.appliedFilters.model}</Badge>
            <Badge variant="outline">{data.appliedFilters.buildYearFrom} - {data.appliedFilters.buildYearTo}</Badge>
            <Badge variant="outline">t/m {(data.appliedFilters.mileageMax ?? 0).toLocaleString()} km</Badge>
            {data.appliedFilters.fuelType && (
              <Badge variant="outline">{data.appliedFilters.fuelType}</Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              Gesorteerd op prijs (laag → hoog)
            </span>
          </div>
        )}

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {/* Primaire vergelijkingen */}
            {primaryListings.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Primaire Vergelijkingen ({primaryListings.length})
                </h3>
                <div className="space-y-3">
                  {primaryListings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              </div>
            )}

            {/* Afwijkende listings */}
            {deviatingListings.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Afwijkende Listings ({deviatingListings.length})
                </h3>
                <div className="space-y-3">
                  {deviatingListings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              </div>
            )}

            {/* Overige listings */}
            {otherListings.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3">
                  Overige Listings ({otherListings.length})
                </h3>
                <div className="space-y-3">
                  {otherListings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
