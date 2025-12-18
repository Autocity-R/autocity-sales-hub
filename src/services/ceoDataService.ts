import { supabase } from "@/integrations/supabase/client";

export interface CriticalAlert {
  type: 'import_status' | 'transport' | 'papers' | 'not_online' | 'slow_mover' | 'workshop';
  severity: 'critical' | 'warning' | 'info';
  count: number;
  vehicles: Array<{
    id: string;
    brand: string;
    model: string;
    license_number: string | null;
    days: number;
    status?: string;
  }>;
  message: string;
}

export interface TeamMemberPerformance {
  name: string;
  role: string;
  b2b_sales: number;
  b2c_sales: number;
  total_sales: number;
  total_revenue: number;
  average_margin: number;
}

export interface LeaseSupplierStats {
  supplier_id: string;
  supplier_name: string;
  company_name: string | null;
  total_vehicles: number;
  vehicles_delivered: number;
  average_delivery_days: number;
  papers_on_time_percentage: number;
}

export interface CEOBriefingData {
  alerts: CriticalAlert[];
  dailyStats: {
    vehiclesSoldToday: number;
    vehiclesInTransit: number;
    vehiclesOnStock: number;
    vehiclesNotOnline: number;
  };
  teamPerformance: TeamMemberPerformance[];
  leaseSuppliers: LeaseSupplierStats[];
}

// Alert thresholds
const THRESHOLDS = {
  IMPORT_STATUS_DAYS: 9,
  TRANSPORT_DAYS: 20,
  PAPERS_DAYS: 14,
  SLOW_MOVER_DAYS: 50,
  WORKSHOP_DAYS: 14,
};

/**
 * Get vehicles stuck in import status for more than 9 days
 */
export const getImportStatusAlerts = async (): Promise<CriticalAlert | null> => {
  try {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - THRESHOLDS.IMPORT_STATUS_DAYS);

    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('id, brand, model, license_number, import_status, import_updated_at, created_at')
      .in('import_status', ['aangemeld', 'goedgekeurd', 'bpm_betaald'])
      .lt('import_updated_at', thresholdDate.toISOString())
      .order('import_updated_at', { ascending: true });

    if (error) throw error;
    if (!vehicles || vehicles.length === 0) return null;

    const alertVehicles = vehicles.map(v => {
      const daysSince = Math.floor(
        (new Date().getTime() - new Date(v.import_updated_at || v.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: v.id,
        brand: v.brand,
        model: v.model,
        license_number: v.license_number,
        days: daysSince,
        status: v.import_status || undefined,
      };
    });

    return {
      type: 'import_status',
      severity: 'critical',
      count: alertVehicles.length,
      vehicles: alertVehicles,
      message: `${alertVehicles.length} voertuig(en) staan >9 dagen in dezelfde import status`,
    };
  } catch (error) {
    console.error('Error fetching import status alerts:', error);
    return null;
  }
};

/**
 * Get vehicles in transport for more than 20 days
 */
export const getTransportAlerts = async (): Promise<CriticalAlert | null> => {
  try {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - THRESHOLDS.TRANSPORT_DAYS);

    // Get all vehicles and filter by transportStatus = 'onderweg'
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('id, brand, model, license_number, details, created_at, purchase_date')
      .lt('purchase_date', thresholdDate.toISOString())
      .order('purchase_date', { ascending: true });

    if (error) throw error;
    if (!vehicles) return null;

    // Filter vehicles that are in transport (transportStatus = 'onderweg')
    const transportVehicles = vehicles.filter(v => {
      const details = v.details as any;
      return details?.transportStatus === 'onderweg';
    });

    if (transportVehicles.length === 0) return null;

    const alertVehicles = transportVehicles.map(v => {
      const daysSince = Math.floor(
        (new Date().getTime() - new Date(v.purchase_date || v.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: v.id,
        brand: v.brand,
        model: v.model,
        license_number: v.license_number,
        days: daysSince,
      };
    });

    return {
      type: 'transport',
      severity: 'critical',
      count: alertVehicles.length,
      vehicles: alertVehicles,
      message: `${alertVehicles.length} voertuig(en) zijn >20 dagen onderweg (doel <14 dagen)`,
    };
  } catch (error) {
    console.error('Error fetching transport alerts:', error);
    return null;
  }
};

/**
 * Get vehicles where papers are not received for more than 14 days
 * Excludes: delivered vehicles and trade-in vehicles
 */
export const getPapersAlerts = async (): Promise<CriticalAlert | null> => {
  try {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - THRESHOLDS.PAPERS_DAYS);

    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('id, brand, model, license_number, status, details, created_at')
      .in('status', ['voorraad', 'verkocht_b2b', 'verkocht_b2c'])
      .lt('created_at', thresholdDate.toISOString());

    if (error) throw error;
    if (!vehicles) return null;

    // Filter: 
    // - papers not received
    // - not a trade-in vehicle
    // - transportStatus = 'aangekomen' (auto moet binnen zijn, niet onderweg)
    const filteredVehicles = vehicles.filter(v => {
      const details = v.details as any;
      const papersReceived = details?.papersReceived === true;
      const isTradeIn = details?.isTradeIn === true;
      const transportStatus = details?.transportStatus;
      const isArrived = transportStatus === 'aangekomen';
      
      return !papersReceived && !isTradeIn && isArrived;
    });

    if (filteredVehicles.length === 0) return null;

    const alertVehicles = filteredVehicles.map(v => {
      const daysSince = Math.floor(
        (new Date().getTime() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: v.id,
        brand: v.brand,
        model: v.model,
        license_number: v.license_number,
        days: daysSince,
        status: v.status,
      };
    });

    return {
      type: 'papers',
      severity: 'warning',
      count: alertVehicles.length,
      vehicles: alertVehicles,
      message: `${alertVehicles.length} voertuig(en) hebben >14 dagen geen papieren ontvangen`,
    };
  } catch (error) {
    console.error('Error fetching papers alerts:', error);
    return null;
  }
};

/**
 * Get vehicles on stock but not online
 */
export const getVehiclesNotOnline = async (): Promise<CriticalAlert | null> => {
  try {
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('id, brand, model, license_number, details, created_at')
      .eq('status', 'voorraad');

    if (error) throw error;
    if (!vehicles) return null;

    // Filter: 
    // - transportStatus = 'aangekomen' (auto is binnen, niet meer onderweg)
    // - showroomOnline !== true (niet online)
    const offlineVehicles = vehicles.filter(v => {
      const details = v.details as any;
      const transportStatus = details?.transportStatus;
      const isArrived = transportStatus === 'aangekomen';
      const isNotOnline = details?.showroomOnline !== true;
      
      // Alleen auto's die BINNEN zijn (aangekomen) maar nog niet online staan
      return isArrived && isNotOnline;
    });

    if (offlineVehicles.length === 0) return null;

    const alertVehicles = offlineVehicles.map(v => {
      const daysSince = Math.floor(
        (new Date().getTime() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: v.id,
        brand: v.brand,
        model: v.model,
        license_number: v.license_number,
        days: daysSince,
      };
    });

    return {
      type: 'not_online',
      severity: 'warning',
      count: alertVehicles.length,
      vehicles: alertVehicles,
      message: `${alertVehicles.length} voertuig(en) binnen maar NIET online`,
    };
  } catch (error) {
    console.error('Error fetching not online alerts:', error);
    return null;
  }
};

/**
 * Get slow movers - vehicles on stock for more than 50 days
 */
export const getSlowMovers = async (): Promise<CriticalAlert | null> => {
  try {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - THRESHOLDS.SLOW_MOVER_DAYS);

    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('id, brand, model, license_number, created_at, selling_price')
      .eq('status', 'voorraad')
      .lt('created_at', thresholdDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!vehicles || vehicles.length === 0) return null;

    const alertVehicles = vehicles.map(v => ({
      id: v.id,
      brand: v.brand,
      model: v.model,
      license_number: v.license_number,
      days: Math.floor(
        (new Date().getTime() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));

    return {
      type: 'slow_mover',
      severity: 'warning',
      count: alertVehicles.length,
      vehicles: alertVehicles,
      message: `${alertVehicles.length} voertuig(en) staan >50 dagen op voorraad`,
    };
  } catch (error) {
    console.error('Error fetching slow movers:', error);
    return null;
  }
};

/**
 * Get vehicles stuck in workshop for more than 14 days
 */
export const getWorkshopBottlenecks = async (): Promise<CriticalAlert | null> => {
  try {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - THRESHOLDS.WORKSHOP_DAYS);

    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('id, brand, model, license_number, details, updated_at')
      .in('location', ['werkplaats', 'workshop']);

    if (error) throw error;
    if (!vehicles) return null;

    const workshopVehicles = vehicles.filter(v => {
      const updatedAt = new Date(v.updated_at);
      return updatedAt < thresholdDate;
    });

    if (workshopVehicles.length === 0) return null;

    const alertVehicles = workshopVehicles.map(v => ({
      id: v.id,
      brand: v.brand,
      model: v.model,
      license_number: v.license_number,
      days: Math.floor(
        (new Date().getTime() - new Date(v.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));

    return {
      type: 'workshop',
      severity: 'warning',
      count: alertVehicles.length,
      vehicles: alertVehicles,
      message: `${alertVehicles.length} voertuig(en) staan >14 dagen in werkplaats`,
    };
  } catch (error) {
    console.error('Error fetching workshop bottlenecks:', error);
    return null;
  }
};

/**
 * Get all critical alerts
 */
export const getAllCriticalAlerts = async (): Promise<CriticalAlert[]> => {
  const [importAlerts, transportAlerts, papersAlerts, notOnlineAlerts, slowMovers, workshopAlerts] = 
    await Promise.all([
      getImportStatusAlerts(),
      getTransportAlerts(),
      getPapersAlerts(),
      getVehiclesNotOnline(),
      getSlowMovers(),
      getWorkshopBottlenecks(),
    ]);

  return [
    importAlerts,
    transportAlerts,
    papersAlerts,
    notOnlineAlerts,
    slowMovers,
    workshopAlerts,
  ].filter((alert): alert is CriticalAlert => alert !== null);
};

/**
 * Get team performance data - queries vehicles directly with correct B2B/B2C logic
 */
export const getTeamPerformance = async (): Promise<TeamMemberPerformance[]> => {
  try {
    // Query vehicles directly (not the empty weekly_sales table)
    const { data: soldVehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, status, selling_price, purchase_price, details')
      .in('status', ['verkocht_b2b', 'verkocht_b2c', 'afgeleverd']);

    if (vehiclesError) throw vehiclesError;

    // Team member mappings with name variations for matching
    const teamMemberMappings: Record<string, { variations: string[]; role: string }> = {
      'Daan': { variations: ['daan', 'daan leyte', 'daan@auto-city.nl'], role: 'Verkoper B2B & B2C' },
      'Martijn': { variations: ['martijn', 'martijn zuyderhoudt', 'martijn@auto-city.nl'], role: 'Verkoper B2C' },
      'Alex': { variations: ['alex', 'alexander', 'alexander kool', 'alex@auto-city.nl'], role: 'Inkoper & B2B Verkoper' },
      'Hendrik': { variations: ['hendrik', 'hendrik@auto-city.nl'], role: 'Inkoper & Verkoper B2B/B2C' },
    };

    // Initialize performance map
    const performanceMap = new Map<string, TeamMemberPerformance>();
    Object.entries(teamMemberMappings).forEach(([name, config]) => {
      performanceMap.set(name, {
        name,
        role: config.role,
        b2b_sales: 0,
        b2c_sales: 0,
        total_sales: 0,
        total_revenue: 0,
        average_margin: 0,
      });
    });

    // Temporary margin tracking
    const marginTracking = new Map<string, { totalMargin: number; count: number }>();
    Object.keys(teamMemberMappings).forEach(name => {
      marginTracking.set(name, { totalMargin: 0, count: 0 });
    });

    // Process each sold vehicle
    soldVehicles?.forEach((vehicle: any) => {
      const details = vehicle.details || {};
      const salesperson = details.salespersonName || details.salesperson || details.verkoper || '';
      const salespersonLower = salesperson.toLowerCase().trim();
      
      if (!salespersonLower) return;

      // Find matching team member
      let matchedMember: string | null = null;
      for (const [name, config] of Object.entries(teamMemberMappings)) {
        const isMatch = config.variations.some(variation => 
          salespersonLower.includes(variation) || variation.includes(salespersonLower)
        );
        if (isMatch) {
          matchedMember = name;
          break;
        }
      }

      if (!matchedMember) return;

      const member = performanceMap.get(matchedMember)!;
      const tracker = marginTracking.get(matchedMember)!;
      
      // Calculate margin
      const sellingPrice = vehicle.selling_price || 0;
      const purchasePrice = vehicle.purchase_price || details.purchasePrice || 0;
      const margin = sellingPrice > 0 && purchasePrice > 0 ? sellingPrice - purchasePrice : 0;

      // CORRECT B2B/B2C logic: check salesType for afgeleverd vehicles
      const salesType = details.salesType;
      const isB2B = vehicle.status === 'verkocht_b2b' || 
                    (vehicle.status === 'afgeleverd' && salesType === 'b2b');
      const isB2C = vehicle.status === 'verkocht_b2c' || 
                    (vehicle.status === 'afgeleverd' && (salesType === 'b2c' || !salesType));

      if (isB2B) {
        member.b2b_sales++;
      } else if (isB2C) {
        member.b2c_sales++;
      }

      member.total_sales++;
      member.total_revenue += sellingPrice;
      tracker.totalMargin += margin;
      tracker.count++;
    });

    // Calculate average margins
    performanceMap.forEach((member, name) => {
      const tracker = marginTracking.get(name)!;
      member.average_margin = tracker.count > 0 ? Math.round(tracker.totalMargin / tracker.count) : 0;
    });

    return Array.from(performanceMap.values()).filter(m => m.total_sales > 0);
  } catch (error) {
    console.error('Error fetching team performance:', error);
    return [];
  }
};

/**
 * Get lease supplier statistics
 */
export const getLeaseSupplierStats = async (): Promise<LeaseSupplierStats[]> => {
  try {
    const leaseCompanies = ['arval', 'ayvens', 'alphabet', 'athlon', 'leaseplan', 'terberg'];

    const { data: suppliers, error: suppliersError } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, company_name')
      .eq('type', 'supplier');

    if (suppliersError) throw suppliersError;

    // Filter for lease companies
    const leaseSuppliers = suppliers?.filter(s => {
      const name = `${s.first_name} ${s.last_name} ${s.company_name || ''}`.toLowerCase();
      return leaseCompanies.some(lc => name.includes(lc));
    }) || [];

    // Get vehicle stats for each supplier
    const stats: LeaseSupplierStats[] = await Promise.all(
      leaseSuppliers.map(async supplier => {
        const { data: vehicles } = await supabase
          .from('vehicles')
          .select('id, status, created_at, details')
          .eq('supplier_id', supplier.id);

        const totalVehicles = vehicles?.length || 0;
        const deliveredVehicles = vehicles?.filter(v => v.status === 'afgeleverd').length || 0;

        return {
          supplier_id: supplier.id,
          supplier_name: `${supplier.first_name} ${supplier.last_name}`,
          company_name: supplier.company_name,
          total_vehicles: totalVehicles,
          vehicles_delivered: deliveredVehicles,
          average_delivery_days: 0,
          papers_on_time_percentage: 0,
        };
      })
    );

    return stats;
  } catch (error) {
    console.error('Error fetching lease supplier stats:', error);
    return [];
  }
};

/**
 * Get daily stats for CEO briefing
 */
export const getDailyStats = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Vehicles sold today
    const { data: soldToday } = await supabase
      .from('vehicles')
      .select('id')
      .in('status', ['verkocht_b2b', 'verkocht_b2c'])
      .gte('sold_date', today.toISOString());

    // Vehicles in transit - check transportStatus = 'onderweg'
    const { data: allVehiclesForTransit } = await supabase
      .from('vehicles')
      .select('id, details');

    const inTransit = allVehiclesForTransit?.filter(v => {
      const details = v.details as any;
      return details?.transportStatus === 'onderweg';
    }) || [];

    // Vehicles on stock
    const { data: onStock } = await supabase
      .from('vehicles')
      .select('id, details')
      .eq('status', 'voorraad');

    // Vehicles not online - only those that have arrived (transportStatus = 'aangekomen') but not online
    const notOnline = onStock?.filter(v => {
      const details = v.details as any;
      const isArrived = details?.transportStatus === 'aangekomen';
      const isNotOnline = details?.showroomOnline !== true;
      return isArrived && isNotOnline;
    }) || [];

    return {
      vehiclesSoldToday: soldToday?.length || 0,
      vehiclesInTransit: inTransit?.length || 0,
      vehiclesOnStock: onStock?.length || 0,
      vehiclesNotOnline: notOnline.length,
    };
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    return {
      vehiclesSoldToday: 0,
      vehiclesInTransit: 0,
      vehiclesOnStock: 0,
      vehiclesNotOnline: 0,
    };
  }
};

/**
 * Get complete CEO briefing data
 */
export const getCEOBriefingData = async (): Promise<CEOBriefingData> => {
  const [alerts, dailyStats, teamPerformance, leaseSuppliers] = await Promise.all([
    getAllCriticalAlerts(),
    getDailyStats(),
    getTeamPerformance(),
    getLeaseSupplierStats(),
  ]);

  return {
    alerts,
    dailyStats,
    teamPerformance,
    leaseSuppliers,
  };
};
