
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Webhook {
  id: string;
  agent_id: string;
  webhook_name: string;
  webhook_url: string;
  workflow_type: string;
  is_active: boolean;
  retry_count: number;
  timeout_seconds: number;
  headers: any;
}

interface WebhookListProps {
  webhooks: Webhook[];
}

export const WebhookList: React.FC<WebhookListProps> = ({ webhooks }) => {
  if (webhooks.length === 0) return null;

  return (
    <div>
      <Separator />
      <h4 className="font-medium mb-4">Actieve Webhooks</h4>
      <div className="space-y-3">
        {webhooks.map((webhook) => (
          <Card key={webhook.id}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{webhook.webhook_name}</span>
                    <Badge variant={webhook.is_active ? "default" : "secondary"}>
                      {webhook.is_active ? "Actief" : "Inactief"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {webhook.workflow_type} • {webhook.retry_count} retries • {webhook.timeout_seconds}s timeout
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 bg-gray-100 p-2 rounded">
                    {webhook.webhook_url}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
