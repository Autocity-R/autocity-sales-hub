
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Salesperson {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  initials: string;
}

export const useSalespeople = () => {
  return useQuery({
    queryKey: ["salespeople"],
    queryFn: async (): Promise<Salesperson[]> => {
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          profiles!inner(id, first_name, last_name, email)
        `)
        .eq('role', 'verkoper');

      if (error) {
        console.error("Error fetching salespeople:", error);
        throw error;
      }

      return userRoles?.map(userRole => {
        const profile = userRole.profiles as any;
        return {
          id: profile.id,
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
          email: profile.email,
          role: "Verkoper",
          isActive: true,
          initials: `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() || profile.email[0].toUpperCase()
        };
      }) || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes,
  });
};
