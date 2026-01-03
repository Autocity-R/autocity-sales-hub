import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Truck, 
  AlertTriangle, 
  Eye,
  Clock
} from 'lucide-react';
import { PendingDelivery } from '@/types/branchManager';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';

interface PendingDeliveriesB2CProps {
  deliveries: PendingDelivery[];
  title?: string;
}

export const PendingDeliveriesB2C: React.FC<PendingDeliveriesB2CProps> = ({ 
  deliveries,
  title = "B2C Leveringen in Afwachting"
}) => {
  const navigate = useNavigate();

  const handleViewVehicle = (vehicleId: string) => {
    navigate(`/vehicles/${vehicleId}`);
  };

  // Sort by days since sale (oldest first)
  const sortedDeliveries = [...deliveries].sort((a, b) => b.daysSinceSale - a.daysSinceSale);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {title}
          </div>
          <Badge variant="outline">
            {deliveries.length} te leveren
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedDeliveries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Geen openstaande B2C leveringen
          </p>
        ) : (
          <div className="space-y-2">
            {sortedDeliveries.map((delivery) => (
              <div 
                key={delivery.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  delivery.isLate 
                    ? "bg-destructive/5 border-destructive/30" 
                    : "bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3">
                  {delivery.isLate && (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                  <div>
                    <div className="font-medium">
                      {delivery.brand} {delivery.model}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {delivery.licensePlate || 'Geen kenteken'}
                      {delivery.customerName && ` • ${delivery.customerName}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Verkocht: {delivery.soldDate 
                        ? format(parseISO(delivery.soldDate), 'd MMMM', { locale: nl })
                        : 'Onbekend'
                      }
                      {delivery.salesperson && ` door ${delivery.salesperson}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Clock className={cn(
                      "h-4 w-4",
                      delivery.isLate ? "text-destructive" : "text-muted-foreground"
                    )} />
                    <Badge 
                      variant={delivery.isLate ? "destructive" : "secondary"}
                    >
                      {delivery.daysSinceSale} dagen
                    </Badge>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleViewVehicle(delivery.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
