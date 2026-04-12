import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, MailOpen } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { GarantieEmailDetail } from "./GarantieEmailDetail";

const beslissingBadge = (beslissing: string | null) => {
  switch (beslissing) {
    case 'gedekt':
      return <Badge className="bg-green-500/10 text-green-700 border-green-500/30" variant="outline">✅ Gedekt</Badge>;
    case 'niet_gedekt':
      return <Badge className="bg-red-500/10 text-red-700 border-red-500/30" variant="outline">❌ Niet gedekt</Badge>;
    case 'onderzoek':
      return <Badge className="bg-orange-500/10 text-orange-700 border-orange-500/30" variant="outline">🔍 Onderzoek</Badge>;
    case 'meer_info_nodig':
      return <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/30" variant="outline">ℹ️ Meer info</Badge>;
    default:
      return <Badge variant="outline">⏳ Wacht</Badge>;
  }
};

export const GarantieEmailInbox: React.FC = () => {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const { data: emails, isLoading, refetch } = useQuery({
    queryKey: ['garantie-emails-inbox'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('garantie_emails' as any)
        .select('*, thread:thread_id(id, klant_naam, klant_email, onderwerp, case_samenvatting, sara_beslissing, thread_status)')
        .eq('richting', 'inkomend')
        .order('received_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 30000,
  });

  if (selectedThreadId) {
    return (
      <GarantieEmailDetail
        threadId={selectedThreadId}
        onBack={() => { setSelectedThreadId(null); refetch(); }}
      />
    );
  }

  const unread = emails?.filter((e: any) => !e.gelezen) || [];
  const read = emails?.filter((e: any) => e.gelezen) || [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          Garantie Email Inbox
          {unread.length > 0 && (
            <Badge variant="destructive" className="ml-2">{unread.length} ongelezen</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4">Laden...</p>
        ) : !emails?.length ? (
          <p className="text-sm text-muted-foreground py-4">Geen garantie emails gevonden</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Klant</TableHead>
                <TableHead>Onderwerp</TableHead>
                <TableHead>Ontvangen</TableHead>
                <TableHead>Beslissing</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...unread, ...read].map((email: any) => (
                <TableRow
                  key={email.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedThreadId(email.thread_id)}
                >
                  <TableCell>
                    {email.gelezen ? (
                      <MailOpen className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Mail className="h-4 w-4 text-primary" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className={`text-sm ${!email.gelezen ? 'font-semibold' : ''}`}>
                        {email.sender || email.sender_email}
                      </p>
                      <p className="text-xs text-muted-foreground">{email.sender_email}</p>
                    </div>
                  </TableCell>
                  <TableCell className={`text-sm ${!email.gelezen ? 'font-semibold' : ''}`}>
                    {email.subject || 'Geen onderwerp'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(email.received_at), 'dd MMM HH:mm', { locale: nl })}
                  </TableCell>
                  <TableCell>{beslissingBadge(email.sara_beslissing)}</TableCell>
                  <TableCell>
                    {email.reactie_status === 'verstuurd' ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-700">Verstuurd</Badge>
                    ) : email.reactie_status === 'wacht_op_beoordeling' ? (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700">Wacht op review</Badge>
                    ) : (
                      <Badge variant="outline">{email.reactie_status}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
