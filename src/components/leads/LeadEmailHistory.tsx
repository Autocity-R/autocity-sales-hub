import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Mail, Send, Reply, Clock, ChevronDown, MessageSquare } from "lucide-react";
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
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchEmails();
    
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

    const logsChannel = supabase
      .channel('email_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'email_logs',
        },
        () => fetchSentEmails()
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

    if (!error && data) {
      setIncomingEmails(data);
    }
  };

  const fetchSentEmails = async () => {
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

      if (!error && data) {
        setSentEmails(data);
      }
    }
  };

  const groupByThread = () => {
    type EmailItem = { type: 'incoming' | 'sent'; data: EmailMessage | EmailLog; date: string };
    const allEmails: EmailItem[] = [
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

    const threadMap = new Map<string, EmailItem[]>();
    
    allEmails.forEach(email => {
      const threadId = email.type === 'incoming' && (email.data as EmailMessage).thread_id 
        ? (email.data as EmailMessage).thread_id! 
        : `single-${email.type}-${email.data.id}`;
      
      if (!threadMap.has(threadId)) {
        threadMap.set(threadId, []);
      }
      threadMap.get(threadId)!.push(email);
    });
    
    // Sort threads by latest email
    return Array.from(threadMap.entries()).sort((a, b) => {
      const aLatest = new Date(a[1][0].date).getTime();
      const bLatest = new Date(b[1][0].date).getTime();
      return bLatest - aLatest;
    });
  };

  const toggleThread = (threadId: string) => {
    const newExpanded = new Set(expandedThreads);
    if (newExpanded.has(threadId)) {
      newExpanded.delete(threadId);
    } else {
      newExpanded.add(threadId);
    }
    setExpandedThreads(newExpanded);
  };

  const renderEmailItem = (item: { type: 'incoming' | 'sent'; data: EmailMessage | EmailLog; date: string }) => {
    const isIncoming = item.type === 'incoming';
    const email = item.data;
    
    return (
      <div
        className={`p-3 rounded-lg border ${
          isIncoming 
            ? 'bg-blue-50/50 border-blue-200' 
            : 'bg-green-50/50 border-green-200'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              {isIncoming ? (
                <Mail className="h-4 w-4 text-blue-600" />
              ) : (
                <Send className="h-4 w-4 text-green-600" />
              )}
              <Badge variant={isIncoming ? "default" : "secondary"} className="text-xs">
                {isIncoming ? 'Ontvangen' : 'Verzonden'}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(item.date), "d MMM HH:mm", { locale: nl })}
              </span>
            </div>
            
            <div className="text-sm space-y-0.5">
              <div>
                <span className="font-medium">Van:</span>{' '}
                {isIncoming 
                  ? (email as EmailMessage).sender 
                  : (email as EmailLog).sender_email}
              </div>
              
              {isIncoming && (email as EmailMessage).body && (
                <div className="mt-1 p-2 bg-white rounded border text-xs">
                  <div className="line-clamp-2 whitespace-pre-wrap text-muted-foreground">
                    {(email as EmailMessage).body?.substring(0, 150)}...
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {isIncoming && onReply && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onReply(email as EmailMessage)}
              className="gap-1 h-7 text-xs"
            >
              <Reply className="h-3 w-3" />
              Reply
            </Button>
          )}
        </div>
      </div>
    );
  };

  const allThreads = groupByThread();
  const totalEmails = incomingEmails.length + sentEmails.length;

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

  if (totalEmails === 0) {
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
            {totalEmails} email{totalEmails !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {allThreads.map(([threadId, emails]) => {
            if (emails.length === 1) {
              return <div key={threadId}>{renderEmailItem(emails[0])}</div>;
            }

            const isExpanded = expandedThreads.has(threadId);
            const latestEmail = emails[0];
            const isIncoming = latestEmail.type === 'incoming';
            const email = latestEmail.data;

            return (
              <Collapsible
                key={threadId}
                open={isExpanded}
                onOpenChange={() => toggleThread(threadId)}
              >
                <div className="border rounded-lg overflow-hidden">
                  <CollapsibleTrigger className="w-full p-3 bg-muted hover:bg-muted/80 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <span className="font-medium text-sm">
                          {isIncoming 
                            ? (email as EmailMessage).subject || '(Geen onderwerp)' 
                            : (email as EmailLog).subject}
                        </span>
                        <Badge variant="outline" className="text-xs">{emails.length} berichten</Badge>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                    <div className="text-xs text-muted-foreground text-left mt-1">
                      Laatste: {format(new Date(latestEmail.date), "d MMM yyyy, HH:mm", { locale: nl })}
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="p-3 space-y-2 bg-background">
                      {emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item, idx) => (
                        <div key={idx}>{renderEmailItem(item)}</div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
