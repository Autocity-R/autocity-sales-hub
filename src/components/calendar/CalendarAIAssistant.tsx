
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Appointment } from "@/types/calendar";
import { 
  Bot, 
  Send, 
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, addHours } from "date-fns";

interface CalendarAIAssistantProps {
  onClose: () => void;
  onAppointmentCreated?: (appointment: Appointment) => void;
}

interface AIResponse {
  type: 'message' | 'appointment_suggestion' | 'availability_check' | 'conflict_warning';
  content: string;
  appointmentData?: Partial<Appointment>;
  action?: 'create' | 'check_availability' | 'suggest_times';
  conflicts?: any[];
  suggestions?: any[];
}

export const CalendarAIAssistant: React.FC<CalendarAIAssistantProps> = ({
  onClose,
  onAppointmentCreated
}) => {
  const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant', content: string, response?: AIResponse}>>([
    {
      role: 'assistant',
      content: 'Hallo! Ik ben je AI agenda-assistent met Google Calendar integratie. Ik kan je helpen met het inplannen van afspraken, het controleren van beschikbaarheid en het beheren van je agenda. Wat kan ik voor je doen?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Enhanced AI response generator with Google Calendar integration
  const generateAIResponse = async (userMessage: string): Promise<AIResponse> => {
    const message = userMessage.toLowerCase();
    
    // Check availability first
    if (message.includes('beschikbaar') || message.includes('vrij')) {
      const appointmentData: Partial<Appointment> = {
        startTime: addDays(new Date(), 1),
        endTime: addHours(addDays(new Date(), 1), 1),
      };

      return {
        type: 'availability_check',
        content: 'Ik ga de beschikbaarheid controleren...',
        appointmentData,
        action: 'check_availability'
      };
    }

    // Suggest times
    if (message.includes('tijden') || message.includes('voorstel')) {
      return {
        type: 'message',
        content: 'Ik ga beschikbare tijden voor je zoeken...',
        action: 'suggest_times'
      };
    }

    // Schedule a test drive
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
        content: 'Ik heb een proefrit afspraak voorbereid en ga controleren op conflicten. Wil je dat ik deze inplan?',
        appointmentData,
        action: 'create'
      };
    }

    // Schedule a delivery
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
        content: 'Ik heb een aflevering afspraak voorbereid. Deze wordt automatisch gesynchroniseerd met Google Calendar. Zal ik deze inplannen?',
        appointmentData,
        action: 'create'
      };
    }

    // Default response with Google Calendar context
    return {
      type: 'message',
      content: 'Ik kan je helpen met:\n• Afspraken inplannen (automatisch gesynchroniseerd met Google Calendar)\n• Beschikbaarheid controleren\n• Conflicten detecteren\n• Tijdslot suggesties\n• Bevestigingsmails versturen\n\nZeg bijvoorbeeld: "Plan een proefrit in voor BMW X3 morgen om 14:00" of "Controleer beschikbaarheid vrijdag 10:00"'
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
      const aiResponse = await generateAIResponse(userMessage);
      
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Niet ingelogd",
          description: "Je moet ingelogd zijn om afspraken te maken",
          variant: "destructive",
        });
        return;
      }

      // Use AI calendar operations for smart scheduling
      const { data, error } = await supabase.functions.invoke('ai-calendar-operations', {
        body: {
          action: 'create_appointment',
          agentId: 'calendar-assistant',
          appointmentData: {
            ...appointmentData,
            assignedTo: "AI Assistant"
          },
          userId: user.id,
          conflictResolution: 'reject'
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        if (data.error === 'scheduling_conflict') {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `⚠️ Er is een conflict gedetecteerd met ${data.conflicts.length} bestaande afspraak(en). Wil je een ander tijdstip kiezen?`,
            response: {
              type: 'conflict_warning',
              content: 'Conflict gedetecteerd',
              conflicts: data.conflicts
            }
          }]);
          return;
        }
        throw new Error(data.error);
      }

      onAppointmentCreated?.(data.appointment);
      
      toast({
        title: "Afspraak Aangemaakt",
        description: `${data.appointment.title} is succesvol ingepland en gesynchroniseerd`,
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ Perfect! Ik heb de afspraak "${data.appointment.title}" aangemaakt voor ${format(new Date(data.appointment.startTime), 'dd MMMM yyyy')} om ${format(new Date(data.appointment.startTime), 'HH:mm')}. ${data.appointment.google_event_id ? 'De afspraak is automatisch gesynchroniseerd met Google Calendar.' : ''}`
      }]);

    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Fout",
        description: "Kon afspraak niet aanmaken",
        variant: "destructive",
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, er ging iets mis bij het aanmaken van de afspraak. Probeer het opnieuw of neem contact op met de beheerder.'
      }]);
    }
  };

  const handleCheckAvailability = async (appointmentData: Partial<Appointment>) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-calendar-operations', {
        body: {
          action: 'check_availability',
          agentId: 'calendar-assistant',
          appointmentData,
        }
      });

      if (error) throw error;

      const message = data.available 
        ? `✅ Het tijdslot ${format(new Date(appointmentData.startTime!), 'dd MMM HH:mm')} - ${format(new Date(appointmentData.endTime!), 'HH:mm')} is beschikbaar!`
        : `❌ Het tijdslot is niet beschikbaar. Er zijn ${data.conflicts.length} conflicterende afspraken.`;

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: message,
        response: {
          type: 'availability_check',
          content: message,
          conflicts: data.conflicts
        }
      }]);

    } catch (error) {
      console.error('Error checking availability:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, kon beschikbaarheid niet controleren. Probeer het opnieuw.'
      }]);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Agenda Assistent
            <Badge variant="outline" className="text-green-700 border-green-300">
              Google Calendar Sync
            </Badge>
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
                        Afspraak Inplannen + Google Sync
                      </Button>
                    </div>
                  )}

                  {message.response?.type === 'availability_check' && message.response.appointmentData && (
                    <div className="mt-3">
                      <Button
                        onClick={() => handleCheckAvailability(message.response!.appointmentData!)}
                        className="gap-2"
                        size="sm"
                        variant="outline"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Controleer Beschikbaarheid
                      </Button>
                    </div>
                  )}

                  {message.response?.type === 'conflict_warning' && message.response.conflicts && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">Conflicten gedetecteerd:</span>
                      </div>
                      {message.response.conflicts.map((conflict: any, idx: number) => (
                        <div key={idx} className="text-sm bg-orange-50 p-2 rounded">
                          {conflict.title} - {format(new Date(conflict.startTime), 'HH:mm')}
                        </div>
                      ))}
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
              onClick={() => setInput("Controleer beschikbaarheid vrijdag 10:00")}
              disabled={isLoading}
            >
              Beschikbaarheid Controleren
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput("Plan een aflevering in voor overmorgen")}
              disabled={isLoading}
            >
              Aflevering Plannen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
