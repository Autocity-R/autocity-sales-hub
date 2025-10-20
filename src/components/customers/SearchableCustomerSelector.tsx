import React, { useState, useEffect, useRef } from "react";
import { Check, ChevronDown, Plus, Search, User, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ContactForm } from "@/components/customers/ContactForm";
import { Contact, ContactType } from "@/types/customer";
import { supabaseCustomerService } from "@/services/supabaseCustomerService";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SearchableCustomerSelectorProps {
  value?: string;
  onValueChange: (customerId: string, customer: Contact) => void;
  customerType?: ContactType | 'customer'; // optional: show all when omitted, 'customer' for both b2b and b2c
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const SearchableCustomerSelector: React.FC<SearchableCustomerSelectorProps> = ({
  value,
  onValueChange,
  customerType,
  label = "Klant",
  placeholder = "Zoek en selecteer klant...",
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const { toast } = useToast();
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Search customers when search term changes
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        setLoading(true);
        try {
          const results = await supabaseCustomerService.searchContacts(searchTerm, customerType);
          setCustomers(results);
        } catch (error) {
          console.error("Error searching customers:", error);
          toast({
            variant: "destructive",
            description: "Fout bij het zoeken naar klanten"
          });
        } finally {
          setLoading(false);
        }
      } else if (searchTerm.length === 0) {
        // Load initial customers when search is empty
        loadInitialCustomers();
      } else {
        setCustomers([]);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, customerType]);

  // Load initial customers
const loadInitialCustomers = async () => {
  setLoading(true);
  try {
    const results = customerType
      ? await supabaseCustomerService.getContactsByType(customerType)
      : await supabaseCustomerService.getAllContacts();
    setCustomers(results.slice(0, 10)); // Limit initial results
  } catch (error) {
    console.error("Error loading customers:", error);
    toast({
      variant: "destructive",
      description: "Fout bij het laden van klanten"
    });
  } finally {
    setLoading(false);
  }
};

  // Load initial customers on mount
  useEffect(() => {
    loadInitialCustomers();
  }, [customerType]);

  // Find selected customer when value changes
  useEffect(() => {
    if (value && customers.length > 0) {
      const customer = customers.find(c => c.id === value);
      if (customer) {
        setSelectedCustomer(customer);
      } else {
        // Try to fetch the customer by ID if not in current list
        supabaseCustomerService.getContactById(value).then(customer => {
          if (customer) {
            setSelectedCustomer(customer);
          }
        }).catch(console.error);
      }
    } else {
      setSelectedCustomer(null);
    }
  }, [value, customers]);

  const handleSelectCustomer = (customer: Contact) => {
    setSelectedCustomer(customer);
    setOpen(false);
    onValueChange(customer.id, customer);
  };

  const handleCreateNewCustomer = (newCustomer: Contact) => {
    setShowNewCustomerForm(false);
    handleSelectCustomer(newCustomer);
    loadInitialCustomers(); // Refresh the list
  };

  const getCustomerDisplayName = (customer: Contact) => {
    if (customer.companyName) {
      return customer.companyName;
    }
    return `${customer.firstName} ${customer.lastName}`;
  };

  const getCustomerIcon = (customer: Contact) => {
    return customer.companyName ? <Building className="h-4 w-4" /> : <User className="h-4 w-4" />;
  };

  return (
    <>
      <div className="space-y-2">
        <Label>{label}</Label>
        <Popover open={open && !disabled} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
              disabled={disabled}
            >
              {selectedCustomer ? (
                <div className="flex items-center gap-2">
                  {getCustomerIcon(selectedCustomer)}
                  <div className="flex flex-col items-start">
                    <span className="truncate">{getCustomerDisplayName(selectedCustomer)}</span>
                    <span className="text-xs text-muted-foreground truncate">{selectedCustomer.email}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Search className="h-4 w-4" />
                  {placeholder}
                </div>
              )}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Zoek klanten..."
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <CommandList>
                {loading && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Zoeken...
                  </div>
                )}
                
                {!loading && customers.length === 0 && searchTerm.length >= 2 && (
                  <CommandEmpty>
                    <div className="text-center space-y-2">
                      <p>Geen klanten gevonden</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowNewCustomerForm(true)}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Nieuwe klant toevoegen
                      </Button>
                    </div>
                  </CommandEmpty>
                )}

                {!loading && customers.length > 0 && (
                  <CommandGroup>
                    {customers.map((customer) => (
                      <CommandItem
                        key={customer.id}
                        value={customer.id}
                        onSelect={() => handleSelectCustomer(customer)}
                        className="flex items-center justify-between p-3"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {getCustomerIcon(customer)}
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-medium truncate">
                              {getCustomerDisplayName(customer)}
                            </span>
                            <span className="text-sm text-muted-foreground truncate">
                              {customer.email}
                            </span>
                            {customer.phone && (
                              <span className="text-xs text-muted-foreground">
                                {customer.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        <Check
                          className={cn(
                            "h-4 w-4",
                            value === customer.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {!loading && searchTerm.length < 2 && (
                  <div className="p-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowNewCustomerForm(true)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nieuwe klant toevoegen
                    </Button>
                  </div>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* New Customer Dialog */}
      <Dialog open={showNewCustomerForm} onOpenChange={setShowNewCustomerForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Nieuwe {customerType === 'b2b' ? 'zakelijke' : customerType === 'b2c' ? 'particuliere' : ''} klant toevoegen
            </DialogTitle>
          </DialogHeader>
          <ContactForm
            contactType={customerType === 'customer' ? 'b2c' : customerType}
            onSuccess={handleCreateNewCustomer}
            onCancel={() => setShowNewCustomerForm(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};