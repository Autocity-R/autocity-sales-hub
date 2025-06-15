
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Database, Users, Car, Calendar, FileText, Activity, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SystemDataAccess, getAgentContexts, createAgentContext, updateAgentDataPermissions } from "@/services/systemDataService";

interface Agent {
  id: string;
  name: string;
  data_access_permissions: SystemDataAccess;
  context_settings: any;
  capabilities: string[];
}

const fetchAgentsWithData = async (): Promise<Agent[]> => {
  const { data, error } = await supabase
    .from('ai_agents')
    .select('id, name, data_access_permissions, context_settings, capabilities')
    .eq('is_active', true);
  
  if (error) throw error;
  return data || [];
};

export const AgentDataManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [permissions, setPermissions] = useState<SystemDataAccess>({
    leads: false,
    customers: false,
    vehicles: false,
    appointments: false,
    contracts: false
  });
  const [contextSettings, setContextSettings] = useState({
    include_recent_activity: true,
    max_context_items: 10,
    preferred_data_sources: []
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-with-data'],
    queryFn: fetchAgentsWithData,
  });

  const { data: contexts = [] } = useQuery({
    queryKey: ['agent-contexts', selectedAgent],
    queryFn: () => getAgentContexts(selectedAgent),
    enabled: !!selectedAgent,
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ agentId, permissions, settings }: {
      agentId: string;
      permissions: SystemDataAccess;
      settings: any;
    }) => {
      return updateAgentDataPermissions(agentId, permissions, settings);
    },
    onSuccess: () => {
      toast({
        title: "Succes",
        description: "Agent data toegang bijgewerkt",
      });
      queryClient.invalidateQueries({ queryKey: ['agents-with-data'] });
    },
    onError: (error) => {
      toast({
        title: "Fout",
        description: `Kon instellingen niet opslaan: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const selectedAgentData = agents.find(agent => agent.id === selectedAgent);

  React.useEffect(() => {
    if (selectedAgentData) {
      setPermissions(selectedAgentData.data_access_permissions || {
        leads: false,
        customers: false,
        vehicles: false,
        appointments: false,
        contracts: false
      });
      setContextSettings(selectedAgentData.context_settings || {
        include_recent_activity: true,
        max_context_items: 10,
        preferred_data_sources: []
      });
    }
  }, [selectedAgentData]);

  const handleSavePermissions = () => {
    if (!selectedAgent) return;
    
    updatePermissionsMutation.mutate({
      agentId: selectedAgent,
      permissions,
      settings: contextSettings
    });
  };

  const getDataTypeIcon = (type: string) => {
    switch (type) {
      case 'leads': return <Users className="h-4 w-4" />;
      case 'customers': return <Users className="h-4 w-4" />;
      case 'vehicles': return <Car className="h-4 w-4" />;
      case 'appointments': return <Calendar className="h-4 w-4" />;
      case 'contracts': return <FileText className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const getDataTypeLabel = (type: string) => {
    switch (type) {
      case 'leads': return 'Leads';
      case 'customers': return 'Klanten';
      case 'vehicles': return 'Voertuigen';
      case 'appointments': return 'Afspraken';
      case 'contracts': return 'Contracten';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Agent Data Toegang
          </CardTitle>
          <CardDescription>
            Beheer welke data elke AI agent kan benaderen en gebruiken
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Agent Selection */}
            <div>
              <Label htmlFor="agent-select">Selecteer Agent</Label>
              <select
                id="agent-select"
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="w-full mt-1 p-2 border rounded-md"
              >
                <option value="">Kies een AI agent</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedAgent && selectedAgentData && (
              <div className="space-y-6">
                {/* Current Capabilities */}
                <div>
                  <Label>Huidige Capabilities</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedAgentData.capabilities?.map((capability, index) => (
                      <Badge key={index} variant="outline">
                        {capability}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Data Access Permissions */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Data Toegang Permissies</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(permissions).map(([dataType, hasAccess]) => (
                      <div key={dataType} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          {getDataTypeIcon(dataType)}
                          <span className="font-medium">{getDataTypeLabel(dataType)}</span>
                        </div>
                        <Switch
                          checked={hasAccess}
                          onCheckedChange={(checked) => setPermissions({
                            ...permissions,
                            [dataType]: checked
                          })}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Context Settings */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Context Instellingen</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="recent-activity"
                        checked={contextSettings.include_recent_activity}
                        onCheckedChange={(checked) => setContextSettings({
                          ...contextSettings,
                          include_recent_activity: checked
                        })}
                      />
                      <Label htmlFor="recent-activity">Recente activiteit meesturen</Label>
                    </div>

                    <div>
                      <Label htmlFor="max-items">Maximum aantal context items</Label>
                      <Input
                        id="max-items"
                        type="number"
                        value={contextSettings.max_context_items}
                        onChange={(e) => setContextSettings({
                          ...contextSettings,
                          max_context_items: parseInt(e.target.value) || 10
                        })}
                        min="1"
                        max="50"
                        className="w-full mt-1"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Context Queries */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Actieve Context Queries</h3>
                  {contexts.length > 0 ? (
                    <div className="space-y-3">
                      {contexts.map((context) => (
                        <Card key={context.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{context.context_type}</Badge>
                                  <span className="text-sm text-muted-foreground">
                                    Prioriteit: {context.priority}
                                  </span>
                                </div>
                                <p className="text-sm mt-1 font-mono bg-gray-100 p-2 rounded">
                                  {context.query_template.substring(0, 100)}...
                                </p>
                              </div>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      Geen context queries geconfigureerd
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <Button 
                  onClick={handleSavePermissions}
                  disabled={updatePermissionsMutation.isPending}
                  className="w-full"
                >
                  {updatePermissionsMutation.isPending ? 'Opslaan...' : 'Instellingen Opslaan'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Access Summary */}
      {selectedAgent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Data Toegang Overzicht
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(permissions).map(([dataType, hasAccess]) => (
                <div key={dataType} className={`p-3 rounded-lg border ${hasAccess ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getDataTypeIcon(dataType)}
                    <span className="font-medium">{getDataTypeLabel(dataType)}</span>
                  </div>
                  <Badge variant={hasAccess ? "default" : "secondary"}>
                    {hasAccess ? "Toegang" : "Geen toegang"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
