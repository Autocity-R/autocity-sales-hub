import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lead, LeadStatus, LeadSource } from "@/types/leads";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadDetail } from "@/components/leads/LeadDetail";
import { LeadForm } from "@/components/leads/LeadForm";
import { LeadPipeline } from "@/components/leads/LeadPipeline";
import { LeadListView } from "@/components/leads/LeadListView";
import { LeadEmailComposer } from "@/components/leads/LeadEmailComposer";
import { LeadAIAssistant } from "@/components/leads/LeadAIAssistant";
import { LeadListCard } from "@/components/leads/LeadListCard";
import { DisqualifyLeadDialog } from "@/components/leads/DisqualifyLeadDialog";
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
  RefreshCw,
  LayoutGrid,
  List,
  Archive
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { LeadSearchRequests } from "@/components/leads/LeadSearchRequests";

const Leads = () => {
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [activeTab, setActiveTab] = useState("pipeline");
  const [assignedToFilter, setAssignedToFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showArchived, setShowArchived] = useState(false);
  const [disqualifyLead, setDisqualifyLead] = useState<Lead | null>(null);
  
  const { data: salespeople = [] } = useSalespeople();

  // Fetch leads from Supabase
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Map database fields to Lead type
      return (data || []).map(dbLead => ({
        id: dbLead.id,
        status: dbLead.status as LeadStatus,
        priority: (dbLead.priority || 'medium') as Lead['priority'],
        source: (dbLead.source_email?.includes('marktplaats') ? 'marktplaats' : 
                dbLead.source_email?.includes('autotrack') ? 'autotrack' :
                dbLead.source_email?.includes('autoscout24') ? 'facebook' : 
                'other') as LeadSource,
        firstName: dbLead.first_name || '',
        lastName: dbLead.last_name || '',
        email: dbLead.email || '',
        phone: dbLead.phone || '',
        company: undefined,
        interestedVehicle: dbLead.interested_vehicle || undefined,
        budget: undefined,
        timeline: undefined,
        notes: '',
        createdAt: dbLead.created_at,
        updatedAt: dbLead.updated_at,
        assignedTo: dbLead.assigned_to || undefined,
        lastContactDate: dbLead.last_email_date || undefined,
        nextFollowUpDate: undefined,
        responseTime: undefined,
        totalActivities: 0,
        conversionProbability: dbLead.lead_score || 50,
      })) as Lead[];
    },
  });

  // Fetch stats from database
  const { data: stats = { total: 0, byStatus: {}, avgResponseTime: 0 } } = useQuery({
    queryKey: ['lead-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('status');
      
      if (error) throw error;

      const byStatus = (data || []).reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total: data?.length || 0,
        byStatus,
        avgResponseTime: 0,
      };
    },
  });

  // Realtime subscription for new leads
  useEffect(() => {
    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads'
        },
        () => {
          // Refresh leads when new ones are inserted
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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

  const handleDisqualifyLead = async (reason: string, notes: string) => {
    if (!disqualifyLead) return;

    try {
      // Update lead status to 'lost'
      const { error } = await supabase
        .from('leads')
        .update({ status: 'lost' })
        .eq('id', disqualifyLead.id);

      if (error) throw error;

      // Log activity
      // TODO: Add to activities table with reason and notes

      toast({
        title: "Lead gediskwalificeerd",
        description: `${reason}${notes ? ': ' + notes : ''}`,
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
      
      setDisqualifyLead(null);
    } catch (error) {
      console.error("Error disqualifying lead:", error);
      toast({ 
        title: "Fout bij diskwalificeren", 
        variant: "destructive" 
      });
    }
  };

  const handleManualEmailSync = async () => {
    toast({ title: "Email synchronisatie gestart..." });
    try {
      const { data, error } = await supabase.functions.invoke('process-lead-emails');
      if (error) throw error;
      console.log("Sync resultaat:", data);
      
      // Check voor niet-succesvolle sync (transient errors)
      if (data?.success === false) {
        const errorMessages: Record<string, string> = {
          'rate_limit_exceeded': 'Gmail API rate limit bereikt. Probeer over een paar minuten opnieuw.',
          'gmail_api_timeout': 'Gmail API tijdelijk niet bereikbaar. Probeer later opnieuw.',
          'gmail_search_error': 'Fout bij ophalen emails van Gmail.',
          'critical_error': 'Er is een fout opgetreden bij het verwerken van emails.'
        };
        
        toast({ 
          title: "⚠️ Email sync tijdelijk niet mogelijk",
          description: errorMessages[data.errorType] || data.error || 'Onbekende fout',
          variant: "destructive"
        });
        return;
      }
      
      const created = data?.created ?? 0;
      const updated = data?.updated ?? 0;
      const parseErrors = data?.parseErrors ?? 0;
      const ignoredMarktplaats = data?.ignoredMarktplaats ?? 0;
      const missedCalls = data?.missedCalls ?? 0;
      const tradeIns = data?.tradeIns ?? 0;
      const financialLeads = data?.financialLeads ?? 0;
      const rateLimitSkipped = data?.rateLimitSkipped ?? 0;
      const sourceBreakdown = data?.sourceBreakdown ?? {};
      
      // Build detailed description with highlights
      const details = [];
      if (financialLeads > 0) details.push(`💼 ${financialLeads} financial lease`);
      if (tradeIns > 0) details.push(`🔁 ${tradeIns} inruil`);
      if (missedCalls > 0) details.push(`📞 ${missedCalls} gemiste oproep`);
      
      let description = '';
      
      if (created > 0) {
        description += `${created} nieuwe lead${created !== 1 ? 's' : ''} aangemaakt`;
        if (details.length > 0) description += ` (${details.join(', ')})`;
        description += '\n';
      }
      
      if (updated > 0) {
        description += `${updated} bestaande thread${updated !== 1 ? 's' : ''} bijgewerkt\n`;
      }
      
      if (ignoredMarktplaats > 0) {
        description += `${ignoredMarktplaats} Marktplaats notificatie${ignoredMarktplaats !== 1 ? 's' : ''} genegeerd\n`;
      }
      
      if (rateLimitSkipped > 0) {
        description += `⏭️ ${rateLimitSkipped} email${rateLimitSkipped !== 1 ? 's' : ''} overgeslagen (rate limit)\n`;
      }
      
      if (parseErrors > 0) {
        description += `⚠️ ${parseErrors} email${parseErrors !== 1 ? 's' : ''} niet herkend\n`;
      }
      
      // Add source breakdown
      if (Object.keys(sourceBreakdown).length > 0) {
        description += '\n📊 Per bron:\n';
        Object.entries(sourceBreakdown).forEach(([source, counts]: [string, any]) => {
          description += `  • ${source}: ${counts.created || 0} nieuw\n`;
        });
      }
      
      toast({ 
        title: created > 0 ? "✅ Email sync succesvol" : "Email sync voltooid",
        description: description.trim(),
        variant: created > 0 ? "default" : parseErrors > 0 ? "destructive" : "default"
      });

      // Refresh leads after successful sync
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
    } catch (error) {
      console.error("Email sync error:", error);
      toast({ title: "❌ Fout bij email synchronisatie", variant: "destructive" });
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
          description="Schaalbaar lead systeem met kwalificatie workflow"
        >
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowArchived(!showArchived)} 
              variant="outline" 
              className="gap-2"
            >
              <Archive className="h-4 w-4" />
              {showArchived ? 'Verberg Archief' : 'Toon Archief'}
            </Button>
            <Button onClick={handleManualEmailSync} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Gmail Sync
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
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="pipeline">Verkooppijplijn</TabsTrigger>
              <TabsTrigger value="search">Zoekopdrachten</TabsTrigger>
            </TabsList>

            {activeTab === 'pipeline' && (
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('kanban')}
                  className="gap-2"
                >
                  <LayoutGrid className="h-4 w-4" />
                  Kanban
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="gap-2"
                >
                  <List className="h-4 w-4" />
                  Lijst
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="pipeline" className="space-y-4">
            {viewMode === 'kanban' ? (
              <LeadPipeline 
                leads={filteredLeads}
                onLeadClick={setSelectedLead}
                onStatusClick={handleStatusFilterClick}
                onDisqualifyClick={setDisqualifyLead}
                showArchived={showArchived}
              />
            ) : (
              <LeadListView 
                leads={filteredLeads}
                onLeadClick={setSelectedLead}
                salespeople={salespeople}
              />
            )}
          </TabsContent>

          <TabsContent value="search">
            <LeadSearchRequests />
          </TabsContent>
        </Tabs>

        {/* AI Assistant Modal */}
        {showAIAssistant && (
          <LeadAIAssistant
            lead={null}
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

        {/* Disqualify Lead Dialog */}
        {disqualifyLead && (
          <DisqualifyLeadDialog
            open={!!disqualifyLead}
            onClose={() => setDisqualifyLead(null)}
            onDisqualify={handleDisqualifyLead}
            leadName={`${disqualifyLead.firstName} ${disqualifyLead.lastName}`}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Leads;
