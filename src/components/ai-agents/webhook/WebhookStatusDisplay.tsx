
import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  webhook_url?: string;
  is_webhook_enabled: boolean;
  webhook_config?: any;
}

interface WebhookStatusDisplayProps {
  selectedAgentData?: Agent;
}

export const WebhookStatusDisplay: React.FC<WebhookStatusDisplayProps> = ({
  selectedAgentData,
}) => {
  return (
    <div className="p-4 bg-muted rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium">Huidige Webhook Status</h4>
        <Badge variant="outline" className="text-xs">
          Laatste update: {new Date().toLocaleTimeString()}
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">Status:</span>
          <Badge variant={selectedAgentData?.is_webhook_enabled ? "default" : "secondary"}>
            {selectedAgentData?.is_webhook_enabled ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <AlertCircle className="h-3 w-3 mr-1" />
            )}
            {selectedAgentData?.is_webhook_enabled ? "Actief" : "Inactief"}
          </Badge>
        </div>
        <div>
          <span className="font-medium">URL:</span>
          {selectedAgentData?.webhook_url ? (
            <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
              {selectedAgentData.webhook_url.substring(0, 40)}...
            </span>
          ) : (
            <span className="ml-2 text-gray-500">Niet geconfigureerd</span>
          )}
        </div>
      </div>
    </div>
  );
};
