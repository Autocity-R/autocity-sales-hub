import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useTasksRealtime = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Set up real-time subscription for tasks
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        async (payload) => {
          console.log('Task change received:', payload);
          
          // Show notification for newly assigned tasks
          if (payload.eventType === 'INSERT' && payload.new) {
            const newTask = payload.new as any;
            
            // Check if task is assigned to current user
            if (newTask.assigned_to === user.id) {
              // Fetch assignee name
              const { data: profile } = await supabase
                .from('profiles')
                .select('first_name, last_name')
                .eq('id', newTask.assigned_by)
                .single();
              
              const assignerName = profile 
                ? `${profile.first_name} ${profile.last_name}`.trim() 
                : 'Een collega';
              
              toast.success('Nieuwe taak toegewezen!', {
                description: `${assignerName} heeft je een nieuwe taak toegewezen: "${newTask.title}"`,
                duration: 5000,
              });
            }
          }
          
          // Invalidate tasks queries to refetch data
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user]);
};