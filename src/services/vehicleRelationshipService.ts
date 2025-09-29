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
        .select('id, first_name, last_name, company_name')
        .in('id', customerIds);
      
      customerData?.forEach(customer => {
        const name = customer.company_name || `${customer.first_name} ${customer.last_name}`.trim();
        customers.set(customer.id, name);
      });
    }

    // Load suppliers
    const suppliers = new Map();
    if (supplierIds.length > 0) {
      const { data: supplierData } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, company_name')
        .in('id', supplierIds);
      
      supplierData?.forEach(supplier => {
        const name = supplier.company_name || `${supplier.first_name} ${supplier.last_name}`.trim();
        suppliers.set(supplier.id, name);
      });
    }

    // Add names to vehicles
    return vehicles.map(vehicle => ({
      ...vehicle,
      customerName: customers.get(vehicle.customerId) || null,
      supplierName: suppliers.get(vehicle.supplierId) || null,
    }));

  } catch (error) {
    console.error('Error loading vehicle relationships:', error);
    return vehicles; // Return original vehicles if loading fails
  }
};