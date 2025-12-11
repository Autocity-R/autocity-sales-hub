import { supabase } from "@/integrations/supabase/client";
import { ReportPeriod } from "@/types/reports";

const COST_PER_PART = 300; // €300 per onderdeel

export interface RepairRecord {
  taskId: string;
  vehicleId: string | null;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleVin: string;
  vehicleLicenseNumber: string;
  repairedParts: string[];
  partCount: number;
  repairCost: number;
  completedAt: string;
  assignedTo: string;
  employeeName: string;
}

export interface EmployeeRepairStats {
  employeeId: string;
  employeeName: string;
  totalParts: number;
  totalRevenue: number;
  totalTasks: number;
}

export interface PartRepairStats {
  partName: string;
  count: number;
  percentage: number;
}

export interface DamageRepairStats {
  totalTasks: number;
  totalParts: number;
  totalRevenue: number;
  totalVehicles: number;
  averagePerVehicle: number;
  byEmployee: EmployeeRepairStats[];
  byPart: PartRepairStats[];
  repairHistory: RepairRecord[];
}

export const damageRepairReportsService = {
  async getDamageRepairStats(period: ReportPeriod): Promise<DamageRepairStats> {
    try {
      // Fetch completed schadeherstel tasks within the period
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(`
          id,
          vehicle_id,
          vehicle_brand,
          vehicle_model,
          vehicle_vin,
          vehicle_license_number,
          damage_parts,
          completed_at,
          assigned_to,
          assigned_to_profile:profiles!tasks_assigned_to_fkey(id, first_name, last_name, email)
        `)
        .eq('category', 'schadeherstel')
        .eq('status', 'voltooid')
        .gte('completed_at', period.startDate)
        .lte('completed_at', period.endDate)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error fetching damage repair tasks:', error);
        throw error;
      }

      // Process the data
      const repairHistory: RepairRecord[] = [];
      const employeeStats: Map<string, EmployeeRepairStats> = new Map();
      const partStats: Map<string, number> = new Map();
      const vehicleIds = new Set<string>();

      let totalParts = 0;

      for (const task of tasks || []) {
        // Extract parts from damage_parts JSON
        const damageParts = task.damage_parts as { parts?: Array<{ name: string }> } | null;
        const parts = damageParts?.parts?.map(p => p.name) || [];
        const partCount = parts.length;
        totalParts += partCount;

        // Track vehicle
        if (task.vehicle_id) {
          vehicleIds.add(task.vehicle_id);
        }

        // Get employee name
        const profile = task.assigned_to_profile as { first_name?: string; last_name?: string; email?: string } | null;
        const employeeName = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'Onbekend'
          : 'Onbekend';

        // Add to repair history
        repairHistory.push({
          taskId: task.id,
          vehicleId: task.vehicle_id,
          vehicleBrand: task.vehicle_brand || '-',
          vehicleModel: task.vehicle_model || '-',
          vehicleVin: task.vehicle_vin || '-',
          vehicleLicenseNumber: task.vehicle_license_number || '-',
          repairedParts: parts,
          partCount,
          repairCost: partCount * COST_PER_PART,
          completedAt: task.completed_at,
          assignedTo: task.assigned_to,
          employeeName
        });

        // Update employee stats
        const existingStats = employeeStats.get(task.assigned_to) || {
          employeeId: task.assigned_to,
          employeeName,
          totalParts: 0,
          totalRevenue: 0,
          totalTasks: 0
        };
        existingStats.totalParts += partCount;
        existingStats.totalRevenue += partCount * COST_PER_PART;
        existingStats.totalTasks += 1;
        employeeStats.set(task.assigned_to, existingStats);

        // Update part stats
        for (const part of parts) {
          partStats.set(part, (partStats.get(part) || 0) + 1);
        }
      }

      // Convert part stats to array with percentages
      const byPart: PartRepairStats[] = Array.from(partStats.entries())
        .map(([partName, count]) => ({
          partName,
          count,
          percentage: totalParts > 0 ? Math.round((count / totalParts) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count);

      // Convert employee stats to array
      const byEmployee = Array.from(employeeStats.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      const totalRevenue = totalParts * COST_PER_PART;
      const totalVehicles = vehicleIds.size;

      return {
        totalTasks: tasks?.length || 0,
        totalParts,
        totalRevenue,
        totalVehicles,
        averagePerVehicle: totalVehicles > 0 ? Math.round(totalRevenue / totalVehicles) : 0,
        byEmployee,
        byPart,
        repairHistory
      };
    } catch (error) {
      console.error('Error in getDamageRepairStats:', error);
      return {
        totalTasks: 0,
        totalParts: 0,
        totalRevenue: 0,
        totalVehicles: 0,
        averagePerVehicle: 0,
        byEmployee: [],
        byPart: [],
        repairHistory: []
      };
    }
  }
};
