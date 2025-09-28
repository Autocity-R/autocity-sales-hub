import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getContacts, getContactsByType } from "@/services/customerService";
import ContactList from "@/components/customers/ContactList";
import { Contact, ContactType } from "@/types/customer";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { useQuery } from "@tanstack/react-query";
import { useRealtimeContacts } from "@/hooks/useRealtimeContacts";

const Customers = () => {
  const { data: allContacts = [], isLoading: loadingAll } = useQuery({
    queryKey: ["contacts", "all"],
    queryFn: getContacts
  });

  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery({
    queryKey: ["contacts", "supplier"],
    queryFn: () => getContactsByType("supplier")
  });

  const { data: b2bCustomers = [], isLoading: loadingB2B } = useQuery({
    queryKey: ["contacts", "b2b"],
    queryFn: () => getContactsByType("b2b")
  });

  const { data: b2cCustomers = [], isLoading: loadingB2C } = useQuery({
    queryKey: ["contacts", "b2c"],
    queryFn: () => getContactsByType("b2c")
  });

  useRealtimeContacts();

  const loading = loadingAll || loadingSuppliers || loadingB2B || loadingB2C;

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