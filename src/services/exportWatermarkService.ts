import { supabase } from "@/integrations/supabase/client";

export interface ExportWatermark {
  exportedBy: string;
  exportedAt: string;
  exportId: string;
  shouldWatermark: boolean;
}

export const getExportWatermark = async (): Promise<ExportWatermark> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  let isOwnerOrAdmin = false;
  
  if (user?.id) {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    isOwnerOrAdmin = roleData?.role === 'admin' || roleData?.role === 'owner';
  }
  
  return {
    exportedBy: user?.email || 'unknown',
    exportedAt: new Date().toLocaleString('nl-NL'),
    exportId: crypto.randomUUID().slice(0, 8).toUpperCase(),
    shouldWatermark: !isOwnerOrAdmin,
  };
};
