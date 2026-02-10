
import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  isAdmin: boolean;
  userRole: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultAuthContext: AuthContextType = {
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: new Error("AuthProvider not mounted") }),
  signUp: async () => ({ error: new Error("AuthProvider not mounted") }),
  signOut: async () => {},
  resetPassword: async () => ({ error: new Error("AuthProvider not mounted") }),
  isAdmin: false,
  userRole: null,
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.warn("[Auth] useAuth called outside AuthProvider — returning safe defaults");
    return defaultAuthContext;
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const checkUserRole = async (userId: string) => {
    try {
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      const role = userRole?.role || null;
      setUserRole(role);
      setIsAdmin(role === 'admin' || role === 'owner');
    } catch (error) {
      console.error('Error checking user role:', error);
      setIsAdmin(false);
      setUserRole(null);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[Auth] State change:', event, session?.user?.id ?? 'no user');
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkUserRole(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setUserRole(null);
        }
        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn('[Auth] getSession error:', error.message);
      }
      console.log('[Auth] Initial session:', session?.user?.id ?? 'no session');
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkUserRole(session.user.id);
      } else {
        // Safari/iPad: try refreshing the session if none found
        console.log('[Auth] No session found, attempting refresh...');
        supabase.auth.refreshSession().then(({ data: refreshData, error: refreshError }) => {
          if (refreshError) {
            console.warn('[Auth] Session refresh failed:', refreshError.message);
          } else if (refreshData?.session) {
            console.log('[Auth] Session refreshed successfully:', refreshData.session.user.id);
            setSession(refreshData.session);
            setUser(refreshData.session.user);
            checkUserRole(refreshData.session.user.id);
          }
        });
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });
    return { error };
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    isAdmin,
    userRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
