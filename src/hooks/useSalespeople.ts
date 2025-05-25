
import { useQuery } from "@tanstack/react-query";
import { User } from "@/types/inventory";

// Mock data - replace with actual API call
const mockSalespeople: User[] = [
  {
    id: "1",
    name: "Jan van der Berg",
    email: "jan@company.com",
    role: "Verkoper",
    isActive: true
  },
  {
    id: "2", 
    name: "Sarah de Vries",
    email: "sarah@company.com",
    role: "Verkoper",
    isActive: true
  },
  {
    id: "3",
    name: "Mike Jansen",
    email: "mike@company.com", 
    role: "Verkoper",
    isActive: true
  },
  {
    id: "4",
    name: "Lisa Bakker", 
    email: "lisa@company.com",
    role: "Verkoper",
    isActive: false
  }
];

export const useSalespeople = () => {
  return useQuery({
    queryKey: ["salespeople"],
    queryFn: async (): Promise<User[]> => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Filter only active salespeople
      return mockSalespeople.filter(user => user.role === "Verkoper" && user.isActive);
    }
  });
};
