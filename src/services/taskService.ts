
import { Task, TaskStatus, Employee } from "@/types/tasks";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Mock employees data
const mockEmployees: Employee[] = [
  {
    id: "emp-1",
    name: "Pieter Jansen",
    role: "Verkoper",
    email: "pieter@autohandel.nl",
    phone: "+31 6 12345678",
    department: "verkoop",
    active: true
  },
  {
    id: "emp-2", 
    name: "Sander Vermeulen",
    role: "Verkoper",
    email: "sander@autohandel.nl",
    phone: "+31 6 23456789",
    department: "verkoop",
    active: true
  },
  {
    id: "emp-3",
    name: "Kees van der Berg",
    role: "Monteur",
    email: "kees@autohandel.nl",
    phone: "+31 6 34567890",
    department: "techniek",
    active: true
  },
  {
    id: "emp-4",
    name: "Jan Bakker",
    role: "Transport medewerker",
    email: "jan@autohandel.nl",
    phone: "+31 6 45678901",
    department: "transport",
    active: true
  },
  {
    id: "emp-5",
    name: "Lisa Peters",
    role: "Schoonmaak specialist",
    email: "lisa@autohandel.nl",
    phone: "+31 6 56789012",
    department: "schoonmaak",
    active: true
  }
];

// Mock tasks data
const mockTasks: Task[] = [
  {
    id: "task-1",
    title: "BMW 3 Serie voorbereiden voor aflevering",
    description: "Auto schoonmaken en controleren voor aflevering aan klant",
    assignedTo: "emp-5",
    assignedBy: "emp-1",
    vehicleId: "v-1",
    vehicleBrand: "BMW",
    vehicleModel: "3 Serie",
    vehicleLicenseNumber: "AB-123-CD",
    dueDate: new Date("2024-01-25T14:00:00"),
    status: "toegewezen",
    priority: "hoog",
    category: "voorbereiding",
    location: "Werkplaats",
    estimatedDuration: 120,
    notes: "Extra aandacht voor interieur",
    createdAt: new Date("2024-01-20T09:00:00"),
    updatedAt: new Date("2024-01-20T09:00:00")
  },
  {
    id: "task-2",
    title: "Mercedes E-Class ophalen bij leverancier",
    description: "Voertuig ophalen en transporteren naar showroom",
    assignedTo: "emp-4",
    assignedBy: "emp-2",
    vehicleId: "v-2",
    vehicleBrand: "Mercedes",
    vehicleModel: "E-Class",
    vehicleLicenseNumber: "EF-456-GH",
    dueDate: new Date("2024-01-23T10:00:00"),
    status: "in_uitvoering",
    priority: "normaal",
    category: "transport",
    location: "AutoHouse Amsterdam",
    estimatedDuration: 180,
    createdAt: new Date("2024-01-19T11:30:00"),
    updatedAt: new Date("2024-01-22T08:15:00")
  },
  {
    id: "task-3",
    title: "Audi A4 technische inspectie",
    description: "Volledige technische controle uitvoeren",
    assignedTo: "emp-3",
    assignedBy: "emp-1",
    vehicleId: "v-3",
    vehicleBrand: "Audi",
    vehicleModel: "A4",
    vehicleLicenseNumber: "AU-789-DI",
    dueDate: new Date("2024-01-24T09:00:00"),
    status: "voltooid",
    priority: "hoog",
    category: "inspectie",
    location: "Werkplaats",
    estimatedDuration: 90,
    completedAt: new Date("2024-01-24T10:30:00"),
    notes: "Alle systemen in orde",
    createdAt: new Date("2024-01-18T14:20:00"),
    updatedAt: new Date("2024-01-24T10:30:00")
  }
];

export const fetchTasks = async (filters?: any): Promise<Task[]> => {
  try {
    const params = new URLSearchParams();
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
    if (filters?.status) params.append('status', filters.status);
    
    const response = await fetch(`${API_URL}/api/tasks?${params}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to fetch tasks:", error);
    return mockTasks;
  }
};

export const fetchEmployees = async (): Promise<Employee[]> => {
  try {
    const response = await fetch(`${API_URL}/api/employees`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to fetch employees:", error);
    return mockEmployees;
  }
};

export const createTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> => {
  try {
    const response = await fetch(`${API_URL}/api/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(task),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to create task:", error);
    const newTask: Task = {
      ...task,
      id: `task-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockTasks.push(newTask);
    return newTask;
  }
};

export const updateTaskStatus = async (taskId: string, status: TaskStatus): Promise<Task> => {
  try {
    const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status, completedAt: status === 'voltooid' ? new Date() : null }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to update task status:", error);
    const taskIndex = mockTasks.findIndex(t => t.id === taskId);
    if (taskIndex > -1) {
      mockTasks[taskIndex] = {
        ...mockTasks[taskIndex],
        status,
        updatedAt: new Date(),
        completedAt: status === 'voltooid' ? new Date() : undefined
      };
      return mockTasks[taskIndex];
    }
    throw error;
  }
};
