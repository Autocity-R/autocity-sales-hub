
import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, X, Minimize, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ChatbotAssistantProps {
  onCommand: (command: string) => { success: boolean; message: string };
}

interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
}

export const ChatbotAssistant: React.FC<ChatbotAssistantProps> = ({
  onCommand,
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: "welcome",
      content: "Welkom! Ik kan je helpen met het beheren van je voertuigen. Probeer bijvoorbeeld 'Markeer voertuig HNZ-60-N als transport geregeld' of 'Voeg notitie toe aan voertuig AB-123-C: klant gebeld'.",
      sender: "bot",
      timestamp: new Date()
    }
  ]);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);
  
  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    // Add user message to chat
    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      content: message,
      sender: "user",
      timestamp: new Date()
    };
    
    setChatHistory(prev => [...prev, userMessage]);
    
    // Process command
    const result = onCommand(message);
    
    // Show toast based on result
    if (result.success) {
      toast({
        title: "Opdracht uitgevoerd",
        description: result.message,
        variant: "default",
      });
    } else {
      toast({
        title: "Fout bij uitvoeren opdracht",
        description: result.message,
        variant: "destructive",
      });
    }
    
    // Add bot response to chat
    const botMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      content: result.message,
      sender: "bot",
      timestamp: new Date()
    };
    
    setTimeout(() => {
      setChatHistory(prev => [...prev, botMessage]);
    }, 500);
    
    setMessage("");
  };
  
  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (isMinimized) {
      setIsMinimized(false);
    }
  };
  
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <>
      <Button
        onClick={toggleChat}
        className={cn(
          "fixed bottom-4 right-4 rounded-full p-3 shadow-lg",
          isOpen ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"
        )}
        size="icon"
      >
        {isOpen ? <X /> : <Bot />}
      </Button>
      
      {isOpen && (
        <div
          className={cn(
            "fixed right-4 bg-background border shadow-lg rounded-lg transition-all duration-200",
            isMinimized 
              ? "bottom-16 w-72 h-12" 
              : "bottom-16 w-80 sm:w-96 h-96"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-primary text-primary-foreground p-3 rounded-t-lg">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5" />
              <h3 className="font-medium">AutoCity Assistant</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-primary-foreground hover:bg-primary/90"
              onClick={toggleMinimize}
            >
              {isMinimized ? <Maximize className="h-4 w-4" /> : <Minimize className="h-4 w-4" />}
            </Button>
          </div>
          
          {!isMinimized && (
            <>
              {/* Chat messages */}
              <div 
                className="h-[calc(100%-7rem)] overflow-y-auto p-3 space-y-3"
                ref={chatContainerRef}
              >
                {chatHistory.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "max-w-[80%] rounded-lg p-3",
                      msg.sender === "user" 
                        ? "bg-primary text-primary-foreground ml-auto" 
                        : "bg-muted mr-auto"
                    )}
                  >
                    {msg.content}
                  </div>
                ))}
              </div>
              
              {/* Input area */}
              <div className="absolute bottom-0 left-0 right-0 p-3 border-t">
                <form 
                  className="flex items-center space-x-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                >
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Geef een opdracht..."
                    className="min-h-[40px] resize-none"
                  />
                  <Button 
                    type="submit"
                    size="icon" 
                    disabled={!message.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
