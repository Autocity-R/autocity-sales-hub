import { supabase } from "@/integrations/supabase/client";
import { 
  AftersalesDashboardData, 
  AftersalesKPIs, 
  PendingDeliveryExtended, 
  WarrantyClaimExtended,
  TaskExtended 
} from "@/types/aftersales";
import { differenceInDays } from "date-fns";

class AftersalesService {
  async getDashboardData(): Promise<AftersalesDashboardData> {
    const [pendingDeliveries, warrantyClaims, tasks] = await Promise.all([
      this.getPendingB2CDeliveries(),
      this.getWarrantyClaims(),
      this.getAftersalesTasks()
    ]);

    const kpis = this.calculateKPIs(pendingDeliveries, warrantyClaims.open, tasks.open);

    return {
      pendingDeliveries,
      openWarrantyClaims: warrantyClaims.open,
      resolvedWarrantyClaims: warrantyClaims.resolved,
      openTasks: tasks.open,
      completedTasks: tasks.completed,
      kpis
    };
  }

  private async getPendingB2CDeliveries(): Promise<PendingDeliveryExtended[]> {
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'verkocht_b2c')
      .order('sold_date', { ascending: true });

    if (error) {
      console.error('Error fetching pending B2C deliveries:', error);
      return [];
    }

    return (vehicles || []).map(vehicle => {
      const soldDate = vehicle.sold_date || vehicle.created_at;
      const daysSinceSale = differenceInDays(new Date(), new Date(soldDate));
      
      // Calculate checklist progress from details JSONB
      const details = (vehicle.details as any) || {};
      const checklist = details.preDeliveryChecklist || {};
      const checklistItems = Object.entries(checklist);
      const checklistCompleted = checklistItems.filter(([_, value]) => value === true).length;
      const checklistTotal = checklistItems.length || 1;
      const checklistProgress = Math.round((checklistCompleted / checklistTotal) * 100);

      const customerName = details.customerName || 'Onbekend';

      return {
        id: vehicle.id,
        brand: vehicle.brand,
        model: vehicle.model,
        licensePlate: vehicle.license_number,
        customerName,
        customerPhone: details.customerPhone,
        customerEmail: details.customerEmail,
        soldDate,
        daysSinceSale,
        checklistProgress,
        checklistTotal,
        checklistCompleted,
        importStatus: vehicle.import_status,
        isLate: daysSinceSale > 21,
        isWarning: daysSinceSale >= 14 && daysSinceSale <= 21,
        location: vehicle.location
      };
    }).sort((a, b) => b.daysSinceSale - a.daysSinceSale);
  }

  private async getWarrantyClaims(): Promise<{ open: WarrantyClaimExtended[], resolved: WarrantyClaimExtended[] }> {
    const { data: claims, error } = await supabase
      .from('warranty_claims')
      .select(`*, vehicles:vehicle_id (brand, model, license_number)`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching warranty claims:', error);
      return { open: [], resolved: [] };
    }

    const mappedClaims = (claims || []).map(claim => {
      const vehicle = claim.vehicles as any;
      const createdAt = claim.created_at;
      const daysOpen = differenceInDays(new Date(), new Date(createdAt));
      const resolvedAt = claim.resolution_date;
      const resolutionDays = resolvedAt 
        ? differenceInDays(new Date(resolvedAt), new Date(createdAt))
        : undefined;

      return {
        id: claim.id,
        vehicleId: claim.vehicle_id,
        vehicleBrand: vehicle?.brand || claim.manual_vehicle_brand || 'Onbekend',
        vehicleModel: vehicle?.model || claim.manual_vehicle_model || '',
        licensePlate: vehicle?.license_number || claim.manual_license_number || null,
        customerName: claim.manual_customer_name || 'Onbekend',
        problemDescription: claim.description || '',
        status: claim.claim_status,
        createdAt,
        daysOpen,
        claimAmount: claim.claim_amount,
        resolvedAt,
        resolutionDays
      };
    });

    return {
      open: mappedClaims.filter(c => c.status === 'actief' || c.status === 'in_behandeling' || c.status === 'open'),
      resolved: mappedClaims.filter(c => c.status === 'opgelost' || c.status === 'afgerond').slice(0, 50)
    };
  }

  private async getAftersalesTasks(): Promise<{ open: TaskExtended[], completed: TaskExtended[] }> {
    const relevantCategories = ['aflevering', 'schoonmaak', 'reparatie', 'schadeherstel', 'poetsen', 'apk'];

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`*, assigned_to_profile:profiles!tasks_assigned_to_fkey (first_name, last_name)`)
      .in('category', relevantCategories)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching aftersales tasks:', error);
      return { open: [], completed: [] };
    }

    const mappedTasks = (tasks || []).map(task => {
      const profile = task.assigned_to_profile as any;
      const assignedToName = profile 
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        : 'Niet toegewezen';

      return {
        id: task.id,
        title: task.title,
        description: task.description || '',
        vehicleId: task.vehicle_id,
        vehicleBrand: task.vehicle_brand,
        vehicleModel: task.vehicle_model,
        licensePlate: task.vehicle_license_number,
        assignedToName,
        assignedToId: task.assigned_to,
        dueDate: task.due_date,
        status: task.status,
        category: task.category,
        priority: task.priority,
        completedAt: task.completed_at
      };
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return {
      open: mappedTasks.filter(t => t.status !== 'voltooid' && t.status !== 'geannuleerd'),
      completed: mappedTasks.filter(t => t.status === 'voltooid' && t.completedAt && new Date(t.completedAt) >= sevenDaysAgo).slice(0, 50)
    };
  }

  private calculateKPIs(
    pendingDeliveries: PendingDeliveryExtended[],
    openClaims: WarrantyClaimExtended[],
    openTasks: TaskExtended[]
  ): AftersalesKPIs {
    const totalWaitingDays = pendingDeliveries.reduce((sum, d) => sum + d.daysSinceSale, 0);
    const averageWaitingDays = pendingDeliveries.length > 0 
      ? Math.round(totalWaitingDays / pendingDeliveries.length)
      : 0;

    return {
      pendingDeliveries: pendingDeliveries.length,
      averageWaitingDays,
      openWarrantyClaims: openClaims.length,
      openTasks: openTasks.length
    };
  }
}

export const aftersalesService = new AftersalesService();
