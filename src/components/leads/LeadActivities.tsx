
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadActivity, ActivityType } from "@/types/leads";
import { addLeadActivity } from "@/services/leadService";
import { 
  Plus, 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  Clock,
  User
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface LeadActivitiesProps {
  leadId: string;
  activities: LeadActivity[];
}

export const LeadActivities: React.FC<LeadActivitiesProps> = ({ leadId, activities }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newActivity, setNewActivity] = useState({
    type: 'call' as ActivityType,
    title: '',
    description: '',
    duration: 0,
    outcome: '',
    nextAction: ''
  });
  const { toast } = useToast();

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'meeting': return <Calendar className="h-4 w-4" />;
      case 'note': return <FileText className="h-4 w-4" />;
      case 'proposal': return <FileText className="h-4 w-4" />;
      case 'follow-up': return <Clock className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case 'call': return 'bg-blue-100 text-blue-800';
      case 'email': return 'bg-green-100 text-green-800';
      case 'meeting': return 'bg-purple-100 text-purple-800';
      case 'note': return 'bg-gray-100 text-gray-800';
      case 'proposal': return 'bg-orange-100 text-orange-800';
      case 'follow-up': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityLabel = (type: ActivityType) => {
    switch (type) {
      case 'call': return 'Telefoongesprek';
      case 'email': return 'Email';
      case 'meeting': return 'Afspraak';
      case 'note': return 'Notitie';
      case 'proposal': return 'Offerte';
      case 'follow-up': return 'Follow-up';
      default: return type;
    }
  };

  const handleAddActivity = () => {
    if (!newActivity.title.trim()) {
      toast({
        title: "Fout",
        description: "Titel is verplicht",
        variant: "destructive",
      });
      return;
    }

    try {
      addLeadActivity({
        leadId,
        type: newActivity.type,
        title: newActivity.title,
        description: newActivity.description,
        duration: newActivity.duration || undefined,
        outcome: newActivity.outcome || undefined,
        nextAction: newActivity.nextAction || undefined,
        createdBy: "Huidige gebruiker" // TODO: Get from auth context
      });

      toast({
        title: "Activiteit toegevoegd",
        description: "De activiteit is succesvol toegevoegd.",
      });

      setNewActivity({
        type: 'call',
        title: '',
        description: '',
        duration: 0,
        outcome: '',
        nextAction: ''
      });
      setIsDialogOpen(false);
      
      // TODO: Refresh activities list
    } catch (error) {
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het toevoegen van de activiteit.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Activiteiten</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Activiteit Toevoegen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nieuwe Activiteit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={newActivity.type} onValueChange={(value: ActivityType) => setNewActivity({...newActivity, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Telefoongesprek</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Afspraak</SelectItem>
                    <SelectItem value="note">Notitie</SelectItem>
                    <SelectItem value="proposal">Offerte</SelectItem>
                    <SelectItem value="follow-up">Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Titel</label>
                <Input 
                  value={newActivity.title}
                  onChange={(e) => setNewActivity({...newActivity, title: e.target.value})}
                  placeholder="Korte beschrijving van de activiteit"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Beschrijving</label>
                <Textarea 
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
                  placeholder="Uitgebreide beschrijving..."
                  className="min-h-[80px]"
                />
              </div>
              
              {newActivity.type === 'call' && (
                <div>
                  <label className="text-sm font-medium">Duur (minuten)</label>
                  <Input 
                    type="number"
                    value={newActivity.duration}
                    onChange={(e) => setNewActivity({...newActivity, duration: Number(e.target.value)})}
                    placeholder="15"
                  />
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium">Uitkomst</label>
                <Input 
                  value={newActivity.outcome}
                  onChange={(e) => setNewActivity({...newActivity, outcome: e.target.value})}
                  placeholder="Wat was het resultaat?"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Volgende actie</label>
                <Input 
                  value={newActivity.nextAction}
                  onChange={(e) => setNewActivity({...newActivity, nextAction: e.target.value})}
                  placeholder="Wat is de volgende stap?"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleAddActivity}>
                  Toevoegen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {activities.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Nog geen activiteiten voor deze lead
            </CardContent>
          </Card>
        ) : (
          activities.map((activity) => (
            <Card key={activity.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2">
                    {getActivityIcon(activity.type)}
                    <Badge className={getActivityColor(activity.type)}>
                      {getActivityLabel(activity.type)}
                    </Badge>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{activity.title}</h4>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(activity.date), 'dd/MM/yyyy HH:mm')}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {activity.description}
                    </p>
                    
                    {activity.duration && (
                      <p className="text-xs text-muted-foreground">
                        Duur: {activity.duration} minuten
                      </p>
                    )}
                    
                    {activity.outcome && (
                      <div className="mt-2">
                        <span className="text-xs font-medium">Uitkomst: </span>
                        <span className="text-xs">{activity.outcome}</span>
                      </div>
                    )}
                    
                    {activity.nextAction && (
                      <div className="mt-1">
                        <span className="text-xs font-medium">Volgende actie: </span>
                        <span className="text-xs">{activity.nextAction}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {activity.createdBy}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
