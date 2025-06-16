
import { useQuery } from "@tanstack/react-query";
import { fetchWebhooks } from "@/services/webhookOperationsService";

export const useAgentWebhooks = (agentId: string) => {
  return useQuery({
    queryKey: ['agent-webhooks', agentId],
    queryFn: () => fetchWebhooks(agentId),
    enabled: !!agentId,
  });
};
