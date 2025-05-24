
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { LeadEmail } from "@/types/leads";
import { Mail, Eye, MousePointer, Reply, Calendar } from "lucide-react";
import { format } from "date-fns";

interface LeadEmailDetailProps {
  email: LeadEmail;
  isOpen: boolean;
  onClose: () => void;
}

export const LeadEmailDetail: React.FC<LeadEmailDetailProps> = ({ email, isOpen, onClose }) => {
  const getEmailStatus = (email: LeadEmail) => {
    if (email.replied) return { label: 'Beantwoord', color: 'bg-green-100 text-green-800', icon: <Reply className="h-3 w-3" /> };
    if (email.clicked) return { label: 'Geklikt', color: 'bg-purple-100 text-purple-800', icon: <MousePointer className="h-3 w-3" /> };
    if (email.opened) return { label: 'Geopend', color: 'bg-blue-100 text-blue-800', icon: <Eye className="h-3 w-3" /> };
    return { label: 'Verzonden', color: 'bg-gray-100 text-gray-800', icon: <Mail className="h-3 w-3" /> };
  };

  const status = getEmailStatus(email);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Email Header */}
          <div className="border-b pb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">{email.subject}</h2>
              <Badge className={status.color}>
                {status.icon}
                {status.label}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Verzonden: {format(new Date(email.sentAt), 'dd/MM/yyyy HH:mm')}</span>
              </div>
              
              {email.opened && (
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>Geopend</span>
                </div>
              )}
              
              {email.clicked && (
                <div className="flex items-center gap-1">
                  <MousePointer className="h-4 w-4" />
                  <span>Link geklikt</span>
                </div>
              )}
              
              {email.replied && (
                <div className="flex items-center gap-1">
                  <Reply className="h-4 w-4" />
                  <span>Beantwoord</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Email Content */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="font-medium mb-3">Email Inhoud:</h3>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {email.content}
            </div>
          </div>
          
          {/* Email Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {email.opened ? '✓' : '✗'}
              </div>
              <div className="text-sm text-blue-800">Geopend</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {email.clicked ? '✓' : '✗'}
              </div>
              <div className="text-sm text-purple-800">Geklikt</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {email.replied ? '✓' : '✗'}
              </div>
              <div className="text-sm text-green-800">Beantwoord</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {format(new Date(email.sentAt), 'HH:mm')}
              </div>
              <div className="text-sm text-gray-800">Tijdstip</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
