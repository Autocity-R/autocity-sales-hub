import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';

interface UseAutoCalendarSyncOptions {
  enabled?: boolean;
  onImportComplete?: (imported: number) => void;
  autoImportInterval?: number; // minutes
}

export const useAutoCalendarSync = ({
  enabled = true,
  onImportComplete,
  autoImportInterval = 30 // 30 minutes default
}: UseAutoCalendarSyncOptions = {}) => {
  const { toast } = useToast();
  const lastImportTime = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout>();
  const debouncedEnabled = useDebounce(enabled, 1000);

  const performImport = useCallback(async () => {
    if (!enabled) return;
    
    const now = Date.now();
    const minInterval = autoImportInterval * 60 * 1000; // Convert to milliseconds
    
    // Prevent too frequent imports
    if (now - lastImportTime.current < minInterval) {
      console.log('Skipping import - too soon since last import');
      return;
    }

    try {
      console.log('Starting automatic Google Calendar import...');
      
      const { data: importResult, error } = await supabase.functions.invoke('google-calendar-import', {
        body: { triggered_by: 'auto_sync' }
      });

      if (error) {
        console.error('Auto import error:', error);
        return;
      }

      lastImportTime.current = now;

      if (importResult?.success && importResult.imported > 0) {
        console.log(`Auto-imported ${importResult.imported} appointments`);
        onImportComplete?.(importResult.imported);
        
        toast({
          title: "Agenda bijgewerkt",
          description: `${importResult.imported} nieuwe afspraken geïmporteerd`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Auto import failed:', error);
    }
  }, [enabled, autoImportInterval, onImportComplete, toast]);

  // Initial import on component mount
  useEffect(() => {
    if (debouncedEnabled) {
      const timer = setTimeout(() => {
        performImport();
      }, 2000); // Wait 2 seconds after mount
      
      return () => clearTimeout(timer);
    }
  }, [debouncedEnabled, performImport]);

  // Set up periodic import
  useEffect(() => {
    if (debouncedEnabled) {
      intervalRef.current = setInterval(() => {
        performImport();
      }, autoImportInterval * 60 * 1000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [debouncedEnabled, autoImportInterval, performImport]);

  // Manual trigger function
  const triggerImport = useCallback(async () => {
    lastImportTime.current = 0; // Reset to allow immediate import
    await performImport();
  }, [performImport]);

  return {
    triggerImport,
    isEnabled: debouncedEnabled
  };
};