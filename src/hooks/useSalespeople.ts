
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
      // Step 1: Fetch user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['verkoper', 'admin', 'owner', 'manager']);

      if (rolesError) {
        console.error("Error fetching user roles:", rolesError);
        throw rolesError;
      }

      if (!userRoles || userRoles.length === 0) {
        console.warn("No users found with verkoper, admin, or owner roles");
        return [];
      }

      // Step 2: Fetch profiles for those users
      const userIds = userRoles.map(ur => ur.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        throw profilesError;
      }

      if (!profiles || profiles.length === 0) {
        console.warn("No profiles found for user roles");
        return [];
      }

      // Step 3: Create a roles map and combine data
      const rolesMap = new Map(userRoles.map(ur => [ur.user_id, ur.role]));

      return profiles.map(profile => {
        const role = rolesMap.get(profile.id) as string;
        const roleLabel = role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : role === 'manager' ? 'Manager' : 'Verkoper';
        const firstName = profile.first_name || '';
        const lastName = profile.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        
        return {
          id: profile.id,
          name: fullName || profile.email,
          email: profile.email,
          role: roleLabel,
          isActive: true,
          initials: firstName[0] && lastName[0] 
            ? `${firstName[0]}${lastName[0]}`.toUpperCase() 
            : (profile.email[0] || 'U').toUpperCase()
        };
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
