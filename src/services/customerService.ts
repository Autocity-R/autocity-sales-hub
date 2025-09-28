import { Contact, ContactType, CustomerHistoryItem, SupplierHistoryItem } from "@/types/customer";
import { supabaseCustomerService } from "./supabaseCustomerService";

// Flag for using mock data during development
let isUseMockData = false;

export const setUseMockData = (useMock: boolean) => {
  isUseMockData = useMock;
};

// Mock data for development fallback
const mockContacts: Contact[] = [
  {
    id: "1",
    type: "supplier",
    companyName: "Auto Schmidt",
    firstName: "Hans",
    lastName: "Schmidt",
    email: "hans@autoschmidt.de",
    phone: "+49 123456789",
    address: {
      street: "Autostrasse",
      number: "123",
      city: "Berlin",
      zipCode: "10115",
      country: "Duitsland"
    },
    notes: "Preferred supplier for premium vehicles",
    createdAt: "2023-01-15T10:30:00Z",
    updatedAt: "2023-04-22T14:45:00Z"
  },
  {
    id: "4",
    type: "b2b",
    companyName: "De Boer Auto's",
    firstName: "Pieter",
    lastName: "de Boer",
    email: "info@deboer.nl",
    phone: "+31 201234567",
    address: {
      street: "Handelstraat",
      number: "22",
      city: "Amsterdam",
      zipCode: "1012 AB",
      country: "Nederland"
    },
    notes: "Regular bulk purchaser",
    createdAt: "2023-01-20T08:30:00Z",
    updatedAt: "2023-07-15T10:45:00Z"
  },
  {
    id: "5",
    type: "b2b",
    companyName: "Zakelijke Wagens BV",
    firstName: "Sander",
    lastName: "Vermeulen",
    email: "s.vermeulen@zakelijkewagens.nl",
    phone: "+31 301234567",
    address: {
      street: "Zakenweg",
      number: "55",
      city: "Utrecht",
      zipCode: "3511 TR",
      country: "Nederland"
    },
    createdAt: "2023-02-25T11:20:00Z",
    updatedAt: "2023-05-30T14:15:00Z"
  },
  {
    id: "6",
    type: "b2c",
    firstName: "Hendrik",
    lastName: "Jansen",
    email: "h.jansen@gmail.com",
    phone: "+31 612345678",
    address: {
      street: "Esdoornlaan",
      number: "12",
      city: "Rotterdam",
      zipCode: "3053 ES",
      country: "Nederland"
    },
    createdAt: "2023-03-10T15:45:00Z",
    updatedAt: "2023-04-28T09:30:00Z"
  },
  {
    id: "7",
    type: "b2c",
    firstName: "Anna",
    lastName: "Pietersen",
    email: "anna.p@hotmail.com",
    phone: "+31 687654321",
    address: {
      street: "Berkenlaan",
      number: "34",
      city: "Den Haag",
      zipCode: "2511 VK",
      country: "Nederland"
    },
    notes: "Interested in electric vehicles",
    createdAt: "2023-04-05T10:15:00Z",
    updatedAt: "2023-06-20T13:40:00Z"
  }
];

const mockCustomerHistory: CustomerHistoryItem[] = [
  {
    id: "h1",
    customerId: "6",
    date: "2023-07-01T09:30:00Z",
    actionType: "lead",
    description: "Initial inquiry about electric vehicles",
  }
];

const mockSupplierHistory: SupplierHistoryItem[] = [
  {
    id: "sh1",
    supplierId: "1",
    date: "2023-05-10T08:30:00Z",
    actionType: "purchase",
    description: "Bestelde 5 BMW voertuigen",
    vehicleId: "v003",
    vehicleName: "BMW 3 Series",
    vehicleDetails: true,
    vehicleBrand: "BMW",
    vehicleModel: "3 Series",
    vehicleYear: 2022,
    vehicleMileage: 25000,
    vehicleVin: "WBA8E9C06NCK12345",
    vehiclePrice: 23000
  }
];

// Updated functions to use Supabase when available
export const getContacts = async (): Promise<Contact[]> => {
  try {
    console.log('Fetching all contacts...');
    
    if (isUseMockData) {
      console.log('Using mock data for contacts');
      return mockContacts;
    }

    try {
      // Get all contacts from Supabase (suppliers, B2B and B2C)
      const [supplierContacts, b2bContacts, b2cContacts] = await Promise.all([
        supabaseCustomerService.getContactsByType('supplier'),
        supabaseCustomerService.getContactsByType('b2b'),
        supabaseCustomerService.getContactsByType('b2c')
      ]);
      
      const allContacts = [...supplierContacts, ...b2bContacts, ...b2cContacts];
      console.log(`Fetched ${allContacts.length} contacts from Supabase`);
      return allContacts;
    } catch (supabaseError) {
      console.warn('Supabase fetch failed, falling back to mock data:', supabaseError);
      return mockContacts;
    }
  } catch (error) {
    console.error('Error in getContacts:', error);
    return mockContacts;
  }
};

export const getContactsByType = async (type: ContactType): Promise<Contact[]> => {
  try {
    console.log(`Fetching ${type} contacts...`);
    
    if (isUseMockData) {
      console.log('Using mock data for contacts');
      return mockContacts.filter(contact => contact.type === type);
    }

    try {
      const contacts = await supabaseCustomerService.getContactsByType(type);
      console.log(`Fetched ${contacts.length} ${type} contacts from Supabase`);
      return contacts;
    } catch (supabaseError) {
      console.warn('Supabase fetch failed, falling back to mock data:', supabaseError);
      return mockContacts.filter(contact => contact.type === type);
    }
  } catch (error) {
    console.error(`Error in getContactsByType for ${type}:`, error);
    return mockContacts.filter(contact => contact.type === type);
  }
};

export const getContactById = async (id: string): Promise<Contact | undefined> => {
  try {
    console.log(`Fetching contact ${id}...`);
    
    if (isUseMockData) {
      console.log('Using mock data for contact');
      return mockContacts.find(contact => contact.id === id);
    }

    try {
      const contact = await supabaseCustomerService.getContactById(id);
      return contact || undefined;
    } catch (supabaseError) {
      console.warn('Supabase fetch failed:', supabaseError);
      return mockContacts.find(contact => contact.id === id);
    }
  } catch (error) {
    console.error('Error in getContactById:', error);
    return undefined;
  }
};

export const searchContacts = async (searchTerm: string, type?: ContactType): Promise<Contact[]> => {
  try {
    console.log(`Searching contacts with term: ${searchTerm}, type: ${type}`);
    
    if (isUseMockData) {
      console.log('Using mock data for search');
      let results = mockContacts.filter(contact => 
        contact.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.companyName && contact.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      
      if (type) {
        results = results.filter(contact => contact.type === type);
      }
      
      return results;
    }

    try {
      const results = await supabaseCustomerService.searchContacts(searchTerm, type);
      console.log(`Found ${results.length} contacts matching "${searchTerm}"`);
      return results;
    } catch (supabaseError) {
      console.warn('Supabase search failed, falling back to mock data:', supabaseError);
      let results = mockContacts.filter(contact => 
        contact.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.companyName && contact.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      
      if (type) {
        results = results.filter(contact => contact.type === type);
      }
      
      return results;
    }
  } catch (error) {
    console.error('Error in searchContacts:', error);
    return [];
  }
};

export const getCustomerHistory = (customerId: string): CustomerHistoryItem[] => {
  return mockCustomerHistory.filter(item => item.customerId === customerId);
};

export const getSupplierHistory = (supplierId: string): SupplierHistoryItem[] => {
  return mockSupplierHistory.filter(item => item.supplierId === supplierId);
};

export const addContact = async (contact: Omit<Contact, "id" | "createdAt" | "updatedAt">): Promise<Contact> => {
  try {
    console.log('Creating new contact...', contact);
    
    if (isUseMockData) {
      console.log('Mock data mode - contact creation simulated');
      const newContact: Contact = {
        ...contact,
        id: `${mockContacts.length + 1}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      mockContacts.push(newContact);
      return newContact;
    }

    try {
      const newContact = await supabaseCustomerService.createContact(contact);
      console.log('Contact created successfully via Supabase');
      return newContact;
    } catch (supabaseError) {
      console.warn('Supabase creation failed:', supabaseError);
      throw supabaseError;
    }
  } catch (error) {
    console.error('Error in addContact:', error);
    throw error;
  }
};

export const updateContact = async (contact: Contact): Promise<Contact> => {
  try {
    console.log(`Updating contact ${contact.id}...`);
    
    if (isUseMockData) {
      console.log('Mock data mode - contact update simulated');
      const index = mockContacts.findIndex(c => c.id === contact.id);
      if (index !== -1) {
        mockContacts[index] = {
          ...contact,
          updatedAt: new Date().toISOString()
        };
        return mockContacts[index];
      }
      throw new Error(`Contact with ID ${contact.id} not found`);
    }

    try {
      const updatedContact = await supabaseCustomerService.updateContact(contact);
      console.log('Contact updated successfully via Supabase');
      return updatedContact;
    } catch (supabaseError) {
      console.warn('Supabase update failed:', supabaseError);
      throw supabaseError;
    }
  } catch (error) {
    console.error('Error in updateContact:', error);
    throw error;
  }
};

export const addHistoryItem = (item: Omit<CustomerHistoryItem, "id" | "date">): CustomerHistoryItem => {
  const newItem: CustomerHistoryItem = {
    ...item,
    id: `h${mockCustomerHistory.length + 1}`,
    date: new Date().toISOString()
  };
  
  mockCustomerHistory.push(newItem);
  return newItem;
};
