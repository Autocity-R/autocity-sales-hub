
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LeadFollowUpTrigger } from "@/types/leads";
import { Plus, Bell, Calendar, Phone, Car, FileText, Trash2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface LeadFollowUpProps {
  leadId: string;
  followUps: LeadFollowUpTrigger[];
}

export const LeadFollowUp: React.FC<LeadFollowUpProps> = ({ leadId, followUps }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState({
    type: '',
    description: '',
    scheduledDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });
  const { toast } = useToast();

  const followUpTypes = [
    { value: 'proefrit', label: 'Na Proefrit', icon: <Car className="h-4 w-4" /> },
    { value: 'bezichtiging', label: 'Na Bezichtiging', icon: <FileText className="h-4 w-4" /> },
    { value: 'voorstel', label: 'Na Voorstel', icon: <FileText className="h-4 w-4" /> },
    { value: 'algemeen', label: 'Algemene Follow-up', icon: <Phone className="h-4 w-4" /> }
  ];

  const handleCreateFollowUp = () => {
    if (!newFollowUp.type || !newFollowUp.description || !newFollowUp.scheduledDate) {
      toast({
        title: "Fout",
        description: "Alle velden zijn verplicht",
        variant: "destructive",
      });
      return;
    }

    // TODO: Implement follow-up creation logic
    toast({
      title: "Follow-up gepland",
      description: `Follow-up is gepland voor ${format(new Date(newFollowUp.scheduledDate), 'dd/MM/yyyy')}`,
    });

    setNewFollowUp({ type: '', description: '', scheduledDate: '', priority: 'medium' });
    setIsDialogOpen(false);
  };

  const handleDeleteFollowUp = (followUpId: string) => {
    // TODO: Implement follow-up deletion logic
    toast({
      title: "Follow-up verwijderd",
      description: "De follow-up trigger is verwijderd",
    });
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = followUpTypes.find(t => t.value === type);
    return typeConfig?.icon || <Bell className="h-4 w-4" />;
  };

  const getTypeLabel = (type: string) => {
    const typeConfig = followUpTypes.find(t => t.value === type);
    return typeConfig?.label || type;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Hoog';
      case 'medium': return 'Middel';
      case 'low': return 'Laag';
      default: return priority;
    }
  };

  // Get today's date for min date
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Follow-up Triggers</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Follow-up Plannen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nieuwe Follow-up Trigger</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Type Follow-up</label>
                <Select value={newFollowUp.type} onValueChange={(value) => setNewFollowUp({...newFollowUp, type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer follow-up type" />
                  </SelectTrigger>
                  <SelectContent>
                    {followUpTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          {type.icon}
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Beschrijving</label>
                <Textarea 
                  value={newFollowUp.description}
                  onChange={(e) => setNewFollowUp({...newFollowUp, description: e.target.value})}
                  placeholder="Beschrijf wat er moet gebeuren tijdens de follow-up..."
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Geplande Datum</label>
                  <Input 
                    type="date"
                    value={newFollowUp.scheduledDate}
                    onChange={(e) => setNewFollowUp({...newFollowUp, scheduledDate: e.target.value})}
                    min={today}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Prioriteit</label>
                  <Select value={newFollowUp.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setNewFollowUp({...newFollowUp, priority: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Laag</SelectItem>
                      <SelectItem value="medium">Middel</SelectItem>
                      <SelectItem value="high">Hoog</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleCreateFollowUp}>
                  Follow-up Plannen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {followUps.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Geen follow-up triggers gepland voor deze lead
            </CardContent>
          </Card>
        ) : (
          followUps.map((followUp) => (
            <Card key={followUp.id} className={`border-l-4 ${
              followUp.priority === 'high' ? 'border-l-red-500' :
              followUp.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(followUp.type)}
                    <h4 className="font-medium">{getTypeLabel(followUp.type)}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(followUp.priority)}>
                      {getPriorityLabel(followUp.priority)}
                    </Badge>
                    <Badge variant={followUp.completed ? "default" : "secondary"}>
                      {followUp.completed ? 'Voltooid' : 'Actief'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFollowUp(followUp.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{followUp.description}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Gepland: {format(new Date(followUp.scheduledDate), 'dd/MM/yyyy')}</span>
                    </div>
                    
                    {followUp.completedDate && (
                      <div className="flex items-center gap-1">
                        <Bell className="h-3 w-3" />
                        <span>Voltooid: {format(new Date(followUp.completedDate), 'dd/MM/yyyy')}</span>
                      </div>
                    )}
                  </div>
                  
                  {!followUp.completed && new Date(followUp.scheduledDate) <= new Date() && (
                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2 text-orange-800">
                        <Bell className="h-4 w-4" />
                        <span className="font-medium">Actie vereist!</span>
                      </div>
                      <p className="text-sm text-orange-700 mt-1">
                        Deze lead moet worden nagebeld. Neem contact op met de klant.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
