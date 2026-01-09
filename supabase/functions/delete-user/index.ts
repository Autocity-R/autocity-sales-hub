import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the authorization header to verify the requesting user is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract bearer token from Authorization header
    const token = authHeader.replace('Bearer ', '').trim();

    // Verify the requesting user using service role
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY FIX: Check if user has admin role using user_roles table
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .single();

    if (roleError || !userRole || (userRole.role !== 'admin' && userRole.role !== 'owner')) {
      console.error('Role check failed:', roleError);
      return new Response(
        JSON.stringify({ success: false, error: 'Access denied. Admin rights required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId } = await req.json();

    // Validate input
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-deletion
    if (userId === userData.user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Je kunt jezelf niet verwijderen' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user details before deletion for logging
    const { data: userToDelete } = await supabaseAdmin
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (!userToDelete) {
      return new Response(
        JSON.stringify({ success: false, error: 'Gebruiker niet gevonden' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY FIX: Check user's role from user_roles table
    const { data: userToDeleteRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    // Prevent deletion of owner accounts by non-owners
    if (userToDeleteRole?.role === 'owner' && userRole.role !== 'owner') {
      return new Response(
        JSON.stringify({ success: false, error: 'Alleen eigenaren kunnen andere eigenaren verwijderen' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === CLEANUP: Set references to NULL or DELETE related records ===
    console.log(`Starting cleanup for user ${userId}...`);

    // 1. Vehicle files - keep files but remove uploader reference
    const { error: vehicleFilesError } = await supabaseAdmin
      .from('vehicle_files')
      .update({ uploaded_by: null })
      .eq('uploaded_by', userId);
    if (vehicleFilesError) console.log('vehicle_files cleanup:', vehicleFilesError.message);

    // 2. Audit logs - keep history but remove user reference
    const { error: priceAuditError } = await supabaseAdmin
      .from('vehicle_price_audit_log')
      .update({ changed_by: null })
      .eq('changed_by', userId);
    if (priceAuditError) console.log('vehicle_price_audit_log cleanup:', priceAuditError.message);

    const { error: statusAuditError } = await supabaseAdmin
      .from('vehicle_status_audit_log')
      .update({ changed_by: null })
      .eq('changed_by', userId);
    if (statusAuditError) console.log('vehicle_status_audit_log cleanup:', statusAuditError.message);

    // 3. AI agents - keep agents but remove creator reference
    const { error: aiAgentsError } = await supabaseAdmin
      .from('ai_agents')
      .update({ created_by: null })
      .eq('created_by', userId);
    if (aiAgentsError) console.log('ai_agents cleanup:', aiAgentsError.message);

    // 4. Calendar sync logs - keep logs
    const { error: calendarSyncError } = await supabaseAdmin
      .from('calendar_sync_logs')
      .update({ performed_by_user_id: null })
      .eq('performed_by_user_id', userId);
    if (calendarSyncError) console.log('calendar_sync_logs cleanup:', calendarSyncError.message);

    // 5. Sales targets - keep targets but remove user references
    const { error: salesTargetsError } = await supabaseAdmin
      .from('sales_targets')
      .update({ salesperson_id: null })
      .eq('salesperson_id', userId);
    if (salesTargetsError) console.log('sales_targets salesperson cleanup:', salesTargetsError.message);

    const { error: salesTargetsCreatedError } = await supabaseAdmin
      .from('sales_targets')
      .update({ created_by: null })
      .eq('created_by', userId);
    if (salesTargetsCreatedError) console.log('sales_targets created_by cleanup:', salesTargetsCreatedError.message);

    // 6. Email logs - keep logs
    const { error: emailLogsError } = await supabaseAdmin
      .from('email_logs')
      .update({ sent_by_user_id: null })
      .eq('sent_by_user_id', userId);
    if (emailLogsError) console.log('email_logs cleanup:', emailLogsError.message);

    const { error: emailSentLogError } = await supabaseAdmin
      .from('email_sent_log')
      .update({ sent_by: null })
      .eq('sent_by', userId);
    if (emailSentLogError) console.log('email_sent_log cleanup:', emailSentLogError.message);

    // 7. Taxatie records - keep records
    const { error: taxatieValError } = await supabaseAdmin
      .from('taxatie_valuations')
      .update({ created_by: null })
      .eq('created_by', userId);
    if (taxatieValError) console.log('taxatie_valuations cleanup:', taxatieValError.message);

    const { error: taxatieFeedbackError } = await supabaseAdmin
      .from('taxatie_feedback')
      .update({ created_by: null })
      .eq('created_by', userId);
    if (taxatieFeedbackError) console.log('taxatie_feedback cleanup:', taxatieFeedbackError.message);

    // 8. DELETE user-specific records (sessions, settings)
    const { error: aiChatSessionsError } = await supabaseAdmin
      .from('ai_chat_sessions')
      .delete()
      .eq('user_id', userId);
    if (aiChatSessionsError) console.log('ai_chat_sessions cleanup:', aiChatSessionsError.message);

    const { error: aiChatLogsError } = await supabaseAdmin
      .from('ai_agent_chat_logs')
      .delete()
      .eq('user_id', userId);
    if (aiChatLogsError) console.log('ai_agent_chat_logs cleanup:', aiChatLogsError.message);

    const { error: userCalendarError } = await supabaseAdmin
      .from('user_calendar_settings')
      .delete()
      .eq('user_id', userId);
    if (userCalendarError) console.log('user_calendar_settings cleanup:', userCalendarError.message);

    const { error: exactTokensError } = await supabaseAdmin
      .from('exact_online_tokens')
      .delete()
      .eq('user_id', userId);
    if (exactTokensError) console.log('exact_online_tokens cleanup:', exactTokensError.message);

    // 9. User roles - DELETE
    const { error: userRolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    if (userRolesError) console.log('user_roles cleanup:', userRolesError.message);

    console.log(`Cleanup completed for user ${userId}. Now deleting from auth...`);

    // Delete user from Auth (this will cascade to delete profile due to foreign key)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return new Response(
        JSON.stringify({ success: false, error: 'Fout bij verwijderen van gebruiker' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User deleted by ${userData.user.email}: ${userToDelete.email} (${userToDelete.first_name} ${userToDelete.last_name})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Gebruiker ${userToDelete.first_name} ${userToDelete.last_name} is succesvol verwijderd` 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-user function:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});