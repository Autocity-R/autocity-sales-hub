
import React, { useState } from "react";
import { Contact } from "@/types/customer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building, Mail, Phone, MapPin, Pencil } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ContactForm from "./ContactForm";

interface ContactDetailsPanelProps {
  contact: Contact;
  onUpdate: (updated: Contact) => void;
}

const ContactDetailsPanel: React.FC<ContactDetailsPanelProps> = ({ contact, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleEditSuccess = (updated: Contact) => {
    setIsEditing(false);
    onUpdate(updated);
  };

  return (
    <>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold">
            {contact.type === "b2c" 
              ? `${contact.firstName} ${contact.lastName}`
              : contact.companyName}
          </h2>
          {(contact.type === "supplier" || contact.type === "b2b") && (
            <p className="text-muted-foreground">
              Contactpersoon: {contact.firstName} {contact.lastName}
            </p>
          )}
          <div className="flex items-center mt-1 text-sm">
            <span className="inline-block px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
              {contact.type === "supplier" ? "Leverancier" : 
               contact.type === "b2b" ? "Zakelijke klant" : 
               "Particuliere klant"}
            </span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          <Pencil className="h-4 w-4 mr-2" />
          Bewerken
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Contactgegevens</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <Mail className="h-5 w-5 mr-3 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p>{contact.email}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Phone className="h-5 w-5 mr-3 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Telefoon</p>
                  <p>{contact.phone}</p>
                </div>
              </div>
              {(contact.type === "supplier" || contact.type === "b2b") && (
                <div className="flex items-start">
                  <Building className="h-5 w-5 mr-3 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Bedrijf</p>
                    <p>{contact.companyName}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Adresgegevens</h3>
            <div className="flex items-start">
              <MapPin className="h-5 w-5 mr-3 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Adres</p>
                <p>{contact.address.street} {contact.address.number}</p>
                <p>{contact.address.zipCode} {contact.address.city}</p>
                <p>{contact.address.country}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {contact.notes && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Notities</h3>
            <p className="whitespace-pre-line">{contact.notes}</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl">
          <ContactForm
            initialData={contact}
            onSuccess={handleEditSuccess}
            onCancel={() => setIsEditing(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContactDetailsPanel;
