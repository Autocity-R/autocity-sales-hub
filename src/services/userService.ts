
import { supabase } from "@/integrations/supabase/client";

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: 'admin' | 'owner' | 'manager' | 'verkoper' | 'operationeel' | 'user';
  company: string | null;
  created_at: string;
  updated_at: string;
}

export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }

    return (data || []) as UserProfile[];
  } catch (error) {
    console.error("Failed to fetch users:", error);
    throw error;
  }
};

export const updateUserRole = async (userId: string, role: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  } catch (error) {
    console.error("Failed to update user role:", error);
    throw error;
  }
};

export const createUser = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: string = 'operationeel'
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get current session for authorization
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { success: false, error: 'Je moet ingelogd zijn om gebruikers aan te maken' };
    }

    // Call the edge function to create user
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        email,
        password,
        firstName,
        lastName,
        role
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      return { success: false, error: 'Er is een fout opgetreden bij het aanmaken van de gebruiker' };
    }

    if (!data.success) {
      return { success: false, error: data.error || 'Onbekende fout' };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to create user:", error);
    return { success: false, error: error.message || 'Onbekende fout' };
  }
};

export const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string; message?: string }> => {
  try {
    // Get current session for authorization
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { success: false, error: 'Je moet ingelogd zijn om gebruikers te verwijderen' };
    }

    // Call the edge function to delete user
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { userId },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      return { success: false, error: 'Er is een fout opgetreden bij het verwijderen van de gebruiker' };
    }

    if (!data.success) {
      return { success: false, error: data.error || 'Onbekende fout' };
    }

    return { success: true, message: data.message };
  } catch (error: any) {
    console.error("Failed to delete user:", error);
    return { success: false, error: error.message || 'Onbekende fout' };
  }
};

export const getUserLastLogin = async (userId: string): Promise<string | null> => {
  try {
    // This would need to be implemented with auth.users access via RPC or edge function
    // For now, return placeholder
    return new Date().toISOString();
  } catch (error) {
    console.error("Failed to get user last login:", error);
    return null;
  }
};
