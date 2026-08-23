import { supabase } from "@/integrations/supabase/client";
import { ReportPeriod } from "@/types/reports";
import type { BranchFilter } from "@/contexts/BranchContext";

const COST_PER_PART = 300; // €300 per onderdeel

export interface RepairRecord {
  taskId: string;
  vehicleId: string | null;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleVin: string;
  vehicleLicenseNumber: string;
  branch: string | null;
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
  async getDamageRepairStats(period: ReportPeriod, branch?: BranchFilter): Promise<DamageRepairStats> {
    try {
      // damage_repair_records heeft geen FK naar vehicles → geen embed, branch-filter via losse map
      const wantInner = !!(branch && branch !== 'all');
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

      // Vestiging per auto ophalen voor het branch-filter en de labels
      const recVehicleIds = Array.from(new Set((records || []).map((r: any) => r.vehicle_id).filter(Boolean))) as string[];
      const branchByVehicle = new Map<string, string | null>();
      if (recVehicleIds.length > 0) {
        const { data: vs } = await supabase.from('vehicles').select('id,branch').in('id', recVehicleIds);
        for (const v of vs || []) branchByVehicle.set(v.id, (v as any).branch ?? null);
      }
      const scopedRecords = wantInner
        ? (records || []).filter((r: any) => !r.vehicle_id || branchByVehicle.get(r.vehicle_id) === branch)
        : (records || []);


      // Process the data
      const repairHistory: RepairRecord[] = [];
      const employeeStats: Map<string, EmployeeRepairStats> = new Map();
      const partStats: Map<string, number> = new Map();
      const vehicleIds = new Set<string>();

      let totalParts = 0;

      for (const record of scopedRecords) {
        const parts = (record.repaired_parts as string[]) || [];
        const partCount = record.part_count || parts.length;
        totalParts += partCount;
        const vBranch: string | null = record.vehicle_id ? (branchByVehicle.get(record.vehicle_id) ?? null) : null;

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
          branch: vBranch,
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
        totalTasks: scopedRecords.length,
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
