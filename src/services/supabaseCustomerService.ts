import { supabase } from "@/integrations/supabase/client";
import { Contact, ContactType } from "@/types/customer";

export class SupabaseCustomerService {
  /**
   * Search for contacts by name, email, or company name
   */
  async searchContacts(searchTerm: string, type?: ContactType | 'customer'): Promise<Contact[]> {
    try {
      let query = supabase
        .from('contacts')
        .select('*')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (type === 'customer') {
        // For customers, filter only b2b and b2c (exclude suppliers and transporters)
        query = query.in('type', ['b2b', 'b2c']);
      } else if (type) {
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
   * Get all contacts (any type)
   */
  async getAllContacts(): Promise<Contact[]> {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch all contacts:', error);
        throw error;
      }

      return data.map(this.mapSupabaseToContact);
    } catch (error) {
      console.error('Error fetching all contacts:', error);
      throw error;
    }
  }

  /**
   * Get all contacts by type
   */
  async getContactsByType(type: ContactType | 'customer'): Promise<Contact[]> {
    try {
      let query = supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (type === 'customer') {
        // For customers, get only b2b and b2c (exclude suppliers and transporters)
        query = query.in('type', ['b2b', 'b2c']);
      } else {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

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
          address_number: contactData.address?.number,
          address_postal_code: contactData.address?.zipCode,
          address_city: contactData.address?.city,
          additional_emails: contactData.additionalEmails || [],
          is_car_dealer: contactData.isCarDealer || false,
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
          address_number: contact.address?.number,
          address_postal_code: contact.address?.zipCode,
          address_city: contact.address?.city,
          additional_emails: contact.additionalEmails || [],
          is_car_dealer: contact.isCarDealer || false,
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
      additionalEmails: supabaseContact.additional_emails || [],
      phone: supabaseContact.phone,
      address: {
        street: supabaseContact.address_street || "",
        number: supabaseContact.address_number || "",
        city: supabaseContact.address_city || "",
        zipCode: supabaseContact.address_postal_code || "",
        country: "Nederland"
      },
      notes: "",
      isCarDealer: supabaseContact.is_car_dealer || false,
      createdAt: supabaseContact.created_at,
      updatedAt: supabaseContact.updated_at
    };
  }
}

export const supabaseCustomerService = new SupabaseCustomerService();