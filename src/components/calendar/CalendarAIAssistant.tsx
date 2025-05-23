
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createAppointment, sendAppointmentConfirmation } from "@/services/calendarService";
import { Appointment } from "@/types/calendar";
import { 
  Bot, 
  Send, 
  Calendar,
  Clock,
  User,
  Car,
  MapPin,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, addHours } from "date-fns";

interface CalendarAIAssistantProps {
  onClose: () => void;
  onAppointmentCreated?: (appointment: Appointment) => void;
}

interface AIResponse {
  type: 'message' | 'appointment_suggestion' | 'confirmation';
  content: string;
  appointmentData?: Partial<Appointment>;
  action?: 'create' | 'confirm_send';
}

export const CalendarAIAssistant: React.FC<CalendarAIAssistantProps> = ({
  onClose,
  onAppointmentCreated
}) => {
  const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant', content: string, response?: AIResponse}>>([
    {
      role: 'assistant',
      content: 'Hallo! Ik ben je AI agenda-assistent. Ik kan je helpen met het inplannen van afspraken, het versturen van bevestigingen en het beheren van je agenda. Wat kan ik voor je doen?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Mock AI response generator - in real implementation this would call an AI service
  const generateAIResponse = (userMessage: string): AIResponse => {
    const message = userMessage.toLowerCase();
    
    // Check if user wants to schedule a test drive
    if (message.includes('proefrit') || message.includes('testrit')) {
      const appointmentData: Partial<Appointment> = {
        title: "Proefrit",
        type: "proefrit",
        status: "gepland",
        startTime: addDays(new Date(), 1),
        endTime: addHours(addDays(new Date(), 1), 1),
        location: "Showroom",
        createdBy: "AI Assistant"
      };

      return {
        type: 'appointment_suggestion',
        content: 'Ik heb een proefrit afspraak voorbereid. Wil je dat ik deze inplan?',
        appointmentData,
        action: 'create'
      };
    }

    // Check if user wants to schedule a delivery
    if (message.includes('aflevering') || message.includes('bezorgen')) {
      const appointmentData: Partial<Appointment> = {
        title: "Voertuig Aflevering",
        type: "aflevering",
        status: "gepland",
        startTime: addDays(new Date(), 2),
        endTime: addHours(addDays(new Date(), 2), 1),
        location: "Bij klant",
        createdBy: "AI Assistant"
      };

      return {
        type: 'appointment_suggestion',
        content: 'Ik heb een aflevering afspraak voorbereid. Zal ik deze inplannen?',
        appointmentData,
        action: 'create'
      };
    }

    // Check if user wants to send confirmations
    if (message.includes('bevestiging') || message.includes('email')) {
      return {
        type: 'confirmation',
        content: 'Ik kan afspraakbevestigingen versturen naar klanten. Welke afspraak wil je bevestigen?',
        action: 'confirm_send'
      };
    }

    // Default response
    return {
      type: 'message',
      content: 'Ik kan je helpen met:\n• Afspraken inplannen voor proefritten\n• Aflevering afspraken maken\n• Bevestigingsmails versturen\n• Agenda beheer\n\nZeg bijvoorbeeld: "Plan een proefrit in voor BMW X3 morgen om 14:00" of "Verstuur bevestiging voor afspraak vandaag"'
    };
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);

    try {
      // Generate AI response
      const aiResponse = generateAIResponse(userMessage);
      
      // Add AI response
      setMessages([...newMessages, {
        role: 'assistant',
        content: aiResponse.content,
        response: aiResponse
      }]);

    } catch (error) {
      console.error('AI Assistant error:', error);
      setMessages([...newMessages, {
        role: 'assistant',
        content: 'Sorry, er is een fout opgetreden. Probeer het opnieuw.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAppointment = async (appointmentData: Partial<Appointment>) => {
    try {
      const appointment = await createAppointment({
        title: appointmentData.title || "Nieuwe Afspraak",
        type: appointmentData.type || "overig",
        status: appointmentData.status || "gepland",
        startTime: appointmentData.startTime || new Date(),
        endTime: appointmentData.endTime || addHours(new Date(), 1),
        location: appointmentData.location || "Showroom",
        createdBy: "AI Assistant",
        assignedTo: "AI Assistant"
      } as Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>);

      onAppointmentCreated?.(appointment);
      
      toast({
        title: "Afspraak Aangemaakt",
        description: `${appointment.title} is succesvol ingepland`,
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Perfect! Ik heb de afspraak "${appointment.title}" aangemaakt voor ${format(new Date(appointment.startTime), 'dd MMMM yyyy')} om ${format(new Date(appointment.startTime), 'HH:mm')}.`
      }]);

    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Fout",
        description: "Kon afspraak niet aanmaken",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Agenda Assistent
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[60vh]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 p-4 border rounded-lg bg-muted/10">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-white border'
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Action buttons for AI responses */}
                  {message.response?.type === 'appointment_suggestion' && message.response.appointmentData && (
                    <div className="mt-3 space-y-2">
                      <Card className="p-3 bg-blue-50">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span><strong>Type:</strong> {message.response.appointmentData.type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span><strong>Tijd:</strong> {message.response.appointmentData.startTime && format(new Date(message.response.appointmentData.startTime), 'dd MMM yyyy, HH:mm')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span><strong>Locatie:</strong> {message.response.appointmentData.location}</span>
                          </div>
                        </div>
                      </Card>
                      <Button
                        onClick={() => handleCreateAppointment(message.response!.appointmentData!)}
                        className="gap-2"
                        size="sm"
                      >
                        <Sparkles className="h-4 w-4" />
                        Afspraak Inplannen
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span>AI denkt na...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2 mt-4">
            <Input
              placeholder="Typ je bericht... (bijv. 'Plan een proefrit voor BMW X3 morgen om 14:00')"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!input.trim() || isLoading}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Verstuur
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput("Plan een proefrit in voor morgen om 14:00")}
              disabled={isLoading}
            >
              Proefrit Inplannen
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput("Plan een aflevering in voor overmorgen")}
              disabled={isLoading}
            >
              Aflevering Plannen
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput("Verstuur bevestiging naar klant")}
              disabled={isLoading}
            >
              Bevestiging Versturen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
