
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lead } from "@/types/leads";
import { Mail, Send, Bot, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LeadEmailComposerProps {
  lead?: Lead;
  leads?: Lead[];
  onClose: () => void;
  onSent: () => void;
}

export const LeadEmailComposer: React.FC<LeadEmailComposerProps> = ({ 
  lead, 
  leads = [], 
  onClose, 
  onSent 
}) => {
  const [emailData, setEmailData] = useState({
    subject: '',
    content: '',
    template: 'custom'
  });
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const recipients = lead ? [lead] : leads;
  const emailTemplates = [
    { value: 'custom', label: 'Aangepaste email' },
    { value: 'welcome', label: 'Welkomst email' },
    { value: 'follow-up', label: 'Opvolg email' },
    { value: 'proposal', label: 'Offerte email' },
    { value: 'appointment', label: 'Afspraak bevestiging' }
  ];

  const generateAIContent = async () => {
    setIsGeneratingAI(true);
    try {
      // Simulate AI generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const aiContent = {
        subject: `Bedankt voor uw interesse in ${lead?.interestedVehicle || 'onze voertuigen'}`,
        content: `Beste ${lead?.firstName || 'klant'},

Hartelijk dank voor uw interesse in ${lead?.interestedVehicle || 'onze voertuigen'}. 

Ik zou graag een afspraak met u plannen om uw wensen te bespreken en u de mogelijkheden te tonen die het beste bij u passen.

Wanneer zou het u uitkomen voor een gesprek? Ik ben beschikbaar voor:
- Een persoonlijk gesprek op onze locatie
- Een videocall
- Een telefonisch gesprek

Ik kijk uit naar uw reactie.

Met vriendelijke groet,
${lead?.assignedTo || 'Het verkoop team'}`
      };
      
      setEmailData(prev => ({
        ...prev,
        subject: aiContent.subject,
        content: aiContent.content
      }));
      
      toast({
        title: "AI Content Gegenereerd",
        description: "De email inhoud is automatisch gegenereerd door AI",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: "Er ging iets mis bij het genereren van AI content",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleTemplateChange = (template: string) => {
    setEmailData(prev => ({ ...prev, template }));
    
    if (template === 'welcome') {
      setEmailData(prev => ({
        ...prev,
        subject: 'Welkom bij ons autohandel bedrijf',
        content: 'Beste klant,\n\nHartelijk welkom...'
      }));
    }
    // Add more template logic here
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
      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Email(s) verzonden",
        description: `Email succesvol verzonden naar ${recipients.length} ontvanger(s)`,
      });
      
      onSent();
    } catch (error) {
      toast({
        title: "Fout",
        description: "Er ging iets mis bij het verzenden van de email",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Composer
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
          {/* Recipients */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Ontvangers ({recipients.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {recipients.map((recipient) => (
                  <Badge key={recipient.id} variant="secondary">
                    {recipient.firstName} {recipient.lastName} ({recipient.email})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Template Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Email Template</label>
            <Select value={emailData.template} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {emailTemplates.map((template) => (
                  <SelectItem key={template.value} value={template.value}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* AI Generation */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={generateAIContent}
              disabled={isGeneratingAI}
              className="gap-2"
            >
              <Bot className="h-4 w-4" />
              {isGeneratingAI ? 'Genereren...' : 'AI Content Genereren'}
            </Button>
          </div>

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
              {isSending ? 'Verzenden...' : `Verzenden (${recipients.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
