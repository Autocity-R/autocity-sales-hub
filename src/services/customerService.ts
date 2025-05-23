import { Contact, ContactType, CustomerHistoryItem, SupplierHistoryItem } from "@/types/customer";

// Mock data for development
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
    id: "2",
    type: "supplier",
    companyName: "Deutsche Autos GmbH",
    firstName: "Klaus",
    lastName: "Mueller",
    email: "klaus@deutscheautos.de",
    phone: "+49 987654321",
    address: {
      street: "Hauptstraße",
      number: "45",
      city: "München",
      zipCode: "80331",
      country: "Duitsland"
    },
    createdAt: "2023-02-18T09:15:00Z",
    updatedAt: "2023-05-10T11:20:00Z"
  },
  {
    id: "3",
    type: "supplier",
    companyName: "Car Connect",
    firstName: "Jan",
    lastName: "Janssens",
    email: "jan@carconnect.be",
    phone: "+32 478123456",
    address: {
      street: "Autolaan",
      number: "78",
      city: "Brussel",
      zipCode: "1000",
      country: "België"
    },
    createdAt: "2023-03-05T13:45:00Z",
    updatedAt: "2023-06-12T16:30:00Z"
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
  },
  {
    id: "h2",
    customerId: "6",
    date: "2023-07-15T14:20:00Z",
    actionType: "contact",
    description: "Follow-up call about available models",
  },
  {
    id: "h3",
    customerId: "6",
    date: "2023-08-10T11:00:00Z",
    actionType: "purchase",
    description: "Purchased Tesla Model 3",
    vehicleId: "v001",
    vehicleName: "Tesla Model 3",
    vehicleDetails: true,
    vehicleBrand: "Tesla",
    vehicleModel: "Model 3",
    vehicleYear: 2022,
    vehicleMileage: 12500,
    vehicleVin: "5YJ3E1EA7MF123456",
    vehiclePrice: 42950
  },
  {
    id: "h4",
    customerId: "4",
    date: "2023-06-05T10:15:00Z",
    actionType: "contact",
    description: "Meeting to discuss fleet renewal",
  },
  {
    id: "h5",
    customerId: "4",
    date: "2023-06-20T13:30:00Z",
    actionType: "sale",
    description: "Quote for 5 company vehicles",
  },
  {
    id: "h6",
    customerId: "4",
    date: "2023-07-10T09:45:00Z",
    actionType: "purchase",
    description: "Purchased 3 Volkswagen Passat",
    vehicleId: "v002",
    vehicleName: "Volkswagen Passat",
    vehicleDetails: true,
    vehicleBrand: "Volkswagen",
    vehicleModel: "Passat",
    vehicleYear: 2023,
    vehicleMileage: 5000,
    vehicleVin: "WVWZZZ3CZPE123456",
    vehiclePrice: 38500
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
  },
  {
    id: "sh2",
    supplierId: "1",
    date: "2023-06-15T11:45:00Z",
    actionType: "contact",
    description: "Onderhandeld over prijzen voor Q3",
  },
  {
    id: "sh3",
    supplierId: "2",
    date: "2023-04-20T14:15:00Z",
    actionType: "purchase",
    description: "Aangekocht 3 Mercedes C-Class voertuigen",
    vehicleId: "v004",
    vehicleName: "Mercedes C-Class",
    vehicleDetails: true,
    vehicleBrand: "Mercedes",
    vehicleModel: "C-Class",
    vehicleYear: 2023,
    vehicleMileage: 8000,
    vehicleVin: "WDD2050071R123456",
    vehiclePrice: 36250
  },
  {
    id: "sh4",
    supplierId: "3",
    date: "2023-07-05T09:30:00Z",
    actionType: "purchase",
    description: "Aangekocht Audi A4 Avant",
    vehicleId: "v005",
    vehicleName: "Audi A4 Avant",
    vehicleDetails: true,
    vehicleBrand: "Audi",
    vehicleModel: "A4 Avant",
    vehicleYear: 2021,
    vehicleMileage: 32000,
    vehicleVin: "WAUZZZ8E0EA123456",
    vehiclePrice: 28500
  },
  {
    id: "sh5",
    supplierId: "1",
    date: "2023-08-12T14:20:00Z",
    actionType: "purchase",
    description: "Aangekocht BMW X3",
    vehicleId: "v006",
    vehicleName: "BMW X3",
    vehicleDetails: true,
    vehicleBrand: "BMW",
    vehicleModel: "X3",
    vehicleYear: 2022,
    vehicleMileage: 18500,
    vehicleVin: "WBAXG9C04NDR12345",
    vehiclePrice: 31200
  }
];

export const getContacts = (): Contact[] => {
  return mockContacts;
};

export const getContactsByType = (type: ContactType): Contact[] => {
  return mockContacts.filter(contact => contact.type === type);
};

export const getContactById = (id: string): Contact | undefined => {
  return mockContacts.find(contact => contact.id === id);
};

export const getCustomerHistory = (customerId: string): CustomerHistoryItem[] => {
  return mockCustomerHistory.filter(item => item.customerId === customerId);
};

export const getSupplierHistory = (supplierId: string): SupplierHistoryItem[] => {
  return mockSupplierHistory.filter(item => item.supplierId === supplierId);
};

export const addContact = (contact: Omit<Contact, "id" | "createdAt" | "updatedAt">): Contact => {
  const newContact: Contact = {
    ...contact,
    id: `${mockContacts.length + 1}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  mockContacts.push(newContact);
  return newContact;
};

export const updateContact = (contact: Contact): Contact => {
  const index = mockContacts.findIndex(c => c.id === contact.id);
  if (index !== -1) {
    mockContacts[index] = {
      ...contact,
      updatedAt: new Date().toISOString()
    };
    return mockContacts[index];
  }
  throw new Error(`Contact with ID ${contact.id} not found`);
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
