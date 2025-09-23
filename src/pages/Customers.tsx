import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getContacts, getContactsByType } from "@/services/customerService";
import ContactList from "@/components/customers/ContactList";
import { Contact, ContactType } from "@/types/customer";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";

const Customers = () => {
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [suppliers, setSuppliers] = useState<Contact[]>([]);
  const [b2bCustomers, setB2bCustomers] = useState<Contact[]>([]);
  const [b2cCustomers, setB2cCustomers] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContacts = async () => {
      try {
        const [all, supplierList, b2bList, b2cList] = await Promise.all([
          getContacts(),
          getContactsByType("supplier"),
          getContactsByType("b2b"),
          getContactsByType("b2c")
        ]);
        
        setAllContacts(all);
        setSuppliers(supplierList);
        setB2bCustomers(b2bList);
        setB2cCustomers(b2cList);
      } catch (error) {
        console.error("Error loading contacts:", error);
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader 
            title="Klanten & Contacten"
            description="Beheer al uw leveranciers, zakelijke en particuliere klanten"
          />
          <div className="flex justify-center items-center py-8">
            <p>Contacten laden...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Klanten & Contacten"
          description="Beheer al uw leveranciers, zakelijke en particuliere klanten"
        />
        
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
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
    </DashboardLayout>
  );
};

export default Customers;