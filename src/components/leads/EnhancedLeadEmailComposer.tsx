
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lead } from "@/types/leads";
import { Mail, Send, Bot, X, MessageSquare, Brain, Sparkles, Car } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EnhancedLeadEmailComposerProps {
  lead: Lead;
  onClose: () => void;
  onSent: () => void;
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  selling_price: number;
  status: string;
}

export const EnhancedLeadEmailComposer: React.FC<EnhancedLeadEmailComposerProps> = ({ 
  lead, 
  onClose, 
  onSent 
}) => {
  const [emailData, setEmailData] = useState({
    subject: '',
    content: '',
    template: 'hendrik_ai'
  });
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [hendrikContext, setHendrikContext] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadVehicles();
    loadHendrikContext();
  }, [lead.id]);

  const loadVehicles = async () => {
    const { data } = await supabase
      .from('vehicles')
      .select('id, brand, model, year, selling_price, status')
      .eq('status', 'voorraad')
      .order('brand', { ascending: true });
    
    if (data) setVehicles(data);
  };

  const loadHendrikContext = async () => {
    // Load CRM context for Hendrik (limited to 10 items for token efficiency)
    const [leadsData, vehiclesData, appointmentsData] = await Promise.all([
      supabase.from('leads').select('*').eq('id', lead.id).single(),
      supabase.from('vehicles').select('*').eq('status', 'voorraad').limit(10),
      supabase.from('appointments').select('*').gte('starttime', new Date().toISOString()).limit(5)
    ]);

    setHendrikContext({
      lead: leadsData.data,
      vehicles: vehiclesData.data || [],
      appointments: appointmentsData.data || []
    });
  };

  const generateHendrikAIContent = async () => {
    if (!hendrikContext) {
      toast({
        title: "Fout",
        description: "Hendrik context nog niet geladen",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingAI(true);
    try {
      const response = await fetch('https://fnwagrmoyfyimdoaynkg.supabase.co/functions/v1/hendrik-ai-email-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZud2Fncm1veWZ5aW1kb2F5bmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyOTM1OTEsImV4cCI6MjA2Mzg2OTU5MX0.vzCFGEJv13gHlu9wRPg9czQZtLiUZXN74rWOyOdBf3c`
        },
        body: JSON.stringify({
          lead: hendrikContext.lead,
          selectedVehicle: selectedVehicle ? vehicles.find(v => v.id === selectedVehicle) : null,
          context: {
            vehicles: hendrikContext.vehicles,
            appointments: hendrikContext.appointments
          },
          requestType: 'email_composition'
        })
      });

      if (!response.ok) throw new Error('Hendrik AI request failed');

      const result = await response.json();
      
      setEmailData(prev => ({
        ...prev,
        subject: result.subject || `Re: ${lead.firstName} - Auto City`,
        content: result.content || 'Hendrik kon geen email genereren. Probeer opnieuw.'
      }));
      
      toast({
        title: "✨ Hendrik AI Email Gegenereerd",
        description: "Professionele email samengesteld met CRM context",
      });
    } catch (error) {
      console.error('Hendrik AI Error:', error);
      toast({
        title: "Fout",
        description: "Hendrik AI kon geen email genereren",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailData.subject.trim() || !emailData.content.trim()) {
      toast({
        title: "Fout",
        description: "Onderwerp en inhoud zijn verplicht",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      // Send email via Edge Function
      const response = await fetch('https://fnwagrmoyfyimdoaynkg.supabase.co/functions/v1/send-lead-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZud2Fncm1veWZ5aW1kb2F5bmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyOTM1OTEsImV4cCI6MjA2Mzg2OTU5MX0.vzCFGEJv13gHlu9wRPg9czQZtLiUZXN74rWOyOdBf3c`
        },
        body: JSON.stringify({
          to: lead.email,
          from: 'verkoop@auto-city.nl',
          subject: emailData.subject,
          content: emailData.content,
          leadId: lead.id,
          vehicleId: selectedVehicle,
          aiGenerated: emailData.template === 'hendrik_ai'
        })
      });

      if (!response.ok) throw new Error('Email send failed');

      // Update lead activity
      await supabase
        .from('leads')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id);

      toast({
        title: "✅ Email Verzonden",
        description: `Email succesvol verzonden naar ${lead.firstName}`,
      });
      
      onSent();
    } catch (error) {
      console.error('Send email error:', error);
      toast({
        title: "Fout",
        description: "Er ging iets mis bij het verzenden van de email",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleVehicleSelect = (vehicleId: string) => {
    setSelectedVehicle(vehicleId);
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      // Auto-update subject if Hendrik AI template
      if (emailData.template === 'hendrik_ai') {
        setEmailData(prev => ({
          ...prev,
          subject: `${vehicle.brand} ${vehicle.model} - Auto City`
        }));
      }
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Enhanced Email Composer - {lead.firstName} {lead.lastName}
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

        <div className="space-y-6">
          {/* Lead Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Lead Informatie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Email:</strong> {lead.email}
                </div>
                <div>
                  <strong>Status:</strong> <Badge variant="outline">{lead.status}</Badge>
                </div>
                <div>
                  <strong>Prioriteit:</strong> <Badge variant="secondary">{lead.priority}</Badge>
                </div>
                <div>
                  <strong>Bron:</strong> {lead.source || 'Onbekend'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Car className="h-4 w-4" />
              Voertuig Selectie
            </label>
            <Select value={selectedVehicle} onValueChange={handleVehicleSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer voertuig (optioneel)" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.brand} {vehicle.model} ({vehicle.year}) - €{vehicle.selling_price?.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Hendrik AI Generation */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Brain className="h-5 w-5" />
                Hendrik AI Email Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-blue-600">
                Hendrik gebruikt uw CRM data om professionele, gepersonaliseerde emails te schrijven gebaseerd op lead geschiedenis, voertuig interesse en bedrijfscontext.
              </div>
              <Button
                onClick={generateHendrikAIContent}
                disabled={isGeneratingAI || !hendrikContext}
                className="gap-2"
              >
                {isGeneratingAI ? (
                  <>
                    <Brain className="h-4 w-4 animate-pulse" />
                    Hendrik schrijft email...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Laat Hendrik email schrijven
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Email Content */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Onderwerp</label>
              <Input
                value={emailData.subject}
                onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Email onderwerp"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Inhoud</label>
              <Textarea
                value={emailData.content}
                onChange={(e) => setEmailData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Email inhoud..."
                className="min-h-[300px]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button onClick={handleSendEmail} disabled={isSending} className="gap-2">
              <Send className="h-4 w-4" />
              {isSending ? 'Verzenden...' : 'Versturen'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
