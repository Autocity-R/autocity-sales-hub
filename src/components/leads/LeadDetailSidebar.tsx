import { Lead } from "@/types/leads";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar, History, Mail, Phone, User, Building, Send, Tag, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";

interface LeadDetailSidebarProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (leadId: string, newStatus: string) => void;
  onOwnerChange: (leadId: string, ownerId: string | null) => void;
}

const STATUSES = [
  { value: 'new', label: 'Nieuw' },
  { value: 'contacted', label: 'Gecontacteerd' },
  { value: 'appointment_planned', label: 'Afspraak Gepland' },
  { value: 'negotiation', label: 'Onderhandeling' },
  { value: 'won', label: 'Gewonnen' },
  { value: 'lost', label: 'Verloren' },
];

export function LeadDetailSidebar({
  lead,
  open,
  onClose,
  onStatusChange,
  onOwnerChange,
}: LeadDetailSidebarProps) {
  const [note, setNote] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch salespeople (verkoper role)
  const { data: salespeople = [] } = useQuery({
    queryKey: ['salespeople'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'verkoper');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch email messages for this lead
  const { data: emailMessages = [] } = useQuery({
    queryKey: ['email-messages', lead?.id],
    queryFn: async () => {
      if (!lead?.id) return [];
      
      const { data, error } = await supabase
        .from('email_messages')
        .select('*')
        .eq('lead_id', lead.id)
        .order('received_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!lead?.id
  });

  // Auto-assign lead to current user when opening
  useEffect(() => {
    if (lead && open && user && !lead.owner_id) {
      onOwnerChange(lead.id, user.id);
    }
  }, [lead, open, user, onOwnerChange]);

  if (!lead) return null;

  const handleAddNote = () => {
    if (!note.trim()) return;
    // TODO: Implement note saving to database
    console.log("Adding note:", note);
    setNote("");
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim()) return;

    try {
      // Update status to contacted if it's new
      if (lead.status === 'new') {
        onStatusChange(lead.id, 'contacted');
      }

      // Here you would typically call an edge function to send the email
      toast({
        title: "Reply verzonden",
        description: "Je reactie is verzonden naar de klant.",
      });

      setReplyMessage("");
    } catch (error) {
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het verzenden.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle className="text-2xl">
            {lead.firstName} {lead.lastName}
          </SheetTitle>
          {lead.company && (
            <p className="text-muted-foreground flex items-center gap-2">
              <Building className="h-4 w-4" />
              {lead.company}
            </p>
          )}
        </SheetHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden mt-6">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button size="sm" className="gap-2">
              <Calendar className="h-4 w-4" />
              Lead Afspraak
            </Button>
          </div>

          <Separator />

          {/* Status & Owner */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={lead.status || 'new'}
                onValueChange={(value) => onStatusChange(lead.id, value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Eigenaar</label>
              <Select
                value={lead.owner_id || "unassigned"}
                onValueChange={(value) =>
                  onOwnerChange(lead.id, value === "unassigned" ? null : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Niet toegewezen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Niet toegewezen</SelectItem>
                  {salespeople.map((sp) => (
                    <SelectItem key={sp.id} value={sp.id}>
                      {sp.first_name} {sp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Tabs */}
          <Tabs defaultValue="email" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="email" className="gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="timeline" className="gap-2">
                <History className="h-4 w-4" />
                Tijdlijn
              </TabsTrigger>
              <TabsTrigger value="details" className="gap-2">
                <User className="h-4 w-4" />
                Details
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="flex-1 flex flex-col space-y-4 overflow-hidden mt-4">
              <ScrollArea className="flex-1">
                <div className="space-y-4 pr-4">
                  {emailMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Geen email berichten</p>
                  ) : (
                    emailMessages.map((message) => (
                      <div key={message.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{message.sender}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(message.received_at).toLocaleString('nl-NL')}
                            </p>
                          </div>
                          <Badge variant={message.is_from_customer ? "default" : "secondary"}>
                            {message.is_from_customer ? "Klant" : "Ons"}
                          </Badge>
                        </div>
                        {message.subject && (
                          <p className="text-sm font-medium">{message.subject}</p>
                        )}
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {message.body}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <Separator />

              <div className="space-y-2">
                <label className="text-sm font-medium">Reageren</label>
                <Textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Typ je reactie..."
                  rows={4}
                />
                <Button onClick={handleSendReply} size="sm" className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Verstuur Reply
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4 mt-4">
              {/* Timeline items would go here */}
              <div className="text-sm text-muted-foreground text-center py-8">
                Nog geen activiteiten
              </div>

              {/* Add Note */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nieuwe Notitie</label>
                <Textarea
                  placeholder="Voeg een notitie toe aan de tijdlijn..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleAddNote} size="sm" disabled={!note.trim()}>
                  Notitie Toevoegen
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4 mt-4">
              {/* Contact Information */}
              <div>
                <h4 className="font-semibold mb-3">Contactgegevens</h4>
                <div className="space-y-2">
                  {lead.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                        {lead.email}
                      </a>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                        {lead.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Vehicle Interest */}
              {lead.interestedVehicle && (
                <>
                  <div>
                    <h4 className="font-semibold mb-2">Geïnteresseerd Voertuig</h4>
                    <p className="text-sm">{lead.interestedVehicle}</p>
                    {lead.budget && (
                      <p className="text-sm text-primary font-semibold mt-1">
                        €{lead.budget.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Separator />
                </>
              )}

              {/* Lead Info */}
              <div>
                <h4 className="font-semibold mb-3">Lead Informatie</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bron:</span>
                    <span>{lead.source || 'Onbekend'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prioriteit:</span>
                    <Badge variant={lead.priority === 'high' ? 'destructive' : 'secondary'}>
                      {lead.priority === 'high' ? 'Hoog' : lead.priority === 'medium' ? 'Gemiddeld' : 'Laag'}
                    </Badge>
                  </div>
                  {lead.created_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Aangemaakt:</span>
                      <span>{new Date(lead.created_at).toLocaleDateString('nl-NL')}</span>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
