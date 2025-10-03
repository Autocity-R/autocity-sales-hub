import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lead } from "@/types/leads";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Send, Bot, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LeadEmailComposerProps {
  lead?: Lead;
  leads?: Lead[];
  onClose: () => void;
  onSent: () => void;
  replyTo?: {
    messageId: string;
    threadId?: string;
    subject: string;
    sender: string;
  };
}

export const LeadEmailComposer: React.FC<LeadEmailComposerProps> = ({ 
  lead, 
  leads = [], 
  onClose, 
  onSent,
  replyTo
}) => {
  const [emailData, setEmailData] = useState({
    subject: replyTo?.subject?.startsWith('Re:') 
      ? replyTo.subject 
      : replyTo?.subject 
        ? `Re: ${replyTo.subject}` 
        : '',
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
    { value: 'interest', label: 'Interesse bevestiging' },
    { value: 'proposal', label: 'Offerte aanbieding' },
  ];

  const handleTemplateChange = (template: string) => {
    setEmailData({ ...emailData, template });
    
    // Pre-fill content based on template
    if (template === 'welcome') {
      setEmailData({
        ...emailData,
        template,
        subject: 'Welkom bij Auto City',
        content: `Beste ${recipients[0]?.firstName || 'klant'},\n\nHartelijk dank voor uw interesse in Auto City. Wij zijn verheugd u te kunnen helpen bij het vinden van uw ideale auto.\n\nMet vriendelijke groet,\nAuto City`
      });
    } else if (template === 'follow-up') {
      setEmailData({
        ...emailData,
        template,
        subject: 'Follow-up op uw interesse',
        content: `Beste ${recipients[0]?.firstName || 'klant'},\n\nIk wil graag met u in contact komen over uw interesse in ${recipients[0]?.interestedVehicle || 'onze voertuigen'}.\n\nHeeft u nog vragen of kunnen we u verder helpen?\n\nMet vriendelijke groet,\nAuto City`
      });
    }
  };

  const generateAIContent = async () => {
    setIsGeneratingAI(true);
    
    // Simulate AI content generation - in real app would call OpenAI
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const aiContent = `Beste ${recipients[0]?.firstName || 'klant'},\n\nIk heb uw interesse in ${recipients[0]?.interestedVehicle || 'onze voertuigen'} gezien en wil graag meer informatie met u delen.\n\nOnze ${recipients[0]?.interestedVehicle || 'voertuigen'} voldoen aan de hoogste kwaliteitsnormen en worden geleverd met uitgebreide garantie.\n\nIk nodig u graag uit voor een proefrit. Wanneer zou het u schikken?\n\nMet vriendelijke groet,\nAuto City`;
    
    setEmailData({ ...emailData, content: aiContent });
    setIsGeneratingAI(false);
    
    toast({
      title: "AI content gegenereerd",
      description: "De email inhoud is automatisch gegenereerd",
    });
  };

  const handleSendEmail = async () => {
    if (!emailData.subject.trim() || !emailData.content.trim()) {
      toast({
        title: "Validatiefout",
        description: "Onderwerp en inhoud zijn verplicht",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      // Send email via Gmail edge function
      const { data, error } = await supabase.functions.invoke('send-gmail', {
        body: {
          senderEmail: 'verkoop@auto-city.nl',
          to: recipients.map(l => l.email),
          subject: emailData.subject,
          htmlBody: emailData.content.replace(/\n/g, '<br>'),
          metadata: {
            leadId: lead?.id,
            threadId: replyTo?.threadId,
            replyToMessageId: replyTo?.messageId,
          }
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to send email');
      }

      toast({
        title: "Email verzonden",
        description: `Email succesvol verzonden naar ${recipients.length} lead(s)`,
      });

      onSent();
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Fout bij verzenden",
        description: error instanceof Error ? error.message : "Er is een fout opgetreden",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {replyTo ? 'Email Beantwoorden' : 'Email Versturen'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipients */}
          <div>
            <label className="text-sm font-medium mb-2 block">Ontvangers</label>
            <div className="flex flex-wrap gap-2">
              {recipients.map((recipient) => (
                <Badge key={recipient.id} variant="secondary" className="flex items-center gap-1">
                  {recipient.firstName} {recipient.lastName}
                  <span className="text-muted-foreground ml-1">({recipient.email})</span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Template Selection */}
          {!replyTo && (
            <div>
              <label className="text-sm font-medium mb-2 block">Email Template</label>
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
          )}

          {/* AI Generate Button */}
          {!replyTo && (
            <Button
              onClick={generateAIContent}
              disabled={isGeneratingAI}
              variant="outline"
              className="w-full gap-2"
            >
              <Bot className="h-4 w-4" />
              {isGeneratingAI ? 'Bezig met genereren...' : 'Genereer met AI'}
            </Button>
          )}

          {/* Subject */}
          <div>
            <label className="text-sm font-medium mb-2 block">Onderwerp</label>
            <Input
              value={emailData.subject}
              onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
              placeholder="Email onderwerp..."
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-sm font-medium mb-2 block">Bericht</label>
            <Textarea
              value={emailData.content}
              onChange={(e) => setEmailData({ ...emailData, content: e.target.value })}
              placeholder="Type uw bericht hier..."
              rows={12}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSending}>
              Annuleren
            </Button>
            <Button onClick={handleSendEmail} disabled={isSending} className="gap-2">
              <Send className="h-4 w-4" />
              {isSending ? 'Verzenden...' : 'Verzenden'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
