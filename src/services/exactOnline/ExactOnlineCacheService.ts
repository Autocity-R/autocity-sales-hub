
import { supabase } from "@/integrations/supabase/client";
import { ExactOnlineCacheEntry } from "@/types/exactOnline";

export class ExactOnlineCacheService {
  private readonly defaultTtlMinutes = 15;

  /**
   * Get cached data by key
   */
  async get<T>(cacheKey: string): Promise<T | null> {
    try {
      const { data, error } = await supabase
        .from('exact_online_cache' as any)
        .select('*')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return null;
      }

      console.log(`Cache hit for key: ${cacheKey}`);
      return data.data as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  async set<T>(
    cacheKey: string, 
    data: T, 
    entityType: string, 
    ttlMinutes: number = this.defaultTtlMinutes,
    divisionCode?: string
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
      
      // Upsert cache entry
      const { error } = await supabase
        .from('exact_online_cache' as any)
        .upsert({
          cache_key: cacheKey,
          data: data as any,
          expires_at: expiresAt,
          entity_type: entityType,
          division_code: divisionCode
        }, {
          onConflict: 'cache_key'
        });

      if (error) {
        console.error('Cache set error:', error);
        return;
      }

      console.log(`Cache set for key: ${cacheKey}, TTL: ${ttlMinutes} minutes`);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete specific cache entry
   */
  async delete(cacheKey: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('exact_online_cache' as any)
        .delete()
        .eq('cache_key', cacheKey);

      if (error) {
        console.error('Cache delete error:', error);
        return;
      }

      console.log(`Cache deleted for key: ${cacheKey}`);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Clear cache by entity type
   */
  async clearByEntityType(entityType: string, divisionCode?: string): Promise<void> {
    try {
      let query = supabase
        .from('exact_online_cache' as any)
        .delete()
        .eq('entity_type', entityType);

      if (divisionCode) {
        query = query.eq('division_code', divisionCode);
      }

      const { error } = await query;

      if (error) {
        console.error('Cache clear by entity type error:', error);
        return;
      }

      console.log(`Cache cleared for entity type: ${entityType}${divisionCode ? `, division: ${divisionCode}` : ''}`);
    } catch (error) {
      console.error('Cache clear by entity type error:', error);
    }
  }

  /**
   * Clear all expired cache entries
   */
  async clearExpired(): Promise<number> {
    try {
      const { error, count } = await supabase
        .from('exact_online_cache' as any)
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Cache clear expired error:', error);
        return 0;
      }

      const deletedCount = count || 0;
      console.log(`Cleared ${deletedCount} expired cache entries`);
      return deletedCount;
    } catch (error) {
      console.error('Cache clear expired error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    entitiesByType: Record<string, number>;
  }> {
    try {
      // Get total entries
      const { count: totalEntries } = await supabase
        .from('exact_online_cache' as any)
        .select('*', { count: 'exact', head: true });

      // Get expired entries
      const { count: expiredEntries } = await supabase
        .from('exact_online_cache' as any)
        .select('*', { count: 'exact', head: true })
        .lt('expires_at', new Date().toISOString());

      // Get entries by type
      const { data: entitiesData } = await supabase
        .from('exact_online_cache' as any)
        .select('entity_type')
        .gt('expires_at', new Date().toISOString());

      const entitiesByType: Record<string, number> = {};
      entitiesData?.forEach(entry => {
        entitiesByType[entry.entity_type] = (entitiesByType[entry.entity_type] || 0) + 1;
      });

      return {
        totalEntries: totalEntries || 0,
        expiredEntries: expiredEntries || 0,
        entitiesByType
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        totalEntries: 0,
        expiredEntries: 0,
        entitiesByType: {}
      };
    }
  }

  /**
   * Warm up cache with common queries
   */
  async warmUp(userId: string, divisionCode: string): Promise<void> {
    console.log('Starting cache warm-up...');
    
    // This method can be used to pre-populate cache with commonly accessed data
    // Implementation depends on specific business needs
    
    // Example: Pre-fetch current month data
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    const dateFilter = {
      startDate: startOfMonth.toISOString(),
      endDate: endOfMonth.toISOString()
    };

    // Pre-populate cache keys that are likely to be requested
    const commonCacheKeys = [
      `sales_invoices_${userId}_${dateFilter.startDate}_${dateFilter.endDate}`,
      `purchase_invoices_${userId}_${dateFilter.startDate}_${dateFilter.endDate}`,
      `payments_${userId}_${dateFilter.startDate}_${dateFilter.endDate}`
    ];

    console.log(`Cache warm-up prepared ${commonCacheKeys.length} keys for pre-loading`);
  }
}
