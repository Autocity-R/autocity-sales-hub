
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LeadEmail } from "@/types/leads";
import { Plus, Mail, Eye, MousePointer, Reply } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface LeadCommunicationProps {
  leadId: string;
  emails: LeadEmail[];
}

export const LeadCommunication: React.FC<LeadCommunicationProps> = ({ leadId, emails }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState({
    subject: '',
    content: ''
  });
  const { toast } = useToast();

  const handleSendEmail = () => {
    if (!newEmail.subject.trim() || !newEmail.content.trim()) {
      toast({
        title: "Fout",
        description: "Onderwerp en inhoud zijn verplicht",
        variant: "destructive",
      });
      return;
    }

    // TODO: Implement email sending logic
    toast({
      title: "Email verzonden",
      description: "De email is succesvol verzonden naar de lead.",
    });

    setNewEmail({ subject: '', content: '' });
    setIsDialogOpen(false);
  };

  const getEmailStatus = (email: LeadEmail) => {
    if (email.replied) return { label: 'Beantwoord', color: 'bg-green-100 text-green-800', icon: <Reply className="h-3 w-3" /> };
    if (email.clicked) return { label: 'Geklikt', color: 'bg-purple-100 text-purple-800', icon: <MousePointer className="h-3 w-3" /> };
    if (email.opened) return { label: 'Geopend', color: 'bg-blue-100 text-blue-800', icon: <Eye className="h-3 w-3" /> };
    return { label: 'Verzonden', color: 'bg-gray-100 text-gray-800', icon: <Mail className="h-3 w-3" /> };
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Communicatie</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Email Versturen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nieuwe Email</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Onderwerp</label>
                <Input 
                  value={newEmail.subject}
                  onChange={(e) => setNewEmail({...newEmail, subject: e.target.value})}
                  placeholder="Email onderwerp"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Inhoud</label>
                <Textarea 
                  value={newEmail.content}
                  onChange={(e) => setNewEmail({...newEmail, content: e.target.value})}
                  placeholder="Email inhoud..."
                  className="min-h-[200px]"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleSendEmail}>
                  Versturen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {emails.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Nog geen emails verzonden naar deze lead
            </CardContent>
          </Card>
        ) : (
          emails.map((email) => {
            const status = getEmailStatus(email);
            return (
              <Card key={email.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">{email.subject}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={status.color}>
                        {status.icon}
                        {status.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(email.sentAt), 'dd/MM/yyyy HH:mm')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">
                    {email.content.length > 200 
                      ? `${email.content.substring(0, 200)}...` 
                      : email.content
                    }
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
