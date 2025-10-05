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
import { LeadForm } from "@/components/leads/LeadForm";
import { LeadKanbanBoard } from "@/components/leads/LeadKanbanBoard";
import { LeadDetailSidebar } from "@/components/leads/LeadDetailSidebar";
import { useSalespeople } from "@/hooks/useSalespeople";
import { 
  Plus, 
  Search, 
  Filter, 
  Users, 
  TrendingUp, 
  Clock,
  Target,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const Leads = () => {
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewFilter, setViewFilter] = useState<"all" | "mine" | "unassigned">("all");
  
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
        created_at: dbLead.created_at,
        updatedAt: dbLead.updated_at,
        assignedTo: dbLead.assigned_to || undefined,
        owner_id: dbLead.owner_id || undefined,
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
    
    // TODO: Replace with actual auth.uid() check
    const currentUserId = "current-user-id"; 
    
    if (viewFilter === "mine") {
      return matchesSearch && lead.owner_id === currentUserId;
    } else if (viewFilter === "unassigned") {
      return matchesSearch && !lead.owner_id;
    }
    
    return matchesSearch; // "all" filter
  });


  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });

      toast({
        title: "Status bijgewerkt",
        description: "Lead status is succesvol gewijzigd",
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Fout",
        description: "Kon lead status niet bijwerken",
        variant: "destructive",
      });
    }
  };

  const handleOwnerChange = async (leadId: string, ownerId: string | null) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ owner_id: ownerId })
        .eq('id', leadId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['leads'] });

      toast({
        title: "Eigenaar bijgewerkt",
        description: "Lead eigenaar is succesvol gewijzigd",
      });
    } catch (error) {
      console.error('Error updating owner:', error);
      toast({
        title: "Fout",
        description: "Kon lead eigenaar niet bijwerken",
        variant: "destructive",
      });
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setSidebarOpen(true);
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
          title="Lead Management Dashboard"
          description="Kanban overzicht van alle verkoopkansen"
        >
          <div className="flex gap-2">
            <Button onClick={handleManualEmailSync} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Sync Emails
            </Button>
            <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nieuwe Lead
            </Button>
          </div>
        </PageHeader>

        {/* View Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Zoek leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={viewFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewFilter("all")}
            >
              Alle Leads
            </Button>
            <Button
              variant={viewFilter === "mine" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewFilter("mine")}
            >
              Mijn Leads
            </Button>
            <Button
              variant={viewFilter === "unassigned" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewFilter("unassigned")}
            >
              Niet-toegewezen
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : (
          <LeadKanbanBoard
            leads={filteredLeads}
            onLeadClick={handleLeadClick}
            onStatusChange={handleStatusChange}
          />
        )}

        {/* Lead Detail Sidebar */}
        <LeadDetailSidebar
          lead={selectedLead}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onStatusChange={handleStatusChange}
          onOwnerChange={handleOwnerChange}
        />

            {/* Enhanced Leads List */}
            <div className="grid gap-4">
              {isLoading ? (
                // Loading skeletons
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-24 w-full" />
                    </CardContent>
                  </Card>
                ))
              ) : filteredLeads.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center text-muted-foreground">
                    <p>Geen leads gevonden</p>
                  </CardContent>
                </Card>
              ) : (
                filteredLeads.map((lead) => (
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
                ))
              )}
            </div>
      </div>
    </DashboardLayout>
  );
};

export default Leads;
