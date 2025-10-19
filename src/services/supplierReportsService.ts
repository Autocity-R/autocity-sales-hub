import { supabase } from "@/integrations/supabase/client";
import { ReportPeriod } from "@/types/reports";

export interface SupplierStats {
  id: string;
  name: string;
  country?: string;
  totalVehicles: number;
  
  // Verkocht statistieken
  sold: number;
  totalPurchaseValue: number;
  totalSalesValue: number;
  profit: number;
  profitMargin: number;
  
  // Voorraad statistieken
  inStock: number;
  stockValue: number;
  
  // Tijd statistieken
  avgDaysInStock: number;
  avgDaysToSell: number;
  fastestSale: number | null;
  slowestSale: number | null;
  
  // Performance metrics
  avgPurchasePrice: number;
  avgSalesPrice: number;
  roi: number;
}

export interface SupplierAnalyticsData {
  totalSuppliers: number;
  totalVehiclesPurchased: number;
  totalInvestment: number;
  totalRealized: number;
  totalProfit: number;
  avgMargin: number;
  
  suppliers: SupplierStats[];
  
  // Chart data
  bySupplier: Array<{ name: string; value: number }>;
  profitBySupplier: Array<{ name: string; profit: number; margin: number }>;
  avgDaysBySupplier: Array<{ name: string; days: number }>;
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

    const supplierMap = new Map<string, SupplierStats>();
    
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
    
    const suppliers = Array.from(supplierMap.values()).map(s => {
      const avgDaysToSell = s.sold > 0 ? s.avgDaysToSell / s.sold : 0;
      return {
        ...s,
        avgPurchasePrice: s.totalVehicles > 0 ? s.totalPurchaseValue / s.totalVehicles : 0,
        avgSalesPrice: s.sold > 0 ? s.totalSalesValue / s.sold : 0,
        profitMargin: s.totalSalesValue > 0 ? (s.profit / s.totalSalesValue) * 100 : 0,
        avgDaysToSell,
        roi: s.totalPurchaseValue > 0 ? (s.profit / s.totalPurchaseValue) * 100 : 0
      };
    });
    
    suppliers.sort((a, b) => b.totalVehicles - a.totalVehicles);
    
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
      }))
    };
  }
  
  private getSupplierName(contact: any): string {
    if (!contact) return 'Onbekend';
    if (contact.company_name) return contact.company_name;
    return `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Onbekend';
  }
  
  private initSupplierStats(id: string, name: string): SupplierStats {
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
      roi: 0
    };
  }
  
  private calculateDaysInStock(vehicle: any): number {
    const start = new Date(vehicle.created_at);
    const end = vehicle.sold_date ? new Date(vehicle.sold_date) : new Date();
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  private updateSupplierStats(stats: SupplierStats, vehicle: any) {
    const purchasePrice = vehicle.details?.purchasePrice || 0;
    const isSold = ['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(vehicle.status);
    const daysInStock = this.calculateDaysInStock(vehicle);
    
    stats.totalVehicles++;
    stats.totalPurchaseValue += purchasePrice;
    stats.avgDaysInStock = ((stats.avgDaysInStock * (stats.totalVehicles - 1)) + daysInStock) / stats.totalVehicles;
    
    if (isSold) {
      stats.sold++;
      stats.totalSalesValue += vehicle.selling_price || 0;
      stats.profit += (vehicle.selling_price || 0) - purchasePrice;
      stats.avgDaysToSell += daysInStock;
      
      if (stats.fastestSale === null || daysInStock < stats.fastestSale) {
        stats.fastestSale = daysInStock;
      }
      if (stats.slowestSale === null || daysInStock > stats.slowestSale) {
        stats.slowestSale = daysInStock;
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
