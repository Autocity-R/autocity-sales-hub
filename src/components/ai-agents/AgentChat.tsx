import React, { useState, useRef, useEffect } from "react";
import { AgentConfig } from "./agentConfig";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  content: string;
  type: 'user' | 'agent';
  timestamp: Date;
}

interface AgentChatProps {
  agent: AgentConfig;
}

export const AgentChat: React.FC<AgentChatProps> = ({ agent }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset chat when agent changes
    setMessages([]);
    setSessionId(null);
    setInput("");
  }, [agent.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const initSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const token = crypto.randomUUID();
    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .insert({
        agent_id: agent.id,
        user_id: user?.id || null,
        session_token: token,
        status: 'active',
      })
      .select('id')
      .single();
    if (error) {
      console.error('Session creation error:', error);
      return null;
    }
    setSessionId(data.id);
    return data.id;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");

    const userMessage: Message = {
      id: crypto.randomUUID(),
      content: userMsg,
      type: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        currentSessionId = await initSession();
      }

      if (currentSessionId) {
        await supabase.from('ai_chat_messages').insert({
          session_id: currentSessionId,
          content: userMsg,
          message_type: 'user',
        });
      }

      // Route agents to dedicated edge functions
      const edgeFunction = agent.id === 'b4000000-0000-0000-0000-000000000004' 
        ? 'kevin-ai-chat' 
        : agent.id === 'b6000000-0000-0000-0000-000000000006'
        ? 'alex-ceo-chat'
        : 'hendrik-ai-chat';

      const { data, error } = await supabase.functions.invoke(edgeFunction, {
        body: {
          message: userMsg,
          agentId: agent.id,
          sessionId: currentSessionId,
        },
      });

      const responseText = data?.response || data?.message || 'Geen antwoord ontvangen.';

      if (currentSessionId) {
        await supabase.from('ai_chat_messages').insert({
          session_id: currentSessionId,
          content: responseText,
          message_type: 'agent',
        });
      }

      const agentMessage: Message = {
        id: crypto.randomUUID(),
        content: responseText,
        type: 'agent',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        content: 'Er is een fout opgetreden. Probeer het opnieuw.',
        type: 'agent',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <div className="flex flex-col h-[600px] border rounded-xl bg-card">
      {/* Header */}
      <div className={cn("flex items-center gap-3 p-4 border-b rounded-t-xl bg-gradient-to-r text-white", agent.color.gradient)}>
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
          {agent.name[0]}
        </div>
        <div>
          <p className="font-semibold text-sm">{agent.name}</p>
          <p className="text-xs opacity-80">{agent.role}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <div className={cn("w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-4", agent.color.bg)}>
              {agent.name[0]}
            </div>
            <p className="text-sm font-medium">Chat met {agent.name}</p>
            <p className="text-xs mt-1">{agent.role}</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex", msg.type === 'user' ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[80%] rounded-lg px-3 py-2 text-sm",
              msg.type === 'user'
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            )}>
              {msg.type === 'agent' && (
                <p className={cn("text-xs font-semibold mb-1", agent.color.text)}>{agent.name}</p>
              )}
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className="text-[10px] opacity-50 mt-1">
                {msg.timestamp.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {agent.name} denkt na...
            </div>
          </div>
        )}
      </div>

      {/* Quick questions */}
      {messages.length === 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {agent.quickQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleQuickQuestion(q)}
              className="text-xs px-2.5 py-1 rounded-full border border-border bg-background hover:bg-muted transition-colors text-foreground"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={`Stel een vraag aan ${agent.name}...`}
          disabled={loading}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={loading || !input.trim()} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
