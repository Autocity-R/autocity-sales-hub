
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { saveWebhookConfiguration } from "@/services/webhookService";
import { supabase } from "@/integrations/supabase/client";

export const useWebhookMutations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveWebhookMutation = useMutation({
    mutationFn: async (data: {
      agentId: string;
      webhookUrl: string;
      enabled: boolean;
      config: any;
      webhookName: string;
      workflowType: string;
      retryCount: number;
      timeoutSeconds: number;
      headers: any;
    }) => {
      console.log('💾 Saving webhook via unified approach:', data);
      return await saveWebhookConfiguration(data);
    },
    onSuccess: async (result, variables) => {
      console.log('✅ Unified webhook save successful:', result);
      
      toast({
        title: "✅ Webhook Configuratie Opgeslagen",
        description: "Webhook is succesvol geconfigureerd met database synchronisatie.",
      });
      
      // Force refresh all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ai-agents'] }),
        queryClient.invalidateQueries({ queryKey: ['ai-agents-management'] }),
        queryClient.invalidateQueries({ queryKey: ['agent-webhooks'] }),
      ]);
      
      // Additional verification
      setTimeout(async () => {
        console.log('🔍 Performing post-save verification...');
        queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      }, 500);
    },
    onError: (error: any) => {
      console.error('❌ Unified webhook save error:', error);
      toast({
        title: "❌ Opslaan Mislukt",
        description: `Kon webhook niet opslaan: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const testWebhookMutation = useMutation({
    mutationFn: async (url: string) => {
      const { data, error } = await supabase.functions.invoke('test-webhook', {
        body: {
          webhookUrl: url,
          testData: {
            agentId: "test",
            agentName: "Test Agent",
            message: "Test bericht vanuit CRM systeem",
            systemData: {
              currentTime: new Date().toISOString(),
              testMode: true
            }
          }
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "✅ Webhook Test Succesvol",
          description: `Webhook getest met status ${data.status}. Response ontvangen.`,
        });
      } else {
        toast({
          title: "⚠️ Webhook Test Gefaald",
          description: `Status: ${data.status} - ${data.error || 'Onbekende fout'}`,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "❌ Test Fout",
        description: `Webhook test gefaald: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    saveWebhookMutation,
    testWebhookMutation,
  };
};
