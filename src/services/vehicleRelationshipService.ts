import { supabase } from "@/integrations/supabase/client";

/**
 * Load customer and supplier names for vehicles
 */
export const loadVehicleRelationships = async (vehicles: any[]): Promise<any[]> => {
  try {
    // Get unique customer and supplier IDs
    const customerIds = [...new Set(vehicles.map(v => v.customerId).filter(Boolean))];
    const supplierIds = [...new Set(vehicles.map(v => v.supplierId).filter(Boolean))];

    // Load customers
    const customers = new Map();
    if (customerIds.length > 0) {
      const { data: customerData } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, company_name, email, phone, address_street, address_city')
        .in('id', customerIds);
      
      customerData?.forEach(customer => {
        const name = customer.company_name || `${customer.first_name} ${customer.last_name}`.trim();
        const address = [customer.address_street, customer.address_city].filter(Boolean).join(', ');
        customers.set(customer.id, {
          name,
          contact: {
            name,
            email: customer.email,
            phone: customer.phone,
            address
          }
        });
      });
    }

    // Load suppliers
    const suppliers = new Map();
    if (supplierIds.length > 0) {
      const { data: supplierData } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, company_name, email, phone, address_street, address_city')
        .in('id', supplierIds);
      
      supplierData?.forEach(supplier => {
        const name = supplier.company_name || `${supplier.first_name} ${supplier.last_name}`.trim();
        const address = [supplier.address_street, supplier.address_city].filter(Boolean).join(', ');
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
    return vehicles.map(vehicle => ({
      ...vehicle,
      customerName: customers.get(vehicle.customerId)?.name || null,
      supplierName: suppliers.get(vehicle.supplierId)?.name || null,
      customerContact: customers.get(vehicle.customerId)?.contact || null,
      supplierContact: suppliers.get(vehicle.supplierId)?.contact || null,
    }));

  } catch (error) {
    console.error('Error loading vehicle relationships:', error);
    return vehicles; // Return original vehicles if loading fails
  }
};