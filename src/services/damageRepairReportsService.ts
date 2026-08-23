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
      // Fetch from permanent damage_repair_records table (join vehicles voor branch-filter)
      const wantInner = !!(branch && branch !== 'all');
      const joinSpec = wantInner
        ? 'vehicle:vehicles!inner(branch)'
        : 'vehicle:vehicles(branch)';
      let dq: any = supabase
        .from('damage_repair_records')
        .select(`*, ${joinSpec}`)
        .gte('completed_at', period.startDate)
        .lte('completed_at', period.endDate)
        .order('completed_at', { ascending: false });
      if (wantInner) {
        dq = dq.eq('vehicle.branch', branch);
      }
      const { data: records, error } = await dq;

      // Uitbesteed schadeherstel: werkelijke kostprijs van de externe spuiter (work_orders.extern_cost)
      const wantVehicleJoin = wantInner ? 'vehicle:vehicles!inner(brand,model,vin,license_number,branch)' : 'vehicle:vehicles(brand,model,vin,license_number,branch)';
      let eq: any = supabase
        .from('work_orders')
        .select(`id,vehicle_id,parts,part,extern_party,extern_cost,approved_at,finished_at,branch,${wantVehicleJoin}`)
        .eq('discipline', 'spuit')
        .eq('uitvoering', 'extern')
        .not('extern_cost', 'is', null)
        .gte('approved_at', period.startDate)
        .lte('approved_at', period.endDate);
      if (wantInner) eq = eq.eq('vehicle.branch', branch);
      const { data: externOrders } = await eq;

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
        const vBranch: string | null = (record as any)?.vehicle?.branch ?? null;

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

      // Externe schadeherstel-kosten als kostenregels bij de auto
      let externCostTotal = 0;
      for (const o of (externOrders || []) as any[]) {
        const parts: string[] = Array.isArray(o.parts) ? o.parts : (o.part ? [o.part] : []);
        const cost = Number(o.extern_cost) || 0;
        externCostTotal += cost;
        if (o.vehicle_id) vehicleIds.add(o.vehicle_id);
        const label = `Extern schadeherstel — ${o.extern_party || 'externe partij'}`;
        repairHistory.push({
          taskId: `extern-${o.id}`,
          vehicleId: o.vehicle_id,
          vehicleBrand: o.vehicle?.brand || '-',
          vehicleModel: o.vehicle?.model || '-',
          vehicleVin: o.vehicle?.vin || '-',
          vehicleLicenseNumber: o.vehicle?.license_number || '-',
          branch: o.vehicle?.branch ?? o.branch ?? null,
          repairedParts: parts,
          partCount: parts.length,
          repairCost: cost,
          completedAt: o.approved_at || o.finished_at,
          assignedTo: '',
          employeeName: label,
        });
        const stats = employeeStats.get(label) || { employeeId: '', employeeName: label, totalParts: 0, totalRevenue: 0, totalTasks: 0 };
        stats.totalParts += parts.length;
        stats.totalRevenue += cost;
        stats.totalTasks += 1;
        employeeStats.set(label, stats);
        for (const part of parts) partStats.set(part, (partStats.get(part) || 0) + 1);
        totalParts += parts.length;
      }
      repairHistory.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

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

      const internalParts = totalParts - ((externOrders || []) as any[]).reduce((n, o) => n + (Array.isArray(o.parts) ? o.parts.length : (o.part ? 1 : 0)), 0);
      const totalRevenue = internalParts * COST_PER_PART + externCostTotal;
      const totalVehicles = vehicleIds.size;

      return {
        totalTasks: (records?.length || 0) + ((externOrders || []) as any[]).length,
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
