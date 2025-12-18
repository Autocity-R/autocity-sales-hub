import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Calendar, 
  TrendingUp, 
  RefreshCw, 
  Download, 
  Check, 
  Clock,
  AlertCircle,
  Loader2,
  Sun,
  CalendarDays,
  Target
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, isToday, isThisWeek, isThisMonth } from "date-fns";
import { nl } from "date-fns/locale";
import { exportBriefingToExcel, exportBriefingToPDF } from "@/utils/briefingExport";

// Hendrik's agent ID
const HENDRIK_AGENT_ID = '43004cb6-26e9-4453-861d-75ff8dffb3fe';

interface Briefing {
  id: string;
  agent_id: string;
  briefing_type: string;
  briefing_date: string;
  content: string;
  summary: string | null;
  alerts_included: number | null;
  memories_used: number | null;
  is_read: boolean | null;
  read_at: string | null;
  created_at: string | null;
}

const BriefingTypeConfig = {
  daily: {
    icon: Sun,
    label: "Dagelijks",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    description: "Dagelijkse performance briefing"
  },
  weekly: {
    icon: CalendarDays,
    label: "Wekelijks",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    description: "Wekelijkse strategie sessie"
  },
  monthly: {
    icon: Target,
    label: "Maandelijks",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    description: "Maandelijkse deep dive"
  }
};

export const HendrikBriefingDashboard = () => {
  const queryClient = useQueryClient();
  const [selectedBriefing, setSelectedBriefing] = useState<Briefing | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [generatingType, setGeneratingType] = useState<string | null>(null);

  // Fetch all briefings for Hendrik
  const { data: briefings, isLoading: briefingsLoading, refetch: refetchBriefings } = useQuery({
    queryKey: ['hendrik-briefings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_briefings')
        .select('*')
        .eq('agent_id', HENDRIK_AGENT_ID)
        .order('briefing_date', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as Briefing[];
    }
  });

  // Generate new briefing mutation
  const generateBriefingMutation = useMutation({
    mutationFn: async (briefingType: string) => {
      setGeneratingType(briefingType);
      const { data, error } = await supabase.functions.invoke('hendrik-generate-briefing', {
        body: { briefingType }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${data.briefingType === 'daily' ? 'Dagelijkse' : data.briefingType === 'weekly' ? 'Wekelijkse' : 'Maandelijkse'} briefing gegenereerd`);
      refetchBriefings();
      setGeneratingType(null);
    },
    onError: (error) => {
      console.error('Error generating briefing:', error);
      toast.error('Kon briefing niet genereren');
      setGeneratingType(null);
    }
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (briefingId: string) => {
      const { error } = await supabase
        .from('ai_briefings')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', briefingId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hendrik-briefings'] });
    }
  });

  // Handle briefing selection
  const handleSelectBriefing = (briefing: Briefing) => {
    setSelectedBriefing(briefing);
    if (!briefing.is_read) {
      markAsReadMutation.mutate(briefing.id);
    }
  };

  // Filter briefings by type
  const filteredBriefings = briefings?.filter(b => {
    if (activeTab === "all") return true;
    return b.briefing_type === activeTab;
  }) || [];

  // Count unread briefings
  const unreadCount = briefings?.filter(b => !b.is_read).length || 0;

  // Get latest briefing by type
  const getLatestByType = (type: string) => {
    return briefings?.find(b => b.briefing_type === type);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Hendrik's Briefings</h2>
          <p className="text-muted-foreground">
            Automatische CEO briefings van Hendrik
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="destructive" className="mr-2">
              {unreadCount} ongelezen
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => refetchBriefings()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Vernieuwen
          </Button>
        </div>
      </div>

      {/* Quick Generate Buttons */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(BriefingTypeConfig).map(([type, config]) => {
          const latest = getLatestByType(type);
          const Icon = config.icon;
          const isGenerating = generatingType === type;
          
          return (
            <Card key={type} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                      <CardDescription className="text-xs">{config.description}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {latest ? (
                  <div className="text-xs text-muted-foreground mb-2">
                    Laatst: {format(parseISO(latest.briefing_date), 'd MMM yyyy', { locale: nl })}
                    {!latest.is_read && (
                      <Badge variant="secondary" className="ml-2 text-xs">Nieuw</Badge>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground mb-2">Nog geen briefing</div>
                )}
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => generateBriefingMutation.mutate(type)}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Genereren...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Genereer Nu
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Briefing List */}
        <div className="col-span-4">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">Alle</TabsTrigger>
                  <TabsTrigger value="daily">Dag</TabsTrigger>
                  <TabsTrigger value="weekly">Week</TabsTrigger>
                  <TabsTrigger value="monthly">Maand</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-[500px]">
                {briefingsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredBriefings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <FileText className="h-8 w-8 mb-2" />
                    <p className="text-sm">Geen briefings gevonden</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredBriefings.map((briefing) => {
                      const config = BriefingTypeConfig[briefing.briefing_type as keyof typeof BriefingTypeConfig];
                      const Icon = config?.icon || FileText;
                      const isSelected = selectedBriefing?.id === briefing.id;
                      
                      return (
                        <div
                          key={briefing.id}
                          className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                            isSelected ? 'bg-muted' : ''
                          } ${!briefing.is_read ? 'border-l-2 border-l-primary' : ''}`}
                          onClick={() => handleSelectBriefing(briefing)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-1.5 rounded ${config?.color || 'bg-muted'}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-sm">
                                  {config?.label || briefing.briefing_type}
                                </span>
                                {!briefing.is_read && (
                                  <Badge variant="default" className="text-xs px-1.5 py-0">
                                    Nieuw
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {briefing.summary || 'Geen samenvatting'}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {format(parseISO(briefing.briefing_date), 'd MMMM yyyy', { locale: nl })}
                                {briefing.alerts_included && briefing.alerts_included > 0 && (
                                  <Badge variant="outline" className="text-xs px-1">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    {briefing.alerts_included}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Briefing Detail */}
        <div className="col-span-8">
          <Card className="h-[600px] flex flex-col">
            {selectedBriefing ? (
              <>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const config = BriefingTypeConfig[selectedBriefing.briefing_type as keyof typeof BriefingTypeConfig];
                        const Icon = config?.icon || FileText;
                        return (
                          <>
                            <div className={`p-2 rounded-lg ${config?.color || 'bg-muted'}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">
                                {config?.label || selectedBriefing.briefing_type} Briefing
                              </CardTitle>
                              <CardDescription>
                                {format(parseISO(selectedBriefing.briefing_date), 'EEEE d MMMM yyyy', { locale: nl })}
                              </CardDescription>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportBriefingToExcel(selectedBriefing)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Excel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportBriefingToPDF(selectedBriefing)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                    </div>
                  </div>
                  
                  {/* Meta info */}
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    {selectedBriefing.alerts_included !== null && (
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {selectedBriefing.alerts_included} alerts
                      </div>
                    )}
                    {selectedBriefing.memories_used !== null && (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        {selectedBriefing.memories_used} inzichten gebruikt
                      </div>
                    )}
                    {selectedBriefing.is_read && selectedBriefing.read_at && (
                      <div className="flex items-center gap-1">
                        <Check className="h-4 w-4 text-green-500" />
                        Gelezen {format(parseISO(selectedBriefing.read_at), 'd MMM HH:mm', { locale: nl })}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full p-6">
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                      {selectedBriefing.content}
                    </div>
                  </ScrollArea>
                </CardContent>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <FileText className="h-12 w-12 mb-4" />
                <p className="text-lg font-medium">Selecteer een briefing</p>
                <p className="text-sm">Klik op een briefing in de lijst om de details te bekijken</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
