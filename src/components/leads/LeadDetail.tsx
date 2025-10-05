import React, { useState } from "react";
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
  Car
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
  const { toast } = useToast();
  const { user } = useAuth();
  const [isClaiming, setIsClaiming] = useState(false);
  
  const isOwnedByCurrentUser = lead.assignedTo === user?.id;
  const isUnassigned = !lead.assignedTo;
  
  // Parse lead data
  const parsedData = parseLeadData(lead);

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
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="font-medium">Interesse: </span>
                  <span>{parsedData.vehicleInterest || 'Niet gespecificeerd'}</span>
                </div>
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
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Volledige Email Tekst</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm whitespace-pre-wrap">
                  {parsedData.message}
                </div>
              </div>
            </CardContent>
          </Card>
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
