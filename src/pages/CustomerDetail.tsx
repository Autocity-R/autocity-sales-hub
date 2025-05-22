
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getContactById, getCustomerHistory, getSupplierHistory, updateContact } from "@/services/customerService";
import ContactDetailsPanel from "@/components/customers/ContactDetailsPanel";
import ContactHistory from "@/components/customers/ContactHistory";
import { Contact } from "@/types/customer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    if (id) {
      const contactData = getContactById(id);
      
      if (contactData) {
        setContact(contactData);
        
        // Load appropriate history based on contact type
        if (contactData.type === "supplier") {
          setHistory(getSupplierHistory(id));
        } else {
          setHistory(getCustomerHistory(id));
        }
      }
      
      setLoading(false);
    }
  }, [id]);

  const handleContactUpdate = (updated: Contact) => {
    setContact(updated);
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  if (loading) {
    return <div className="p-6">Laden...</div>;
  }

  if (!contact) {
    return (
      <div className="p-6">
        <Button variant="outline" onClick={handleGoBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Terug
        </Button>
        <div className="mt-10 text-center">
          <h2 className="text-2xl font-bold">Contact niet gevonden</h2>
          <p className="text-muted-foreground mt-2">
            Het gevraagde contact bestaat niet of is verwijderd.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button variant="outline" onClick={handleGoBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Terug naar overzicht
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="history">Geschiedenis</TabsTrigger>
              <TabsTrigger value="vehicles">Voertuigen</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="mt-6">
              <ContactDetailsPanel
                contact={contact}
                onUpdate={handleContactUpdate}
              />
            </TabsContent>
            
            <TabsContent value="history" className="mt-6">
              <ContactHistory history={history} />
            </TabsContent>
            
            <TabsContent value="vehicles" className="mt-6">
              <div className="text-center py-8 text-muted-foreground">
                Geen voertuigen gekoppeld aan dit contact
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Contact Informatie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Aangemaakt op</p>
                    <p>{format(new Date(contact.createdAt), "dd/MM/yyyy")}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Laatst bijgewerkt</p>
                    <p>{format(new Date(contact.updatedAt), "dd/MM/yyyy")}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
