
import { useWebhookAgents } from "./useWebhookAgents";
import { useWebhookMutations } from "./useWebhookMutations";
import { useAgentWebhooks } from "./useAgentWebhooks";

export const useWebhookOperations = () => {
  const {
    agents,
    refetchAgents,
    agentsLoading,
    forceRefreshAgents,
  } = useWebhookAgents();

  const {
    saveWebhookMutation,
    testWebhookMutation,
  } = useWebhookMutations();

  const getWebhooks = (agentId: string) => {
    return useAgentWebhooks(agentId);
  };

  return {
    agents,
    refetchAgents,
    agentsLoading,
    saveWebhookMutation,
    testWebhookMutation,
    getWebhooks,
    forceRefreshAgents,
  };
};
