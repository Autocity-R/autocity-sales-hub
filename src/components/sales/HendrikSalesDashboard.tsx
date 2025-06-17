
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Mail, 
  TrendingUp, 
  Clock, 
  Star, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageSquare,
  Target,
  Brain
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getRecentEmailAnalyses,
  getPendingResponseSuggestions,
  updateResponseSuggestionStatus,
  initializeHendrikAgent
} from "@/services/salesAgentService";

export const HendrikSalesDashboard = () => {
  const { toast } = useToast();
  const [emailAnalyses, setEmailAnalyses] = useState([]);
  const [responseSuggestions, setResponseSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      setIsLoading(true);
      
      // Initialize Hendrik agent if not exists
      await initializeHendrikAgent();
      
      // Load dashboard data
      const [analyses, suggestions] = await Promise.all([
        getRecentEmailAnalyses(20),
        getPendingResponseSuggestions()
      ]);

      setEmailAnalyses(analyses);
      setResponseSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to initialize dashboard:', error);
      toast({
        title: "⚠️ Dashboard Fout",
        description: "Kon dashboard niet laden. Probeer opnieuw.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponseAction = async (suggestionId: string, action: string, modifications?: string) => {
    try {
      await updateResponseSuggestionStatus(suggestionId, action, modifications);
      
      // Update local state
      setResponseSuggestions(prev => 
        prev.filter(suggestion => suggestion.id !== suggestionId)
      );

      toast({
        title: "✅ Actie Voltooid",
        description: `Response ${action === 'sent_as_suggested' ? 'verzonden' : action === 'rejected' ? 'afgewezen' : 'gewijzigd en verzonden'}.`,
      });
    } catch (error) {
      console.error('Failed to update response:', error);
      toast({
        title: "❌ Fout",
        description: "Kon actie niet voltooien.",
        variant: "destructive",
      });
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Hoog</Badge>;
      case 'medium':
        return <Badge variant="default" className="gap-1"><Clock className="h-3 w-3" />Normaal</Badge>;
      case 'low':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Laag</Badge>;
      default:
        return <Badge variant="secondary">{urgency}</Badge>;
    }
  };

  const getLeadScoreBadge = (score: number) => {
    if (score >= 80) return <Badge variant="default" className="bg-green-600">A-klasse ({score})</Badge>;
    if (score >= 60) return <Badge variant="default" className="bg-blue-600">B-klasse ({score})</Badge>;
    if (score >= 40) return <Badge variant="default" className="bg-yellow-600">C-klasse ({score})</Badge>;
    return <Badge variant="outline" className="text-red-600">D-klasse ({score})</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Brain className="h-8 w-8 animate-pulse mx-auto mb-2" />
          <p>Hendrik wordt geïnitialiseerd...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Hendrik Sales Dashboard</h2>
          <p className="text-muted-foreground">AI-powered sales intelligence en email analyse</p>
        </div>
        <Button onClick={initializeDashboard} variant="outline">
          <Brain className="h-4 w-4 mr-2" />
          Vernieuwen
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Geanalyseerd</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailAnalyses.length}</div>
            <p className="text-xs text-muted-foreground">Laatste 20 analyses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wachtende Suggesties</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{responseSuggestions.length}</div>
            <p className="text-xs text-muted-foreground">Vereisen team actie</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoge Prioriteit</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {responseSuggestions.filter(s => s.priority_level === 'high').length}
            </div>
            <p className="text-xs text-muted-foreground">Urgente responses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A-Klasse Leads</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {emailAnalyses.filter(e => e.lead_score >= 80).length}
            </div>
            <p className="text-xs text-muted-foreground">Hoogwaardige prospects</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="suggestions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="suggestions">Response Suggesties ({responseSuggestions.length})</TabsTrigger>
          <TabsTrigger value="analyses">Email Analyses ({emailAnalyses.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Wachtende Response Suggesties
              </CardTitle>
              <CardDescription>
                Door Hendrik gegenereerde response suggesties die team actie vereisen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {responseSuggestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Geen wachtende suggesties</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {responseSuggestions.map((suggestion) => (
                    <div key={suggestion.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">
                              {suggestion.leads?.first_name} {suggestion.leads?.last_name}
                            </h4>
                            {getUrgencyBadge(suggestion.priority_level)}
                            <Badge variant="outline">{suggestion.response_type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {suggestion.ai_email_processing?.subject}
                          </p>
                          <p className="text-sm">
                            Van: {suggestion.ai_email_processing?.sender_email}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleResponseAction(suggestion.id, 'sent_as_suggested')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Verzenden
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleResponseAction(suggestion.id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Afwijzen
                          </Button>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h5 className="font-medium mb-2">Voorgestelde Response:</h5>
                        <div className="bg-gray-50 p-3 rounded border text-sm">
                          {suggestion.suggested_response}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analyses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recente Email Analyses
              </CardTitle>
              <CardDescription>
                Door Hendrik geanalyseerde inkomende emails met lead scoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emailAnalyses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nog geen email analyses beschikbaar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {emailAnalyses.map((analysis) => (
                    <div key={analysis.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-semibold">{analysis.subject}</h4>
                          <p className="text-sm text-muted-foreground">
                            Van: {analysis.sender_email}
                          </p>
                          <p className="text-sm">
                            {new Date(analysis.processed_at).toLocaleString('nl-NL')}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          {getLeadScoreBadge(analysis.lead_score)}
                          {getUrgencyBadge(analysis.urgency_level)}
                          {analysis.intent_classification && (
                            <Badge variant="secondary">{analysis.intent_classification}</Badge>
                          )}
                        </div>
                      </div>
                      
                      {analysis.content_summary && (
                        <>
                          <Separator />
                          <div>
                            <h5 className="font-medium mb-1">Samenvatting:</h5>
                            <p className="text-sm text-muted-foreground">{analysis.content_summary}</p>
                          </div>
                        </>
                      )}
                      
                      {analysis.competitive_mentions && analysis.competitive_mentions.length > 0 && (
                        <div>
                          <h5 className="font-medium mb-1">Concurrentie Mentions:</h5>
                          <div className="flex gap-1 flex-wrap">
                            {analysis.competitive_mentions.map((mention, index) => (
                              <Badge key={index} variant="outline" className="text-orange-600">
                                {mention}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
