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
      // Fetch from permanent damage_repair_records table
      const { data: records, error } = await supabase
        .from('damage_repair_records')
        .select('*')
        .gte('completed_at', period.startDate)
        .lte('completed_at', period.endDate)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error fetching damage repair records:', error);
        throw error;
      }

      // Process the data
      const repairHistory: RepairRecord[] = [];
      const employeeStats: Map<string, EmployeeRepairStats> = new Map();
      const partStats: Map<string, number> = new Map();
      const vehicleIds = new Set<string>();

      let totalParts = 0;

      for (const record of records || []) {
        const parts = (record.repaired_parts as string[]) || [];
        const partCount = record.part_count || parts.length;
        totalParts += partCount;

        // Track vehicle
        if (record.vehicle_id) {
          vehicleIds.add(record.vehicle_id);
        }

        // Add to repair history
        repairHistory.push({
          taskId: record.task_id || record.id,
          vehicleId: record.vehicle_id,
          vehicleBrand: record.vehicle_brand || '-',
          vehicleModel: record.vehicle_model || '-',
          vehicleVin: record.vehicle_vin || '-',
          vehicleLicenseNumber: record.vehicle_license_number || '-',
          repairedParts: parts,
          partCount,
          repairCost: record.repair_cost || partCount * COST_PER_PART,
          completedAt: record.completed_at,
          assignedTo: record.employee_id,
          employeeName: record.employee_name || 'Onbekend'
        });

        // Update employee stats
        const employeeKey = record.employee_id || 'unknown';
        const existingStats = employeeStats.get(employeeKey) || {
          employeeId: record.employee_id || '',
          employeeName: record.employee_name || 'Onbekend',
          totalParts: 0,
          totalRevenue: 0,
          totalTasks: 0
        };
        existingStats.totalParts += partCount;
        existingStats.totalRevenue += record.repair_cost || partCount * COST_PER_PART;
        existingStats.totalTasks += 1;
        employeeStats.set(employeeKey, existingStats);

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
        totalTasks: records?.length || 0,
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
