import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  AlertCircle,
  Percent,
  Target,
  Truck,
  Clock,
  RefreshCw,
  Eye
} from 'lucide-react';
import { BranchManagerAlert } from '@/types/branchManager';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface AlertsPanelProps {
  alerts: BranchManagerAlert[];
  title?: string;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ 
  alerts,
  title = "Actie Nodig"
}) => {
  const navigate = useNavigate();

  const getAlertIcon = (type: BranchManagerAlert['type']) => {
    switch (type) {
      case 'margin':
        return Percent;
      case 'target':
        return Target;
      case 'delivery':
        return Truck;
      case 'stock_age':
        return Clock;
      case 'trade_in':
        return RefreshCw;
      default:
        return AlertCircle;
    }
  };

  const handleAlertClick = (alert: BranchManagerAlert) => {
    if (alert.vehicleId) {
      navigate(`/vehicles/${alert.vehicleId}`);
    }
  };

  if (alerts.length === 0) {
    return null;
  }

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');

  return (
    <Card className={cn(
      criticalAlerts.length > 0 
        ? "border-destructive/50 bg-destructive/5" 
        : "border-yellow-500/50 bg-yellow-50/50"
    )}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn(
              "h-5 w-5",
              criticalAlerts.length > 0 ? "text-destructive" : "text-yellow-600"
            )} />
            {title}
          </div>
          <div className="flex gap-2">
            {criticalAlerts.length > 0 && (
              <Badge variant="destructive">
                {criticalAlerts.length} kritiek
              </Badge>
            )}
            {warningAlerts.length > 0 && (
              <Badge className="bg-yellow-500 text-white">
                {warningAlerts.length} waarschuwing
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {alerts.map((alert) => {
            const Icon = getAlertIcon(alert.type);
            
            return (
              <div 
                key={alert.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg",
                  alert.severity === 'critical' 
                    ? "bg-destructive/10 border border-destructive/30" 
                    : "bg-yellow-100/50 border border-yellow-300/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-full",
                    alert.severity === 'critical' 
                      ? "bg-destructive/20" 
                      : "bg-yellow-200/50"
                  )}>
                    <Icon className={cn(
                      "h-4 w-4",
                      alert.severity === 'critical' 
                        ? "text-destructive" 
                        : "text-yellow-700"
                    )} />
                  </div>
                  <div>
                    <div className={cn(
                      "font-medium",
                      alert.severity === 'critical' 
                        ? "text-destructive" 
                        : "text-yellow-800"
                    )}>
                      {alert.title}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {alert.description}
                    </div>
                  </div>
                </div>
                {(alert.vehicleId || alert.actionUrl) && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleAlertClick(alert)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Bekijk
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
