import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting weekly sales reset...');

    // Get current date and calculate week start (Monday)
    const now = new Date();
    const currentWeekStart = new Date(now);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    currentWeekStart.setDate(diff);
    currentWeekStart.setHours(0, 0, 0, 0);

    // Archive old weekly sales (move to history if needed)
    console.log('Archiving old weekly sales data...');
    
    // Reset weekly sales table for new week
    // Instead of deleting, we could keep historical data and just mark as archived
    const { error: resetError } = await supabase
      .from('weekly_sales')
      .delete()
      .lt('week_start_date', currentWeekStart.toISOString().split('T')[0]);

    if (resetError) {
      console.error('Error resetting weekly sales:', resetError);
      throw resetError;
    }

    // Get all active salespeople and create new weekly records with 0 sales
    const { data: salespeople, error: salespeopleError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('role', 'verkoper');

    if (salespeopleError) {
      console.error('Error fetching salespeople:', salespeopleError);
      throw salespeopleError;
    }

    // Create new weekly sales records for each salesperson
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(currentWeekStart.getDate() + 6);

    const newWeeklyRecords = salespeople?.map(person => ({
      salesperson_id: person.id,
      salesperson_name: `${person.first_name || ''} ${person.last_name || ''}`.trim() || person.email,
      week_start_date: currentWeekStart.toISOString().split('T')[0],
      week_end_date: weekEnd.toISOString().split('T')[0],
      b2b_sales: 0,
      b2c_sales: 0,
      total_sales: 0
    })) || [];

    if (newWeeklyRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('weekly_sales')
        .insert(newWeeklyRecords);

      if (insertError) {
        console.error('Error creating new weekly records:', insertError);
        throw insertError;
      }
    }

    console.log(`Successfully reset weekly sales for ${newWeeklyRecords.length} salespeople`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Weekly sales reset completed',
      resetDate: currentWeekStart.toISOString(),
      salespeopleCount: newWeeklyRecords.length,
      weekStart: currentWeekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0]
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in reset-weekly-sales function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
