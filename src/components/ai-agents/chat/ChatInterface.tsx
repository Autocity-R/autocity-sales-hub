
import React, { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, User, Send, Activity, Zap, Database, AlertCircle, Brain, Clock, Users } from "lucide-react";
import { ChatMessage } from "@/services/chatSessionService";

interface AIAgent {
  id: string;
  name: string;
  persona: string;
  is_active: boolean;
  is_webhook_enabled?: boolean;
  webhook_url?: string;
  webhook_config?: any;
  data_access_permissions?: any;
  capabilities?: string[];
}

interface ChatInterfaceProps {
  selectedAgent: string;
  selectedAgentData?: AIAgent;
  messages: ChatMessage[];
  message: string;
  chatLoading: boolean;
  isInitializing: boolean;
  onMessageChange: (message: string) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  selectedAgent,
  selectedAgentData,
  messages,
  message,
  chatLoading,
  isInitializing,
  onMessageChange,
  onSendMessage,
  onKeyPress,
}) => {
  // Debug logging for messages state
  useEffect(() => {
    console.log('🔍 ChatInterface messages updated:', {
      selectedAgent,
      messagesCount: messages.length,
      messages: messages.map(m => ({
        id: m.id,
        type: m.messageType,
        content: m.content.substring(0, 50) + '...',
        timestamp: m.createdAt
      }))
    });
  }, [messages, selectedAgent]);

  const getDataAccessSummary = (permissions: any) => {
    if (!permissions) return [];
    return Object.entries(permissions)
      .filter(([_, hasAccess]) => hasAccess)
      .map(([key, _]) => {
        switch(key) {
          case 'leads': return 'Leads';
          case 'customers': return 'Klanten';
          case 'contacts': return 'Contacten';
          case 'vehicles': return 'Voertuigen';
          case 'appointments': return 'Afspraken';
          case 'contracts': return 'Contracten';
          case 'warranty': return 'Garantie';
          case 'loan_cars': return 'Leen Auto\'s';
          default: return key;
        }
      });
  };

  const isHendrikAgent = selectedAgentData?.name?.toLowerCase().includes('hendrik') ||
                        selectedAgentData?.capabilities?.includes('direct-ai-integration');

  return (
    <Card className="lg:col-span-3 flex flex-col h-[600px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {isHendrikAgent ? 'Hendrik AI Chat (Enhanced Memory)' : 'Enhanced AI Agent Chat'}
          {selectedAgentData && (
            <Badge variant="outline" className="ml-auto">
              {selectedAgentData.name}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {isHendrikAgent 
            ? `Hendrik heeft volledig geheugen van alle gesprekken en lead context (${messages.length} berichten)`
            : `Deze chat triggert workflows met volledig systeem data context (${messages.length} berichten)`
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 border rounded-lg bg-gray-50">
          {!selectedAgent ? (
            <div className="text-center text-gray-500 py-8">
              <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Selecteer een AI agent om te beginnen</p>
            </div>
          ) : isInitializing ? (
            <div className="text-center text-gray-500 py-8">
              <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Sessie wordt geïnitialiseerd...</p>
              {isHendrikAgent && (
                <p className="text-sm mt-2 text-blue-600">Hendrik laadt geheugen context...</p>
              )}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Geen berichten nog. Start een gesprek!</p>
              {isHendrikAgent && (
                <p className="text-sm mt-2 text-blue-600">
                  💡 Hendrik onthoudt alle gesprekken - probeer: "Hallo, ik ben op zoek naar een auto" of noem je email/telefoon
                </p>
              )}
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  msg.messageType === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.messageType === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.messageType === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-white border"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                    <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                    <div className="flex items-center gap-2">
                      {msg.webhookTriggered && (
                        <Badge variant="outline" className="ml-2">
                          {isHendrikAgent ? (
                            <>
                              <Brain className="h-3 w-3 mr-1" />
                              Enhanced AI
                            </>
                          ) : (
                            <>
                              <Zap className="h-3 w-3 mr-1" />
                              n8n + Data
                            </>
                          )}
                          {msg.processingTime && ` (${msg.processingTime}ms)`}
                        </Badge>
                      )}
                      {msg.memoryReferences && Object.keys(msg.memoryReferences).length > 0 && (
                        <Badge variant="outline" className="bg-purple-50">
                          <Clock className="h-3 w-3 mr-1" />
                          Memory
                        </Badge>
                      )}
                      {selectedAgentData?.data_access_permissions && 
                       Object.values(selectedAgentData.data_access_permissions).some(Boolean) && (
                        <Badge variant="outline" className="bg-green-50">
                          <Database className="h-3 w-3 mr-1" />
                          Live CRM
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {msg.messageType === "user" && (
                  <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))
          )}
          
          {chatLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-white border rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
                {isHendrikAgent && (
                  <div className="text-xs text-blue-600 mt-1">
                    Hendrik analyseert met volledige memory context...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2">
          <Input
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder={
              selectedAgent 
                ? isHendrikAgent
                  ? "Hendrik onthoudt alles - vertel over je auto wensen of noem je contactgegevens..."
                  : selectedAgentData?.is_webhook_enabled
                    ? "Typ je bericht (triggert workflow met systeem data)..."
                    : "Agent heeft geen integratie geconfigureerd"
                : "Selecteer eerst een AI agent"
            }
            disabled={!selectedAgent || chatLoading || isInitializing || (!isHendrikAgent && !selectedAgentData?.is_webhook_enabled)}
            className="flex-1"
          />
          <Button
            onClick={onSendMessage}
            disabled={!selectedAgent || !message.trim() || chatLoading || isInitializing || (!isHendrikAgent && !selectedAgentData?.is_webhook_enabled)}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Enhanced Status Messages */}
        {selectedAgentData && !isHendrikAgent && !selectedAgentData.is_webhook_enabled && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            <AlertCircle className="h-4 w-4 inline mr-1" />
            Deze agent heeft geen integratie. Hendrik heeft wel enhanced memory beschikbaar.
          </div>
        )}

        {isHendrikAgent && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            <Brain className="h-4 w-4 inline mr-1" />
            Hendrik heeft enhanced memory - onthoudt alle gesprekken, voorkeuren en lead context.
          </div>
        )}

        {selectedAgentData && selectedAgentData.data_access_permissions && 
         getDataAccessSummary(selectedAgentData.data_access_permissions).length > 0 && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
            <Database className="h-4 w-4 inline mr-1" />
            Agent heeft toegang tot: {getDataAccessSummary(selectedAgentData.data_access_permissions).join(', ')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
