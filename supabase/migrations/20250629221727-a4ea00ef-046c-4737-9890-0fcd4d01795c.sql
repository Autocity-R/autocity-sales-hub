
-- Exact Online Integration Database Schema
-- Created for real-time financial data integration

-- Table for storing Exact Online OAuth tokens
CREATE TABLE exact_online_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  division_code VARCHAR(20),
  company_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for token security
ALTER TABLE exact_online_tokens ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their own tokens
CREATE POLICY "Users can view their own tokens" 
  ON exact_online_tokens 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy to allow users to insert their own tokens
CREATE POLICY "Users can create their own tokens" 
  ON exact_online_tokens 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own tokens
CREATE POLICY "Users can update their own tokens" 
  ON exact_online_tokens 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policy to allow users to delete their own tokens
CREATE POLICY "Users can delete their own tokens" 
  ON exact_online_tokens 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Table for caching Exact Online API responses
CREATE TABLE exact_online_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  division_code VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for cache data
ALTER TABLE exact_online_cache ENABLE ROW LEVEL SECURITY;

-- Policy for cache access (all authenticated users can read/write cache)
CREATE POLICY "Authenticated users can access cache" 
  ON exact_online_cache 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Table for tracking sync status
CREATE TABLE exact_online_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(100) NOT NULL,
  division_code VARCHAR(20),
  last_sync TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(50) DEFAULT 'pending',
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  sync_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for sync status
ALTER TABLE exact_online_sync_status ENABLE ROW LEVEL SECURITY;

-- Policy for sync status (all authenticated users can access)
CREATE POLICY "Authenticated users can access sync status" 
  ON exact_online_sync_status 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Create indexes for performance
CREATE INDEX idx_exact_online_tokens_user_id ON exact_online_tokens(user_id);
CREATE INDEX idx_exact_online_tokens_expires_at ON exact_online_tokens(expires_at);
CREATE INDEX idx_exact_online_cache_key ON exact_online_cache(cache_key);
CREATE INDEX idx_exact_online_cache_expires ON exact_online_cache(expires_at);
CREATE INDEX idx_exact_online_sync_entity ON exact_online_sync_status(entity_type, division_code);

-- Create trigger for updated_at on tokens
CREATE TRIGGER set_exact_online_tokens_updated_at
  BEFORE UPDATE ON exact_online_tokens
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Create trigger for updated_at on sync status  
CREATE TRIGGER set_exact_online_sync_updated_at
  BEFORE UPDATE ON exact_online_sync_status
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_exact_online_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM exact_online_cache 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get valid access token for user
CREATE OR REPLACE FUNCTION get_valid_exact_online_token(user_uuid UUID)
RETURNS TABLE (
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  division_code VARCHAR(20),
  needs_refresh BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.access_token,
    t.refresh_token,
    t.expires_at,
    t.division_code,
    (t.expires_at < NOW() + INTERVAL '5 minutes') as needs_refresh
  FROM exact_online_tokens t
  WHERE t.user_id = user_uuid
  ORDER BY t.updated_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
