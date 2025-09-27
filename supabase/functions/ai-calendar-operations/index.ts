
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Use service role for AI operations
    );

    const { 
      action, 
      agentId, 
      appointmentData, 
      userId, 
      conflictResolution = 'reject' 
    } = await req.json();

    // Get AI agent settings
    const { data: agentSettings, error: agentError } = await supabase
      .from('ai_agent_calendar_settings')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (agentError || !agentSettings) {
      throw new Error(`AI agent ${agentId} not found or not configured for calendar access`);
    }

    // Get user's calendar settings
    const { data: userCalendarSettings, error: userError } = await supabase
      .from('user_calendar_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (userError || !userCalendarSettings) {
      throw new Error('User calendar not connected. Please connect Google Calendar first.');
    }

    switch (action) {
      case 'create_appointment': {
        if (!agentSettings.can_create_appointments) {
          throw new Error(`AI agent ${agentId} does not have permission to create appointments`);
        }

        // Check for scheduling conflicts
        const startTime = new Date(appointmentData.startTime);
        const endTime = new Date(appointmentData.endTime);

        const { data: conflicts } = await supabase
          .from('appointments')
          .select('id, title, startTime, endTime')
          .gte('startTime', startTime.toISOString())
          .lte('endTime', endTime.toISOString())
          .neq('status', 'geannuleerd');

        if (conflicts && conflicts.length > 0) {
          if (conflictResolution === 'reject') {
            return new Response(JSON.stringify({
              success: false,
              error: 'scheduling_conflict',
              conflicts: conflicts,
              message: `Er is een conflict met ${conflicts.length} bestaande afspraak(en)`
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // Create appointment in CRM
        const { data: appointment, error: createError } = await supabase
          .from('appointments')
          .insert({
            ...appointmentData,
            created_by_ai: true,
            ai_agent_id: agentId,
            createdBy: `AI Agent: ${agentSettings.agent_name}`,
            sync_status: 'pending',
          })
          .select()
          .single();

        if (createError) throw createError;

        // Sync to Google Calendar if user has it connected
        if (userCalendarSettings.sync_enabled && userCalendarSettings.google_access_token) {
          try {
            const syncResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/calendar-sync`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${userCalendarSettings.google_access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                action: 'sync_to_google',
                appointmentId: appointment.id,
              }),
            });

            if (syncResponse.ok) {
              const syncResult = await syncResponse.json();
              console.log('Google Calendar sync successful:', syncResult);
            }
          } catch (syncError) {
            console.error('Failed to sync to Google Calendar:', syncError);
            // Don't fail the appointment creation if sync fails
          }
        }

        // Log the AI action
        await supabase
          .from('calendar_sync_logs')
          .insert({
            appointment_id: appointment.id,
            sync_direction: 'ai_to_crm',
            sync_action: 'create',
            sync_status: 'success',
            performed_by_ai_agent: agentId,
            sync_data: { 
              appointmentData, 
              conflicts: conflicts || [],
              conflictResolution 
            },
          });

        return new Response(JSON.stringify({
          success: true,
          appointment,
          conflicts: conflicts || [],
          message: `Afspraak succesvol aangemaakt door ${agentSettings.agent_name}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'suggest_times': {
        const { date, duration = 60, preferredTimes = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'] } = appointmentData;
        
        const targetDate = new Date(date);
        const suggestions = [];

        for (const timeSlot of preferredTimes) {
          const [hours, minutes] = timeSlot.split(':').map(Number);
          const startTime = new Date(targetDate);
          startTime.setHours(hours, minutes, 0, 0);
          
          const endTime = new Date(startTime);
          endTime.setMinutes(endTime.getMinutes() + duration);

          // Check for conflicts
          const { data: conflicts } = await supabase
            .from('appointments')
            .select('id')
            .gte('startTime', startTime.toISOString())
            .lt('startTime', endTime.toISOString())
            .neq('status', 'geannuleerd');

          if (!conflicts || conflicts.length === 0) {
            suggestions.push({
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              available: true,
            });
          }
        }

        return new Response(JSON.stringify({
          success: true,
          suggestions,
          date: targetDate.toISOString(),
          duration,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'check_availability': {
        const { startTime, endTime } = appointmentData;
        
        const { data: conflicts } = await supabase
          .from('appointments')
          .select('id, title, startTime, endTime, customerName')
          .or(`and(startTime.lte.${startTime},endTime.gt.${startTime}),and(startTime.lt.${endTime},endTime.gte.${endTime}),and(startTime.gte.${startTime},endTime.lte.${endTime})`)
          .neq('status', 'geannuleerd');

        const available = !conflicts || conflicts.length === 0;

        return new Response(JSON.stringify({
          success: true,
          available,
          conflicts: conflicts || [],
          timeSlot: { startTime, endTime },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('AI Calendar operations error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
