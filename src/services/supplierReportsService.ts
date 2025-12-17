import { supabase } from "@/integrations/supabase/client";
import { ReportPeriod, SupplierStats, SupplierAnalyticsData, ChannelStats } from "@/types/reports";

// Internal interface for building stats
interface SupplierStatsBuilder extends Omit<SupplierStats, 
  'annualizedROI' | 'profitPerDay' | 'sellThroughRate' | 'inventoryTurnover' | 
  'gmroi' | 'capitalEfficiency' | 'performanceScore' | 'basePerformanceScore' | 
  'avgProfitPerVehicle' | 'preferredChannel' | 'channelEfficiencyGap' |
  'reliabilityTier' | 'reliabilityStars' | 'reliabilityScore' | 'meetsMinimumThreshold' | 'volumeFactor'> {
  totalDaysToSell: number;
  b2bTotalDays: number;
  b2cTotalDays: number;
  b2bTotalPurchaseValue: number;
  b2cTotalPurchaseValue: number;
}

class SupplierReportsService {
  async getSupplierAnalytics(period: ReportPeriod, showAllTime: boolean = false): Promise<SupplierAnalyticsData> {
    // Haal alle voertuigen met supplier_id op
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select(`
        id,
        brand,
        model,
        supplier_id,
        created_at,
        sold_date,
        status,
        selling_price,
        details
      `)
      .not('supplier_id', 'is', null);

    if (vehiclesError) throw vehiclesError;
    
    // Haal alle unieke supplier contacts op
    const supplierIds = [...new Set(vehicles?.map(v => v.supplier_id).filter(Boolean) as string[])];
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, company_name, first_name, last_name')
      .in('id', supplierIds);
    
    if (contactsError) {
      console.error('Error fetching supplier contacts:', contactsError);
    }
    
    // Maak een map voor snelle lookup
    const contactMap = new Map(contacts?.map(c => [c.id, c]) || []);
    
    // Filter voertuigen op basis van mode
    const filteredVehicles = showAllTime 
      ? vehicles 
      : vehicles?.filter(v => {
          const soldDate = v.sold_date ? new Date(v.sold_date) : null;
          const periodStart = new Date(period.startDate);
          const periodEnd = new Date(period.endDate);
          
          // Toon voertuig als het verkocht is binnen de periode OF op voorraad is
          return (soldDate && soldDate >= periodStart && soldDate <= periodEnd) ||
                 ['voorraad', 'onderweg', 'transport'].includes(v.status);
        });

    const supplierMap = new Map<string, SupplierStatsBuilder>();
    
    filteredVehicles?.forEach(vehicle => {
      const supplierId = vehicle.supplier_id || 'unknown';
      const contact = contactMap.get(supplierId);
      const supplierName = this.getSupplierName(contact);
      
      if (!supplierMap.has(supplierId)) {
        supplierMap.set(supplierId, this.initSupplierStats(supplierId, supplierName));
      }
      
      const stats = supplierMap.get(supplierId)!;
      this.updateSupplierStats(stats, vehicle);
    });
    
    // Calculate final metrics for each supplier
    const suppliers: SupplierStats[] = Array.from(supplierMap.values()).map(s => {
      const avgDaysToSell = s.sold > 0 ? s.totalDaysToSell / s.sold : 0;
      const avgPurchasePrice = s.totalVehicles > 0 ? s.totalPurchaseValue / s.totalVehicles : 0;
      const avgSalesPrice = s.sold > 0 ? s.totalSalesValue / s.sold : 0;
      const profitMargin = s.totalSalesValue > 0 ? (s.profit / s.totalSalesValue) * 100 : 0;
      const roi = s.totalPurchaseValue > 0 ? (s.profit / s.totalPurchaseValue) * 100 : 0;
      
      // Automotive metrics
      const annualizedROI = avgDaysToSell > 0 && s.totalPurchaseValue > 0 
        ? (s.profit / s.totalPurchaseValue) * (365 / avgDaysToSell) * 100 
        : 0;
      const profitPerDay = avgDaysToSell > 0 && s.sold > 0 
        ? s.profit / (s.sold * avgDaysToSell) 
        : 0;
      const sellThroughRate = s.totalVehicles > 0 ? (s.sold / s.totalVehicles) * 100 : 0;
      const inventoryTurnover = avgDaysToSell > 0 ? 365 / avgDaysToSell : 0;
      const gmroi = s.stockValue > 0 ? s.profit / s.stockValue : (s.profit > 0 ? 999 : 0);
      const capitalEfficiency = s.totalPurchaseValue > 0 ? s.totalSalesValue / s.totalPurchaseValue : 0;
      const avgProfitPerVehicle = s.sold > 0 ? s.profit / s.sold : 0;
      
      // Calculate B2B metrics
      const b2bAvgDays = s.b2b.sold > 0 ? s.b2bTotalDays / s.b2b.sold : 0;
      const b2bMargin = s.b2b.revenue > 0 ? (s.b2b.profit / s.b2b.revenue) * 100 : 0;
      const b2bAnnualizedROI = b2bAvgDays > 0 && s.b2bTotalPurchaseValue > 0 
        ? (s.b2b.profit / s.b2bTotalPurchaseValue) * (365 / b2bAvgDays) * 100 
        : 0;
      const b2bProfitPerDay = b2bAvgDays > 0 && s.b2b.sold > 0 
        ? s.b2b.profit / (s.b2b.sold * b2bAvgDays) 
        : 0;
      
      // Calculate B2C metrics
      const b2cAvgDays = s.b2c.sold > 0 ? s.b2cTotalDays / s.b2c.sold : 0;
      const b2cMargin = s.b2c.revenue > 0 ? (s.b2c.profit / s.b2c.revenue) * 100 : 0;
      const b2cAnnualizedROI = b2cAvgDays > 0 && s.b2cTotalPurchaseValue > 0 
        ? (s.b2c.profit / s.b2cTotalPurchaseValue) * (365 / b2cAvgDays) * 100 
        : 0;
      const b2cProfitPerDay = b2cAvgDays > 0 && s.b2c.sold > 0 
        ? s.b2c.profit / (s.b2c.sold * b2cAvgDays) 
        : 0;
      
      // Determine preferred channel
      let preferredChannel: 'b2b' | 'b2c' | 'mixed' = 'mixed';
      if (s.b2b.sold > 0 && s.b2c.sold === 0) preferredChannel = 'b2b';
      else if (s.b2c.sold > 0 && s.b2b.sold === 0) preferredChannel = 'b2c';
      else if (b2bAnnualizedROI > b2cAnnualizedROI * 1.2) preferredChannel = 'b2b';
      else if (b2cAnnualizedROI > b2bAnnualizedROI * 1.2) preferredChannel = 'b2c';
      
      const channelEfficiencyGap = Math.abs(b2bAnnualizedROI - b2cAnnualizedROI);
      
      // Reliability Tier Calculation
      // Premium: 20+ verkopen, Regular: 10-19, Small: 5-9, New: <5
      const reliabilityTier = s.sold >= 20 ? 'premium' as const : 
                              s.sold >= 10 ? 'regular' as const : 
                              s.sold >= 5 ? 'small' as const : 'new' as const;
      const reliabilityStars = s.sold >= 20 ? 3 as const : s.sold >= 10 ? 2 as const : 1 as const;
      const reliabilityScore = Math.min(s.sold * 5, 100); // Max 100 at 20 sales
      const meetsMinimumThreshold = s.sold >= 5;
      
      // Volume Factor (0.5 - 1.0)
      // Leveranciers met <10 verkopen krijgen een lagere weging
      const volumeBenchmark = 10;
      const volumeFactor = Math.max(0.5, Math.min(1, s.sold / volumeBenchmark));
      
      // Base Performance Score (0-100) - Puur op metrics
      // 30% Annualized ROI (benchmark: 100%+)
      // 25% Winst per Dag (benchmark: €50+)
      // 20% Sell-Through Rate (benchmark: 80%+)
      // 15% Marge % (benchmark: 12%+)
      // 10% Consistentie (snelheid - lager is beter)
      const roiScore = Math.min(annualizedROI / 100, 1) * 30;
      const profitPerDayScore = Math.min(profitPerDay / 50, 1) * 25;
      const sellThroughScore = Math.min(sellThroughRate / 80, 1) * 20;
      const marginScore = Math.min(profitMargin / 12, 1) * 15;
      const speedScore = avgDaysToSell > 0 ? Math.max(1 - (avgDaysToSell / 90), 0) * 10 : 0;
      const basePerformanceScore = Math.round(roiScore + profitPerDayScore + sellThroughScore + marginScore + speedScore);
      
      // Volume-Gewogen Performance Score
      const performanceScore = Math.round(basePerformanceScore * volumeFactor);
      
      return {
        ...s,
        avgPurchasePrice,
        avgSalesPrice,
        profitMargin,
        avgDaysToSell,
        roi,
        annualizedROI,
        profitPerDay,
        sellThroughRate,
        inventoryTurnover,
        gmroi,
        capitalEfficiency,
        basePerformanceScore: Math.min(basePerformanceScore, 100),
        performanceScore: Math.min(performanceScore, 100),
        avgProfitPerVehicle,
        reliabilityTier,
        reliabilityStars,
        reliabilityScore,
        meetsMinimumThreshold,
        volumeFactor,
        b2b: {
          ...s.b2b,
          avgDaysToSell: b2bAvgDays,
          margin: b2bMargin,
          annualizedROI: b2bAnnualizedROI,
          profitPerDay: b2bProfitPerDay,
          avgPurchasePrice: s.b2b.sold > 0 ? s.b2bTotalPurchaseValue / s.b2b.sold : 0,
          avgSalesPrice: s.b2b.sold > 0 ? s.b2b.revenue / s.b2b.sold : 0,
          avgProfitPerVehicle: s.b2b.sold > 0 ? s.b2b.profit / s.b2b.sold : 0
        },
        b2c: {
          ...s.b2c,
          avgDaysToSell: b2cAvgDays,
          margin: b2cMargin,
          annualizedROI: b2cAnnualizedROI,
          profitPerDay: b2cProfitPerDay,
          avgPurchasePrice: s.b2c.sold > 0 ? s.b2cTotalPurchaseValue / s.b2c.sold : 0,
          avgSalesPrice: s.b2c.sold > 0 ? s.b2c.revenue / s.b2c.sold : 0,
          avgProfitPerVehicle: s.b2c.sold > 0 ? s.b2c.profit / s.b2c.sold : 0
        },
        preferredChannel,
        channelEfficiencyGap
      };
    });
    
    // Sort by performance score by default
    suppliers.sort((a, b) => b.performanceScore - a.performanceScore);
    
    // Calculate summary metrics - ONLY from reliable suppliers (5+ sales)
    const reliableSuppliers = suppliers.filter(s => s.meetsMinimumThreshold);
    const suppliersWithSales = suppliers.filter(s => s.sold > 0);
    
    // Best Performer - Only from reliable suppliers
    const reliableSorted = [...reliableSuppliers].sort((a, b) => b.performanceScore - a.performanceScore);
    const bestPerformer = reliableSorted.length > 0 
      ? { name: reliableSorted[0].name, score: reliableSorted[0].performanceScore }
      : null;
    
    // Fastest Turnover - Only from reliable suppliers
    const fastestTurnoverSupplier = [...reliableSuppliers].sort((a, b) => a.avgDaysToSell - b.avgDaysToSell)[0];
    const fastestTurnover = fastestTurnoverSupplier 
      ? { name: fastestTurnoverSupplier.name, days: Math.round(fastestTurnoverSupplier.avgDaysToSell) }
      : null;
    
    // Best ROI - Only from reliable suppliers
    const bestROISupplier = [...reliableSuppliers].sort((a, b) => b.annualizedROI - a.annualizedROI)[0];
    const bestAnnualizedROI = bestROISupplier 
      ? { name: bestROISupplier.name, roi: bestROISupplier.annualizedROI }
      : null;
    
    // Best Profit per Day - Only from reliable suppliers
    const bestProfitPerDaySupplier = [...reliableSuppliers].sort((a, b) => b.profitPerDay - a.profitPerDay)[0];
    const highestProfitPerDay = bestProfitPerDaySupplier 
      ? { name: bestProfitPerDaySupplier.name, profitPerDay: bestProfitPerDaySupplier.profitPerDay }
      : null;
    
    // B2B/B2C - Only from reliable suppliers with channel sales
    const b2bSuppliers = reliableSuppliers.filter(s => s.b2b.sold >= 3); // At least 3 B2B sales
    const bestB2BSupplier = [...b2bSuppliers].sort((a, b) => b.b2b.annualizedROI - a.b2b.annualizedROI)[0];
    const bestB2B = bestB2BSupplier 
      ? { name: bestB2BSupplier.name, roi: bestB2BSupplier.b2b.annualizedROI }
      : null;
    
    const b2cSuppliers = reliableSuppliers.filter(s => s.b2c.sold >= 3); // At least 3 B2C sales
    const bestB2CSupplier = [...b2cSuppliers].sort((a, b) => b.b2c.annualizedROI - a.b2c.annualizedROI)[0];
    const bestB2C = bestB2CSupplier 
      ? { name: bestB2CSupplier.name, roi: bestB2CSupplier.b2c.annualizedROI }
      : null;
    
    // B2B/B2C totals
    const totalB2BSold = suppliers.reduce((sum, s) => sum + s.b2b.sold, 0);
    const totalB2CSold = suppliers.reduce((sum, s) => sum + s.b2c.sold, 0);
    const totalB2BProfit = suppliers.reduce((sum, s) => sum + s.b2b.profit, 0);
    const totalB2CProfit = suppliers.reduce((sum, s) => sum + s.b2c.profit, 0);
    const totalB2BRevenue = suppliers.reduce((sum, s) => sum + s.b2b.revenue, 0);
    const totalB2CRevenue = suppliers.reduce((sum, s) => sum + s.b2c.revenue, 0);
    const avgB2BMargin = totalB2BRevenue > 0 ? (totalB2BProfit / totalB2BRevenue) * 100 : 0;
    const avgB2CMargin = totalB2CRevenue > 0 ? (totalB2CProfit / totalB2CRevenue) * 100 : 0;
    
    return {
      totalSuppliers: suppliers.length,
      totalVehiclesPurchased: suppliers.reduce((sum, s) => sum + s.totalVehicles, 0),
      totalInvestment: suppliers.reduce((sum, s) => sum + s.totalPurchaseValue, 0),
      totalRealized: suppliers.reduce((sum, s) => sum + s.totalSalesValue, 0),
      totalProfit: suppliers.reduce((sum, s) => sum + s.profit, 0),
      avgMargin: this.calculateAvgMargin(suppliers),
      suppliers,
      bySupplier: suppliers.slice(0, 10).map(s => ({ name: s.name, value: s.totalVehicles })),
      profitBySupplier: suppliers.slice(0, 10).map(s => ({ 
        name: s.name, 
        profit: s.profit, 
        margin: s.profitMargin 
      })),
      avgDaysBySupplier: suppliers.slice(0, 10).map(s => ({ 
        name: s.name, 
        days: Math.round(s.avgDaysInStock) 
      })),
      // Charts use reliable suppliers only for meaningful comparisons
      performanceRanking: reliableSuppliers.slice(0, 10).map(s => ({
        name: s.name,
        score: s.performanceScore,
        annualizedROI: s.annualizedROI,
        profitPerDay: s.profitPerDay
      })),
      b2bVsB2cComparison: reliableSuppliers
        .filter(s => s.b2b.sold > 0 || s.b2c.sold > 0)
        .slice(0, 10)
        .map(s => ({
          name: s.name,
          b2bROI: s.b2b.annualizedROI,
          b2cROI: s.b2c.annualizedROI,
          b2bProfit: s.b2b.profit,
          b2cProfit: s.b2c.profit
        })),
      profitPerDayChart: reliableSuppliers.slice(0, 10).map(s => ({
        name: s.name,
        profitPerDay: s.profitPerDay,
        avgDays: Math.round(s.avgDaysToSell)
      })),
      bestPerformer,
      fastestTurnover,
      bestAnnualizedROI,
      highestProfitPerDay,
      bestB2BSupplier: bestB2B,
      bestB2CSupplier: bestB2C,
      totalB2BSold,
      totalB2CSold,
      totalB2BProfit,
      totalB2CProfit,
      avgB2BMargin,
      avgB2CMargin
    };
  }
  
  private getSupplierName(contact: any): string {
    if (!contact) return 'Onbekend';
    if (contact.company_name) return contact.company_name;
    return `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Onbekend';
  }
  
  private initSupplierStats(id: string, name: string): SupplierStatsBuilder {
    const emptyChannelStats: ChannelStats = {
      sold: 0,
      revenue: 0,
      profit: 0,
      margin: 0,
      avgDaysToSell: 0,
      annualizedROI: 0,
      profitPerDay: 0,
      avgPurchasePrice: 0,
      avgSalesPrice: 0,
      avgProfitPerVehicle: 0
    };
    
    return {
      id,
      name,
      totalVehicles: 0,
      sold: 0,
      totalPurchaseValue: 0,
      totalSalesValue: 0,
      profit: 0,
      profitMargin: 0,
      inStock: 0,
      stockValue: 0,
      avgDaysInStock: 0,
      avgDaysToSell: 0,
      fastestSale: null,
      slowestSale: null,
      avgPurchasePrice: 0,
      avgSalesPrice: 0,
      roi: 0,
      totalDaysToSell: 0,
      b2b: { ...emptyChannelStats },
      b2c: { ...emptyChannelStats },
      b2bTotalDays: 0,
      b2cTotalDays: 0,
      b2bTotalPurchaseValue: 0,
      b2cTotalPurchaseValue: 0
    };
  }
  
  private calculateDaysInStock(vehicle: any): number {
    const start = new Date(vehicle.created_at);
    const end = vehicle.sold_date ? new Date(vehicle.sold_date) : new Date();
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  private updateSupplierStats(stats: SupplierStatsBuilder, vehicle: any) {
    const details = vehicle.details as any;
    const purchasePrice = details?.purchasePrice || 0;
    const sellingPrice = vehicle.selling_price || 0;
    const daysInStock = this.calculateDaysInStock(vehicle);
    
    // Determine if sold and which channel
    const isB2B = vehicle.status === 'verkocht_b2b' || 
                  (vehicle.status === 'afgeleverd' && details?.salesType === 'b2b');
    const isB2C = vehicle.status === 'verkocht_b2c' || 
                  (vehicle.status === 'afgeleverd' && details?.salesType === 'b2c') ||
                  (vehicle.status === 'afgeleverd' && !details?.salesType); // Default to B2C if no salesType
    const isSold = isB2B || isB2C;
    
    stats.totalVehicles++;
    stats.totalPurchaseValue += purchasePrice;
    stats.avgDaysInStock = ((stats.avgDaysInStock * (stats.totalVehicles - 1)) + daysInStock) / stats.totalVehicles;
    
    if (isSold) {
      const profit = sellingPrice - purchasePrice;
      
      stats.sold++;
      stats.totalSalesValue += sellingPrice;
      stats.profit += profit;
      stats.totalDaysToSell += daysInStock;
      
      if (stats.fastestSale === null || daysInStock < stats.fastestSale) {
        stats.fastestSale = daysInStock;
      }
      if (stats.slowestSale === null || daysInStock > stats.slowestSale) {
        stats.slowestSale = daysInStock;
      }
      
      // Update channel-specific stats
      if (isB2B) {
        stats.b2b.sold++;
        stats.b2b.revenue += sellingPrice;
        stats.b2b.profit += profit;
        stats.b2bTotalDays += daysInStock;
        stats.b2bTotalPurchaseValue += purchasePrice;
      } else if (isB2C) {
        stats.b2c.sold++;
        stats.b2c.revenue += sellingPrice;
        stats.b2c.profit += profit;
        stats.b2cTotalDays += daysInStock;
        stats.b2cTotalPurchaseValue += purchasePrice;
      }
    } else {
      stats.inStock++;
      stats.stockValue += purchasePrice;
    }
  }
  
  private calculateAvgMargin(suppliers: SupplierStats[]): number {
    if (suppliers.length === 0) return 0;
    const totalMargin = suppliers.reduce((sum, s) => sum + s.profitMargin, 0);
    return totalMargin / suppliers.length;
  }
}

export const supplierReportsService = new SupplierReportsService();
