
import { Task, TaskStatus, TaskPriority, TaskCategory, Employee } from "@/types/tasks";
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "./userService";

// Convert UserProfile to Employee interface (no longer uses role field)
const profileToEmployee = (profile: UserProfile): Employee => ({
  id: profile.id,
  name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
  role: 'user', // Default role
  email: profile.email,
  phone: undefined, // Not available in profiles
  department: 'verkoop', // Default department
  active: true
});

export const fetchTasks = async (filters?: any): Promise<Task[]> => {
  try {
    let query = supabase
      .from('tasks')
      .select(`
        *,
        assigned_to_profile:profiles!tasks_assigned_to_fkey(id, first_name, last_name, email),
        assigned_by_profile:profiles!tasks_assigned_by_fkey(id, first_name, last_name, email),
        vehicle:vehicles(id, brand, model, license_number, vin)
      `)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.assignedTo && filters.assignedTo !== 'all') {
      query = query.eq('assigned_to', filters.assignedTo);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch tasks:", error);
      return [];
    }

    // Transform database response to Task interface - pass through the profile data
    return (data || []).map((task: any) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      assignedTo: task.assigned_to,
      assignedBy: task.assigned_by,
      vehicleId: task.vehicle_id,
      vehicleBrand: task.vehicle_brand || task.vehicle?.brand,
      vehicleModel: task.vehicle_model || task.vehicle?.model,
      vehicleLicenseNumber: task.vehicle_license_number || task.vehicle?.license_number,
      vehicleVin: task.vehicle_vin || task.vehicle?.vin,
      dueDate: task.due_date,
      status: task.status as TaskStatus,
      priority: task.priority,
      category: task.category,
      location: task.location,
      estimatedDuration: task.estimated_duration,
      completedAt: task.completed_at,
      notes: task.notes,
      damageParts: task.damage_parts && typeof task.damage_parts === 'object' && 'parts' in task.damage_parts 
        ? { parts: (task.damage_parts as any).parts || [] } 
        : undefined,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      // Pass through the joined profile data
      assigned_to_profile: task.assigned_to_profile,
      assigned_by_profile: task.assigned_by_profile,
      vehicle: task.vehicle
    }));
  } catch (error: any) {
    console.error("Failed to fetch tasks:", error);
    return [];
  }
};

export const fetchEmployees = async (): Promise<Employee[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('first_name', { ascending: true });

    if (error) {
      console.error("Failed to fetch employees:", error);
      return [];
    }

    return (data || []).map(profileToEmployee);
  } catch (error: any) {
    console.error("Failed to fetch employees:", error);
    return [];
  }
};

// Get active employees (users that can be assigned tasks)
export const fetchActiveEmployees = async (): Promise<Employee[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('first_name', { ascending: true });

    if (error) {
      console.error("Failed to fetch active employees:", error);
      return [];
    }

    // All users with profiles are considered active
    return (data || []).map(profileToEmployee);
  } catch (error: any) {
    console.error("Failed to fetch active employees:", error);
    return [];
  }
};

export const createTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> => {
  try {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) {
      throw new Error("User not authenticated");
    }

    // Get the highest sort_order to place new task at the bottom
    const { data: maxSortData } = await supabase
      .from('tasks')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();
    
    const newSortOrder = (maxSortData?.sort_order ?? -1) + 1;

    const taskData: any = {
      title: task.title,
      description: task.description,
      assigned_to: task.assignedTo,
      assigned_by: currentUser.user.id,
      vehicle_id: task.vehicleId || null,
      vehicle_brand: task.vehicleBrand || null,
      vehicle_model: task.vehicleModel || null,
      vehicle_license_number: task.vehicleLicenseNumber || null,
      vehicle_vin: task.vehicleVin || null,
      due_date: typeof task.dueDate === 'string' ? task.dueDate : task.dueDate.toISOString(),
      status: task.status,
      priority: task.priority,
      category: task.category,
      location: task.location || null,
      estimated_duration: task.estimatedDuration || null,
      notes: task.notes || null,
      damage_parts: task.damageParts ? { parts: task.damageParts.parts } : null,
      sort_order: newSortOrder
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single();

    if (error) {
      console.error("Failed to create task:", error);
      throw error;
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      assignedTo: data.assigned_to,
      assignedBy: data.assigned_by,
      vehicleId: data.vehicle_id,
      vehicleBrand: data.vehicle_brand,
      vehicleModel: data.vehicle_model,
      vehicleLicenseNumber: data.vehicle_license_number,
      vehicleVin: data.vehicle_vin,
      dueDate: data.due_date,
      status: data.status as TaskStatus,
      priority: data.priority as TaskPriority,
      category: data.category as TaskCategory,
      location: data.location,
      estimatedDuration: data.estimated_duration,
      completedAt: data.completed_at,
      notes: data.notes,
      damageParts: data.damage_parts && typeof data.damage_parts === 'object' && 'parts' in data.damage_parts 
        ? { parts: (data.damage_parts as any).parts || [] } 
        : undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error: any) {
    console.error("Failed to create task:", error);
    throw error;
  }
};

export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<Task> => {
  try {
    console.log('[taskService] updateTask called with id:', taskId, 'updates:', updates);
    
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Only include fields that are explicitly provided
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo;
    if (updates.vehicleId !== undefined) updateData.vehicle_id = updates.vehicleId || null;
    if (updates.vehicleBrand !== undefined) updateData.vehicle_brand = updates.vehicleBrand || null;
    if (updates.vehicleModel !== undefined) updateData.vehicle_model = updates.vehicleModel || null;
    if (updates.vehicleLicenseNumber !== undefined) updateData.vehicle_license_number = updates.vehicleLicenseNumber || null;
    if (updates.vehicleVin !== undefined) updateData.vehicle_vin = updates.vehicleVin || null;
    if (updates.dueDate !== undefined) updateData.due_date = typeof updates.dueDate === 'string' ? updates.dueDate : updates.dueDate?.toISOString();
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.location !== undefined) updateData.location = updates.location || null;
    if (updates.estimatedDuration !== undefined) updateData.estimated_duration = updates.estimatedDuration || null;
    if (updates.notes !== undefined) updateData.notes = updates.notes || null;
    if (updates.damageParts !== undefined) updateData.damage_parts = updates.damageParts ? { parts: updates.damageParts.parts } : null;

    console.log('[taskService] Sending update to Supabase:', updateData);

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error("Failed to update task:", error);
      throw error;
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      assignedTo: data.assigned_to,
      assignedBy: data.assigned_by,
      vehicleId: data.vehicle_id,
      vehicleBrand: data.vehicle_brand,
      vehicleModel: data.vehicle_model,
      vehicleLicenseNumber: data.vehicle_license_number,
      vehicleVin: data.vehicle_vin,
      dueDate: data.due_date,
      status: data.status as TaskStatus,
      priority: data.priority as TaskPriority,
      category: data.category as TaskCategory,
      location: data.location,
      estimatedDuration: data.estimated_duration,
      completedAt: data.completed_at,
      notes: data.notes,
      damageParts: data.damage_parts && typeof data.damage_parts === 'object' && 'parts' in data.damage_parts 
        ? { parts: (data.damage_parts as any).parts || [] } 
        : undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error: any) {
    console.error("Failed to update task:", error);
    throw error;
  }
};

export const deleteTask = async (taskId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error("Failed to delete task:", error);
      throw error;
    }
  } catch (error: any) {
    console.error("Failed to delete task:", error);
    throw error;
  }
};

export const updateTaskStatus = async (taskId: string, status: TaskStatus): Promise<Task> => {
  try {
    const completedAt = new Date().toISOString();
    const updateData: any = {
      status,
      updated_at: completedAt
    };

    // Set completed_at when task is completed
    if (status === 'voltooid') {
      updateData.completed_at = completedAt;
    } else {
      updateData.completed_at = null;
    }

    // First, get the full task data including employee info
    const { data: taskData, error: fetchError } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_to_profile:profiles!tasks_assigned_to_fkey(id, first_name, last_name, email)
      `)
      .eq('id', taskId)
      .single();

    if (fetchError) {
      console.error("Failed to fetch task for status update:", fetchError);
      throw fetchError;
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error("Failed to update task status:", error);
      throw error;
    }

    // Register damage repair when schadeherstel task is completed
    if (status === 'voltooid' && taskData.category === 'schadeherstel') {
      await registerDamageRepair(taskId, taskData, completedAt);
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      assignedTo: data.assigned_to,
      assignedBy: data.assigned_by,
      vehicleId: data.vehicle_id,
      vehicleBrand: data.vehicle_brand,
      vehicleModel: data.vehicle_model,
      vehicleLicenseNumber: data.vehicle_license_number,
      vehicleVin: data.vehicle_vin,
      dueDate: data.due_date,
      status: data.status as TaskStatus,
      priority: data.priority as TaskPriority,
      category: data.category as TaskCategory,
      location: data.location,
      estimatedDuration: data.estimated_duration,
      completedAt: data.completed_at,
      notes: data.notes,
      damageParts: data.damage_parts && typeof data.damage_parts === 'object' && 'parts' in data.damage_parts 
        ? { parts: (data.damage_parts as any).parts || [] } 
        : undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error: any) {
    console.error("Failed to update task status:", error);
    throw error;
  }
};

// Register damage repair in permanent table
const registerDamageRepair = async (taskId: string, taskData: any, completedAt: string): Promise<void> => {
  try {
    // Check if already registered (prevent duplicates)
    const { data: existing } = await supabase
      .from('damage_repair_records')
      .select('id')
      .eq('task_id', taskId)
      .maybeSingle();

    if (existing) {
      console.log('[taskService] Damage repair already registered for task:', taskId);
      return;
    }

    const COST_PER_PART = 300;
    const damageParts = taskData.damage_parts as { parts?: Array<{ name: string }> } | null;
    const parts = damageParts?.parts?.map((p: { name: string }) => p.name) || [];
    const partCount = parts.length;

    // Get employee name from profile
    const profile = taskData.assigned_to_profile as { first_name?: string; last_name?: string; email?: string } | null;
    const employeeName = profile 
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'Onbekend'
      : 'Onbekend';

    const { error } = await supabase
      .from('damage_repair_records')
      .insert({
        task_id: taskId,
        vehicle_id: taskData.vehicle_id,
        vehicle_brand: taskData.vehicle_brand || '-',
        vehicle_model: taskData.vehicle_model || '-',
        vehicle_vin: taskData.vehicle_vin,
        vehicle_license_number: taskData.vehicle_license_number,
        repaired_parts: parts,
        part_count: partCount,
        repair_cost: partCount * COST_PER_PART,
        completed_at: completedAt,
        employee_id: taskData.assigned_to,
        employee_name: employeeName
      });

    if (error) {
      console.error('[taskService] Failed to register damage repair:', error);
      // Don't throw - we don't want to fail the task status update
    } else {
      console.log('[taskService] Damage repair registered successfully for task:', taskId);
    }
  } catch (error) {
    console.error('[taskService] Error registering damage repair:', error);
    // Don't throw - we don't want to fail the task status update
  }
};

export const fetchTaskHistory = async (taskId: string) => {
  try {
    const { data, error } = await supabase
      .from('task_history')
      .select(`
        *,
        changed_by_profile:profiles!task_history_changed_by_fkey(first_name, last_name, email),
        old_assignee_profile:profiles!task_history_old_assignee_fkey(first_name, last_name, email),
        new_assignee_profile:profiles!task_history_new_assignee_fkey(first_name, last_name, email)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Failed to fetch task history:", error);
      return [];
    }

    return data || [];
  } catch (error: any) {
    console.error("Failed to fetch task history:", error);
    return [];
  }
};

// Update sort order for a single task
export const updateTaskSortOrder = async (taskId: string, sortOrder: number): Promise<void> => {
  try {
    const { error } = await supabase
      .from('tasks')
      .update({ sort_order: sortOrder, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    if (error) {
      console.error("Failed to update task sort order:", error);
      throw error;
    }
  } catch (error: any) {
    console.error("Failed to update task sort order:", error);
    throw error;
  }
};

// Reorder multiple tasks at once
export const reorderTasks = async (taskOrders: { id: string; sortOrder: number }[]): Promise<void> => {
  try {
    // Update each task's sort_order
    const updates = taskOrders.map(({ id, sortOrder }) => 
      supabase
        .from('tasks')
        .update({ sort_order: sortOrder, updated_at: new Date().toISOString() })
        .eq('id', id)
    );

    const results = await Promise.all(updates);
    
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error("Failed to reorder some tasks:", errors);
      throw new Error("Failed to reorder tasks");
    }
  } catch (error: any) {
    console.error("Failed to reorder tasks:", error);
    throw error;
  }
};
