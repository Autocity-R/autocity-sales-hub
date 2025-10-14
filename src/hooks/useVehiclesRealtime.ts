import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Real-time subscription hook for vehicles table
 * Automatically invalidates all vehicle-related queries when changes occur
 * Ensures all users see updates immediately without manual refresh
 */
export const useVehiclesRealtime = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    console.log('[REALTIME] Setting up vehicles realtime subscription');

    const channel = supabase
      .channel('vehicles-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'vehicles',
        },
        (payload) => {
          console.log('[REALTIME] Vehicle change detected:', payload.eventType, payload.new || payload.old);
          
          // Invalidate ALL vehicle-related queries to ensure UI stays in sync
          queryClient.invalidateQueries({ queryKey: ['vehicles'] });
          queryClient.invalidateQueries({ queryKey: ['transport-vehicles'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
      )
      .subscribe((status) => {
        console.log('[REALTIME] Vehicles subscription status:', status);
      });

    return () => {
      console.log('[REALTIME] Cleaning up vehicles subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient, user]);
};
