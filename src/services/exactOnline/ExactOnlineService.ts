
import { supabase } from "@/integrations/supabase/client";
import { 
  ExactOnlineTokenData, 
  ExactOnlineSalesInvoice, 
  ExactOnlinePurchaseInvoice,
  ExactOnlinePayment,
  ExactOnlineApiResponse,
  ExactOnlineDateFilter,
  ExactOnlineQuery,
  ExactOnlineConnectionTest,
  ExactOnlineDivision
} from "@/types/exactOnline";
import { ExactOnlineAuthService } from "./ExactOnlineAuthService";
import { ExactOnlineCacheService } from "./ExactOnlineCacheService";

export class ExactOnlineService {
  private baseURL = 'https://start.exactonline.nl/api/v1';
  private authService: ExactOnlineAuthService;
  private cacheService: ExactOnlineCacheService;
  private readonly timeout = 30000; // 30 seconds
  private readonly rateLimitDelay = 100; // 100ms between requests

  constructor() {
    this.authService = new ExactOnlineAuthService();
    this.cacheService = new ExactOnlineCacheService();
  }

  /**
   * Test connection to Exact Online API
   */
  async testConnection(userId: string): Promise<ExactOnlineConnectionTest> {
    const startTime = Date.now();
    
    try {
      const tokenData = await this.getValidToken(userId);
      if (!tokenData) {
        return {
          isConnected: false,
          error: 'No valid authentication token found',
          lastTested: new Date().toISOString()
        };
      }

      // Test API connection by fetching divisions
      const divisions = await this.fetchDivisions(tokenData);
      const responseTime = Date.now() - startTime;

      if (divisions && divisions.length > 0) {
        const primaryDivision = divisions.find(d => d.Main) || divisions[0];
        
        return {
          isConnected: true,
          divisionCode: primaryDivision.Code.toString(),
          companyName: primaryDivision.Description,
          apiVersion: 'v1',
          responseTime,
          lastTested: new Date().toISOString()
        };
      }

      return {
        isConnected: false,
        error: 'No divisions found',
        responseTime,
        lastTested: new Date().toISOString()
      };

    } catch (error) {
      console.error('Exact Online connection test failed:', error);
      return {
        isConnected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        lastTested: new Date().toISOString()
      };
    }
  }

  /**
   * Get sales invoices with date filtering
   */
  async getSalesInvoices(
    userId: string, 
    filter: ExactOnlineDateFilter
  ): Promise<ExactOnlineSalesInvoice[]> {
    const cacheKey = `sales_invoices_${userId}_${filter.startDate}_${filter.endDate}`;
    
    // Try cache first
    const cached = await this.cacheService.get<ExactOnlineSalesInvoice[]>(cacheKey);
    if (cached) {
      console.log('Returning cached sales invoices');
      return cached;
    }

    try {
      const tokenData = await this.getValidToken(userId);
      if (!tokenData) {
        throw new Error('No valid authentication token');
      }

      const query: ExactOnlineQuery = {
        filter: `InvoiceDate ge datetime'${filter.startDate}' and InvoiceDate le datetime'${filter.endDate}'`,
        orderby: 'InvoiceDate desc',
        top: 1000
      };

      const url = this.buildApiUrl(tokenData.divisionCode!, 'salesinvoice/SalesInvoices', query);
      const response = await this.makeApiRequest<ExactOnlineSalesInvoice>(url, tokenData.accessToken);
      
      const invoices = response.d.results;
      
      // Cache the results
      await this.cacheService.set(cacheKey, invoices, 'sales_invoices', 15); // 15 minute cache
      
      return invoices;
    } catch (error) {
      console.error('Failed to fetch sales invoices:', error);
      throw error;
    }
  }

  /**
   * Get purchase invoices with date filtering
   */
  async getPurchaseInvoices(
    userId: string, 
    filter: ExactOnlineDateFilter
  ): Promise<ExactOnlinePurchaseInvoice[]> {
    const cacheKey = `purchase_invoices_${userId}_${filter.startDate}_${filter.endDate}`;
    
    // Try cache first
    const cached = await this.cacheService.get<ExactOnlinePurchaseInvoice[]>(cacheKey);
    if (cached) {
      console.log('Returning cached purchase invoices');
      return cached;
    }

    try {
      const tokenData = await this.getValidToken(userId);
      if (!tokenData) {
        throw new Error('No valid authentication token');
      }

      const query: ExactOnlineQuery = {
        filter: `InvoiceDate ge datetime'${filter.startDate}' and InvoiceDate le datetime'${filter.endDate}'`,
        orderby: 'InvoiceDate desc',
        top: 1000
      };

      const url = this.buildApiUrl(tokenData.divisionCode!, 'purchaseentry/PurchaseInvoices', query);
      const response = await this.makeApiRequest<ExactOnlinePurchaseInvoice>(url, tokenData.accessToken);
      
      const invoices = response.d.results;
      
      // Cache the results
      await this.cacheService.set(cacheKey, invoices, 'purchase_invoices', 15);
      
      return invoices;
    } catch (error) {
      console.error('Failed to fetch purchase invoices:', error);
      throw error;
    }
  }

  /**
   * Get payments with date filtering
   */
  async getPayments(
    userId: string, 
    filter: ExactOnlineDateFilter
  ): Promise<ExactOnlinePayment[]> {
    const cacheKey = `payments_${userId}_${filter.startDate}_${filter.endDate}`;
    
    // Try cache first
    const cached = await this.cacheService.get<ExactOnlinePayment[]>(cacheKey);
    if (cached) {
      console.log('Returning cached payments');
      return cached;
    }

    try {
      const tokenData = await this.getValidToken(userId);
      if (!tokenData) {
        throw new Error('No valid authentication token');
      }

      const query: ExactOnlineQuery = {
        filter: `PaymentDate ge datetime'${filter.startDate}' and PaymentDate le datetime'${filter.endDate}'`,
        orderby: 'PaymentDate desc',
        top: 1000
      };

      const url = this.buildApiUrl(tokenData.divisionCode!, 'cashflow/Payments', query);
      const response = await this.makeApiRequest<ExactOnlinePayment>(url, tokenData.accessToken);
      
      const payments = response.d.results;
      
      // Cache the results
      await this.cacheService.set(cacheKey, payments, 'payments', 15);
      
      return payments;
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      throw error;
    }
  }

  /**
   * Get user's valid token (refresh if needed)
   */
  private async getValidToken(userId: string): Promise<ExactOnlineTokenData | null> {
    try {
      const { data, error } = await supabase
        .from('exact_online_tokens' as any)
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        console.warn('No token found for user:', userId);
        return null;
      }

      const tokenData: ExactOnlineTokenData = {
        id: data.id,
        userId: data.user_id,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_at,
        divisionCode: data.division_code,
        companyName: data.company_name,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      // Check if token needs refresh (5 minutes before expiry)
      const expiryTime = new Date(tokenData.expiresAt).getTime();
      const currentTime = Date.now();
      const fiveMinutesInMs = 5 * 60 * 1000;

      if (expiryTime - currentTime < fiveMinutesInMs) {
        console.log('Token needs refresh, refreshing...');
        return await this.authService.refreshToken(tokenData);
      }

      return tokenData;
    } catch (error) {
      console.error('Error getting valid token:', error);
      return null;
    }
  }

  /**
   * Fetch divisions from Exact Online
   */
  private async fetchDivisions(tokenData: ExactOnlineTokenData): Promise<ExactOnlineDivision[]> {
    const url = `${this.baseURL}/current/Me?$select=CurrentDivision`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${tokenData.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // If we have current division info, fetch all divisions
      if (data.d && data.d.results && data.d.results.length > 0) {
        const divisionsUrl = `${this.baseURL}/current/system/Divisions`;
        const divisionsResponse = await fetch(divisionsUrl, {
          headers: {
            'Authorization': `Bearer ${tokenData.accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(this.timeout)
        });

        if (divisionsResponse.ok) {
          const divisionsData = await divisionsResponse.json();
          return divisionsData.d.results;
        }
      }

      return [];
    } catch (error) {
      console.error('Error fetching divisions:', error);
      throw error;
    }
  }

  /**
   * Build API URL with query parameters
   */
  private buildApiUrl(divisionCode: string, endpoint: string, query?: ExactOnlineQuery): string {
    let url = `${this.baseURL}/${divisionCode}/${endpoint}`;
    
    if (query) {
      const params = new URLSearchParams();
      
      if (query.select) {
        params.append('$select', query.select.join(','));
      }
      
      if (query.filter) {
        params.append('$filter', query.filter);
      }
      
      if (query.orderby) {
        params.append('$orderby', query.orderby);
      }
      
      if (query.top) {
        params.append('$top', query.top.toString());
      }
      
      if (query.skip) {
        params.append('$skip', query.skip.toString());
      }
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    
    return url;
  }

  /**
   * Make authenticated API request with retry logic
   */
  private async makeApiRequest<T>(url: string, accessToken: string): Promise<ExactOnlineApiResponse<T>> {
    const maxRetries = 3;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Rate limiting delay
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay * attempt));
        }

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(this.timeout)
        });

        if (!response.ok) {
          if (response.status === 429) {
            // Rate limited, wait longer
            const retryAfter = response.headers.get('Retry-After');
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000 * attempt;
            console.warn(`Rate limited, waiting ${waitTime}ms before retry ${attempt}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;

      } catch (error) {
        console.error(`API request attempt ${attempt} failed:`, error);
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxRetries) {
          break;
        }
      }
    }

    throw lastError!;
  }
}
