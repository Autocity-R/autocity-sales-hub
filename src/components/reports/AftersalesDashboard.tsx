import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Truck, 
  ShieldCheck, 
  ClipboardList, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Eye,
  Car,
  Filter,
  Plus,
  PlayCircle
} from 'lucide-react';
import { TaskForm } from '@/components/tasks/TaskForm';
import { updateTaskStatus } from '@/services/taskService';
import { TaskStatus } from '@/types/tasks';
import { aftersalesService } from '@/services/aftersalesService';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useVehicleDetailDialog } from '@/hooks/useVehicleDetailDialog';
import { VehicleDetails } from '@/components/inventory/VehicleDetails';
import { supabase } from '@/integrations/supabase/client';
import { WarrantyClaimDetail } from '@/components/warranty/WarrantyClaimDetail';
import { fetchWarrantyClaims, updateWarrantyClaim, resolveWarrantyClaim, deleteWarrantyClaim } from '@/services/warrantyService';
import { WarrantyClaim } from '@/types/warranty';
import { useToast } from '@/hooks/use-toast';

interface AftersalesDashboardProps {
  onViewVehicle?: (vehicleId: string, defaultTab?: string) => void;
}

export const AftersalesDashboard: React.FC<AftersalesDashboardProps> = ({ onViewVehicle }) => {
  const vehicleDialog = useVehicleDetailDialog();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'in_progress' | 'ready'>('all');
  const [selectedClaim, setSelectedClaim] = useState<WarrantyClaim | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);

  // Mutation voor taak status updates
  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      updateTaskStatus(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aftersales-dashboard'] });
      toast({ 
        title: "Taakstatus bijgewerkt",
        description: "De taak is succesvol bijgewerkt." 
      });
    },
    onError: () => {
      toast({ 
        variant: "destructive", 
        title: "Fout",
        description: "Fout bij het bijwerken van de taakstatus" 
      });
    }
  });

  const handleStartTask = (taskId: string) => {
    updateStatusMutation.mutate({ taskId, status: 'in_uitvoering' });
  };

  const handleCompleteTask = (taskId: string) => {
    updateStatusMutation.mutate({ taskId, status: 'voltooid' });
  };

  const handleTaskFormClose = () => {
    setShowTaskForm(false);
    queryClient.invalidateQueries({ queryKey: ['aftersales-dashboard'] });
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['aftersales-dashboard'],
    queryFn: () => aftersalesService.getDashboardData(),
    refetchInterval: 60000, // Elke minuut verversen
  });

  // Fetch full warranty claims for detail modal
  const { data: fullWarrantyClaims = [] } = useQuery({
    queryKey: ['warranty-claims'],
    queryFn: fetchWarrantyClaims,
  });

  // All hooks must be called before any conditional returns
  const pendingDeliveries = data?.pendingDeliveries || [];
  const openWarrantyClaims = data?.openWarrantyClaims || [];
  const resolvedWarrantyClaims = data?.resolvedWarrantyClaims || [];
  const openTasks = data?.openTasks || [];
  const completedTasks = data?.completedTasks || [];
  const kpis = data?.kpis;

  // Filter deliveries based on selected filter - must be before conditional returns
  const filteredDeliveries = useMemo(() => {
    if (!pendingDeliveries) return [];
    
    switch (deliveryFilter) {
      case 'ready':
        return pendingDeliveries.filter(d => d.isReadyForDelivery);
      case 'in_progress':
        return pendingDeliveries.filter(d => !d.isReadyForDelivery);
      default:
        return pendingDeliveries;
    }
  }, [pendingDeliveries, deliveryFilter]);

  const inProgressCount = pendingDeliveries.filter(d => !d.isReadyForDelivery).length;
  const readyCount = pendingDeliveries.filter(d => d.isReadyForDelivery).length;

  const handleViewVehicle = async (vehicleId: string, defaultTab?: string) => {
    await vehicleDialog.openVehicle(vehicleId, defaultTab || 'checklist');
  };

  // Auto-save functie voor checklist wijzigingen
  const handleAutoSaveVehicle = async (updatedVehicle: any) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          details: updatedVehicle.details,
          status: updatedVehicle.salesStatus,
          location: updatedVehicle.location,
        })
        .eq('id', updatedVehicle.id);

      if (error) throw error;

      // Update lokale state in dialog
      vehicleDialog.updateVehicle(updatedVehicle);
      
      toast({ 
        title: "Wijzigingen opgeslagen", 
        description: "Checklist is automatisch bijgewerkt." 
      });
    } catch (error) {
      console.error('Auto-save error:', error);
      toast({
        title: "Fout bij opslaan",
        description: "Checklist wijzigingen konden niet worden opgeslagen.",
        variant: "destructive"
      });
    }
  };

  // Expliciete save functie voor de Opslaan knop
  const handleSaveVehicle = async (updatedVehicle: any) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          details: updatedVehicle.details,
          status: updatedVehicle.salesStatus,
          location: updatedVehicle.location,
          selling_price: updatedVehicle.sellingPrice,
        })
        .eq('id', updatedVehicle.id);

      if (error) throw error;

      toast({ title: "Voertuig opgeslagen" });
      vehicleDialog.closeDialog();
      refetch();
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Fout bij opslaan",
        description: "Wijzigingen konden niet worden opgeslagen.",
        variant: "destructive"
      });
    }
  };

  const handleViewClaim = (claimId: string) => {
    const claim = fullWarrantyClaims.find(c => c.id === claimId);
    if (claim) {
      setSelectedClaim(claim);
    }
  };

  const handleUpdateClaim = async (claimId: string, updates: Partial<WarrantyClaim>) => {
    try {
      await updateWarrantyClaim(claimId, updates);
      queryClient.invalidateQueries({ queryKey: ['warranty-claims'] });
      queryClient.invalidateQueries({ queryKey: ['aftersales-dashboard'] });
      toast({ title: "Claim bijgewerkt", description: "De garantie claim is succesvol bijgewerkt." });
      setSelectedClaim(null);
    } catch (error) {
      toast({ title: "Fout", description: "Kon claim niet bijwerken.", variant: "destructive" });
    }
  };

  const handleResolveClaim = async (claimId: string, resolutionData: { resolutionDescription: string; actualCost: number; customerSatisfaction: number }) => {
    try {
      await resolveWarrantyClaim(claimId, resolutionData);
      queryClient.invalidateQueries({ queryKey: ['warranty-claims'] });
      queryClient.invalidateQueries({ queryKey: ['aftersales-dashboard'] });
      toast({ title: "Claim opgelost", description: "De garantie claim is succesvol afgehandeld." });
      setSelectedClaim(null);
    } catch (error) {
      toast({ title: "Fout", description: "Kon claim niet oplossen.", variant: "destructive" });
    }
  };

  const handleDeleteClaim = async (claimId: string) => {
    try {
      await deleteWarrantyClaim(claimId);
      queryClient.invalidateQueries({ queryKey: ['warranty-claims'] });
      queryClient.invalidateQueries({ queryKey: ['aftersales-dashboard'] });
      toast({ title: "Claim verwijderd", description: "De garantie claim is verwijderd." });
      setSelectedClaim(null);
    } catch (error) {
      toast({ title: "Fout", description: "Kon claim niet verwijderen.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Fout bij laden van aftersales data: {error.message}</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-4">
            Opnieuw proberen
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!kpis) {
    return null;
  }
  const getImportStatusBadge = (status: string | null) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      'niet_aangemeld': { label: 'Niet aangemeld', className: 'bg-red-500 hover:bg-red-600 text-white border-transparent' },
      'aangekomen': { label: 'Aangekomen', className: 'bg-red-500 hover:bg-red-600 text-white border-transparent' },
      'aanvraag_ontvangen': { label: 'Aanvraag ontvangen', className: 'bg-yellow-500 hover:bg-yellow-600 text-white border-transparent' },
      'goedgekeurd': { label: 'Goedgekeurd', className: 'bg-blue-500 hover:bg-blue-600 text-white border-transparent' },
      'bpm_betaald': { label: 'BPM betaald', className: 'bg-blue-500 hover:bg-blue-600 text-white border-transparent' },
      'ingeschreven': { label: 'Ingeschreven', className: 'bg-green-500 hover:bg-green-600 text-white border-transparent' },
    };

    const config = statusConfig[status || ''] || { label: status || 'Onbekend', className: 'bg-gray-500 hover:bg-gray-600 text-white border-transparent' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getWaitingDaysBadge = (days: number, isLate: boolean, isWarning: boolean) => {
    if (isLate) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{days} dagen</Badge>;
    }
    if (isWarning) {
      return <Badge className="bg-orange-500 hover:bg-orange-600 gap-1"><Clock className="h-3 w-3" />{days} dagen</Badge>;
    }
    return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{days} dagen</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Openstaande Leveringen</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.pendingDeliveries}</div>
            <p className="text-xs text-muted-foreground mt-1">B2C voertuigen wachtend op aflevering</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gemiddelde Wachttijd</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.averageWaitingDays} dagen</div>
            <p className="text-xs text-muted-foreground mt-1">Sinds verkoopdatum</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Openstaande Garantie Claims</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.openWarrantyClaims}</div>
            <p className="text-xs text-muted-foreground mt-1">Actief + in behandeling</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Openstaande Taken</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.openTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Aftersales gerelateerd</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              B2C Leveringen in Afwachting
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant={deliveryFilter === 'all' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setDeliveryFilter('all')}
                className="gap-1"
              >
                <Filter className="h-3 w-3" />
                Alle ({pendingDeliveries.length})
              </Button>
              <Button 
                variant={deliveryFilter === 'in_progress' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setDeliveryFilter('in_progress')}
              >
                In Progress ({inProgressCount})
              </Button>
              <Button 
                variant={deliveryFilter === 'ready' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setDeliveryFilter('ready')}
                className="gap-1"
              >
                <CheckCircle2 className="h-3 w-3" />
                Klaar voor Levering ({readyCount})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDeliveries.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {deliveryFilter === 'all' 
                ? 'Geen openstaande leveringen' 
                : deliveryFilter === 'ready' 
                  ? 'Geen voertuigen klaar voor levering'
                  : 'Geen voertuigen in progress'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Voertuig</th>
                    <th className="pb-3 font-medium">Klant</th>
                    <th className="pb-3 font-medium">Wachttijd</th>
                    <th className="pb-3 font-medium">Checklist</th>
                    <th className="pb-3 font-medium">Toe te wijzen</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Actie</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeliveries.map((delivery) => (
                    <tr key={delivery.id} className={cn(
                      "border-b last:border-0",
                      delivery.isLate && "bg-red-50 dark:bg-red-950/20",
                      delivery.isWarning && !delivery.isLate && "bg-orange-50 dark:bg-orange-950/20"
                    )}>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{delivery.brand} {delivery.model}</div>
                            <div className="text-sm text-muted-foreground">{delivery.licensePlate || 'Geen kenteken'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <div>{delivery.customerName}</div>
                        {delivery.customerPhone && (
                          <div className="text-sm text-muted-foreground">{delivery.customerPhone}</div>
                        )}
                      </td>
                      <td className="py-3">
                        {getWaitingDaysBadge(delivery.daysSinceSale, delivery.isLate, delivery.isWarning)}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <Progress value={delivery.checklistProgress} className="h-2 flex-1" />
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {delivery.checklistCompleted}/{delivery.checklistTotal}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        {delivery.unassignedTaskCount === 0 ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 gap-1 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
                            <CheckCircle2 className="h-3 w-3" />
                            Gepland
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 gap-1 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800">
                            <ClipboardList className="h-3 w-3" />
                            {delivery.unassignedTaskCount} {delivery.unassignedTaskCount === 1 ? 'taak' : 'taken'}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3">
                        {delivery.isReadyForDelivery ? (
                          <Badge className="bg-green-600 hover:bg-green-700 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Klaar voor levering
                          </Badge>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {getImportStatusBadge(delivery.importStatus)}
                            {delivery.checklistProgress < 100 && (
                              <span className="text-xs text-muted-foreground">Checklist: {delivery.checklistProgress}%</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewVehicle(delivery.id, 'checklist')}
                          className="gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          Bekijk
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Garantie Claims */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Garantie Claims
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="open">
            <TabsList>
              <TabsTrigger value="open" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Openstaand ({openWarrantyClaims.length})
              </TabsTrigger>
              <TabsTrigger value="resolved" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Opgelost ({resolvedWarrantyClaims.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="open" className="mt-4">
              {openWarrantyClaims.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Geen openstaande garantie claims</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium">Voertuig</th>
                        <th className="pb-3 font-medium">Klant</th>
                        <th className="pb-3 font-medium">Probleem</th>
                        <th className="pb-3 font-medium">Dagen Open</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Actie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openWarrantyClaims.map((claim) => (
                        <tr key={claim.id} className="border-b last:border-0 hover:bg-muted/50 cursor-pointer">
                          <td className="py-3">
                            <div className="font-medium">{claim.vehicleBrand} {claim.vehicleModel}</div>
                            <div className="text-sm text-muted-foreground">{claim.licensePlate || 'Geen kenteken'}</div>
                          </td>
                          <td className="py-3">{claim.customerName}</td>
                          <td className="py-3 max-w-[200px] truncate">{claim.problemDescription}</td>
                          <td className="py-3">
                            <Badge variant={claim.daysOpen > 14 ? 'destructive' : 'outline'}>
                              {claim.daysOpen} dagen
                            </Badge>
                          </td>
                          <td className="py-3">
                            <Badge variant={claim.status === 'pending' ? 'default' : 'secondary'}>
                              {claim.status === 'pending' ? 'In behandeling' : claim.status}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewClaim(claim.id)}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              Bekijk
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="resolved" className="mt-4">
              {resolvedWarrantyClaims.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Geen opgeloste garantie claims</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium">Voertuig</th>
                        <th className="pb-3 font-medium">Klant</th>
                        <th className="pb-3 font-medium">Probleem</th>
                        <th className="pb-3 font-medium">Doorlooptijd</th>
                        <th className="pb-3 font-medium">Kosten</th>
                        <th className="pb-3 font-medium">Actie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resolvedWarrantyClaims.map((claim) => (
                        <tr key={claim.id} className="border-b last:border-0 hover:bg-muted/50 cursor-pointer">
                          <td className="py-3">
                            <div className="font-medium">{claim.vehicleBrand} {claim.vehicleModel}</div>
                            <div className="text-sm text-muted-foreground">{claim.licensePlate || 'Geen kenteken'}</div>
                          </td>
                          <td className="py-3">{claim.customerName}</td>
                          <td className="py-3 max-w-[200px] truncate">{claim.problemDescription}</td>
                          <td className="py-3">
                            <Badge variant="outline">{claim.resolutionDays || 0} dagen</Badge>
                          </td>
                          <td className="py-3">
                            {claim.claimAmount ? `€${claim.claimAmount.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-3">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewClaim(claim.id)}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              Bekijk
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Taken Overzicht */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Taken Overzicht
            </CardTitle>
            <Button onClick={() => setShowTaskForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe Taak
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="open">
            <TabsList>
              <TabsTrigger value="open" className="gap-2">
                <Clock className="h-4 w-4" />
                Openstaand ({openTasks.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Voltooid ({completedTasks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="open" className="mt-4">
              {openTasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Geen openstaande taken</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium">Taak</th>
                        <th className="pb-3 font-medium">Voertuig</th>
                        <th className="pb-3 font-medium">Toegewezen Aan</th>
                        <th className="pb-3 font-medium">Deadline</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Actie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openTasks.map((task) => {
                        const isOverdue = new Date(task.dueDate) < new Date();
                        return (
                          <tr key={task.id} className={cn(
                            "border-b last:border-0",
                            isOverdue && "bg-red-50 dark:bg-red-950/20"
                          )}>
                            <td className="py-3">
                              <div className="font-medium">{task.title}</div>
                              <div className="text-sm text-muted-foreground">{task.category}</div>
                            </td>
                            <td className="py-3">
                              {task.vehicleBrand ? (
                                <>
                                  <div>{task.vehicleBrand} {task.vehicleModel}</div>
                                  <div className="text-sm text-muted-foreground">{task.licensePlate || '-'}</div>
                                </>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="py-3">{task.assignedToName}</td>
                            <td className="py-3">
                              <Badge variant={isOverdue ? 'destructive' : 'outline'}>
                                {format(new Date(task.dueDate), 'd MMM yyyy', { locale: nl })}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <Badge variant={task.status === 'in_uitvoering' ? 'default' : 'secondary'}>
                                {task.status === 'in_uitvoering' ? 'In uitvoering' : 'Toegewezen'}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <div className="flex gap-1">
                                {task.status === 'toegewezen' && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleStartTask(task.id)}
                                    disabled={updateStatusMutation.isPending}
                                  >
                                    <PlayCircle className="h-4 w-4 mr-1" />
                                    Start
                                  </Button>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="default" 
                                  onClick={() => handleCompleteTask(task.id)}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Voltooid
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              {completedTasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Geen voltooide taken (laatste 7 dagen)</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium">Taak</th>
                        <th className="pb-3 font-medium">Voertuig</th>
                        <th className="pb-3 font-medium">Toegewezen Aan</th>
                        <th className="pb-3 font-medium">Voltooid Op</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedTasks.map((task) => (
                        <tr key={task.id} className="border-b last:border-0">
                          <td className="py-3">
                            <div className="font-medium">{task.title}</div>
                            <div className="text-sm text-muted-foreground">{task.category}</div>
                          </td>
                          <td className="py-3">
                            {task.vehicleBrand ? (
                              <>
                                <div>{task.vehicleBrand} {task.vehicleModel}</div>
                                <div className="text-sm text-muted-foreground">{task.licensePlate || '-'}</div>
                              </>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-3">{task.assignedToName}</td>
                          <td className="py-3">
                            {task.completedAt && (
                              <Badge variant="outline" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {format(new Date(task.completedAt), 'd MMM yyyy', { locale: nl })}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Vehicle Details Dialog */}
      {vehicleDialog.isOpen && vehicleDialog.vehicle && (
        <VehicleDetails
          vehicle={vehicleDialog.vehicle}
          defaultTab={vehicleDialog.defaultTab}
          onClose={vehicleDialog.closeDialog}
          onUpdate={handleSaveVehicle}
          onAutoSave={handleAutoSaveVehicle}
          onSendEmail={() => {}}
          onPhotoUpload={() => {}}
          onRemovePhoto={() => {}}
          onSetMainPhoto={() => {}}
        />
      )}

      {/* Warranty Claim Detail Dialog */}
      {selectedClaim && (
        <WarrantyClaimDetail
          claim={selectedClaim}
          isOpen={!!selectedClaim}
          onClose={() => setSelectedClaim(null)}
          onUpdate={handleUpdateClaim}
          onResolve={handleResolveClaim}
          onDelete={handleDeleteClaim}
        />
      )}

      {/* Task Form Dialog */}
      {showTaskForm && (
        <TaskForm
          onClose={handleTaskFormClose}
          onTaskAdded={handleTaskFormClose}
        />
      )}
    </div>
  );
};

export default AftersalesDashboard;
