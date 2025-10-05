import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Reply, Clock } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmailMessage {
  id: string;
  thread_id: string | null;
  lead_id: string;
  message_id: string;
  sender: string;
  recipient: string;
  subject: string | null;
  body: string | null;
  received_at: string;
  is_from_customer: boolean;
  portal_source: string | null;
  created_at: string;
}

interface EmailLog {
  id: string;
  sender_email: string;
  recipient_email: string;
  subject: string;
  sent_at: string;
  status: string;
  gmail_message_id: string | null;
}

interface LeadEmailHistoryProps {
  leadId: string;
  onReply?: (email: EmailMessage | EmailLog) => void;
}

export const LeadEmailHistory: React.FC<LeadEmailHistoryProps> = ({ 
  leadId, 
  onReply 
}) => {
  const [incomingEmails, setIncomingEmails] = useState<EmailMessage[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmails();
    
    // Set up real-time subscription for incoming emails
    const messagesChannel = supabase
      .channel('email_messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'email_messages',
          filter: `lead_id=eq.${leadId}`
        },
        (payload) => {
          console.log('New email message:', payload);
          setIncomingEmails(prev => [payload.new as EmailMessage, ...prev]);
          
          if ((payload.new as EmailMessage).is_from_customer) {
            toast({
              title: "Nieuwe email ontvangen",
              description: `Van: ${(payload.new as EmailMessage).sender}`,
            });
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for sent emails
    const logsChannel = supabase
      .channel('email_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'email_logs',
        },
        (payload) => {
          console.log('New email log:', payload);
          // Check if this log is for the current lead (we don't have direct filter)
          // We'll refetch to be sure
          fetchSentEmails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(logsChannel);
    };
  }, [leadId]);

  const fetchEmails = async () => {
    setLoading(true);
    await Promise.all([fetchIncomingEmails(), fetchSentEmails()]);
    setLoading(false);
  };

  const fetchIncomingEmails = async () => {
    const { data, error } = await supabase
      .from('email_messages')
      .select('*')
      .eq('lead_id', leadId)
      .order('received_at', { ascending: false });

    if (error) {
      console.error('Error fetching incoming emails:', error);
      toast({
        title: "Fout bij ophalen emails",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setIncomingEmails(data || []);
    }
  };

  const fetchSentEmails = async () => {
    // We need to join with leads to get emails sent to this lead
    const { data: lead } = await supabase
      .from('leads')
      .select('email')
      .eq('id', leadId)
      .single();

    if (lead?.email) {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('recipient_email', lead.email)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false });

      if (error) {
        console.error('Error fetching sent emails:', error);
      } else {
        setSentEmails(data || []);
      }
    }
  };

  const combineAndSortEmails = () => {
    const combined: Array<{ type: 'incoming' | 'sent'; data: EmailMessage | EmailLog; date: string }> = [
      ...incomingEmails.map(email => ({
        type: 'incoming' as const,
        data: email,
        date: email.received_at
      })),
      ...sentEmails.map(email => ({
        type: 'sent' as const,
        data: email,
        date: email.sent_at
      }))
    ];

    return combined.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  const allEmails = combineAndSortEmails();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Emails laden...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allEmails.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Geschiedenis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Nog geen emails verzonden of ontvangen voor deze lead
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Geschiedenis
          </div>
          <Badge variant="outline">
            {allEmails.length} email{allEmails.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {allEmails.map((item, index) => {
            const isIncoming = item.type === 'incoming';
            const email = item.data;
            
            return (
              <div
                key={`${item.type}-${isIncoming ? (email as EmailMessage).id : (email as EmailLog).id}`}
                className={`p-4 rounded-lg border ${
                  isIncoming 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {isIncoming ? (
                        <Mail className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Send className="h-4 w-4 text-green-600" />
                      )}
                      <Badge variant={isIncoming ? "default" : "secondary"}>
                        {isIncoming ? 'Ontvangen' : 'Verzonden'}
                      </Badge>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(item.date), "d MMM yyyy, HH:mm", { locale: nl })}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-sm">
                        <span className="font-medium">Van:</span>{' '}
                        {isIncoming 
                          ? (email as EmailMessage).sender 
                          : (email as EmailLog).sender_email}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Aan:</span>{' '}
                        {isIncoming 
                          ? (email as EmailMessage).recipient 
                          : (email as EmailLog).recipient_email}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Onderwerp:</span>{' '}
                        {isIncoming 
                          ? (email as EmailMessage).subject || '(Geen onderwerp)' 
                          : (email as EmailLog).subject}
                      </div>
                      
                      {isIncoming && (email as EmailMessage).body && (
                        <div className="mt-2 p-2 bg-white rounded border text-sm">
                          <div className="line-clamp-3 whitespace-pre-wrap">
                            {(email as EmailMessage).body?.substring(0, 200) || ''}
                          </div>
                        </div>
                      )}
                      
                      {isIncoming && (email as EmailMessage).portal_source && (
                        <Badge variant="outline" className="mt-2">
                          Bron: {(email as EmailMessage).portal_source}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {onReply && isIncoming && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onReply(email)}
                      className="gap-2"
                    >
                      <Reply className="h-4 w-4" />
                      Reageren
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
