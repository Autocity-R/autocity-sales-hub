-- Performance Optimization: Add database indexes for frequently queried columns

-- Vehicles table indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_sold_date ON vehicles(sold_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_sold_by_user_id ON vehicles(sold_by_user_id) WHERE sold_by_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_supplier_id ON vehicles(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_status_created ON vehicles(status, created_at DESC);

-- Composite index for common B2B/B2C queries
CREATE INDEX IF NOT EXISTS idx_vehicles_b2b_sold ON vehicles(status, sold_date DESC) 
  WHERE status = 'verkocht_b2b';
CREATE INDEX IF NOT EXISTS idx_vehicles_b2c_sold ON vehicles(status, sold_date DESC) 
  WHERE status = 'verkocht_b2c';
CREATE INDEX IF NOT EXISTS idx_vehicles_voorraad ON vehicles(status, created_at DESC) 
  WHERE status = 'voorraad';

-- Text search indexes for common search fields
CREATE INDEX IF NOT EXISTS idx_vehicles_brand ON vehicles(brand);
CREATE INDEX IF NOT EXISTS idx_vehicles_model ON vehicles(model);
CREATE INDEX IF NOT EXISTS idx_vehicles_license_number ON vehicles(license_number) WHERE license_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin) WHERE vin IS NOT NULL;

-- Leads table indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON leads(lead_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_leads_status_created ON leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_status ON leads(assigned_to, status) WHERE assigned_to IS NOT NULL;

-- Vehicle files indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_files_vehicle_id ON vehicle_files(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_files_created ON vehicle_files(created_at DESC);

-- Email related indexes
CREATE INDEX IF NOT EXISTS idx_email_messages_lead_id ON email_messages(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_messages_thread_id ON email_messages(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_threads_lead_id ON email_threads(lead_id) WHERE lead_id IS NOT NULL;

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_vehicle_id ON tasks(vehicle_id) WHERE vehicle_id IS NOT NULL;

-- Appointments indexes
CREATE INDEX IF NOT EXISTS idx_appointments_starttime ON appointments(starttime);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_assignedto ON appointments(assignedto) WHERE assignedto IS NOT NULL;

-- Contacts indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);