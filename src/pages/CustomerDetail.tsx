import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getContactById, getCustomerHistory, getSupplierHistory, updateContact, getCustomerPurchasedVehicles } from "@/services/customerService";
import ContactDetailsPanel from "@/components/customers/ContactDetailsPanel";
import ContactHistory from "@/components/customers/ContactHistory";
import { PurchaseHistory } from "@/components/customers/PurchaseHistory";
import { Contact } from "@/types/customer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";

const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [purchasedVehicles, setPurchasedVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    const loadContact = async () => {
      if (id) {
        try {
          const contactData = await getContactById(id);
          
          if (contactData) {
            setContact(contactData);
            
            // Load appropriate history based on contact type
            if (contactData.type === "supplier") {
              const supplierHistory = await getSupplierHistory(id);
              setHistory(supplierHistory);
            } else {
              const customerHistory = await getCustomerHistory(id);
              setHistory(customerHistory);
              // Load purchased vehicles for customers (not suppliers)
              const vehicles = await getCustomerPurchasedVehicles(id);
              setPurchasedVehicles(vehicles);
            }
          }
        } catch (error) {
          console.error("Error loading contact:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadContact();
  }, [id]);

  const handleUpdate = async (updatedContact: Contact) => {
    try {
      await updateContact(updatedContact);
      setContact(updatedContact);
    } catch (error) {
      console.error("Error updating contact:", error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center py-8">
          <p>Contact laden...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!contact) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader title="Contact niet gevonden" />
          <div className="flex justify-center items-center py-8">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">Het opgevraagde contact kon niet worden gevonden.</p>
              <Button onClick={() => navigate('/customers')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Terug naar contacten
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader 
          title={contact.companyName || `${contact.firstName} ${contact.lastName}`}
          description={`${contact.type === "supplier" ? "Leverancier" : 
                       contact.type === "b2b" ? "Zakelijke klant" : 
                       "Particuliere klant"} details en geschiedenis`}
        >
          <Button variant="outline" onClick={() => navigate('/customers')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug
          </Button>
        </PageHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            {contact.type !== "supplier" && (
              <TabsTrigger value="purchases">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Aankoophistorie
              </TabsTrigger>
            )}
            <TabsTrigger value="history">
              <Clock className="mr-2 h-4 w-4" />
              Geschiedenis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <ContactDetailsPanel contact={contact} onUpdate={handleUpdate} />
          </TabsContent>

          {contact.type !== "supplier" && (
            <TabsContent value="purchases" className="space-y-6">
              <PurchaseHistory 
                vehicles={purchasedVehicles}
                customerType={contact.type as "b2b" | "b2c"}
              />
            </TabsContent>
          )}

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Geschiedenis</CardTitle>
              </CardHeader>
              <CardContent>
                <ContactHistory 
                  history={history} 
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default CustomerDetail;