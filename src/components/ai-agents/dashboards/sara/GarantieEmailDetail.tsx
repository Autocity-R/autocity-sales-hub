import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Edit, Mail, Reply } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface Props {
  threadId: string;
  onBack: () => void;
}

export const GarantieEmailDetail: React.FC<Props> = ({ threadId, onBack }) => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [sending, setSending] = useState(false);

  const { data: thread } = useQuery({
    queryKey: ['garantie-thread', threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('garantie_email_threads' as any)
        .select('*')
        .eq('id', threadId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: emails } = useQuery({
    queryKey: ['garantie-thread-emails', threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('garantie_emails' as any)
        .select('*')
        .eq('thread_id', threadId)
        .order('received_at', { ascending: true });
      if (error) throw error;

      // Mark unread emails as read
      const unreadIds = (data as any[])?.filter((e: any) => !e.gelezen && e.richting === 'inkomend').map((e: any) => e.id) || [];
      if (unreadIds.length > 0) {
        await supabase
          .from('garantie_emails' as any)
          .update({ gelezen: true } as any)
          .in('id', unreadIds);
      }

      return data as any[];
    },
  });

  // Find the latest inbound email with a sara_reactie_voorstel
  const latestInbound = emails?.filter((e: any) => e.richting === 'inkomend').slice(-1)[0];
  const currentResponse = responseText || latestInbound?.sara_reactie_voorstel || '';

  const handleSend = async () => {
    if (!currentResponse.trim() || !thread) return;
    setSending(true);

    try {
      // Insert into email_queue
      const { error: queueError } = await supabase.from('email_queue').insert({
        payload: {
          to: [thread.klant_email],
          subject: `Re: ${thread.onderwerp || 'Garantie'}`,
          htmlBody: currentResponse.replace(/\n/g, '<br/>'),
          senderEmail: 'garantie@auto-city.nl',
        },
        status: 'pending',
      });

      if (queueError) throw queueError;

      // Save outgoing email in thread
      await supabase.from('garantie_emails' as any).insert({
        thread_id: threadId,
        message_id: `reply-${Date.now()}`,
        sender: 'Autocity Garantie',
        sender_email: 'garantie@auto-city.nl',
        subject: `Re: ${thread.onderwerp || 'Garantie'}`,
        body: currentResponse,
        received_at: new Date().toISOString(),
        richting: 'uitgaand',
        gelezen: true,
        reactie_status: 'verstuurd',
        definitieve_reactie: currentResponse,
        verstuurd_op: new Date().toISOString(),
        verstuurd_door: 'Lloyd',
      } as any);

      // Update latest inbound email status
      if (latestInbound) {
        await supabase
          .from('garantie_emails' as any)
          .update({
            reactie_status: 'verstuurd',
            definitieve_reactie: currentResponse,
            verstuurd_op: new Date().toISOString(),
            verstuurd_door: 'Lloyd',
          } as any)
          .eq('id', latestInbound.id);
      }

      toast({ title: "Email verstuurd", description: "De reactie is naar de email queue gestuurd." });
      queryClient.invalidateQueries({ queryKey: ['garantie-thread-emails', threadId] });
      setEditing(false);
      setResponseText('');
    } catch (err: any) {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Terug naar inbox
      </Button>

      {thread && (
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-lg">{thread.onderwerp || 'Garantie case'}</h3>
          <Badge variant="outline">{thread.klant_email}</Badge>
          {thread.sara_beslissing && (
            <Badge variant="outline" className={
              thread.sara_beslissing === 'gedekt' ? 'bg-green-500/10 text-green-700' :
              thread.sara_beslissing === 'niet_gedekt' ? 'bg-red-500/10 text-red-700' :
              'bg-orange-500/10 text-orange-700'
            }>
              {thread.sara_beslissing}
            </Badge>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Thread history */}
        <Card className="max-h-[600px] overflow-y-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Gesprek</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {emails?.map((email: any) => (
              <div
                key={email.id}
                className={`p-3 rounded-lg text-sm ${
                  email.richting === 'inkomend'
                    ? 'bg-muted/50 border'
                    : 'bg-primary/5 border border-primary/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {email.richting === 'inkomend' ? (
                      <Mail className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <Reply className="h-3 w-3 text-primary" />
                    )}
                    <span className="font-medium text-xs">
                      {email.richting === 'inkomend' ? email.sender : 'Autocity Garantie'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(email.received_at), 'dd MMM yyyy HH:mm', { locale: nl })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-xs leading-relaxed">{email.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Right: Sara's analyse + reactie */}
        <div className="space-y-4">
          {latestInbound?.sara_analyse && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Sara's Analyse</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{latestInbound.sara_analyse}</p>
              </CardContent>
            </Card>
          )}

          {thread?.case_samenvatting && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Case Samenvatting</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{thread.case_samenvatting}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Reactie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {latestInbound?.reactie_status === 'verstuurd' ? (
                <div>
                  <Badge className="bg-green-500/10 text-green-700 mb-2" variant="outline">
                    ✅ Verstuurd op {latestInbound.verstuurd_op ? format(new Date(latestInbound.verstuurd_op), 'dd MMM HH:mm', { locale: nl }) : ''}
                  </Badge>
                  <p className="text-sm whitespace-pre-wrap">{latestInbound.definitieve_reactie}</p>
                </div>
              ) : (
                <>
                  <Textarea
                    value={editing ? responseText : currentResponse}
                    onChange={(e) => setResponseText(e.target.value)}
                    readOnly={!editing}
                    rows={10}
                    className="text-sm"
                    placeholder="Sara's reactie voorstel wordt hier getoond..."
                  />
                  <div className="flex gap-2">
                    {!editing ? (
                      <>
                        <Button
                          size="sm"
                          onClick={handleSend}
                          disabled={!currentResponse || sending}
                          className="gap-2"
                        >
                          <Send className="h-3 w-3" />
                          Goedkeuren en versturen
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setEditing(true); setResponseText(currentResponse); }}
                          className="gap-2"
                        >
                          <Edit className="h-3 w-3" />
                          Aanpassen
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleSend}
                        disabled={!responseText.trim() || sending}
                        className="gap-2"
                      >
                        <Send className="h-3 w-3" />
                        Versturen
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
