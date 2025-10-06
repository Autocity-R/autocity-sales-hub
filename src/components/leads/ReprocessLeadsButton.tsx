import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const ReprocessLeadsButton: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleReprocess = async () => {
    setIsProcessing(true);
    
    try {
      toast({
        title: "Leads opnieuw verwerken...",
        description: "Dit kan enkele seconden duren",
      });

      const { data, error } = await supabase.functions.invoke('reprocess-leads', {
        body: {}
      });

      if (error) throw error;

      toast({
        title: "✅ Verwerking voltooid",
        description: `${data.updated} leads bijgewerkt, ${data.skipped} overgeslagen`,
      });

      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('Reprocess error:', error);
      toast({
        title: "❌ Fout bij verwerken",
        description: error instanceof Error ? error.message : 'Er is een fout opgetreden',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleReprocess}
      disabled={isProcessing}
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
      {isProcessing ? 'Bezig met verwerken...' : 'Leads Opnieuw Verwerken'}
    </Button>
  );
};
