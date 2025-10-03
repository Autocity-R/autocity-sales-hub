import { supabase } from "@/integrations/supabase/client";

/**
 * Load customer and supplier names for vehicles
 */
export const loadVehicleRelationships = async (vehicles: any[]): Promise<any[]> => {
  try {
    console.log('[RELATIONSHIP_SERVICE] 📦 Input vehicles:', vehicles.length);
    console.log('[RELATIONSHIP_SERVICE] 🎯 Test vehicle customerId:', 
      vehicles.find(v => v.id === 'a95829f7-150e-43d6-84be-ced28f90c974')?.customerId
    );
    
    // Get unique customer and supplier IDs
    const customerIds = [...new Set(vehicles.map(v => v.customerId).filter(Boolean))];
    const supplierIds = [...new Set(vehicles.map(v => v.supplierId).filter(Boolean))];

    // Load customers
    const customers = new Map();
    if (customerIds.length > 0) {
      const { data: customerData } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, company_name, email, phone, address_street, address_number, address_postal_code, address_city')
        .in('id', customerIds);
      
      console.log('[RELATIONSHIP_SERVICE] 👥 Fetched contacts:', customerData?.length);
      console.log('[RELATIONSHIP_SERVICE] 🔍 Test customer data:', 
        customerData?.find(c => c.id === 'fb72c339-42c3-41d3-8de9-d8d5904f7605')
      );
      
      customerData?.forEach(customer => {
        const name = customer.company_name || `${customer.first_name} ${customer.last_name}`.trim();
        const addressParts = [
          customer.address_street,
          customer.address_number,
          customer.address_postal_code,
          customer.address_city
        ].filter(Boolean);
        const address = addressParts.join(', ');
        
        const contactData = {
          name,
          email: customer.email,
          phone: customer.phone,
          address
        };
        
        // 🔍 BELANGRIJKE LOG voor test-klant
        if (customer.id === 'fb72c339-42c3-41d3-8de9-d8d5904f7605') {
          console.log('[RELATIONSHIP_SERVICE] 🎯 Mapping test customer:', contactData);
        }
        
        customers.set(customer.id, { name, contact: contactData });
      });
    }

    // Load suppliers
    const suppliers = new Map();
    if (supplierIds.length > 0) {
      const { data: supplierData } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, company_name, email, phone, address_street, address_number, address_postal_code, address_city')
        .in('id', supplierIds);
      
      supplierData?.forEach(supplier => {
        const name = supplier.company_name || `${supplier.first_name} ${supplier.last_name}`.trim();
        const addressParts = [
          supplier.address_street,
          supplier.address_number,
          supplier.address_postal_code,
          supplier.address_city
        ].filter(Boolean);
        const address = addressParts.join(', ');
        suppliers.set(supplier.id, {
          name,
          contact: {
            name,
            email: supplier.email,
            phone: supplier.phone,
            address
          }
        });
      });
    }

    // Add names and contact info to vehicles
    const enrichedVehicles = vehicles.map(vehicle => ({
      ...vehicle,
      customerName: customers.get(vehicle.customerId)?.name || null,
      supplierName: suppliers.get(vehicle.supplierId)?.name || null,
      customerContact: customers.get(vehicle.customerId)?.contact || null,
      supplierContact: suppliers.get(vehicle.supplierId)?.contact || null,
    }));
    
    // 🔍 LOG voor test-voertuig
    const testVehicle = enrichedVehicles.find(v => v.id === 'a95829f7-150e-43d6-84be-ced28f90c974');
    if (testVehicle) {
      console.log('[RELATIONSHIP_SERVICE] ✅ Enriched test vehicle:', {
        id: testVehicle.id,
        customerId: testVehicle.customerId,
        customerName: testVehicle.customerName,
        customerContact: testVehicle.customerContact
      });
    }
    
    return enrichedVehicles;

  } catch (error) {
    console.error('Error loading vehicle relationships:', error);
    return vehicles; // Return original vehicles if loading fails
  }
};