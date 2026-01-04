import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  AlertTriangle, 
  Eye,
  Download,
  Loader2
} from 'lucide-react';
import { StockAgeData } from '@/types/branchManager';
import { cn } from '@/lib/utils';
import { exportStockAgeToExcel } from '@/services/stockAgeExport';
import { toast } from 'sonner';

interface StockAgeAnalysisProps {
  data: StockAgeData;
  showOnlyLongStanding?: boolean;
  onViewVehicle?: (vehicleId: string, tab?: string) => void;
}

export const StockAgeAnalysis: React.FC<StockAgeAnalysisProps> = ({ 
  data,
  showOnlyLongStanding = false,
  onViewVehicle
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleViewVehicle = (vehicleId: string) => {
    if (onViewVehicle) {
      onViewVehicle(vehicleId, 'checklist');
    }
  };

  const handleExportStockAge = async () => {
    setIsExporting(true);
    try {
      const result = await exportStockAgeToExcel();
      toast.success(`Voorraadlijst geëxporteerd (${result.count} voertuigen)`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Export mislukt');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {showOnlyLongStanding ? 'Langstaande Voorraad (>60 dagen)' : 'Stadagen Analyse'}
          </div>
          {!showOnlyLongStanding && (
            <Badge variant="outline">
              Gem: {data.avgDays.toFixed(0)} dagen
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Distribution Chart */}
        {!showOnlyLongStanding && (
          <div className="space-y-2">
            {data.distribution.map((bucket, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-24 text-sm text-muted-foreground">
                  {bucket.range}
                </div>
                <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      index === 0 && "bg-green-500",
                      index === 1 && "bg-yellow-500",
                      index === 2 && "bg-orange-500",
                      index === 3 && "bg-red-500"
                    )}
                    style={{ width: `${bucket.percentage}%` }}
                  />
                </div>
                <div className="w-16 text-sm text-right">
                  {bucket.count} ({bucket.percentage.toFixed(0)}%)
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Long-standing vehicles list */}
        {data.longStandingVehicles.length > 0 && (
          <div className="space-y-2">
            {!showOnlyLongStanding && (
              <div className="flex items-center gap-2 text-sm font-medium text-destructive mt-4">
                <AlertTriangle className="h-4 w-4" />
                Langstaande voorraad (actie nodig)
              </div>
            )}
            <div className="space-y-2">
              {data.longStandingVehicles.map((vehicle) => (
                <div 
                  key={vehicle.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-destructive/20"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      vehicle.daysOnline > 90 ? "bg-red-500" : "bg-orange-500"
                    )} />
                    <div>
                      <div className="font-medium">
                        {vehicle.brand} {vehicle.model}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {vehicle.licensePlate || 'Geen kenteken'} • €{vehicle.sellingPrice.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant="destructive"
                      className={cn(
                        vehicle.daysOnline > 90 
                          ? "bg-red-500" 
                          : "bg-orange-500"
                      )}
                    >
                      {vehicle.daysOnline} dagen
                    </Badge>
                    {onViewVehicle && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewVehicle(vehicle.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.longStandingVehicles.length === 0 && showOnlyLongStanding && (
          <p className="text-center text-muted-foreground py-4">
            Geen voertuigen langer dan 60 dagen online
          </p>
        )}

        {/* Summary with Download Button */}
        {!showOnlyLongStanding && (
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              Totaal online voorraad
            </span>
            <div className="flex items-center gap-3">
              <span className="font-medium">{data.totalOnline} voertuigen</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExportStockAge}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download Lijst
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
