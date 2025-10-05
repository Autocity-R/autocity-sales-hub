import { Lead } from "@/types/leads";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, History, Mail, Phone, User, Building } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LeadDetailSidebarProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (leadId: string, newStatus: string) => void;
  onOwnerChange: (leadId: string, ownerId: string | null) => void;
}

const STATUSES = [
  { value: 'new', label: 'Nieuw' },
  { value: 'contacted', label: 'Gecontacteerd' },
  { value: 'appointment_planned', label: 'Afspraak Gepland' },
  { value: 'negotiation', label: 'Onderhandeling' },
  { value: 'won', label: 'Gewonnen' },
  { value: 'lost', label: 'Verloren' },
];

export function LeadDetailSidebar({
  lead,
  open,
  onClose,
  onStatusChange,
  onOwnerChange,
}: LeadDetailSidebarProps) {
  const [note, setNote] = useState("");

  if (!lead) return null;

  const handleAddNote = () => {
    if (!note.trim()) return;
    // TODO: Implement note saving to database
    console.log("Adding note:", note);
    setNote("");
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">
            {lead.firstName} {lead.lastName}
          </SheetTitle>
          {lead.company && (
            <p className="text-muted-foreground flex items-center gap-2">
              <Building className="h-4 w-4" />
              {lead.company}
            </p>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="gap-2">
              <Calendar className="h-4 w-4" />
              Plan Afspraak
            </Button>
            <Button size="sm" variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Start Offerte
            </Button>
            <Button size="sm" variant="outline" className="gap-2">
              <Mail className="h-4 w-4" />
              Verstuur Email
            </Button>
          </div>

          <Separator />

          {/* Status & Owner */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={lead.status || 'new'}
                onValueChange={(value) => onStatusChange(lead.id, value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Eigenaar</label>
              <Select
                value={lead.owner_id || "unassigned"}
                onValueChange={(value) =>
                  onOwnerChange(lead.id, value === "unassigned" ? null : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Niet toegewezen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Niet toegewezen</SelectItem>
                  {/* TODO: Load actual users from profiles */}
                  <SelectItem value="user1">Verkoper 1</SelectItem>
                  <SelectItem value="user2">Verkoper 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Tabs */}
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="timeline" className="gap-2">
                <History className="h-4 w-4" />
                Tijdlijn
              </TabsTrigger>
              <TabsTrigger value="details" className="gap-2">
                <User className="h-4 w-4" />
                Details
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="space-y-4 mt-4">
              {/* Timeline items would go here */}
              <div className="text-sm text-muted-foreground text-center py-8">
                Nog geen activiteiten
              </div>

              {/* Add Note */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nieuwe Notitie</label>
                <Textarea
                  placeholder="Voeg een notitie toe aan de tijdlijn..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleAddNote} size="sm" disabled={!note.trim()}>
                  Notitie Toevoegen
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4 mt-4">
              {/* Contact Information */}
              <div>
                <h4 className="font-semibold mb-3">Contactgegevens</h4>
                <div className="space-y-2">
                  {lead.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                        {lead.email}
                      </a>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                        {lead.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Vehicle Interest */}
              {lead.interestedVehicle && (
                <>
                  <div>
                    <h4 className="font-semibold mb-2">Geïnteresseerd Voertuig</h4>
                    <p className="text-sm">{lead.interestedVehicle}</p>
                  </div>
                  <Separator />
                </>
              )}

              {/* Lead Info */}
              <div>
                <h4 className="font-semibold mb-3">Lead Informatie</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bron:</span>
                    <span>{lead.source || 'Onbekend'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prioriteit:</span>
                    <Badge variant={lead.priority === 'high' ? 'destructive' : 'secondary'}>
                      {lead.priority === 'high' ? 'Hoog' : lead.priority === 'medium' ? 'Gemiddeld' : 'Laag'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Aangemaakt:</span>
                    <span>{new Date(lead.created_at).toLocaleDateString('nl-NL')}</span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
