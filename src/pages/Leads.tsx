import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getLeads, getLeadStats } from "@/services/leadService";
import { Lead, LeadStatus } from "@/types/leads";
import { LeadDetail } from "@/components/leads/LeadDetail";
import { LeadForm } from "@/components/leads/LeadForm";
import { LeadPipeline } from "@/components/leads/LeadPipeline";
import { LeadEmailComposer } from "@/components/leads/LeadEmailComposer";
import { LeadAIAssistant } from "@/components/leads/LeadAIAssistant";
import { useSalespeople } from "@/hooks/useSalespeople";
import { 
  Plus, 
  Search, 
  Filter, 
  Users, 
  TrendingUp, 
  Clock,
  Target,
  Mail,
  Bot,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { LeadSearchRequests } from "@/components/leads/LeadSearchRequests";

const Leads = () => {
  const [leads] = useState<Lead[]>(getLeads());
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [activeTab, setActiveTab] = useState("list");
  const [assignedToFilter, setAssignedToFilter] = useState<string>("all");
  
  const { data: salespeople = [] } = useSalespeople();
  const stats = getLeadStats();
  const currentUser = "Admin"; // In real app, this would come from auth context

  const getStatusColor = (status: LeadStatus) => {
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

  const getStatusLabel = (status: LeadStatus) => {
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = `${lead.firstName} ${lead.lastName} ${lead.email} ${lead.company || ''}`
      .toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesAssignee = assignedToFilter === "all" || 
      (assignedToFilter === "unassigned" && !lead.assignedTo) ||
      lead.assignedTo === assignedToFilter;
    return matchesSearch && matchesStatus && matchesAssignee;
  });

  const handleStatusFilterClick = (status: LeadStatus) => {
    setStatusFilter(status);
    setActiveTab("list");
  };

  const handleAssignLead = (leadId: string, assignee: string) => {
    // TODO: Implement lead assignment logic
    console.log(`Assigning lead ${leadId} to ${assignee}`);
  };

  const handleManualEmailSync = async () => {
    const t = toast({ title: "Email synchronisatie gestart..." });
    try {
      const { data, error } = await supabase.functions.invoke('process-lead-emails');
      if (error) throw error;
      console.log("Sync resultaat:", data);
      const created = data?.created ?? 0;
      const updated = data?.updated ?? 0;
      const errors = data?.errors ?? 0;
      if (created + updated > 0) {
        t.update({ ...t, title: `Sync voltooid: ${created} nieuw, ${updated} bijgewerkt`, description: errors ? `${errors} niet geparsed` : undefined });
      } else {
        t.update({ ...t, title: "Geen nieuwe leads gevonden", description: errors ? `${errors} emails konden niet geparsed worden` : undefined });
      }
    } catch (error) {
      console.error("Email sync error:", error);
      toast({ title: "Fout bij email synchronisatie" });
    }
  };
  if (selectedLead) {
    return (
      <DashboardLayout>
        <LeadDetail 
          lead={selectedLead} 
          onBack={() => setSelectedLead(null)}
          onUpdate={(updatedLead) => setSelectedLead(updatedLead)}
          onSendEmail={() => setShowEmailComposer(true)}
          onOpenAI={() => setShowAIAssistant(true)}
        />
        {showEmailComposer && (
          <LeadEmailComposer
            lead={selectedLead}
            onClose={() => setShowEmailComposer(false)}
            onSent={() => {
              setShowEmailComposer(false);
              // Refresh lead data
            }}
          />
        )}
        {showAIAssistant && (
          <LeadAIAssistant
            lead={selectedLead}
            onClose={() => setShowAIAssistant(false)}
          />
        )}
      </DashboardLayout>
    );
  }

  if (showForm) {
    return (
      <DashboardLayout>
        <LeadForm 
          onSave={() => {
            setShowForm(false);
            // Refresh leads would happen here
          }}
          onCancel={() => setShowForm(false)}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Lead Management"
          description="Beheer alle prospects en leads in één overzicht"
        >
          <div className="flex gap-2">
            <Button onClick={handleManualEmailSync} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Gmail Sync (Test)
            </Button>
            <Button onClick={() => setShowAIAssistant(true)} variant="outline" className="gap-2">
              <Bot className="h-4 w-4" />
              AI Assistant
            </Button>
            <Button onClick={() => setShowEmailComposer(true)} variant="outline" className="gap-2">
              <Mail className="h-4 w-4" />
              Bulk Email
            </Button>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nieuwe Lead
            </Button>
          </div>
        </PageHeader>

        {/* Stats Cards - Now Clickable */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleStatusFilterClick('new')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nieuw</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.byStatus.new || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleStatusFilterClick('contacted')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gecontacteerd</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.byStatus.contacted || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleStatusFilterClick('proposal')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Offerte</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.byStatus.proposal || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleStatusFilterClick('won')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gewonnen</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.byStatus.won || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list">Lijstweergave</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="search">Zoekopdrachten</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {/* Enhanced Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Zoek leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={(value: LeadStatus | "all") => setStatusFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter op status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  <SelectItem value="new">Nieuw</SelectItem>
                  <SelectItem value="contacted">Gecontacteerd</SelectItem>
                  <SelectItem value="qualified">Gekwalificeerd</SelectItem>
                  <SelectItem value="proposal">Offerte</SelectItem>
                  <SelectItem value="negotiation">Onderhandeling</SelectItem>
                  <SelectItem value="won">Gewonnen</SelectItem>
                  <SelectItem value="lost">Verloren</SelectItem>
                </SelectContent>
              </Select>

              <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter op medewerker" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle medewerkers</SelectItem>
                  <SelectItem value="unassigned">Niet toegewezen</SelectItem>
                  {salespeople.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Enhanced Leads List */}
            <div className="grid gap-4">
              {filteredLeads.map((lead) => (
                <Card key={lead.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedLead(lead)}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {lead.firstName} {lead.lastName}
                          </h3>
                          <Badge className={`${getStatusColor(lead.status)} text-white`}>
                            {getStatusLabel(lead.status)}
                          </Badge>
                          <Badge variant="outline" className={getPriorityColor(lead.priority)}>
                            {lead.priority}
                          </Badge>
                          {lead.assignedTo && (
                            <Badge variant="secondary">
                              Toegewezen aan: {lead.assignedTo}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                          <div>
                            <p><strong>Email:</strong> {lead.email}</p>
                            <p><strong>Telefoon:</strong> {lead.phone}</p>
                            {lead.company && <p><strong>Bedrijf:</strong> {lead.company}</p>}
                          </div>
                          
                          <div>
                            <p><strong>Interesse:</strong> {lead.interestedVehicle || 'Niet gespecificeerd'}</p>
                            <p><strong>Budget:</strong> {lead.budget ? `€ ${lead.budget.toLocaleString()}` : 'Niet opgegeven'}</p>
                            <p><strong>Bron:</strong> {lead.source}</p>
                          </div>
                          
                          <div>
                            <p><strong>Aangemaakt:</strong> {format(new Date(lead.createdAt), 'dd/MM/yyyy')}</p>
                            {lead.lastContactDate && (
                              <p><strong>Laatste contact:</strong> {format(new Date(lead.lastContactDate), 'dd/MM/yyyy')}</p>
                            )}
                            <p><strong>Activiteiten:</strong> {lead.totalActivities}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4 text-right">
                        <div className="text-lg font-semibold text-green-600">
                          {lead.conversionProbability}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          conversiekans
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pipeline">
            <LeadPipeline 
              leads={leads} 
              onLeadClick={setSelectedLead}
              onStatusClick={handleStatusFilterClick}
            />
          </TabsContent>

          <TabsContent value="search">
            <LeadSearchRequests />
          </TabsContent>
        </Tabs>

        {/* AI Assistant Modal */}
        {showAIAssistant && (
          <LeadAIAssistant
            onClose={() => setShowAIAssistant(false)}
          />
        )}

        {/* Bulk Email Composer */}
        {showEmailComposer && (
          <LeadEmailComposer
            leads={filteredLeads}
            onClose={() => setShowEmailComposer(false)}
            onSent={() => setShowEmailComposer(false)}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Leads;
