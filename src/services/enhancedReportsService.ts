
import { PerformanceData, ReportPeriod } from "@/types/reports";
import { getReportsData } from "./reportsService";
import { ExactOnlineService } from "./exactOnline/ExactOnlineService";
import { ExactOnlineMapper } from "./exactOnline/ExactOnlineMapper";
import { supabase } from "@/integrations/supabase/client";

export class EnhancedReportsService {
  private exactOnlineService: ExactOnlineService;
  private exactOnlineMapper: ExactOnlineMapper;
  private fallbackEnabled = true; // Enable during development

  constructor() {
    this.exactOnlineService = new ExactOnlineService();
    this.exactOnlineMapper = new ExactOnlineMapper();
  }

  /**
   * Get enhanced reports data with Exact Online integration
   */
  async getReportsData(period: ReportPeriod): Promise<PerformanceData> {
    try {
      // Check if user has Exact Online integration
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('No authenticated user, using mock data');
        return getReportsData(period);
      }

      // Test connection first
      const connectionTest = await this.exactOnlineService.testConnection(user.id);
      if (!connectionTest.isConnected) {
        console.warn('Exact Online not connected, using mock data');
        return getReportsData(period);
      }

      console.log('✅ Exact Online connected, fetching live data...');
      
      // Convert period to date filter
      const dateFilter = {
        startDate: period.startDate,
        endDate: period.endDate
      };

      // Fetch data from Exact Online
      const [salesInvoices, purchaseInvoices, payments] = await Promise.all([
        this.exactOnlineService.getSalesInvoices(user.id, dateFilter),
        this.exactOnlineService.getPurchaseInvoices(user.id, dateFilter),
        this.exactOnlineService.getPayments(user.id, dateFilter)
      ]);

      console.log(`📊 Exact Online data fetched:`, {
        salesInvoices: salesInvoices.length,
        purchaseInvoices: purchaseInvoices.length,
        payments: payments.length
      });

      // Map Exact Online data to our existing interface
      const mappedData = this.exactOnlineMapper.mapToPerformanceData(
        salesInvoices,
        purchaseInvoices,
        payments,
        period
      );

      // Merge with mock data for fields not yet implemented
      const mockData = getReportsData(period);
      
      return {
        ...mockData,
        ...mappedData,
        // Add metadata to indicate live data
        _metadata: {
          dataSource: 'exact_online',
          lastUpdated: new Date().toISOString(),
          recordCounts: {
            salesInvoices: salesInvoices.length,
            purchaseInvoices: purchaseInvoices.length,
            payments: payments.length
          }
        }
      } as PerformanceData;

    } catch (error) {
      console.error('Error fetching Exact Online data:', error);
      
      if (this.fallbackEnabled) {
        console.warn('🔄 Falling back to mock data due to error');
        return getReportsData(period);
      }
      
      throw error;
    }
  }

  /**
   * Check if Exact Online integration is available
   */
  async isExactOnlineAvailable(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const connectionTest = await this.exactOnlineService.testConnection(user.id);
      return connectionTest.isConnected;
    } catch {
      return false;
    }
  }

  /**
   * Get connection status and details
   */
  async getConnectionStatus(): Promise<{
    isConnected: boolean;
    companyName?: string;
    divisionCode?: string;
    lastTested?: string;
    error?: string;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { isConnected: false, error: 'No authenticated user' };
      }

      const connectionTest = await this.exactOnlineService.testConnection(user.id);
      return connectionTest;
    } catch (error) {
      return { 
        isConnected: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Initiate Exact Online OAuth authentication
   */
  async initiateAuthentication(): Promise<{ authUrl: string; state: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const response = await supabase.functions.invoke('exact-online-auth', {
        body: { 
          action: 'initiate',
          userId: user.id 
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    } catch (error) {
      console.error('Failed to initiate authentication:', error);
      throw error;
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleAuthCallback(code: string, state: string): Promise<boolean> {
    try {
      const response = await supabase.functions.invoke('exact-online-auth', {
        body: { 
          action: 'callback',
          code,
          state 
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data.success;
    } catch (error) {
      console.error('Failed to handle auth callback:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Exact Online
   */
  async disconnect(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Remove tokens from database
      await supabase
        .from('exact_online_tokens' as any)
        .delete()
        .eq('user_id', user.id);

      console.log('✅ Disconnected from Exact Online');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      throw error;
    }
  }

  /**
   * Enable or disable fallback to mock data
   */
  setFallbackEnabled(enabled: boolean): void {
    this.fallbackEnabled = enabled;
    console.log(`Fallback to mock data: ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Export singleton instance
export const enhancedReportsService = new EnhancedReportsService();
