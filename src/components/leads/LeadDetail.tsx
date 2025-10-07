import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lead, LeadStatus } from "@/types/leads";
import { getLeadActivities, getLeadEmails, getLeadProposals, updateLeadStatus } from "@/services/leadService";
import { LeadActivities } from "./LeadActivities";
import { LeadCommunication } from "./LeadCommunication";
import { LeadProposals } from "./LeadProposals";
import { LeadFollowUp } from "./LeadFollowUp";
import { LeadEmailHistory } from "./LeadEmailHistory";
import { LeadEmailComposer } from "./LeadEmailComposer";
import { parseLeadData } from "@/utils/leadParser";
import { EmailParserService, ParsedLead } from "@/services/emailParser";
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Building, 
  Calendar,
  Euro,
  Clock,
  TrendingUp,
  Bot,
  UserCheck,
  UserPlus,
  Check,
  User,
  Car,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LeadDetailProps {
  lead: Lead;
  onBack: () => void;
  onUpdate: (lead: Lead) => void;
  onSendEmail?: () => void;
  onOpenAI?: () => void;
}

// Mock follow-ups data - in real app would come from service
const mockFollowUps = [
  {
    id: "fu1",
    leadId: "lead3",
    type: "proefrit" as const,
    description: "Follow-up na proefrit Mercedes E-Class. Klant was zeer tevreden en wil graag meer informatie over financieringsmogelijkheden.",
    scheduledDate: "2024-01-18T14:00:00Z",
    priority: "high" as const,
    completed: false,
    createdBy: "Pieter Jansen",
    createdAt: "2024-01-16T16:30:00Z"
  }
];

export const LeadDetail: React.FC<LeadDetailProps> = ({ 
  lead, 
  onBack, 
  onUpdate, 
  onSendEmail, 
  onOpenAI 
}) => {
  const [activities] = useState(getLeadActivities(lead.id));
  const [emails] = useState(getLeadEmails(lead.id));
  const [proposals] = useState(getLeadProposals(lead.id));
  const [followUps] = useState(mockFollowUps.filter(fu => fu.leadId === lead.id));
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [replyToEmail, setReplyToEmail] = useState<any>(null);
  const [enhancedLead, setEnhancedLead] = useState<any>(lead);
  const { toast } = useToast();
  const { user } = useAuth();
  const [isClaiming, setIsClaiming] = useState(false);
  
  const isOwnedByCurrentUser = lead.assignedTo === user?.id;
  const isUnassigned = !lead.assignedTo;
  
  // Fetch email_messages for this lead to get parsed_data
  React.useEffect(() => {
    const fetchEmailData = async () => {
      const { data } = await supabase
        .from('email_messages')
        .select('parsed_data, body, html_body, sender_email, subject')
        .eq('lead_id', lead.id)
        .order('received_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setEnhancedLead({ ...lead, email_messages: [data] });
      }
    };
    fetchEmailData();
  }, [lead.id]);
  
  // Parse lead data with enhanced email data
  const parsedData = parseLeadData(enhancedLead);
  
  // Parse email with EmailParserService for professional display
  const parsedLead: ParsedLead | null = useMemo(() => {
    if (enhancedLead?.email_messages?.[0]) {
      const emailMsg = enhancedLead.email_messages[0];
      const emailContent = emailMsg.body || emailMsg.html_body || lead.notes || '';
      const subject = emailMsg.subject || lead.interestedVehicle || '';
      const fromAddress = emailMsg.sender_email || lead.email || '';
      
      return EmailParserService.parseEmail(emailContent, subject, fromAddress);
    } else if (lead.notes) {
      return EmailParserService.parseEmail(
        lead.notes || '',
        lead.interestedVehicle || '',
        lead.email || ''
      );
    }
    return null;
  }, [enhancedLead, lead]);

  const handleReplyToEmail = (email: any) => {
    setReplyToEmail({
      messageId: email.message_id || email.gmail_message_id,
      threadId: email.thread_id,
      subject: email.subject,
      sender: email.sender || email.sender_email
    });
    setShowEmailComposer(true);
  };

  const handleEmailSent = async () => {
    setShowEmailComposer(false);
    setReplyToEmail(null);
    
    // Update status to 'contacted' if it was 'new'
    if (lead.status === 'new' && user?.id) {
      await supabase
        .from('leads')
        .update({ 
          status: 'contacted',
          assigned_to: lead.assignedTo || user.id
        })
        .eq('id', lead.id);
      
      const updatedLead = { ...lead, status: 'contacted' as LeadStatus };
      onUpdate(updatedLead);
    }
    
    toast({
      title: "Email verzonden",
      description: "Email succesvol verstuurd en lead status bijgewerkt",
    });
  };

  const handleClaimLead = async () => {
    if (!user?.id) return;
    
    setIsClaiming(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          owner_id: user.id,
          assigned_to: user.id,
          status: lead.status === 'new' ? 'contacted' : lead.status
        })
        .eq('id', lead.id);

      if (error) throw error;

      toast({
        title: "Lead geclaimd",
        description: "Deze lead is nu aan jou toegewezen",
      });
      
      const updatedLead = { 
        ...lead, 
        assignedTo: user.id,
        status: lead.status === 'new' ? 'contacted' as LeadStatus : lead.status
      };
      onUpdate(updatedLead);
    } catch (error) {
      console.error('Error claiming lead:', error);
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het claimen van de lead",
        variant: "destructive",
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500';
      case 'contacted': return 'bg-yellow-500';
      case 'qualified': return 'bg-purple-500';
      case 'proposal': return 'bg-orange-500';
      case 'negotiation': return 'bg-indigo-500';
      case 'won': return 'bg-green-500';
      case 'lost': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'Nieuw';
      case 'contacted': return 'Gecontacteerd';
      case 'qualified': return 'Gekwalificeerd';
      case 'proposal': return 'Offerte';
      case 'negotiation': return 'Onderhandeling';
      case 'won': return 'Gewonnen';
      case 'lost': return 'Verloren';
      default: return status;
    }
  };

  const handleStatusChange = (newStatus: LeadStatus) => {
    const updatedLead = updateLeadStatus(lead.id, newStatus);
    if (updatedLead) {
      onUpdate(updatedLead);
      toast({
        title: "Status bijgewerkt",
        description: `Lead status gewijzigd naar ${getStatusLabel(newStatus)}`,
      });
    }
  };

  const handleAssignToMe = () => {
    // TODO: Implement assignment logic
    const updatedLead = { ...lead, assignedTo: "Admin" };
    onUpdate(updatedLead);
    toast({
      title: "Lead toegewezen",
      description: "Lead is aan jou toegewezen",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={parsedData.subject}
        description={parsedData.vehicleInterest || "Geen voertuig interesse"}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Terug
          </Button>
          {!isOwnedByCurrentUser && (
            <Button 
              onClick={handleClaimLead}
              disabled={isClaiming}
              variant={isUnassigned ? "default" : "outline"}
            >
              {isUnassigned ? (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Claim Lead
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Overname Lead
                </>
              )}
            </Button>
          )}
          {isOwnedByCurrentUser && (
            <Badge variant="secondary" className="px-3 py-2">
              <Check className="h-4 w-4 mr-2" />
              Jouw Lead
            </Badge>
          )}
          <Button variant="outline" onClick={onSendEmail} className="gap-2">
            <Mail className="h-4 w-4" />
            Email Versturen
          </Button>
          <Button variant="outline" onClick={onOpenAI} className="gap-2">
            <Bot className="h-4 w-4" />
            AI Assistant
          </Button>
        </div>
      </PageHeader>

      {/* Lead Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge className={`${getStatusColor(lead.status)} text-white`}>
                {getStatusLabel(lead.status)}
              </Badge>
              <Select value={lead.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Nieuw</SelectItem>
                  <SelectItem value="contacted">Gecontacteerd</SelectItem>
                  <SelectItem value="qualified">Gekwalificeerd</SelectItem>
                  <SelectItem value="proposal">Offerte</SelectItem>
                  <SelectItem value="negotiation">Onderhandeling</SelectItem>
                  <SelectItem value="won">Gewonnen</SelectItem>
                  <SelectItem value="lost">Verloren</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversiekans</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{lead.conversionProbability}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lead.budget ? `€ ${lead.budget.toLocaleString()}` : 'Niet opgegeven'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toegewezen aan</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {lead.assignedTo || 'Niet toegewezen'}
            </div>
            {lead.responseTime && (
              <div className="text-xs text-muted-foreground">
                Reactietijd: {lead.responseTime}u
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contactinformatie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="font-medium">Naam: </span>
                  <span>{parsedData.customerName}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="font-medium">E-mailadres: </span>
                  <span>{parsedData.email || "Niet opgegeven"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="font-medium">Telefoonnummer: </span>
                  <span>{parsedData.phone || "Niet opgegeven"}</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium">Interesse: </span>
                    <span>{parsedData.vehicleInterest || 'Niet gespecificeerd'}</span>
                  </div>
                </div>
                {parsedData.vehicleUrl && (
                  <Button variant="outline" size="sm" asChild className="ml-6">
                    <a href={parsedData.vehicleUrl} target="_blank" rel="noopener noreferrer">
                      Bekijk advertentie
                    </a>
                  </Button>
                )}
              </div>
              <div>
                <span className="font-medium">Timeline: </span>
                <span>{lead.timeline || 'Niet gespecificeerd'}</span>
              </div>
              <div>
                <span className="font-medium">Bron: </span>
                <span>{lead.source}</span>
              </div>
              <div>
                <span className="font-medium">Prioriteit: </span>
                <Badge variant="outline" className={
                  lead.priority === 'urgent' ? 'border-red-500 text-red-700' :
                  lead.priority === 'high' ? 'border-orange-500 text-orange-700' :
                  lead.priority === 'medium' ? 'border-yellow-500 text-yellow-700' :
                  'border-green-500 text-green-700'
                }>
                  {lead.priority}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Activities, Communication, etc. */}
      <Tabs defaultValue="emails" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="emails">
            Email Geschiedenis
          </TabsTrigger>
          <TabsTrigger value="activities">
            Activiteiten ({activities.length})
          </TabsTrigger>
          <TabsTrigger value="proposals">
            Offertes ({proposals.length})
          </TabsTrigger>
          <TabsTrigger value="followup">
            Follow-up ({followUps.length})
          </TabsTrigger>
          <TabsTrigger value="timeline">
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="emails">
          {parsedLead ? (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Klantbericht</span>
                  {parsedLead.priority > 85 && (
                    <Badge variant="destructive" className="ml-2">
                      HOGE PRIORITEIT
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`rounded-lg p-6 border-l-4 ${getPlatformBorderColor(parsedLead.platform)} bg-card`}>
                  {/* Platform Header */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{parsedLead.platformIcon}</span>
                      <div>
                        <h4 className="font-semibold text-foreground">{parsedLead.platform}</h4>
                        <Badge variant="secondary" className="mt-1">
                          {parsedLead.leadType}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* Customer & Vehicle Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Customer Info */}
                    <div className="space-y-3">
                      <h5 className="text-sm font-semibold text-muted-foreground uppercase">Klantgegevens</h5>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">{parsedLead.customerName}</span>
                        </div>
                        {parsedLead.customerEmail && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a href={`mailto:${parsedLead.customerEmail}`} className="text-primary hover:underline text-sm">
                              {parsedLead.customerEmail}
                            </a>
                          </div>
                        )}
                        {parsedLead.customerPhone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${parsedLead.customerPhone}`} className="text-primary hover:underline text-sm">
                              {parsedLead.customerPhone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Vehicle Info */}
                    <div className="space-y-3">
                      <h5 className="text-sm font-semibold text-muted-foreground uppercase">Voertuiggegevens</h5>
                      <div className="space-y-2">
                        {parsedLead.vehicleTitle && (
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">{parsedLead.vehicleTitle}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                          {parsedLead.vehiclePrice && (
                            <span className="text-primary font-semibold">€ {parsedLead.vehiclePrice}</span>
                          )}
                          {parsedLead.vehicleMileage && (
                            <span className="text-muted-foreground">{parsedLead.vehicleMileage} km</span>
                          )}
                          {parsedLead.vehicleYear && (
                            <span className="text-muted-foreground">{parsedLead.vehicleYear}</span>
                          )}
                          {parsedLead.vehicleFuelType && (
                            <span className="text-muted-foreground">{parsedLead.vehicleFuelType}</span>
                          )}
                        </div>
                        {parsedLead.kenteken && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Kenteken: </span>
                            <span className="font-mono font-medium">{parsedLead.kenteken}</span>
                          </div>
                        )}
                        {parsedLead.advertNumber && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Advertentie nr: </span>
                            <span className="font-medium">{parsedLead.advertNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Customer Message */}
                  <div className="mb-6">
                    <h5 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Bericht van klant</h5>
                    <blockquote className="bg-muted/50 p-4 rounded-lg border-l-4 border-primary/30 italic text-foreground leading-relaxed whitespace-pre-wrap">
                      {parsedLead.customerMessage.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                          {line}
                          {i < parsedLead.customerMessage.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </blockquote>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {parsedLead.advertUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={parsedLead.advertUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Bekijk Advertentie
                        </a>
                      </Button>
                    )}
                    <Button variant="default" size="sm" onClick={() => setShowEmailComposer(true)}>
                      <Mail className="h-4 w-4 mr-2" />
                      Reageren
                    </Button>
                    {parsedLead.customerPhone && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${parsedLead.customerPhone}`}>
                          <Phone className="h-4 w-4 mr-2" />
                          Bellen
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Klant Bericht</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {parsedData.vehicleUrl && (
                  <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                    <Car className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Advertentie waar klant op reageerde:</p>
                      <a 
                        href={parsedData.vehicleUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline break-all"
                      >
                        Bekijk advertentie →
                      </a>
                    </div>
                  </div>
                )}
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {parsedData.cleanMessage || parsedData.message || 'Geen bericht beschikbaar'}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <LeadEmailHistory leadId={lead.id} onReply={handleReplyToEmail} />
        </TabsContent>

        <TabsContent value="activities">
          <LeadActivities leadId={lead.id} activities={activities} />
        </TabsContent>

        <TabsContent value="proposals">
          <LeadProposals leadId={lead.id} proposals={proposals} />
        </TabsContent>

        <TabsContent value="followup">
          <LeadFollowUp leadId={lead.id} followUps={followUps} />
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                Timeline overzicht komt hier (combinatie van alle activiteiten)
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Email Composer Dialog */}
      {showEmailComposer && (
        <LeadEmailComposer
          lead={lead}
          onClose={() => {
            setShowEmailComposer(false);
            setReplyToEmail(null);
          }}
          onSent={handleEmailSent}
          replyTo={replyToEmail}
        />
      )}
    </div>
  );
};

// Helper function for platform border colors using semantic tokens
function getPlatformBorderColor(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'marktplaats':
      return 'border-l-green-500';
    case 'autoscout24':
      return 'border-l-primary';
    case 'autotrack':
      return 'border-l-accent';
    case 'eigen website':
      return 'border-l-purple-500';
    default:
      return 'border-l-muted-foreground';
  }
}
