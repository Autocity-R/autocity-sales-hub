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
  UserCheck
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

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
        title={`${lead.firstName} ${lead.lastName}`}
        description={lead.company || lead.email}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={onOpenAI} className="gap-2">
            <Bot className="h-4 w-4" />
            AI Assistant
          </Button>
          <Button variant="outline" onClick={onSendEmail} className="gap-2">
            <Mail className="h-4 w-4" />
            Email Versturen
          </Button>
          {!lead.assignedTo && (
            <Button variant="outline" onClick={handleAssignToMe} className="gap-2">
              <UserCheck className="h-4 w-4" />
              Toewijzen aan mij
            </Button>
          )}
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Terug naar overzicht
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
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{lead.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{lead.phone}</span>
              </div>
              {lead.company && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.company}</span>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <span className="font-medium">Interesse: </span>
                <span>{lead.interestedVehicle || 'Niet gespecificeerd'}</span>
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
          
          {lead.notes && (
            <div className="mt-6">
              <h4 className="font-medium mb-2">Notities:</h4>
              <p className="text-muted-foreground">{lead.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Activities, Communication, etc. */}
      <Tabs defaultValue="activities" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="activities">
            Activiteiten ({activities.length})
          </TabsTrigger>
          <TabsTrigger value="communication">
            Communicatie ({emails.length})
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

        <TabsContent value="activities">
          <LeadActivities leadId={lead.id} activities={activities} />
        </TabsContent>

        <TabsContent value="communication">
          <LeadCommunication leadId={lead.id} emails={emails} />
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
    </div>
  );
};
