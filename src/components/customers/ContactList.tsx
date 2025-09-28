
import React, { useState } from "react";
import { Contact, ContactType } from "@/types/customer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Search, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ContactForm } from "./ContactForm";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

interface ContactListProps {
  contacts: Contact[];
  title: string;
  type?: ContactType;
}

const ContactList: React.FC<ContactListProps> = ({ contacts, title, type }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const filteredContacts = contacts.filter(contact => {
    const searchFields = [
      contact.firstName,
      contact.lastName,
      contact.email,
      contact.phone,
      contact.companyName,
      contact.address.city
    ].filter(Boolean).join(" ").toLowerCase();
    
    return searchTerm === "" || searchFields.includes(searchTerm.toLowerCase());
  });
  
  const handleViewDetails = (contactId: string) => {
    navigate(`/customers/${contactId}`);
  };
  
  const handleAddSuccess = () => {
    setIsAddContactOpen(false);
    // Invalidate all contact queries to refresh the data
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <Button onClick={() => setIsAddContactOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {type === "supplier" ? "Nieuwe leverancier" :
           type === "b2b" ? "Nieuwe B2B klant" :
           type === "b2c" ? "Nieuwe B2C klant" : "Nieuw contact"}
        </Button>
      </div>
      
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Zoeken..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {(type === "supplier" || type === "b2b" || !type) && (
                <TableHead>Bedrijf</TableHead>
              )}
              <TableHead>Naam</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefoon</TableHead>
              <TableHead>Plaats</TableHead>
              {!type && <TableHead>Type</TableHead>}
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContacts.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={type ? 5 : 6}
                  className="text-center py-10 text-muted-foreground"
                >
                  Geen contacten gevonden
                </TableCell>
              </TableRow>
            ) : (
              filteredContacts.map((contact) => (
                <TableRow key={contact.id}>
                  {(type === "supplier" || type === "b2b" || !type) && (
                    <TableCell>{contact.companyName || "-"}</TableCell>
                  )}
                  <TableCell>{`${contact.firstName} ${contact.lastName}`}</TableCell>
                  <TableCell>{contact.email}</TableCell>
                  <TableCell>{contact.phone}</TableCell>
                  <TableCell>{contact.address.city}</TableCell>
                  {!type && (
                    <TableCell>
                      {contact.type === "supplier" ? "Leverancier" : 
                       contact.type === "b2b" ? "B2B" : "B2C"}
                    </TableCell>
                  )}
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleViewDetails(contact.id)}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
        <DialogContent className="max-w-2xl">
          <ContactForm 
            contactType={type}
            onSuccess={handleAddSuccess}
            onCancel={() => setIsAddContactOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactList;
