import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit, Save, Paperclip, ChevronDown, Check, PenTool } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { 
  getAllEmailTemplates, 
  addEmailTemplate, 
  updateEmailTemplate, 
  deleteEmailTemplate 
} from "@/services/emailTemplateService";
import { EmailTemplate } from "@/types/email";

// Alle beschikbare knoppen uit het voertuigenmenu die emails kunnen versturen
const VEHICLE_ACTION_BUTTONS = [
  { value: "transport_pickup", label: "Transport pickup document sturen" },
  { value: "cmr_supplier", label: "CMR voor Leverancier" },
  { value: "bpm_huys", label: "BPM Huys aanmelden" },
  { value: "vehicle_arrived", label: "Auto is binnengekomen" },
  { value: "license_registration", label: "Kenteken aanmelding update" },
  { value: "contract_b2b", label: "Koopcontract sturen (B2B)" },
  { value: "contract_b2c", label: "Koopcontract sturen (B2C)" },
  { value: "contract_b2b_digital", label: "Digitaal Koopcontract B2B" },
  { value: "contract_b2c_digital", label: "Digitaal Koopcontract B2C" },
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
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState<Partial<EmailTemplate>>({
    name: "",
    subject: "",
    content: "",
    senderEmail: "",
    linkedButton: "",
    hasAttachment: false,
    attachmentType: "auto-upload",
    staticAttachmentType: ""
  });

  const [newButtonOpen, setNewButtonOpen] = useState(false);
  const [editButtonOpen, setEditButtonOpen] = useState(false);

  // Load templates on component mount
  useEffect(() => {
    setTemplates(getAllEmailTemplates());
  }, []);

  const availableVariables = [
    "voertuig_merk", "voertuig_model", "voertuig_vin", "voertuig_kenteken", 
    "voertuig_locatie", "voertuig_kilometerstand", "voertuig_jaar", "voertuig_prijs",
    "klant_naam", "klant_email", "klant_telefoon", "klant_adres",
    "leverancier_naam", "leverancier_email", "leverancier_telefoon",
    "transporteur_naam", "transporteur_email", "transporteur_telefoon",
    "ontvanger_naam", "ontvanger_email",
    "gebruiker_naam", "gebruiker_email", "bedrijf_naam", "datum_vandaag"
  ];

  const attachmentTypes = [
    { value: "auto-upload", label: "Auto-upload documenten (CMR/Pickup uit voertuig bestanden)" },
    { value: "generated-contract", label: "Gegenereerd koopcontract (met digitale ondertekening)" },
    { value: "static-file", label: "Statisch bestand" }
  ];

  const staticDocumentTypes = [
    { value: "CMR", label: "CMR Documenten" },
    { value: "Pickup Document", label: "Pickup Documenten" },
    { value: "Insurance", label: "Verzekeringsdocumenten" },
    { value: "Registration", label: "Kenteken documenten" }
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

    // Validate attachment configuration
    if (newTemplate.hasAttachment && newTemplate.attachmentType === "auto-upload" && !newTemplate.staticAttachmentType) {
      toast({
        title: "Fout",
        description: "Selecteer een document type voor auto-upload bijlagen",
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

    const template = addEmailTemplate({
      name: newTemplate.name!,
      subject: newTemplate.subject!,
      content: newTemplate.content!,
      senderEmail: newTemplate.senderEmail || "info@auto-city.nl",
      linkedButton: newTemplate.linkedButton!,
      hasAttachment: newTemplate.hasAttachment || false,
      attachmentType: newTemplate.attachmentType,
      staticAttachmentType: newTemplate.staticAttachmentType
    });

    setTemplates(getAllEmailTemplates());
    setNewTemplate({ 
      name: "", 
      subject: "", 
      content: "", 
      senderEmail: "",
      linkedButton: "", 
      hasAttachment: false,
      attachmentType: "auto-upload",
      staticAttachmentType: ""
    });
    
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

    updateEmailTemplate(editingTemplate.id, editingTemplate);
    setTemplates(getAllEmailTemplates());
    setEditingTemplate(null);
    
    toast({
      title: "Template bijgewerkt",
      description: "Wijzigingen zijn opgeslagen"
    });
  };

  const handleDeleteTemplate = (id: string) => {
    deleteEmailTemplate(id);
    setTemplates(getAllEmailTemplates());
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

  const ButtonDropdown = ({ 
    value, 
    onValueChange, 
    availableButtons,
    placeholder = "Selecteer een knop",
    open,
    onOpenChange
  }: {
    value: string;
    onValueChange: (value: string) => void;
    availableButtons: typeof VEHICLE_ACTION_BUTTONS;
    placeholder?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value ? getButtonLabel(value) : placeholder}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <ScrollArea className="h-[200px]">
          <div className="p-1">
            {availableButtons.map((button) => (
              <Button
                key={button.value}
                variant="ghost"
                className={cn(
                  "w-full justify-start text-sm font-normal",
                  value === button.value && "bg-accent"
                )}
                onClick={() => {
                  onValueChange(button.value);
                  onOpenChange(false);
                }}
              >
                {value === button.value && (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {button.value.includes("digital") && (
                  <PenTool className="mr-2 h-3 w-3 text-blue-600" />
                )}
                {button.label}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Email Template Beheer</h2>
        <p className="text-muted-foreground mt-2">
          Beheer email templates die gekoppeld zijn aan voertuig actieknoppen. 
          Templates met digitale ondertekening worden automatisch voorzien van ondertekeningslinks.
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
                        {template.linkedButton.includes("digital") && (
                          <PenTool className="h-4 w-4 text-blue-600" />
                        )}
                        {template.name}
                        {template.hasAttachment && (
                          <Badge variant="secondary" className="gap-1">
                            <Paperclip className="h-3 w-3" />
                            {template.attachmentType === "auto-upload" && template.staticAttachmentType}
                            {template.attachmentType === "generated-contract" && "Digitaal Contract"}
                            {template.attachmentType === "static-file" && template.staticAttachmentType}
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {getButtonLabel(template.linkedButton)}
                        </Badge>
                        {template.linkedButton.includes("digital") && (
                          <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-800">
                            <PenTool className="h-3 w-3" />
                            Digitale Ondertekening
                          </Badge>
                        )}
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
                  <ButtonDropdown
                    value={newTemplate.linkedButton || ""}
                    onValueChange={(value) => setNewTemplate({ ...newTemplate, linkedButton: value })}
                    availableButtons={getAvailableButtons()}
                    open={newButtonOpen}
                    onOpenChange={setNewButtonOpen}
                  />
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
                  placeholder="Inhoud van de email - gebruik [ONDERTEKENINGSLINK] voor digitale contracten"
                  className="min-h-[200px]"
                />
                {newTemplate.linkedButton?.includes("digital") && (
                  <p className="text-sm text-blue-600 mt-2">
                    <PenTool className="h-3 w-3 inline mr-1" />
                    Digitaal contract: Gebruik [ONDERTEKENINGSLINK] in de tekst voor de ondertekeningslink
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="has-attachment"
                  checked={newTemplate.hasAttachment || false}
                  onChange={(e) => setNewTemplate({ 
                    ...newTemplate, 
                    hasAttachment: e.target.checked,
                    attachmentType: e.target.checked ? (
                      newTemplate.linkedButton?.includes("contract") ? "generated-contract" : newTemplate.attachmentType
                    ) : undefined,
                    staticAttachmentType: e.target.checked ? newTemplate.staticAttachmentType : undefined
                  })}
                />
                <Label htmlFor="has-attachment">Document bijvoegen</Label>
              </div>

              {newTemplate.hasAttachment && (
                <div className="space-y-4 p-4 border rounded-md bg-muted/20">
                  <div>
                    <Label htmlFor="attachment-type">Bijlage Type</Label>
                    <Select 
                      value={newTemplate.attachmentType || "auto-upload"} 
                      onValueChange={(value: "auto-upload" | "generated-contract" | "static-file") => 
                        setNewTemplate({ ...newTemplate, attachmentType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {attachmentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {newTemplate.attachmentType === "auto-upload" && (
                    <div>
                      <Label htmlFor="static-attachment-type">Document Type</Label>
                      <Select 
                        value={newTemplate.staticAttachmentType || ""} 
                        onValueChange={(value) => 
                          setNewTemplate({ ...newTemplate, staticAttachmentType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer document type" />
                        </SelectTrigger>
                        <SelectContent>
                          {staticDocumentTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {newTemplate.attachmentType === "generated-contract" && (
                    <div className="p-3 bg-blue-50 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>Digitaal Koopcontract:</strong> Een professioneel contract wordt automatisch gegenereerd 
                        met voertuig- en klantgegevens. Voor digitale contracten wordt ook een beveiligde ondertekeningslink toegevoegd.
                      </p>
                    </div>
                  )}

                  {newTemplate.attachmentType === "static-file" && (
                    <div>
                      <Label htmlFor="static-file-name">Bestandsnaam</Label>
                      <Input
                        id="static-file-name"
                        value={newTemplate.staticAttachmentType || ""}
                        onChange={(e) => setNewTemplate({ ...newTemplate, staticAttachmentType: e.target.value })}
                        placeholder="Bijv: Algemene_voorwaarden.pdf"
                      />
                    </div>
                  )}
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
                Klik op een variabele om deze toe te voegen aan de email inhoud. 
                Voor digitale contracten kunt u [ONDERTEKENINGSLINK] gebruiken.
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
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Speciale Variabelen voor Digitale Contracten</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <p><code>[ONDERTEKENINGSLINK]</code> - Wordt vervangen door de veilige ondertekeningslink</p>
                  <p><code>{`{voertuig_prijs}`}</code> - Verkoopprijs van het voertuig</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                  <ButtonDropdown
                    value={editingTemplate.linkedButton}
                    onValueChange={(value) => setEditingTemplate({ ...editingTemplate, linkedButton: value })}
                    availableButtons={[
                      ...getAvailableButtons(editingTemplate.id),
                      VEHICLE_ACTION_BUTTONS.find(btn => btn.value === editingTemplate.linkedButton)!
                    ]}
                    open={editButtonOpen}
                    onOpenChange={setEditButtonOpen}
                  />
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
                {editingTemplate.linkedButton?.includes("digital") && (
                  <p className="text-sm text-blue-600 mt-2">
                    <PenTool className="h-3 w-3 inline mr-1" />
                    Digitaal contract: Gebruik [ONDERTEKENINGSLINK] in de tekst voor de ondertekeningslink
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-has-attachment"
                  checked={editingTemplate.hasAttachment}
                  onChange={(e) => setEditingTemplate({ 
                    ...editingTemplate, 
                    hasAttachment: e.target.checked,
                    attachmentType: e.target.checked ? editingTemplate.attachmentType : undefined,
                    staticAttachmentType: e.target.checked ? editingTemplate.staticAttachmentType : undefined
                  })}
                />
                <Label htmlFor="edit-has-attachment">Document bijvoegen</Label>
              </div>

              {editingTemplate.hasAttachment && (
                <div className="space-y-4 p-4 border rounded-md bg-muted/20">
                  <div>
                    <Label htmlFor="attachment-type">Bijlage Type</Label>
                    <Select 
                      value={editingTemplate.attachmentType || "auto-upload"} 
                      onValueChange={(value: "auto-upload" | "generated-contract" | "static-file") => 
                        setEditingTemplate({ ...editingTemplate, attachmentType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {attachmentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {editingTemplate.attachmentType === "auto-upload" && (
                    <div>
                      <Label htmlFor="static-attachment-type">Document Type</Label>
                      <Select 
                        value={editingTemplate.staticAttachmentType || ""} 
                        onValueChange={(value) => 
                          setEditingTemplate({ ...editingTemplate, staticAttachmentType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer document type" />
                        </SelectTrigger>
                        <SelectContent>
                          {staticDocumentTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {editingTemplate.attachmentType === "generated-contract" && (
                    <div className="p-3 bg-blue-50 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>Digitaal Koopcontract:</strong> Een professioneel contract wordt automatisch gegenereerd 
                        met voertuig- en klantgegevens. Voor digitale contracten wordt ook een beveiligde ondertekeningslink toegevoegd.
                      </p>
                    </div>
                  )}

                  {editingTemplate.attachmentType === "static-file" && (
                    <div>
                      <Label htmlFor="static-file-name">Bestandsnaam</Label>
                      <Input
                        id="static-file-name"
                        value={editingTemplate.staticAttachmentType || ""}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, staticAttachmentType: e.target.value })}
                        placeholder="Bijv: Algemene_voorwaarden.pdf"
                      />
                    </div>
                  )}
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
