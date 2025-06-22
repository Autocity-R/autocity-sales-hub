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
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  Star,
  Database,
  Calendar,
  Users,
  Car
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProductionAIChat } from "@/hooks/useProductionAIChat";
import { logSalesInteraction } from "@/services/salesAgentService";

export const SalesAgentChat = () => {
  const { toast } = useToast();
  const [learningMode, setLearningMode] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [messageRatings, setMessageRatings] = useState<Record<string, number>>({});

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

  const handleMessageRating = async (messageId: string, rating: number) => {
    setMessageRatings(prev => ({ ...prev, [messageId]: rating }));
    
    try {
      await logSalesInteraction(
        'message_rating',
        { message_id: messageId, rating, session_id: session?.id },
        `Message rating: ${rating}/5`
      );

      toast({
        title: "✅ Feedback Ontvangen",
        description: `Hendrik leert van je ${rating}/5 rating.`,
      });
    } catch (error) {
      console.error('Failed to rate message:', error);
    }
  };

  // Enhanced key handling for multi-line support
  const handleEnhancedKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Allow default behavior for Shift+Enter (new line)
        return;
      } else {
        // Prevent default and send message for Enter alone
        e.preventDefault();
        handleSendMessage();
      }
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
            De Enhanced Sales AI Agent wordt geladen...
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
      {/* Enhanced Hendrik Info Card with Memory Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Hendrik - Enhanced Sales AI Agent</CardTitle>
                <CardDescription>
                  Jouw AI partner met volledige CRM integratie, conversatie memory en learning capabilities
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant={hendrikAgent.is_active ? "default" : "secondary"}>
                {hendrikAgent.is_active ? "Actief" : "Inactief"}
              </Badge>
              <Badge variant="default" className="bg-green-600">
                Enhanced CRM
              </Badge>
              <Badge variant="default" className="bg-purple-600">
                Full Memory
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <Database className="h-4 w-4" />
                Live CRM Data
              </h4>
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Car className="h-3 w-3" />
                  Voertuigen & Prijzen
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Leads & Analyses  
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Afspraken & Planning
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                AI Functions
              </h4>
              <div className="text-sm text-muted-foreground">
                Afspraak Planning, Lead Analyse, Voertuig Matching, Inruil Waardering
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Learning Mode
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
          
          {/* New Memory Status Section */}
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-purple-600" />
              <span className="font-medium text-purple-800">Conversatie Memory Status</span>
            </div>
            <div className="text-sm text-purple-700">
              <div className="flex items-center justify-between">
                <span>Actieve gesprek berichten:</span>
                <Badge variant="outline" className="bg-purple-100">
                  {messages.length} berichten
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span>Memory functionaliteit:</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  Volledig Actief
                </Badge>
              </div>
              <p className="text-xs mt-2 text-purple-600">
                💭 Hendrik onthoudt alles uit dit gesprek en kan natuurlijke vervolgvragen beantwoorden
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Learning Mode */}
      {learningMode && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <BookOpen className="h-5 w-5" />
              Enhanced Learning Mode
            </CardTitle>
            <CardDescription>
              Deel feedback die Hendrik helpt beter te worden in sales gesprekken en klant interacties
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Bijvoorbeeld: 'Bij prijsvragen eerst waarde tonen voor kostenvergelijking...' of 'Bij twijfel over betrouwbaarheid altijd BOVAG certificering en 55 jaar ervaring benadrukken...' of 'Inruil gesprekken altijd naar showroom leiden voor transparante waardering...'"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={4}
            />
            <div className="flex gap-2">
              <Button onClick={handleSendLearningFeedback} disabled={!feedbackText.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Verstuur Learning Feedback
              </Button>
              <Button variant="outline" onClick={() => setLearningMode(false)}>
                Annuleren
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Chat Interface with Memory */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Enhanced Hendrik Chat met Volledig Geheugen
          </CardTitle>
          <CardDescription>
            Volledig CRM geïntegreerde sales agent met conversatie memory, learning capabilities en directe actie mogelijkheden
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Chat Messages with Rating and Memory indicators */}
          <div className="h-96 overflow-y-auto border rounded-lg p-4 space-y-4 mb-4">
            {isInitializing ? (
              <div className="flex items-center justify-center py-8">
                <Brain className="h-6 w-6 animate-pulse mr-2" />
                <span>Hendrik start op met volledige CRM context en conversatie memory...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Begin een enhanced gesprek met Hendrik</p>
                <div className="text-sm mt-2 space-y-1">
                  <p className="font-medium">Hendrik heeft nu toegang tot:</p>
                  <p>• Live voorraad data met prijzen</p>
                  <p>• Actieve leads met analyses</p>
                  <p>• Afspraak planning functionaliteit</p>
                  <p>• Inruil waardering proces</p>
                  <p>• Learning van team feedback</p>
                  <p className="font-medium text-purple-600">• 🧠 Volledige conversatie memory</p>
                </div>
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
                        <span className="font-medium">Hendrik Enhanced</span>
                        <Badge variant="outline" className="text-xs">
                          CRM Data
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-purple-100">
                          Memory
                        </Badge>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.webhookTriggered && (
                      <div className="mt-2 text-xs opacity-75">
                        ⚡ Enhanced AI met volledige CRM context + conversatie memory
                        {msg.processingTime && ` (${msg.processingTime}ms)`}
                      </div>
                    )}
                    {/* Rating for assistant messages */}
                    {msg.messageType === 'assistant' && (
                      <div className="mt-3 pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600">Rate deze response:</span>
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              onClick={() => handleMessageRating(msg.id, rating)}
                              className={`text-xs p-1 rounded ${
                                messageRatings[msg.id] === rating
                                  ? 'text-yellow-500'
                                  : 'text-gray-400 hover:text-yellow-400'
                              }`}
                            >
                              <Star className="h-3 w-3" fill={messageRatings[msg.id] >= rating ? 'currentColor' : 'none'} />
                            </button>
                          ))}
                        </div>
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
                    <span>Hendrik analyseert CRM data met conversatie context...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Chat Input with Textarea for multi-line support */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Textarea
                placeholder="Vraag Hendrik over leads, voertuigen, afspraken, of vraag om CRM acties uit te voeren... (Shift+Enter voor nieuwe regel, Enter om te verzenden)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleEnhancedKeyPress}
                disabled={chatLoading || !session}
                rows={3}
                className="resize-none"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || chatLoading || !session}
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              💡 Tip: Gebruik Shift+Enter voor een nieuwe regel, Enter om je bericht te verzenden
            </div>
          </div>

          {/* Enhanced Status with Memory */}
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
            <Database className="h-4 w-4 inline mr-1" />
            Enhanced Hendrik heeft real-time toegang tot alle CRM data, volledige conversatie memory en kan directe acties uitvoeren zoals afspraken plannen.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
