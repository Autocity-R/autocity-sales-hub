
import { supabase } from "@/integrations/supabase/client";

export interface CompanyCalendarSettings {
  id: string;
  company_id: string;
  google_access_token?: string;
  google_refresh_token?: string;
  google_token_expires_at?: string;
  google_calendar_id?: string;
  calendar_name?: string;
  calendar_email?: string;
  sync_enabled: boolean;
  auto_sync: boolean;
  sync_direction: string;
  conflict_resolution: string;
  managed_by_user_id?: string;
  created_at: string;
  updated_at: string;
}

export const getCompanyCalendarSettings = async (): Promise<CompanyCalendarSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('company_calendar_settings')
      .select('*')
      .eq('company_id', 'auto-city')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching company calendar settings:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch company calendar settings:", error);
    throw error;
  }
};

export const updateCompanyCalendarSettings = async (
  updates: Partial<CompanyCalendarSettings>
): Promise<CompanyCalendarSettings> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('company_calendar_settings')
      .upsert({
        company_id: 'auto-city',
        managed_by_user_id: user.id,
        ...updates
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating company calendar settings:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Failed to update company calendar settings:", error);
    throw error;
  }
};

export const deleteCompanyCalendarSettings = async (): Promise<void> => {
  try {
    const { error } = await supabase
      .from('company_calendar_settings')
      .delete()
      .eq('company_id', 'auto-city');

    if (error) {
      console.error('Error deleting company calendar settings:', error);
      throw error;
    }
  } catch (error) {
    console.error("Failed to delete company calendar settings:", error);
    throw error;
  }
};

export const isCalendarConnected = async (): Promise<boolean> => {
  try {
    const settings = await getCompanyCalendarSettings();
    return !!(settings?.google_access_token);
  } catch (error) {
    console.error("Failed to check calendar connection:", error);
    return false;
  }
};

export const getAIAgentSettings = async (agentId: string = 'calendar-assistant') => {
  try {
    const { data, error } = await supabase
      .from('ai_agent_calendar_settings')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching AI agent settings:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch AI agent settings:", error);
    throw error;
  }
};

export const updateAIAgentSettings = async (
  agentId: string,
  updates: any
): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('ai_agent_calendar_settings')
      .update(updates)
      .eq('agent_id', agentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating AI agent settings:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Failed to update AI agent settings:", error);
    throw error;
  }
};
