
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const WebhookDocumentation: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>n8n Integratie Documentatie</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Webhook Payload Structuur</h4>
          <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "sessionId": "uuid",
  "message": "gebruiker bericht",
  "agentId": "uuid",
  "agentName": "Calendar Assistant",
  "workflowType": "calendar_operations",
  "userContext": {},
  "systemData": {
    "appointments": [...],
    "contacts": [...],
    "vehicles": [...],
    "availableVehicles": [...]
  }
}`}
          </pre>
        </div>

        <div>
          <h4 className="font-medium mb-2">Verwachte Response</h4>
          <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "success": true,
  "message": "Afspraak succesvol ingepland",
  "data": {
    "action": "appointment_created",
    "details": "Afspraak op 2024-01-15 om 14:00"
  }
}`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
};
