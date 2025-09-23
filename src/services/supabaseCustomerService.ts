import { supabase } from "@/integrations/supabase/client";
import { Contact, ContactType } from "@/types/customer";

export class SupabaseCustomerService {
  /**
   * Search for contacts by name, email, or company name
   */
  async searchContacts(searchTerm: string, type?: ContactType): Promise<Contact[]> {
    try {
      let query = supabase
        .from('contacts')
        .select('*')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to search contacts:', error);
        throw error;
      }

      return data.map(this.mapSupabaseToContact);
    } catch (error) {
      console.error('Error searching contacts:', error);
      throw error;
    }
  }

  /**
   * Get all contacts by type
   */
  async getContactsByType(type: ContactType): Promise<Contact[]> {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('type', type)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`Failed to fetch ${type} contacts:`, error);
        throw error;
      }

      return data.map(this.mapSupabaseToContact);
    } catch (error) {
      console.error(`Error fetching ${type} contacts:`, error);
      throw error;
    }
  }

  /**
   * Get contact by ID
   */
  async getContactById(id: string): Promise<Contact | null> {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Contact not found
        }
        console.error('Failed to fetch contact:', error);
        throw error;
      }

      return this.mapSupabaseToContact(data);
    } catch (error) {
      console.error('Error fetching contact:', error);
      throw error;
    }
  }

  /**
   * Create a new contact
   */
  async createContact(contactData: Omit<Contact, "id" | "createdAt" | "updatedAt">): Promise<Contact> {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          type: contactData.type,
          company_name: contactData.companyName,
          first_name: contactData.firstName,
          last_name: contactData.lastName,
          email: contactData.email,
          phone: contactData.phone,
          address_street: contactData.address?.street,
          address_city: contactData.address?.city,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create contact:', error);
        throw error;
      }

      return this.mapSupabaseToContact(data);
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  }

  /**
   * Update an existing contact
   */
  async updateContact(contact: Contact): Promise<Contact> {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .update({
          type: contact.type,
          company_name: contact.companyName,
          first_name: contact.firstName,
          last_name: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          address_street: contact.address?.street,
          address_city: contact.address?.city,
          updated_at: new Date().toISOString()
        })
        .eq('id', contact.id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update contact:', error);
        throw error;
      }

      return this.mapSupabaseToContact(data);
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }

  /**
   * Map Supabase contact data to Contact interface
   */
  private mapSupabaseToContact(supabaseContact: any): Contact {
    return {
      id: supabaseContact.id,
      type: supabaseContact.type as ContactType,
      companyName: supabaseContact.company_name,
      firstName: supabaseContact.first_name,
      lastName: supabaseContact.last_name,
      email: supabaseContact.email,
      phone: supabaseContact.phone,
      address: {
        street: supabaseContact.address_street || "",
        number: "", // Not in current schema
        city: supabaseContact.address_city || "",
        zipCode: "", // Not in current schema
        country: "Nederland" // Default
      },
      notes: "", // Not in current schema
      createdAt: supabaseContact.created_at,
      updatedAt: supabaseContact.updated_at
    };
  }
}

export const supabaseCustomerService = new SupabaseCustomerService();