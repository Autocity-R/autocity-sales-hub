
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadProposal } from "@/types/leads";
import { Plus, FileText, Calendar, Euro, Car } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface LeadProposalsProps {
  leadId: string;
  proposals: LeadProposal[];
}

export const LeadProposals: React.FC<LeadProposalsProps> = ({ leadId, proposals }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProposal, setNewProposal] = useState({
    vehicleName: '',
    proposedPrice: 0,
    validUntil: '',
    notes: ''
  });
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'viewed': return 'bg-purple-100 text-purple-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Concept';
      case 'sent': return 'Verzonden';
      case 'viewed': return 'Bekeken';
      case 'accepted': return 'Geaccepteerd';
      case 'rejected': return 'Afgewezen';
      default: return status;
    }
  };

  const handleCreateProposal = () => {
    if (!newProposal.vehicleName.trim() || !newProposal.proposedPrice) {
      toast({
        title: "Fout",
        description: "Voertuignaam en prijs zijn verplicht",
        variant: "destructive",
      });
      return;
    }

    // TODO: Implement proposal creation logic
    toast({
      title: "Offerte aangemaakt",
      description: "De offerte is succesvol aangemaakt.",
    });

    setNewProposal({ vehicleName: '', proposedPrice: 0, validUntil: '', notes: '' });
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Offertes</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Offerte Maken
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nieuwe Offerte</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Voertuig</label>
                <Input 
                  value={newProposal.vehicleName}
                  onChange={(e) => setNewProposal({...newProposal, vehicleName: e.target.value})}
                  placeholder="BMW 3 Series 2023"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Prijs (€)</label>
                <Input 
                  type="number"
                  value={newProposal.proposedPrice}
                  onChange={(e) => setNewProposal({...newProposal, proposedPrice: Number(e.target.value)})}
                  placeholder="35000"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Geldig tot</label>
                <Input 
                  type="date"
                  value={newProposal.validUntil}
                  onChange={(e) => setNewProposal({...newProposal, validUntil: e.target.value})}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Notities</label>
                <Textarea 
                  value={newProposal.notes}
                  onChange={(e) => setNewProposal({...newProposal, notes: e.target.value})}
                  placeholder="Aanvullende informatie..."
                  className="min-h-[80px]"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleCreateProposal}>
                  Aanmaken
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {proposals.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Nog geen offertes aangemaakt voor deze lead
            </CardContent>
          </Card>
        ) : (
          proposals.map((proposal) => (
            <Card key={proposal.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">{proposal.vehicleName}</h4>
                  </div>
                  <Badge className={getStatusColor(proposal.status)}>
                    {getStatusLabel(proposal.status)}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <span>€ {proposal.proposedPrice.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Geldig tot {format(new Date(proposal.validUntil), 'dd/MM/yyyy')}</span>
                  </div>
                </div>
                
                {proposal.sentAt && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Verzonden op {format(new Date(proposal.sentAt), 'dd/MM/yyyy HH:mm')}
                  </div>
                )}
                
                {proposal.notes && (
                  <div className="mt-3 text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                    {proposal.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
