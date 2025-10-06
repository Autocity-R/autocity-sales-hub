import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lead, LeadStatus } from "@/types/leads";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LeadDetail } from "@/components/leads/LeadDetail";
import { LeadForm } from "@/components/leads/LeadForm";
import { LeadListView } from "@/components/leads/LeadListView";
import { LeadEmailComposer } from "@/components/leads/LeadEmailComposer";
import { LeadAIAssistant } from "@/components/leads/LeadAIAssistant";
import { DisqualifyLeadDialog } from "@/components/leads/DisqualifyLeadDialog";
import { ReprocessLeadsButton } from "@/components/leads/ReprocessLeadsButton";
import { useSalespeople } from "@/hooks/useSalespeople";
import { 
  Plus, 
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
import { LeadSearchRequests } from "@/components/leads/LeadSearchRequests";
import { KanbanBoard } from "@/components/leads/KanbanBoard";
import { AnalyticsDashboard } from "@/components/leads/AnalyticsDashboard";

const Leads = () => {
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [activeTab, setActiveTab] = useState("pipeline");
  const [disqualifyLead, setDisqualifyLead] = useState<Lead | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'kanban' | 'analytics'>('list');
  
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
                'other') as Lead['source'],
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
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleDisqualifyLead = async (reason: string, notes: string) => {
    if (!disqualifyLead) return;

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: 'lost' })
        .eq('id', disqualifyLead.id);

      if (error) throw error;

      toast({
        title: "Lead gediskwalificeerd",
        description: `${reason}${notes ? ': ' + notes : ''}`,
      });

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
      const { data, error } = await supabase.functions.invoke('process-lead-emails', { body: { batchSize: 5 } });
      if (error) throw error;
      
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
      toast({ 
        title: created > 0 ? "✅ Email sync succesvol" : "Email sync voltooid",
        description: `${created} nieuwe lead${created !== 1 ? 's' : ''} aangemaakt`,
      });

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
          title="Leads" 
          description="Beheer al je leads efficiënt"
        >
          <div className="flex gap-2">
            <Button onClick={handleManualEmailSync} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Gmail Sync
            </Button>
            <ReprocessLeadsButton />
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nieuw</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.byStatus.new || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gecontacteerd</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.byStatus.contacted || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Offerte</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.byStatus.proposal || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gewonnen</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.byStatus.won || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* View Selector */}
        <div className="flex gap-2 mb-6">
          <Button 
            variant={currentView === 'list' ? 'default' : 'outline'}
            onClick={() => setCurrentView('list')}
            className="flex items-center gap-2 px-4 py-2 shadow-sm"
          >
            <span>📊</span>
            <span>Lijstweergave</span>
          </Button>
          <Button 
            variant={currentView === 'kanban' ? 'default' : 'outline'}
            onClick={() => setCurrentView('kanban')}
            className="flex items-center gap-2 px-4 py-2 shadow-sm"
          >
            <span>📋</span>
            <span>Kanban Board</span>
          </Button>
          <Button 
            variant={currentView === 'analytics' ? 'default' : 'outline'}
            onClick={() => setCurrentView('analytics')}
            className="flex items-center gap-2 px-4 py-2 shadow-sm"
          >
            <span>📈</span>
            <span>Analytics</span>
          </Button>
        </div>

        {currentView === 'list' && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="pipeline">Alle Leads</TabsTrigger>
            <TabsTrigger value="active">Actieve Leads</TabsTrigger>
            <TabsTrigger value="won">Gewonnen</TabsTrigger>
            <TabsTrigger value="lost">Verloren</TabsTrigger>
            <TabsTrigger value="search">Zoekopdrachten</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="space-y-4">
            <LeadListView
              leads={leads || []}
              onLeadClick={setSelectedLead}
              onDisqualifyLead={setDisqualifyLead}
              salespeople={salespeople}
            />
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <LeadListView
              leads={leads?.filter(l => ['new', 'contacted', 'qualified', 'proposal', 'negotiation'].includes(l.status)) || []}
              onLeadClick={setSelectedLead}
              onDisqualifyLead={setDisqualifyLead}
              salespeople={salespeople}
            />
          </TabsContent>

          <TabsContent value="won" className="space-y-4">
            <LeadListView
              leads={leads?.filter(l => l.status === 'won') || []}
              onLeadClick={setSelectedLead}
              onDisqualifyLead={setDisqualifyLead}
              salespeople={salespeople}
            />
          </TabsContent>

          <TabsContent value="lost" className="space-y-4">
            <LeadListView
              leads={leads?.filter(l => l.status === 'lost') || []}
              onLeadClick={setSelectedLead}
              onDisqualifyLead={setDisqualifyLead}
              salespeople={salespeople}
            />
          </TabsContent>

          <TabsContent value="search">
            <LeadSearchRequests />
          </TabsContent>
        </Tabs>
        )}

        {currentView === 'kanban' && (
          <div className="bg-white rounded-xl shadow-sm">
            <KanbanBoard 
              leads={leads || []} 
              onLeadClick={setSelectedLead}
              salespeople={salespeople}
            />
          </div>
        )}

        {currentView === 'analytics' && (
          <div className="bg-white rounded-xl shadow-sm">
            <AnalyticsDashboard leads={leads || []} />
          </div>
        )}

        {/* Disqualify Dialog */}
        <DisqualifyLeadDialog
          open={!!disqualifyLead}
          onClose={() => setDisqualifyLead(null)}
          onDisqualify={handleDisqualifyLead}
          leadName={disqualifyLead ? `${disqualifyLead.firstName} ${disqualifyLead.lastName}` : ''}
        />

        {/* Global Email Composer */}
        {showEmailComposer && !selectedLead && (
          <LeadEmailComposer
            lead={null}
            onClose={() => setShowEmailComposer(false)}
            onSent={() => setShowEmailComposer(false)}
          />
        )}

        {/* Global AI Assistant */}
        {showAIAssistant && !selectedLead && (
          <LeadAIAssistant
            lead={null}
            onClose={() => setShowAIAssistant(false)}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Leads;
