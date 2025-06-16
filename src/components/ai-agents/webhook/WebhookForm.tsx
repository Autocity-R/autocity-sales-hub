
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, TestTube2 } from "lucide-react";

interface WebhookFormProps {
  webhookUrl: string;
  setWebhookUrl: (url: string) => void;
  workflowType: string;
  setWorkflowType: (type: string) => void;
  retryCount: number;
  setRetryCount: (count: number) => void;
  timeoutSeconds: number;
  setTimeoutSeconds: (seconds: number) => void;
  customHeaders: string;
  setCustomHeaders: (headers: string) => void;
  isWebhookEnabled: boolean;
  onToggleWebhook: (enabled: boolean) => void;
  onSaveWebhook: () => void;
  onTestWebhook: () => void;
  isSaving: boolean;
  isTesting: boolean;
}

export const WebhookForm: React.FC<WebhookFormProps> = ({
  webhookUrl,
  setWebhookUrl,
  workflowType,
  setWorkflowType,
  retryCount,
  setRetryCount,
  timeoutSeconds,
  setTimeoutSeconds,
  customHeaders,
  setCustomHeaders,
  isWebhookEnabled,
  onToggleWebhook,
  onSaveWebhook,
  onTestWebhook,
  isSaving,
  isTesting,
}) => {
  return (
    <div className="space-y-6">
      {/* Webhook Enable/Disable Toggle */}
      <div className="flex items-center space-x-2 p-4 border rounded-lg">
        <Switch
          id="webhook-enabled"
          checked={isWebhookEnabled}
          onCheckedChange={onToggleWebhook}
        />
        <Label htmlFor="webhook-enabled" className="font-medium">
          Webhook Activeren
        </Label>
        <span className="text-sm text-muted-foreground ml-4">
          Schakel dit in om de webhook te activeren voor deze agent
        </span>
      </div>

      {/* Webhook Configuration */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="webhook-url">n8n Webhook URL</Label>
          <Input
            id="webhook-url"
            type="url"
            placeholder="https://jouw-n8n-instance.com/webhook/..."
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="workflow-type">Workflow Type</Label>
            <Select value={workflowType} onValueChange={setWorkflowType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="calendar_operations">Calendar Operations</SelectItem>
                <SelectItem value="lead_management">Lead Management</SelectItem>
                <SelectItem value="customer_service">Customer Service</SelectItem>
                <SelectItem value="general_crm">General CRM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="retry-count">Retry Count</Label>
            <Input
              id="retry-count"
              type="number"
              min="1"
              max="10"
              value={retryCount}
              onChange={(e) => setRetryCount(parseInt(e.target.value) || 3)}
            />
          </div>

          <div>
            <Label htmlFor="timeout">Timeout (seconden)</Label>
            <Input
              id="timeout"
              type="number"
              min="5"
              max="120"
              value={timeoutSeconds}
              onChange={(e) => setTimeoutSeconds(parseInt(e.target.value) || 30)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="custom-headers">Custom Headers (JSON)</Label>
          <Textarea
            id="custom-headers"
            placeholder='{"Authorization": "Bearer token", "X-Custom": "value"}'
            value={customHeaders}
            onChange={(e) => setCustomHeaders(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          onClick={onSaveWebhook}
          disabled={isSaving || !webhookUrl}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Opslaan...' : 'Permanent Opslaan'}
        </Button>

        <Button
          variant="outline"
          onClick={onTestWebhook}
          disabled={isTesting || !webhookUrl}
          className="flex items-center gap-2"
        >
          <TestTube2 className="h-4 w-4" />
          {isTesting ? 'Testen...' : 'Test Webhook'}
        </Button>
      </div>
    </div>
  );
};
