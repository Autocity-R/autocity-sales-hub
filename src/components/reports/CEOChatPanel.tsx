import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  X, 
  Send, 
  AlertTriangle, 
  TrendingUp,
  Loader2,
  ChevronDown,
  ChevronUp,
  Bot
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCEOBriefingData, CriticalAlert } from "@/services/ceoDataService";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const CEOChatPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load alerts on mount
  useEffect(() => {
    const loadAlerts = async () => {
      const briefingData = await getCEOBriefingData();
      setAlerts(briefingData.alerts);
    };
    loadAlerts();
  }, []);

  // Generate session ID on open
  useEffect(() => {
    if (isOpen && !sessionId) {
      setSessionId(`ceo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    }
  }, [isOpen, sessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send initial briefing when opened for the first time
  useEffect(() => {
    if (isOpen && messages.length === 0 && sessionId) {
      sendInitialBriefing();
    }
  }, [isOpen, sessionId]);

  const sendInitialBriefing = async () => {
    setIsLoading(true);
    try {
      const briefingData = await getCEOBriefingData();
      
      let briefingMessage = "**Goedemorgen! Hier is je CEO briefing:**\n\n";
      
      // Add alerts
      if (briefingData.alerts.length > 0) {
        briefingMessage += "🚨 **KRITIEKE ALERTS:**\n";
        briefingData.alerts.forEach(alert => {
          const icon = alert.severity === 'critical' ? '🔴' : '🟡';
          briefingMessage += `${icon} ${alert.message}\n`;
        });
        briefingMessage += "\n";
      } else {
        briefingMessage += "✅ Geen kritieke alerts vandaag.\n\n";
      }

      // Add daily stats
      briefingMessage += "📊 **DAGELIJKSE STATUS:**\n";
      briefingMessage += `• Verkocht vandaag: ${briefingData.dailyStats.vehiclesSoldToday}\n`;
      briefingMessage += `• In transport: ${briefingData.dailyStats.vehiclesInTransit}\n`;
      briefingMessage += `• Op voorraad: ${briefingData.dailyStats.vehiclesOnStock}\n`;
      briefingMessage += `• Niet online: ${briefingData.dailyStats.vehiclesNotOnline}\n\n`;

      briefingMessage += "Waar kan ik je vandaag mee helpen?";

      setMessages([{
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: briefingMessage,
        timestamp: new Date(),
      }]);
    } catch (error) {
      console.error('Error loading briefing:', error);
      setMessages([{
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: "Goedemorgen! Ik ben Hendrik, je virtuele CEO. Waar kan ik je vandaag mee helpen?",
        timestamp: new Date(),
      }]);
    }
    setIsLoading(false);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Get Hendrik CEO agent
      const { data: agent } = await supabase
        .from('ai_agents')
        .select('id')
        .ilike('name', '%hendrik%')
        .single();

      if (!agent) {
        throw new Error('CEO agent not found');
      }

      // Call the hendrik-ai-chat edge function
      const { data, error } = await supabase.functions.invoke('hendrik-ai-chat', {
        body: {
          sessionId,
          message: userMessage.content,
          agentId: agent.id,
          userContext: {
            mode: 'ceo',
            currentPage: 'reports',
          },
        },
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message || 'Sorry, ik kon geen antwoord genereren.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Fout bij verzenden bericht');
      
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, er ging iets mis. Probeer het opnieuw.',
        timestamp: new Date(),
      }]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const alertCount = alerts.filter(a => a.severity === 'critical').length;

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <Bot className="h-6 w-6" />
        {alertCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {alertCount}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Card className={`fixed bottom-6 right-6 w-96 shadow-xl z-50 transition-all duration-200 ${isMinimized ? 'h-14' : 'h-[600px]'}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 border-b cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle className="text-sm font-medium">Hendrik - CEO AI</CardTitle>
          {alertCount > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5 text-xs">
              {alertCount} alert{alertCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}>
            {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          <CardContent className="flex-1 p-0 h-[calc(100%-110px)]">
            <ScrollArea className="h-full p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-3 text-sm ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {message.timestamp.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Stel een vraag..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={isLoading || !input.trim()}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};
