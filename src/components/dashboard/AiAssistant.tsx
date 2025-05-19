
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

const AiAssistant = () => {
  const [query, setQuery] = useState("");
  const [conversation, setConversation] = useState<{ role: string; content: string }[]>([
    {
      role: "assistant",
      content:
        "Hallo! Ik ben je AutoCity AI-assistent. Je kunt mij vragen stellen over voorraad, leads, of verkopen.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendQuery = () => {
    if (!query.trim()) return;

    // Add user query to conversation
    setConversation((prev) => [
      ...prev,
      { role: "user", content: query },
    ]);

    // Simulate AI response (in a real app, this would call an API)
    setIsLoading(true);
    setTimeout(() => {
      const demoResponses = [
        "De best verkopende modellen deze maand zijn Model X, Model Y en Model Z.",
        "Je hebt momenteel 15 open leads die aandacht nodig hebben. De oudste is 7 dagen in de 'Gecontacteerd' fase.",
        "De gemiddelde verkoopcyclus is de afgelopen week verbeterd met 12% ten opzichte van vorige maand.",
        "Er staan 35 voertuigen klaar voor transport. 12 daarvan zijn prioriteit B2B-partners.",
      ];
      
      const randomResponse = demoResponses[Math.floor(Math.random() * demoResponses.length)];
      
      setConversation((prev) => [
        ...prev,
        { role: "assistant", content: randomResponse },
      ]);
      setIsLoading(false);
      setQuery("");
    }, 1000);
  };

  return (
    <Card className="col-span-2 flex flex-col h-full">
      <CardHeader>
        <CardTitle>AI-assistent</CardTitle>
        <CardDescription>
          Stel een vraag aan de AI om inzichten te krijgen
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {conversation.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Vraag bijvoorbeeld: Welke modellen verkopen het best?"
            onKeyDown={(e) => e.key === "Enter" && handleSendQuery()}
          />
          <Button
            type="submit"
            size="icon"
            onClick={handleSendQuery}
            disabled={!query.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Verstuur vraag</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AiAssistant;
