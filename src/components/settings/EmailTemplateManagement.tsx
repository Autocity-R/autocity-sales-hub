
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Edit, Save, Plus, Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  linkedButton: string;
  hasAttachment: boolean;
  attachmentType?: string;
}

// Alle beschikbare knoppen uit het voertuigenmenu
const VEHICLE_ACTION_BUTTONS = [
  { value: "transport_pickup", label: "Transport pickup document sturen" },
  { value: "cmr_supplier", label: "CMR voor Leverancier" },
  { value: "bpm_huys", label: "BPM Huys aanmelden" },
  { value: "vehicle_arrived", label: "Auto is binnengekomen" },
  { value: "license_registration", label: "Kenteken aanmelding update" },
  { value: "contract_b2b", label: "Koopcontract sturen (B2B)" },
  { value: "contract_b2c", label: "Koopcontract sturen (B2C)" },
  { value: "rdw_approved", label: "Auto is goedgekeurd door RDW" },
  { value: "bpm_paid", label: "BPM is betaald" },
  { value: "car_registered", label: "Auto is ingeschreven" },
  { value: "delivery_appointment", label: "Aflevering: plan een afspraak" },
  { value: "workshop_update", label: "Werkplaats update" },
  { value: "payment_reminder", label: "Handmatig betalingsherinnering sturen" },
  { value: "reminder_papers", label: "Handmatig herinnering sturen" },
];

export const EmailTemplateManagement: React.FC = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([
    {
      id: "1",
      name: "CMR Leverancier",
      subject: "CMR Document - {voertuig_merk} {voertuig_model}",
      content: "Beste leverancier,\n\nBijgevoegd vindt u het CMR document voor:\n- Voertuig: {voertuig_merk} {voertuig_model}\n- VIN: {voertuig_vin}\n- Kenteken: {voertuig_kenteken}\n\nMet vriendelijke groet,\n{gebruiker_naam}",
      linkedButton: "cmr_supplier",
      hasAttachment: true,
      attachmentType: "CMR"
    },
    {
      id: "2", 
      name: "Transport Pickup",
      subject: "Pickup Document - {voertuig_merk} {voertuig_model}",
      content: "Beste transporteur,\n\nHierbij het pickup document voor:\n- Voertuig: {voertuig_merk} {voertuig_model}\n- Locatie: {voertuig_locatie}\n- VIN: {voertuig_vin}\n\nGraag contact opnemen voor planning.\n\nMet vriendelijke groet,\n{gebruiker_naam}",
      linkedButton: "transport_pickup",
      hasAttachment: true,
      attachmentType: "Pickup Document"
    }
  ]);
  
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState<Partial<EmailTemplate>>({
    name: "",
    subject: "",
    content: "",
    linkedButton: "",
    hasAttachment: false
  });

  const availableVariables = [
    "voertuig_merk", "voertuig_model", "voertuig_vin", "voertuig_kenteken", 
    "voertuig_locatie", "voertuig_kilometerstand", "voertuig_jaar",
    "klant_naam", "klant_email", "klant_telefoon", "klant_adres",
    "leverancier_naam", "leverancier_email", "leverancier_telefoon",
    "transporteur_naam", "transporteur_email", "transporteur_telefoon",
    "gebruiker_naam", "gebruiker_email", "bedrijf_naam", "datum_vandaag"
  ];

  const handleSaveTemplate = () => {
    if (!newTemplate.name || !newTemplate.subject || !newTemplate.content || !newTemplate.linkedButton) {
      toast({
        title: "Fout",
        description: "Alle velden zijn verplicht",
        variant: "destructive"
      });
      return;
    }

    // Check if button is already linked to another template
    const existingTemplate = templates.find(t => t.linkedButton === newTemplate.linkedButton);
    if (existingTemplate) {
      toast({
        title: "Knop al gekoppeld",
        description: `Deze knop is al gekoppeld aan template "${existingTemplate.name}"`,
        variant: "destructive"
      });
      return;
    }

    const template: EmailTemplate = {
      id: Date.now().toString(),
      name: newTemplate.name!,
      subject: newTemplate.subject!,
      content: newTemplate.content!,
      linkedButton: newTemplate.linkedButton!,
      hasAttachment: newTemplate.hasAttachment || false,
      attachmentType: newTemplate.attachmentType
    };

    setTemplates([...templates, template]);
    setNewTemplate({ name: "", subject: "", content: "", linkedButton: "", hasAttachment: false });
    
    toast({
      title: "Template opgeslagen",
      description: `Template "${template.name}" is gekoppeld aan de knop`
    });
  };

  const handleUpdateTemplate = () => {
    if (!editingTemplate) return;

    // Check if button is already linked to another template (excluding current one)
    const existingTemplate = templates.find(t => 
      t.linkedButton === editingTemplate.linkedButton && t.id !== editingTemplate.id
    );
    if (existingTemplate) {
      toast({
        title: "Knop al gekoppeld",
        description: `Deze knop is al gekoppeld aan template "${existingTemplate.name}"`,
        variant: "destructive"
      });
      return;
    }

    setTemplates(templates.map(t => t.id === editingTemplate.id ? editingTemplate : t));
    setEditingTemplate(null);
    
    toast({
      title: "Template bijgewerkt",
      description: "Wijzigingen zijn opgeslagen"
    });
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
    toast({
      title: "Template verwijderd",
      description: "Template is succesvol verwijderd"
    });
  };

  const insertVariable = (variable: string, isEditing: boolean = false) => {
    const placeholder = `{${variable}}`;
    if (isEditing && editingTemplate) {
      setEditingTemplate({
        ...editingTemplate,
        content: editingTemplate.content + placeholder
      });
    } else {
      setNewTemplate({
        ...newTemplate,
        content: (newTemplate.content || "") + placeholder
      });
    }
  };

  const getButtonLabel = (buttonValue: string) => {
    return VEHICLE_ACTION_BUTTONS.find(btn => btn.value === buttonValue)?.label || buttonValue;
  };

  // Get available buttons (not already linked)
  const getAvailableButtons = (excludeId?: string) => {
    const linkedButtons = templates
      .filter(t => excludeId ? t.id !== excludeId : true)
      .map(t => t.linkedButton);
    
    return VEHICLE_ACTION_BUTTONS.filter(btn => !linkedButtons.includes(btn.value));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Email Template Beheer</h2>
        <p className="text-muted-foreground mt-2">
          Beheer email templates die gekoppeld zijn aan voertuig actieknoppen. 
          Wanneer een knop wordt gebruikt, wordt automatisch de gekoppelde email verstuurd.
        </p>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="new">Nieuwe Template</TabsTrigger>
          <TabsTrigger value="variables">Beschikbare Variabelen</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <CardTitle className="flex items-center gap-2">
                        {template.name}
                        {template.hasAttachment && (
                          <Badge variant="secondary" className="gap-1">
                            <Paperclip className="h-3 w-3" />
                            {template.attachmentType}
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {getButtonLabel(template.linkedButton)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTemplate(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-sm font-medium">Onderwerp:</Label>
                      <p className="text-sm text-muted-foreground">{template.subject}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Inhoud:</Label>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {template.content.substring(0, 200)}
                        {template.content.length > 200 && "..."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="new" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nieuwe Email Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="template-name">Template Naam</Label>
                  <Input
                    id="template-name"
                    value={newTemplate.name || ""}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="Naam van de template"
                  />
                </div>
                <div>
                  <Label htmlFor="linked-button">Gekoppelde Knop</Label>
                  <Select 
                    value={newTemplate.linkedButton || ""} 
                    onValueChange={(value) => setNewTemplate({ ...newTemplate, linkedButton: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer een knop" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableButtons().map((button) => (
                        <SelectItem key={button.value} value={button.value}>
                          {button.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="template-subject">Email Onderwerp</Label>
                <Input
                  id="template-subject"
                  value={newTemplate.subject || ""}
                  onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                  placeholder="Onderwerp van de email"
                />
              </div>

              <div>
                <Label htmlFor="template-content">Email Inhoud</Label>
                <Textarea
                  id="template-content"
                  value={newTemplate.content || ""}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                  placeholder="Inhoud van de email"
                  className="min-h-[200px]"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="has-attachment"
                  checked={newTemplate.hasAttachment || false}
                  onChange={(e) => setNewTemplate({ 
                    ...newTemplate, 
                    hasAttachment: e.target.checked,
                    attachmentType: e.target.checked ? newTemplate.attachmentType : undefined
                  })}
                />
                <Label htmlFor="has-attachment">Document bijvoegen</Label>
              </div>

              {newTemplate.hasAttachment && (
                <div>
                  <Label htmlFor="attachment-type">Document Type</Label>
                  <Input
                    id="attachment-type"
                    value={newTemplate.attachmentType || ""}
                    onChange={(e) => setNewTemplate({ ...newTemplate, attachmentType: e.target.value })}
                    placeholder="Bijv: CMR, Contract, Factuur"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSaveTemplate}>
                  <Save className="h-4 w-4 mr-2" />
                  Template Opslaan
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Beschikbare Variabelen</CardTitle>
              <p className="text-sm text-muted-foreground">
                Klik op een variabele om deze toe te voegen aan de email inhoud
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {availableVariables.map((variable) => (
                  <Button
                    key={variable}
                    variant="outline"
                    size="sm"
                    onClick={() => insertVariable(variable, !!editingTemplate)}
                    className="justify-start text-xs"
                  >
                    {`{${variable}}`}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Template Dialog */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Template Bewerken</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Template Naam</Label>
                  <Input
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Gekoppelde Knop</Label>
                  <Select 
                    value={editingTemplate.linkedButton} 
                    onValueChange={(value) => setEditingTemplate({ ...editingTemplate, linkedButton: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableButtons(editingTemplate.id).map((button) => (
                        <SelectItem key={button.value} value={button.value}>
                          {button.label}
                        </SelectItem>
                      ))}
                      {/* Also include the currently selected button */}
                      <SelectItem value={editingTemplate.linkedButton}>
                        {getButtonLabel(editingTemplate.linkedButton)}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Email Onderwerp</Label>
                <Input
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                />
              </div>

              <div>
                <Label>Email Inhoud</Label>
                <Textarea
                  value={editingTemplate.content}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                  className="min-h-[200px]"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-has-attachment"
                  checked={editingTemplate.hasAttachment}
                  onChange={(e) => setEditingTemplate({ 
                    ...editingTemplate, 
                    hasAttachment: e.target.checked,
                    attachmentType: e.target.checked ? editingTemplate.attachmentType : undefined
                  })}
                />
                <Label htmlFor="edit-has-attachment">Document bijvoegen</Label>
              </div>

              {editingTemplate.hasAttachment && (
                <div>
                  <Label>Document Type</Label>
                  <Input
                    value={editingTemplate.attachmentType || ""}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, attachmentType: e.target.value })}
                    placeholder="Bijv: CMR, Contract, Factuur"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleUpdateTemplate}>
                  <Save className="h-4 w-4 mr-2" />
                  Wijzigingen Opslaan
                </Button>
                <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                  Annuleren
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
