
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MessageSquare, 
  Send, 
  Brain, 
  TrendingUp, 
  Target,
  Lightbulb,
  BookOpen
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProductionAIChat } from "@/hooks/useProductionAIChat";
import { logSalesInteraction } from "@/services/salesAgentService";

export const SalesAgentChat = () => {
  const { toast } = useToast();
  const [learningMode, setLearningMode] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  const {
    agents,
    selectedAgent,
    selectedAgentData,
    session,
    messages,
    message,
    agentsLoading,
    chatLoading,
    isInitializing,
    handleSendMessage,
    handleKeyPress,
    handleAgentChange,
    setMessage,
  } = useProductionAIChat();

  // Filter to show only Hendrik
  const hendrikAgent = agents.find(agent => agent.name === 'Hendrik - Sales AI Agent');

  // Auto-select Hendrik if available and no agent selected
  React.useEffect(() => {
    if (hendrikAgent && !selectedAgent) {
      handleAgentChange(hendrikAgent.id);
    }
  }, [hendrikAgent, selectedAgent, handleAgentChange]);

  const handleSendLearningFeedback = async () => {
    if (!feedbackText.trim() || !selectedAgent) return;

    try {
      await logSalesInteraction(
        'team_learning',
        { feedback_type: 'general_learning', content: feedbackText },
        'Feedback ontvangen voor verbetering van sales responses'
      );

      toast({
        title: "✅ Feedback Verzonden",
        description: "Hendrik heeft je feedback ontvangen en zal hiervan leren.",
      });

      setFeedbackText("");
      setLearningMode(false);
    } catch (error) {
      console.error('Failed to send learning feedback:', error);
      toast({
        title: "❌ Fout",
        description: "Kon feedback niet verzenden.",
        variant: "destructive",
      });
    }
  };

  if (!hendrikAgent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Hendrik Sales Agent
          </CardTitle>
          <CardDescription>
            De Sales AI Agent wordt geladen...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Brain className="h-12 w-12 mx-auto mb-4 animate-pulse" />
            <p className="text-muted-foreground">Hendrik wordt geïnitialiseerd...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hendrik Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Hendrik - Sales AI Agent</CardTitle>
                <CardDescription>
                  Jouw AI partner voor sales intelligence en email analyse
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant={hendrikAgent.is_active ? "default" : "secondary"}>
                {hendrikAgent.is_active ? "Actief" : "Inactief"}
              </Badge>
              <Badge variant={hendrikAgent.is_webhook_enabled ? "default" : "outline"}>
                {hendrikAgent.is_webhook_enabled ? "N8N Gekoppeld" : "N8N Nog Niet Gekoppeld"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Target className="h-4 w-4" />
                Specialiteiten
              </h4>
              <div className="flex flex-wrap gap-1">
                {(hendrikAgent.capabilities || []).map((cap) => (
                  <Badge key={cap} variant="outline" className="text-xs">
                    {cap}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Toegang Tot
              </h4>
              <div className="text-sm text-muted-foreground">
                Leads, Klanten, Voertuigen, Afspraken, Contracten
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Leermodi
              </h4>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLearningMode(!learningMode)}
                className="w-full"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                {learningMode ? "Stop Leren" : "Leer Hendrik"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning Mode */}
      {learningMode && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <BookOpen className="h-5 w-5" />
              Leer Hendrik Mode
            </CardTitle>
            <CardDescription>
              Deel feedback, tips of lessen die Hendrik kan leren voor betere sales responses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Bijvoorbeeld: 'Wanneer klanten vragen naar financiering, verwijs altijd naar onze lease specialist...' of 'Bij vragen over hybride auto's, benadruk de belastingvoordelen...'"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={4}
            />
            <div className="flex gap-2">
              <Button onClick={handleSendLearningFeedback} disabled={!feedbackText.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Verstuur Lering
              </Button>
              <Button variant="outline" onClick={() => setLearningMode(false)}>
                Annuleren
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat met Hendrik
          </CardTitle>
          <CardDescription>
            Stel vragen over sales strategieën, lead analyses, of vraag om hulp bij specifieke klanten
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Chat Messages */}
          <div className="h-96 overflow-y-auto border rounded-lg p-4 space-y-4 mb-4">
            {isInitializing ? (
              <div className="flex items-center justify-center py-8">
                <Brain className="h-6 w-6 animate-pulse mr-2" />
                <span>Hendrik start op...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Begin een gesprek met Hendrik</p>
                <p className="text-sm mt-2">
                  Vraag bijvoorbeeld: "Wat zijn de beste leads van deze week?" of "Hoe kan ik beter reageren op prijsvragen?"
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.messageType === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.messageType === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {msg.messageType === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="h-4 w-4" />
                        <span className="font-medium">Hendrik</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.webhookTriggered && (
                      <div className="mt-2 text-xs opacity-75">
                        ⚡ Verwerkt via N8N workflow
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 animate-pulse" />
                    <span>Hendrik denkt na...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Stel Hendrik een vraag over sales, leads, of vraag om advies..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={chatLoading || !session}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || chatLoading || !session}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
