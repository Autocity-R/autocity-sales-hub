import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Clock, User, CheckCircle2, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface EmailHistoryTabProps {
  vehicleId: string;
}

interface EmailLog {
  id: string;
  email_type: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  sent_at: string;
  status: string;
  error_message: string | null;
}

const getEmailTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    contract: "Contract",
    payment_reminder: "Betalingsherinnering",
    papers_reminder: "Papieren herinnering",
    vehicle_arrived: "Voertuig aangekomen",
    license_registration: "Kenteken registratie",
    delivery_appointment: "Aflevering afspraak",
    delivery_confirmation: "Aflevering bevestiging",
    status_update: "Status update",
  };
  return labels[type] || type;
};

export function EmailHistoryTab({ vehicleId }: EmailHistoryTabProps) {
  const { data: emailLogs, isLoading } = useQuery({
    queryKey: ["email-history", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_sent_log")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("sent_at", { ascending: false });

      if (error) throw error;
      return data as EmailLog[];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Verzonden E-mails
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!emailLogs || emailLogs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Verzonden E-mails
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nog geen e-mails verzonden voor dit voertuig</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Verzonden E-mails ({emailLogs.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {emailLogs.map((log) => (
          <div
            key={log.id}
            className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-normal">
                    {getEmailTypeLabel(log.email_type)}
                  </Badge>
                  {log.status === "sent" ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Verzonden
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Mislukt
                    </Badge>
                  )}
                </div>
                <div className="text-sm font-medium">{log.subject}</div>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(log.sent_at), {
                  addSuffix: true,
                  locale: nl,
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{log.recipient_name || "Onbekend"}</span>
              <span className="text-muted-foreground">({log.recipient_email})</span>
            </div>

            {log.error_message && (
              <div className="text-xs text-destructive bg-destructive/10 rounded p-2">
                <strong>Fout:</strong> {log.error_message}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
