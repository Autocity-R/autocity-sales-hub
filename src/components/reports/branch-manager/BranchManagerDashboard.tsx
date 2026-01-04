import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ReportPeriod } from '@/types/reports';
import { branchManagerService } from '@/services/branchManagerService';
import { B2CKPICards } from './B2CKPICards';
import { B2CSalespersonTable } from './B2CSalespersonTable';
import { StockAgeAnalysis } from './StockAgeAnalysis';
import { PendingDeliveriesB2C } from './PendingDeliveriesB2C';
import { AlertsPanel } from './AlertsPanel';
import { TargetsManager } from './TargetsManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Settings, 
  AlertTriangle, 
  Target,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface BranchManagerDashboardProps {
  period: ReportPeriod;
}

export const BranchManagerDashboard: React.FC<BranchManagerDashboardProps> = ({ period }) => {
  const [showTargetsManager, setShowTargetsManager] = useState(false);
  const [showOnlyAlerts, setShowOnlyAlerts] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['branch-manager-dashboard', period],
    queryFn: () => branchManagerService.getDashboardData(period),
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Dashboard laden...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>Fout bij laden dashboard data</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const criticalAlerts = data.alerts.filter(a => a.severity === 'critical').length;
  const periodLabel = format(new Date(period.startDate), 'MMMM yyyy', { locale: nl });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Vestiging B2C Dashboard</h2>
          <p className="text-muted-foreground capitalize">{periodLabel}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showOnlyAlerts ? "default" : "outline"}
            onClick={() => setShowOnlyAlerts(!showOnlyAlerts)}
            className="gap-2"
          >
            <Target className="h-4 w-4" />
            {showOnlyAlerts ? 'Toon alles' : 'Vandaag sturen op B2C'}
            {criticalAlerts > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-destructive text-destructive-foreground">
                {criticalAlerts}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowTargetsManager(true)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Targets instellen
          </Button>
        </div>
      </div>

      {showOnlyAlerts ? (
        // Focus view - only alerts and action items
        <div className="space-y-6">
          <AlertsPanel alerts={data.alerts} />
          
          {data.pendingDeliveries.filter(d => d.isLate || d.alertDismissed).length > 0 && (
            <PendingDeliveriesB2C 
              deliveries={data.pendingDeliveries.filter(d => d.isLate || (d.alertDismissed && d.daysSinceSale > 21))} 
              title="Vertraagde Leveringen (>21 dagen)"
              onRefresh={refetch}
            />
          )}
          
          {data.stockAge.longStandingVehicles.length > 0 && (
            <StockAgeAnalysis 
              data={data.stockAge} 
              showOnlyLongStanding={true}
            />
          )}
        </div>
      ) : (
        // Full dashboard view
        <div className="space-y-6">
          {/* KPI Cards */}
          <B2CKPICards kpis={data.kpis} tradeIns={data.tradeIns} />

          {/* Alerts Panel - if any critical alerts */}
          {criticalAlerts > 0 && (
            <AlertsPanel alerts={data.alerts.filter(a => a.severity === 'critical')} />
          )}

          {/* Salesperson Performance */}
          <B2CSalespersonTable 
            salespersons={data.salespersonStats} 
            period={period}
          />

          {/* Two columns: Stock Age & Pending Deliveries */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StockAgeAnalysis data={data.stockAge} />
            <PendingDeliveriesB2C deliveries={data.pendingDeliveries} onRefresh={refetch} />
          </div>

          {/* All Alerts */}
          {data.alerts.length > 0 && (
            <AlertsPanel 
              alerts={data.alerts} 
              title="Alle Meldingen"
            />
          )}
        </div>
      )}

      {/* Targets Manager Modal */}
      {showTargetsManager && (
        <TargetsManager
          period={period}
          targets={data.targets}
          onClose={() => setShowTargetsManager(false)}
          onSave={() => {
            setShowTargetsManager(false);
            refetch();
          }}
        />
      )}
    </div>
  );
};
