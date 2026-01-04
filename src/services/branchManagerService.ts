import { supabase } from "@/integrations/supabase/client";
import { ReportPeriod } from "@/types/reports";
import {
  B2CKPIData,
  B2CSalespersonStats,
  B2CSalespersonVehicle,
  StockAgeData,
  PendingDelivery,
  TradeInStats,
  BranchManagerAlert,
  SalesTarget,
  BranchManagerDashboardData
} from "@/types/branchManager";
import { format, differenceInDays, parseISO } from "date-fns";

class BranchManagerService {
  async getDashboardData(period: ReportPeriod): Promise<BranchManagerDashboardData> {
    const [kpis, salespersonStats, stockAge, pendingDeliveries, tradeIns, targets] = await Promise.all([
      this.getB2CKPIs(period),
      this.getB2CSalespersonStats(period),
      this.getStockAgeAnalysis(),
      this.getPendingDeliveries(),
      this.getTradeInStats(period),
      this.getTargets(period)
    ]);

    const alerts = this.generateAlerts(kpis, salespersonStats, stockAge, pendingDeliveries, tradeIns);

    return {
      kpis,
      salespersonStats,
      stockAge,
      pendingDeliveries,
      tradeIns,
      alerts,
      targets,
      period
    };
  }

  async getB2CKPIs(period: ReportPeriod): Promise<B2CKPIData> {
    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);

    // Fetch B2C sold vehicles in period
    const { data: b2cVehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .in('status', ['verkocht_b2c', 'afgeleverd'])
      .gte('sold_date', startDate.toISOString())
      .lte('sold_date', endDate.toISOString());

    if (error) {
      console.error('Error fetching B2C vehicles:', error);
      throw error;
    }

    // Filter only B2C (exclude B2B which would be verkocht_b2b)
    const b2cOnly = (b2cVehicles || []).filter(v => 
      v.status === 'verkocht_b2c' || 
      (v.status === 'afgeleverd' && (v.details as any)?.salesType !== 'b2b')
    );

    // Calculate metrics
    let totalRevenue = 0;
    let totalMargin = 0;
    let upsalesRevenue = 0;
    let upsalesCount = 0;
    let deliveredCount = 0;
    let totalDeliveryDays = 0;

    b2cOnly.forEach(vehicle => {
      const sellingPrice = vehicle.selling_price || 0;
      const purchasePrice = vehicle.purchase_price || (vehicle.details as any)?.purchasePrice || 0;
      const warrantyPrice = (vehicle.details as any)?.warrantyPackagePrice || 0;
      
      totalRevenue += sellingPrice;
      totalMargin += (sellingPrice - purchasePrice);
      
      if (warrantyPrice > 0) {
        upsalesRevenue += warrantyPrice;
        upsalesCount++;
      }

      // Use details.deliveryDate (the actual delivery date users enter) instead of delivery_date column
      const detailsDeliveryDate = (vehicle.details as any)?.deliveryDate;
      if (vehicle.status === 'afgeleverd' && detailsDeliveryDate && vehicle.sold_date) {
        const deliveryDays = differenceInDays(
          parseISO(detailsDeliveryDate),
          parseISO(vehicle.sold_date)
        );
        // Only count positive values (negative = data entry error)
        if (deliveryDays >= 0) {
          deliveredCount++;
          totalDeliveryDays += deliveryDays;
        }
      }
    });

    // Get pending deliveries count
    const { count: pendingCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'verkocht_b2c');

    // Get targets for current period
    const periodKey = format(startDate, 'yyyy-MM');
    const targets = await this.getTargets(period);
    
    const b2cUnitsTarget = targets.find(t => t.target_type === 'b2c_units' && !t.salesperson_id)?.target_value || 40;
    const b2cRevenueTarget = targets.find(t => t.target_type === 'b2c_revenue' && !t.salesperson_id)?.target_value || 120000;
    const b2cMarginTarget = targets.find(t => t.target_type === 'b2c_margin_percent' && !t.salesperson_id)?.target_value || 15;
    const upsalesTarget = targets.find(t => t.target_type === 'upsales_revenue' && !t.salesperson_id)?.target_value || 5000;

    const marginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
    const avgDeliveryDays = deliveredCount > 0 ? totalDeliveryDays / deliveredCount : 0;
    const upsellRatio = b2cOnly.length > 0 ? (upsalesCount / b2cOnly.length) * 100 : 0;

    return {
      b2cSalesCount: b2cOnly.length,
      b2cSalesTarget: b2cUnitsTarget,
      b2cRevenue: totalMargin, // This is actually total margin for B2C
      b2cRevenueTarget: b2cRevenueTarget,
      b2cMarginPercent: marginPercent,
      b2cMarginTarget: b2cMarginTarget,
      upsalesRevenue,
      upsalesTarget,
      pendingDeliveries: pendingCount || 0,
      avgDeliveryDays,
      upsellRatio
    };
  }

  async getB2CSalespersonStats(period: ReportPeriod): Promise<B2CSalespersonStats[]> {
    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);

    // Get all B2C sales
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .in('status', ['verkocht_b2c', 'afgeleverd'])
      .gte('sold_date', startDate.toISOString())
      .lte('sold_date', endDate.toISOString());

    if (error) {
      console.error('Error fetching salesperson stats:', error);
      throw error;
    }

    // Filter B2C only
    const b2cVehicles = (vehicles || []).filter(v => 
      v.status === 'verkocht_b2c' || 
      (v.status === 'afgeleverd' && (v.details as any)?.salesType !== 'b2b')
    );

    // Get unique salesperson IDs
    const salespersonIds = [...new Set(b2cVehicles
      .map(v => v.sold_by_user_id)
      .filter(Boolean)
    )];

    // Fetch salesperson names from profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', salespersonIds);

    // Create profile lookup map
    const profileMap = new Map<string, string>();
    (profiles || []).forEach(p => {
      const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || p.email || 'Onbekend';
      profileMap.set(p.id, name);
    });

    // Group by sold_by_user_id (primary source of truth)
    const salesByPerson = new Map<string, {
      id: string;
      name: string;
      vehicles: typeof b2cVehicles;
    }>();

    b2cVehicles.forEach(vehicle => {
      const salespersonId = vehicle.sold_by_user_id || 'unknown';
      // Get name from profile map, fallback to details.salespersonName
      const salespersonName = profileMap.get(salespersonId) || 
        ((vehicle.details as any)?.salespersonName || 'Onbekend').trim();

      if (!salesByPerson.has(salespersonId)) {
        salesByPerson.set(salespersonId, { id: salespersonId, name: salespersonName, vehicles: [] });
      }
      salesByPerson.get(salespersonId)!.vehicles.push(vehicle);
    });

    // Calculate stats per salesperson
    const stats: B2CSalespersonStats[] = [];
    
    for (const [id, data] of salesByPerson) {
      let totalRevenue = 0;
      let totalMargin = 0;
      let upsellCount = 0;

      const vehicleDetails: B2CSalespersonStats['vehicles'] = [];

      data.vehicles.forEach(vehicle => {
        const sellingPrice = vehicle.selling_price || 0;
        const purchasePrice = vehicle.purchase_price || (vehicle.details as any)?.purchasePrice || 0;
        const warrantyPrice = (vehicle.details as any)?.warrantyPackagePrice || 0;
        const margin = sellingPrice - purchasePrice;

        totalRevenue += sellingPrice;
        totalMargin += margin;

        if (warrantyPrice > 0) upsellCount++;

        vehicleDetails.push({
          id: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          licensePlate: vehicle.license_number,
          purchasePrice,
          sellingPrice,
          margin,
          marginPercent: sellingPrice > 0 ? (margin / sellingPrice) * 100 : 0,
          soldDate: vehicle.sold_date || ''
        });
      });

      const target = 10; // Default per-person target
      const marginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
      const upsellRatio = data.vehicles.length > 0 ? (upsellCount / data.vehicles.length) * 100 : 0;

      stats.push({
        id,
        name: data.name,
        b2cSales: data.vehicles.length,
        target,
        targetPercent: (data.vehicles.length / target) * 100,
        totalRevenue,
        totalMargin,
        marginPercent,
        upsellCount,
        upsellRatio,
        vehicles: vehicleDetails
      });
    }

    // Sort by sales count descending
    return stats.sort((a, b) => b.b2cSales - a.b2cSales);
  }

  async getStockAgeAnalysis(): Promise<StockAgeData> {
    // Get online vehicles with online_since_date
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'voorraad');

    if (error) {
      console.error('Error fetching stock age data:', error);
      throw error;
    }

    // Filter only online vehicles
    const onlineVehicles = (vehicles || []).filter(v => 
      (v.details as any)?.showroomOnline === true
    );

    const now = new Date();
    const ranges = [
      { min: 0, max: 30, label: '0-30 dagen', color: 'hsl(var(--success))' },
      { min: 31, max: 60, label: '31-60 dagen', color: 'hsl(var(--warning))' },
      { min: 61, max: 90, label: '61-90 dagen', color: 'hsl(var(--destructive))' },
      { min: 91, max: Infinity, label: '90+ dagen', color: 'hsl(var(--muted-foreground))' }
    ];

    const distribution = ranges.map(range => ({
      range: range.label,
      count: 0,
      percentage: 0,
      color: range.color
    }));

    let totalDays = 0;
    const longStanding: StockAgeData['longStandingVehicles'] = [];

    onlineVehicles.forEach(vehicle => {
      const onlineSince = vehicle.online_since_date 
        ? parseISO(vehicle.online_since_date)
        : vehicle.created_at 
          ? parseISO(vehicle.created_at)
          : now;
      
      const days = differenceInDays(now, onlineSince);
      totalDays += days;

      // Find distribution bucket
      for (let i = 0; i < ranges.length; i++) {
        if (days >= ranges[i].min && days <= ranges[i].max) {
          distribution[i].count++;
          break;
        }
      }

      // Track long-standing vehicles (>60 days)
      if (days > 60) {
        longStanding.push({
          id: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          licensePlate: vehicle.license_number,
          daysOnline: days,
          sellingPrice: vehicle.selling_price || 0,
          salesperson: (vehicle.details as any)?.salespersonName || null
        });
      }
    });

    // Calculate percentages
    const total = onlineVehicles.length;
    distribution.forEach(d => {
      d.percentage = total > 0 ? (d.count / total) * 100 : 0;
    });

    // Sort long-standing by days descending
    longStanding.sort((a, b) => b.daysOnline - a.daysOnline);

    return {
      distribution,
      avgDays: total > 0 ? totalDays / total : 0,
      totalOnline: total,
      longStandingVehicles: longStanding.slice(0, 10) // Top 10
    };
  }

  async getPendingDeliveries(): Promise<PendingDelivery[]> {
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'verkocht_b2c')
      .order('sold_date', { ascending: true });

    if (error) {
      console.error('Error fetching pending deliveries:', error);
      throw error;
    }

    const now = new Date();

    return (vehicles || []).map(vehicle => {
      const soldDate = vehicle.sold_date ? parseISO(vehicle.sold_date) : now;
      const daysSinceSale = differenceInDays(now, soldDate);
      const details = vehicle.details as any;
      const alertDismissed = details?.deliveryAlertDismissed || false;

      return {
        id: vehicle.id,
        brand: vehicle.brand,
        model: vehicle.model,
        licensePlate: vehicle.license_number,
        soldDate: vehicle.sold_date || '',
        daysSinceSale,
        salesperson: details?.salespersonName || null,
        customerName: details?.customerName || null,
        isLate: daysSinceSale > 21 && !alertDismissed,
        alertDismissed,
        alertDismissedReason: details?.deliveryAlertDismissedReason || null
      };
    });
  }

  async getTradeInStats(period: ReportPeriod): Promise<TradeInStats> {
    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);

    // Get trade-in vehicles
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('details->>isTradeIn', 'true')
      .gte('sold_date', startDate.toISOString())
      .lte('sold_date', endDate.toISOString());

    if (error) {
      console.error('Error fetching trade-in stats:', error);
      // Return empty stats on error
      return {
        totalTradeIns: 0,
        avgResult: 0,
        negativeCount: 0,
        bySalesperson: []
      };
    }

    // For now, we don't have expected_trade_in_value, so we'll calculate based on selling price vs purchase price
    let totalResult = 0;
    let negativeCount = 0;

    const bySalesperson = new Map<string, {
      id: string;
      name: string;
      results: number[];
    }>();

    (vehicles || []).forEach(vehicle => {
      const sellingPrice = vehicle.selling_price || 0;
      const purchasePrice = vehicle.purchase_price || (vehicle.details as any)?.purchasePrice || 0;
      const result = sellingPrice - purchasePrice;

      totalResult += result;
      if (result < 0) negativeCount++;

      const salespersonId = vehicle.sold_by_user_id || 'unknown';
      const name = (vehicle.details as any)?.salespersonName || 'Onbekend';

      if (!bySalesperson.has(salespersonId)) {
        bySalesperson.set(salespersonId, { id: salespersonId, name, results: [] });
      }
      bySalesperson.get(salespersonId)!.results.push(result);
    });

    const total = vehicles?.length || 0;

    return {
      totalTradeIns: total,
      avgResult: total > 0 ? totalResult / total : 0,
      negativeCount,
      bySalesperson: Array.from(bySalesperson.values()).map(sp => ({
        id: sp.id,
        name: sp.name,
        tradeInCount: sp.results.length,
        avgResult: sp.results.length > 0 
          ? sp.results.reduce((a, b) => a + b, 0) / sp.results.length 
          : 0,
        negativeCount: sp.results.filter(r => r < 0).length
      }))
    };
  }

  async getTargets(period: ReportPeriod): Promise<SalesTarget[]> {
    const periodKey = format(new Date(period.startDate), 'yyyy-MM');

    const { data, error } = await supabase
      .from('sales_targets')
      .select('*')
      .eq('target_period', periodKey);

    if (error) {
      console.error('Error fetching targets:', error);
      // Return default targets
      return [
        { id: 'default-1', target_type: 'b2c_units', target_period: periodKey, target_value: 40, salesperson_id: null, created_at: '', updated_at: '', created_by: null, notes: null },
        { id: 'default-2', target_type: 'b2c_revenue', target_period: periodKey, target_value: 120000, salesperson_id: null, created_at: '', updated_at: '', created_by: null, notes: null },
        { id: 'default-3', target_type: 'b2c_margin_percent', target_period: periodKey, target_value: 15, salesperson_id: null, created_at: '', updated_at: '', created_by: null, notes: null }
      ];
    }

    return (data || []) as SalesTarget[];
  }

  async updateTarget(target: Partial<SalesTarget> & { target_type: string; target_period: string; target_value: number }): Promise<void> {
    const { error } = await supabase
      .from('sales_targets')
      .upsert({
        target_type: target.target_type,
        target_period: target.target_period,
        target_value: target.target_value,
        salesperson_id: target.salesperson_id || null,
        notes: target.notes || null
      }, {
        onConflict: 'target_type,target_period,salesperson_id'
      });

    if (error) {
      console.error('Error updating target:', error);
      throw error;
    }
  }

  private generateAlerts(
    kpis: B2CKPIData,
    salespersonStats: B2CSalespersonStats[],
    stockAge: StockAgeData,
    pendingDeliveries: PendingDelivery[],
    tradeIns: TradeInStats
  ): BranchManagerAlert[] {
    const alerts: BranchManagerAlert[] = [];

    // Margin alert
    if (kpis.b2cMarginPercent < kpis.b2cMarginTarget) {
      alerts.push({
        id: 'margin-low',
        type: 'margin',
        severity: kpis.b2cMarginPercent < (kpis.b2cMarginTarget * 0.8) ? 'critical' : 'warning',
        title: 'Marge onder target',
        description: `Huidige marge: ${kpis.b2cMarginPercent.toFixed(1)}% (target: ${kpis.b2cMarginTarget}%)`
      });
    }

    // Salesperson target alerts
    salespersonStats.forEach(sp => {
      if (sp.targetPercent < 80) {
        alerts.push({
          id: `target-${sp.id}`,
          type: 'target',
          severity: sp.targetPercent < 50 ? 'critical' : 'warning',
          title: `${sp.name} onder target`,
          description: `${sp.b2cSales}/${sp.target} verkopen (${sp.targetPercent.toFixed(0)}%)`,
          salespersonId: sp.id
        });
      }
    });

    // Late delivery alerts
    const lateDeliveries = pendingDeliveries.filter(d => d.isLate);
    lateDeliveries.forEach(delivery => {
      alerts.push({
        id: `delivery-${delivery.id}`,
        type: 'delivery',
        severity: delivery.daysSinceSale > 28 ? 'critical' : 'warning',
        title: `Levering vertraagd: ${delivery.brand} ${delivery.model}`,
        description: `${delivery.daysSinceSale} dagen sinds verkoop`,
        vehicleId: delivery.id
      });
    });

    // Stock age alerts
    stockAge.longStandingVehicles.forEach(vehicle => {
      if (vehicle.daysOnline > 60) {
        alerts.push({
          id: `stock-${vehicle.id}`,
          type: 'stock_age',
          severity: vehicle.daysOnline > 90 ? 'critical' : 'warning',
          title: `Langstaande voorraad: ${vehicle.brand} ${vehicle.model}`,
          description: `${vehicle.daysOnline} dagen online`,
          vehicleId: vehicle.id
        });
      }
    });

    // Trade-in alerts
    if (tradeIns.negativeCount > 0) {
      alerts.push({
        id: 'trade-in-negative',
        type: 'trade_in',
        severity: 'critical',
        title: `${tradeIns.negativeCount} negatieve inruil(en)`,
        description: `Gemiddeld resultaat: €${tradeIns.avgResult.toLocaleString()}`
      });
    }

    // Sort by severity
    return alerts.sort((a, b) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (a.severity !== 'critical' && b.severity === 'critical') return 1;
      return 0;
    });
  }
}

export const branchManagerService = new BranchManagerService();
