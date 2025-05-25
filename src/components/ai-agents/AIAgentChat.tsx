
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Bot, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIAgent {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
}

export const AIAgentChat = () => {
  const { toast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock AI agents - deze zouden uit de settings/database komen
  const aiAgents: AIAgent[] = [
    {
      id: "sales-assistant",
      name: "Verkoop Assistent",
      description: "Helpt met verkoop gerelateerde vragen en leads",
      status: "active"
    },
    {
      id: "inventory-manager",
      name: "Voorraad Manager",
      description: "Beheert voorraad en voertuig informatie",
      status: "active"
    },
    {
      id: "customer-service",
      name: "Klantservice Agent",
      description: "Helpt met klant gerelateerde vragen en problemen",
      status: "inactive"
    }
  ];

  const activeAgents = aiAgents.filter(agent => agent.status === "active");

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedAgent) {
      toast({
        title: "Fout",
        description: "Selecteer een AI agent en voer een bericht in.",
        variant: "destructive"
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    // Simuleer AI response (in echte implementatie zou dit naar de AI API gaan)
    setTimeout(() => {
      const selectedAgentData = aiAgents.find(agent => agent.id === selectedAgent);
      const responses = [
        `Hallo! Ik ben ${selectedAgentData?.name}. Ik heb toegang tot alle CRM data en kan je helpen met je vraag.`,
        "Ik zie dat je informatie nodig hebt. Laat me even in het systeem kijken...",
        "Op basis van de huidige data in het CRM systeem kan ik je het volgende vertellen...",
        "Ik heb de laatste verkoopcijfers geanalyseerd en zie enkele interessante trends."
      ];

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Agent Selection */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Beschikbare Agents
          </CardTitle>
          <CardDescription>
            Selecteer een AI agent om mee te chatten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger>
              <SelectValue placeholder="Kies een AI agent" />
            </SelectTrigger>
            <SelectContent>
              {activeAgents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedAgent && (
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium">
                {aiAgents.find(a => a.id === selectedAgent)?.name}
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {aiAgents.find(a => a.id === selectedAgent)?.description}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Agent Status:</h4>
            {aiAgents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between text-sm">
                <span>{agent.name}</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  agent.status === "active" 
                    ? "bg-green-100 text-green-800" 
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {agent.status === "active" ? "Actief" : "Inactief"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="lg:col-span-3 flex flex-col h-[600px]">
        <CardHeader>
          <CardTitle>AI Agent Chat</CardTitle>
          <CardDescription>
            Chat met de geselecteerde AI agent die volledige toegang heeft tot het CRM systeem
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 border rounded-lg bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Selecteer een AI agent en begin een gesprek</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-white border"
                    }`}
                  >
                    <p>{msg.content}</p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-white border rounded-lg p-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                selectedAgent 
                  ? "Typ je bericht aan de AI agent..." 
                  : "Selecteer eerst een AI agent"
              }
              disabled={!selectedAgent || isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!selectedAgent || !message.trim() || isLoading}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
