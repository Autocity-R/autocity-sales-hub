
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { Lead } from "@/types/leads";
import { getLeadActivities, getLeadEmails, getLeadProposals } from "@/services/leadService";
import { LeadActivities } from "./LeadActivities";
import { LeadCommunication } from "./LeadCommunication";
import { LeadProposals } from "./LeadProposals";
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Building, 
  Calendar,
  Euro,
  Clock,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";

interface LeadDetailProps {
  lead: Lead;
  onBack: () => void;
  onUpdate: (lead: Lead) => void;
}

export const LeadDetail: React.FC<LeadDetailProps> = ({ lead, onBack, onUpdate }) => {
  const [activities] = useState(getLeadActivities(lead.id));
  const [emails] = useState(getLeadEmails(lead.id));
  const [proposals] = useState(getLeadProposals(lead.id));

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

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${lead.firstName} ${lead.lastName}`}
        description={lead.company || lead.email}
      >
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Terug naar overzicht
        </Button>
      </PageHeader>

      {/* Lead Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={`${getStatusColor(lead.status)} text-white`}>
              {getStatusLabel(lead.status)}
            </Badge>
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
            <CardTitle className="text-sm font-medium">Reactietijd</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lead.responseTime ? `${lead.responseTime}u` : 'Nog niet gereageerd'}
            </div>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="activities">
            Activiteiten ({activities.length})
          </TabsTrigger>
          <TabsTrigger value="communication">
            Communicatie ({emails.length})
          </TabsTrigger>
          <TabsTrigger value="proposals">
            Offertes ({proposals.length})
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
