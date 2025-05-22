
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getContacts, getContactsByType } from "@/services/customerService";
import ContactList from "@/components/customers/ContactList";
import { ContactType } from "@/types/customer";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Customers = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  
  // Determine active tab based on the current path
  let initialTab = "all";
  if (currentPath === "/suppliers") initialTab = "suppliers";
  if (currentPath === "/customers/b2b") initialTab = "b2b";
  if (currentPath === "/customers/b2c") initialTab = "b2c";
  
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  
  const allContacts = getContacts();
  const suppliers = getContactsByType("supplier");
  const b2bCustomers = getContactsByType("b2b");
  const b2cCustomers = getContactsByType("b2c");
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Klanten & Leveranciers</h1>
          <p className="text-muted-foreground">
            CRM-systeem voor het beheren van alle contacten
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate("/")}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Terug naar Dashboard
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">Alle contacten</TabsTrigger>
          <TabsTrigger value="suppliers">Leveranciers</TabsTrigger>
          <TabsTrigger value="b2b">Zakelijke klanten</TabsTrigger>
          <TabsTrigger value="b2c">Particuliere klanten</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <ContactList 
            contacts={allContacts} 
            title="Alle contacten"
          />
        </TabsContent>
        
        <TabsContent value="suppliers">
          <ContactList 
            contacts={suppliers} 
            title="Leveranciers" 
            type="supplier"
          />
        </TabsContent>
        
        <TabsContent value="b2b">
          <ContactList 
            contacts={b2bCustomers} 
            title="Zakelijke klanten" 
            type="b2b"
          />
        </TabsContent>
        
        <TabsContent value="b2c">
          <ContactList 
            contacts={b2cCustomers} 
            title="Particuliere klanten" 
            type="b2c"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Customers;
