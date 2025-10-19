-- Add indexes for performance optimization on vehicle reporting queries

-- Index for supplier queries
CREATE INDEX IF NOT EXISTS idx_vehicles_supplier_id ON vehicles(supplier_id);

-- Index for date filtering in reports
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(created_at);
CREATE INDEX IF NOT EXISTS idx_vehicles_sold_date ON vehicles(sold_date);

-- Index for purchaser queries
CREATE INDEX IF NOT EXISTS idx_vehicles_purchased_by_user_id ON vehicles(purchased_by_user_id);

-- Composite index for comprehensive reporting queries
CREATE INDEX IF NOT EXISTS idx_vehicles_reporting 
ON vehicles(supplier_id, purchased_by_user_id, status, created_at);