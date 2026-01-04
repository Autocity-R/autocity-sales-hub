import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PendingDeliveryVehicle } from '@/types/branchManager';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, CheckCircle, Eye } from 'lucide-react';

interface PendingDeliveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: PendingDeliveryVehicle[];
  isLoading?: boolean;
  onViewVehicle?: (vehicleId: string, tab?: string) => void;
}

export const PendingDeliveryModal: React.FC<PendingDeliveryModalProps> = ({
  open,
  onOpenChange,
  vehicles,
  isLoading = false,
  onViewVehicle,
}) => {
  const getStatusBadge = (daysWaiting: number) => {
    if (daysWaiting > 21) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          {daysWaiting} dagen
        </Badge>
      );
    }
    if (daysWaiting >= 14) {
      return (
        <Badge variant="outline" className="gap-1 text-orange-600 border-orange-500 bg-orange-50">
          <Clock className="h-3 w-3" />
          {daysWaiting} dagen
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-green-600 border-green-500 bg-green-50">
        <CheckCircle className="h-3 w-3" />
        {daysWaiting} dagen
      </Badge>
    );
  };

  const getRowClass = (daysWaiting: number) => {
    if (daysWaiting > 21) return 'bg-destructive/10 hover:bg-destructive/20';
    if (daysWaiting >= 14) return 'bg-orange-50 hover:bg-orange-100';
    return '';
  };

  // Sort vehicles by daysWaiting descending (longest waiting first)
  const sortedVehicles = [...vehicles].sort((a, b) => b.daysWaiting - a.daysWaiting);

  const criticalCount = vehicles.filter(v => v.daysWaiting > 21).length;
  const warningCount = vehicles.filter(v => v.daysWaiting >= 14 && v.daysWaiting <= 21).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Wachtende Leveringen</span>
            <Badge variant="secondary">{vehicles.length} auto's</Badge>
            {criticalCount > 0 && (
              <Badge variant="destructive">{criticalCount} kritiek</Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="text-orange-600 border-orange-500">
                {warningCount} aandacht
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Geen wachtende leveringen gevonden
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merk</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Kenteken</TableHead>
                  <TableHead>VIN</TableHead>
                  <TableHead className="text-right">Wachttijd</TableHead>
                  {onViewVehicle && <TableHead className="w-[80px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedVehicles.map((vehicle) => (
                  <TableRow 
                    key={vehicle.id}
                    className={cn(getRowClass(vehicle.daysWaiting))}
                  >
                    <TableCell className="font-medium">{vehicle.brand}</TableCell>
                    <TableCell>{vehicle.model}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {vehicle.licenseNumber || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {vehicle.vin || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {getStatusBadge(vehicle.daysWaiting)}
                    </TableCell>
                    {onViewVehicle && (
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onViewVehicle(vehicle.id, 'checklist')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="pt-4 border-t text-xs text-muted-foreground">
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-destructive/20"></span>
              Kritiek (&gt;21 dagen)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-orange-100"></span>
              Aandacht (14-21 dagen)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-50 border border-green-200"></span>
              OK (&lt;14 dagen)
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
