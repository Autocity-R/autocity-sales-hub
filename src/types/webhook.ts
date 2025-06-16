
// Enhanced webhook types and interfaces
export interface WebhookPayload {
  agentId: string;
  message: string;
  sessionId: string;
  workflowType: string;
  userContext?: any;
}

export interface WebhookOptions {
  retries?: number;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface WebhookResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  processingTime?: number;
}
