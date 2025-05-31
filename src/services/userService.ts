
import { supabase } from "@/integrations/supabase/client";

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
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

    return data || [];
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
  role: string = 'user'
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Create user with Supabase Auth
    const { data, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      }
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!data.user) {
      return { success: false, error: 'Gebruiker niet aangemaakt' };
    }

    // Update the role in profiles table
    await updateUserRole(data.user.id, role);

    return { success: true };
  } catch (error: any) {
    console.error("Failed to create user:", error);
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
