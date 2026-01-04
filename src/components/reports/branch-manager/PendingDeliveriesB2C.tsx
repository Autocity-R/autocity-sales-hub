import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Truck, 
  AlertTriangle, 
  Eye,
  Clock,
  BellOff,
  Bell,
  CheckCircle
} from 'lucide-react';
import { PendingDelivery } from '@/types/branchManager';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PendingDeliveriesB2CProps {
  deliveries: PendingDelivery[];
  title?: string;
  onRefresh?: () => void;
}

export const PendingDeliveriesB2C: React.FC<PendingDeliveriesB2CProps> = ({ 
  deliveries,
  title = "B2C Leveringen in Afwachting",
  onRefresh
}) => {
  const navigate = useNavigate();
  const [dismissReason, setDismissReason] = useState('');
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  const handleViewVehicle = (vehicleId: string) => {
    navigate(`/vehicles/${vehicleId}`);
  };

  const handleDismissAlert = async (vehicleId: string) => {
    try {
      // First get current vehicle details
      const { data: vehicle, error: fetchError } = await supabase
        .from('vehicles')
        .select('details')
        .eq('id', vehicleId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const currentDetails = (vehicle?.details as Record<string, any>) || {};

      // Update with dismiss info
      const { error } = await supabase
        .from('vehicles')
        .update({
          details: {
            ...currentDetails,
            deliveryAlertDismissed: true,
            deliveryAlertDismissedDate: new Date().toISOString(),
            deliveryAlertDismissedReason: dismissReason || 'Afgesproken met klant'
          }
        })
        .eq('id', vehicleId);

      if (error) throw error;

      toast.success('Alert uitgezet - levering is afgesproken');
      setDismissReason('');
      setOpenPopoverId(null);
      onRefresh?.();
    } catch (error) {
      console.error('Error dismissing alert:', error);
      toast.error('Kon alert niet uitzetten');
    }
  };

  const handleUndoDismiss = async (vehicleId: string) => {
    try {
      // First get current vehicle details
      const { data: vehicle, error: fetchError } = await supabase
        .from('vehicles')
        .select('details')
        .eq('id', vehicleId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const currentDetails = (vehicle?.details as Record<string, any>) || {};

      // Remove dismiss info
      const { deliveryAlertDismissed, deliveryAlertDismissedDate, deliveryAlertDismissedReason, ...restDetails } = currentDetails;

      const { error } = await supabase
        .from('vehicles')
        .update({
          details: restDetails
        })
        .eq('id', vehicleId);

      if (error) throw error;

      toast.success('Alert weer geactiveerd');
      onRefresh?.();
    } catch (error) {
      console.error('Error undoing dismiss:', error);
      toast.error('Kon alert niet activeren');
    }
  };

  // Sort by days since sale (oldest first)
  const sortedDeliveries = [...deliveries].sort((a, b) => b.daysSinceSale - a.daysSinceSale);

  const getRowStyle = (delivery: PendingDelivery) => {
    if (delivery.alertDismissed && delivery.daysSinceSale > 21) {
      return "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/30";
    }
    if (delivery.isLate) {
      return "bg-destructive/5 border-destructive/30";
    }
    return "bg-muted/50";
  };

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
                  getRowStyle(delivery)
                )}
              >
                <div className="flex items-center gap-3">
                  {delivery.isLate && (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                  {delivery.alertDismissed && delivery.daysSinceSale > 21 && (
                    <CheckCircle className="h-4 w-4 text-amber-600" />
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
                    {delivery.alertDismissed && delivery.alertDismissedReason && (
                      <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                        📝 {delivery.alertDismissedReason}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Clock className={cn(
                      "h-4 w-4",
                      delivery.isLate ? "text-destructive" : 
                      delivery.alertDismissed && delivery.daysSinceSale > 21 ? "text-amber-600" : 
                      "text-muted-foreground"
                    )} />
                    <Badge 
                      variant={delivery.isLate ? "destructive" : "secondary"}
                      className={cn(
                        delivery.alertDismissed && delivery.daysSinceSale > 21 && 
                        "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400"
                      )}
                    >
                      {delivery.daysSinceSale} dagen
                    </Badge>
                  </div>
                  
                  {/* Afgesproken badge */}
                  {delivery.alertDismissed && delivery.daysSinceSale > 21 && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400">
                      Afgesproken
                    </Badge>
                  )}
                  
                  {/* Dismiss/Undo buttons */}
                  {delivery.daysSinceSale > 21 && (
                    delivery.alertDismissed ? (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleUndoDismiss(delivery.id)}
                        title="Alert weer aanzetten"
                      >
                        <Bell className="h-4 w-4 text-amber-600" />
                      </Button>
                    ) : (
                      <Popover 
                        open={openPopoverId === delivery.id} 
                        onOpenChange={(open) => setOpenPopoverId(open ? delivery.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            title="Alert uitzetten (afgesproken met klant)"
                          >
                            <BellOff className="h-4 w-4 text-muted-foreground hover:text-amber-600" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72" align="end">
                          <div className="space-y-3">
                            <div className="font-medium text-sm">Alert uitzetten</div>
                            <p className="text-xs text-muted-foreground">
                              Is de langere levertijd afgesproken met de klant?
                            </p>
                            <Input
                              placeholder="Reden (optioneel)"
                              value={dismissReason}
                              onChange={(e) => setDismissReason(e.target.value)}
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setOpenPopoverId(null);
                                  setDismissReason('');
                                }}
                              >
                                Annuleren
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => handleDismissAlert(delivery.id)}
                                className="bg-amber-600 hover:bg-amber-700"
                              >
                                Bevestigen
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )
                  )}
                  
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
