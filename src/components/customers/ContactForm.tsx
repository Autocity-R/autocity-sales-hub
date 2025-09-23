
import React from "react";
import { useForm } from "react-hook-form";
import { Contact, ContactType, Address } from "@/types/customer";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { addContact, updateContact } from "@/services/customerService";

interface ContactFormProps {
  initialData?: Partial<Contact>;
  onSuccess?: (contact: Contact) => void;
  contactType?: ContactType;
  onCancel?: () => void;
}

const ContactForm: React.FC<ContactFormProps> = ({ 
  initialData, 
  onSuccess, 
  contactType, 
  onCancel 
}) => {
  const defaultValues: Partial<Contact> = {
    type: contactType || "b2c",
    companyName: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: {
      street: "",
      number: "",
      city: "",
      zipCode: "",
      country: "Nederland"
    },
    notes: "",
    ...initialData
  };

  const form = useForm<Partial<Contact>>({
    defaultValues
  });

  const isEditMode = !!initialData?.id;
  const selectedType = form.watch("type");

  const onSubmit = async (data: Partial<Contact>) => {
    try {
      let result: Contact;
      
      if (isEditMode && initialData?.id) {
        result = await updateContact({
          ...(data as Contact),
          id: initialData.id,
          createdAt: initialData.createdAt!,
          updatedAt: new Date().toISOString()
        });
        toast.success("Contact succesvol bijgewerkt");
      } else {
        result = await addContact(data as Omit<Contact, "id" | "createdAt" | "updatedAt">);
        toast.success("Nieuw contact succesvol toegevoegd");
      }
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      if (!isEditMode) {
        form.reset(defaultValues);
      }
    } catch (error) {
      console.error("Error saving contact:", error);
      toast.error("Er is een fout opgetreden bij het opslaan van het contact");
    }
  };

  const getFormTitle = () => {
    if (isEditMode) return "Contact bewerken";
    
    switch (contactType) {
      case "supplier":
        return "Nieuwe leverancier";
      case "b2b":
        return "Nieuwe zakelijke klant";
      case "b2c":
        return "Nieuwe particuliere klant";
      default:
        return "Nieuw contact";
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">{getFormTitle()}</h3>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {!contactType && (
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type contact</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer type contact" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="supplier">Leverancier</SelectItem>
                      <SelectItem value="b2b">Zakelijke klant (B2B)</SelectItem>
                      <SelectItem value="b2c">Particuliere klant (B2C)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          {(selectedType === "supplier" || selectedType === "b2b") && (
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bedrijfsnaam</FormLabel>
                  <FormControl>
                    <Input placeholder="Bedrijfsnaam" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Voornaam</FormLabel>
                  <FormControl>
                    <Input placeholder="Voornaam" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Achternaam</FormLabel>
                  <FormControl>
                    <Input placeholder="Achternaam" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefoonnummer</FormLabel>
                  <FormControl>
                    <Input placeholder="Telefoonnummer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <h4 className="font-medium text-lg pt-2">Adresgegevens</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="address.street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Straat</FormLabel>
                  <FormControl>
                    <Input placeholder="Straat" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address.number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Huisnummer</FormLabel>
                  <FormControl>
                    <Input placeholder="Huisnummer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="address.city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plaats</FormLabel>
                  <FormControl>
                    <Input placeholder="Plaats" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address.zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postcode</FormLabel>
                  <FormControl>
                    <Input placeholder="Postcode" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="address.country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Land</FormLabel>
                <FormControl>
                  <Input placeholder="Land" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notities</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Voeg extra informatie toe..." 
                    className="min-h-[100px]" 
                    {...field} 
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex justify-end space-x-2 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Annuleren
              </Button>
            )}
            <Button type="submit">
              {isEditMode ? "Bijwerken" : "Opslaan"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export { ContactForm };
