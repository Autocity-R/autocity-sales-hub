
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Lead } from "@/types/leads";
import { Bot, Send, User, X, Lightbulb, TrendingUp, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LeadAIAssistantProps {
  lead?: Lead;
  onClose: () => void;
}

interface AIMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

export const LeadAIAssistant: React.FC<LeadAIAssistantProps> = ({ lead, onClose }) => {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: lead 
        ? `Hallo! Ik ben je AI assistent voor lead ${lead.firstName} ${lead.lastName}. Hoe kan ik je helpen?`
        : 'Hallo! Ik ben je AI assistent voor lead management. Hoe kan ik je helpen?',
      timestamp: new Date(),
      suggestions: [
        'Stel een email voor',
        'Analyseer de lead kwaliteit',
        'Geef follow-up suggesties',
        'Schrijf een voorstel'
      ]
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const aiSuggestions = [
    'Wat is de beste aanpak voor deze lead?',
    'Schrijf een follow-up email',
    'Analyseer de conversiekans',
    'Geef pricing suggesties',
    'Stel een meeting agenda voor'
  ];

  const handleSendMessage = async (message?: string) => {
    const messageToSend = message || currentMessage.trim();
    if (!messageToSend) return;

    // Add user message
    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: messageToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      // Simulate AI response
      await new Promise(resolve => setTimeout(resolve, 2000));

      let aiResponse = '';
      let suggestions: string[] = [];

      if (messageToSend.toLowerCase().includes('email')) {
        aiResponse = `Hier is een email voorstel voor ${lead?.firstName || 'deze lead'}:

**Onderwerp:** Opvolging van uw interesse in ${lead?.interestedVehicle || 'onze voertuigen'}

**Inhoud:**
Beste ${lead?.firstName || 'klant'},

Bedankt voor uw interesse. Op basis van uw profiel en budget van €${lead?.budget?.toLocaleString() || 'X'} hebben wij enkele uitstekende opties voor u.

Zou u volgende week tijd hebben voor een persoonlijke demonstratie?

Met vriendelijke groet,
${lead?.assignedTo || 'Het verkoop team'}`;
        
        suggestions = ['Email versturen', 'Email aanpassen', 'Andere template'];
      } else if (messageToSend.toLowerCase().includes('analyse') || messageToSend.toLowerCase().includes('kwaliteit')) {
        aiResponse = `**Lead Analyse voor ${lead?.firstName || 'deze lead'}:**

🔍 **Kwaliteit Score: ${lead?.conversionProbability || 75}%**

**Sterke punten:**
- ${lead?.budget ? `Budget van €${lead.budget.toLocaleString()} is realistisch` : 'Budget informatie beschikbaar'}
- ${lead?.interestedVehicle ? `Specifieke interesse in ${lead.interestedVehicle}` : 'Algemene interesse'}
- ${lead?.source === 'website' ? 'Kwam via website (hoge intentie)' : `Bron: ${lead?.source}`}

**Aandachtspunten:**
- ${!lead?.lastContactDate ? 'Nog geen contact gehad' : 'Laatste contact was recent'}
- Prioriteit: ${lead?.priority || 'medium'}

**Aanbevelingen:**
1. Plan binnen 24 uur contact
2. Bereid specifieke voertuig opties voor
3. Financieringsopties bespreken`;

        suggestions = ['Plan afspraak', 'Stuur offerte', 'Update prioriteit'];
      } else {
        aiResponse = `Ik heb je vraag geanalyseerd. Hier zijn mijn inzichten:

${lead ? `Voor ${lead.firstName} ${lead.lastName}:` : 'Voor deze leads:'}

• Status: ${lead?.status || 'Onbekend'}
• Prioriteit: ${lead?.priority || 'Medium'} 
• Conversiekans: ${lead?.conversionProbability || 75}%

Wat wil je als volgende stap ondernemen?`;

        suggestions = ['Email schrijven', 'Afspraak plannen', 'Status updaten', 'Notitie toevoegen'];
      }

      const aiMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date(),
        suggestions
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      toast({
        title: "Fout",
        description: "Er ging iets mis bij het genereren van AI response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Lead Assistant
            {lead && (
              <Badge variant="outline">
                {lead.firstName} {lead.lastName}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="ml-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[600px]">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4 border rounded">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {message.type === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                      <span className="text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    
                    {message.suggestions && (
                      <div className="mt-3 space-y-1">
                        <div className="text-xs opacity-70 flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          Suggesties:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {message.suggestions.map((suggestion, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => handleSendMessage(suggestion)}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      <span className="text-sm">AI denkt na...</span>
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-current rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick Actions */}
          <div className="p-2 border-t">
            <div className="text-xs text-muted-foreground mb-2">Snelle acties:</div>
            <div className="flex flex-wrap gap-1">
              {aiSuggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleSendMessage(suggestion)}
                  disabled={isLoading}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="flex gap-2 p-2 border-t">
            <Input
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Stel een vraag aan de AI..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isLoading}
            />
            <Button 
              onClick={() => handleSendMessage()} 
              disabled={isLoading || !currentMessage.trim()}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
